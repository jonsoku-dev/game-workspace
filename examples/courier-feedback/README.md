# 라일락 배달 연습

기존 라일락 우편배달부의 셀 48장을 그대로 사용하는 독립 Studio 게임 예제다. 이동·점프·소포 수집·배달·공격·피격·완료의 피드백을 정상 Phaser 납품에서 비교한다. 캐릭터 PNG와 재생 시간은 `../storybook-cels`의 여섯 동작과 바이트 단위로 같으며, 원본 설명·작화 방향·원화·팔레트·전체 목록은 [source](source/README.md)에 보존했다. 원본은 코드로 직접 작화한 셀이다. 사람 애니메이터의 작품이나 사용자 외형 승인으로 인증하지 않는다.

키보드와 화면 버튼을 사용할 수 있다. A/D·←/→ 이동, W·↑ 점프, Space 공격, E 배송, P·Esc 일시정지, R 재시작이다. 달리기 셀은 에셋에 보존하지만 이 게임에는 별도 달리기 조작이 없다. 정확한 현재 조작은 게임 화면의 안내를 따른다. 피드백 A/B 전환은 표현만 바꾸며 목표·공격 판정·이동 규칙은 유지한다. 브라우저 소리는 첫 조작 후 허용될 수 있으며 기기 설정에 따라 다르다.

## 재현

설치된 Game Studio 0.9.1과 Pixel Asset Pipeline 0.8.0, 준비된 Phaser 3.90.0을 사용한다. 기존 출력은 덮어쓰지 않고 새 `--out`을 사용한다. workspace에는 이 프로젝트가 등록돼 있어야 한다.

```sh
export STUDIO_ROOT="$HOME/.codex/plugins/cache/game-studio/game-studio/0.9.0"
python3 "$STUDIO_ROOT/tools/scene.py" validate --project examples/courier-feedback
python3 "$STUDIO_ROOT/tools/scene.py" build --project examples/courier-feedback --out builds/next
python3 "$STUDIO_ROOT/tools/export_game.py" --engine phaser \
  --project examples/courier-feedback --workspace workspace.json \
  --source examples/courier-feedback builds/next/scene.runtime.json --out play/next
python3 -m http.server 52993 --bind 127.0.0.1 --directory examples/courier-feedback/play/next
```

공격의 접촉은 0기반 셀 4, 360ms, 셀 좌표 `[90,62]`이며 가방이 오른쪽으로 뻗는 작화에 맞춘다. 바닥 피벗은 `[48,100]`이다. 거울 반전은 엔진의 방향 전환이며 새 방향을 작화했다고 주장하지 않는다. 요청의 일곱 효과는 Pixel 제작기의 절차적 픽셀 효과이며 캐릭터 원화를 수정하지 않는다.

[원본 복사 검사](evidence/source-copy.json)는 셀 동일성과 시간을 증명한다. 실제 빌드·납품·브라우저 근거는 `.game-studio/runs`의 프로젝트 그래프에 기록한다. 파일 제작 성공, 브라우저 동작 검사, 사람의 외형·재미 승인은 별개다. 사용자 외형·손맛 승인은 아직 대기다.

## 실제 설치본

[플레이](http://127.0.0.1:52993/) · [납품 영수증](play/final/engine-export.json) · [정상 브라우저 검수](checks/browser-6b5dd87108a54f7f8f38d78b8697bccb.json). 설치본 실행 `6b1ed8e11881401aa1025317b9a121cf`의 입력·산출물·엔진·검수는 동일 프로젝트 그래프에 연결돼 있다. 정상 검수기는 11개 courier 기준과 실제 브라우저 리소스 해시를 확인했으며 별도 `verify()` 재검산도 통과했다.

재검수는 설치된 `tools/playcheck.py run --project examples/courier-feedback --export play/final`로 실행한다. 이 명령은 독립 Stagehand를 사용한다. 자동 일시정지 때문에 다른 게임 브라우저 검수·녹화와 동시에 실행하지 않는다. 소리의 `scheduled` 상태는 Web Audio 예약 증거이며 출력 장치 청취 승인은 아니다.


## 직접 확인하는 순서

1. 빈손으로 E를 눌러 거절 표시와 안내를 확인한다. D로 걷고 가시 앞에서 W로 점프한다. 발밑 먼지와 착지 효과는 서로 다른 순간에 나타난다.
2. 소포를 지나면 포장과 카운터가 한 번만 변한다. 나무 장벽 근처에서 장벽을 향해 Space를 눌러 공격한다. 기본 세 타 예제에서 30 HP가 20, 5, 0으로 바뀐다.
3. 우체통에서 E를 눌러 배송한다. P로 일시정지·재개하고 R로 처음부터 다시 할 수 있다. 가시에 여러 번 닿으면 실패와 재시작 경로도 볼 수 있다.
4. 손맛 A/B를 끄고 같은 입력을 해 본다. 필수 HUD와 규칙은 유지된다. 소리 버튼을 켜면 발걸음·착지·획득·거절·배달 소리가 난다.

[실제 플레이 녹화](evidence/preview-final/preview-gameplay.mp4) · [최종 검증](evidence/final-verification.json)
