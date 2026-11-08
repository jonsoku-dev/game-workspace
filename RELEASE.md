# 로컬 제작 릴리스

이 릴리스의 대상은 macOS arm64용 Codex Game Studio, Pixel Asset Pipeline, Model Assets다. workspace 저장소가 세 하위 Git 저장소의 리비전을 고정한다. 에셋·스튜디오·기존 예제 저장소는 각각 독립 이력을 가진다. 외부 서버에 푸시할 필요 없이 다음처럼 별도 체크아웃으로 설치와 인수를 재현할 수 있다.

```sh
git -c protocol.file.allow=always clone --recurse-submodules /path/to/game-workspace /new/path/game-workspace
cd /new/path/game-workspace
git submodule status
```

`protocol.file.allow`는 이 명령에서 신뢰한 로컬 Git 경로를 가져오기 위해 지정한다. manifest의 `./assets`, `./studio`, `./examples/forest-inventory-demo`는 원본 workspace 저장소 아래 각 저장소를 가리킨다.

[설치 사전 조건과 오프라인 입력 준비](studio/INSTALL.md)를 먼저 확인한다. 검증한 호스트는 macOS arm64, Python 3.13, Blender 5.2.1, Node 26.7.0, Webstage 1.0.0, Codex CLI 0.165.0이다. 이 버전의 Webstage는 호스트에 미리 제공하는 도구다. 이 워크스페이스에서 Webstage 자체를 배포하지 않는다. 게임 런타임 인수는 공식 Godot 4.5.1로 실행했다.

```sh
PYTHON=/absolute/path/to/python3.13
"$PYTHON" studio/tools/install_workspace.py --workspace "$PWD" --destination /new/path/tools \
  --wheelhouse /path/to/approved/wheels --npm-cache /path/to/approved/npm-cache
. /new/path/tools/env.sh
"$PYTHON" release/verify.py --out /new/path/acceptance --godot /path/to/Godot
```

마지막 명령은 빈 프로젝트 네 곳에 실제 제작 입력만 옮긴 뒤 2D 동작·타격, 등불과 불티, 텍스처 소품, 두 번째 캐릭터를 설치본으로 빌드한다. 등불의 배치를 바꾼 실행에서는 제작기 경로를 사용할 수 없게 만들고 원본 해시로 재사용한다. 그 런타임과 2D 공격을 Godot에 넘겨 이동, 원거리 빗맞음, 320ms 접촉, 수집 완료와 재시작을 확인한다. 같은 게임을 PCK로 내보낸 뒤 프로젝트 소스 없이도 같은 입력 루프를 검증한다. 결과는 새 폴더의 `acceptance.json`, `godot.log`, `game/project.godot`, `ember-run.pck`, `pck.log`에 남는다. PCK 재생에는 호환 Godot 실행 파일이 필요하다.

독립 설치가 끝나면 `python3 "$STUDIO_ROOT/tools/visualize.py" --project "$PWD/examples/forest-camp" --workspace "$PWD/workspace.json"`으로 검수 화면을 연다. 원본 에셋·씬·그래프와 같은 리비전을 함께 보관한다. 복귀할 때는 이전 checkout과 그 설치의 `env.sh`를 사용한다.

검증 환경에서 Webstage 실행기는 로컬 webstage-compiler 1.0.0 커밋 `5ad9509de4b83839a5d0df420d34b3656e58d006`을 사용했다. 원본 저장소를 제공받는 환경에서는 그 리비전의 pnpm 잠금 파일과 의존성 저장소를 준비한 뒤 `pnpm install --offline --frozen-lockfile` 및 `pnpm build`로 CLI를 빌드한다. 이 릴리스가 공개 Webstage 패키지나 Blender 실행 파일을 대신 제공하지 않는다.
