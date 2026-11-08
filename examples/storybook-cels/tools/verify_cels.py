"""Verify installed cel .riv with real pinned WASM through isolated Stagehand.

Run: python3 examples/storybook-cels/tools/verify_cels.py path/to/character.riv
Outputs runtime-proof.json, runtime-montage.png and runtime-preview.gif only.
This proves fidelity/timing, not full-speed subjective quality or user acceptance.
"""
import argparse
import base64
import importlib.util
import hashlib
import io
import json
from pathlib import Path
import tarfile
import tempfile
import sys
import threading
import urllib.request

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageSequence

sys.dont_write_bytecode = True
PROJECT = Path(__file__).resolve().parents[1]
HELPER = PROJECT.parent / 'rive-character/tools/verify_runtime.py'
module_spec = importlib.util.spec_from_file_location('rive_proof', HELPER)
proof = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(proof)
PREVIEW_ORDER = ['wave', 'walk', 'run', 'cheer', 'attack', 'jump', 'hurt', 'idle']
JS = proof.JS.replace('const order=[0,7,2,5,1,6,3,4,0,3];',
    'const order=[...names.map((_,i)=>i),0,7,2,5,1,6,3,4];')
JS = JS.replace(' const result={inputs:', r'''
 const preview=[],switches=[];
 let from=names[order[order.length-1]],absoluteMs=0;
 for (const name of PREVIEW_ORDER) {
  const id=names.indexOf(name),frames=spec.actions[name].frames;
  input.value=id; advance(0); advance(0);
  switches.push({from,to:name,id,ms:absoluteMs,png:draw()});
  let time=0,start=0;
  for (const [index,frame] of frames.entries()) {
   const target=start+frame.duration_ms/2;
   advance(target-time);time=target;
   preview.push({action:name,id,index,duration_ms:frame.duration_ms,png:draw()});
   start+=frame.duration_ms;
  }
  advance(start-time);absoluteMs+=start;from=name;
 }
 const result={preview,switches,inputs:''').replace('PREVIEW_ORDER',json.dumps(PREVIEW_ORDER))


def decode(value):
    return Image.open(io.BytesIO(base64.b64decode(value.split(',')[1]))).convert('RGBA')


def browser_samples(riv,manifest):
    url=f'https://registry.npmjs.org/@rive-app/canvas-advanced/-/canvas-advanced-{proof.VERSION}.tgz'
    metadata=json.load(urllib.request.urlopen(
        f'https://registry.npmjs.org/@rive-app%2fcanvas-advanced/{proof.VERSION}',timeout=30))
    archive=urllib.request.urlopen(url,timeout=30).read()
    integrity='sha512-'+base64.b64encode(hashlib.sha512(archive).digest()).decode()
    if integrity!=metadata['dist']['integrity']:
        raise ValueError('Pinned official npm integrity mismatch')
    with tempfile.TemporaryDirectory(prefix='cel-runtime-') as directory:
        temporary=Path(directory)
        with tarfile.open(fileobj=io.BytesIO(archive),mode='r:gz') as tar:
            tar.extractall(temporary,filter='data')
        package=temporary/'package'
        if json.loads((package/'package.json').read_text())['version']!=proof.VERSION:
            raise ValueError('Runtime pin mismatch')
        files={'index.html':b'<canvas></canvas><script type="module" src="./proof.mjs"></script>',
               'proof.mjs':JS.encode(),'final.riv':riv,'animations.json':manifest}
        for name in ('canvas_advanced.mjs','rive.wasm','rive_fallback.wasm'):
            files[name]=(package/name).read_bytes()
        served=temporary/'served';served.mkdir()
        for name,data in files.items():(served/name).write_bytes(data)
        server=proof.inventory_server(served,{name:proof.digest(data) for name,data in files.items()})
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
            client=proof.MCP()
            client.run('await page.goto('+json.dumps('http://127.0.0.1:'+str(server.server_port))+');return true;')
            response=client.call('tools/call',{'name':'run','arguments':{
                'code':'return await page.evaluate(async()=>await window.proof);'}})
            if response.get('isError'):raise ValueError(str(response['content']))
            result=json.loads(next(c['text'] for c in response['content'] if c['type']=='text'))
        finally:
            if client:client.close()
            server.shutdown();server.server_close()
    return result,{'package':'@rive-app/canvas-advanced','version':proof.VERSION,'url':url,
        'integrity':integrity,'wasm_sha256':proof.digest(files['rive.wasm']),
        'js_sha256':proof.digest(files['canvas_advanced.mjs']),'docs':proof.DOCS}


