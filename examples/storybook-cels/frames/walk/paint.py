"""Authored cel contours, never a rig, rotation, skeleton or interpolation.
Each row is a complete drawn leg or arm contour in native pixels.
Run from any cwd; output is restricted to the walk and run directories.
"""
from pathlib import Path
import sys, json
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'art'))
from ink import canvas, poly, line, dot, face, P
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parent.parent

def pts(s): return [tuple(map(int,p.split(','))) for p in s.split()]
def shape(d,s,c,outline=True):
 p=pts(s); poly(d,p,c)
 if outline: line(d,p+[p[0]],'outline')

# Full hip-to-toe outlines, then intentional boot contours. Near and far
# legs are separately inked, including their visible knee and calf shapes.
WALK=[
# contact, compression, passing, high point, reach, recoil; opposing half.
('contact near heel',0,
 '43,65 51,66 55,77 61,89 62,95 68,97 68,99 57,99 56,94 50,84 45,78', '57,84 61,86 62,95 68,97 68,99 57,99 56,94 54,86',
 '39,65 46,67 43,77 36,89 34,94 37,96 37,99 27,99 27,97 31,93 32,87 35,76','33,83 38,86 34,94 37,96 37,99 27,99 27,97 31,93 31,87'),
('down near support',2,
 '43,67 51,68 55,79 57,90 57,96 63,97 64,99 52,99 51,94 49,85 43,79','51,84 57,85 57,96 63,97 64,99 52,99 51,95 49,87',
 '39,67 45,68 43,78 39,85 34,88 31,94 27,96 25,94 29,88 33,82 35,75','34,81 39,84 32,93 28,96 25,94 29,89'),
('near mid support far passing',1,
 '43,66 50,67 52,78 51,89 50,96 57,97 58,99 46,99 45,94 45,84 41,77','46,84 52,84 50,96 57,97 58,99 46,99 45,94',
 '39,66 45,67 49,76 51,82 48,88 42,91 40,95 36,94 38,89 44,85 43,79 37,74','46,81 51,83 43,91 40,95 36,94 38,90'),
('up far knee leads',-1,
 '43,64 50,65 48,78 45,88 42,94 43,97 47,98 46,99 38,99 36,96 39,88 39,76','40,83 46,85 41,94 43,97 47,98 46,99 38,99 36,96',
 '39,64 46,65 54,73 57,78 55,85 56,90 53,93 49,92 49,88 50,81 44,78 38,73','51,81 56,81 56,90 53,93 49,92 49,89'),
('far leg unfolding',-1,
 '43,64 49,65 46,78 40,88 35,94 36,97 40,98 39,99 31,99 29,96 33,89 36,76','37,83 42,86 35,94 36,97 40,98 39,99 31,99 29,96',
 '39,64 46,65 54,73 58,82 61,91 65,94 64,97 56,96 55,90 50,83 45,79 38,74','54,84 60,83 61,92 65,94 64,97 56,96 55,92'),
('far heel approaches',0,
 '43,65 49,66 44,78 37,88 32,94 34,96 38,98 37,99 28,99 26,96 30,89 34,76','34,83 39,86 32,94 34,96 38,98 37,99 28,99 26,96',
 '39,65 46,66 53,76 60,88 63,95 69,97 69,99 58,99 57,94 51,85 45,79 38,75','55,84 60,84 63,95 69,97 69,99 58,99 57,94'),
('contact far heel',0,
 '43,65 50,66 46,78 39,89 37,94 40,96 40,99 30,99 29,97 33,93 34,87 37,76','35,83 41,86 37,94 40,96 40,99 30,99 29,97 33,93',
 '39,65 46,66 52,77 58,89 59,95 65,97 65,99 54,99 53,94 47,84 41,78','53,84 58,86 59,95 65,97 65,99 54,99 53,94 50,86'),
('down far support',2,
 '43,67 50,68 47,78 43,85 38,88 35,94 31,96 29,94 33,88 37,82 39,75','38,81 43,84 36,93 32,96 29,94 33,89',
 '39,67 46,68 51,79 53,90 53,96 59,97 60,99 48,99 47,94 45,85 39,79','47,84 53,85 53,96 59,97 60,99 48,99 47,95 45,87'),
('far mid support near passing',1,
 '43,66 50,67 54,76 56,82 53,88 47,91 45,95 41,94 43,89 49,85 48,79 41,74','51,81 56,83 48,91 45,95 41,94 43,90',
 '39,66 46,67 48,78 47,89 46,96 53,97 54,99 42,99 41,94 41,84 37,77','42,84 48,84 46,96 53,97 54,99 42,99 41,94'),
('up near knee leads',-1,
 '43,64 50,65 58,73 61,78 59,85 60,90 57,93 53,92 53,88 54,81 48,78 42,73','55,81 60,81 60,90 57,93 53,92 53,89',
 '39,64 46,65 44,78 41,88 38,94 39,97 43,98 42,99 34,99 32,96 35,88 35,76','36,83 42,85 37,94 39,97 43,98 42,99 34,99 32,96'),
('near leg unfolding',-1,
 '43,64 50,65 58,73 62,82 65,91 69,94 68,97 60,96 59,90 54,83 49,79 42,74','58,84 64,83 65,92 69,94 68,97 60,96 59,92',
 '39,64 45,65 42,78 36,88 31,94 32,97 36,98 35,99 27,99 25,96 29,89 32,76','33,83 38,86 31,94 32,97 36,98 35,99 27,99 25,96'),
('near heel approaches',0,
 '43,65 50,66 57,76 64,88 67,95 73,97 73,99 62,99 61,94 55,85 49,79 42,75','59,84 64,84 67,95 73,97 73,99 62,99 61,94',
 '39,65 45,66 40,78 33,88 28,94 30,96 34,98 33,99 24,99 22,96 26,89 30,76','30,83 35,86 28,94 30,96 34,98 33,99 24,99 22,96'),
]
# Sleeve/forearm continuous silhouettes: hand shapes deliberately compress
# during foreshortening. No endpoint-to-endpoint bone drawing is used.
WA=[
('39,36 44,38 42,49 36,58 31,63 27,62 27,59 32,55 35,46','54,37 59,38 62,48 66,57 71,59 72,62 68,65 64,63 59,56 55,49'),
('39,38 44,40 43,50 39,60 35,66 31,66 30,62 34,58 36,48','54,39 59,40 61,50 64,58 68,62 67,66 63,67 59,63 56,55'),
('39,37 44,39 44,51 44,62 41,68 37,68 36,64 38,60 37,49','54,38 59,40 60,52 59,62 60,66 57,69 53,67 52,62 53,51'),
('39,35 44,37 47,48 51,57 54,60 53,64 49,65 45,60 41,53 37,46','54,36 59,38 58,49 54,58 51,64 47,64 46,60 49,55 51,47'),
('39,35 44,37 49,46 55,53 60,55 60,59 56,62 51,59 45,53 38,46','54,36 59,38 56,48 50,56 45,61 41,60 41,57 46,52 50,45'),
('39,36 44,38 50,46 57,51 63,53 64,57 60,60 54,57 47,53 39,46','54,37 59,39 55,49 48,57 43,61 39,60 39,56 44,52 49,45'),
('39,36 44,38 50,46 58,52 64,54 65,58 61,61 55,58 47,54 39,47','54,37 59,39 55,49 47,58 42,63 38,62 38,58 43,54 49,46'),
('39,38 44,40 49,48 55,57 59,61 58,65 54,67 49,63 44,56 38,47','54,39 59,41 56,51 50,60 46,66 42,66 41,62 46,57 50,48'),
('39,37 44,39 47,50 48,62 49,66 46,69 42,67 41,62 40,51','54,38 59,40 57,51 55,61 52,67 48,67 47,63 50,59 51,48'),
('39,35 44,37 44,48 41,59 37,65 33,65 32,61 37,56 37,47','54,36 59,38 62,48 64,59 67,63 65,67 61,66 57,61 54,52'),
('39,35 44,37 42,48 36,57 31,62 27,61 26,58 31,53 35,45','54,36 59,38 63,47 68,55 72,58 72,62 68,64 63,60 58,54'),
('39,36 44,38 42,49 35,58 29,63 25,62 25,59 30,54 35,46','54,37 59,39 63,48 68,57 73,60 73,64 69,66 64,62 59,55'),
]

