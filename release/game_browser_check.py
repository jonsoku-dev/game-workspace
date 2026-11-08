"""Play the two local HTML game exports through their real on-page controls."""
import argparse
import json
from pathlib import Path
import time
from urllib.parse import urlsplit

from browser_check import Stagehand


def wait(read, predicate, timeout=15):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        state = read()
        if predicate(state):
            return state
        time.sleep(.12)
    raise RuntimeError(f"Timed out waiting for game state: {state}")


def click(browser, selector):
    browser.run(f"await page.locator({json.dumps(selector)}).click();return true")


def resources(browser):
    check = browser.run("""return await page.evaluate(()=>({external:performance.getEntriesByType('resource').filter(r=>new URL(r.name).origin!==location.origin).map(r=>r.name),
       errors:performance.getEntriesByType('resource').filter(r=>r.responseStatus>=400).map(r=>r.name),width:innerWidth,scroll:document.documentElement.scrollWidth}))""")
    if check["external"] or check["errors"] or check["width"] != check["scroll"]:
        raise RuntimeError(check)
    return check


def three(browser, out):
    def read():
        return browser.run("return await page.evaluate(()=>window.woodsAlight?.()||null)")
    wait(read, lambda data: data and data["ready"])
    click(browser, "#attack")
    initial = read()
    if initial["charge"] or initial["meshParticleCount"] != 24 or not initial["depthWriting"]:
        raise ValueError("invalid start/miss/native particle proof")
    for i, (x, z) in enumerate([(-3, 2), (3, 1), (-2, -3), (1, -2)]):
        for _ in range(65):
            state = read()
            if (i < 3 and state["collected"][i]) or (i == 3 and (state["x"] - x)**2 + (state["z"] - z)**2 < 1):
                break
            dx, dz = x - state["x"], z - state["z"]
            direction = ("right" if dx > 0 else "left") if abs(dx) > abs(dz) else ("down" if dz > 0 else "up")
            click(browser, f'[data-move="{direction}"]')
        else:
            raise ValueError("crystal/lantern unreachable by direction controls")
    for _ in range(3):
        click(browser, "#attack")
        time.sleep(.48)
    finish = wait(read, lambda s:s["won"])
    browser.screenshot(out / "three-win.jpg")
    click(browser, "#reset")
    reset = wait(read, lambda s:not s["won"] and not any(s["collected"]))
    return {"collected": finish["collected"], "charge": finish["charge"], "native_particles": finish["meshParticleCount"],
            "depth_write": finish["depthWriting"], "won": finish["won"], "reset": not reset["won"], **resources(browser)}


def phaser(browser, out):
    def read():
        return browser.run("""return await page.evaluate(()=>{const g=window.scoutGame,s=g?.scene.scenes[0];return s?.actor?{x:s.actor.x,action:s.actor.action,hits:s.hits,won:s.finished,events:s.contactEvents,version:Phaser.VERSION}:null})""")
    start = wait(read, lambda d:d and d["action"]=="idle")
    click(browser, "#attack")
    miss = wait(read, lambda d:d["events"] and d["action"]!="attack")
    if miss["hits"]:
        raise ValueError("distant attack hit")
    for _ in range(32):
        if read()["x"] > 565:
            break
        click(browser, "#right")
    else:
        raise ValueError("Phaser direction control cannot reach contact range")
    for i in range(3):
        wait(read, lambda d:d["action"]!="attack")
        click(browser, "#attack")
        wait(read, lambda d:d["hits"]==i+1)
    finish = wait(read, lambda d:d["won"])
    browser.screenshot(out / "phaser-win.jpg")
    click(browser, "#restart")
    reset = wait(read, lambda d:d["hits"]==0 and not d["won"])
    return {"version":start["version"],"hits":finish["hits"],"won":finish["won"],"events":finish["events"],
            "reset":reset["x"]==start["x"],**resources(browser)}


if __name__ == "__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--three-url", required=True)
    parser.add_argument("--phaser-url", required=True)
    parser.add_argument("--out", type=Path, required=True)
    args=parser.parse_args()
    if any(urlsplit(url).hostname not in ("localhost","127.0.0.1") for url in (args.three_url,args.phaser_url)):
        parser.error("Only local game URLs are supported")
    args.out.mkdir(parents=True, exist_ok=False)
    browser=Stagehand()
    try:
        browser.rpc("initialize", {"protocolVersion":"2024-11-05","capabilities":{},
                               "clientInfo":{"name":"studio-game-acceptance","version":"1"}})
        browser.send({"method":"notifications/initialized"})
        result={}
        for name,url,play in [("three",args.three_url,three),("phaser",args.phaser_url,phaser)]:
            browser.run(f"await page.setViewportSize({{width:960,height:720}});await page.goto({json.dumps(url)});return await page.title()")
            result[name]=play(browser,args.out)
            print(name,result[name],flush=True)
        (args.out/"web-games.json").write_text(json.dumps(result,indent=2)+"\n")
    finally:
        browser.close()
