"""Paint complete invitation and celebration cels, directly on the native grid.

Each sleeve and hand has an authored contour; no raster parts, bones, rotations,
or interpolation are used. Run each action's paint.py to reproduce its cels.
"""
import json
import hashlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'art'))
from ink import canvas, poly, line, dot, face, P

ROOT = Path(__file__).resolve().parents[1]


def sleeve(d, outer, inner, light):
    poly(d, outer, 'outline')
    poly(d, inner, 'purple')
    line(d, light, 'purple_light', 2)


def hand(d, contour, fill, creases):
    poly(d, contour, 'outline')
    poly(d, fill, 'skin_light')
    for crease in creases:
        line(d, crease, 'skin_shade')


def paint(p):
    im, d = canvas()
    x, h, hip = p['x'], p['head']-2, p['hip']
    # Lower silhouette changes at the knees, with soles anchored at y99.
    if p.get('crouch'):
        poly(d, [(36+x,hip),(58+x,hip-1),(65+x,78),(61+x,84),(55+x,82),(50+x,76),(44+x,80),(37+x,83),(30+x,78)], 'outline')
        poly(d, [(37+x,hip+1),(48+x,hip+1),(48+x,75),(40+x,80),(34+x,77)], 'plum')
        poly(d, [(50+x,hip+1),(57+x,hip),(62+x,77),(59+x,81),(54+x,79)], 'deep')
        poly(d, [(34+x,80),(40+x,81),(42,88),(37,92),(33,88)], 'outline')
        poly(d, [(35+x,81),(39+x,82),(40,88),(37,89),(35,87)], 'skin')
        poly(d, [(58+x,82),(63+x,80),(61,90),(55,92),(54,88)], 'outline')
        poly(d, [(59+x,83),(61+x,82),(59,89),(56,89)], 'skin_light')
    else:
        poly(d, [(36+x,hip-2),(58+x,hip-2),(60+x,75),(53+x,78),(48+x,74),(43+x,78),(35+x,75)], 'outline')
        poly(d, [(38+x,hip),(47+x,hip),(47+x,74),(41+x,76),(37+x,74)], 'plum')
        poly(d, [(49+x,hip),(56+x,hip-1),(58+x,74),(54+x,76),(50+x,73)], 'deep')
        line(d, [(49+x,hip+1),(48+x,73)], 'outline')
        poly(d, [(38+x,76),(44+x,77),(43,90),(36,91),(36,85)], 'outline')
        poly(d, [(39+x,77),(43+x,78),(41,89),(37,89),(38,84)], 'skin')
        line(d, [(38,87),(40,88)], 'skin_shade')
        poly(d, [(53+x,77),(58+x,76),(59,90),(52,92),(51,85)], 'outline')
        poly(d, [(54+x,78),(57+x,78),(57,89),(53,89),(53,84)], 'skin_light')
    # Two individually inked leather boots, including toe cap, cuff and sole.
    poly(d, [(35,85),(42,85),(43,94),(46,96),(46,99),(33,99),(33,95)], 'outline')
    poly(d, [(36,87),(41,87),(41,95),(44,96),(44,97),(35,97),(35,94)], 'leather')
    line(d, [(36,87),(40,87)], 'leather_light')
    line(d, [(35,98),(45,98)], 'sole')
    poly(d, [(52,85),(59,85),(60,94),(65,96),(65,99),(51,99),(50,95)], 'outline')
    poly(d, [(53,87),(58,87),(58,95),(63,96),(63,97),(52,97),(52,94)], 'leather')
    line(d, [(54,88),(57,88)], 'leather_light')
    line(d, [(52,98),(64,98)], 'sole')
    # Rear sleeve lies behind the coat; both contours are drawn for this cel.
    sleeve(d, *p['back'])
    hand(d, *p['back_hand'])
    sy = h + 25
    poly(d, [(38+x,sy),(46+x,sy-3),(54+x,sy-2),(60+x,sy+3),(58+x,hip-7),(59+x,hip-2),(53+x,hip+1),(41+x,hip),(36+x,hip-3),(36+x,sy+10)], 'outline')
    poly(d, [(39+x,sy+1),(46+x,sy-1),(52+x,sy),(57+x,sy+4),(55+x,hip-7),(57+x,hip-2),(52+x,hip-1),(41+x,hip-2),(38+x,hip-4)], 'purple')
    poly(d, [(39+x,sy+3),(43+x,sy+3),(42+x,hip-8),(38+x,hip-4),(37+x,hip-2)], 'purple_light')
    poly(d, [(54+x,sy+7),(56+x,sy+6),(54+x,hip-5),(56+x,hip-2),(52+x,hip-1),(49+x,hip-3)], 'purple_shade')
    line(d, [(48+x,sy+10),(48+x,hip-3)], 'purple_shade')
    dot(d, 50+x, hip-8, 'gold'); dot(d, 50+x, hip-4, 'gold')
    line(d, [(39+x,hip-6),(44+x,hip-6)], 'purple_shade')
    # Strap runs across the chest and feeds the left-hip mail satchel.
    line(d, [(55+x,sy+1),(39+x,hip-3)], 'outline', 4)
    line(d, [(55+x,sy+1),(39+x,hip-3)], 'leather_light', 2)
    by = hip-7+p.get('bag',0)
    poly(d, [(29+x,by),(40+x,by-1),(44+x,by+3),(43+x,by+15),(31+x,by+16),(27+x,by+12),(27+x,by+3)], 'outline')
    poly(d, [(30+x,by+1),(39+x,by),(42+x,by+4),(41+x,by+13),(31+x,by+14),(29+x,by+11),(29+x,by+4)], 'leather')
    poly(d, [(29+x,by+2),(41+x,by+2),(40+x,by+7),(36+x,by+9),(30+x,by+6)], 'leather_light')
    line(d, [(30+x,by+7),(36+x,by+10),(41+x,by+7)], 'leather_dark')
    poly(d, [(35+x,by+7),(38+x,by+7),(38+x,by+10),(35+x,by+10)], 'gold')
    # A little neck keeps raised shoulders and scarf physically connected.
    poly(d, [(46+x,h+18),(53+x,h+18),(53+x,sy+2),(46+x,sy+2)], 'outline')
    poly(d, [(48+x,h+20),(51+x,h+20),(51+x,sy+1),(48+x,sy+1)], 'skin')
    poly(d, [(42+x,h+23),(48+x,h+21),(51+x,h+25),(55+x,h+22),(58+x,h+26),(52+x,h+30),(46+x,h+28)], 'cream')
    face(d, 38+x+p.get('tilt',0), h, p.get('expression','smile'))
    if p.get('hair'):
        poly(d, [(40+x,h+7),(37+x,h+8),(35+x,h+11),(37+x,h+14),(40+x,h+12)], 'outline')
        poly(d, [(39+x,h+8),(37+x,h+10),(38+x,h+12),(40+x,h+11)], 'hair')
        dot(d,37+x,h+10,'hair_light')
    if p.get('expression')=='cheer':
        poly(d, [(51+x,h+16),(54+x,h+15),(54+x,h+18),(52+x,h+18)], 'outline')
        line(d, [(52+x,h+16),(53+x,h+16)], 'cream')
    poly(d, [(43+x,sy-3),(49+x,sy-3),(54+x,sy),(51+x,sy+4),(44+x,sy+2),(38+x,sy+4),(32+x,sy+2),(39+x,sy)], 'outline')
    poly(d, [(43+x,sy-3),(49+x,sy-3),(53+x,sy),(50+x,sy+2),(44+x,sy+1),(38+x,sy+2),(34+x,sy+1),(40+x,sy-1)], 'ochre')
    line(d, [(43+x,sy-3),(49+x,sy-3),(53+x,sy)], 'gold')
    tail=p.get('tail', [(38+x,sy+1),(43+x,sy+2),(35+x,sy+4),(31+x,sy+2)])
    poly(d, tail, 'outline')
    poly(d, [(a+(1 if a<45+x else -1),b-1) for a,b in tail], 'ochre')
    sleeve(d, *p['front'])
    hand(d, *p['front_hand'])
    return im


