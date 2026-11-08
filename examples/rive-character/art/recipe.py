"""Original Solbaram fern scout. Reproduce from workspace: assets/.venv/bin/python examples/rive-character/art/recipe.py
Every pose uses shared motion.render: original master cutouts plus declared palette-sampled joint underlaps.
"""
import sys, json, hashlib, math
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'assets/src'))
from pixel_asset_pipeline.motion import load_rig, render, frames_for, difference
ART=Path(__file__).resolve().parent
OUT=ART.parent/'poses'; OUT.mkdir(exist_ok=True)
SIZE=(96,96)
P={'ink':'#152939','deep':'#203b4b','navy':'#294c60','blue':'#396980','teal':'#397f82','mid':'#52a398','mint':'#8ac9ad','pale':'#c8dfb3','skin':'#e8af83','shade':'#be795e','light':'#ffdbab','hair':'#493e43','hmid':'#79584c','hi':'#b67d58','copper':'#a9563b','rust':'#d47b47','gold':'#f2b66b','leather':'#63473e','sole':'#352e37','cream':'#f6e8bc'}
parts=[]
def part(name,role,parent,anchor):
    im=Image.new('RGBA',SIZE); d=ImageDraw.Draw(im)
    spec={'id':name,'role':role,'parent':parent,'anchor_px':list(anchor),'mask':f'mask-{name}.png'}
    parts.append((spec,im));return d
def poly(d,xy,c):d.polygon(xy,fill=P[c])
def rect(d,box,c):d.rectangle(box,fill=P[c])
def line(d,xy,c,w=1):d.line(xy,fill=P[c],width=w)
# The one master drawing. Parts are ordered back-to-front; visible ownership is resolved below.
d=part('body','torso',None,(48,52))
poly(d,[(40,40),(45,38),(53,38),(59,42),(57,52),(59,63),(53,67),(48,64),(42,67),(37,63),(40,51)],'ink')
poly(d,[(42,41),(49,40),(55,42),(54,51),(56,61),(50,64),(47,61),(41,64),(40,60),(43,51)],'teal')
poly(d,[(42,42),(46,42),(44,52),(43,59),(40,60),(42,49)],'mid')
poly(d,[(51,43),(56,43),(54,52),(57,61),(52,63),(49,60)],'navy')
line(d,[(46,44),(47,53),(47,59)],'mint')
line(d,[(42,55),(54,55)],'ink',3);line(d,[(42,54),(54,54)],'leather')
rect(d,(47,53,50,56),'gold');rect(d,(48,54,49,55),'deep')
poly(d,[(54,52),(58,53),(58,59),(54,60),(53,56)],'ink');rect(d,(54,54,57,57),'leather');line(d,[(55,54),(57,54)],'gold')
line(d,[(42,60),(45,61)],'mint');line(d,[(51,60),(54,59)],'blue')
# Small shoulder bridges keep raised cutout arms visually attached.
poly(d,[(36,41),(41,40),(44,44),(39,46),(36,44)],'ink')
poly(d,[(37,42),(41,41),(42,43),(39,44),(37,44)],'teal')
poly(d,[(54,40),(60,41),(61,44),(57,46),(54,44)],'ink')
poly(d,[(55,41),(59,42),(59,44),(57,44)],'teal')
# Opaque crotch gusset closes the accidental one-pixel waist pinhole.
rect(d,(47,61,51,66),'deep')
# Pants and articulated boot silhouettes.
for side,x in [('left',42),('right',50)]:
 d=part('leg_'+side,'leg_'+side,'body',(x+3,61))
 poly(d,[(x,60),(x+7,60),(x+6,70),(x+5,74),(x+8,80),(x+8,83),(x-1,83),(x-2,81),(x,77),(x-1,70)],'ink')
 poly(d,[(x+1,62),(x+5,62),(x+4,71),(x+1,74),(x,70)],'navy')
 line(d,[(x+2,63),(x+2,69)],'blue')
 poly(d,[(x,72),(x+5,72),(x+4,77),(x+7,80),(x+7,81),(x,81),(x,77)],'leather')
 line(d,[(x,73),(x+4,73)],'rust');line(d,[(x,76),(x+3,76)],'hi')
 line(d,[(x-1,82),(x+7,82)],'sole');line(d,[(x+3,80),(x+6,80)],'gold')
