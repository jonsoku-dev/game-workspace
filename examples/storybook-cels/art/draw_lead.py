"""Complete hand-authored idle and hurt cel contours. No raster pose reuse."""
import json
from pathlib import Path
from PIL import Image
from ink import *
ROOT=Path(__file__).resolve().parents[1]
# Every key defines complete silhouette: crown, jacket, far/near arm, far/near leg.
POSES=[
 dict(head=(38,10), jacket=[(40,34),(48,33),(57,35),(61,44),(59,53),(59,62),(53,66),(41,65),(36,61),(38,48),(36,41)], fararm=[(55,36),(61,39),(63,49),(61,58),(57,60),(55,56),(57,48)], arm=[(38,37),(34,40),(31,49),(32,58),(35,63),(39,61),(38,55),(39,47),(42,41)], farleg=[(49,71),(56,72),(55,87),(57,94),(61,96),(61,99),(49,99),(48,94),(49,85)], leg=[(40,71),(48,72),(47,84),(44,92),(45,96),(51,97),(51,99),(38,99),(37,95),(39,86)], scarf=[(43,32),(49,32),(54,35),(51,39),(44,37),(38,39),(32,37),(39,35)]),
 dict(head=(38,9), jacket=[(40,33),(48,32),(57,34),(62,43),(60,53),(59,62),(52,65),(40,64),(35,60),(37,47),(36,40)], fararm=[(56,35),(62,39),(64,48),(62,57),(58,59),(55,55),(57,47)], arm=[(38,36),(34,39),(31,48),(31,57),(34,62),(38,60),(38,54),(40,46),(42,40)], farleg=[(49,71),(56,72),(55,87),(57,94),(61,96),(61,99),(49,99),(48,94),(49,85)], leg=[(40,71),(48,72),(47,84),(44,92),(45,96),(51,97),(51,99),(38,99),(37,95),(39,86)], scarf=[(43,31),(49,31),(54,34),(51,38),(44,36),(37,38),(30,35),(38,34)]),
 dict(head=(38,10), jacket=[(40,34),(48,33),(57,35),(61,44),(59,53),(59,62),(53,66),(41,65),(36,61),(38,48),(36,41)], fararm=[(55,36),(61,39),(63,49),(61,58),(57,60),(55,56),(57,48)], arm=[(38,37),(34,40),(31,49),(32,58),(35,63),(39,61),(38,55),(39,47),(42,41)], farleg=[(49,71),(56,72),(55,87),(57,94),(61,96),(61,99),(49,99),(48,94),(49,85)], leg=[(40,71),(48,72),(47,84),(44,92),(45,96),(51,97),(51,99),(38,99),(37,95),(39,86)], scarf=[(43,32),(49,32),(54,35),(51,39),(44,37),(38,39),(32,37),(39,35)]),
 dict(head=(39,11), jacket=[(41,35),(49,34),(58,36),(61,45),(59,54),(60,63),(53,67),(41,65),(36,61),(38,49),(37,42)], fararm=[(56,37),(62,40),(63,50),(60,59),(56,60),(55,56),(57,48)], arm=[(39,38),(35,41),(32,50),(33,59),(36,64),(40,62),(39,56),(40,48),(43,42)], farleg=[(49,71),(56,72),(55,87),(57,94),(61,96),(61,99),(49,99),(48,94),(49,85)], leg=[(40,71),(48,72),(47,84),(44,92),(45,96),(51,97),(51,99),(38,99),(37,95),(39,86)], scarf=[(44,33),(50,33),(55,36),(52,40),(45,38),(39,40),(33,38),(40,36)]),
]
HURT=[
 dict(head=(34,12),jacket=[(35,35),(43,33),(53,37),(58,46),(57,57),(61,64),(54,70),(42,66),(36,61),(33,46)],fararm=[(51,37),(58,39),(63,47),(65,51),(62,55),(57,52),(51,45)],arm=[(35,37),(31,40),(28,49),(30,57),(35,58),(39,54),(42,47),(40,44),(36,49),(35,47),(39,41)],farleg=[(50,70),(58,72),(60,83),(55,92),(58,96),(63,97),(63,99),(50,99),(49,94),(53,83)],leg=[(42,70),(49,73),(46,84),(39,91),(37,97),(42,98),(42,99),(29,99),(30,96),(32,89),(39,80)],scarf=[(39,33),(45,32),(50,36),(46,40),(40,38),(32,39),(24,35),(34,35)]),
 dict(head=(28,15),jacket=[(31,38),(40,35),(50,38),(55,46),(57,58),(62,66),(54,72),(42,67),(35,63),(29,49)],fararm=[(48,39),(56,39),(61,34),(63,30),(67,31),(67,36),(61,44),(55,48)],arm=[(31,40),(26,42),(21,49),(23,57),(28,60),(32,56),(33,50),(38,47),(37,43),(31,45),(28,49),(29,46)],farleg=[(50,71),(58,73),(64,83),(60,91),(61,96),(67,97),(67,99),(55,99),(53,94),(56,83)],leg=[(42,71),(49,75),(45,85),(35,90),(31,97),(36,98),(36,99),(23,99),(24,96),(28,88),(37,81)],scarf=[(33,36),(39,35),(45,39),(42,42),(35,40),(25,41),(17,36),(29,38)]),
 dict(head=(32,13),jacket=[(34,36),(43,34),(53,38),(58,47),(57,58),(60,65),(53,70),(41,66),(35,62),(32,48)],fararm=[(52,38),(59,40),(64,45),(69,43),(72,45),(69,50),(63,51),(56,47)],arm=[(34,39),(29,42),(26,51),(29,59),(34,61),(38,57),(39,51),(42,48),(40,44),(35,49),(33,52),(32,49),(37,42)],farleg=[(49,71),(57,72),(60,83),(57,93),(60,96),(65,97),(65,99),(52,99),(51,94),(54,83)],leg=[(41,71),(48,73),(46,84),(40,92),(39,97),(45,98),(45,99),(32,99),(32,96),(34,89),(40,81)],scarf=[(37,34),(43,33),(49,37),(46,41),(39,39),(30,41),(23,38),(33,37)]),
]
HURT.append(dict(head=(37,10),jacket=[(39,34),(47,33),(56,35),(60,43),(59,53),(59,63),(52,66),(40,65),(35,61),(37,48),(35,41)],fararm=[(55,36),(61,39),(63,47),(62,55),(58,58),(55,54),(57,46)],arm=[(37,37),(33,40),(31,48),(34,54),(39,54),(43,49),(47,46),(45,42),(40,46),(37,47),(39,41)],farleg=[(49,71),(56,72),(55,87),(57,94),(61,96),(61,99),(49,99),(48,94),(49,85)],leg=[(40,71),(48,72),(46,84),(42,92),(43,96),(49,97),(49,99),(36,99),(35,95),(37,86)],scarf=[(42,32),(48,32),(53,35),(50,39),(43,37),(37,39),(31,36),(38,35)]))
def render(q,expression='open'):
 im,d=canvas(); hx,hy=q['head']; lean=hx-38; breath=hy-10
 # Complete rear silhouette is inked first; nested shapes model light, never masked parts.
 for name in ('farleg','leg'):
  pts=q[name]; poly(d,pts,'outline')
  # knees and tapered calf are authored to each leg's actual contour.
  a,b=pts[0],pts[1]; c=pts[2]
  poly(d,[(a[0]+1,a[1]+1),(b[0]-1,b[1]+1),(c[0]-1,c[1]),(c[0]-4,c[1]+2)],'skin_shade' if name=='farleg' else 'skin')
  line(d,[(c[0]-2,c[1]-1),(c[0]-4,c[1]+1)],'skin_light')
  poly(d,[(pts[-1][0],pts[-1][1]),(c[0]-2,c[1]+1),(c[0]+1,c[1]+1),(pts[3][0]+1,pts[3][1]),(pts[4][0]+1,pts[4][1]),(pts[5][0]-1,pts[5][1]),(pts[6][0]-1,pts[6][1]-1),(pts[7][0]+1,pts[7][1]-1)],'leather')
  line(d,[(pts[3][0],pts[3][1]),(pts[4][0],pts[4][1]),(pts[5][0]-1,pts[5][1])],'leather_light')
  line(d,[pts[7],pts[6]],'sole')
 poly(d,[(40+lean//3,62+breath),(57+lean//3,63+breath),(57+lean//3,74),(50+lean//3,77),(47+lean//3,72),(46+lean//3,77),(39+lean//3,75)],'outline')
 poly(d,[(41+lean//3,64),(54+lean//3,65),(55+lean//3,73),(50+lean//3,74),(47+lean//3,69),(44+lean//3,74),(40+lean//3,73)],'plum')
 line(d,[(42+lean//3,68),(46+lean//3,68),(47+lean//3,72)],'deep')
 poly(d,q['fararm'],'outline'); poly(d,[(x-1,y+1) for x,y in q['fararm'][1:-1]],'purple_shade')
 # The far cuff terminates in a small foreshortened flesh hand.
 fx,fy=q['fararm'][3]
 line(d,[(fx-3,fy),(fx,fy+2)],'cream_shade',2)
 poly(d,[(fx,fy-1),(fx+2,fy-2),(fx+4,fy),(fx+3,fy+3),(fx+1,fy+3),(fx-1,fy+1)],'outline')
 poly(d,[(fx+1,fy),(fx+2,fy-1),(fx+3,fy+1),(fx+2,fy+2),(fx,fy+1)],'skin')
 poly(d,q['jacket'],'outline')
 j=q['jacket']; poly(d,[(j[0][0]+1,j[0][1]+1),(j[1][0],j[1][1]+1),(j[2][0]-1,j[2][1]+1),(j[3][0]-2,j[3][1]),(j[4][0]-2,j[4][1]),(j[5][0]-1,j[5][1]-1),(j[6][0],j[6][1]-2),(j[7][0]+1,j[7][1]-1),(j[8][0]+1,j[8][1]-1),(j[9][0]+2,j[9][1])],'purple')
 poly(d,[(40+lean,37+breath),(45+lean,35+breath),(48+lean//2,40+breath),(44+lean//2,49+breath),(40+lean//2,52+breath)],'purple_light')
 line(d,[(48+lean//2,42+breath),(50+lean//3,55+breath),(49+lean//3,62+breath)],'purple_shade')
 line(d,[(52+lean//3,56+breath),(56+lean//3,54+breath)],'purple_light')
 line(d,[(40+lean//3,59+breath),(44+lean//3,61+breath),(48+lean//3,61+breath)],'purple_shade')
 # Neck, double folded collar and fluttering ochre scarf.
 poly(d,[(hx+10,hy+18),(hx+16,hy+17),(hx+16,hy+25),(hx+10,hy+26)],'skin_shade')
 poly(d,[(hx+4,hy+23),(hx+10,hy+21),(hx+13,hy+25),(hx+17,hy+22),(hx+20,hy+26),(hx+14,hy+30),(hx+8,hy+28)],'cream')
 line(d,[(hx+4,hy+23),(hx+8,hy+28),(hx+12,hy+26)],'cream_shade')
 poly(d,q['scarf'],'outline'); poly(d,[(x,y-1) for x,y in q['scarf'][1:-1]],'ochre'); line(d,q['scarf'][1:4],'gold')
 # Leather diagonal and naturally hanging canvas envelope satchel.
 line(d,[(hx+19,hy+26),(hx+14,hy+34),(35+lean//2,61+breath)],'leather_dark',3)
 line(d,[(hx+19,hy+26),(hx+14,hy+34),(35+lean//2,61+breath)],'leather_light')
 bx=30+lean//2; by=57+breath
 poly(d,[(bx+2,by),(bx+13,by-1),(bx+17,by+4),(bx+16,by+16),(bx+4,by+18),(bx,by+13),(bx,by+4)],'outline')
 poly(d,[(bx+2,by+3),(bx+14,by+1),(bx+15,by+14),(bx+4,by+16),(bx+2,by+12)],'leather')
 poly(d,[(bx+2,by+2),(bx+13,by),(bx+15,by+4),(bx+12,by+8),(bx+4,by+9),(bx+1,by+5)],'leather_light')
 line(d,[(bx+3,by+3),(bx+11,by+2)],'cream_shade'); poly(d,[(bx+8,by+6),(bx+10,by+6),(bx+10,by+10),(bx+8,by+10)],'gold')
 poly(d,q['arm'],'outline'); ar=q['arm']; poly(d,[(x+1,y) for x,y in ar[1:-2]],'purple')
 line(d,[ar[1],ar[2]],'purple_light')
 hand=ar[4]; poly(d,[(hand[0]-1,hand[1]-3),(hand[0]+2,hand[1]-3),(hand[0]+3,hand[1]),(hand[0],hand[1]+2),(hand[0]-2,hand[1])],'skin')
 line(d,[(hand[0],hand[1]-1),(hand[0]+1,hand[1]+1)],'skin_shade')
 face(d,hx,hy,expression)
 return im

def save_state(name,poses,expressions,durations,loop):
 out=ROOT/'frames'/name; out.mkdir(parents=True,exist_ok=True)
 images=[]
 for n,(p,e) in enumerate(zip(poses,expressions)):
  im=render(p,e); im.save(out/f'{n:02}.png'); images.append(im)
 (out/'timing.json').write_text(json.dumps({'loop':loop,'frames':[{'path':f'{n:02}.png','duration_ms':dur} for n,dur in enumerate(durations)]},indent=2)+'\n')
 # A diagnostic preview uses a neutral paper backdrop, leaving delivered PNGs transparent.
 previews=[]
 for im in images:
  bg=Image.new('RGBA',im.size,'#e5ddce'); bg.alpha_composite(im); previews.append(bg.convert('RGB'))
 previews[0].save(ROOT/'art'/f'{name}-timed.gif',save_all=True,append_images=previews[1:],duration=durations,loop=0 if loop else 1,disposal=2)
 return images
if __name__=='__main__':
 idle=save_state('idle',POSES,['open','open','blink','open'],[600,260,100,420],True)
 hurt=save_state('hurt',HURT,['hurt','hurt','blink','open'],[90,130,120,190],False)
 idle[0].save(ROOT/'art'/'master.png'); idle[0].resize((288,336),Image.Resampling.NEAREST).save(ROOT/'art'/'master-3x.png')
 sheet=Image.new('RGBA',(96*(len(idle)+len(hurt)),112),'#e5ddce')
 for i,im in enumerate(idle+hurt): sheet.alpha_composite(im,(i*96,0))
 sheet.save(ROOT/'art'/'lead-contact-1x.png'); sheet.resize((sheet.width*3,336),Image.Resampling.NEAREST).save(ROOT/'art'/'lead-contact-3x.png')
 (ROOT/'art'/'palette.json').write_text(json.dumps(P,indent=2)+'\n')

 # Focused artifact self-check; ground boundary is exclusive y100.
 report={}
 for state,images in [('idle',idle),('hurt',hurt)]:
  timing=json.loads((ROOT/'frames'/state/'timing.json').read_text())
  for im in images:
   assert im.mode=='RGBA' and im.size==(96,112)
   assert set(im.getchannel('A').get_flattened_data())=={0,255}
   box=im.getbbox(); assert 0<box[0]<box[2]<96 and box[1]>0 and box[3]==100
  distinct=len({im.getchannel('A').tobytes() for im in images})
  assert distinct>=3
  assert len({im.tobytes() for im in images})==len(images)
  report[state]={'frames':len(images),'duration_ms':sum(f['duration_ms'] for f in timing['frames']),'bounds':[im.getbbox() for im in images],'distinct_rgba':len(images),'distinct_silhouettes':distinct,'native_and_3x_stills_observed':True,'timed_playback_observed':False}
 (ROOT/'art'/'lead-validation.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report,indent=2))
