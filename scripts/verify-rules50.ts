import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { STAGES, makeStageBoard, stageGoal, type StageDefinition } from "../src/campaign/stages";
import { createInitialState, type EngineAction } from "../src/engine";
import { getCampaignRun, reduceCampaign } from "../src/campaign/session";
import { chooseOpponentActions } from "../src/campaign/opponent";
import { earnedStageStars, starRequirements } from "../src/campaign/stars";
import { stackHeight } from "../src/campaign/garbage";
import specification from "../campaign-planning/RULES50_V2_SPEC.json";

interface Profile { name: string; thinkMs: number; actionMs: number; lookahead: boolean }
const seeds = [11, 42, 123, 2026, 50001];
const profiles: readonly Profile[] = [
  { name: "idle", thinkMs: Infinity, actionMs: Infinity, lookahead: false },
  { name: "drop-only", thinkMs: 600, actionMs: 50, lookahead: false },
  { name: "steady-agent", thinkMs: 700, actionMs: 90, lookahead: false },
  { name: "fast-agent", thinkMs: 120, actionMs: 35, lookahead: true },
];
const violations: string[] = [], started = performance.now();

/** 입력: 단계·자동 정책·재현 시드 / 출력: 중력과 조작 시간을 모두 적용한 관측. 인간 실험이 아니다. */
function simulate(stage: StageDefinition, profile: Profile, seed: number) {
  let state = reduceCampaign(createInitialState({ seed }), { type: "START", seed }, stage);
  const startSignature = [state.active?.type, ...state.pieceQueue].join("");
  let nextActionAt = profile.thinkMs, plan: readonly EngineAction[] = [], index = 0, actions = 0, maxHeight = 0;
  const samples: object[] = [];
  for (let ms = 0; ms < 240000 && getCampaignRun(state)!.outcome === "playing"; ms += 50) {
    if (ms >= nextActionAt) {
      if (!plan.length) { plan = profile.name === "drop-only" ? [{ type: "HARD_DROP" }] : chooseOpponentActions(state, profile.lookahead); index = 0; }
      const action = plan[index++];
      if (action) { state = reduceCampaign(state, action, stage); actions++; }
      if (index >= plan.length) { plan = []; nextActionAt = ms + profile.thinkMs; }
      else nextActionAt = ms + profile.actionMs;
    }
    const before = state.lastScoreEvent;
    state = reduceCampaign(state, { type: "TICK", deltaMs: 50 }, stage);
    if (before !== state.lastScoreEvent) { plan = []; nextActionAt = ms + profile.thinkMs; }
    maxHeight = Math.max(maxHeight, stackHeight(state));
    const current = getCampaignRun(state)!;
    if (ms % 10000 === 0) samples.push({ atMs: current.elapsedMs, lines: state.totalLinesCleared, height: stackHeight(state), sent: current.sent, received: current.received, remainingTargets: current.targetCells.length, bestClear: current.bestClear });
  }
  const run = getCampaignRun(state)!;
  const goalMet = stage.kind === "duel" ? run.ai?.status === "gameover"
    : stage.kind === "survival" ? run.elapsedMs === stage.surviveMs
    : stage.kind === "mission" ? run.bestClear >= stage.target
    : stage.targetCells ? run.targetCells.length === 0 : state.totalLinesCleared >= stage.target;
  if (run.outcome === "cleared" && (!goalMet || state.status !== "paused")) violations.push(`stage ${stage.id} ${profile.name} invalid clear`);
  if (run.reason === "timeout" && run.elapsedMs !== stage.limitMs) violations.push(`stage ${stage.id} invalid timeout`);
  if (stage.kind !== "duel" && !stage.pressureMs && run.received !== 0) violations.push(`stage ${stage.id} unexpected pressure`);
  if (run.outcome !== "playing" && reduceCampaign(state, { type: "TICK", deltaMs: 99999 }, stage) !== state) violations.push(`stage ${stage.id} terminal state changed`);
  return { stage: stage.id, profile: profile.name, seed, startSignature, outcome: run.outcome === "playing" ? "capped" : run.outcome,
    reason: run.reason ?? "240s-observation-cap", elapsedMs: run.elapsedMs, lines: state.totalLinesCleared,
    pieces: run.piecesUsed, maxHeight, sent: run.sent, received: run.received, aiLines: run.ai?.totalLinesCleared ?? null,
    remainingTargets: run.targetCells.length, bestClear: run.bestClear, stars: earnedStageStars(stage, state), actions, samples };
}

