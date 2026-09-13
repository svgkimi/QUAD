# QUAD — 기본 50 룰 확장 v2

상태: 로컬 플레이테스트 후보. 체감 난이도와 출시 적합성을 확정한 버전은 아님.

## 이번 구현

- 생존 / 로컬 AI 대전 / 타임어택 / 단일 미션으로 정리. 타임어택의 목표만 줄 제거 또는 ◇ 목표 블록으로 구분한다.
- 구성: 줄 제거 타임어택 18, 목표 블록 16, 단일 미션 2, 생존 4, 대전 10. 모든 판은 시간 경계가 있다. 생존은 목표 시간, 나머지는 제한 시간이다.
- 3번은 한 번에 2줄, 12번은 한 번에 4줄. 나누어 지우면 달성되지 않는다. 통로를 옆에 두어 중앙 DROP 반복으로 끝나지 않게 한다. 실제 피스 순서는 미션에서도 랜덤이다.
- 목표 블록은 일반 블록 위의 ◇표시다. 블록을 포함한 줄이 사라지면 목표도 사라지고, 아래 줄이 지워지면 목표 위치가 함께 내려온다. 다른 줄만 지워서는 목표 수가 줄지 않는다. 넓은 네 칸 통로를 좌우로 옮겨 중앙 DROP만으로 준비 줄이 정리되는 경우를 막는다.
- 생존은 14/23/33/43번의 60/75/80/90초. 초반에 무입력으로 시간을 보내는 스테이지를 만들지 않는다. 기존 고속 생존 중력은 유지한다.
- 5/15/25/35/45번은 중간 대전, 10/20/30/40/50번은 보스. 보스는 더 빠른 배치와 NEXT 탐색을 사용한다. 온라인 접속/서버는 없다.
- UI: 장식적인 스테이지 부제 제거, 2줄 HUD에 모드·목표·남은 시간 표시. 별 조건을 시작·일시정지·결과에서 공유. HUD의 작은 별은 ‘지금 클리어할 경우’의 예상치이지 이미 획득한 별이 아니다.
- 별: 1별은 클리어, 2/3별은 완료 시간. 생존만 목표 시간까지 생존하면서 지운 줄 수로 평가한다. 1별이면 다음 단계 해금. 획득 별과 난이도 ★0.5~4.0/5는 다른 척도다.

## 대전 규칙

과거 Git `dc550de64083457c9feb7c17c63b551b8ad849e9`의 공격 정책을 참고하되 과거 첫 4줄 B2B 버그는 이식하지 않았다.

| 한 번에 제거 | 기본 전송 줄 |
|---|---|
| 1줄 | 0 |
| 2줄 | 1 |
| 3줄 | 2 |
| 4줄 | 4 |

T-Spin 1/2/3줄은 2/4/6, 줄을 지운 미니는 1. 콤보 2/4/6 이상에 +1/+2/+3. 이전 고정까지 어려운 줄 제거가 이어진 경우 B2B +1. 빈 고정은 공격0. 첫 4줄은 B2B가 아니므로 기본4줄이다. 같은 규칙을 플레이어/AI 양쪽에 적용한다.

한 번의 최대 조합 공격10줄도 실제10줄 적용한다. 상쇄/대기열/방어 스킬/점수 승리는 추가하지 않았다. AI가 진짜 넘쳐야 승리한다. 무한 모드 점수·B2B·콤보·회전·난수 정책은 수정하지 않았다.

5번 조정: 배치 1.8초→3.2초, 실수 후보 주기 5→3, AI 시작 방해3줄. ‘실수’는 같은 보드를 만드는 중복 회전이 아니라 다른 합법 배치를 선택한다. 인간처럼 실수한다는 보장은 아니다. 비교 결과와 한계는 [플레이어 관점 분석](PLAYER_DIRECTION_V2.md) 참고.

## 전체 구성과 검사 자료

- 별도 구현안: [RULES50_V2_SPEC.json](RULES50_V2_SPEC.json). 수치별 사용자 승인이나 실측 난이도를 뜻하지 않는다.
- [50단계 표](../qa/rules50-v2-2026-09-13/STAGE_TABLE.md)
- [개발자 시나리오](../qa/rules50-v2-2026-09-13/DEVELOPER_SCENARIOS.md) / [자동 플레이 기반 시나리오](../qa/rules50-v2-2026-09-13/USER_SCENARIOS.md)
- [개발/실행 비교](../qa/rules50-v2-2026-09-13/COMPARISON.md) / [최종 검증 기록](../qa/rules50-v2-2026-09-13/REPORT.md)

## 보존과 제외

기존 로고·배경·블록 색·음악·보드/패드 배치·무한 모드는 유지한다. 기존 `quad:campaign-basic50-v1`의 클리어와 별은 삭제하지 않는다. 이미 해금한 사용자는 그대로 진행하며, 과거 별은 새 목표를 달성했다는 증거가 아니다. 새 점수가 더 낮다고 기존 별을 낮추지 않는다. 과거 QA/RC는 보관한다.

특수 블록, 동물 구출, 좌우 반전, 움직이는 벽, 증강, 상점, 재화, 온라인 대전, 광고, 결제는 이번 구현에 없다. `ai-planner`/새 Toss appName이나 외부 서버 설정을 바꾸지 않았다. 커밋·푸시·배포는 하지 않는다.

## 재현

```sh
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run
node --input-type=module -e 'import {build} from "esbuild"; import {mkdtempSync} from "node:fs"; import {tmpdir} from "node:os"; import {join} from "node:path"; import {spawnSync} from "node:child_process"; const folder=mkdtempSync(join(tmpdir(),"quad-rules50-")); const file=join(folder,"verify.cjs"); await build({entryPoints:["scripts/verify-rules50.ts"],outfile:file,bundle:true,platform:"node",format:"cjs"}); const result=spawnSync(process.execPath,[file],{stdio:"inherit"}); process.exitCode=result.status??1;'
node scripts/report-rules50.mjs
node scripts/build-native50.mjs qa/rules50-v2-2026-09-13/native-ui.js
# 위 BUILT=에 출력된 빌드 경로와 대상 시뮬레이터 ID를 사용한다.
node scripts/run-native50.mjs BUILD_ROOT DEVICE_ID
node scripts/run-native50.mjs BUILD_ROOT DEVICE_ID --compact
```

BUILD_ROOT와 DEVICE_ID는 자리표시자다. 설치되어 있는 도구만 사용하며 새 패키지를 설치할 필요는 없다.
