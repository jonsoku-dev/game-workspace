# 라일락 우편배달부

기준 원화에서 캐릭터의 색과 옷차림을 정하고, 손 흔들기·걷기·환호·대기·달리기·공격·점프·피격의 완성 셀을 각각 작화한 예제다. 손바닥과 소매, 가방 아래 옷, 접힌 무릎과 부츠의 앞뒤를 포즈마다 그림으로 지정했다. 작업자는 코드로 픽셀 윤곽·채색을 그렸고 얼굴·팔레트·일부 반복 셀은 공유한다. 사람 애니메이터의 수작업 결과라고 인증한 것은 아니다. [기준 원화](art/master.png) · [프레임 목록](drawings.json) · [실제 Rive 플레이어](http://127.0.0.1:52991/player.html)

## 원문에서 바꾼 점

첨부 1·3의 Polymation 시연은 정면 원화에 17개 본을 적용하고 두 관절을 손으로 수정했다고 설명한다. 공식 문서에는 카메라를 향하는 팔다리의 단축과 끝에서 보이는 선의 재작화도 나온다. 앞·뒤 레이어와 가려진 부위를 살펴야 하고, 프레임별 변화가 큰 그림은 flipbook 유지를 권한다. 기존 Solbaram 결과는 잘린 부위를 이어 붙인 뒤 회전시킨 경우였고, 이것만으로 그 시연의 형태 변화나 품질을 재현했다고 할 수 없다. [픽셀 캐릭터 원문](https://polymation.stunning.gg/docs/pixel-characters) · [이미지 리그 원문](https://polymation.stunning.gg/docs/rig-from-picture)

공식 체험 페이지의 제공 샘플에서는 첨부와 같은 외형의 갈색 단발·청록 상의·검은 반바지 캐릭터, 관절 오버레이와 Wave의 팔 올리기를 확인했다. 현재 표시값은 36색·17본·159KB로 사진의 164KB와 다르다. 정확한 이전 출력의 동일성은 미확인이다. [공개 데모에서 Use the sample 선택](https://polymation.stunning.gg/try/)

첨부 2의 “그림은 새로 그리지 마”는 이미 받은 이펙트 GIF의 배경·크기·단계 순서를 고치는 요청이다. 첨부 4의 SVG 로고 화면은 별도의 정적 디자인 작업이다. 캐릭터 포즈를 각각 그리는 이번 선택은 사용자의 제안에서 왔다. 이전에 검토한 Agent Sprite Forge는 캐릭터 기준 그림으로 동작별 비디오를 만들고 후보를 검토하는 경로를 제공하고, sprite-gen은 픽셀 행·프레임을 직접 편집하는 별도 방식도 다룬다. 이 예제는 로컬에서 그린 셀을 사용한다. 첨부한 정확한 릴스 전체와 제작자의 164KB 원본 파일은 확보하지 못했다. [Agent Sprite Forge 동작별 제작](https://github.com/0x0funky/agent-sprite-forge/blob/6b3da5c444363378e20f3fce130ebecc22f343dd/skills/video2dsprite/references/sprite-set.md) · [sprite-gen 픽셀 작화](https://github.com/aldegad/sprite-gen/blob/35a27e137bfd72440cc856b080913c66f69c772e/docs/pixel-draw.md)

## 한 프레임 고치기

예를 들어 손 흔들기의 손 모양은 `frames/wave/` 아래의 해당 PNG를 교체한다. 잠깐 머무는 시간을 늘리고 싶으면 같은 폴더 `timing.json`의 밀리초를 바꾼다. `tools/collect.py`가 그림 자체를 수정하지 않고 여덟 동작의 입력 목록을 다시 만든다. 프로젝트 폴더에서 아래와 같이 새 출력 경로로 내보낸다.

```sh
python3 tools/collect.py
pixel-asset character --request character.json --out rebuilt
```

한국어 채팅 예시는 “이 우편배달부의 인사에서 손이 얼굴 옆에 보이는 셀을 한 박자 더 유지해 줘. 다른 그림은 그대로 두고 Rive로 다시 내보내 줘”다. `rebuilt/player.html`을 열어 확인한다. `character.json`의 `actions` 순서가 버튼과 상태 머신 숫자 입력 순서다. Studio에서는 다음 명령이 선택한 입력과 출력 파일의 해시를 프로젝트 그래프에 기록한다.

```sh
python3 "$STUDIO_ROOT/tools/character.py" --project . --request character.json --out builds/next
```

## 검증

실제 설치된 Pixel Asset Pipeline 0.7.0 / Game Studio 0.8.1으로 제작했다. [Rive 파일](build/final/bundle/character.riv) · [독립 HTML](build/final/bundle/player.html) · [실제 런타임 재생 GIF](evidence/runtime-preview.gif) · [프레임 검사](evidence/runtime-proof.json) · [브라우저 조작·오프라인 확인](evidence/player-ui.json)

공통 팔레트·얼굴 위치·부츠 길이·옷깃은 원화 및 상태 전환 확대판에서 대조했다. 데스크톱과 모바일 너비에서 버튼을 눌러 상태와 실제 캔버스를 확인했고, Rive 런타임 출력 68셀의 GIF를 프레임별로 디코딩해 지속시간과 픽셀을 점검했다. 걷기·달리기는 제자리 루프이며 게임 월드 이동 속도와의 발 미끄러짐은 검사 대상 밖이다. 사용자 외형 승인은 대기 상태다.
