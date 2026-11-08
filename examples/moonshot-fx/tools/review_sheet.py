"""Render observed pipeline outputs on a dark checkerboard; no aesthetic scoring."""
from pathlib import Path
import argparse
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument('--snap', required=True)
parser.add_argument('--effect', required=True)
parser.add_argument('--motion', required=True)
parser.add_argument('--out', required=True)
a = parser.parse_args()
p = Path(__file__).resolve().parents[1]
canvas = Image.new('RGB', (1040, 690), '#111827')
d = ImageDraw.Draw(canvas)
d.text((24,16), 'MOONSHOT FX  |  Local licensed inputs, explicitly synthetic adaptation', fill='white')
d.text((24,36), 'Technical reconstruction and phase import evidence. Human aesthetic acceptance remains unverified.', fill='#cbd5e1')

def place(im, xy, size):
    bg = Image.new('RGBA', size, '#202b3d')
    draw = ImageDraw.Draw(bg)
    for y in range(0,size[1],16):
        for x in range(0,size[0],16):
            if (x//16+y//16)%2:draw.rectangle((x,y,x+15,y+15),fill='#263349')
    im.thumbnail(size, Image.Resampling.NEAREST)
    bg.alpha_composite(im, ((size[0]-im.width)//2,(size[1]-im.height)//2))
    canvas.paste(bg.convert('RGB'),xy)

for x,path,title in [(24,'sources/robot-soft-synthetic.png','384px synthetic soft source'),(280,a.snap+'/asset.png','40px snap (16-color cap)'),(536,a.motion+'/neutral.png','Rig neutral reconstruction'),(792,a.motion+'/attack-02.png','Attack contact pose')]:
    im=Image.open(p/path).convert('RGBA')
    if im.width <= 40: im=im.resize((160,160),Image.Resampling.NEAREST)
    place(im,(x,82),(224,176));d.text((x,62),title,fill='#f8fafc')
sheet = Image.open(p/a.effect/'sheet.png').convert('RGBA')
for row,(label,indices) in enumerate([('CHARGE / imported GIF 12,13,14',[0,1,2]),('TRAVEL / imported GIF 15,16,17',[3,4,5]),('IMPACT / imported GIF 0,3,6',[6,9,12])]):
    y=290+row*120; d.text((24,y),label,fill='#93c5fd')
    for col,index in enumerate(indices):
        im=sheet.crop((index*136,0,(index+1)*136,80)).resize((272,160),Image.Resampling.NEAREST)
        place(im,(270+col*248,y-8),(232,102))
d.text((24,660),'Camp Robot: CC0. Hit-spark: Patch / Hugo Duprez, MIT. Exact notices retained in sources/.',fill='#cbd5e1')
canvas.save(p/a.out)
print(str(p/a.out))
