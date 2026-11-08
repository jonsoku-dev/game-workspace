"""Focused delivery checks; silhouette pixels do not certify natural motion."""
from pathlib import Path
import hashlib,json,sys
from PIL import Image,ImageColor
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'art'))
from ink import P
root=Path(__file__).resolve().parent.parent
palette={ImageColor.getrgb(c) for c in P.values()}
report={}
for action in ('walk','run'):
 folder=root/action; manifest=json.loads((folder/'timing.json').read_text())
 assert manifest['loop'] is True
 frames=manifest['frames']; assert len(frames)==12
 hashes=[];bounds=[]
 for f in frames:
  im=Image.open(folder/f['path']).convert('RGBA');assert im.size==(96,112)
  pixels=[im.getpixel((x,y)) for y in range(112) for x in range(96)]
  assert {p[3] for p in pixels}=={0,255}
  assert all(p[:3] in palette for p in pixels if p[3])
  b=im.getbbox();assert b[0]>0 and b[1]>0 and b[2]<96 and b[3]<=100
  bounds.append(list(b));hashes.append(hashlib.sha256(im.tobytes()).hexdigest())
  assert isinstance(f['duration_ms'],int) and f['duration_ms']>0
 assert len(set(hashes))==12
 gif=Image.open(folder/'cycle.gif');assert gif.n_frames==12
 for i,f in enumerate(frames):
  gif.seek(i);assert gif.info['duration']==f['duration_ms']
 report[action]={'frames':len(frames),'distinct_frames':len(set(hashes)),
  'duration_ms':sum(f['duration_ms'] for f in frames),'bounds':bounds,
  'airborne_silhouette_frames':[i for i,b in enumerate(bounds) if b[3]<99],
  'checks':['96x112','binary alpha','shared palette','unclipped','12 unique PNGs','12 GIF cels'],
  'not_proven':['art acceptance','native Rive runtime','semantic foot contact']}
(root/'walk'/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
