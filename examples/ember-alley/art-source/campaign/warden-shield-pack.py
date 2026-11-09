"""Technical crop/pack of original shield artwork; no painted pixels synthesized.

Run with Python + Pillow. Runtime asset is 2x the intended 38x80 display footprint.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib
import json

ROOT=Path(__file__).resolve().parent
GAME=ROOT.parents[1]/'game'
source=Image.open(ROOT/'warden-shield-master.png').convert('RGBA')
alpha=source.getchannel('A')
assert alpha.getextrema()==(0,255), 'Source must contain real transparency'
# Ignore detached, near-invisible generation haze while retaining painted edge alpha.
alpha=alpha.point(lambda a:0 if a<16 else a)
source.putalpha(alpha)
bounds=source.getbbox()
assert bounds[0]>0 and bounds[1]>0 and bounds[2]<source.width and bounds[3]<source.height
shield=source.crop(bounds)
shield.thumbnail((72,156),Image.Resampling.LANCZOS)
packed=Image.new('RGBA',(76,160))
packed.alpha_composite(shield,((76-shield.width)//2,(160-shield.height)//2))
output=GAME/'art/warden-shield.webp'
packed.save(output,lossless=True,method=6,exact=True)
decoded=Image.open(output).convert('RGBA')
assert decoded.tobytes()==packed.tobytes(), 'Lossless runtime round trip'
bbox=decoded.getbbox()
assert bbox[0]>=2 and bbox[1]>=2 and bbox[2]<=74 and bbox[3]<=158
assert decoded.getchannel('A').getextrema()==(0,255)
small=decoded.resize((38,80),Image.Resampling.LANCZOS)
small.save(ROOT/'warden-shield-game-size.png')
proof=Image.new('RGB',(520,580),'#192431')
draw=ImageDraw.Draw(proof)
draw.text((16,14),'RIGHT-FACING WARDEN SHIELD / native 38x80',fill='#f4d9a6')
proof.paste(small,(40,52),small)
zoom=small.resize((228,480),Image.Resampling.NEAREST)
proof.paste(zoom,(216,52),zoom)
draw.text((216,540),'6x inspection zoom',fill='#f4d9a6')
proof.save(ROOT/'warden-shield-proof.png')
report={'runtimeFile':'game/art/warden-shield.webp','runtimeSize':decoded.size,
        'runtimeAlphaBounds':bbox,'gameDisplaySize':[38,80],
        'displayAlphaBounds':small.getbbox(),'sourceSize':source.size,'sourceAlphaBounds':bounds,
        'facing':'right; convex outer face and orange grate on right, dark rear rim at left',
        'realAlpha':'pass','transparentMargin':'pass','losslessRoundTrip':'pass',
        'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),
        'scope':'technical crop/pack only; runtime behavior belongs to primary'}
(ROOT/'warden-shield-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
