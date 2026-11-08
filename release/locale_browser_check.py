"""Check installed Studio locale flows through the configured Stagehand MCP.

Run against a loopback --browse-workspace server; output must be a new temporary
directory. This script reuses browser_check.Stagehand, without browser drivers.
"""
import argparse
import json
from pathlib import Path
import re
import time
from urllib.parse import urlencode, urlsplit
from urllib.request import urlopen

from browser_check import Stagehand


def require(condition, detail):
    if not condition:
        raise AssertionError(detail)


def wait(browser, expression, description, timeout=30):
    end = time.monotonic() + timeout
    value = None
    while time.monotonic() < end:
        try:
            value = browser.run(f"return await page.evaluate(()=>({expression}))")
        except RuntimeError as error:
            if not any(message in str(error) for message in ("Cannot find context with specified id", "Execution context was destroyed")):
                raise
            value = None
        if value:
            return value
        time.sleep(.15)
    raise TimeoutError(f"{description}: {value!r}")


def evaluate(browser, expression):
    return browser.run(f"return await page.evaluate(()=>({expression}))")


def click(browser, selector):
    browser.run(f"await page.locator({json.dumps(selector)}).click();return true")


def disclosure(browser, identifier, opened):
    current = evaluate(browser, f"document.getElementById({json.dumps(identifier)})?.open ?? null")
    if current is not None and current != opened:
        click(browser, f"#{identifier} > summary")


def fetch_state(base, project=None):
    query = "?" + urlencode({"project": project}) if project else ""
    with urlopen(base + "/api/state" + query, timeout=15) as response:
        return json.load(response)


def scene_ready(browser):
    wait(browser, "['playing','paused'].includes(document.querySelector('#scene')?.dataset.sceneState)",
         "real renderer readiness", 45)
    wait(browser, "!document.querySelector('#view-controls').hidden", "inspection controls")


def chrome(browser, locale):
    wait(browser, f"document.documentElement.lang==={json.dumps(locale)} && document.querySelector('#language-picker')?.value==={json.dumps(locale)}",
         f"{locale} document and picker")
    result = evaluate(browser, """({lang:document.documentElement.lang,
      scene:document.querySelector('#tab-scene').textContent,
      graph:document.querySelector('#tab-graph').textContent,
      search:document.querySelector('#graph-search').getAttribute('aria-label'),
      canvas:document.querySelector('#scene').getAttribute('aria-label'),
      picker:document.querySelector('#language-picker').getAttribute('aria-label'),
      caption:document.querySelector('#scene-caption').textContent,
      pause:document.querySelector('#pause-view').textContent})""")
    expected = {
        "ko": {"scene": "장면 · 에셋", "graph": "인과 그래프", "search": "그래프 항목 검색",
               "picker": "화면 언어", "caption": ("실제 런타임 장면", "제작 상태"), "pause": ("일시정지", "재생")},
        "ja": {"scene": "シーン · アセット", "graph": "因果グラフ", "search": "グラフ項目を検索",
               "picker": "表示言語", "caption": ("実際のランタイムシーン", "制作状況"), "pause": ("一時停止", "再生")},
    }[locale]
    action_caption = {"ko": ("동작 미리보기 · ", " · 기록 유지"), "ja": ("アクションプレビュー・", "・記録は変更されません")}[locale]
    require(all((result[key] in value or (key == "caption" and result[key].startswith(action_caption[0]) and result[key].endswith(action_caption[1]))) if isinstance(value, tuple) else
                result[key].startswith(value) if key == "graph" else result[key] == value
                for key, value in expected.items()), f"unlocalized {locale} chrome: {result}")
    return result


