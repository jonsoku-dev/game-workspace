"""Eight individually inked whole cels. No raster parts, rigs or affine transforms.
Run with Python/Pillow from any directory; shared facial ink is in ../../art/ink.py.
Coordinates below are final native-canvas paths, authored for each individual pose.
"""
from pathlib import Path
import importlib.util
import json
import hashlib
from PIL import Image, ImageDraw
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('ink',HERE.parent.parent/'art'/'ink.py')
ink=importlib.util.module_from_spec(spec); spec.loader.exec_module(ink)
P=ink.P

def pts(text): return [tuple(map(int,p.split(','))) for p in text.split()]
def shape(d,text,key):
 p=pts(text); ink.poly(d,p,key); ink.line(d,p+[p[0]],'outline')
def line(d,text,key='outline',width=1): ink.line(d,pts(text),key,width)
def draw(p):
 im,d=ink.canvas()
 # Every coordinate path is pose ink, not a transformed articulated body.
 for key in ('back_arm','back_hand','rear_skin','rear_boot','front_skin','front_boot','shorts','coat'):
  shape(d,p[key],{'back_arm':'purple_shade','back_hand':'skin','rear_skin':'skin_shade','rear_boot':'leather_dark','front_skin':'skin','front_boot':'leather','shorts':'plum','coat':'purple'}[key])
 for text in p.get('folds',[]): line(d,text,'purple_shade',2)
 line(d,p['hem'],'purple_light')
 line(d,p['seam'],'purple_shade')
 shape(d,p['tail'],'ochre')
 shape(d,p['arm'],'purple_light')
 shape(d,p['hand'],'skin_light')
 line(d,p['cuff'],'cream',2)
 line(d,p['strap'],'leather_dark',3)
 line(d,p['strap'],'leather_light')
 shape(d,p['bag'],'leather')
 shape(d,p['flap'],'leather_light')
 line(d,p['bag_seam'],'leather_dark')
 bx,by=p['buckle']; d.rectangle((bx,by,bx+2,by+2),fill=P['gold'])
 shape(d,p['neck'],'skin_shade')
 shape(d,p['innercollar'],'cream')
 shape(d,p['collar'],'ochre')
 line(d,p['collar_glint'],'gold',2)
 ink.face(d,*p['head'],expression=p.get('expression','open'))
 for x,y in p['buttons']: d.point((x,y),fill=P['cream'])
 for path in p['boot_glints']: line(d,path,'leather_light')
 return im

