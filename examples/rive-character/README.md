# 솔바람 정찰대

96×96 캐릭터 원화 한 장에서 여덟 동작을 제작했다. 로컬 Rive 플레이어에서 걷기·달리기·손 흔들기·환호를 누르면 같은 캐릭터가 상태를 바꾼다. 공격·점프·피격은 마지막 포즈에서 멈추며 **동작 다시 보기**로 처음부터 재생한다. [플레이어 열기](http://127.0.0.1:8876/?v=2feafcf7) · [Rive 파일](build/rive/character.riv) · [원화](art/master.png)

이 캐릭터는 한 장의 원화, 부위를 표시한 마스크, 부모·관절 위치와 프레임별 자세로 만든다. 원본의 색과 모양에서 팔꿈치·어깨·무릎이 움직일 때 드러나는 관절 안쪽을 보충했다. 인사 동작은 팔을 든 채 손목·팔꿈치를 움직이고, 뛰기는 한쪽 무릎이 들릴 때 반대 팔이 앞으로 나오도록 했다. 착지할 때는 양발이 바닥에 닿은 상태로 무릎이 굽혀졌다가 펴진다. [원화와 제작 레시피](art/PROVENANCE.md) · [관절 수정 전후](evidence/joint-comparison.png)

## 다시 만들기

Pixel Asset Pipeline 0.6.0이 설치된 셸에서 이 프로젝트 폴더를 작업 경로로 사용한다. 아래 명령은 새 경로에만 출력한다.

```sh
pixel-asset motion --request art/motion.request.json --out rebuilt/motion
pixel-asset rive --request rebuilt/motion/rive-poses.json --out rebuilt/rive
```

`build/motion/inspection.json`은 원본·마스크·잘림·프레임별 연결 영역을 기록한다. 이 캐릭터는 `single_body:true`이며 손과 팔처럼 분리된 큰 조각이 생기면 Rive용 포즈 목록 생성을 막는다. 최종 74개 포즈는 작은 점까지 포함해 각각 한 개의 연결된 실루엣이다. `evidence/before`는 사용자가 부위 분리와 부자연스러운 움직임을 지적한 초기 결과다.

내보낸 파일에 모든 PNG와 타임라인, 상태 머신이 들어 있다. `Character` 아트보드의 `Character Actions` 상태 머신을 재생하고 Number 입력 `action`을 변경한다. 값은 대기 0, 걷기 1, 달리기 2, 공격 3, 점프 4, 피격 5, 손 흔들기 6, 환호 7이다. 포즈의 픽셀을 프레임으로 구운 방식이며 Rive Editor에서 개별 본을 조작하는 라이브 퍼펫은 제공하지 않는다. [파일·상태·길이·입력 해시](build/rive/rive.json) · [로컬 플레이어 실행 절차](../../release/rive-player/README.md)

## 실제 재생 검증

공식 Rive Canvas 2.49.4로 화면 버튼, 정지·재시작과 동작 전환을 검사한다. Canvas Advanced 2.49.4에서는 한 상태 머신 인스턴스의 입력을 바꿔 원본 크기로 그린 다음, 각 포즈 중간과 경계 전후의 실제 RGBA를 대응 PNG와 비교한다. `tools/verify_runtime.py`는 이 수치와 실제 렌더 프레임을 재현한다. 증거 JSON의 한계와 입력 파일 지문을 함께 확인한다. [프레임 검증](evidence/frame-proof.json) · [실제 재생 미리보기](evidence/runtime-preview.gif)

원화와 포즈의 시각적 자연스러움은 최종 사용자가 판단한다. 아트는 정면·약간 사선으로 서 있는 캐릭터의 제자리 보행과 조깅을 표현한다. 옆으로 이동하는 전력질주나 다른 방향의 작화는 이 결과에 포함하지 않았다.
