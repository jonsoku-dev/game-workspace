"""Pack approved imagegen painted masters into the fixed runtime atlas contract."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / 'game/art'
checks = {}
preview = Image.new('RGBA', (800, 280), '#243e40')
labels = ImageDraw.Draw(preview)
for name, size, count, columns, baseline, max_height, max_width in [
    ('player', 96, 8, 4, 85, 78, 84),
    ('creature', 72, 4, 2, 65, 58, 64),
]:
    source = Image.open(ROOT / f'{name}-master.png').convert('RGBA')
    rows = count // columns
    sheet = Image.new('RGBA', (size * count, size))
    bounds, hashes = [], []
    for i in range(count):
        col, row = i % columns, i // columns
        cell = source.crop((round(col * source.width / columns), round(row * source.height / rows),
                            round((col + 1) * source.width / columns), round((row + 1) * source.height / rows)))
        # Discard only the generator's near-transparent background haze.
        alpha = cell.getchannel('A').point(lambda a: 0 if a < 128 else a)
        cell.putalpha(alpha)
        box = alpha.getbbox()
        assert box, (name, i, 'empty source cel')
        cell = cell.crop(box)
        bottom = baseline - (7 if name == 'player' and i == 3 else 3 if name == 'player' and i == 7 else 0)
        scale = min(min(max_height, bottom - 4) / cell.height, max_width / cell.width)
        cell = cell.resize((round(cell.width * scale), round(cell.height * scale)), Image.Resampling.LANCZOS)
        cell.putalpha(cell.getchannel('A').point(lambda a: 0 if a < 12 else a))
        frame = Image.new('RGBA', (size, size))
        bottom = baseline - (7 if name == 'player' and i == 3 else 3 if name == 'player' and i == 7 else 0)
        frame.alpha_composite(cell, ((size - cell.width) // 2, bottom - cell.height))
        bounds.append(frame.getbbox())
        assert 0 < bounds[-1][0] < bounds[-1][2] < size, (name, i, bounds[-1])
        assert 0 < bounds[-1][1] < bounds[-1][3] < size, (name, i, bounds[-1])
        hashes.append(hashlib.sha256(frame.tobytes()).hexdigest())
        sheet.alpha_composite(frame, (size * i, 0))
        x, y = i * 100, 12 if name == 'player' else 160
        preview.alpha_composite(frame, (x, y))
        labels.text((x + 4, y + size + 5), f'{name} {i}', fill='#fff1cf')
    assert len(set(hashes)) == count, (name, 'duplicate cels')
    sheet.save(OUT / f'{name}.png')
    checks[name] = {'size': list(sheet.size), 'frames': count, 'uniqueCels': len(set(hashes)),
                    'bounds': bounds, 'clipping': 'pass', 'transparentBackground': 'pass'}
preview.convert('RGB').save(ROOT / 'contact-sheet.png')
preview.resize((1600, 560), Image.Resampling.NEAREST).convert('RGB').save(ROOT / 'contact-sheet-2x.png')
for name, size, sequence in [('player', 96, [0, 1, 2, 1, 2, 3, 4, 5, 6, 7]), ('creature', 72, [0, 1, 2, 3])]:
    sheet = Image.open(OUT / f'{name}.png')
    frames = []
    for i in sequence:
        bg = Image.new('RGBA', (size, size), '#243e40')
        bg.alpha_composite(sheet.crop((i * size, 0, (i + 1) * size, size)))
        frames.append(bg.resize((size * 3, size * 3), Image.Resampling.NEAREST).convert('RGB'))
    frames[0].save(ROOT / f'{name}-motion.gif', save_all=True, append_images=frames[1:], duration=220, loop=0)
(ROOT / 'validation.json').write_text(json.dumps(checks, indent=2) + '\n')
print(json.dumps(checks, indent=2))
