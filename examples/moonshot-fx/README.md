# Moonshot FX

로컬 CC0 Camp Robot과 MIT pixelfx hit-spark를 사용한 작은 훈련 예제다. `sources/`에 원본·rig·정확한 LICENSE/NOTICE를 보관한다. 외부 게임 화면, 상용 에셋이나 독점 첨부물은 사용하지 않았다.

`tools/prepare.py`는 40×40 로봇을 8배 bicubic 확대하고 1.25px 흐림과 투명 여백을 더한 **합성 입력**을 만든다. `snap.request.json`은 `[32,32,320,320]`을 40×40, 최대 16개 불투명 색, 알파 경계128로 복원한다. 원본 rig를 그대로 쓰는 articulated motion이며 새로 그린 포즈가 아니다. 스타터 원본의 승인 표시는 이 예제의 외형 승인을 의미하지 않는다.

효과 원본은 충격 효과만 있다. `tools/prepare.py`가 이를 잘라 크기·위치를 바꿔 charge/travel을 **합성한 파생물**을 만든다. GIF의 실제 저장 순서는 impact(0–11), charge(12–14), travel(15–17)다. `effect.request.json`은 이를 charge → travel → impact 순서로 가져오며 각 프레임은40ms다. 원본의 빈 마지막 두 프레임은 제외했다. GIF 저장은 1-bit 투명도를 사용하며 별도 의미 기반 배경 제거를 주장하지 않는다.

플레이 계약은 FX를 공격 시작(프레임0)에 재생하고, 명시적 접촉 프레임2(240ms)에 한 번 피해를 계산한다. 효과 impact는240ms에 시작한다. 표적에 다가가 세 번 명중시키면 완료한다. A/D 또는 방향키로 이동, Space로 공격, R로 재시작한다. 화면 버튼도 제공한다.

실행·제작·검증의 기준 기록은 `.game-studio/runs/*.jsonld`다. `rehearsal/`은 소스 리허설이며 설치된 최종 제작과 구분한다. 검수 이미지는 실제 파일을 합성한 기술 관찰 자료다. 사람의 외형·재미 승인은 아직 없다.

출처: Camp Robot은 Game Studio의 로컬 원본(CC0-1.0). hit-spark는 Patch / Hugo Duprez(MIT), pixelfx `impacts/hit-spark`에서 가져온 기존 로컬 사본이다. `sources/FX-NOTICE.md`는 저장소 전체에 대한 원래 안내도 그대로 포함하며, 이 프로젝트가 그 안내의 모든 코드나 글꼴을 사용했다는 뜻은 아니다.

최종 플레이 산출물은 `play/final-v3/`, 실제 제작 실행은 `df65b9bdea154d36bf8507f6bbe698fc`다. 초기 영어 문구를 사용한 `final`, `final-v2`도 그래프·영수증과 함께 보존했다. 최종 플레이 주소는 http://127.0.0.1:52983/ 이다.

확인 자료:

- `evidence/final-sheet.png`: 합성 원본↔snap, 캐릭터와 실제 가져온 charge/travel/impact 프레임.
- `production/motion/rig.png`, `motion-qa.png`: 설치된 제작기의 rig·포즈 관찰 시트.
- `evidence/engine-final-impact.png`, `engine-final-mobile.png`: 실제 Phaser 화면을 직접 확인한 스크린샷.
- `checks/browser-1385f1d7619b4ea98d4837761e8f16d4.json`: 정상 버튼을 사용한 Stagehand 검사가 8개 기준 통과. FX는0ms, 피해 접촉은240ms, 첫 명중 시 실제 impact 프레임 재생을 검산했다. 브라우저 스케줄링에 따른 관측 지연은 보고서에 별도 남는다.
- `evidence/final-validation.json`: 정확한 최종 파일 SHA-256, 영수증 전체 파일 검산, 타이밍·라이선스 확인.
- `evidence/installed-tools.json`: 실제 설치본 버전과 제작·실행 코드 지문.

재검사 명령(설치된 Studio0.7.1의 `STUDIO_ROOT` 사용):

```sh
python3 "$STUDIO_ROOT/tools/playcheck.py" run --project examples/moonshot-fx --export play/final-v3
python3 "$STUDIO_ROOT/tools/graph.py" export --project examples/moonshot-fx
python3 -m http.server 52983 --bind 127.0.0.1 --directory examples/moonshot-fx/play/final-v3
```

사람의 외형·재미 승인은 미검증이다. 이 효과는 GIF 프레임을 재배열해 재생하는 예제로 실제 탄환 물리 시뮬레이션이 아니다. 모바일에서는390px 화면의 배치·재시작만 별도 관찰했고, 전체 명중 시나리오는 데스크톱 브라우저에서 검증했다.
