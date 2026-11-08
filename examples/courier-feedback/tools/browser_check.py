#!/usr/bin/env python3
"""Exercise the delivered game with an isolated configured Stagehand MCP."""
import argparse
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--studio', required=True, type=Path)
parser.add_argument('--url', default='http://127.0.0.1:52993')
parser.add_argument('--export', required=True, type=Path)
parser.add_argument('--out', required=True, type=Path)
args = parser.parse_args()
if args.url != 'http://127.0.0.1:52993':
    raise SystemExit('This check is scoped to the dedicated loopback port 52993')
args.out.mkdir(parents=True, exist_ok=False)
sys.path.insert(0, str(args.studio / 'tools'))
from playcheck_browser import MCP
client = MCP()
results = {}

def run(code):
    return client.run(code)

def state():
    return run("""return await page.evaluate(()=>{const s=window.scoutGame?.scene.scenes[0];return s?.actor?{...s.state,action:s.actor.action,elapsed:s.actor.elapsed,fx:s.fxEnabled,cues:s.cues.length,cueEvents:s.cueEvents,lastFeedback:s.lastFeedback,trail:s.trail,targetTrail:s.targetTrail,targetKickSign:s.targetKickSign,contactEvents:s.contactEvents,status:document.querySelector('#status').textContent}:null})""")

def wait(predicate, timeout=8):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        value = state()
        if value and predicate(value):
            return value
        time.sleep(.06)
    raise AssertionError(f'Timed out waiting for game state: {value}')

def click(button):
    return run(f"await page.locator('#{button}').click();return true")

def move_to(x, right=True):
    key = 'ArrowRight' if right else 'ArrowLeft'
    for _ in range(60):
        value = state()
        if value['x'] >= x if right else value['x'] <= x:
            return value
        run(f"await page.keyboard.press('{key}',{{delay:100}});return true")
    raise AssertionError(f'Could not reach {x}: {state()}')


def screenshot(name):
    result = client.call('tools/call', {'name': 'screenshot', 'arguments': {'type': 'jpeg', 'quality': 85}})
    block = next(c for c in result['content'] if c['type'] == 'image')
    (args.out / name).write_bytes(base64.b64decode(block['data']))

