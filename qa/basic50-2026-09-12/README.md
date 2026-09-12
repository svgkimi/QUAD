# QUAD 기본 50 — 개발·검증 인계

## 구현

- 줄 제거 21개, 120초 타임어택 15개, 생존 4개, 로컬 AI 대전 10개. 5단위 라이벌, 10단위 보스.
- 기본 7종 블록만 사용. 스테이지는 매 시도 새 시드로 종류를 독립 추첨한다. 무한 모드는 기존 7-bag 유지.
- 목표 난이도 0.5~4.0/5. 일부 보스 뒤에는 완화 구간이 있다. 사람의 체감 별점은 아직 확정하지 않았다.
- 성과별 1~3별, 1별로 다음 단계 해금. 구 30단계 저장 키는 삭제하지 않고 새 50단계 진행 키로 분리.
- 기존 UI·입력·사운드·QA 수정은 보존했다. 네트워크 대전/원격 서버는 추가하거나 운영 변경하지 않았다.

## 읽는 순서

1. [개발자 시나리오](DEVELOPER_SCENARIOS.md): 50단계의 목표, 속도, 장애물, 예상 흐름.
2. [실행 기반 사용자 시나리오](USER_SCENARIOS.md): 자동 입력 정책에서 실제 관측한 결과. 사람의 플레이 기록은 아니다.
3. [엔진 대조](COMPARISON.md): 단계별 설계 계약과 1,000판 결과.
4. [iOS 시뮬레이터 대조](NATIVE_COMPARISON.md): 실제 WKWebView에서 확인한 목표·HUD·좌표·AI·정지와 캡처.

## 실제 실행 결과

- 수정 전 기준: 30개 테스트 파일, 1,123개 통과.
- 최종: 32개 파일, 1,174개 통과. 실패 0, skip 0. X-cross-callers의 5개는 제한된 caller-model characterization이며 실제 UI/기기 검사가 아니다. 결함 존재를 정상 결과로 요구하는 검사는 없다.
- 독립 커밋 스냅샷에서도 1,174개 통과, tsc --noEmit 및 Vite 웹 빌드 성공.
- 50단계 × 4정책 × 5시드 = 1,000판: 클리어 459, 정상 게임 실패 541, 관측 상한 도달 0, 규칙 위반 0.
- 무입력/단순 DROP 각 250판 모두 실패. 50단계 전부 빠른 정책의 합법 클리어 관측.
- AI전 72개 승리 사례는 모두 플레이어가 방해 줄을 보냈다.
- iOS 일반/QA 앱 Xcode 빌드 성공. 기본 393×759와 QA 축소 320×568에서 각 50단계, 총 100개 네이티브 UI 시나리오 통과. 설계와의 대조 불일치 0. 화면별 증거는 NATIVE_COMPARISON.md에 기록했다.
- 시뮬레이터 첫 부팅에서 Data Migration Failed/설치 시간 초과 발생. 새로 만든 QUAD 전용 기기만 재부팅해 해결. 사용자 기기 초기화·런타임 재설치 없음.

## 발견하고 수정한 문제

첫 시뮬레이터 검사에서 10/12/13/15/23/25단계의 진입 직후 캔버스 높이가 일시적으로 패드 영역까지 침범했다.
부모 영역 측정이 일반 effect 뒤에 실행되던 것이 원인이다.
GameBoard의 크기 측정을 useLayoutEffect로 옮겨 첫 페인트 전에 계산하며, QA 검사에 게임판-버튼 교차 판정을 추가했다.
초기 검사는 좌우 잘림만 검사해 이 문제를 통과시켰으므로 그 로그를 최종 통과 증거로 쓰지 않는다.

## 재현

```sh
node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build
node -e "require('esbuild').buildSync({entryPoints:['scripts/verify-campaign50.ts'],bundle:true,platform:'node',format:'esm',outfile:'/tmp/quad50-simulation.mjs'})"
node /tmp/quad50-simulation.mjs
node scripts/report-campaign50.mjs
node scripts/build-native50.mjs
# 빌드가 출력한 BUILD_ROOT와 본인의 booted Simulator UDID를 사용
node scripts/run-native50.mjs BUILD_ROOT DEVICE_ID
node scripts/run-native50.mjs BUILD_ROOT DEVICE_ID --compact
node scripts/report-native50.mjs BUILD_ROOT
```

설치된 도구만 사용한다. QA 호스트의 전체 해금/자동 클릭은 일반 테스트 앱에 포함되지 않는다.
시뮬레이터 검사는 모든 단계의 진입과 화면 흐름 검사이며, 시뮬레이터에서 사람이 50판을 직접 클리어한 것으로 해석하면 안 된다.

## Git와 검증 경계

- 개발 브랜치: codex/basic-50-stages. 기존 미커밋 소스 중 현재 게임에 필요한 변경을 보존하여 함께 커밋했다.
- 개인 자료, 실제 .env 값, 로컬 Toss appName/호스트 변경, node_modules, 과거 QA/RC, 앱 심사 자료는 커밋에 넣지 않는다.
- scripts/publish-verified.mjs는 커밋된 HEAD만 임시 폴더로 추출해 검사 후 개발 브랜치에 non-force push한다. --check-only는 전송하지 않는다.
- 시간당 향후 자동 push 예약은 보안 검토에서 거절되어 활성화되지 않았다. 저장소/브랜치/반복 주기의 사용자 승인이 필요하다.
- main/운영 배포는 하지 않는다. 원격 서버 폐기도 하지 않는다.

## 최종 판정

기능·목표 계약은 자동 검사 범위에서 일치한다. 출시 승인이나 사람의 난이도 검증 완료 판정은 아니다.
0.5~4.0 체감 난이도, 실제 손가락의 오입력/햅틱, iPhone·Android 실기기, VoiceOver/TalkBack,
장시간 플레이·배터리·백그라운드/잠금 복귀, Toss 실제 호스트·콘솔 appName·앱 심사/등급/법률은 별도 확인이 필요하다.
5시드 성공률을 일반 사용자 성공률로 사용하지 않는다.
