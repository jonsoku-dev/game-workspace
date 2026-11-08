# Game workspace 제작과 검증

2026-11-08. 작업·산출물·근거의 기준은 각 프로젝트의 JSON-LD 그래프다. [workspace.json](workspace.json)이 개발 기록과 두 게임 프로젝트를 하나로 연결한다. 이 문서는 검증 결과를 읽기 위한 안내다.

| 작업 | 확인한 결과 |
| --- | --- |
| 폴더와 이력 | assets, studio, forest-inventory-demo는 독립 저장소다. 이전 경로의 상대 링크도 확인했다. 시작 커밋은 각각 a9e37c6, d726a7b, 8824b5e다. |
| 2D | 기존 제작 경로와 호환되는 `action-set`을 사용자 Codex와 로컬 CLI로 설치했다. 6개 액션의 입력 27프레임을 288×288 아틀라스에서 모두 원본 픽셀로 복원했다. 실제 pixelfx 타격 시트·LICENSE·NOTICE는 입력과 바이트 단위로 일치했다. [검사](examples/scout-actions/evidence/atlas-check.json) |
| 3D | Blender 5.2.1에서 편집 원본과 GLB를 제작하고 재임포트했다. Webstage hero 예산 검사와 Three 0.187.0 실제 로딩을 통과했다. 상대 경로의 로컬 .blend 입력도 설치 제작기를 통해 실행했다. [모델 비교](examples/forest-camp/evidence/lantern-comparison.jpg) · [작은 크기 포함 검수 시트](examples/forest-camp/builds/lantern-embers-final/assets/lantern/review.png) |
| Headless 스튜디오 | 설치본이 프로젝트의 요청·입력 지문을 고정하고 제작기를 실행해 씬을 게시했다. 이미 있는 출력에는 실패를 기록하고 원본을 보존한다. 같은 씬의 이전 실행, 재실행과 실패를 조회했다. 테스트는 출력 경합, timeout 하위 프로세스 종료, 입력 경로 이탈, 소스 변경도 다룬다. |
| 읽기 전용 visualizer | 실제 Three WebGL에서 2D 공격과 3D 등불 씬을 각각 재생했다. 2D는 정면 직교 카메라, 3D는 깊이 검사를 사용하는 메시 인스턴스다. 그래프 탭에서 GLB의 입력·제작·배치 관계와 실패를 열었다. 390px 뷰포트에서도 검색과 관계 선택이 동작했다. |
| SSOT | 실행별 원자적 샤드에 입력, 제작기 버전·지문, 출력 SHA-256, 검사, 실패, 부모 배치를 기록한다. 기존 샤드를 보존하고 새 컨텍스트로 통합한다. [스키마와 조회 명령](studio/GRAPH.md) |
| 외부 자료 | [3D 원본과 라이선스](assets/docs/model-references.md), [모델링 방식](assets/docs/model-quality.md), [Agent Sprite Forge와 pixelfx](assets/docs/sprite-forge.md)에 채택과 보류 범위를 남겼다. |

## 실제 장면

**Scout Actions.** 로컬 포즈 21개 파일이 여섯 동작의 타임라인에서 27번 쓰였다. 공격의 네 번째 프레임이 시작되는 320ms에 검 끝과 효과 접점을 연결했다. 실제 브라우저에서 공격 프레임 6개, 타격 효과 프레임 14개를 관찰했다. GIF는 한 캐릭터의 여섯 동작을 순서대로 보여 준다. [6동작 GIF](examples/scout-actions/builds/six-actions/assets/scout/preview.gif) · [런타임 근거](examples/scout-actions/evidence/final-browser.json) · [입력과 고지](examples/scout-actions/README.md)

**Lantern Embers.** 이전 `blockout`과 `field-lantern`은 한 씬에 픽셀 효과와 3D 모델을 함께 읽은 통합 실험이다. `lantern-embers-final`은 등불과 불티 모두 Blender GLB를 쓴다. 불티는 등불 통풍구의 자식 노드에 붙고 24개 입자의 위치·회전·크기가 실제 3축에서 변한다. [실행 씬](examples/forest-camp/builds/lantern-embers-final/scene.runtime.json) · [WebGL 측정](examples/forest-camp/evidence/final-browser.json) · [화면](examples/forest-camp/evidence/final-browser.jpg)