# Narrow sleeves and separate forearms; cuffs bridge elbow seams.
for side,x,sgn in [('left',36,-1),('right',60,1)]:
 d=part('upper_'+side,'arm_'+side,'body',(x,41))
 poly(d,[(x-3,41),(x+2,40),(x+4,44),(x+2,52),(x-2,53),(x-4,49)],'ink')
 poly(d,[(x-2,42),(x+1,42),(x+2,45),(x+1,50),(x-2,51),(x-3,47)],'teal')
 line(d,[(x-2,43),(x-2,47)],'mint');line(d,[(x+2,46),(x+1,50)],'navy')
 d=part('fore_'+side,'arm_'+side,'upper_'+side,(x,51))
 poly(d,[(x-2,50),(x+2,50),(x+3,55),(x+2,60),(x+1,64),(x-2,64),(x-4,61),(x-3,57)],'ink')
 rect(d,(x-2,51,x+1,54),'navy');line(d,[(x-2,51),(x+1,51)],'gold')
 poly(d,[(x-2,55),(x+1,55),(x+1,59),(x+2,60),(x,63),(x-2,62),(x-3,60)],'skin')
 line(d,[(x-2,56),(x-2,59)],'light');line(d,[(x+1,60),(x,62)],'shade')
 # A tiny distinct thumb, retained in every derived pose.
 rect(d,(x-3,58,x-2,60),'light')
# Windswept copper scarf, signature pointed tail.
d=part('scarf','accessory','body',(48,40))
poly(d,[(40,37),(50,36),(56,39),(56,43),(50,46),(41,43),(38,40)],'ink')
poly(d,[(40,38),(49,38),(54,40),(52,43),(45,43),(40,41)],'copper')
line(d,[(41,39),(48,40),(53,39)],'gold');line(d,[(43,42),(49,43)],'rust')
poly(d,[(52,42),(57,43),(62,48),(68,49),(64,52),(57,49)],'ink')
poly(d,[(54,43),(58,45),(62,49),(65,50),(61,50),(57,47)],'rust')
line(d,[(57,46),(61,49)],'gold')
# Large expressive face, short auburn hair and forest cap.
d=part('head','head','body',(48,37))
poly(d,[(36,24),(40,20),(50,19),(57,23),(60,29),(58,34),(54,39),(43,39),(38,35),(35,29)],'ink')
poly(d,[(38,26),(42,23),(51,23),(56,26),(57,32),(53,37),(44,38),(40,34),(37,30)],'shade')
poly(d,[(40,25),(50,24),(55,27),(55,32),(52,36),(45,36),(41,33)],'skin')
poly(d,[(41,26),(48,25),(52,27),(51,31),(46,33),(42,31)],'light')
# Near ear, cheek and two dark eyes with white pinpoints.
rect(d,(37,29,39,32),'skin');rect(d,(38,30,39,30),'light')
rect(d,(46,28,48,30),'ink');rect(d,(54,28,55,30),'ink')
rect(d,(47,28,47,28),'cream');rect(d,(54,28,54,28),'cream')
line(d,[(46,26),(48,26)],'hair');line(d,[(54,26),(55,27)],'hair')
rect(d,(53,31,55,32),'shade');line(d,[(50,34),(53,34)],'hair');rect(d,(53,33,53,33),'cream')
rect(d,(45,32,46,32),'rust')
poly(d,[(36,24),(40,21),(52,21),(57,24),(57,30),(54,29),(53,24),(49,25),(45,23),(43,27),(40,27),(40,32),(38,34),(37,30)],'hair')
line(d,[(39,24),(41,23),(43,23)],'hi');line(d,[(39,27),(39,30)],'hmid');line(d,[(53,24),(55,26),(55,28)],'hmid')
poly(d,[(35,22),(38,18),(42,15),(49,15),(54,18),(56,22),(58,23),(55,25),(47,23),(41,24),(36,25)],'ink')
poly(d,[(37,22),(40,19),(44,17),(49,17),(53,20),(54,22),(47,21),(42,22)],'teal')
line(d,[(40,20),(44,18),(48,18)],'mint');line(d,[(37,23),(42,23),(47,22),(54,23)],'blue')
# Fern badge and three asymmetric leaflets (original motif).
line(d,[(50,20),(54,13)],'gold')
poly(d,[(52,17),(49,14),(52,15)],'mid');poly(d,[(53,15),(54,11),(55,14)],'mint');poly(d,[(54,14),(58,12),(56,15)],'mid')
rect(d,(48,21,50,22),'gold')
# Knee partition of the same original leg pixels, before the one master flatten.
segmented=[]
for spec,im in parts:
 if spec['id'].startswith('leg_'):
  upper=im.copy(); lower=im.copy()
  for y in range(96):
   for x in range(96):
    (upper if y>=71 else lower).putpixel((x,y),(0,0,0,0))
  segmented.append((spec,upper))
  child={**spec,'id':spec['id'].replace('leg_','calf_'),'parent':spec['id'],'anchor_px':[spec['anchor_px'][0],71]}
  child['mask']='mask-'+child['id']+'.png'
  child['contact_px']=[spec['anchor_px'][0]+3,83]
  segmented.append((child,lower))
 else:segmented.append((spec,im))
