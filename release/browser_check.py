"""Run the workstation acceptance flow with the configured local Stagehand MCP."""
import argparse
import base64
import json
import os
from pathlib import Path
import queue
import subprocess
import threading
import time
import tomllib
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen
from urllib.error import HTTPError


class Stagehand:
    def __init__(self):
        config = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex")) / "config.toml"
        server = tomllib.loads(config.read_text())["mcp_servers"]["stagehand"]
        self.proc = subprocess.Popen([server["command"], *server["args"]], text=True, stdin=subprocess.PIPE,
                                     stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                     env={**os.environ, **server.get("env", {})})
        self.lines = queue.Queue()
        self.request_id = 0
        threading.Thread(target=self.read, daemon=True).start()

    def read(self):
        for line in self.proc.stdout:
            self.lines.put(line)
        self.lines.put(None)

    def send(self, message):
        self.proc.stdin.write(json.dumps({"jsonrpc": "2.0", **message}) + "\n")
        self.proc.stdin.flush()

    def rpc(self, method, params):
        self.request_id += 1
        self.send({"id": self.request_id, "method": method, "params": params})
        deadline = time.monotonic() + 50
        while time.monotonic() < deadline:
            line = self.lines.get(timeout=max(.01, deadline - time.monotonic()))
            if line is None:
                raise RuntimeError("Stagehand closed")
            result = json.loads(line)
            if result.get("id") == self.request_id:
                if "error" in result:
                    raise RuntimeError(result["error"])
                return result["result"]
        raise TimeoutError(method)

    def tool(self, name, args):
        result = self.rpc("tools/call", {"name": name, "arguments": args})
        if result.get("isError"):
            raise RuntimeError(result["content"][0].get("text", name))
        return result["content"]

    def run(self, code):
        text = self.tool("run", {"code": code})[0]["text"]
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return text

    def screenshot(self, path):
        image = next(part for part in self.tool("screenshot", {"type": "jpeg", "quality": 80}) if part["type"] == "image")
        path.write_bytes(base64.b64decode(image["data"]))

    def close(self):
        self.proc.stdin.close()
        self.proc.terminate()
        self.proc.wait(timeout=15)


def check(base, out):
    if urlsplit(base).hostname not in ("127.0.0.1", "localhost"):
        raise ValueError("use a local Studio URL")
    out.mkdir(parents=True, exist_ok=False)
    with urlopen(base + "/api/state", timeout=10) as response:
        data = json.load(response)
        tag = response.headers["ETag"]
    try:
        urlopen(Request(base + "/api/state", headers={"If-None-Match": tag}), timeout=10)
        raise ValueError("expected HTTP 304 for unchanged graph")
    except HTTPError as exc:
        if exc.code != 304 or exc.read():
            raise
    projects = {p["name"]: p["id"] for p in data["projects"]}
    summary = {"unchanged_state_http": 304, "projects": {}}
    browser = Stagehand()
    try:
        browser.rpc("initialize", {"protocolVersion": "2024-11-05", "capabilities": {},
                                   "clientInfo": {"name": "studio-release-check", "version": "1"}})
        browser.send({"method": "notifications/initialized"})
        for name in ("forest-camp", "scout-actions", "model-production", "clockwork-beetle"):
            url = base + "/?" + urlencode({"project": projects[name]})
            browser.run(f"await page.setViewportSize({{width:1440,height:900}});await page.goto({json.dumps(url)});return await page.title()")
            for _ in range(25):
                state = browser.run("""return await page.evaluate(()=>{const c=document.querySelector('#scene'); return {
                  title:document.querySelector('#run-title')?.textContent,state:c?.dataset.sceneState,
                  metrics:JSON.parse(c?.dataset.sceneMetrics||'{}'),errors:performance.getEntriesByType('resource').filter(r=>r.responseStatus>=400).map(r=>r.name),
                  external:performance.getEntriesByType('resource').filter(r=>new URL(r.name).origin!==location.origin).map(r=>r.name)}})""")
                if state.get("state") in ("playing", "paused"):
                    break
                if state.get("state") == "error":
                    break
                time.sleep(.25)
            if state.get("state") not in ("playing", "paused") or state["errors"] or state["external"]:
                raise ValueError(f"{name}: {state}")
            browser.screenshot(out / f"{name}-desktop.jpg")
            if name in ("scout-actions", "clockwork-beetle"):
                options = browser.run("return await page.evaluate(()=>Array.from(document.querySelector('#scene-action').options,x=>x.value))")
                if "jump" not in options:
                    raise ValueError(f"{name}: no jump inspection option")
                browser.run("await page.locator('#scene-action').selectOption('jump');return await page.locator('#scene-caption').innerText()")
                override = browser.run("return await page.evaluate(()=>JSON.parse(document.querySelector('#scene').dataset.sceneMetrics).inspection.action_override)")
                if override != "jump":
                    raise ValueError("inspection could not select jump")
            browser.run("await page.locator('#pause-view').click();await page.locator('#tab-graph').click();return await page.title()")
            graph = browser.run("return await page.evaluate(()=>({svg:!!document.querySelector('#graph-map svg'),selected:document.querySelector('#graph-summary h3')?.textContent}))")
            if not graph["svg"]:
                raise ValueError("missing graph drawing")
            if name == "forest-camp":
                browser.screenshot(out / "lineage-desktop.jpg")
            browser.run("await page.setViewportSize({width:390,height:844});await page.locator('#tab-scene').click();return await page.title()")
            mobile = browser.run("return await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,history:document.querySelector('#toggle-history').getAttribute('aria-expanded')}))")
            if mobile["scroll"] != mobile["width"] or mobile["history"] != "false":
                raise ValueError(f"mobile layout failed: {mobile}")
            if name == "scout-actions":
                browser.screenshot(out / "scout-mobile.jpg")
            summary["projects"][name] = {"state": state["state"], "title": state["title"], "nodes": state["metrics"]["node_count"], "mobile": mobile, "graph": graph}
    finally:
        browser.close()
    (out / "browser.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", required=True, help="Studio server with --browse-workspace")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    check(args.url.rstrip("/"), args.out)
