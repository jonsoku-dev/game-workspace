# 유리종탑 · 메아리의 서약

Game Studio 0.14.1 설치본의 `starter/combat-brief/choir.json`으로 생성한 독립 게임. 공명기사는 18개 자세와 황동 음파의 GIF 클립을 쓴다. 별도 원화와 팔레트를 갖는 두 직업의 소스, 최초 납품, Rive·액션 세트·입력 증거가 이 프로젝트에 있다.

```sh
python3 -m http.server 41743 --bind 127.0.0.1 --directory play/first
```

[플레이](http://127.0.0.1:41743/). 방향키 이동, Shift 질주, E 도약, J/K 약·강공격, Space 회피, L 받아치기. 조준할 지점을 클릭할 수도 있다. 지면 충격은 도약으로 넘고, 다음 쇄도는 회피하거나 타이밍에 맞춰 받아친다.

[원속도 동작 검토](reviews/knight/review.html) · [Rive 플레이어](reviews/knight/character/bundle/player.html) · [접촉 시각](reviews/knight/timing.json). 검증 경로는 [프로젝트 그래프](.game-studio)와 [브라우저 결과](evidence/contact.json)에 기록했다.
