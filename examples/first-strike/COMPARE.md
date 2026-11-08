# 달빛 아래 첫 일격 · A/B 비교

표적을 향해 다가가 세 번 명중시키는 한국어 첫 슬라이스입니다. A와 B는 같은 로봇·PNG·게임 규칙을 사용합니다. B는 공격의 두 번째 예비 동작을 120ms에서 200ms로 늘렸습니다.

| 측정 | A | B |
| --- | --- | --- |
| 공격 길이 | 600ms | 680ms |
| 접촉 프레임 | 2 | 2 |
| 접촉 시점 | 240ms | 320ms |
| 승리 조건 | 유효 명중 3회 | 유효 명중 3회 |

실제 설치한 Studio 0.7.0, pixel-asset-pipeline 0.4.0, Pillow 12.0.0으로 제작했습니다. 두 내보내기는 상대 경로의 미디어와 Phaser를 포함하므로 임시 설치 폴더나 네트워크 다운로드 없이 정적 서버에서 재생됩니다.

게임 주소는 [A](http://127.0.0.1:52981/), [B](http://127.0.0.1:52982/)입니다. 서버가 없으면 프로젝트 폴더에서 각각 별도 터미널로 실행하세요.

```sh
python3 -m http.server 52981 --bind 127.0.0.1 --directory play/run-d30ab1e693114b8e8c3dfb074d3ff218
```

```sh
python3 -m http.server 52982 --bind 127.0.0.1 --directory play/b
```

←/→ 또는 A/D로 이동하고 Space 또는 화면의 공격 버튼으로 공격합니다. R 또는 다시 시작 버튼으로 초기화합니다. 표적 가까이에서 오른쪽을 향해 공격해야 합니다.

읽기 전용 그래프와 A/B 비교 화면은 워크스페이스 루트에서 실행할 수 있습니다.

```sh
python3 studio/tools/visualize.py --project examples/first-strike --workspace examples/first-strike/workspace.json --port 52980
```

브라우저 검사는 등록된 내보내기의 전체 바이트 해시를 확인하고 화면 버튼으로 거리 밖 공격·반대 방향 공격·접촉 시점·2회 미완료·3회 승리·초기화를 실행했습니다. A와 B 모두 여섯 기준을 통과했습니다. 보고서는 `checks/browser-dbfd8f01ea3d4fdcb58818ef423fd012.json`, `checks/browser-f8424c0cc8714eb88ac607c313375f4a.json`입니다.

정확한 시간과 PNG 바이트 보존 근거는 `evidence/timing-comparison.json`에 있습니다. 1배율 반복 GIF와 실제 PNG 접촉 시트는 `candidates/anticipation-b/attack-before-1x.gif`, `attack-after-1x.gif`, `attack-contact.png`입니다. 실루엣의 맨 아래 픽셀은 해부학적 발 검사가 아니며, 기술 측정은 시각 품질과 재미를 보증하지 않습니다.

원본 A 실행은 `45b73b4465c74c728050d68cd6962377`, B 실행은 `5536a7d73c41468e829e5ef79621613d`입니다. 패치는 `patches/anticipation-plus-80ms.json`, 후보 씬은 `candidates/anticipation-b/scene.json`이며 원본 입력과 실행은 유지했습니다. 실패한 최초 B 내보내기도 그래프에 보존했고 엔진 입력 해시 처리 수정 후 실제로 재시도했습니다.

정식 비교는 `urn:game-studio:44866087-25af-4833-8d50-2627fd9bf49f:review:comparison:anticipation-80ms`입니다. B 기술 통과는 `urn:game-studio:44866087-25af-4833-8d50-2627fd9bf49f:review:decision:anticipation-b-technical-pass`에 기록했습니다. 활성 채택 실행은 없습니다. 사람이 직접 A와 B를 플레이·관찰하고 손맛·접촉감·동작 품질을 판단한 뒤 명시적으로 선택해야 합니다. 이 문서는 조작 안내이며 실행·근거·판단의 원본은 프로젝트 JSON-LD 그래프입니다.
