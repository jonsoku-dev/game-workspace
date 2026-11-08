#!/usr/bin/env python3
"""Copy exact local cels into a portable Studio action-set request."""
import hashlib
import json
from pathlib import Path
import shutil
import sys

project = Path(__file__).resolve().parents[1]
source = project.parent / 'storybook-cels'
production = project / 'requests'
if production.exists():
    raise SystemExit('requests already exists; preserve the existing preparation')
production.mkdir()
manifest = json.loads((source / 'drawings.json').read_text())
actions = ('idle', 'walk', 'run', 'attack', 'jump', 'hurt')
request = {'schema_version': 1, 'cell_size': manifest['size'],
           'pivot_px_from_top_left': [48, 100],
           'actions': {name: manifest['actions'][name] for name in actions}, 'events': []}
checks = []
for action in request['actions'].values():
    for frame in action['frames']:
        original = source / frame['path']
        destination = production / frame['path']
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(original, destination)
        digest = hashlib.sha256(original.read_bytes()).hexdigest()
        assert hashlib.sha256(destination.read_bytes()).hexdigest() == digest
        checks.append({'path': destination.relative_to(project).as_posix(), 'sha256': digest})
credit = project / 'source'
credit.mkdir()
for relative in ('README.md', 'drawings.json', 'art/DIRECTION.md', 'art/master.png', 'art/palette.json'):
    target = credit / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source / relative, target)
(production / 'hero.json').write_text(json.dumps(request, indent=2) + '\n')
for index, preset in enumerate(('step', 'land', 'pickup', 'impact', 'slash', 'confirm', 'deny')):
    palette = ['#977654', '#e6bf85', '#fff0b9'] if preset in ('step', 'land') else ['#9074bd', '#e7bc68', '#fff6d5']
    (production / f'{preset}.json').write_text(json.dumps({
        'schema_version': 1, 'preset': preset, 'size': 48,
        'palette': palette, 'seed': 81 + index}, indent=2) + '\n')
assert len(checks) == 48
assert sum(frame['duration_ms'] for frame in request['actions']['attack']['frames'][:4]) == 360
(project / 'evidence' / 'source-copy.json').write_text(json.dumps({
    'source': '../storybook-cels', 'selected_actions': list(actions),
    'copied_frame_count': len(checks), 'exact_source_bytes': checks,
    'contact_frame': 4, 'contact_ms': 360, 'at_px': [90, 62],
    'art_acceptance': 'pending user judgement'}, indent=2) + '\n')
print(json.dumps({'status': 'ready', 'frames': len(checks), 'contact_ms': 360}))
