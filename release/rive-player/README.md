# 솔바람 정찰대 · Rive 플레이어

이 폴더의 `hero.riv`를 공식 Rive Canvas 런타임으로 재생합니다. 인터넷 연결 없이 사용할 수 있으며 로컬 HTTP 서버가 필요합니다.

```sh
python3 -m http.server 8765 --directory release/rive-player
```

브라우저에서 <http://localhost:8765>를 엽니다. `file://`로 직접 열면 브라우저의 파일 접근 제한 때문에 로드되지 않을 수 있습니다.

계약: artboard `Character`, state machine `Character Actions`, Number input `action`. 값은 대기 0, 걷기 1, 달리기 2, 공격 3, 점프 4, 피격 5, 손 흔들기 6, 환호 7입니다. 동작은 Rive 내부 상태 머신이 처리합니다. 다시 보기는 공식 `reset()`을 호출하고 선택 입력을 복원합니다. 일시 정지는 공식 `pause()`입니다. 운영체제의 동작 줄이기 설정에서는 처음에 정지합니다. 캔버스는 아트보드의 원본 해상도로 렌더링하고 화면에 맞는 최대 정수 배율(최대 640px)로 확대합니다. CSS `image-rendering: pixelated`로 픽셀 경계를 유지합니다.

## 고정 런타임

- npm: [`@rive-app/canvas@2.49.4`](https://www.npmjs.com/package/@rive-app/canvas/v/2.49.4)
- 원본 패키지: <https://registry.npmjs.org/@rive-app/canvas/-/canvas-2.49.4.tgz>
- npm integrity: `sha512-OKLYG3ICmiJBRmdTMbfG2w4DBJR8GSj+Wbuwg6zIHeXOmZ1jhXSwIWCrXxhvnE5uV5M6el5LYduWKT4GSysYYw==`
- 공식 소스: <https://github.com/rive-app/rive-wasm>
- 라이선스: `vendor/LICENSE` (MIT, 공식 소스 저장소에서 복사)

`vendor/rive.js`, `rive.wasm`, `rive_fallback.wasm`, `package.json`은 고정 npm 패키지의 원본입니다. 두 WASM 경로를 모두 로컬 파일로 설정하고 Rive Asset CDN을 끕니다. 캐릭터 파일도 자체 포함된 파일이어야 합니다.