parts=segmented
# Flatten exactly once, then allocate every visible pixel to its topmost authored part.
master=Image.new('RGBA',SIZE)
for _,im in parts:master.alpha_composite(im)
master.save(ART/'master.png')
claimed=set(); specs=[]
for spec,im in reversed(parts):
 mask=Image.new('L',SIZE)
 pixels={(x,y) for y in range(96) for x in range(96) if im.getpixel((x,y))[3]}-claimed
 claimed|=pixels
 for xy in pixels:mask.putpixel(xy,255)
 mask.save(ART/spec['mask'])
 specs.insert(0,spec)
# These three visible sleeve edge pixels touch the overlying scarf, not the sleeve body.
# Binding them to the scarf avoids rotating a disconnected cutout splinter.
for xy in [(57,51),(57,50),(56,49)]:
 for name,value in [('upper_right',0),('scarf',255)]:
  path=ART/f'mask-{name}.png';mask=Image.open(path);mask.putpixel(xy,value);mask.save(path)
rig={'parts':specs}; (ART/'rig.json').write_text(json.dumps(rig,indent=2)+'\n')
SUPPORTS={
 'upper_left':{'parent_px':[40,43],'child_px':[36,44],'radius_px':3,'source_px':[37,44],'edge_px':[33,44]},
 'upper_right':{'parent_px':[56,43],'child_px':[60,44],'radius_px':3,'source_px':[59,44],'edge_px':[63,43]},
 'fore_left':{'parent_px':[36,48],'child_px':[36,55],'radius_px':3,'source_px':[36,53],'edge_px':[34,52]},
 'fore_right':{'parent_px':[60,46],'child_px':[60,55],'radius_px':3,'source_px':[60,53],'edge_px':[58,52]},
 'leg_left':{'parent_px':[45,60],'child_px':[45,65],'radius_px':3,'source_px':[45,65],'edge_px':[42,65]},
 'leg_right':{'parent_px':[53,60],'child_px':[53,65],'radius_px':3,'source_px':[53,65],'edge_px':[50,65]},
 'calf_left':{'parent_px':[45,69],'child_px':[45,74],'radius_px':2,'source_px':[45,69],'edge_px':[42,70]},
 'calf_right':{'parent_px':[53,69],'child_px':[53,74],'radius_px':2,'source_px':[53,69],'edge_px':[50,70]},
 'head':{'parent_px':[48,41],'child_px':[48,36],'radius_px':3,'source_px':[48,35],'edge_px':[43,38]}}
(ART/'joint-supports.json').write_text(json.dumps(SUPPORTS,indent=2)+'\n')

def components(im,diagonal):
 remain={(x,y) for y in range(96) for x in range(96) if im.getpixel((x,y))[3]}
 sizes=[]
 while remain:
  stack=[remain.pop()];n=0
  while stack:
   x,y=stack.pop();n+=1
   for dx,dy in ((-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1))[:8 if diagonal else 4]:
    xy=(x+dx,y+dy)
    if xy in remain:remain.remove(xy);stack.append(xy)
  sizes.append(n)
 return sorted(sizes,reverse=True)

for spec in specs:
 if spec['id'] in SUPPORTS:spec['joint_underlap']=SUPPORTS[spec['id']]
(ART/'rig.json').write_text(json.dumps(rig,indent=2)+'\n')
loaded=load_rig({'rig':rig},ART,master)
neutral,info=render(master,loaded,{'parts':{},'root_offset_px':[0,0]})
assert difference(master,neutral)==0 and info['clipped_part_pixels']==0

def frame(ms=120,root=(0,0),**angles):
 return {'duration_ms':ms,'root_offset_px':list(root),'parts':{k:{'angle_deg':v} if isinstance(v,(int,float)) else v for k,v in angles.items()}}