2D 제작·검증은 IP 네트워크를 차단한 상태로 실행했다. 3D는 Webstage 실행기 tsx가 로컬 Unix 소켓을 써서, IP를 차단하고 Unix IPC만 허용했다. Blender의 오프라인·스크립트 자동 실행 해제 옵션도 적용했다. 각 브라우저 검증의 자원 요청은 해당 loopback origin이었다. 독립 Codex 스킬 확인은 실제 Codex 세션을 사용했다.

## 범위

이전 릴리스에서는 사용자 Codex의 skills/list에서 Pixel Asset Pipeline 0.3.2, Model Assets 0.2.1, Game Studio 0.3.1이 활성 상태임을 확인했다. 2D 테스트 67개, 모델 제작 테스트 10개, 스튜디오 테스트 41개가 통과했다. Three 로더·서버·재생 시간·부모 변환 검사도 통과했다. [워크스페이스 JSON-LD 내보내기](workspace.graph.jsonld)

0.3.1 스튜디오 인수 당시의 증거는 macOS, Blender 정적 메시, 로컬 Webstage 컴파일, Three.js/WebGL 및 2D 호환 계약에 해당한다. 애니메이션 리그, 캐릭터 한 장에서 임의의 여섯 동작 자동 생성, Godot·Unity 플레이, 사용자 아트 승인은 검증하지 않았다. 정규 스튜디오 실행은 자동 기록되며, 스튜디오 밖의 작업은 `graph.py record`로 근거를 연결한다.

## 프로덕션 작업실 릴리스

Game Studio 0.4.0 / Model Assets 0.3.0 / Pixel Asset Pipeline 0.3.2. 릴리스 전체는 [재현 절차](RELEASE.md) 및 [검증 스크립트](release/verify.py)에 있다. 왼쪽 실행 이력, 중심 장면, 에셋 필름스트립·검수 패널과 연결형 인과 그래프를 제공한다. 모바일 이력은 접을 수 있고 프레임 정지·카메라·동작 선택은 관찰에만 적용한다.

- [UV 도장 구조 상자](assets/examples/model-production/README.md) · 원본 텍스처, 색, UV와 실제 디코더를 검사한다. 배치만 바꾼 실행은 기존 인정 산출물의 해시를 확인하고 기존 파일을 재사용한다.
- [기계 딱정벌레](assets/examples/production/clockwork-beetle/README.md) · 두 번째 캐릭터의 관절 동작·29프레임을 현지 입력으로 제작한다.
- [Godot 런타임](studio/engines/godot/README.md) · 실제 조작 루프·완료·재시작과 원본 폴더가 없는 PCK에서의 재생을 검증했다. 공식 4.5.1은 필수 meshopt 압축을 해석하지 못해, 해당 경우에만 그래프에 고정된 raw GLB를 사용한다.

## 멀티 엔진 릴리스

Game Studio 0.5.1은 같은 그래프의 성공 RuntimeProduct와 사용된 파일을 읽어 Godot, Three.js, Phaser 및 Unity 결과를 내보낸다. 외부 파일 사용·산출물 생성·검사는 분리된 관계로 남긴다. [소스 인수](release/evidence/clean-checkout.json) · [독립 작업자 인수](release/evidence/independent-checkout.json) · [웹 브라우저 결과](release/evidence/web-games.json).

