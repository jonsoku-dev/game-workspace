# Scout actions + pixelfx

48×48 스카우트의 수작업 포즈를 공통 피벗 `[24,46]`과 각 프레임 시간으로 묶는 로컬 입력 예제다. 기존 자체 스카우트와 걷기 그림을 사용했다. Agent Sprite Forge의 생성기나 시연 영상에서 가져온 그림은 없다.

| 동작 | 프레임 항목 / 고유 포즈 | 재생 | 작성 내용 |
| --- | --- | --- | --- |
| idle | 3 / 2 | 960ms 반복 | 상체의 작은 호흡 이동 |
| walk | 4 / 4 | 480ms 반복 | 기존에 직접 그린 네 보행 포즈 |
| run | 4 / 4 | 320ms 반복 | 다시 그린 굽힌 무릎과 빠른 지지/비행 자세 |
| attack | 6 / 4 | 800ms 1회 | 검을 드는 준비, 전방 접촉, 아래로 빠지는 회복 |
| jump | 6 / 4 | 800ms 1회 | 웅크림, 다리 접기, 착지; 원본 격자 안의 포즈만 제공 |
| hurt | 4 / 3 | 640ms 1회 | 뒤로 밀림과 팔을 모으는 방어 |

이 예제의 jump는 제자리 포즈다. 점프의 실제 높이·이동·충돌은 게임 런타임의 책임이다. 자세는 손으로 작성한 최소 상호운용 샘플이며 범용 동작 생성이나 최종 아트 품질을 증명하지 않는다.

`request.json`의 attack 0-based 프레임 3은 320ms에 시작한다. 이 시점에 실제 pixelfx `impacts/hit-spark`가 시작한다. 무기 끝은 `[46,25]`, 효과 안의 접촉점은 `[44,44]`다. 따라서 효과 좌상단은 캐릭터 좌상단에서 `[2,-19]`다. upstream 메타데이터의 pivot `[44,64]`는 바닥 원점이다. `height:20` 옵션을 반영한 접촉점과 구분해야 한다. 저장된 PNG 픽셀 격자와 타임라인 기준 정렬 오차는 0px / 0ms다.

`scene.json`은 `pixel-action-set` 제작기로 `request.json`을 읽고 `action:"attack"`을 선택한다. 정상 스튜디오 실행·설치 경로 검증·SSOT 기록은 호스트 세션이 수행한다. 설치본이 생성한 결과는 [실제 아틀라스](builds/six-actions/assets/scout/atlas.png), [합성 미리보기](builds/six-actions/assets/scout/preview.gif), [브라우저 측정](evidence/final-browser.json)에 있다.

## 효과 출처와 재현

공식 소스: https://github.com/patch-gg/pixelfx/tree/a84159688af3ca37a4be05a0d422b94451b2e24e

`fx/hit-spark.png`와 `.json`은 위 커밋의 `tools/render.mjs`로 로컬 생성한 실제 결과다. `fx/LICENSE.txt`와 `fx/NOTICE.md`는 upstream 원문이다. Copyright (c) 2026 Patch, Copyright (c) 2026 Hugo Duprez, MIT. Hit spark의 스파크와 빛은 Hugo Duprez의 Sprite Fusion impact를 각색했다. NOTICE에 나온 Hollow Crown은 upstream act.js의 출처이며 이 예제에서 그 배우·동작은 사용하지 않았다. gallery 폰트·웹사이트·상용 이미지·동영상은 포함하지 않았다.

외부 의존성 설치 없이 Node 내장 모듈로 PNG를 생성한다. 검토한 소스 체크아웃의 루트에서 다음 명령으로 효과를 다시 만들 수 있다. `OUT`은 새 임시 출력 디렉터리다.

```sh
printf '(version 1)\n(allow default)\n(deny network*)\n' > "$OUT/offline.sb"
/usr/bin/sandbox-exec -f "$OUT/offline.sb" node tools/render.mjs impacts/hit-spark \
  --sheet --no-actor --bg none --fps 25 --seed 4 --opts '{"height":20}' --out "$OUT/effect"
```

macOS의 동일 정책에서 실제 Node 실행 파일 `/Users/jongseoklee/.hermes/node/bin/node` v26.7.0의 `127.0.0.1:443`와 `1.1.1.1:443` TCP 연결이 모두 `EPERM`으로 거부됨을 임시 실험에서 확인했다. 소스 취득 뒤 효과 렌더링·포즈 시트 제작·합성은 이 네트워크 차단 정책으로 실행했다. 이 절대 경로는 관찰한 환경이며 배포에 필요한 경로가 아니다.

`provenance.json`은 입력/포함 파일 해시, 실제 프레임 수, 소스 커밋과 접촉 좌표를 담는다. 별도 실행 원장을 이 폴더에 유지하지 않는다.