# Eight-to-twelve purposeful poses, with knees and toe-off rather than rigid leg scissors.
actions={}
actions['idle']=[frame(180,head=h,scarf=sc,upper_left=a,upper_right=-a) for h,sc,a in [(0,0,0),(-1,1,1),(-1,2,1),(0,1,0),(1,0,-1),(1,-1,-1)]]
def cycle(fast=False):
 frames=[]
 for i in range(12):
  phase=2*math.pi*i/12; stride=math.sin(phase)
  sl=max(0,stride);sr=max(0,-stride)
  # Front-facing step: each knee lifts toward its own side, while counter-rotating
  # calves keep each boot on its original side. The support leg remains straight.
  bend=37 if fast else 25
  left=bend*sl;right=-bend*sr
  kl=-2*left;kr=-2*right
  frames.append(frame(65 if fast else 90,root=(round(sr-sl),0),body=(-5 if fast else 0)+round((sr-sl)*1.5),head=4 if fast else 0,
    leg_left={'angle_deg':left,'offset_px':[0,-round(sl*(2 if fast else 1))]},
    leg_right={'angle_deg':right,'offset_px':[0,-round(sr*(2 if fast else 1))]},calf_left=kl,calf_right=kr,
    upper_left=round(-stride*(24 if fast else 12)),upper_right=round(-stride*(24 if fast else 12)),
    fore_left=-32 if fast else -5,fore_right=32 if fast else 5,scarf=round(stride*2)))
 for i,f in enumerate(frames):
  _,info=render(master,loaded,f)
  baseline=max(p[1] for p in info['contact_points_px'].values())
  flight=2 if fast and i in (0,6) else 0
  f['root_offset_px'][1]+=round(83-baseline)-flight
 return frames
actions['walk']=cycle();actions['run']=cycle(True)
actions['attack']=[frame(90,body=b,head=-b/2,upper_right=arm,fore_right=fore,upper_left=back,leg_left=ll,leg_right=lr,calf_right=k,root=(dx,0),scarf=sc) for b,arm,fore,back,ll,lr,k,dx,sc in [(0,-5,-5,0,0,0,0,0,0),(3,-25,-50,5,3,-3,-5,-1,-3),(5,-40,-65,12,6,-6,-10,-2,-4),(-5,-75,-35,20,12,-8,-12,2,8),(-8,-95,-5,25,15,-10,-15,5,12),(-6,-90,0,20,12,-8,-10,4,8),(-3,-55,-15,10,7,-3,-5,2,4),(0,-15,-8,0,0,0,0,0,1), (0,0,0,0,0,0,0,0,0)]]
actions['jump']=[frame(110,root=(0,y),upper_left=a,upper_right=-a,fore_left=10,fore_right=-10,leg_left=l,leg_right=-l,calf_left=k,calf_right=k,body=b,head=-b/2) for y,a,l,k,b in [(1,5,3,-10,2),(2,15,4,-16,3),(-3,55,8,-25,0),(-7,100,10,-35,-2),(-9,120,12,-40,-2),(-8,110,10,-30,0),(-4,65,5,-15,0),(1,25,3,-10,2),(0,0,0,0,0)]]
actions['jump']=actions['jump'][:7]+[
 frame(140,root=(0,3),body=2,head=-1,upper_left=30,upper_right=-30,fore_left=10,fore_right=-10,leg_left=30,leg_right=-30,calf_left=-60,calf_right=60),
 frame(130,root=(0,2),body=1,upper_left=18,upper_right=-18,leg_left=23,leg_right=-23,calf_left=-46,calf_right=46),
 frame(120,root=(0,1),upper_left=8,upper_right=-8,leg_left=13,leg_right=-13,calf_left=-26,calf_right=26),
 frame(160)]
for f in actions['jump'][7:]:
 _,info=render(master,loaded,f)
 baseline=max(p[1] for p in info['contact_points_px'].values())
 f['root_offset_px'][1]+=round(83-baseline)
