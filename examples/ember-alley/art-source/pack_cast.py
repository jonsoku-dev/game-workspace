"""Pack canonical generated alpha artwork; python3 art-source/pack_cast.py (Pillow, numpy).

No painted pixels are synthesized. Connected alpha components avoid off-grid sword
cropping; each cast uses one shared scale, centered support and a fixed ground line.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / 'game/art'

def extract(name, columns, rows):
    image = Image.open(ROOT / 'generated' / name).convert('RGBA')
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
            # Preserve original alpha inside the isolated component, clear haze outside it.
            cel = image.crop(box)
            alpha = np.asarray(cel.getchannel('A')).copy()
            alpha[~selected[box[1]:box[3], box[0]:box[2]]] = 0
            cel.putalpha(Image.fromarray(alpha))
            row = min(rows-1, int((box[1]+box[3])/2/image.height*rows))
            col = min(columns-1, int((box[0]+box[2])/2/image.width*columns))
            cels.append((row*columns+col, cel, box))
        mask.paste(0, mask=Image.fromarray((selected*255).astype('uint8')))
    cels.sort(key=lambda item: item[0])
    assert [c[0] for c in cels] == list(range(columns*rows)), (name, [c[0] for c in cels])
    return cels

casts = {
    'player': (extract('player-a.png', 4, 3)+extract('player-b.png', 4, 3), 96, 88, .195),
    'foe': (extract('foe.png', 3, 2), 72, 67, .094),
    'boss': (extract('boss.png', 4, 2), 144, 130, .29),
}
proof = Image.new('RGB', (1280, 820), '#131c29')
draw = ImageDraw.Draw(proof)
validation = {}
for cast, (source, size, ground, scale) in casts.items():
    strip = Image.new('RGBA', (size*len(source), size))
    frames, bounds = [], []
    for index, (_, cel, box) in enumerate(source):
        cel = cel.resize((round(cel.width*scale), round(cel.height*scale)), Image.Resampling.LANCZOS)
        frame = Image.new('RGBA', (size, size))
        x, y = (size-cel.width)//2, ground-cel.height
        if cast == 'player' and index in (17, 22, 23):
            y -= 7  # Actual airborne cels retain visible clearance above the common ground.
        assert x >= 2 and y >= 1, (cast, index, cel.size, x, y)
        frame.alpha_composite(cel, (x,y))
        assert frame.getbbox()[2] < size and frame.getbbox()[3] < size
        strip.alpha_composite(frame, (index*size,0))
        frames.append(frame)
        bounds.append({'frame': index, 'sourceBounds': box, 'packedBounds': frame.getbbox()})
    strip.save(OUT / f'{cast}.png')
    hashes = [hashlib.sha256(f.tobytes()).hexdigest() for f in frames]
    assert len(set(hashes)) == len(frames), cast
    validation[cast] = {'size': strip.size, 'frames': len(frames), 'uniqueCels': len(set(hashes)),
                        'sharedSourceScale': scale, 'groundLine': ground,
                        'edgeClipping': 'pass', 'source': 'built-in image_gen original illustrated cels',
                        'bounds': bounds}
    row = {'player': 0, 'foe': 3, 'boss': 4}[cast]
    for index, frame in enumerate(frames):
        px, py = (index % 8)*160, row*160+(index//8)*160
        preview = frame.resize((size,size), Image.Resampling.NEAREST)
        proof.paste(preview, (px+(160-size)//2,py+18),preview)
        draw.text((px+5,py+3),f'{cast} {index}',fill='#eedbc1')
    sequence = [frames[i] for i in ({'player':[0,1,6,7,8,9,10,11,12,13,14,15,16,17],
                                  'foe':[0,1,2,3,4,5], 'boss':[0,1,4,5,6,7]}[cast])]
    sequence[0].save(ROOT/f'{cast}-motion.gif',save_all=True,append_images=sequence[1:],duration=150,loop=0,disposal=2)
proof.save(ROOT/'contact-sheet.png')
proof.resize((2560,1640),Image.Resampling.NEAREST).save(ROOT/'contact-sheet-2x.png')
(ROOT/'validation.json').write_text(json.dumps(validation,indent=2)+'\n')
atlas=json.loads((OUT/'atlas.json').read_text())
atlas['authoring']='original image_gen hand-painted cels; reproducible alpha-component pack in art-source/pack_cast.py'
(OUT/'atlas.json').write_text(json.dumps(atlas,indent=2)+'\n')
for label, poses in {'idle':[('player',0,150),('foe',0,365),('boss',0,700)],
                     'windup':[('player',6,150),('foe',3,365),('boss',4,700)],
                     'contact':[('player',7,150),('foe',4,365),('boss',5,700)]}.items():
    stage=Image.open(ROOT.parent/'game/scenery/foundry.webp').convert('RGBA').resize((960,540))
    for cast,index,x in poses:
        size={'player':96,'foe':72,'boss':144}[cast]
        factor={'player':1.55,'foe':1.8,'boss':1.45}[cast]
        pivot={'player':(48,88),'foe':(36,67),'boss':(72,130)}[cast]
        strip=Image.open(OUT/f'{cast}.png')
        cel=strip.crop((index*size,0,(index+1)*size,size))
        cel=cel.resize((round(size*factor),round(size*factor)),Image.Resampling.NEAREST)
        stage.alpha_composite(cel,(round(x-pivot[0]*factor),round(410-pivot[1]*factor)))
    ImageDraw.Draw(stage).text((28,24),f'ACTUAL GAME SCALE / {label}',fill='#ffe0ab')
    stage.convert('RGB').save(ROOT/f'runtime-scale-{label}.png')
print(json.dumps({k:{a:b for a,b in v.items() if a!='bounds'} for k,v in validation.items()},indent=2))