def keyboard_locale(browser, target):
    browser.run("await page.locator('#language-picker').focus();return true")
    require(evaluate(browser, "document.activeElement.id==='language-picker'"), "picker cannot receive keyboard focus")
    # Stagehand's macOS key facade cannot operate the native option popup.
    browser.run(f"await page.locator('#language-picker').selectOption({json.dumps(target)});return true")
    require(evaluate(browser, "document.activeElement.id==='language-picker'"), "switch lost picker focus")
    browser.run("await page.keyboard.press('Tab');return true")
    require(evaluate(browser, "document.activeElement.id!=='language-picker'"), "keyboard Tab cannot leave picker")
    chrome(browser, target)
    wait(browser, f"window.__localeProof.events.includes({json.dumps(target)})", "shared locale event")


def graph_node(browser, node):
    disclosure(browser, "graph-details", True)
    browser.run(f"await page.locator('#graph-search').fill({json.dumps(node['@id'])});return true")
    wait(browser, "document.querySelectorAll('#graph-nodes .node-button').length===1", "exact graph ID search")
    click(browser, "#graph-nodes .node-button")
    wait(browser, f"JSON.parse(document.querySelector('#graph-raw').textContent||'null')?.['@id']==={json.dumps(node['@id'])}", "selected graph detail")
    raw = evaluate(browser, "JSON.parse(document.querySelector('#graph-raw').textContent)")
    require(raw == node, "raw graph content/IDs/hashes changed in presentation")
    return evaluate(browser, """({summary:document.querySelector('#graph-summary').textContent,
      fields:Array.from(document.querySelectorAll('#graph-summary dt'),e=>e.textContent),
      kinds:Array.from(document.querySelector('#graph-type').options,e=>({value:e.value,label:e.textContent})),
      svg:document.querySelector('#graph-map svg')?.getAttribute('aria-label'),
      nodes:Array.from(document.querySelectorAll('#graph-map [role=button]'),e=>({name:e.getAttribute('aria-label'),tab:e.getAttribute('tabindex')})),
      edges:Array.from(document.querySelectorAll('.graph-edge-label'),e=>e.textContent)})""")


def capture(browser, out, locale):
    result = {}
    for width, height in ((1440, 900), (390, 844), (320, 740)):
        browser.run(f"await page.setViewportSize({{width:{width},height:{height}}});return true")
        for tab in ("scene", "graph"):
            click(browser, f"#tab-{tab}")
            wait(browser, f"!document.querySelector('#panel-{tab}').hidden", "visible tab")
            if tab == "graph":
                wait(browser, "!!document.querySelector('#graph-map svg')", "graph drawing")
                disclosure(browser, "graph-details", False)
            layout = evaluate(browser, """({width:innerWidth,client:document.documentElement.clientWidth,
              scroll:document.documentElement.scrollWidth,history:document.querySelector('#history-details') ?
                String(document.querySelector('#history-details').open):document.querySelector('#toggle-history').getAttribute('aria-expanded')})""")
            require(layout["scroll"] <= layout["client"], f"overflow {locale}/{width}/{tab}: {layout}")
            if width < 700:
                require(layout["history"] == "false", "mobile history should initially be collapsed")
            browser.run("await page.evaluate(()=>window.scrollTo(0,0));return true")
            browser.screenshot(out / f"{locale}-{width}-{tab}.jpg")
            result[f"{width}-{tab}"] = layout
    return result


