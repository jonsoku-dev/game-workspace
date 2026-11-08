"""Rebuild 2x cast atlases directly from illustrated masters, never from V1 pixels.

Run from any directory with Python, Pillow and NumPy. Writes V2 assets and this
folder's technical evidence only; does not mutate the runtime atlas contract.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / 'generated'
GAME = ROOT.parents[1] / 'game'


def extract(name, columns, rows):
    image = Image.open(SOURCE / name).convert('RGBA')
    mask = image.getchannel('A').point(lambda a: 255 if a > 64 else 0)
    cels = []
    while True:
        points = np.argwhere(np.asarray(mask) == 255)
        if not len(points):
            break
        y, x = points[0]
        ImageDraw.floodfill(mask, (int(x), int(y)), 128)
        selected = np.asarray(mask) == 128
        ys, xs = np.where(selected)
        if len(xs) > 500:
            box = (int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1))
            cel = image.crop(box)
            alpha = np.asarray(cel.getchannel('A')).copy()
            alpha[~selected[box[1]:box[3], box[0]:box[2]]] = 0
            cel.putalpha(Image.fromarray(alpha))
            row = min(rows-1, int((box[1]+box[3])/2/image.height*rows))
            col = min(columns-1, int((box[0]+box[2])/2/image.width*columns))
            cels.append((row*columns+col, cel, box))
        mask.paste(0, mask=Image.fromarray((selected*255).astype('uint8')))
    cels.sort(key=lambda item: item[0])
    assert [c[0] for c in cels] == list(range(columns*rows)), name
    return cels


casts = {
    'player': (extract('player-a.png',4,3)+extract('player-b.png',4,3),192,(96,176),.39),
    'foe': (extract('foe.png',3,2),144,(72,134),.188),
    'boss': (extract('boss.png',4,2),288,(144,260),.58),
}
report = {}
all_hashes = set()
all_silhouettes = set()
for cast, (source,size,pivot,scale) in casts.items():
    strip = Image.new('RGBA',(size*len(source),size))
    bounds, hashes, silhouettes = [], [], []
    for index,(_,cel,box) in enumerate(source):
        cel = cel.resize((round(cel.width*scale),round(cel.height*scale)),Image.Resampling.LANCZOS)
        lift = 14 if cast=='player' and index in (17,22,23) else 0
        x,y = (size-cel.width)//2,pivot[1]-cel.height-lift
        frame = Image.new('RGBA',(size,size))
        assert x>=3 and y>=2, (cast,index,'insufficient padding',x,y)
        frame.alpha_composite(cel,(x,y))
        packed = frame.getbbox()
        assert packed[0]>0 and packed[1]>0 and packed[2]<size and packed[3]<size
        assert packed[3]==pivot[1]-lift, (cast,index,'ground alignment')
        assert abs((packed[0]+packed[2])/2-pivot[0])<=.5
        digest = hashlib.sha256(frame.tobytes()).hexdigest()
        silhouette = hashlib.sha256(frame.getchannel('A').point(lambda a:255 if a>64 else 0).tobytes()).hexdigest()
        assert digest not in all_hashes and silhouette not in all_silhouettes, (cast,index,'duplicate')
        all_hashes.add(digest)
        all_silhouettes.add(silhouette)
        hashes.append(digest)
        silhouettes.append(silhouette)
        bounds.append({'frame':index,'sourceBounds':box,'packedBounds':packed,'airborneLift':lift})
        strip.alpha_composite(frame,(index*size,0))
    strip.save(GAME/'art'/f'{cast}.v2.png')
    report[cast] = {'file':f'{cast}.v2.png','frameWidth':size,'frameHeight':size,'frames':len(source),
                    'pivot':pivot,'sourceScale':scale,'uniqueCels':len(set(hashes)),
                    'uniqueSilhouettes':len(set(silhouettes)),'clipping':'pass',
                    'groundAndCenterAlignment':'pass','bounds':bounds,'sha256':hashes}

furnace = Image.open(ROOT/'furnace-source.png').convert('RGB')
furnace.resize((1920,1080),Image.Resampling.LANCZOS).save(GAME/'scenery/furnace-v2.webp',quality=94,method=6)
report['furnace'] = {'file':'scenery/furnace-v2.webp','size':[1920,1080],
                      'originalSize':furnace.size,'alpha':'opaque environment',
                      'source':'polish/furnace-source.png'}
(ROOT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')

for pose,indices in {'idle':(0,0,0),'windup':(6,3,4),'contact':(7,4,5)}.items():
    stage = Image.open(GAME/'scenery/furnace-v2.webp').convert('RGBA').resize((960,540))
    for (cast,(_,size,pivot,_)),index,x,display_scale in zip(casts.items(),indices,(150,365,700),(1.55,1.8,1.45)):
        sheet = Image.open(GAME/'art'/f'{cast}.v2.png')
        cel = sheet.crop((index*size,0,(index+1)*size,size))
        factor = display_scale/2
        cel = cel.resize((round(size*factor),round(size*factor)),Image.Resampling.NEAREST)
        stage.alpha_composite(cel,(round(x-pivot[0]*factor),round(410-pivot[1]*factor)))
    ImageDraw.Draw(stage).text((24,24),f'V2 SOURCE ART / {pose} / original physical footprint',fill='#ffe5ad')
    stage.convert('RGB').save(ROOT/f'scale-{pose}.png')

comparison = Image.new('RGB',(1280,660),'#18202d')
draw = ImageDraw.Draw(comparison)
for column,(cast,index) in enumerate((('player',0),('player',7),('foe',4),('boss',4))):
    for row,version in enumerate(('v1','v2')):
        base = {'player':96,'foe':72,'boss':144}[cast]
        factor = 2 if version=='v2' else 1
        sheet = Image.open(GAME/'art'/f'{cast}.v2.png' if factor==2 else GAME/'art'/f'{cast}.png')
        cel = sheet.crop((index*base*factor,0,(index+1)*base*factor,base*factor))
        cel = cel.resize((base*2,base*2),Image.Resampling.NEAREST)
        comparison.paste(cel,(column*320+(320-base*2)//2,row*330+24),cel)
        draw.text((column*320+8,row*330+8),f'{version} {cast} {index}',fill='#ffe5ad')
comparison.save(ROOT/'source-detail-comparison.png')
print(json.dumps({k:{a:b for a,b in v.items() if a not in ('bounds','sha256')} for k,v in report.items()},indent=2))
