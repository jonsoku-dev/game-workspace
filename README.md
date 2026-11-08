# Game workspace

이 폴더 안에 독립 Git 저장소 세 개가 있다. 개발할 때는 각 저장소에서 변경분과 검사를 관리한다.

| 위치 | 소유 범위 |
| --- | --- |
| [assets](assets/README.md) | 2D 제작기 `pixel-asset-pipeline`. 정적 PNG, 장비 변형, 동작 시트, 반복 타일, 픽셀 효과를 제작한다. |
| [assets/plugins/model-assets](assets/plugins/model-assets/README.md) | 독립 설치하는 3D 제작기. Blender 편집 원본·GLB·미리보기·검증값을 납품한다. |
| [studio](studio/README.md) | Codex에서 게임 브리프·씬·배치를 관리하고 설치된 제작기를 호출하는 게임 스튜디오. |
| [examples/forest-inventory-demo](examples/forest-inventory-demo/README.md) | 실제 설치된 2D 스킬로 만든 인벤토리 열쇠 예제. |

기존 `pixel-art`, `game-studio`, `forest-inventory-demo` 경로는 이 폴더 아래로 연결된다. [제작 계획과 검증 기록](PROGRESS.md)

## 검증한 게임 프로젝트

- [Scout Actions](examples/scout-actions/README.md) · 48px 캐릭터의 여섯 동작과 접촉 시점 pixelfx 타격을 실제 재생한다.
- [Lantern Embers](examples/forest-camp/scene.json) · 3D 등불과 그 통풍구에 붙은 입체 불티를 재생한다.
- [SSOT 그래프 계약](studio/GRAPH.md) · `python3 studio/tools/workspace_graph.py workspace.json`으로 작업 전체를 JSON-LD로 내보낸다.

## 릴리스 체크아웃과 설치

workspace Git 저장소는 `assets`, `studio`, `examples/forest-inventory-demo`의 검증된 커밋과 작업 이력을 연결한다. [새 체크아웃 설치 및 Godot 인수 절차](RELEASE.md) · [독립 설치 도구](studio/INSTALL.md) · [구조 상자](assets/examples/model-production/README.md) · [기계 딱정벌레](assets/examples/production/clockwork-beetle/README.md).

## 실행 결과

[그래프 작업실](http://127.0.0.1:59763/)에서 등록한 프로젝트를 선택한다. 웹 게임은 [Three.js Woods Alight](http://127.0.0.1:59765/woods-alight/)와 [Phaser Training Clearing](http://127.0.0.1:59765/phaser/)이다. Godot는 [PCK](release/ember-run.pck)로 실행하고, Unity는 [프로젝트](release/unity/)를 라이선스가 있는 Unity 6 에디터에서 열어 검증한다. [HTML 엔진 비교](studio/engines/HTML-ENGINES.md) · [릴리스 증거](release/evidence/receipt.json)