POSES=[
# Balanced guard, satchel weighted at the near hip.
dict(head=(38,10),
back_arm='37,37 31,39 28,51 30,61 35,61 36,49 41,43',
rear_skin='38,72 46,73 44,89 37,89', rear_boot='37,84 44,85 45,95 49,97 49,99 35,99 35,95',
front_skin='50,73 57,73 58,88 51,90',front_boot='51,84 58,84 60,95 65,97 65,99 50,99',
shorts='36,65 59,65 59,77 49,78 46,72 44,78 35,77',
coat='39,34 50,33 57,36 61,45 59,55 60,64 55,68 43,68 35,65 35,54 34,41',
folds=['39,44 37,57 37,62','51,46 54,59 57,63'],hem='36,64 43,66 54,66 58,63',seam='47,41 46,65',
tail='38,35 32,37 27,45 31,44 28,50 36,45 42,37',
arm='53,38 59,40 62,52 58,60 53,57 56,50 51,44', hand='54,57 57,57 58,61 56,64 53,61',cuff='53,56 58,58',
strap='53,37 46,47 35,62',bag='28,59 39,58 44,62 43,73 39,76 28,73 26,66',flap='28,59 40,59 43,63 38,67 28,65',bag_seam='29,68 29,72 39,74 41,70',buckle=(35,65),
collar='38,33 44,32 51,34 51,39 45,41 38,38',collar_glint='39,35 45,37 49,36',buttons=[(47,47),(47,54),(47,61)],boot_glints=['38,91 41,91','53,91 56,90']),
# Anticipation: hip drops, rear heel light, bag pulls behind left hip.
dict(head=(34,15),
back_arm='35,42 29,41 24,48 23,59 29,63 33,58 30,52 39,48',
rear_skin='37,75 44,76 39,89 34,88',rear_boot='34,86 41,88 39,94 43,97 42,99 29,98 29,95',
front_skin='51,76 58,77 61,88 55,91 49,83',front_boot='55,88 61,87 64,95 69,97 69,99 53,99 52,96',
shorts='35,69 55,68 60,77 51,82 46,77 43,81 34,78',
coat='35,39 45,38 53,43 55,55 58,70 50,76 43,73 33,76 29,70 31,53 29,45',
folds=['35,50 33,64 34,71','46,48 49,65 53,70'],hem='31,71 34,73 43,71 50,74 56,70',seam='42,45 43,69',
tail='35,38 30,40 24,39 19,35 21,42 18,44 30,46 38,42',
arm='49,43 55,46 54,56 44,63 38,60 42,55 47,52 45,46',hand='37,58 41,57 44,60 42,63 38,63 36,61',cuff='38,58 41,63',
strap='48,42 39,50 29,60',bag='18,57 29,55 36,59 35,70 27,74 17,68 15,62',flap='18,57 29,56 34,60 28,64 17,62',bag_seam='18,65 20,68 27,71 32,68',buckle=(25,62),
collar='34,38 40,37 48,40 47,45 40,46 34,42',collar_glint='35,40 40,43 45,42',buttons=[(43,51),(44,57),(45,64)],boot_glints=['32,93 35,93','57,93 60,92']),
# Deep coil: both knees loaded; bag now in hand, shoulder reaches back.
dict(head=(31,18),
back_arm='36,44 28,43 22,49 17,50 16,55 23,57 33,52 39,49',
rear_skin='34,77 41,79 34,89 28,88',rear_boot='29,86 35,89 33,94 36,97 35,99 23,98 23,95',
front_skin='48,78 56,77 63,87 57,92 49,87 44,83',front_boot='57,88 63,87 66,95 72,97 72,99 56,99 54,96',
shorts='32,70 51,70 58,77 50,84 43,79 36,83 29,78',
coat='33,42 43,41 51,47 51,57 55,70 48,77 39,74 31,78 25,72 28,55 27,48',
folds=['31,51 29,65 30,72','43,50 46,65 50,71'],hem='27,72 31,75 39,72 47,75 53,71',seam='39,49 40,69',
tail='32,41 25,42 20,38 15,36 18,43 15,46 28,49 36,45',
arm='43,47 49,48 45,55 32,58 26,53 30,48 39,50',hand='24,50 28,50 30,53 28,56 24,55 23,52',cuff='27,51 29,55',
strap='43,45 31,49 22,54',bag='10,49 22,48 28,53 27,65 18,68 8,62 7,55',flap='10,49 22,49 26,53 20,58 9,55',bag_seam='10,59 12,62 18,65 24,62',buckle=(17,56),
collar='31,41 38,40 45,43 45,48 38,49 31,45',collar_glint='32,43 38,46 42,45',buttons=[(40,54),(41,60),(42,66)],boot_glints=['25,94 29,94','59,93 63,92']),
# Release: broad connected sleeve and torso, bag sweeping across body.
dict(head=(41,14),
back_arm='43,41 37,40 32,46 30,55 35,57 40,50 48,46',
rear_skin='34,72 42,76 31,91 25,89',rear_boot='26,87 32,91 28,96 30,98 28,99 17,98 17,95',
front_skin='53,73 61,72 65,88 58,90 52,81',front_boot='58,87 65,86 68,95 74,97 74,99 57,99',
shorts='34,66 58,65 63,75 53,80 46,73 39,78 31,74',
coat='40,37 50,36 59,42 59,54 62,67 54,73 46,68 37,72 27,69 32,56 34,44',
folds=['38,46 33,61 31,67','51,46 56,60 58,66'],hem='29,68 37,70 46,66 54,71 60,67',seam='46,43 46,64',
tail='40,36 32,37 22,32 17,32 23,38 21,42 35,44 44,40',
arm='54,40 61,40 68,47 72,51 68,58 61,56 56,49 50,47',hand='68,49 74,49 78,53 76,59 71,60 67,56',cuff='67,50 65,55',
strap='54,39 60,47 70,57',bag='68,54 80,51 87,55 89,66 82,72 69,69 65,61',flap='68,54 80,52 85,55 80,61 68,61',bag_seam='69,64 72,68 81,69 85,65',buckle=(76,59),
collar='40,36 47,35 54,38 54,43 47,44 40,40',collar_glint='41,38 47,41 51,40',buttons=[(48,48),(48,55),(48,61)],boot_glints=['21,94 25,95','61,91 65,91']),
# Contact: force travels through long lunge, enlarged near bag foreshortens.
dict(head=(47,15),
back_arm='47,40 39,40 33,47 28,50 27,55 33,58 41,50 51,46',
rear_skin='33,72 41,75 27,91 20,89',rear_boot='21,86 28,90 23,96 24,99 20,99 11,97 12,94',
front_skin='58,73 65,72 70,89 63,91 58,83',front_boot='63,87 70,87 73,95 80,97 80,99 62,99',
shorts='37,65 60,65 67,75 57,81 49,73 39,78 31,74',
coat='44,36 55,36 64,42 66,55 65,67 57,74 48,68 37,73 24,68 31,57 37,43',
folds=['39,45 33,59 28,66','55,46 60,59 62,66'],hem='27,68 37,71 48,66 57,72 64,67',seam='50,43 49,63',
tail='44,36 35,36 25,31 18,31 23,36 18,39 30,43 45,42',
arm='59,40 68,41 77,46 82,49 82,56 75,59 68,54 60,50 55,47',hand='77,48 84,46 90,49 91,56 87,61 80,59 77,54',cuff='76,49 75,56',
strap='59,39 68,44 82,53',bag='74,52 86,49 93,55 94,68 87,78 73,75 68,65 69,57',flap='74,52 86,50 92,55 85,63 72,61',bag_seam='73,66 76,73 86,75 91,67',buckle=(81,61),
collar='44,36 51,35 59,38 59,43 51,44 44,40',collar_glint='45,38 51,41 56,40',buttons=[(52,48),(52,54),(51,61)],boot_glints=['16,93 20,95','65,92 69,91']),
# Follow through: sleeve folds inward and bag drops beyond the planted knee.
dict(head=(46,16),
back_arm='48,42 41,40 37,44 34,52 37,57 42,52 50,47',
rear_skin='37,74 44,76 34,91 27,90',rear_boot='28,87 35,90 32,96 35,98 33,99 22,99 21,96',
front_skin='57,74 64,73 67,89 60,90',front_boot='60,87 67,87 69,95 76,97 76,99 59,99',
shorts='38,67 60,66 65,76 56,80 49,75 42,80 34,76',
coat='44,38 54,37 62,43 64,56 63,69 56,74 48,70 39,74 28,71 34,55 36,45',
folds=['39,47 36,62 32,69','54,48 59,62 60,68'],hem='30,71 39,72 48,68 56,72 61,69',seam='50,45 49,66',
tail='44,38 36,38 28,34 22,34 25,39 22,42 34,45 46,43',
arm='58,42 65,44 70,55 68,66 62,67 61,58 54,49',hand='63,65 67,65 69,69 67,73 64,72 62,69',cuff='62,64 67,65',
strap='58,41 62,55 66,70',bag='62,71 74,67 81,72 82,83 75,89 62,86 58,78',flap='62,71 74,68 79,72 74,78 61,77',bag_seam='62,80 65,85 75,86 78,81',buckle=(69,76),
collar='43,37 50,36 57,39 57,44 50,45 43,41',collar_glint='44,39 50,42 54,41',buttons=[(51,50),(51,56),(50,63)],boot_glints=['25,95 29,95','62,92 65,91']),
# Recoil: bring weight back between feet, bag returns toward the torso.
dict(head=(41,13),
back_arm='42,39 35,39 30,47 30,57 35,59 38,49 46,44',
rear_skin='38,73 45,74 41,89 35,90',rear_boot='35,87 42,87 42,95 46,97 46,99 32,99 32,96',
front_skin='53,74 60,74 61,89 55,90',front_boot='55,87 61,87 64,95 70,97 70,99 54,99',
shorts='36,66 58,66 61,77 52,79 47,73 43,79 34,77',
coat='40,36 51,35 58,40 60,53 61,69 54,73 47,69 40,73 31,70 34,54 34,43',
folds=['39,46 36,63 34,68','51,46 55,61 57,68'],hem='33,69 40,71 47,67 54,71 59,68',seam='47,43 47,65',
tail='39,35 32,37 25,36 22,39 28,42 27,46 36,43 43,39',
arm='54,40 61,42 64,52 58,62 51,62 50,57 56,52 51,46',hand='50,60 54,59 56,62 55,66 52,66 49,63',cuff='51,58 54,63',
strap='54,38 48,49 43,65',bag='38,65 49,63 55,67 54,78 47,82 36,78 34,71',flap='38,65 49,64 53,68 47,73 36,71',bag_seam='38,74 39,77 47,80 51,76',buckle=(44,71),
collar='39,35 46,34 53,37 53,42 46,43 39,39',collar_glint='40,37 46,40 50,39',buttons=[(48,48),(48,55),(48,61)],boot_glints=['35,92 39,92','57,92 60,91']),
# Settle, scarf and bag finish after the body.
dict(head=(38,10),
back_arm='37,37 31,40 28,52 31,62 36,61 36,50 41,43',
rear_skin='38,72 46,73 44,89 37,89',rear_boot='37,84 44,85 45,95 49,97 49,99 35,99 35,95',
front_skin='50,73 57,73 58,88 51,90',front_boot='51,84 58,84 60,95 65,97 65,99 50,99',
shorts='36,65 59,65 59,77 49,78 46,72 44,78 35,77',
coat='39,34 50,33 57,36 61,45 59,55 60,64 55,68 43,68 35,65 35,54 34,41',
folds=['39,44 37,57 37,62','51,46 54,59 57,63'],hem='36,64 43,66 54,66 58,63',seam='47,41 46,65',
tail='38,35 33,38 30,46 33,44 31,51 37,46 42,37',
arm='53,38 59,40 62,52 58,61 53,58 56,50 51,44',hand='54,58 57,58 58,62 56,65 53,62',cuff='53,57 58,59',
strap='53,37 46,48 36,63',bag='29,60 40,59 45,63 44,74 40,77 29,74 27,67',flap='29,60 41,60 44,64 39,68 29,66',bag_seam='30,69 30,73 40,75 42,71',buckle=(36,66),
collar='38,33 44,32 51,34 51,39 45,41 38,38',collar_glint='39,35 45,37 49,36',buttons=[(47,47),(47,54),(47,61)],boot_glints=['38,91 41,91','53,91 56,90']),
]
BACK_HANDS=[
 '28,53 33,53 34,58 31,61 27,58',
 '23,55 28,56 30,61 27,65 22,62',
 '16,50 21,50 23,54 20,58 15,56',
 '29,51 34,52 35,56 31,59 27,56',
 '26,50 30,52 30,56 26,59 23,56',
 '34,51 39,52 40,56 37,60 33,56',
 '29,53 34,54 35,58 32,62 28,59',
 '28,54 33,54 34,59 31,62 27,59',
]
NECKS=[
 '48,28 54,27 54,36 48,37', '44,33 50,32 50,41 44,42',
 '41,36 47,35 47,44 41,45', '51,32 57,31 57,40 51,41',
 '57,33 63,32 63,41 57,42', '56,34 62,33 62,42 56,43',
 '51,31 57,30 57,39 51,40', '48,28 54,27 54,36 48,37',
]
INNER_COLLARS=[
 '44,31 48,30 51,34 55,30 58,34 53,40 46,37',
 '40,36 44,35 47,39 51,35 54,39 49,45 42,42',
 '37,39 41,38 44,42 48,38 51,42 46,48 39,45',
 '47,35 51,34 54,38 58,34 61,38 56,44 49,41',
 '53,36 57,35 60,39 64,35 67,39 62,45 55,42',
 '52,37 56,36 59,40 63,36 66,40 61,46 54,43',
 '47,34 51,33 54,37 58,33 61,37 56,43 49,40',
 '44,31 48,30 51,34 55,30 58,34 53,40 46,37',
]
for pose,hand,neck,inner in zip(POSES,BACK_HANDS,NECKS,INNER_COLLARS):
 pose['back_hand']=hand; pose['neck']=neck; pose['innercollar']=inner
