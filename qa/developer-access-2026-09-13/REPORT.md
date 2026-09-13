# 개발자 전용 전체 단계 연습 — 2026-09-13

## 결과

개인 밸런스 확인용 `QUAD Dev`를 별도 빌드/앱 ID로 구현. 50개 전체 단계에 진입 가능하며 진행 기록을 읽거나 저장하지 않는다. 정상적인 별 평가는 결과 화면에서만 확인한다. 일반 앱의 순차 해금 및 저장 규칙은 유지했다. 계정 인증 기능이 아니므로 개발자 파일을 타인에게 공유하면 타인도 연습할 수 있다.

이번 변경으로 게임 규칙·AI·난이도·블록·사운드는 바꾸지 않았다. 기존 작업 중인 변경사항, 과거 QA/프리뷰와 `granite.config.ts`는 보존했다. 커밋·푸시·운영 배포는 하지 않았다.

## 구현 경계

- `src/campaign/access.ts`: 빌드 상수 및 유효한 1~50 단계의 시작 허용 판정.
- `vite.config.ts`, `vite.standalone.config.ts`: 개발자 권한 항상 false.
- `vite.developer.config.ts`: 명시적인 별도 설정으로만 true, 출력 `dist-developer`.
- `SinglePlayerApp.tsx`: 실제 시작 가드, 진행 저장 차단, 연습 결과 및 다음 단계. 50단계만 깨고 전체 완료로 표시하지 않는다.
- `StageSelect.tsx`, `TitleScreen.tsx`: 개발자 연습 식별, 전 단계 선택, 가짜 완료/별 미부여.
- `build-native50.mjs`, `run-native50.mjs`: `--developer`로 분리된 앱/QA ID, 기존 일반 모드는 유지.
- `package-developer50.mjs`: 사용자용 개발자 앱과 HTML만 묶는다. 자동 검사 코드 미포함.
- `.gitignore`, `tsconfig.json`, `src/vite-env.d.ts`: 전용 빌드 출력 제외와 타입 검사.

React 점검 기준에 따라 잠금 여부를 별도 state/effect로 복제하지 않고 공통 순수 함수로 계산했다. 전체 흐름 검증은 선택 UI뿐 아니라 실제 엔진 시작·재시작·클리어·기록까지 확인했다.

## 실행한 검사

| 검사 | 최종 결과 |
|---|---|
| `node node_modules/typescript/bin/tsc --noEmit` | 통과 |
| `node node_modules/vitest/vitest.mjs run` | 35 파일, 1,381 통과, 실패/skip 0 |
| `node node_modules/vite/bin/vite.js build` | 일반 웹 빌드 통과 |
| `node node_modules/vite/bin/vite.js build --config vite.developer.config.ts` | 개발자 단일 HTML 통과, 네이티브에 포함된 HTML과 `cmp` 일치 |
| `node scripts/build-native50.mjs --developer` | 개발자 사용자용/QA Simulator 빌드 성공 |
| `node scripts/build-native50.mjs qa/developer-access-2026-09-13/native-release-locks.js` | 일반 사용자용/QA Simulator 빌드 성공 |
| `git diff --check` 및 수정 JS 스크립트 `node --check` | 통과 |

기존 1,317개에서 64개 추가: 접근 경계 58, 메뉴 1, 실제 앱/엔진 흐름 5. 기존 검사는 삭제하지 않았다. 초기 검사에서 설치된 Vitest에 없는 matcher와 Vite 설정 타입 오류를 발견해 수정했고, 위 결과는 수정 후 전체 재실행 결과다. 전체 suite에 포함된 무작위 속성 검사 1,000판은 밸런스/고레벨 장기 플레이 검증이 아니다.

## Simulator 검증

- Xcode 26.6 / iOS 26.5 (23F77), iPhone 16 Simulator.
- 대상: `QUAD Basic50 QA` / `95B30CB4-4355-4E6F-BB51-50DC8534A662`.
- 기본 WKWebView 393×759와 동일 Simulator 안의 제한된 320×568 WKWebView. 서로 다른 실기기 2종 테스트가 아니다.
- 개발자 앱: `dev.quad.preview.basic50dev`, 자동 QA: `dev.quad.preview.basic50devqa`.
- 일반 대조 QA: `dev.quad.preview.basic50qa`.

두 viewport에서 각각 확인:

1. 저장값이 완료 2단계여도 50개 모두 선택 가능, 전 단계 완료로 위장하지 않음.
2. 50·30단계 실제 시작, AI 보드 변화, 일시정지 후 재시작 정상.
3. 보드 좌표: 393×759에서 `(52,54,289,578)`, 320×568에서 `(60.5,54,199,398)` — 잘림 없음.
4. 건너뛴 12단계를 실제 키 이벤트로 클리어 → 이번 연습 3별 → 13단계 진입.
5. 기존 진행 저장 문자열이 시작·재시작·클리어·다음 단계 후에도 완전히 동일.
6. 일반 대조 앱에서는 임의 developer 저장소 값을 추가해도 1단계만 열리고 49단계가 잠겨 있음.

12단계 클리어 시드는 QA 호스트에만 잠깐 고정했다. 사용자용 개발자 앱은 자동 입력/시드 조작이 없는 기존 무작위 순서 그대로다. 320×568 결과 창의 하단 선택지는 기존 모달처럼 스크롤해 접근한다.

실행: `node scripts/run-native50.mjs BUILD_ROOT DEVICE --developer`, 같은 명령에 `--compact`, 일반 대조는 normal BUILD_ROOT에 추가 플래그 없이 실행. 정확한 이벤트와 화면은 이 폴더의 JSON 및 screenshots/normal-control 하위 폴더에 보존했다.

## 산출물과 한계

`final/QUAD-DEV-STAGES-2026-09-13/`: README, HTML, Simulator 앱 ZIP, BUILD_MANIFEST.

웹 SHA-256: `2ba478b5a6d4d976c1f905e587d1ac34ab08d09c3851e5dd451046c9d9dec6e1`.

실기기 iPhone 설치용 서명/IPA, Android, Toss 실제 호스트 검사는 이번 작업에서 하지 않았다. 소리·햅틱의 실기기 체감과 후반 라운드의 사람 기준 난이도는 별도 플레이 평가 대상이다. 사용자용 `QUAD Dev`는 자동 QA 앱과 별개로 설치/실행했다.
