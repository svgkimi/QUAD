# 기본 50스테이지 개발·검증

> 이 문서는 2026-09-12 기본 50(v1)의 당시 기록입니다. 현재 룰 확장 v2의 구성·명령·검증은 [RULES50_V2.md](RULES50_V2.md), [RULES50_V2_SPEC.json](RULES50_V2_SPEC.json), `qa/rules50-v2-2026-09-13/`를 사용하세요. 아래 v1 시뮬레이션/리포트 명령은 현재 소스용이 아니며 보관 QA에 실행하지 마세요.

- 현재 소스: src/campaign/stages.ts. 독립 작업 명세: campaign-planning/BASIC50_SPEC.json.
- 정리 21개, 시간 내 정리 15개, 생존 4개, 로컬 AI 대전 10개. 5개 챕터, 최대 목표 난이도 4.0.
- 매 도전 새 시드, 피스별 7종 독립 추첨. 목표 맞춤 피스/고정 초반 순서 없음. 동일 종류 반복과 긴 미출현 가능.
- 무한 모드의 기존 7-bag·점수·회전·음악·입력 배치는 유지.
- 구버전 quad:campaign-30-v2 기록은 지우지 않음. 완전히 새 목표이므로 quad:campaign-basic50-v1에서 별도 진행.
- 정리 별은 배치 피스 수, 시간제한/AI는 완료 시간, 생존은 높이 12줄 이상인 누적 시간으로 평가. 1별로 다음 단계 해금.
- 특별 블록/동물 구출/반전/온라인 대전/상승 장애물은 추가하지 않음.

## 재현 명령

```sh
node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build
node -e "require('esbuild').buildSync({entryPoints:['scripts/verify-campaign50.ts'],bundle:true,platform:'node',format:'esm',outfile:'/tmp/quad50-simulation.mjs'})"
node /tmp/quad50-simulation.mjs
node scripts/report-campaign50.mjs
```

설치된 esbuild의 Node API를 사용한다. 새 패키지 설치는 필요 없다.

## 증거 경계

qa/basic50-2026-09-12의 DEVELOPER_SCENARIOS.md / USER_SCENARIOS.md / COMPARISON.md / simulation.json 참고.
자동 정책은 인간 참가자가 아니다. 성공률은 이 다섯 시드·정책에만 해당한다.
유효한 실패/capped를 성공으로 바꾸지 않는다. 모든 단계에 클리어 경로가 있어도 인간 난이도 4.0의 검증을 뜻하지 않는다.
역사적 30개 QA/RC1/RC2는 수정하지 않는다.

## 변경된 회귀의 이유

- 30→50, 보스 3→5, 목표/별/저장 키는 새 승인 계약으로 교체.
- 고정 순서 재시작 assertion은 같은 명시 시드 재현 + 다른 시드 새 순서 assertion으로 변경.
- 옛 생존 공략은 6초마다만 조작해 새 고속 중력에서 피스를 방치했다. 합법 클리어 경로 회귀는 NEXT 탐색·100ms 시간 간격으로 변경하며, 별도 현실 시간 정책 1,000판을 기록했다.
- 실제 UI의 옛 1번 이름을 새 3줄 제거로 변경. 완료/저장/해금/무한 모드 복귀 assertion 유지.
- src/engine와 tests/single-player만 npm test에서 수집. 옛 QA 증거는 기존 수집 경계대로 제외.

## Git 업로드

scripts/publish-verified.mjs는 이미 커밋된 HEAD만 별도 임시 폴더로 추출해 전체 테스트·타입 검사·빌드 후 codex/basic-50-stages로 push한다.
사용자 파일을 자동 add/commit하지 않으며 main/운영 배포는 하지 않는다. 검증 중 HEAD·브랜치·remote가 바뀌면 중단한다.
미커밋 사용자 자료는 검증·업로드에 포함되지 않는다. --check-only는 push 없이 커밋 스냅샷만 검사한다. 기존 node_modules를 연결하며 설치는 하지 않는다.
