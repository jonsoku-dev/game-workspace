from pathlib import Path
from PIL import Image
import hashlib,json
base=Path(__file__).resolve().parent
root=base.parents[1]
name='twin-observatory'
size=(1080, 1260)
source=base/(name+'-master.png')
target=root/'game/art'/(name+'.webp')
im=Image.open(source).convert('RGB').resize(size,Image.Resampling.LANCZOS)
im.save(target,'WEBP',quality=86,method=6)
review_size=(390,round(390*size[1]/size[0]))
Image.open(target).resize(review_size,Image.Resampling.LANCZOS).save(base/(name+'-390.png'))
check=Image.open(target)
assert check.format=='WEBP' and check.size==size and check.mode=='RGB'
meta={'file':str(target.relative_to(root)),'size':check.size,'mode':check.mode,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'review_size':review_size,'checks':['WEBP decode','exact aspect and dimensions','RGB color','small-size review image']}
(base/(name+'-validation.json')).write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps(meta))