const rows: ReturnType<typeof simulate>[] = [], intended: object[] = [];
for (const stage of STAGES) {
  const expected = specification.stages.find(row => row[0] === stage.id);
  const goal = stage.targetCells ? "targets" : stage.kind === "timed" ? "lines" : stage.kind;
  const actual = [stage.id, goal, stage.kind === "survival" ? stage.surviveMs! / 1000 : stage.target, stage.difficulty, stage.layers.reduce((sum, l) => sum + l.rows, 0), (stage.limitMs ?? stage.surviveMs)! / 1000];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) violations.push(`stage ${stage.id} differs from v2 candidate specification`);
  const base = reduceCampaign(createInitialState({ seed: 42 }), { type: "START", seed: 42 }, stage);
  const paused = reduceCampaign(base, { type: "PAUSE" }, stage);
  if (JSON.stringify(reduceCampaign(paused, { type: "TICK", deltaMs: 99999 }, stage)) !== JSON.stringify(paused)) violations.push(`stage ${stage.id} pause not frozen`);
  if (JSON.stringify(reduceCampaign(base, { type: "RESTART", seed: 42 }, stage)) !== JSON.stringify(base)) violations.push(`stage ${stage.id} replay impure`);
  if (JSON.stringify(reduceCampaign(base, { type: "RESTART", seed: 43 }, stage).pieceQueue) === JSON.stringify(base.pieceQueue)) violations.push(`stage ${stage.id} fixed retry sequence`);
  if (stage.sequence.length || base.randomizer !== "independent") violations.push(`stage ${stage.id} not independent random`);
  if (makeStageBoard(stage).some(row => row.every(Boolean))) violations.push(`stage ${stage.id} starts with completed row`);
  intended.push({ id: stage.id, kind: stage.kind, goal: stageGoal(stage), target: stage.target, targetCells: stage.targetCells ?? [],
    difficulty: stage.difficulty, gravityMs: stage.gravityMs, limitMs: stage.limitMs ?? null, surviveMs: stage.surviveMs ?? null,
    layers: stage.layers, aiMoveMs: stage.aiMoveMs ?? null, aiHandicapRows: stage.aiHandicapRows ?? null, stars: starRequirements(stage),
    developerScenario: "선택 → 목표·별 확인 → 새 랜덤 순서 시작 → 해당 목표 달성 → 결과·별 저장·다음 단계. 도중 목표를 누르면 정지하여 조건 확인, 계속하기로 재개. 제한 시간 소진/보드 넘침은 실패." });
  for (const profile of profiles) for (const seed of seeds) rows.push(simulate(stage, profile, seed));
  console.log(`Stage ${stage.id}/50: ${rows.filter(r => r.stage === stage.id && r.outcome === "cleared").length}/20 cleared`);
}
const summary = STAGES.map(stage => {
  const observed = rows.filter(r => r.stage === stage.id), issues: string[] = [];
  if (observed.some(r => r.profile === "idle" && r.outcome === "cleared")) issues.push("무입력 클리어 관측");
  if (observed.some(r => r.profile === "drop-only" && r.outcome === "cleared")) issues.push("DROP 반복 클리어 관측");
  if (!observed.some(r => r.profile === "fast-agent" && r.outcome === "cleared")) issues.push("시간 적용 빠른 정책의 클리어 증거 없음; 합법 액션 witness/인간 재검증과 구분");
  return { stage: stage.id, contract: violations.some(v => v.startsWith(`stage ${stage.id} `)) ? "FAIL" : "PASS", profiles: Object.fromEntries(profiles.map(p => [p.name, { cleared: observed.filter(r => r.profile === p.name && r.outcome === "cleared").length, total: seeds.length }])), issues, humanDifficulty: "UNCONFIRMED" };
});

