import { readFileSync, writeFileSync } from "node:fs";
const out = "qa/rules50-v2-2026-09-13";
const result = JSON.parse(readFileSync(out + "/simulation.json", "utf8"));
const specs = JSON.parse(readFileSync(out + "/developer-scenarios.json", "utf8"));
let developer = "# 룰 확장 v2 — 단계별 개발 시나리오\n\n별점은 200단계 공통 척도의 목표치이며 사람의 체감 검증 결과가 아니다. 별도의 구현안 RULES50_V2_SPEC.json과 소스를 비교했다.\n\n";
let user = "# 룰 확장 v2 — 실행 기반 플레이 시나리오\n\n실제 사용자 인터뷰가 아닌 자동 정책 관측이다. 느린 정책: 판단700ms/입력90ms. 빠른 정책: 판단120ms/입력35ms·NEXT 탐색. 50ms 시간 단위로 입력은 올림 처리한다. HOLD·사람의 실수·목표별 전략은 모델링하지 않는다. 하나의 성공 사례로 모든 랜덤 시드의 해결 가능성을 보증하지 않는다.\n\n";
let table = "# 룰 확장 v2 — 50단계 구성표\n\n난이도는 ★0.5~4.0/5의 목표치. 3별은 해금 조건이 아니며 1별 클리어로 다음 단계에 진행한다. 목표블록은 기존 블록 위의 ◇표시이며 특수 능력이 아니다. 5단위 중간 AI, 10단위 보스. 실제 수치의 사람 검증은 미완료.\n\n| 단계 | 목표 | 난이도 / 5 | 준비 줄 | 제한/생존 | 2별 | 3별 |\n|---|---|---|---|---|---|---|\n";
for (const s of specs) {
  const layers = s.layers.reduce((n, l) => n + l.rows, 0);
  table += `| ${s.id} | ${s.goal} | ★${s.difficulty.toFixed(1)} | ${layers} | ${(s.limitMs ?? s.surviveMs) / 1000}초 | ${s.stars[1]} | ${s.stars[2]} |\n`;
  developer += `## ${s.id} — ${s.goal}\n\n- 목표 난이도 ★${s.difficulty.toFixed(1)}/5; 중력 ${s.gravityMs}ms/칸; 시작 장애물 ${layers}줄.${s.aiMoveMs ? ` AI 배치 ${s.aiMoveMs}ms, AI 시작 방해 ${s.aiHandicapRows}줄.` : ""}\n- ${s.developerScenario}\n- 별: ${s.stars.join(" / ")}. 종료 전 별 지급 금지; 재시도에 새 피스 순서; 조건창 열림 중 시간·AI 정지.\n- 승리 검증: ${s.targetCells.length ? "표시 목표 칸이 모두 실제로 삭제됨. 다른 줄만 지워서는 클리어되지 않음." : s.kind === "mission" ? "한 번의 고정에서 목표 줄 이상 삭제. 별개의 줄 제거를 합산하지 않음." : s.kind === "survival" ? "생존 시간까지 topout 없음. 생존 별은 줄 제거 성과." : s.kind === "duel" ? "상대 실제 보드가 넘쳐 gameover. 단순 전송량 달성으로 이기지 않음." : "시간 안에 목표 줄 수 도달."}\n\n`;
  const entries = result.rows.filter(r => r.stage === s.id);
  const win = entries.find(r => r.profile === "fast-agent" && r.outcome === "cleared");
  const slower = entries.find(r => r.profile === "steady-agent" && r.outcome !== "cleared") ?? entries.find(r => r.profile === "steady-agent");
  const sample = r => `시드 ${r.seed}, ${(r.elapsedMs / 1000).toFixed(2)}초, ${r.outcome}(${r.reason}), ${r.pieces}개 배치·${r.lines}줄 제거·${r.stars}별. 남은 목표 ${r.remainingTargets}개, 한 번에 최대 ${r.bestClear}줄, 공격 ${r.sent}/피격 ${r.received}줄.`;
  user += `## ${s.id} — ${s.goal}\n\n- 빠른 정책 성공 사례: ${win ? sample(win) : "없음: 실패/상한 결과를 성공으로 보정하지 않음."}\n- 느린 정책 사례: ${sample(slower)}\n- 실행 중 관측: ${JSON.stringify((win ?? slower).samples.slice(-3))}\n- 일치 판정: ${result.summary.find(row => row.stage === s.id).contract}. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.\n\n`;
}
writeFileSync(out + "/DEVELOPER_SCENARIOS.md", developer);
writeFileSync(out + "/USER_SCENARIOS.md", user);
writeFileSync(out + "/STAGE_TABLE.md", table);
const paired = [];
for (const variant of ["previous-parameters", "candidate"]) for (const profile of ["slow-agent", "steady-agent", "fast-agent"]) {
  const rows = result.paired.filter(r => r.variant === variant && r.profile === profile);
  const wins = rows.filter(r => r.outcome === "cleared");
  paired.push({ variant, profile, wins: wins.length, total: rows.length, timeouts: rows.filter(r => r.reason === "timeout").length,
    meanReceived: rows.reduce((n, r) => n + r.received, 0) / rows.length, meanDurationSec: rows.reduce((n, r) => n + r.elapsedMs, 0) / rows.length / 1000 });
}
writeFileSync(out + "/stage5-summary.json", JSON.stringify(paired, null, 2));
console.log("Wrote 50 developer scenarios, 50 observed-policy scenarios, stage table and paired summary.");