def make_preview(samples,size,output):
    w,h=size;images=[];durations=[];elapsed=0;rounded=0
    font=ImageFont.load_default(size=19)
    for sample in samples:
        image=Image.new('RGB',(w*4,h*4+40),'#211d2b')
        ImageDraw.Draw(image).text((12,10),sample['action'].upper()+' / RIVE WASM',fill='#f7e6cc',font=font)
        cel=decode(sample['png']).resize((w*4,h*4),Image.Resampling.NEAREST)
        image.paste(cel,(0,40),cel);images.append(image)
        elapsed+=sample['duration_ms'];next_rounded=((elapsed+5)//10)*10
        durations.append(next_rounded-rounded);rounded=next_rounded
    images[0].save(output,save_all=True,append_images=images[1:],duration=durations,loop=0,
        optimize=False,disposal=2)
    with Image.open(output) as gif:
        decoded=[(f.convert('RGB').copy(),f.info['duration']) for f in ImageSequence.Iterator(gif)]
    assert sum(d for _,d in decoded)==sum(durations), 'GIF duration changed'
    assert all(d>0 and d%10==0 for _,d in decoded), 'Invalid GIF timebase'
    cursor=0
    for image,duration in zip(images,durations):
        moment=cursor+duration/2;decoded_cursor=0
        for actual,d in decoded:
            if decoded_cursor<=moment<decoded_cursor+d:
                assert ImageChops.difference(image,actual).getbbox() is None, 'GIF pixel quantization changed image'
                break
            decoded_cursor+=d
        else:raise AssertionError('Missing GIF frame')
        cursor+=duration
    return {'path':output.name,'sha256':proof.digest(output.read_bytes()),'size':[w*4,h*4+40],
        'source':'Actual WASM frame-interior snapshots on one uninterrupted state machine; no synthetic poses',
        'order':PREVIEW_ORDER,'cycles_each':1,'duration_ms':sum(durations),'decoded_frames':len(decoded),
        'gif_decode_pixels_match':True,'gif_decode_duration_match':True,
        'rounding':'Cumulative half-up 10ms boundaries; <=5ms deviation from authored timing'}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('riv',type=Path)
    args=parser.parse_args()
    manifest=(PROJECT/'drawings.json').read_bytes();spec=json.loads(manifest)
    character=(PROJECT/'character.json').read_bytes()
    assert list(spec['actions'])==json.loads(character)['actions'], 'Authored action order mismatch'
    assert len(spec['actions'])==8 and spec['size']==[96,112], 'Unexpected character contract'
    sources={f['path']:(PROJECT/f['path']).read_bytes() for a in spec['actions'].values() for f in a['frames']}
    riv=args.riv.read_bytes();result,runtime=browser_samples(riv,manifest)
    report={'schema_version':1,'scope':'Runtime fidelity and controlled timing only; creative acceptance unverified',
        'harness_sha256':proof.digest(Path(__file__).read_bytes()),'shared_helper_sha256':proof.digest(HELPER.read_bytes()),
        'riv_sha256':proof.digest(riv),'drawings_sha256':proof.digest(manifest),'character_sha256':proof.digest(character),
        'runtime':runtime,'driver':'Configured local Stagehand, independent MCP stdio process',
        'native_size':spec['size'],'action_ids':{name:i for i,name in enumerate(spec['actions'])},
        'method':'advanceAndApply -> artboard.advance -> draw -> flush; no RAF or synthetic frames',
        'exact_boundary_policy':'Adjacent authored pose permitted only at exact float32 boundary; +/-0.02ms strict',
        'rgba_policy':'Exact alpha occupancy; visible RGBA maximum error <=2 for Canvas premultiplication',
        **{k:v for k,v in result.items() if k not in ('samples','preview','switches')},'samples':[],'switches':[]}
    rendered={}
    for key in ('samples','preview','switches'):
        for sample in result[key]:
            actual=decode(sample['png'])
            assert actual.size==tuple(spec['size']), 'Native canvas size mismatch'
            index=sample.get('index',0)
            frames=spec['actions'][sample.get('action',sample.get('to'))]['frames']
            comparison=proof.compare(actual,Image.open(io.BytesIO(sources[frames[index]['path']])))
            passed=comparison['pass'];previous=None
            if sample.get('kind')=='exact-boundary' and not passed:
                previous=proof.compare(actual,Image.open(io.BytesIO(sources[frames[sample['previous']]['path']])))
                passed=previous['pass']
            entry={k:v for k,v in sample.items() if k!='png'}
            entry.update({'pass':passed,'comparison':comparison,'authored_png':frames[index]['path']})
            if previous:entry['previous_comparison']=previous
            report.setdefault(key,[]).append(entry)
            if key=='preview':rendered[(sample['action'],index)]=actual
    report['checks']={name:{'pass':all(s['pass'] for s in report['samples'] if s['action']==name),
        'duration_ms':sum(f['duration_ms'] for f in action['frames']),'loop':action['loop'],
        'distinct_observed_cels':len({s['comparison']['actual_rgba_sha256'] for s in report['preview'] if s['action']==name})}
        for name,action in spec['actions'].items()}
    report['passed']=all(s['pass'] for key in ('samples','preview','switches') for s in report[key])
    assert all(c['distinct_observed_cels']>1 for c in report['checks'].values()), 'Static action'
    evidence=PROJECT/'evidence';evidence.mkdir(exist_ok=True)
    report['gif']=make_preview(result['preview'],spec['size'],evidence/'runtime-preview.gif')
    w,h=spec['size'];scale=3;columns=max(len(a['frames']) for a in spec['actions'].values())
    montage=Image.new('RGB',(columns*w*scale+150,8*(h*scale+35)+35),'#211d2b')
    draw=ImageDraw.Draw(montage);draw.font=ImageFont.load_default(size=18)
    draw.text((8,8),'ACTUAL RIVE WASM - native cels rendered at 3x; motion acceptance separate',fill='#f7e6cc')
    for row,(name,action) in enumerate(spec['actions'].items()):
        y=35+row*(h*scale+35);draw.text((8,y+20),name+' / '+str(row),fill='white')
        for index in range(len(action['frames'])):
            image=rendered[(name,index)].resize((w*scale,h*scale),Image.Resampling.NEAREST)
            montage.paste(image,(150+index*w*scale,y+25),image)
            draw.text((150+index*w*scale,y+3),str(index),fill='white')
    montage.save(evidence/'runtime-montage.png')
    report['montage_sha256']=proof.digest((evidence/'runtime-montage.png').read_bytes())
    report['source_png_sha256']={path:proof.digest(data) for path,data in sources.items()}
    if args.riv.read_bytes()!=riv or (PROJECT/'drawings.json').read_bytes()!=manifest or any(
            (PROJECT/path).read_bytes()!=data for path,data in sources.items()):
        raise ValueError('Final input changed during runtime proof')
    (evidence/'runtime-proof.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'passed':report['passed'],'samples':len(report['samples']),
        'switches':len(report['switches']),'checks':report['checks'],'gif':report['gif']},indent=2))
    return 0 if report['passed'] else 1


if __name__=='__main__':
    raise SystemExit(main())
