"""Run with Python containing resvg-py and Pillow; outputs stay beside this file."""
from pathlib import Path
from io import BytesIO
import hashlib
import importlib.metadata
import json
import xml.etree.ElementTree as ET
import resvg_py
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
ALLOWED = {"svg": {"width", "height", "viewBox", "fill"}, "path": {"d", "fill-rule"}}
NAMESPACE = "{http://www.w3.org/2000/svg}"
SIZES = (16, 32, 128)
THEMES = {"light": ("#f3f0e7", "#102434"), "dark": ("#102434", "#f3f0e7")}
sheet = Image.new("RGB", (880, 650), "#ddd9cf")
draw = ImageDraw.Draw(sheet)
draw.text((24, 14), "MOONLIT FIRST STRIKE / ORIGINAL CANDIDATES / NO SELECTION", fill="#102434")
draw.text((24, 34), "Native pixels: 16 / 32 / 128. View this PNG at 100%, without fit-to-window.", fill="#102434")
checks = []
for row, source in enumerate(sorted(ROOT.glob("*.svg"))):
    raw = source.read_bytes()
    assert b"<!" not in raw and b"&" not in raw, "No declarations/entities"
    root = ET.fromstring(raw)
    assert root.tag == NAMESPACE + "svg" and root.attrib["viewBox"] == "0 0 128 128"
    for node in root.iter():
        tag = node.tag.removeprefix(NAMESPACE)
        assert node.tag == NAMESPACE + tag and tag in ALLOWED
        assert set(node.attrib) <= ALLOWED[tag]
        assert all("url(" not in v.lower() for v in node.attrib.values())
    y = 70 + row * 190
    draw.text((24, y), source.stem, fill="#102434")
    for column, (theme, (background, foreground)) in enumerate(THEMES.items()):
        x = 24 + column * 432
        draw.rectangle((x, y + 22, x + 408, y + 176), fill=background)
        draw.text((x + 10, y + 30), theme.upper(), fill=foreground)
        for size, dx in zip(SIZES, (68, 142, 254)):
            svg = raw.decode().replace('#102434', foreground)
            png = resvg_py.svg_to_bytes(svg_string=svg, width=size, height=size, skip_system_fonts=True)
            image = Image.open(BytesIO(png)).convert("RGBA")
            assert image.size == (size, size)
            bounds = image.getbbox()
            assert bounds and min(bounds[:2]) > 0 and max(bounds[2:]) < size, "No cropped edge"
            output = ROOT / f"{source.stem}-{theme}-{size}.png"
            output.write_bytes(png)
            sheet.paste(image, (x + dx, y + 44 + (128 - size)//2), image)
            draw.text((x + dx, y + 158), str(size), fill=foreground)
    checks.append({"path": source.name, "sha256": hashlib.sha256(raw).hexdigest(), "xml_allowlist": True, "raster_sizes": list(SIZES), "themes": list(THEMES)})
assert len(checks) == 3
sheet.save(ROOT / "decision-sheet.png")
(ROOT / "validation.json").write_text(json.dumps({"renderer": "resvg-py", "renderer_version": importlib.metadata.version("resvg-py"), "checks": checks, "scope": "Static XML allowlist and real raster output; no trademark/acceptance claim"}, indent=2) + "\n")
print(f"PASS: {len(checks)} SVGs, 18 exact-size PNGs, decision-sheet.png")