RELAX = ([(38,37),(34,40),(30,50),(30,59),(34,62),(39,57),(40,47)], [(37,39),(35,42),(32,51),(32,58),(34,59),(37,55),(38,46)], [(35,42),(33,50),(33,55)])
REST_HAND = ([(31,59),(35,59),(38,63),(36,68),(32,67),(30,63)], [(32,61),(35,61),(36,64),(35,66),(32,65)], [[(34,63),(35,64)]])

# These are distinct complete contours, including changing palm orientation.
WAVE = [
 dict(x=0,head=12,hip=65,front=([(57,37),(62,39),(67,49),(66,58),(61,61),(57,55),(55,45)],[(58,39),(61,41),(65,49),(64,56),(61,58),(59,54),(57,45)],[(60,42),(63,49)]),front_hand=([(61,58),(66,57),(68,61),(67,66),(63,68),(60,64)],[(63,59),(65,59),(67,62),(66,65),(63,66),(62,63)], [[(64,61),(65,64)]])),
 dict(x=-1,head=13,hip=66,front=([(56,38),(62,39),(67,46),(76,48),(76,54),(65,54),(59,49),(54,44)],[(57,40),(61,41),(65,48),(74,49),(74,52),(66,52),(60,47),(56,44)],[(60,41),(65,48),(71,49)]),front_hand=([(75,48),(81,46),(86,47),(85,49),(81,50),(86,51),(86,53),(80,55),(75,53)],[(77,49),(81,48),(83,48),(79,50),(84,52),(80,53),(77,52)], [[(79,51),(81,52)]])),
 dict(x=0,head=11,hip=64,tilt=1,front=([(58,36),(63,38),(70,46),(75,42),(76,35),(81,36),(81,45),(73,53),(68,53),(59,46)],[(59,38),(62,40),(69,49),(72,49),(78,44),(79,38),(77,37),(74,45),(70,48),(64,40)],[(61,39),(68,47)]),front_hand=([(76,36),(75,31),(76,26),(78,26),(79,30),(80,24),(82,24),(82,30),(84,27),(86,28),(84,34),(81,38)],[(77,33),(77,28),(78,32),(80,33),(81,27),(81,33),(84,30),(82,35),(80,36)], [[(79,34),(81,34)]])),
 dict(x=1,head=10,hip=64,tilt=1,front=([(59,35),(64,36),(72,44),(77,39),(74,29),(80,27),(84,41),(78,49),(72,52),(67,47)],[(60,37),(63,38),(71,46),(73,48),(76,46),(81,40),(78,30),(76,31),(79,40),(73,46),(65,39)],[(62,38),(69,44)]),front_hand=([(74,29),(71,24),(70,18),(72,17),(74,22),(74,15),(76,15),(77,21),(78,15),(80,16),(80,22),(82,18),(84,19),(82,27),(79,30)],[(75,27),(73,22),(72,19),(75,24),(75,18),(77,25),(79,18),(79,25),(82,21),(80,27),(78,28)], [[(75,25),(78,25)],[(77,26),(78,28)]])),
 dict(x=1,head=10,hip=64,tilt=1,front=([(59,35),(64,36),(72,44),(77,39),(79,29),(85,30),(84,42),(78,49),(72,52),(67,47)],[(60,37),(63,38),(71,46),(73,48),(76,46),(81,40),(83,32),(81,31),(79,40),(73,46),(65,39)],[(62,38),(69,44)]),front_hand=([(79,30),(78,25),(79,19),(81,19),(81,24),(83,17),(85,18),(84,24),(87,19),(89,20),(87,26),(90,23),(91,25),(86,31),(83,33)],[(80,28),(80,22),(81,26),(84,20),(83,27),(87,22),(85,28),(88,26),(85,30),(82,31)], [[(81,27),(84,28)],[(82,28),(83,30)]])),
 dict(x=0,head=11,hip=64,tilt=1,front=([(58,36),(64,37),(71,45),(75,40),(73,29),(79,27),(83,41),(78,49),(71,52),(65,46)],[(60,38),(63,39),(70,47),(73,48),(80,40),(77,30),(75,31),(77,40),(72,46),(65,40)],[(62,39),(69,45)]),front_hand=([(73,29),(70,24),(69,18),(71,17),(73,22),(73,15),(75,15),(76,21),(77,15),(79,16),(79,22),(81,18),(83,19),(81,27),(78,30)],[(74,27),(72,22),(71,19),(74,24),(74,18),(76,25),(78,18),(78,25),(81,21),(79,27),(77,28)], [[(74,25),(77,25)],[(76,26),(77,28)]])),
 dict(x=1,head=10,hip=64,tilt=1,front=([(59,35),(64,36),(72,44),(77,39),(79,29),(85,30),(84,42),(78,49),(72,52),(67,47)],[(60,37),(63,38),(71,46),(73,48),(76,46),(81,40),(83,32),(81,31),(79,40),(73,46),(65,39)],[(62,38),(69,44)]),front_hand=([(79,30),(78,25),(79,19),(81,19),(81,24),(83,17),(85,18),(84,24),(87,19),(89,20),(87,26),(90,23),(91,25),(86,31),(83,33)],[(80,28),(80,22),(81,26),(84,20),(83,27),(87,22),(85,28),(88,26),(85,30),(82,31)], [[(81,27),(84,28)],[(82,28),(83,30)]])),
 dict(x=0,head=11,hip=65,front=([(58,36),(63,38),(70,46),(76,42),(79,36),(84,39),(81,47),(74,53),(69,53),(60,46)],[(59,38),(62,40),(69,49),(73,50),(79,45),(82,40),(80,39),(77,44),(71,49),(64,40)],[(61,39),(68,47)]),front_hand=([(79,37),(79,32),(81,29),(83,30),(82,34),(86,29),(88,31),(85,35),(90,33),(91,35),(87,39),(83,41)],[(81,36),(81,32),(82,36),(86,32),(84,37),(88,35),(85,38),(83,39)], [[(82,37),(84,38)]])),
 dict(x=0,head=13,hip=66,front=([(57,38),(62,40),(68,49),(74,51),(73,57),(65,56),(60,51),(55,44)],[(58,40),(61,42),(66,51),(72,52),(71,55),(66,54),(61,49),(57,44)],[(60,43),(65,50)]),front_hand=([(73,51),(79,51),(83,54),(83,57),(80,59),(74,57),(72,55)],[(75,53),(78,53),(81,55),(81,57),(78,57),(75,56)], [[(78,54),(79,56)]])),
 dict(x=0,head=12,hip=65,front=([(57,37),(62,39),(67,49),(66,58),(61,61),(57,55),(55,45)],[(58,39),(61,41),(65,49),(64,56),(61,58),(59,54),(57,45)],[(60,42),(63,49)]),front_hand=([(61,58),(66,57),(68,61),(67,66),(63,68),(60,64)],[(63,59),(65,59),(67,62),(66,65),(63,66),(62,63)], [[(64,61),(65,64)]])),
]


