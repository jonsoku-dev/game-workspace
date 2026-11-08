"""Prove final .riv pixels/timing through isolated configured Stagehand + Rive WASM.

Run: python3 examples/rive-character/tools/verify_runtime.py path/to/final.riv
Downloads only the pinned official canvas-advanced npm tarball to temporary storage.
No browser driver is launched by this script: studio's configured Stagehand MCP owns it.
"""
import argparse
import base64
import hashlib
import io
import json
from pathlib import Path
import sys
import tarfile
import tempfile
import threading
import urllib.request

from PIL import Image, ImageChops, ImageDraw, ImageSequence, ImageFont

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'studio/tools'))
from playcheck_browser import MCP, inventory_server

VERSION = '2.49.4'
DOCS = 'https://rive.app/docs/runtimes/web/low-level-api-usage'
JS = r'''
import RiveCanvas from './canvas_advanced.mjs';
window.proof = (async () => {
 const rive = await RiveCanvas({locateFile: () => './rive.wasm'});
 const spec = await (await fetch('./animations.json')).json();
 const file = await rive.load(new Uint8Array(await (await fetch('./final.riv')).arrayBuffer()));
 const artboard = file.artboardByName('Character');
 const canvas = document.querySelector('canvas');
 [canvas.width, canvas.height] = spec.size;
 const renderer = rive.makeRenderer(canvas);
 const sm = new rive.StateMachineInstance(artboard.stateMachineByName('Character Actions'), artboard);
 const inputs = Array.from({length:sm.inputCount()}, (_,i)=>sm.input(i));
 const input = inputs.find(x=>x.name === 'action').asNumber();
 const names = Object.keys(spec.actions);
 function advance(ms) {sm.advanceAndApply(ms/1000); artboard.advance(ms/1000);}
 function draw() {
  renderer.clear(); renderer.save();
  artboard.draw(renderer); renderer.restore(); renderer.flush(); rive.resolveAnimationFrame();
  return canvas.toDataURL('image/png');
 }
 advance(0);
 const samples=[];
 // The same artboard, state machine and numeric input survive all selections.
 const order=[0,7,2,5,1,6,3,4,0,3];
 for (const [selection,id] of order.entries()) {
  input.value = (id+1)%names.length; advance(0); advance(0);
  input.value = id; advance(0); advance(0);
  const action = spec.actions[names[id]], frames = action.frames;
  let start=0, time=0;
  const points=[];
  frames.forEach((f,index)=>{
   points.push({ms:start+f.duration_ms/2,index,kind:'interior'});
   start+=f.duration_ms;
   if(index+1<frames.length) {
    points.push({ms:start-0.02,index,kind:'before-boundary'});
    points.push({ms:start,index:index+1,previous:index,kind:'exact-boundary'});
    points.push({ms:start+0.02,index:index+1,kind:'after-boundary'});
   }
  });
  if(action.loop) {
   for(const cycle of [1,2]) {
    let offset=0;
    frames.forEach((f,index)=>{
     points.push({ms:start*cycle+offset+f.duration_ms/2,index,kind:cycle===1?'loop-interior':'second-loop-interior'});
     offset+=f.duration_ms;
    });
   }
  } else {
   points.push({ms:start+frames[0].duration_ms/2,index:frames.length-1,kind:'nonloop-hold'});
   points.push({ms:start*2+frames[0].duration_ms/2,index:frames.length-1,kind:'long-hold'});
  }
  for(const point of points) {
   advance(point.ms-time);time=point.ms;
   samples.push({selection,action:names[id],id,...point,png:draw()});
  }
 }
 const result={inputs:inputs.map(x=>({name:x.name,type:x.type})),order,samples,
  instances:{artboards:1,stateMachines:1},userAgent:navigator.userAgent};
 sm.delete();artboard.delete();file.delete();renderer.delete();
 return result;
})();
'''


def digest(data):
    return hashlib.sha256(data).hexdigest()


