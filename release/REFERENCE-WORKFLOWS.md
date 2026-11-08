# 픽셀 원화·이펙트·게임 로고 제작에 반영한 레퍼런스

2026-11-08. 첨부한 화면 네 장을 세 가지 제작 과제로 대조했다. 첨부 화면으로 원본 릴스의 설명 일부를 읽을 수 있었지만, 세 게시물의 전체 영상이나 확정적인 게시물 URL은 확보하지 못했다. 제품 문서와 스킬 원문에서 확인한 동작을 기준으로 구현했다.

## 사진 1·3 — 흐릿한 원화에서 움직이는 캐릭터까지

Polymation은 픽셀처럼 보이는 확대 그림을 1× 격자로 정리하고, 투명 배경의 정면 인물에서 실루엣에 맞춰 17개 본을 배치한다. 사람이 잘못 잡힌 관절을 옮기고, 휴지 자세·발 미끄러짐·새로 생긴 틈을 검토한다. 마지막에는 여러 동작을 프레임으로 구워 상태 머신이 선택하는 Rive 파일을 만들거나, 별도 live puppet으로 런타임에서 본과 옷을 제어한다. [격자 보정 원문](https://polymation.stunning.gg/docs/pixel-art-cleanup) · [리그·bake·live 원문](https://polymation.stunning.gg/docs/pixel-characters) · [공식 인터랙티브 예시](https://polymation.stunning.gg/try/)

사진의 **22,682색 → 36색**, 수동 조정 두 곳, **164KB**는 게시자가 한 캐릭터에서 보고한 값이다. 그 원화와 .riv 파일은 확보하지 못했다. 홈페이지의 세 번 무료 export는 상용 제품의 사용 조건이다. Rive의 MIT 런타임과 Polymation 바이너리의 라이선스는 별개다. Rive 자체 CLI는 RML 소스를 로컬 미리보기·검사에 사용할 수 있다. 계정이 필요한 export와 런타임 배포 조건도 별도로 설명한다. [Polymation 배포 라이선스](https://github.com/paradoxsyn/rivemcp-releases/blob/main/LICENSE) · [Polymation 약관](https://polymation.stunning.gg/terms) · [Rive CLI](https://rive.app/docs/cli/getting-started) · [Rive 런타임 라이선스](https://github.com/rive-app/rive-runtime/blob/main/LICENSE)

**로컬 적용.** `pixel-asset snap`은 원본 PNG·크롭·목표 격자를 받아 각 칸의 색을 샘플링하고, 알파 임계값과 팔레트를 적용한다. 원본·결과 색 수, 크기, SHA-256과 비교 그림을 보존한다. `motion`은 승인된 원본의 실제 픽셀을 명시한 마스크 또는 사각 부위에 배정한다. 부모 관절을 따라 포즈를 만들고, 손·발 같은 접점을 지정하면 기대 위치와 측정 위치의 오차를 확인할 수 있다. 사람이 팔레트·관절을 고칠 수 있도록 입력 JSON과 원본을 유지한다. 이 버전은 1× PNG·아틀라스와 Phaser 재생 경로를 납품한다. 정면에서 실루엣이 충분히 분리된 경우에는 `rig-draft`가 여섯 부위의 마스크와 이동 가능한 관절 초안을 제안한다. 붙어 있거나 모호한 실루엣·가려진 면의 작화·.riv 제작은 이 경로에서 지원하지 않는다. 실제로 다리 관절을 오른쪽으로 1px 옮기자, 한 걷기 프레임에서 지정 접점과의 오차가 0.635px에서 0.334px로 줄었다. [전후 측정](evidence/rig-nudge/comparison.json) · [관절 비교판](evidence/rig-nudge/joint-nudge.png) [snap 계약](../assets/.agents/skills/pixel-asset-pipeline/references/snap.md) · [motion 계약](../assets/.agents/skills/pixel-asset-pipeline/references/production.md#motion--승인된-원본의-로컬-관절-동작-제작)

## 사진 2 — 원래 GIF로 마법 타이밍 다시 만들기

화면 속 계정은 `zero_f_i_l_m`이다. 그림을 다시 그리지 않고 배경을 빼고 캐릭터 크기에 맞춘 뒤, 모으기·날아가기·맞기 순서로 재구성하는 지시가 보인다. 실제 계정의 원본 GIF나 제작 코드는 찾지 못했다. 독립적으로 구현할 때 중요한 차이는 GIF의 저장 프레임과 화면에 표시되는 프레임이다. GIF는 이전 픽셀을 유지하거나 배경·이전 상태로 복구할 수 있다. 먼저 표시 프레임으로 복원해야 프레임을 앞뒤로 옮겨도 잔상이 달라지지 않는다. Aseprite의 태그는 구간에 이름을 주며 게임의 충돌 시각은 별도로 정한다. [Pillow GIF 문서](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#gif) · [Aseprite 태그](https://www.aseprite.org/docs/tags/) · [pixelfx 원본](https://github.com/patch-gg/pixelfx)

**로컬 적용.** `pixel-asset effect-clip`에 GIF, 사용권 고지, 캐릭터 기준 크기와 단계별 원본 프레임 번호·길이를 준다. 투명도를 유지하거나 지정색 중 화면 가장자리와 연결된 부분만 지운다. 완전히 둘러싸인 동일색 디테일은 보존한다. 결과는 최근접 보간으로 축소한 시트, `charge/travel/impact` 태그, 피벗과 정확한 밀리초, 재생 GIF다. 복잡한 배경 분리는 지원하지 않는다. 게임 예제는 합성 시험용 GIF를 명시하고 원본 라이선스를 함께 둔다. [effect-clip 계약](../assets/.agents/skills/pixel-asset-pipeline/references/effect-clip.md) · [게임 예제](../examples/moonshot-fx/)

## 사진 4 — 편집 가능한 게임 심벌

단서와 가장 잘 맞는 원문은 Kaan Kızıltuğ의 `logo-design` 스킬이다. 브리프에서 여러 방향을 구상한 뒤 구조가 서로 다른 후보 세 개를 만들고, 작은 크기에서도 구별되는지 검토한다. 작성자는 이 과정을 직접 설명하고, 스킬은 SVG 제작·크기 검토 지침을 제공한다. 사진의 게시자·11월 6일의 별 6,116개는 별도로 확정하지 못했다. 스킬의 MIT 라이선스는 참고 라이브러리에 포함된 기존 브랜드 마크의 사용권을 부여하지 않는다. [작성자의 원문](https://kaankiziltug.com/blog/logo-design-skill-kaankiziltug) · [고정한 스킬 소스](https://github.com/kaankiziltug/logo-design-skill/blob/734090317a2155c5bf1ae8bd4cc85c6848a0128f/skills/logo-design/SKILL.md) · [실제 크기 검토 지침](https://github.com/kaankiziltug/logo-design-skill/blob/v1.4.5/skills/logo-design/references/testing-checklist.md) · [참고 마크의 권리 구분](https://github.com/kaankiziltug/logo-design-skill/blob/main/TRADEMARKS.md)

**로컬 적용.** ‘달빛 아래 첫 일격’의 달, 표적, 훈련 로봇을 출발점으로 독립적인 SVG 세 개를 작성했다. 스크립트·외부 이미지·폰트 없이 각 시안을 밝은 바탕과 어두운 바탕에서 16·32·128px로 실제 렌더했다. 16px에서 A는 달과 사선의 여백이 남고, B는 외부 링크 아이콘처럼 읽힐 수 있다. C는 로봇이지만 달과 일격의 느낌이 약하다. 게임에 사용할 후보는 아직 선택하지 않았다. [16·32·128px 비교판](../examples/first-strike/identity/decision-sheet.png) · [스튜디오 제작 절차](../studio/starter/identity/LOGO.md)

## 설치본으로 확인한 결과

| 검토한 항목 | 확인한 값과 증거 |
| --- | --- |
| 격자 보정 | 직접 만든 384×384 시험 PNG에서 알파가 0보다 큰 픽셀의 RGB 색은 3,579개였다. 지정한 영역을 40×40으로 변환한 결과는 16색·불투명 288픽셀이다. [소스·결과 비교판](../examples/moonshot-fx/evidence/final-sheet.png) · [계측값](../examples/moonshot-fx/production/snap/inspection.json) |
| 한 장의 리그 초안 | 분리된 정면 인물 원화에서 여섯 부위를 제안했다. 각 부위의 편집 가능한 마스크와 부모·관절이 있고 초안은 승인 대기 상태다. [실제 관절 오버레이](evidence/rig-draft/joint-preview.png) · [요청](evidence/rig-draft/rig-draft.request.json) |
| 모으기·비행·충돌 | ‘달빛 탄환’에서 공격을 누르면 FX가 시작된다. 충돌 단계 첫 프레임과 점수 판정은 240ms로 설정했고, 실제 첫 명중은 약 250ms에서 관찰했다. 원거리·등진 공격, 승리 직전·승리·재시작도 검사했다. [게임 열기](http://127.0.0.1:52983/) · [실제 플레이 기록](../examples/moonshot-fx/checks/browser-1385f1d7619b4ea98d4837761e8f16d4.json) |
| 수정 전후 손맛 | A/B의 첫 명중 시각은 각각 240·320ms다. 동일한 재생 시각 280ms에서 두 자세가 달라지고 각 버전을 플레이할 수 있다. 기술 통과만 기록했고 사람의 채택은 남겨 두었다. [KO 작업실](http://127.0.0.1:52980/?view=compare&lang=ko) · [日本語](http://127.0.0.1:52980/?view=compare&lang=ja) · [브라우저 계측](evidence/first-strike/compare-browser.json) |

## 후속 적용 — 한 장의 캐릭터에서 실제 Rive 재생까지

위 표의 Phaser 검증 이후에 Rive 내보내기와 공식 웹 플레이어를 추가했다. 솔바람 정찰대는 프레임을 구워 넣은 단일 파일이다. 초기 예제는 Rive 재생이 원본 PNG와 일치했는데도 공격·인사에서 팔다리가 분리되어 있었다. 원본의 연결 영역과 관절 안쪽을 고치고 지지발·반대 팔·착지 타이밍을 다시 만든 뒤, 수정본의 입력과 실제 재생을 다시 대조했다. 라이브 본 편집은 별도 범위다. [수정 전후 비교](../examples/rive-character/evidence/joint-comparison.png) · [Rive 플레이어](http://127.0.0.1:8876/?v=2feafcf7) · [최종 파일](../examples/rive-character/build/rive/character.riv)