def save_action(name, poses, durations, loop):
    folder=ROOT/name
    folder.mkdir(parents=True, exist_ok=True)
    images=[]
    for i,p in enumerate(poses):
        p.setdefault('back', RELAX)
        p.setdefault('back_hand', REST_HAND)
        im=paint(p)
        im.save(folder/f'{i:02}.png')
        images.append(im)
    (folder/'timing.json').write_text(json.dumps({'loop':loop,'frames':[{'path':f'{i:02}.png','duration_ms':t} for i,t in enumerate(durations)]},indent=2)+'\n')
    sheet=__import__('PIL.Image',fromlist=['Image']).new('RGBA',(96*len(images),112))
    for i,im in enumerate(images): sheet.paste(im,(i*96,0))
    sheet.save(folder/'contact.png')
    images[0].save(folder/'preview.gif',save_all=True,append_images=images[1:],duration=durations,loop=0 if loop else 1,disposal=2,transparency=0)
    assert len(set(im.tobytes() for im in images))>=len(images)-2
    palette={tuple(bytes.fromhex(color[1:]))+(255,) for color in P.values()}
    frames=[]
    for i,im in enumerate(images):
        assert im.size==(96,112) and im.getbbox()[3]==100
        assert set(im.getchannel('A').tobytes())=={0,255}
        assert {color for _,color in im.getcolors(96*112)}-{(0,0,0,0)}<=palette
        frames.append({'path':f'{i:02}.png','bbox':im.getbbox(),'sha256':hashlib.sha256((folder/f'{i:02}.png').read_bytes()).hexdigest()})
    report={'action':name,'frame_count':len(frames),'unique_cels':len({f['sha256'] for f in frames}),'duration_ms':sum(durations),'cell_size':[96,112],'feet_baseline_y':100,'binary_alpha':True,'shared_palette':True,'frames':frames}
    (folder/'validation.json').write_text(json.dumps(report,indent=2)+'\n')


if __name__=='__main__':
    save_action('wave',WAVE,[220,110,90,120,100,100,150,100,120,300],False)