def check(base, out):
    require(urlsplit(base).hostname in ("localhost", "127.0.0.1"), "use a loopback Studio URL")
    require(not urlsplit(base).query and not urlsplit(base).fragment, "base URL must have no query or fragment")
    out.mkdir(parents=True, exist_ok=False)
    initial = fetch_state(base)
    projects = initial.get("projects", [])
    require(len(projects) > 1, "start server with --browse-workspace and at least two real projects")
    states = {p["id"]: fetch_state(base, p["id"]) for p in projects}
    candidates = [(p, states[p["id"]]) for p in projects if any(
        r["status"] == "ready" and r.get("runtime") and any(a["producer"] == "pixel-action-set" for a in r.get("assets", []))
        for r in states[p["id"]]["runs"])]
    require(candidates, "real ready pixel-action-set project required for retained action proof")
    project, data = candidates[0]
    run = next(r for r in data["runs"] if r["status"] == "ready" and r.get("runtime") and any(
        a["producer"] == "pixel-action-set" for a in r.get("assets", [])))
    summary = {"passed": False, "project": project, "run": run["graph_id"], "locales": {}, "limitations": []}
    summary["limitations"].append("Picker focus and Tab verified; option change uses Stagehand selectOption. Native macOS option-popup keystrokes are not certified.")
    browser = Stagehand()
    try:
        browser.rpc("initialize", {"protocolVersion": "2024-11-05", "capabilities": {},
                                   "clientInfo": {"name": "studio-locale-check", "version": "1"}})
        browser.send({"method": "notifications/initialized"})
        browser.run("""await page.addInitScript(()=>{window.__localeErrors=[];
          window.addEventListener('error',e=>window.__localeErrors.push(e.message));
          window.addEventListener('unhandledrejection',e=>window.__localeErrors.push(String(e.reason)));});return true""")
        url = base + "/?" + urlencode({"project": project["id"], "lang": "ja"})
        browser.run(f"await page.setViewportSize({{width:1440,height:900}});await page.goto({json.dumps(url)});return true")
        chrome(browser, "ja")
        wait(browser, f"document.querySelectorAll('#runs .run-item').length==={len(data['runs'])}", "run history")
        index = next(i for i, item in enumerate(data["runs"]) if item["graph_id"] == run["graph_id"])
        disclosure(browser, "history-details", True)
        browser.run(f"await page.locator('#runs .run-item').nth({index}).click();return true")
        disclosure(browser, "history-details", False)
        scene_ready(browser)
        browser.run("await page.locator('#assets .asset-preview').first().click();return true")
        wait(browser, "document.querySelectorAll('#artifact-detail dt').length>0", "artifact inspector detail")
        browser.run("""await page.evaluate(()=>{window.__localeProof={events:[],states:[],canvas:document.querySelector('#scene')};
          window.addEventListener('studio:localechange',e=>window.__localeProof.events.push(e.detail.locale));
          new MutationObserver(records=>{for(const r of records)window.__localeProof.states.push(r.oldValue)}).observe(
            document.querySelector('#scene'),{attributes:true,attributeFilter:['data-scene-state'],attributeOldValue:true});});return true""")
        if not evaluate(browser, "JSON.parse(document.querySelector('#scene').dataset.sceneMetrics).paused"):
            click(browser, "#pause-view")
        wait(browser, "JSON.parse(document.querySelector('#scene').dataset.sceneMetrics).paused", "paused renderer")
        options = evaluate(browser, "Array.from(document.querySelector('#scene-action').options,e=>e.value).filter(Boolean)")
        require(options, "action inspection unavailable")
        action = "jump" if "jump" in options else options[0]
        browser.run(f"await page.locator('#scene-action').selectOption({json.dumps(action)});return true")
        before_seek = evaluate(browser, "JSON.parse(document.querySelector('#scene').dataset.sceneMetrics).elapsed_ms")
        disclosure(browser, "view-tools", True)
        click(browser, "#step-view")
        disclosure(browser, "view-tools", False)
        wait(browser, f"JSON.parse(document.querySelector('#scene').dataset.sceneMetrics).elapsed_ms>={before_seek + 99}", "seek advanced 100ms")
        before = evaluate(browser, """({metrics:JSON.parse(document.querySelector('#scene').dataset.sceneMetrics),
          title:document.querySelector('#run-title').textContent,brief:Array.from(document.querySelectorAll('#game-brief dd'),e=>e.textContent),
          requests:performance.getEntriesByType('resource').filter(r=>r.name.includes('/artifact?')).map(r=>r.name)})""")
        summary["authored_brief_values"] = before["brief"]
        if not any(re.search('[A-Za-z]{3}', value) for value in before["brief"]):
            summary["limitations"].append("Selected real run has no English brief text; authored values still compared unchanged.")
        click(browser, "#tab-graph")
        nodes = data["graph"]["@graph"]
        node = next(n for n in nodes if n.get("sha256") and n["@id"].startswith(run["graph_id"] + ":"))
        graph_snapshots = {}
        for locale in ("ko", "ja"):
            print(f"Checking {locale}: keyboard, graph, date, desktop/mobile", flush=True)
            keyboard_locale(browser, locale)
            graph = graph_node(browser, node)
            require(graph["svg"] and graph["nodes"] and all(n["name"] and n["tab"] == "0" for n in graph["nodes"]), "graph accessibility missing")
            graph_snapshots[locale] = graph
            expected_date = evaluate(browser, f"new Date({json.dumps(run['started_at'])}).toLocaleString({json.dumps(locale + '-' + ('JP' if locale == 'ja' else 'KR'))},{{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}})")
            require(expected_date in evaluate(browser, "document.querySelector('#run-subtitle').textContent"), "date locale mismatch")
            summary["locales"][locale] = {"chrome": chrome(browser, locale), "date": expected_date,
                "artifact_fields": evaluate(browser, "Array.from(document.querySelectorAll('#artifact-detail dt'),e=>e.textContent)"),
                "graph": graph, "layouts": capture(browser, out, locale)}
        require(graph_snapshots["ko"]["fields"] != graph_snapshots["ja"]["fields"], "graph property labels did not translate")
        require(graph_snapshots["ko"]["kinds"] != graph_snapshots["ja"]["kinds"], "graph type labels did not translate")
        require(summary["locales"]["ko"]["artifact_fields"] != summary["locales"]["ja"]["artifact_fields"], "artifact inspector labels did not translate")
        after = evaluate(browser, """({metrics:JSON.parse(document.querySelector('#scene').dataset.sceneMetrics),
          title:document.querySelector('#run-title').textContent,brief:Array.from(document.querySelectorAll('#game-brief dd'),e=>e.textContent),
          requests:performance.getEntriesByType('resource').filter(r=>r.name.includes('/artifact?')).map(r=>r.name),
          sameCanvas:window.__localeProof.canvas===document.querySelector('#scene'),states:window.__localeProof.states})""")
        for key in ("title", "brief", "requests"):
            require(after[key] == before[key], f"locale switch changed {key}")
        require(after["sameCanvas"] and not any(s in ("disposed", "loading", "error") for s in after["states"]), "renderer lifecycle restarted")
        require(after["metrics"]["paused"] and after["metrics"]["elapsed_ms"] == before["metrics"]["elapsed_ms"], "pause/seek lost")
        require(after["metrics"]["inspection"]["action_override"] == action, "action override lost")
        require(after["metrics"]["frame_count"] >= before["metrics"]["frame_count"], "renderer frame counter reset")
        resources = evaluate(browser, """({errors:window.__localeErrors,
          failed:performance.getEntriesByType('resource').filter(r=>r.responseStatus>=400).map(r=>r.name),
          external:performance.getEntriesByType('resource').filter(r=>new URL(r.name).origin!==location.origin).map(r=>r.name)})""")
        summary["browser_errors"] = resources
        summary["retained_inspection"] = {"before": before["metrics"], "after": after["metrics"], "states": after["states"]}
        print("Checking stored preference, project navigation, and recorded failures", flush=True)
        # Remove lang before reload: stored preference, not a query parameter, must win.
        browser.run("await page.evaluate(()=>{const u=new URL(location.href);u.searchParams.delete('lang');history.replaceState(null,'',u)});await page.reload();return true")
        chrome(browser, "ja")
        other = next((p for p in projects if p["id"] != project["id"] and p.get("preview")),
                     next(p for p in projects if p["id"] != project["id"]))
        try:
            if other.get("preview"):
                click(browser, f"#project-gallery [data-project=\"{other['id']}\"]")
            else:
                browser.run(f"await page.locator('#project-picker').selectOption({json.dumps(other['id'])});return true")
        except RuntimeError as error:
            # Navigation may dispose the old execution context before Stagehand returns.
            if not any(message in str(error) for message in ("Cannot find context with specified id", "Execution context was destroyed")):
                raise
        wait(browser, f"new URL(location.href).searchParams.get('project')==={json.dumps(other['id'])}", "project navigation")
        chrome(browser, "ja")
        summary["persisted_reload_and_project_switch"] = True
        # Explicit URL must override the now-stored Japanese preference.
        browser.run(f"await page.goto({json.dumps(base + '/?' + urlencode({'project': project['id'], 'lang': 'ko'}))});return true")
        chrome(browser, "ko")
        summary["url_overrides_storage"] = True
        browser.run("await page.evaluate(()=>{const u=new URL(location.href);u.searchParams.delete('lang');history.replaceState(null,'',u)});await page.reload();return true")
        chrome(browser, "ja")
        browser.run("await page.evaluate(()=>{window.__localeProof={events:[]};window.addEventListener('studio:localechange',e=>window.__localeProof.events.push(e.detail.locale))});return true")
        keyboard_locale(browser, "ko")
        browser.run("await page.evaluate(()=>{const u=new URL(location.href);u.searchParams.delete('lang');history.replaceState(null,'',u)});await page.reload();return true")
        chrome(browser, "ko")
        summary["korean_persisted_reload"] = True
        failures = [(p, r) for p in projects for r in states[p["id"]]["runs"] if r["status"] == "error"]
        if failures:
            failed_project, failed_run = failures[0]
            for locale in ("ko", "ja"):
                browser.run(f"await page.goto({json.dumps(base + '/?' + urlencode({'project': failed_project['id'], 'lang': locale}))});return true")
                chrome(browser, locale)
                failed_data = states[failed_project["id"]]
                wait(browser, f"document.querySelectorAll('#runs .run-item').length==={len(failed_data['runs'])}", "failed run history")
                i = next(i for i, r in enumerate(failed_data["runs"]) if r["graph_id"] == failed_run["graph_id"])
                disclosure(browser, "history-details", True)
                browser.run(f"await page.locator('#runs .run-item').nth({i}).click();return true")
                disclosure(browser, "history-details", False)
                wait(browser, "!document.querySelector('#run-message').hidden", "recorded failure message")
                click(browser, "#tab-graph")
                error = next((n for n in failed_data["graph"]["@graph"] if n["@id"] in failed_run.get("failedWith", [])), None)
                if error is None:
                    run_node = next(n for n in failed_data["graph"]["@graph"] if n["@id"] == failed_run["graph_id"])
                    refs = run_node.get("failedWith", [])
                    error = next(n for n in failed_data["graph"]["@graph"] if n["@id"] in refs)
                summary.setdefault("failure", {})[locale] = {"message": evaluate(browser, "document.querySelector('#run-message').textContent"), "detail": graph_node(browser, error)}
            require(summary["failure"]["ko"]["message"] != summary["failure"]["ja"]["message"], "failure UI did not translate")
            require(summary["failure"]["ko"]["detail"]["fields"] != summary["failure"]["ja"]["detail"]["fields"], "error detail labels did not translate")
        else:
            summary["limitations"].append("No recorded failed run available; failure-detail flow not exercised.")
        require(fetch_state(base, project["id"]) == data, "read-only browser inspection changed source graph projection")
        summary["source_projection_unchanged"] = True
        require(not any(resources.values()), f"browser/resource errors: {resources}")
        summary["passed"] = True
        print(f"PASS: {out / 'locale-browser.json'}", flush=True)
    except Exception as error:
        summary["error"] = f"{type(error).__name__}: {error}"
        raise
    finally:
        browser.close()
        (out / "locale-browser.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", required=True)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    check(args.url.rstrip("/"), args.out)
