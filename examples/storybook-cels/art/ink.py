"""Native pixel ink only: explicit polygons, no image parts or transforms."""
from PIL import Image, ImageDraw
P = {
 'outline':'#302536','plum':'#433247','deep':'#50405e',
 'purple':'#77619b','purple_light':'#aa8cb7','purple_shade':'#5b4979',
 'cream':'#f3dfb2','cream_shade':'#cfb58b','ochre':'#cf914b','gold':'#edbd68',
 'hair':'#694034','hair_dark':'#493039','hair_light':'#ae7047','hair_glint':'#ca925c',
 'skin':'#e9af83','skin_light':'#f5c99a','skin_shade':'#bc7867','blush':'#ce8172',
 'leather':'#80533e','leather_light':'#af7951','leather_dark':'#523b36','sole':'#382e36',
}
def canvas():
 im=Image.new('RGBA',(96,112)); return im,ImageDraw.Draw(im)
def col(c): return P.get(c,c)
def poly(d,points,c): d.polygon(points,fill=col(c))
def line(d,points,c,width=1): d.line(points,fill=col(c),width=width)
def dot(d,x,y,c): d.point((x,y),fill=col(c))
def face(d,x=38,y=10,expression='open',view='right'):
 """21×20 crown/face, full ink from coordinates. x,y crown origin; no raster reuse."""
 def p(points,c): poly(d,[(x+a,y+b) for a,b in points],c)
 def l(points,c): line(d,[(x+a,y+b) for a,b in points],c)
 p([(2,4),(4,2),(8,0),(14,1),(17,3),(19,6),(18,10),(20,12),(19,14),(17,14),(17,18),(14,19),(9,19),(6,17),(3,15),(1,11)],'outline')
 p([(6,7),(14,5),(17,7),(17,11),(19,12),(17,13),(16,17),(13,18),(9,17),(7,14),(4,13),(4,10)],'skin')
 p([(10,7),(15,7),(16,10),(15,14),(13,16),(9,15),(8,11)],'skin_light')
 p([(3,10),(6,9),(7,11),(6,14),(4,13)],'skin_shade')
 p([(2,6),(5,3),(9,1),(14,2),(17,4),(17,7),(14,6),(12,8),(10,6),(8,9),(6,8),(5,12),(3,10),(2,13),(1,9)],'hair')
 p([(5,4),(9,2),(12,3),(10,4),(7,5),(6,7),(3,7)],'hair_light')
 p([(12,3),(14,3),(16,5),(13,5)],'hair_light')
 l([(3,9),(4,8),(5,8)],'hair_dark'); l([(8,5),(10,4)],'hair_glint')
 l([(10,10),(12,10)],'hair_dark'); l([(15,9),(16,10)],'hair_dark')
 if expression in ('blink','closed','hurt'):
  l([(10,12),(12,12)],'outline'); l([(15,12),(16,11)],'outline')
 else:
  p([(11,11),(12,11),(12,13),(11,13)],'outline'); p([(15,11),(16,11),(16,13),(15,13)],'outline')
  dot(d,x+12,y+11,'cream'); dot(d,x+16,y+11,'cream')
 dot(d,x+16,y+14,'skin_shade'); l([(13,16),(14,16)],'skin_shade')
 if expression in ('smile','cheer'): l([(12,16),(13,17),(15,16)],'outline')
 if expression=='hurt': l([(12,17),(14,17)],'outline')
 dot(d,x+10,y+15,'blush')