def normalized(image):
    image = image.convert('RGBA')
    # Canvas premultiplication loses hidden RGB; compare only visible RGBA.
    pixels = [(r,g,b,a) if a else (0,0,0,0) for r,g,b,a in image.get_flattened_data()]
    image.putdata(pixels)
    return image


def components(image):
    image=image.convert('RGBA');w,h=image.size
    remaining={(x,y) for y in range(h) for x in range(w) if image.getpixel((x,y))[3]>0}
    sizes=[]
    while remaining:
        pending=[remaining.pop()];size=0
        while pending:
            x,y=pending.pop();size+=1
            for dx in (-1,0,1):
                for dy in (-1,0,1):
                    point=(x+dx,y+dy)
                    if point in remaining:
                        remaining.remove(point);pending.append(point)
        sizes.append(size)
    return sorted(sizes,reverse=True)


def compare(actual, expected):
    actual, expected = normalized(actual), normalized(expected)
    difference = ImageChops.difference(actual, expected)
    occupancy = sum((a[3]>0)!=(b[3]>0) for a,b in zip(actual.get_flattened_data(),expected.get_flattened_data()))
    maximum = max(hi for lo,hi in difference.getextrema())
    return {'pass':occupancy==0 and maximum<=2,'occupied_pixel_mismatch':occupancy,
            'max_rgba_error':maximum,'actual_bbox':actual.getbbox(),'expected_bbox':expected.getbbox(),
            'actual_rgba_sha256':digest(actual.tobytes()),'expected_rgba_sha256':digest(expected.tobytes())}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('riv',type=Path)
    parser.add_argument('--preview',action='store_true',help='Export actual WASM snapshots as a chat-sized GIF')
    parser.add_argument('--baseline',action='store_true',help='Label rejected baseline; pixel fidelity is not creative acceptance')
    args=parser.parse_args()
    example=Path(__file__).resolve().parents[1]
    pose_dir=example/'poses'
    spec_bytes=(pose_dir/'animations.json').read_bytes()
    spec=json.loads(spec_bytes)
    riv=args.riv.resolve().read_bytes()
    url=f'https://registry.npmjs.org/@rive-app/canvas-advanced/-/canvas-advanced-{VERSION}.tgz'
    metadata=json.load(urllib.request.urlopen(f'https://registry.npmjs.org/@rive-app%2fcanvas-advanced/{VERSION}',timeout=30))
    archive=urllib.request.urlopen(url,timeout=30).read()
    integrity='sha512-'+base64.b64encode(hashlib.sha512(archive).digest()).decode()
    if metadata['dist']['integrity']!=integrity:
        raise ValueError('Official npm tarball integrity mismatch')
    with tempfile.TemporaryDirectory(prefix='rive-frame-proof-') as temporary:
        temporary=Path(temporary)
        with tarfile.open(fileobj=io.BytesIO(archive),mode='r:gz') as tar:
            tar.extractall(temporary,filter='data')
        package=temporary/'package'
        if json.loads((package/'package.json').read_text())['version']!=VERSION:
            raise ValueError('Runtime version mismatch')
        files={'index.html':b'<canvas></canvas><script type="module" src="./proof.mjs"></script>',
               'proof.mjs':JS.encode(),'final.riv':riv,'animations.json':spec_bytes}
        for name in ('canvas_advanced.mjs','rive.wasm','rive_fallback.wasm'):
            files[name]=(package/name).read_bytes()
        served=temporary/'served';served.mkdir()
        for name,data in files.items():
            (served/name).write_bytes(data)
        server=inventory_server(served,{name:digest(data) for name,data in files.items()})
        # Keep the immutable loopback server's restrictions, allowing WASM compilation only.
        handler=server.RequestHandlerClass
        original=handler.send_header
        def header(self,name,value):
            if name=='Content-Security-Policy':
                value=value.replace("script-src 'self'", "script-src 'self' 'wasm-unsafe-eval'")
            original(self,name,value)
        handler.send_header=header
        threading.Thread(target=server.serve_forever,daemon=True).start()
        client=None
        try:
            client=MCP()
            target='http://127.0.0.1:'+str(server.server_port)
            client.run('await page.goto('+json.dumps(target)+'); return true;')
            response=client.call('tools/call', {'name':'run','arguments':{'code':'return await page.evaluate(async()=>await window.proof);'}})
            if response.get('isError'):
                raise ValueError('Stagehand: '+str(response.get('content')))
            result=json.loads(next(c['text'] for c in response['content'] if c['type']=='text'))
        finally:
            if client:client.close()
            server.shutdown();server.server_close()
    if not isinstance(result,dict) or 'samples' not in result:
        raise ValueError('Stagehand did not return actual WASM samples: '+str(result)[:400])
    report={'schema_version':1,'harness_sha256':digest(Path(__file__).read_bytes()),'asset_review_status':'baseline-rejected' if args.baseline else 'candidate-unaccepted',
            'acceptance_scope':'Runtime fidelity only; does not certify motion quality or user acceptance.','runtime':{'package':'@rive-app/canvas-advanced','version':VERSION,
            'tarball':url,'integrity':integrity,'docs':DOCS,
            'js_sha256':digest(files['canvas_advanced.mjs']),'wasm_sha256':digest(files['rive.wasm'])},
            'riv_sha256':digest(riv),'manifest_sha256':digest(spec_bytes),
            'native_size':spec['size'],'driver':'configured Stagehand MCP, independent stdio process',
            'method':'StateMachineInstance.advanceAndApply -> artboard.advance -> artboard.draw, no RAF or synthetic frames',
            'metadata_limitation':'Pinned runtime lacks declared LinearAnimationInstance fps/duration getters; timing is proven by controlled-step observed boundary samples.',
            'boundary_policy':'Interiors and +/-0.02 ms must match; exact boundaries accept adjacent authored poses because runtime seconds are float32.',
            'rgba_policy':'Exact occupied silhouette; visible RGBA maximum error <=2 for canvas premultiplication rounding.',
            **{key:value for key,value in result.items() if key!='samples'},'samples':[]}
    montage_samples={}
    for sample in result['samples']:
        actual=Image.open(io.BytesIO(base64.b64decode(sample.pop('png').split(',')[1]))).convert('RGBA')
        if actual.size!=tuple(spec['size']):raise ValueError('Non-native rendered frame')
        frames=spec['actions'][sample['action']]['frames']
        expected=Image.open(pose_dir/frames[sample['index']]['path'])
        sample['comparison']=compare(actual,expected)
        sample['authored_png']=frames[sample['index']]['path']
        sample['pass']=sample['comparison']['pass']
        if sample['kind']=='exact-boundary' and not sample['comparison']['pass']:
            previous=compare(actual,Image.open(pose_dir/frames[sample['previous']]['path']))
            sample['previous_comparison']=previous
            sample['pass']=previous['pass']
            sample['observed_boundary_pose']='previous' if previous['pass'] else 'neither'
        if sample['kind']=='interior':
            montage_samples.setdefault((sample['action'],sample['index']),(actual.copy(),expected.copy()))
        report['samples'].append(sample)
    checks={}
    for i,(name,action) in enumerate(spec['actions'].items()):
        samples=[s for s in report['samples'] if s['action']==name]
        interiors=[s for s in samples if s['kind']=='interior']
        duration=sum(f['duration_ms'] for f in action['frames'])
        checks[name]={'pass':all(s['pass'] for s in samples)
            and len({s['comparison']['actual_rgba_sha256'] for s in interiors})>1,
            'distinct_observed_poses':len({s['comparison']['actual_rgba_sha256'] for s in interiors}),
            'duration_ms':duration}
    report['source_alpha_8_connected_components']={f['path']:components(Image.open(pose_dir/f['path']))
        for action in spec['actions'].values() for f in action['frames']}
    report['source_png_sha256']={f['path']:digest((pose_dir/f['path']).read_bytes())
        for action in spec['actions'].values() for f in action['frames']}
    if args.riv.resolve().read_bytes()!=riv or (pose_dir/'animations.json').read_bytes()!=spec_bytes:
        raise ValueError('Final input changed during proof')
    report['checks']=checks
    report['passed']=all(c['pass'] for c in checks.values())
    w,h=spec['size']; scale=3
    columns=max(len(a['frames']) for a in spec['actions'].values())
    font=ImageFont.load_default(size=18)
    montage=Image.new('RGB',(columns*w*scale+180,len(spec['actions'])*(h*scale*2+45)+32), '#151b24')
    draw=ImageDraw.Draw(montage);draw.font=font
    draw.text((8,8),'REJECTED BASELINE - runtime fidelity only' if args.baseline else 'CANDIDATE - runtime fidelity only; creative acceptance separate',fill='#ffbd69')
    for row,(name,action) in enumerate(spec['actions'].items()):
        y=32+row*(h*scale*2+45)
        draw.text((8,y+8),f'{name} / input {row}\nAUTHORED\n\nRIVE WASM',fill='white')
        for i in range(len(action['frames'])):
            actual,expected=montage_samples[(name,i)]
            for image,offset in ((expected,20),(actual,20+h*scale)):
                image=image.resize((w*scale,h*scale),Image.Resampling.NEAREST)
                montage.paste(image,(180+i*w*scale,y+offset),image)
            draw.text((180+i*w*scale,y+5),str(i),fill='white')
    evidence=example/'evidence';evidence.mkdir(exist_ok=True)
    montage.save(evidence/'frame-proof.png')
    report['montage_sha256']=digest((evidence/'frame-proof.png').read_bytes())
    if args.preview:
        images=[]; durations=[]; elapsed=0; rounded=0
        for name in ('wave','walk','run','cheer'):
            for cycle in range(2):
                for index,frame in enumerate(spec['actions'][name]['frames']):
                    image=Image.new('RGB',(w*3,h*3+32),'#151b24')
                    ImageDraw.Draw(image).text((12,8),name.upper()+' / RIVE WASM',fill='white',font=font)
                    actual=montage_samples[(name,index)][0].resize((w*3,h*3),Image.Resampling.NEAREST)
                    image.paste(actual,(0,32),actual)
                    images.append(image)
                    elapsed+=frame['duration_ms']
                    next_rounded=((elapsed+5)//10)*10
                    durations.append(next_rounded-rounded);rounded=next_rounded
        gif=evidence/'runtime-preview.gif'
        images[0].save(gif,save_all=True,append_images=images[1:],duration=durations,
                       loop=0,optimize=False,disposal=2)
        with Image.open(gif) as opened:
            decoded=[(f.convert('RGB').copy(),f.info['duration']) for f in ImageSequence.Iterator(opened)]
        assert sum(d for _,d in decoded)==sum(durations), 'GIF total duration changed'
        assert all(d>0 and d%10==0 for _,d in decoded), 'Invalid GIF timebase'
        # GIF may merge identical adjacent poses; verify every intended time interval.
        cursor=0
        for image,duration in zip(images,durations):
            sample_time=cursor+duration/2;actual_cursor=0
            for actual,actual_duration in decoded:
                if actual_cursor<=sample_time<actual_cursor+actual_duration:
                    assert ImageChops.difference(image,actual).getbbox() is None, 'GIF pixels changed'
                    break
                actual_cursor+=actual_duration
            else:raise AssertionError('Missing GIF interval')
            cursor+=duration
        report['preview']={'path':'runtime-preview.gif','sha256':digest(gif.read_bytes()),
            'source':'Actual native WASM canvas samples, nearest-neighbor 3x; no simulated motion',
            'order':['wave','walk','run','cheer'],'cycles_per_action':2,
            'rounding':'Cumulative boundaries rounded half up to GIF 10ms timebase (<=5ms boundary error)',
            'total_duration_ms':sum(durations),'intended_frames':len(images),'decoded_frames':len(decoded),
            'decoded_pixels_match':True,'decoded_duration_verified':True}
    (evidence/'frame-proof.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'passed':report['passed'],'samples':len(report['samples']),'checks':checks},indent=2))
    return 0 if report['passed'] else 1


if __name__=='__main__':
    raise SystemExit(main())