actions['hurt']=[frame(100,root=(-dx,0),body=b,head=-b/2,upper_left=a,fore_left=12,upper_right=-a/2,fore_right=-12,leg_left=-3,leg_right=3,calf_left=-4) for b,a,dx in [(0,0,0),(4,8,1),(9,20,3),(12,25,4),(9,20,3),(5,12,2),(2,5,1),(0,0,0)]]
# Shoulder held raised; clear repeated elbow swing, with hand away from the face.
actions['wave']=[frame(130,upper_right=-125,fore_right=f,head=h,scarf=2) for f,h in [(-10,0),(-25,-1),(-42,-2),(-25,-1),(-10,0),(-25,-1),(-42,-2),(-25,-1)]]
actions['cheer']=[frame(110,root=(0,y),upper_left=a,upper_right=-a,fore_left=f,fore_right=-f,head=h,leg_left=2,leg_right=-2,scarf=-3) for a,f,y,h in [(120,28,0,0),(125,28,-1,-1),(132,25,-2,-1),(138,22,-2,0),(132,25,-1,0),(125,28,0,1),(120,28,0,1),(125,28,-1,0)]]
request={'schema_version':1,'approved':True,'master':'master.png','pivot_px_from_top_left':[48,83],
 'rig':rig,'single_body':True,
 'actions':{n:{'frames':f} for n,f in actions.items() if n in ('idle','walk','run','attack','jump','hurt')},
 'extra_actions':{n:{'loop':True,'frames':actions[n]} for n in ('wave','cheer')}}
(ART/'motion.request.json').write_text(json.dumps(request,indent=2)+'\n')
(ART/'choreography.json').write_text(json.dumps(actions,indent=2)+'\n')
manifest={'schema_version':1,'size':list(SIZE),'actions':{}}
inspection={'neutral_pixel_difference':difference(master,neutral),'master_sha256':hashlib.sha256((ART/'master.png').read_bytes()).hexdigest(),'part_count':len(parts),'actions':{}}
montage=Image.new('RGB',(96*12,116*8),'#20313e'); md=ImageDraw.Draw(montage)
for row,(name,frames) in enumerate(actions.items()):
 checked=frames_for({'frames':frames},loaded,SIZE); gifs=[]; entries=[]; reports=[]
 for i,f in enumerate(checked):
  im,report=render(master,loaded,f);assert report['clipped_part_pixels']==0,(name,i,report)
  path=f'{name}-{i}.png';im.save(OUT/path);entries.append({'path':path,'duration_ms':f['duration_ms']});report['components_4']=components(im,False);report['components_8']=components(im,True);reports.append(report);assert len(report['components_8'])==1,(name,i,report['components_8'])
  assert set(im.get_flattened_data())-set(master.get_flattened_data())==set(), 'palette changed'
  bg=Image.new('RGB',SIZE,'#20313e');bg.paste(im,mask=im.getchannel('A'));gifs.append(bg.resize((384,384),Image.Resampling.NEAREST))
  montage.paste(bg,(i*96,row*116+20))
 md.text((4,row*116+3),name,fill='#c8dfb3')
 manifest['actions'][name]={'loop':name in ('idle','walk','run','wave','cheer'),'frames':entries}
 inspection['actions'][name]=reports
 gifs[0].save(OUT/f'{name}.gif',save_all=True,append_images=gifs[1:],duration=[f['duration_ms'] for f in frames],loop=0 if manifest['actions'][name]['loop'] else 1,disposal=2)
(OUT/'animations.json').write_text(json.dumps(manifest,indent=2)+'\n')
(ART/'inspection.json').write_text(json.dumps(inspection,indent=2)+'\n')
montage.save(ART/'montage-1x.png');montage.resize((2304,1856),Image.Resampling.NEAREST).save(ART/'montage-2x.png')
preview=Image.new('RGB',(600,460),'#20313e');preview.paste(master,(24,24),master);preview.paste(master.resize((384,384),Image.Resampling.NEAREST),(170,40),master.resize((384,384),Image.Resampling.NEAREST));ImageDraw.Draw(preview).text((24,130),'1x / 4x original',fill='#c8dfb3');preview.save(ART/'master-review.png')
critical=['walk-3','walk-9','run-3','run-9','attack-5','jump-7','wave-0','wave-2','cheer-3']
review=Image.new('RGB',(1152,1230),'#20313e');rd=ImageDraw.Draw(review)
for i,name in enumerate(critical):
 image=Image.open(OUT/(name+'.png')).resize((384,384),Image.Resampling.NEAREST)
 x=(i%3)*384;y=(i//3)*410;review.paste(image,(x,y+24),image);rd.text((x+8,y+4),name,fill='white')
review.save(ART/'critical-pose-review.png')
print(json.dumps({'master':str(ART/'master.png'),'frames':sum(len(f) for f in actions.values()),'actions':list(actions),'clipped':0,'neutral_difference':0}))