DURATIONS=[90,100,110,60,100,90,110,160]

def export(poses=POSES,durations=DURATIONS,folder=HERE):
 frames=[]; ims=[]
 for i,(p,ms) in enumerate(zip(poses,durations)):
  im=draw(p); im.save(folder/f'{i:02}.png'); ims.append(im)
  frames.append({'path':f'{i:02}.png','duration_ms':ms})
 (folder/'timing.json').write_text(json.dumps({'loop':False,'frames':frames},indent=2)+'\n')
 sheet=Image.new('RGBA',(96*len(ims),112),(0,0,0,0))
 for i,im in enumerate(ims): sheet.alpha_composite(im,(96*i,0))
 sheet.save(folder/'sheet.png')
 backgrounds=[]
 for im in ims:
  bg=Image.new('RGBA',im.size,'#e9e1d2'); bg.alpha_composite(im); backgrounds.append(bg.convert('RGB').resize((384,448),Image.Resampling.NEAREST))
 backgrounds[0].save(folder/'preview.gif',save_all=True,append_images=backgrounds[1:],duration=durations,loop=0,disposal=2)
 assert len({im.tobytes() for im in ims})==len(ims)
 allowed={tuple(bytes.fromhex(value[1:]))+(255,) for value in P.values()}
 checks=[]
 for i,im in enumerate(ims):
  assert im.size==(96,112) and im.getbbox()[0]>0 and im.getbbox()[2]<=95
  assert {im.getpixel((x,y)) for y in range(112) for x in range(96)} <= allowed|{(0,0,0,0)}
  visible={(x,y) for y in range(112) for x in range(96) if im.getpixel((x,y))[3]}
  pending=[visible.pop()]
  while pending:
   x,y=pending.pop()
   for neighbor in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
    if neighbor in visible: visible.remove(neighbor); pending.append(neighbor)
  assert not visible, 'Disconnected cel silhouette'
  assert im.getbbox()[3]<=100, 'Feet below ground boundary'
  checks.append({'path':f'{i:02}.png','bbox':im.getbbox(),'connected_silhouette':True,
                 'sha256':hashlib.sha256((folder/f'{i:02}.png').read_bytes()).hexdigest()})
 (folder/'validation.json').write_text(json.dumps({
  'native_size':[96,112],'alpha':'binary','palette':'../../art/palette.json',
  'unique_poses':len(ims),'duration_ms':sum(durations),'loop':False,'frames':checks,
  'evidence':'Local raster assertions; source rerender and static sheet inspection. Timed player review is separate.'
 },indent=2)+'\n')
 return ims
if __name__=='__main__': export()
