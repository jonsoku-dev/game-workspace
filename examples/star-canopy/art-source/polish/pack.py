"""Normalize original imagegen masters; preserve the runtime's fixed collider anchors."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
import hashlib, json, statistics
ROOT=Path(__file__).resolve().parent
SCENERY=ROOT.parents[1]/'game/scenery'
ART=ROOT.parents[1]/'game/art'

def clean(path):
 im=Image.open(path).convert('RGBA')
 im.putalpha(im.getchannel('A').point(lambda a:0 if a<128 else a))
 return im

def scale(im,size):
 im=im.resize(size,Image.Resampling.LANCZOS)
 im.putalpha(im.getchannel('A').point(lambda a:0 if a<12 else a))
 return im

island=clean(ROOT/'island-master.png')
box=island.getbbox()
crop=island.crop(box)
ratio=480/crop.width
terrain=Image.new('RGBA',(512,192))
# Source central grass top is y214; align its median exactly to collision y32.
oy=32-round((214-box[1])*ratio)
terrain.alpha_composite(scale(crop,(480,round(crop.height*ratio))),(16,oy))
terrain.save(SCENERY/'platform-island.png')
# Mirror a central painted segment to make both joins and outer tile edges continuous.
strip=island.crop((460,200,1712,569))
half=scale(strip,(256,108))
ground=Image.new('RGBA',(512,128))
ground.alpha_composite(half,(0,12))
ground.alpha_composite(ImageOps.mirror(half),(256,12))
ground.save(SCENERY/'ground-strip.png')
for source,name,size,anchor,maxsize in [
 ('wind-master.png','wind-stump.png',(192,192),(96,176),(176,164)),
 ('portal-master.png','portal.png',(256,320),(128,300),(240,288)),
]:
 im=clean(ROOT/source);im=im.crop(im.getbbox())
 r=min(maxsize[0]/im.width,maxsize[1]/im.height)
 im=scale(im,(round(im.width*r),round(im.height*r)))
 frame=Image.new('RGBA',size)
 frame.alpha_composite(im,(anchor[0]-im.width//2,anchor[1]-im.height))
 frame.save(SCENERY/name)

master=clean(ROOT/'walk-master.png')
sheet=Image.new('RGBA',(576,96))
frames=[]
for i in range(6):
 x,y=i%3*512,i//3*512
 im=master.crop((x,y,x+512,y+512));im=im.crop(im.getbbox())
 r=min(78/im.height,82/im.width)
 im=scale(im,(round(im.width*r),round(im.height*r)))
 frame=Image.new('RGBA',(96,96));frame.alpha_composite(im,((96-im.width)//2,85-im.height))
 assert frame.getbbox()[0]>0 and frame.getbbox()[1]>0 and frame.getbbox()[2]<96
 assert frame.getbbox()[3]==85
 frames.append(frame);sheet.alpha_composite(frame,(i*96,0))
assert len({hashlib.sha256(f.tobytes()).hexdigest() for f in frames})==6
sheet.save(ART/'walk-cycle.png')
preview=Image.new('RGBA',(576,126),'#244346');preview.alpha_composite(sheet)
labels=ImageDraw.Draw(preview)
for i,label in enumerate(['contact A','down A','pass A','contact B','down B','pass B']):labels.text((i*96+3,101),label,fill='#fff1ce')
preview.convert('RGB').save(ROOT/'walk-1x.png')
preview.resize((1152,252),Image.Resampling.NEAREST).convert('RGB').save(ROOT/'walk-2x.png')
gif=[]
for frame in frames:
 bg=Image.new('RGBA',(96,96),'#244346');bg.alpha_composite(frame)
 gif.append(bg.resize((288,288),Image.Resampling.NEAREST).convert('RGB'))
gif[0].save(ROOT/'walk.gif',save_all=True,append_images=gif[1:],duration=110,loop=0)
report={'walk':{'dimensions':[576,96],'phases':6,'uniqueCels':6,'pivot':[48,85], 'bounds':[f.getbbox() for f in frames]},'props':{}}
for file in ['platform-island.png','ground-strip.png','wind-stump.png','portal.png']:
 im=Image.open(SCENERY/file);b=im.getbbox()
 report['props'][file]={'dimensions':list(im.size),'bounds':b}
 if file!='ground-strip.png':assert b[0]>0 and b[1]>0 and b[2]<im.width and b[3]<im.height
assert ground.crop((0,0,1,128)).tobytes()==ground.crop((511,0,512,128)).tobytes()
for name,start,end,expected in [('platform-island.png',50,462,32),('ground-strip.png',0,512,16)]:
 im=Image.open(SCENERY/name);a=im.getchannel('A')
 top=[next(y for y in range(im.height) if a.getpixel((x,y))>=128) for x in range(start,end)]
 assert statistics.median(top)==expected
 report['props'][name]['measuredGrassTop']={'median':expected,'range':[min(top),max(top)]}
report['groundSeam']='identical first and last pixel columns; reflected central join'
report['platformGrassLine']={'medianY':32,'sourceMedianY':214,'colliderX':[16,496],'bladeFringeAboveLine':True}
report['anchors']={'wind-stump.png':[96,176],'portal.png':[128,300],'ground-strip.png':{'top':16}}
(ROOT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
# Final-size art staging against the actual supplied forest; no runtime evidence claim.
bg=Image.open(SCENERY/'canopy.webp').convert('RGBA').resize((1000,563))
bg.alpha_composite(terrain,(80,330));bg.alpha_composite(ground,(0,470));bg.alpha_composite(ground,(512,470))
bg.alpha_composite(Image.open(SCENERY/'wind-stump.png'),(430,176))
bg.alpha_composite(Image.open(SCENERY/'portal.png'),(730,158))
bg.alpha_composite(frames[0],(250,277))
bg.convert('RGB').save(ROOT/'forest-stage.png')