// 같은 새 공격 규칙·시드·조작 정책에서 AI 매개변수만 비교한다. 과거 출시본 전체와의 A/B로 오인하지 않는다.
const stage5 = STAGES[4], paired: object[] = [];
const pairProfiles = [{ name: "slow-agent", thinkMs: 1500, actionMs: 120, lookahead: false }, ...profiles.slice(2)];
for (const variant of ["previous-parameters", "candidate"] as const) {
  const stage = variant === "candidate" ? stage5 : { ...stage5, aiMoveMs: 1800, aiMistakeEvery: 5, aiHandicapRows: 0 };
  for (const profile of pairProfiles) for (let i = 0; i < 30; i++) paired.push({ variant, ...simulate(stage, profile, 11 + i * 37) });
  console.log("Stage5 paired complete: " + variant);
}
const out = "qa/rules50-v2-2026-09-13";
mkdirSync(out, { recursive: true });
const hash = createHash("sha256");
for (const file of ["src/campaign/stages.ts", "src/campaign/session.ts", "src/campaign/opponent.ts", "src/campaign/stars.ts", "src/campaign/attack.ts", "src/campaign/targets.ts", "src/campaign/garbage.ts", "src/engine/gameEngine.ts", "src/engine/bag.ts"]) hash.update(readFileSync(file));
const result = { sourceHash: hash.digest("hex"), seeds, stepMs: 50, observationCapMs: 240000, profileNote: "Automated policies, NOT human players. Greedy line-clearing agent does not understand one-lock missions; fixed-seed legal witnesses are checked separately. Action latency rounded up to 50ms. No HOLD or touch mistakes modeled.", executed: rows.length, pairedExecuted: paired.length, elapsedMs: performance.now() - started, violations, summary, rows, paired };
writeFileSync(out + "/simulation.json", JSON.stringify(result, null, 2));
writeFileSync(out + "/developer-scenarios.json", JSON.stringify(intended, null, 2));
const table = summary.map(s => `| ${s.stage} | ${s.contract} | ${s.profiles.idle.cleared}/5 | ${s.profiles["drop-only"].cleared}/5 | ${s.profiles["steady-agent"].cleared}/5 | ${s.profiles["fast-agent"].cleared}/5 | ${s.issues.join("; ") || "관측 범위 내 특이사항 없음"} |`).join("\n");
writeFileSync(out + "/COMPARISON.md", `# 룰 확장 v2 개발/실행 비교\n\n규칙 SHA-256: ${result.sourceHash}\n\n50단계 × 4정책 × 5시드 = ${rows.length}판. 5단계 매개변수 비교 ${paired.length}판은 별도. 실제 인간 실험이 아니다. 한 판 240초 상한, 50ms 단위. capped는 실패로 환산하지 않는다. 자동 정책의 목표 판단과 실제 승리 조건을 비교하며, 체감 난이도/재미/이탈률은 측정하지 않았다.\n\n| 단계 | 규칙 계약 | 무입력 | DROP만 | 느린 정책 | 빠른 정책 | 검토 사항 |\n|---|---|---|---|---|---|---|\n${table}\n\n규칙 위반: ${violations.length}. 고정 시드 합법 클리어 witness 50개는 단위 테스트에서 별도 확인한다. 일반 배치 정책은 한 번에 N줄 목표를 이해하지 않으므로 미션 실패를 해결 불가능으로 해석하지 않는다. 개발 시나리오는 구현에서 추출한 기준이며 독립적인 사용자 검증이 아니다. 구체적인 실행 경과와 실패 이유는 simulation.json 참조.\n`);
console.log(JSON.stringify({ executed: rows.length, pairedExecuted: paired.length, violations, issues: summary.filter(s => s.issues.length), elapsedMs: result.elapsedMs }));
if (violations.length) process.exitCode = 1;
