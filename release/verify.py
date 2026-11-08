"""Rebuild the release examples from inputs, exercise reuse, and play the Godot acceptance scene."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import uuid


def execute(command, *, env=None, timeout=300):
    proc = subprocess.run([str(x) for x in command], stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                          text=True, env=env, timeout=timeout)
    if proc.returncode:
        raise RuntimeError(proc.stdout[-2400:])
    return proc.stdout


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def build(tool, project, output, env=None):
    response = json.loads(execute([sys.executable, tool, "build", "--project", project, "--out", output], env=env))
    if response.get("status") != "ready":
        raise ValueError("scene did not produce a ready runtime")
    return response


def copy_inputs(source, target, inputs):
    target.mkdir()
    for name in inputs:
        if (source / name).is_dir():
            shutil.copytree(source / name, target / name)
        else:
            shutil.copyfile(source / name, target / name)


def verify(work, godot, unity_editor=None):
    root = Path(__file__).resolve().parents[1]
    studio = Path(os.environ["STUDIO_ROOT"]).resolve()
    work.mkdir(parents=True, exist_ok=False)
    scene = studio / "tools/scene.py"
    examples = {
        "forest": (root / "examples/forest-camp", ["scene.json", "requests"]),
        "scout": (root / "examples/scout-actions", ["scene.json", "request.json", "poses", "fx"]),
        "crate": (root / "assets/examples/model-production", ["scene.json", "crate.json", "rescue-crate.blend"]),
        "beetle": (root / "assets/examples/production/clockwork-beetle", ["scene.json", "actions.json", "poses"]),
    }
    result = {}
    for name, (source, inputs) in examples.items():
        project = work / name
        copy_inputs(source, project, inputs)
        response = build(scene, project, "builds/original")
        runtime_path = response["files"]["scene"]
        result[name] = {"run_id": response["run_id"], "runtime": runtime_path,
                        "sha256": hashlib.sha256((project / runtime_path).read_bytes()).hexdigest()}

    forest = work / "forest"
    layout = load(forest / "scene.json")
    for asset in layout["assets"]:
        asset.pop("request")
        asset["reuse"] = {"run_id": result["forest"]["run_id"], "asset": asset["id"]}
    layout["nodes"][0]["rotation_degrees"][1] += 15
    (forest / "scene.json").write_text(json.dumps(layout))
    reused = build(scene, forest, "builds/reused", {**os.environ, "PATH": "",
                                                   "MODEL_ASSETS_ROOT": str(work / "absent")})
    result["reuse"] = reused
    first = load(forest / result["forest"]["runtime"])
    second = load(forest / reused["files"]["scene"])
    if [a["files"] for a in first["assets"]] != [a["files"] for a in second["assets"]]:
        raise ValueError("reuse changed asset paths")

    workspace = work / "workspace.json"
    workspace.write_text(json.dumps({"schema_version": 1, "workspace_id": str(uuid.uuid4()),
                                     "projects": [".", *examples]}))
    record = work / "verification-work.json"
    record.write_text(json.dumps({"id": "acceptance", "agent": "operator", "status": "complete",
                                  "label": "Prepare clean engine acceptance"}))
    execute([sys.executable, studio / "tools/graph.py", "record", "--project", work, "--record", record])
    forest_source = ["--source", "forest", reused["files"]["scene"]]
    scout_source = ["--source", "scout", result["scout"]["runtime"]]
    result["engine_exports"] = {}
    for engine, sources, folder in [
        ("godot", forest_source + scout_source, "game"),
        ("three", forest_source, "web-3d"),
        ("phaser", scout_source, "web-2d"),
        ("unity", forest_source + scout_source, "unity"),
    ]:
        response = execute([sys.executable, studio / "tools/export_game.py", "--engine", engine,
                            "--project", ".", "--workspace", workspace, *sources, "--out", folder])
        exported = json.loads(response)
        result["engine_exports"][engine] = {**exported, "output": folder}
    result["unity_editor"] = {"status": "not_run", "reason": "No licensed editor supplied"}
    if unity_editor:
        unity = work / "unity"
        execute([unity_editor, "-batchmode", "-nographics", "-projectPath", unity,
                 "-executeMethod", "StudioBatch.Verify", "-logFile", work / "unity.log"], timeout=600)
        verification = load(unity / "Assets/StreamingAssets/Studio/unity-verification.json")
        if verification.get("passed") is not True:
            raise ValueError("Unity editor did not produce a passing runtime receipt")
        result["unity_editor"] = {"status": "verified", **verification}
    game = work / "game"
    # Isolate engine settings, editor caches and logs from the operator.
    isolated = {**os.environ, "HOME": str(work / "godot-home"), "XDG_DATA_HOME": str(work / "godot-data")}
    Path(isolated["HOME"]).mkdir()
    execute([godot, "--headless", "--path", game, "--import"], env=isolated)
    log = execute([godot, "--headless", "--path", game, "--fixed-fps", "60", "--", "--verify"],
                  env=isolated, timeout=120)
    (work / "godot.log").write_text(log)
    report = next((json.loads(line.split(" ", 1)[1]) for line in log.splitlines()
                   if line.startswith("STUDIO_PLAYABLE_PASS ")), None)
    if not report or not all(report.get(key) for key in ("movement", "distant_miss", "trigger_320ms", "completed", "reset")):
        raise ValueError(f"gameplay acceptance failed: {work / 'godot.log'}")
    pck = work / "ember-run.pck"
    execute([godot, "--headless", "--path", game, "--export-pack", "Offline PCK", pck], env=isolated)
    packed_log = execute([godot, "--headless", "--main-pack", pck, "--fixed-fps", "60", "--", "--verify"],
                         env=isolated, timeout=120)
    (work / "pck.log").write_text(packed_log)
    packed_report = next((json.loads(line.split(" ", 1)[1]) for line in packed_log.splitlines()
                          if line.startswith("STUDIO_PLAYABLE_PASS ")), None)
    if not packed_report or not packed_report.get("completed") or not packed_report.get("trigger_320ms"):
        raise ValueError(f"exported PCK acceptance failed: {work / 'pck.log'}")
    result["pck"] = {"sha256": hashlib.sha256(pck.read_bytes()).hexdigest(),
                     "bytes": pck.stat().st_size, "gameplay": packed_report}
    result["godot"] = report
    (work / "acceptance.json").write_text(json.dumps(result, indent=2) + "\n")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True, help="New folder for the independent test projects")
    parser.add_argument("--godot", type=Path, required=True, help="Local Godot 4 executable")
    parser.add_argument("--unity-editor", type=Path, help="Existing licensed Unity 6 editor (optional)")
    args = parser.parse_args()
    try:
        print(json.dumps(verify(args.out.resolve(), args.godot.resolve(), args.unity_editor), indent=2))
    except (KeyError, OSError, ValueError, RuntimeError, subprocess.TimeoutExpired) as exc:
        parser.exit(1, f"{exc}\n")
