"""Reproduce explicitly synthetic inputs from retained, licensed originals."""
from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image, ImageFilter

project = Path(__file__).resolve().parents[1]
workspace = project.parents[1]
sources = project / 'sources'
for src, dst in [('studio/starter/2d/master.png', 'robot-original.png'),
                 ('studio/starter/2d/motion.json', 'robot-rig-original.json'),
                 ('studio/starter/2d/LICENSE.txt', 'ROBOT-LICENSE.txt'),
                 ('studio/starter/2d/NOTICE.md', 'ROBOT-NOTICE.md'),
                 ('examples/scout-actions/fx/hit-spark.png', 'hit-spark-original.png'),
                 ('examples/scout-actions/fx/hit-spark.json', 'hit-spark-original.json'),
                 ('examples/scout-actions/fx/LICENSE.txt', 'FX-LICENSE.txt'),
                 ('examples/scout-actions/fx/NOTICE.md', 'FX-NOTICE.md')]:
    shutil.copyfile(workspace / src, sources / dst)
master = Image.open(sources / 'robot-original.png').convert('RGBA')
soft = master.resize((320, 320), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(1.25))
canvas = Image.new('RGBA', (384, 384))
canvas.alpha_composite(soft, (32, 32))
canvas.save(sources / 'robot-soft-synthetic.png')
meta = json.loads((sources / 'hit-spark-original.json').read_text())
sheet = Image.open(sources / 'hit-spark-original.png').convert('RGBA')
original = [sheet.crop((f['frame']['x'], f['frame']['y'], f['frame']['x'] + 136, f['frame']['y'] + 80)) for f in meta['frames']]
# GIF order is deliberately impact, charge, travel; effect-clip must reorder it.
frames = list(original[:12])
mapping = [{'gif_frame': i, 'phase': 'impact', 'source_frame': i} for i in range(12)]
for phase, positions in [('charge', [(0, 31), (0, 30), (0, 28)]), ('travel', [(4, 31), (16, 30), (26, 28)])]:
    for i, position in enumerate(positions):
        frame = Image.new('RGBA', (136, 80))
        spark = original[i + 1].crop(original[i + 1].getbbox()).resize((26 + i * 6, 26 + i * 3), Image.Resampling.NEAREST)
        frame.alpha_composite(spark, position)
        frames.append(frame)
        mapping.append({'gif_frame': len(frames)-1, 'phase': phase, 'source_frame': i+1, 'size_px': [26+i*6,26+i*3], 'position_px': list(position)})
palette_frames = []
for frame in frames:
    rgb = frame.convert('RGB').quantize(colors=254)
    alpha = frame.getchannel('A')
    rgb.paste(255, mask=alpha.point(lambda value: 255 if value < 128 else 0))
    rgb.info['transparency'] = 255
    palette_frames.append(rgb)
palette_frames[0].save(sources / 'spark-phases-synthetic.gif', save_all=True, append_images=palette_frames[1:], duration=[40]*12+[80]*6, transparency=255, disposal=2, optimize=False, loop=0)
with Image.open(sources / 'spark-phases-synthetic.gif') as gif:
    assert gif.n_frames == 18, gif.n_frames
assert canvas.size == (384,384) and canvas.mode == 'RGBA'
report = {'synthetic': True, 'robot': {'original': 'robot-original.png', 'operations': '8x bicubic enlargement, 1.25px Gaussian blur, 32px transparent padding', 'crop_xywh': [32,32,320,320], 'target_grid': [40,40]}, 'fx': {'original': 'hit-spark-original.png', 'gif': 'spark-phases-synthetic.gif', 'note': 'Synthetic phase adaptation; original pixelfx hit-spark contains impact only.', 'frames': mapping}, 'sha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(sources.iterdir()) if p.is_file()}}
(project / 'evidence/input-preparation.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps({'frames':18,'robot_size':canvas.size,'files':len(report['sha256'])}))