| 경로 | 실제 결과 | 확인 범위 |
| --- | --- | --- |
| Godot 4.5.1 | [실행 PCK](release/ember-run.pck) · [에디터 프로젝트](release/godot/) | 원본 소스 폴더 없이 이동, 원거리 빗맞음, 320ms 접촉, 3개 수집, 완료·재시작. 24개 불티는 입체 메시. |
| 웹 3D | [Three.js 게임](http://127.0.0.1:59765/woods-alight/) | r187 GLTFLoader, 로컬 Meshopt 디코더, 입체 파티클. 브라우저 실제 버튼으로 수집·등불 복원·승리·재시작. `release/web/three`는 디코더를 추가하기 전 보존한 실행이다. |
| 웹 2D | [Phaser 게임](http://127.0.0.1:59765/phaser/) | Phaser 3.90.0의 WebGL 게임. 로컬 스프라이트/효과 원점·타이밍, 거리 판정, 적중 3회·완료·재시작. Phaser와 내장 소스·pixelfx 고지 포함. |
| Unity 6 | [Unity 프로젝트](release/unity/) · [검증 명령](studio/engines/unity/README.md) | Blender 변환·소스 무결성·독립 C# 상태 로직 실행 검증. 사용자가 정한 이번 범위는 프로젝트와 에디터 검증 명령 제공까지다. 라이선스가 활성화된 에디터의 임포트·플레이는 미검증이다. |

[실제 납품 영수증](release/evidence/receipt.json)에 소스 커밋·버전·파일 지문과 검증 범위를 기록한다. 별도 실행마다 그래프 ID가 달라지므로 신선한 PCK들의 바이트가 동일하다는 주장은 하지 않는다. Unity 에디터 검증, 외부 공개/서명·장기 팀 운영, 최종 사용자 미술 승인은 이 인수에 포함하지 않았다.

## 작업실 0.6.0 · 한국어와 일본어

헤더에서 언어를 바꾸며 실행·선택·재생을 유지한다. `lang=ko`와 `lang=ja`로 공유할 수 있다. 번역 대상은 화면 문구·날짜·검사 안내이고, 기획문·파일명·원본 오류·그래프 데이터는 그대로 보존한다. 첫 화면에는 실제 프로젝트 그림과 장면이 보이고, 에셋을 눌러야 상세가 열린다. 실행 이력·기술 정보·원본 JSON은 기본으로 접혀 있다. 등록한 웹 납품이 선택된 씬 리비전과 연결되어 있으면 별도 루프백 게임으로 열 수 있다.

동일한 등불 프로젝트의 1440×900 첫 화면에서 표시된 텍스트 노드 수는 75→21, 문자 수는 756→195였다. 캔버스는 853×396에서 1139×468로 넓어졌다. 오버플로·언어 전환·동작 선택·실패 안내를 검사했다. [한국어 화면](release/evidence/bilingual/workbench-ko.jpg) · [일본어 프로젝트 갤러리](release/evidence/bilingual/project-gallery-ja.jpg) · [실제 브라우저 검사](release/evidence/bilingual/locale-browser.json).

## 첨부 레퍼런스 대조와 수정 실험

첨부된 세 화면의 원본 여섯 저장소(후속 Agent Sprite Forge 포함)를 대조했다. Claude Code Game Studios의 시작·스토리 실행 경로, Game-Dev-Agentic-Skills의 엔진별 구현·화면 검수, awesome-gamedev-agent-skills의 대표 비주얼/게임 크기 검토는 첫 기획과 인수의 참고가 된다. sprite-gen과 Agent Sprite Forge의 후보 선택·동작 생성/수정, pixelfx의 로컬 효과 저작은 프레임 패킹만으로 해결되지 않는다. 이 스튜디오의 강점은 이미 확보된 재료를 실제 엔진에서 반복 수정·확인하고 출처를 추적하는 과정이다. 원화에서 임의 동작을 생성하는 기능, 처음 한 문장에서 대표 장면의 성공 조건까지 안내하는 흐름, 아트 후보 비교·채택은 별도 과제다.

정찰병 입력의 독립 복사본에서 공격 준비 프레임을 80ms 늘렸다. 0부터 세는 접촉 프레임 3은 그대로 두고 시작 시각은 320→400ms로 이동했다. 캐릭터 아틀라스와 pixelfx 시트의 SHA-256은 각각 이전과 일치했다. 변경본도 실제 Phaser에서 타격 3회·완료·재시작을 통과했다. 원본 게임은 기존 타이밍을 유지한다. [350ms 비교 이미지](release/evidence/attack-timing-comparison.png) · [측정값](release/evidence/attack-timing-comparison.json).
