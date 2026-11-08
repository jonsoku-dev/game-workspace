"""Collect independently painted timelines without altering their artwork."""
import json
from pathlib import Path

project = Path(__file__).resolve().parents[1]
order = ['wave', 'walk', 'cheer', 'idle', 'run', 'attack', 'jump', 'hurt']
actions = {}
for name in order:
    subdir = project / 'frames' / name
    timing = json.loads((subdir / 'timing.json').read_text())
    actions[name] = {'loop': timing['loop'], 'frames': [
        {'path': str((subdir / frame['path']).relative_to(project)),
         'duration_ms': frame['duration_ms']} for frame in timing['frames']]}
(project / 'drawings.json').write_text(json.dumps({'schema_version': 1, 'size': [96, 112],
    'actions': actions}, ensure_ascii=False, indent=2) + '\n')
(project / 'character.json').write_text(json.dumps({'schema_version': 1, 'frames': 'drawings.json',
    'reference': 'art/master.png', 'title': '라일락 우편배달부', 'language': 'ko', 'actions': order},
    ensure_ascii=False, indent=2) + '\n')
