#!/usr/bin/env python3
"""Record the installed courier export through isolated Stagehand and normal inputs."""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import subprocess
import sys

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--studio', type=Path, required=True)
p.add_argument('--export', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
a = p.parse_args()
assert a.out.name.startswith('preview-'), 'Use an owned preview-* output directory'
a.out.mkdir(exist_ok=False, parents=True)
receipt = json.loads((a.export / 'engine-export.json').read_text())
pins = {entry['path']: entry['sha256'] for entry in receipt['files']}
for name, digest in pins.items():
    assert hashlib.sha256((a.export / name).read_bytes()).hexdigest() == digest, name
sys.path.insert(0, str(a.studio / 'tools'))
from playcheck_browser import MCP
client = MCP()
try:
    # Observe only genuine app output: preserve the original speaker connection and add a recording sink.
    client.run("""await page.addInitScript(()=>{const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(destination,...rest){const result=connect.call(this,destination,...rest);if(destination instanceof AudioDestinationNode){const ctx=this.context;window.previewAudioSink??=ctx.createMediaStreamDestination();connect.call(this,window.previewAudioSink);}return result;};});await page.setViewportSize({width:1280,height:960});await page.goto('http://127.0.0.1:52993');return true;""")
    served = client.run('return await page.evaluate(async paths=>{const out={};for(const p of paths){const r=await fetch(p);if(!r.ok)throw Error(p);out[p]=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",await r.arrayBuffer()))).map(x=>x.toString(16).padStart(2,"0")).join("");}return out;},'+json.dumps(list(pins))+');')
    assert served == pins, 'Browser bytes differ from installed receipt'
    result = client.run("""
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const read=()=>page.evaluate(()=>{const s=window.scoutGame.scene.scenes[0];return {...s.state,action:s.actor.action,cueEvents:s.cueEvents,contactEvents:s.contactEvents};});
for(let i=0;i<100;i++){if(await page.evaluate(()=>!!window.scoutGame?.scene.scenes[0]?.actor))break;await sleep(50);}
await page.locator('#sound').click();
// Warm the genuine output route with a normal denied action, then reset before capture.
await page.locator('#interact').click();await sleep(500);await page.locator('#restart').click();await sleep(300);
const recording=await page.evaluate(()=>{const canvas=document.querySelector('canvas');const stream=canvas.captureStream(30);for(const track of window.previewAudioSink?.stream.getAudioTracks()||[])stream.addTrack(track);window.previewChunks=[];window.previewRecorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9,opus',videoBitsPerSecond:3500000});window.previewRecorder.ondataavailable=e=>{if(e.data.size)window.previewChunks.push(e.data);};window.previewRecorder.start(200);return {width:canvas.width,height:canvas.height,audioTracks:stream.getAudioTracks().length,mime:window.previewRecorder.mimeType};});
const started=Date.now(),marks=[];
const mark=async(name,caption)=>marks.push({name,caption,seconds:(Date.now()-started)/1000,state:await read()});
const click=async id=>page.locator('#'+id).click();
const wait=async predicate=>{for(let i=0;i<150;i++){const s=await read();if(predicate(s))return s;await sleep(40);}throw Error('Gameplay condition timeout');};
const move=async target=>{for(let i=0;i<80;i++){const s=await read();if(s.x>=target)return s;await page.keyboard.press('ArrowRight',{delay:Math.min(100,Math.max(20,(target-s.x)/.24))});}throw Error('Move timeout');};
await mark('intro','실제 브라우저 플레이 · 이동과 배달 피드백');await sleep(1400);
await click('interact');await wait(s=>s.cueEvents.some(e=>e.event==='denied'));await mark('denied','빈손으로 배송하면 거절 안내');await sleep(1500);
await mark('move','걷고 멈추기 · 발걸음과 정지');await move(310);await sleep(750);
await mark('jump','가시 틈 위로 점프 · 착지 피드백');await click('jump');await page.keyboard.press('ArrowRight',{delay:630});await move(470);await wait(s=>s.y===356);await mark('land','안전하게 착지');await sleep(800);
await move(530);await wait(s=>s.package);await mark('pickup','소포를 챙겼어요 · 다음은 장벽');await sleep(1500);
await move(590);await mark('barrier','막힌 길을 열기 · 접촉과 파괴 피드백');
for(let i=0;i<3;i++){await wait(s=>s.action!=='attack');await click('attack');await wait(s=>s.hits===i+1);await sleep(400);}
await wait(s=>s.targetHP===0);await mark('opened','길이 열렸어요');await sleep(600);
await mark('delivery_walk','소포를 들고 도착지로 이동');await move(840);await click('interact');await wait(s=>s.finished);await mark('delivery','배송 완료!');await sleep(2000);
await page.evaluate(()=>new Promise(resolve=>{window.previewRecorder.onstop=resolve;window.previewRecorder.stop();}));
const bytes=await page.evaluate(async()=>{const b=new Uint8Array(await new Blob(window.previewChunks,{type:'video/webm'}).arrayBuffer());let out='';for(let i=0;i<b.length;i+=32768)out+=String.fromCharCode(...b.subarray(i,i+32768));return btoa(out);});
return {recording,marks,durationSeconds:(Date.now()-started)/1000,bytes};
""")
    (a.out/'preview-raw.webm').write_bytes(base64.b64decode(result.pop('bytes')))
    assert result['marks'][-1]['state']['finished'] and result['marks'][-1]['state']['package']
    assert result['marks'][-1]['state']['hits'] == 3
    result.update(url='http://127.0.0.1:52993',browser_observed_hashes=served,receipt_sha256=hashlib.sha256((a.export/'engine-export.json').read_bytes()).hexdigest(),capture='Actual browser canvas.captureStream; normal controls; no state injection',audio='Real game output tapped at AudioDestinationNode' if result['recording']['audioTracks'] else 'Video only; no audio track captured')
    def timestamp(t):
        ms=round(t*1000)
        return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
    subs=[]
    for i,m in enumerate(result['marks']):
        end=result['marks'][i+1]['seconds'] if i+1<len(result['marks']) else result['durationSeconds']
        subs.append(f"{i+1}\n{timestamp(m['seconds'])} --> {timestamp(end)}\n{m['caption']}\n")
    (a.out/'preview-captions.srt').write_text('\n'.join(subs))
    audio_input=[]
    if result['recording']['audioTracks']:
        subprocess.run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-i',str(a.out/'preview-raw.webm'),'-vn','-af',f"aresample=async=1:first_pts=0,apad=whole_dur={result['durationSeconds']}",'-c:a','pcm_s16le',str(a.out/'preview-gameplay-audio.wav')],check=True)
        audio_input=['-i',str(a.out/'preview-gameplay-audio.wav'),'-map','0:v','-map','1:a']
    subprocess.run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-i',str(a.out/'preview-raw.webm'),*audio_input,'-vf',f"pad=iw:ih+64:0:0:black,subtitles={a.out/'preview-captions.srt'}:force_style='FontName=Apple SD Gothic Neo,FontSize=21,MarginV=12'",'-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart',str(a.out/'preview-gameplay.mp4')],check=True)
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(a.out/'preview-gameplay.mp4')]))
    assert any(s['codec_name']=='h264' for s in probe['streams'])
    if result['recording']['audioTracks']:
        video=next(s for s in probe['streams'] if s['codec_type']=='video')
        audio=next(s for s in probe['streams'] if s['codec_type']=='audio')
        assert abs(float(video['duration'])-float(audio['duration']))<.1
    result['ffprobe']=probe
    if result['recording']['audioTracks']:
        measured=subprocess.run(['ffmpeg','-hide_banner','-i',str(a.out/'preview-gameplay-audio.wav'),'-af','volumedetect','-f','null','-'],capture_output=True,text=True,check=True)
        result['audio_timing']='Timestamp gaps filled with silence by aresample; genuine game effects preserved'
        result['audio_volume']=[line for line in measured.stderr.splitlines() if 'mean_volume:' in line or 'max_volume:' in line]
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(a.out/'preview-gameplay.mp4'),'-vf','fps=2/5,scale=480:-1,tile=3x2','-frames:v','1',str(a.out/'preview-contact-sheet.jpg')],check=True)
    (a.out/'preview-recording.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(a.out/'preview-gameplay.mp4')
finally:
    client.close()