def leg(d,body,boot,near):
 shape(d,body,'skin' if near else 'skin_shade')
 # The topmost visible short panel follows each leg's independently drawn outline.
 ps=pts(body); a,b,c=ps[:3]; last=ps[-1]
 poly(d,[a,b,c,last],'plum' if near else 'deep')
 line(d,[last,c],'outline')
 shape(d,boot,'leather' if near else 'leather_dark')
 bp=pts(boot); line(d,[bp[-1],bp[0],bp[1]],'leather_light' if near else 'leather')
 # One-pixel toe/sole boundary is kept horizontal only on full plant cels.
 low=max(y for x,y in bp)
 xs=[x for x,y in bp if y==low]
 if len(xs)>1: line(d,[(min(xs),low),(max(xs),low)],'sole')

def arm(d,s,near):
 shape(d,s,'purple' if near else 'purple_shade')
 ps=pts(s)
 # Last outward point and its neighbours are the authored palm, not a rotated hand.
 poly(d,ps[4:8],'skin' if near else 'skin_shade')
 line(d,[ps[4],ps[5],ps[6],ps[7]],'outline')
 line(d,[ps[2],ps[3]],'purple_light' if near else 'deep')

def walk_body(d,i,bob):
 # Independently selected compression/high-point jacket contours.
 bodies={0:'39,35 48,34 57,36 59,45 57,54 58,63 51,66 38,64 37,54 36,44',
 2:'39,37 48,36 57,38 60,46 58,55 59,65 51,68 37,66 36,55 36,45',
 1:'39,36 48,35 57,37 59,46 57,54 58,64 51,67 38,65 37,54 36,45',
 -1:'39,34 48,33 57,35 59,43 57,53 58,62 51,65 38,63 37,53 36,43'}
 shape(d,bodies[bob],'purple')
 poly(d,[(40,38+bob),(45,37+bob),(44,57+bob),(41,62+bob),(38,61+bob),(39,47+bob)],'purple_shade')
 line(d,[(53,42+bob),(53,59+bob),(51,63+bob)],'purple_light')
 line(d,[(39,61+bob),(49,63+bob),(57,61+bob)],'outline')
 for yy in (44,51,58): dot(d,51,yy+bob,'gold')
 # Shirt collar, ochre tied scarf and shoulder strap.
 shape(d,f'43,{32+bob} 51,{32+bob} 55,{36+bob} 49,{41+bob} 43,{37+bob}','cream')
 shape(d,f'43,{33+bob} 50,{34+bob} 52,{38+bob} 48,{40+bob} 42,{37+bob}','ochre')
 line(d,[(55,37+bob),(52,43+bob),(37,62+bob)],'leather_dark',2)
 line(d,[(56,37+bob),(53,43+bob),(38,62+bob)],'leather_light')
 # Bag is a fixed object painted again with a separately authored sway silhouette.
 bags=['30,58 40,57 45,61 44,72 40,75 29,72 28,64',
       '29,60 40,59 45,63 44,74 40,77 28,74 27,66',
       '30,59 41,58 46,62 44,73 40,75 29,73 28,65',
       '31,56 42,56 47,60 45,71 40,73 30,70 29,63']
 shape(d,bags[(i%6)//2],'leather')
 line(d,[(31,62+bob),(38,64+bob),(43,62+bob)],'leather_light')
 shape(d,f'36,{65+bob} 39,{65+bob} 39,{68+bob} 36,{68+bob}','gold',False)

def scarf(d,i,bob,run=False):
 tails=[
 '44,34 38,35 32,33 26,34 21,31 25,38 32,39 38,38 44,39',
 '44,34 37,35 30,32 24,32 19,29 22,36 30,38 37,38 44,39',
 '44,34 37,34 30,31 23,30 18,27 20,34 29,37 37,38 44,39',
 '44,34 37,33 31,29 24,27 19,25 19,31 28,35 36,37 44,39',
 '44,34 38,33 32,29 25,28 21,26 20,32 29,36 37,37 44,39',
 '44,34 38,34 32,31 26,31 22,28 23,35 31,38 38,38 44,39']
 p=pts(tails[i%6]); dx=6 if run else 0
 poly(d,[(x+dx,y+bob) for x,y in p],'outline')
 poly(d,[(x+dx,y+bob+1) for x,y in p[1:-1]],'ochre')
 line(d,[(37+dx,35+bob),(30+dx,33+bob),(25+dx,33+bob)],'gold')

def save_cycle(name,rows,arms):
 out=ROOT/name; out.mkdir(exist_ok=True)
 ims=[]
 for i,(label,bob,nb,nt,fb,ft) in enumerate(rows):
  im,d=canvas()
  arm(d,arms[i][1],False); leg(d,fb,ft,False); leg(d,nb,nt,True)
  scarf(d,i,bob); walk_body(d,i,bob); arm(d,arms[i][0],True)
  shape(d,f'43,{29+bob} 50,{29+bob} 52,{33+bob} 49,{36+bob} 43,{33+bob}','cream')
  shape(d,f'42,{31+bob} 49,{31+bob} 51,{34+bob} 48,{36+bob} 42,{34+bob}','ochre')
  face(d,x=38,y=10+bob,expression='open')
  im.save(out/f'{i:02}.png'); ims.append(im)
 durations=[100,80,90,80,70,80]*2
 manifest={'loop':True,'frames':[{'path':f'{i:02}.png','duration_ms':durations[i]} for i in range(len(ims))]}
 (out/'timing.json').write_text(json.dumps(manifest,indent=2)+'\n')
 sheet=Image.new('RGBA',(96*6,132*2),'#e8ddd0'); sd=ImageDraw.Draw(sheet)
 for i,im in enumerate(ims):
  x=i%6*96;y=i//6*132; sheet.alpha_composite(im,(x,y));sd.text((x+3,y+111),f'{i:02} {rows[i][0].split()[0]}',fill='#302536')
 sheet.save(out/'contact-sheet.png')
 scaled=[im.resize((384,448),Image.Resampling.NEAREST) for im in ims]
 scaled[0].save(out/'cycle.gif',save_all=True,append_images=scaled[1:],duration=durations,loop=0,disposal=2)
 return ims

if __name__=='__main__': save_cycle('walk',WALK,WA)