try:
    run(f"await page.setViewportSize({{width:1280,height:960}});await page.goto({json.dumps(args.url)});return true")
    wait(lambda s: s['hp'] == 3)
    click('sound')
    results['sound_opt_in'] = run("return await page.locator('#sound').getAttribute('aria-pressed')")
    assert results['sound_opt_in'] in (True, 'true')
    screenshot('start-on.jpg')
    click('interact')
    results['denied'] = wait(lambda s: '필요' in s['status'])
    click('attack')
    results['miss'] = wait(lambda s: len(s['contactEvents']) == 1)
    assert results['miss']['hits'] == 0 and not results['miss']['contactEvents'][0]['contact']
    wait(lambda s: s['action'] != 'attack')
    click('pause')
    paused = wait(lambda s: s['paused'])
    time.sleep(.15)
    assert state()['clock'] == paused['clock']
    click('pause')
    results['pause'] = paused
    move_to(310)
    stopped = state()
    time.sleep(.15)
    assert abs(state()['x'] - stopped['x']) < 5
    results['move_stop'] = stopped
    click('jump')
    run("await page.keyboard.press('ArrowRight',{delay:630});return true")
    results['jump'] = wait(lambda s: s['y'] < 356)
    screenshot('jump-on.jpg')
    move_to(470)
    wait(lambda s: s['y'] == 356)
    results['land'] = state()
    move_to(530)
    results['collect'] = wait(lambda s: s['package'])
    assert results['collect']['hp'] == 3
    move_to(590)
    run("await page.keyboard.press('ArrowLeft',{delay:50});return true")
    previous_contacts = len(state()['contactEvents'])
    click('attack')
    results['facing_away_miss'] = wait(lambda s: len(s['contactEvents']) > previous_contacts)
    assert results['facing_away_miss']['hits'] == 0 and not results['facing_away_miss']['contactEvents'][-1]['contact']
    wait(lambda s: s['action'] != 'attack')
    move_to(590)
    for index in range(3):
        wait(lambda s: s['action'] != 'attack')
        click('attack')
        hit = wait(lambda s: s['hits'] == index + 1)
        results[f'hit_{index+1}'] = hit
        contact = hit['contactEvents'][-1]
        assert contact['contact'] and 0 <= contact['observed_ms'] - contact['start_ms'] < 100
        if index == 0:
            assert hit['targetHP'] == 20 and hit['lastDamage'] == 10
            assert hit['targetTrail'] > hit['targetHP']
            assert hit['targetKickSign'] == 1
            screenshot('hit-on.jpg')
        if index == 1:
            assert hit['targetHP'] == 5 and hit['lastDamage'] == 15
    assert state()['targetHP'] == 0
    assert not state()['finished']
    assert sum(e['event'] == 'collect' for e in state()['cueEvents']) == 1
    assert any(e['event'] == 'crit' for e in state()['cueEvents'])
    assert any(e['event'] == 'finisher' for e in state()['cueEvents'])
    screenshot('finisher-on.jpg')
    move_to(840)
    click('interact')
    results['win'] = wait(lambda s: s['finished'])
    screenshot('win-on.jpg')
    click('restart')
    results['restart'] = wait(lambda s: s['x'] == 150 and not s['package'] and s['hits'] == 0)
    click('feel')
    results['off'] = wait(lambda s: not s['fx'])
    screenshot('start-off.jpg')
    click('interact')
    click('attack')
    results['off_miss'] = wait(lambda s: len(s['contactEvents']) == 1)
    assert results['off_miss']['hits'] == 0 and results['off_miss']['cues'] == 0
    wait(lambda s: s['action'] != 'attack')
    move_to(310)
    click('jump')
    run("await page.keyboard.press('ArrowRight',{delay:630});return true")
    move_to(470)
    wait(lambda s: s['y'] == 356)
    move_to(590)
    for index in range(3):
        wait(lambda s: s['action'] != 'attack')
        click('attack')
        wait(lambda s: s['hits'] == index + 1)
    results['off_finisher'] = state()
    assert results['off_finisher']['package'] and results['off_finisher']['hp'] == 3 and not results['off_finisher']['finished']
    assert [state()['hits'], state()['hp'], state()['package'], state()['targetHP']] == [3, 3, True, 0]
    move_to(840)
    click('interact')
    results['off_win'] = wait(lambda s: s['finished'])
    click('restart')
    wait(lambda s: s['hits'] == 0)
    click('feel')
    while state()['hp'] == 3:
        run("await page.keyboard.press('ArrowRight',{delay:100});return true")
    results['hurt'] = state()
    screenshot('hurt-on.jpg')
    for remaining in (1, 0):
        wait(lambda s: s['cooldown'] == 0)
        for _ in range(40):
            if state()['hp'] <= remaining:
                break
            key = 'ArrowRight' if state()['x'] < 390 else 'ArrowLeft'
            run(f"await page.keyboard.press('{key}',{{delay:100}});return true")
        assert state()['hp'] <= remaining
    results['lose'] = wait(lambda s: s['lost'])
    screenshot('lose-on.jpg')
    click('restart')
    wait(lambda s: s['hp'] == 3 and not s['lost'])
    run("await page.setViewportSize({width:390,height:844});return true")
    results['mobile'] = run("return await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,buttons:[...document.querySelectorAll('button')].map(b=>({id:b.id,w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height}))}))")
    assert results['mobile']['scroll'] <= results['mobile']['client']
    screenshot('mobile.jpg')
    results['resources'] = run("return await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.responseStatus>=400).map(r=>r.name))")
    assert not results['resources']
    results['status'] = 'pass'
except Exception as exc:
    results['status'] = 'fail'
    results['error'] = str(exc)
    raise
finally:
    results['export_files'] = {p.relative_to(args.export).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in args.export.rglob('*') if p.is_file()}
    (args.out / 'browser.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
    client.close()
