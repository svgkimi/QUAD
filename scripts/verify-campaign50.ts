import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { STAGES, makeStageBoard } from "../src/campaign/stages";
import { createInitialState, type EngineAction } from "../src/engine";
import { getCampaignRun, reduceCampaign } from "../src/campaign/session";
import { chooseOpponentActions } from "../src/campaign/opponent";
import { earnedStageStars } from "../src/campaign/stars";
import { stackHeight } from "../src/campaign/garbage";
import specifications from "../campaign-planning/BASIC50_SPEC.json";

const seeds = [11,42,123,2026,50001];
const profiles = [
  { name: "idle", thinkMs: Infinity, actionMs: Infinity, lookahead: false },
  { name: "drop-only", thinkMs: 600, actionMs: 50, lookahead: false },
  { name: "steady-agent", thinkMs: 700, actionMs: 90, lookahead: false },
  { name: "fast-agent", thinkMs: 120, actionMs: 35, lookahead: true },
] as const;
const rows: any[] = [], violations: string[] = [], intended: any[] = [];
const started = performance.now();

/** 입력: 스테이지·플레이 정책·재현 시드 / 출력: 실제 액션과 50ms 중력을 적용한 관측 결과. */
function simulate(stage: typeof STAGES[number], profile: typeof profiles[number], seed: number) {
  let state = reduceCampaign(createInitialState({ seed }), { type: "START", seed }, stage);
  const startSignature = [state.active?.type, ...state.pieceQueue].join("");
  let nextActionAt: number = profile.thinkMs, plan: readonly EngineAction[] = [], index = 0, actions = 0, maxHeight = 0;
  const samples: object[] = [];
  for (let ms = 0; ms < 240000 && getCampaignRun(state)!.outcome === "playing"; ms += 50) {
    if (ms >= nextActionAt) {
      if (!plan.length) {
        plan = profile.name === "drop-only" ? [{ type: "HARD_DROP" }] : chooseOpponentActions(state, profile.lookahead);
        index = 0;
      }
      const action = plan[index++];
      if (action) { state = reduceCampaign(state, action, stage); actions++; }
      if (index >= plan.length) { plan = []; nextActionAt = ms + profile.thinkMs; }
      else nextActionAt = ms + profile.actionMs;
    }
    const beforeLock = state.lastScoreEvent;
    state = reduceCampaign(state, { type: "TICK", deltaMs: 50 }, stage);
    // 중력으로 고정되어 다른 피스가 나오면 이전 피스의 조작 계획을 폐기한다.
    if (beforeLock !== state.lastScoreEvent) { plan = []; nextActionAt = ms + profile.thinkMs; }
    maxHeight = Math.max(maxHeight, stackHeight(state));
    if (ms % 10000 === 0) samples.push({ atMs: ms + 50, lines: state.totalLinesCleared, height: stackHeight(state), sent: getCampaignRun(state)!.sent, received: getCampaignRun(state)!.received });
  }
  const run = getCampaignRun(state)!;
  const success = stage.kind === "duel" ? run.ai?.status === "gameover"
    : stage.kind === "survival" ? run.elapsedMs === stage.surviveMs
    : state.totalLinesCleared >= stage.target;
  if (run.outcome === "cleared" && (!success || state.status !== "paused")) violations.push(`stage ${stage.id} ${profile.name} invalid clear`);
  if (run.reason === "timeout" && run.elapsedMs !== stage.limitMs) violations.push(`stage ${stage.id} invalid timeout`);
  if (stage.kind !== "duel" && run.received !== 0) violations.push(`stage ${stage.id} unexpected obstacles`);
  return { stage: stage.id, profile: profile.name, seed, startSignature, outcome: run.outcome === "playing" ? "capped" : run.outcome,
    reason: run.reason ?? "240s-observation-cap", elapsedMs: run.elapsedMs, lines: state.totalLinesCleared,
    pieces: run.piecesUsed, dangerMs: run.dangerMs, maxHeight, sent: run.sent, received: run.received,
    aiLines: run.ai?.totalLinesCleared ?? null, stars: earnedStageStars(stage,state), actions, samples };
}

for (const expected of specifications) {
  const stage = STAGES.find(s => s.id === expected.id)!;
  const actual = { id:stage.id, kind:stage.kind, target:stage.target, difficulty:stage.difficulty,
    obstacleRows:stage.layers.reduce((sum,l)=>sum+l.rows,0), limitMs:stage.limitMs??null, surviveMs:stage.surviveMs??null,isBoss:stage.isBoss };
  if (JSON.stringify(actual) !== JSON.stringify(expected)) violations.push(`stage ${stage.id} differs from approved spec`);
  const base = reduceCampaign(createInitialState({seed: 42}), {type:"START",seed:42},stage);
  const paused = reduceCampaign(base,{type:"PAUSE"},stage);
  if(JSON.stringify(reduceCampaign(paused,{type:"TICK",deltaMs:99999},stage))!==JSON.stringify(paused)) violations.push(`stage ${stage.id} pause not frozen`);
  if(JSON.stringify(reduceCampaign(base,{type:"RESTART",seed:42},stage))!==JSON.stringify(base)) violations.push(`stage ${stage.id} replay impure`);
  const retry = reduceCampaign(base,{type:"RESTART",seed:43},stage);
  if(JSON.stringify(retry.pieceQueue)===JSON.stringify(base.pieceQueue)) violations.push(`stage ${stage.id} fixed retry sequence`);
  if(stage.sequence.length || base.randomizer!=="independent") violations.push(`stage ${stage.id} not independent random`);
  const board = makeStageBoard(stage);
  if(board.some(row=>row.every(Boolean))) violations.push(`stage ${stage.id} starts with completed row`);
  intended.push({...expected, gravityMs:stage.gravityMs, aiMoveMs:stage.aiMoveMs??null,
    developerScenario: `단계 선택 → 목표 확인 → 랜덤 시작 → 실제 조작 → ${stage.kind==="duel"?"AI 넘침":stage.kind==="survival"?"생존 시간 도달":"목표 줄 제거"} → 별/다음 단계. 정지 시 시간·AI 동결, 재도전 시 새 순서.`});
  for(const profile of profiles) for(const seed of seeds) rows.push(simulate(stage,profile,seed));
  console.log(`Stage ${stage.id}/50 ${rows.filter(r=>r.stage===stage.id&&r.outcome==="cleared").length}/20 cleared`);
}
const summary = STAGES.map(stage=>{
  const observed = rows.filter(r=>r.stage===stage.id), active=observed.filter(r=>r.profile==="fast-agent");
  const issues:string[]=[];
  if(observed.some(r=>r.profile==="idle"&&r.outcome==="cleared")) issues.push("무입력 클리어 관측");
  if(observed.some(r=>r.profile==="drop-only"&&r.outcome==="cleared")) issues.push("DROP 반복 클리어 관측");
  if(!active.some(r=>r.outcome==="cleared")) issues.push("빠른 정책의 클리어 증거 없음");
  return {stage:stage.id, contract:violations.some(v=>v.startsWith(`stage ${stage.id} `))?"FAIL":"PASS", profiles:Object.fromEntries(profiles.map(p=>[p.name,{cleared:observed.filter(r=>r.profile===p.name&&r.outcome==="cleared").length,total:seeds.length}])), issues, difficulty:"UNCONFIRMED: human playtest required"};
});
const out=process.env.QUAD_QA_OUT??"qa/basic50-2026-09-12";
mkdirSync(out,{recursive:true});
const hash=createHash("sha256");
for(const file of ["src/campaign/stages.ts","src/campaign/session.ts","src/campaign/opponent.ts","src/campaign/stars.ts","src/engine/gameEngine.ts","src/engine/bag.ts"]) hash.update(readFileSync(file));
const result={sourceHash:hash.digest("hex"),seeds,stepMs:50,observationCapMs:240000,profileNote:"Scripted agents, NOT human participants. Fast agent uses heuristic NEXT lookahead; neither agent models human mistakes or touch latency accurately.",executed:rows.length,elapsedMs:performance.now()-started,violations,summary,rows};
writeFileSync(out+"/simulation.json",JSON.stringify(result,null,2));
writeFileSync(out+"/developer-scenarios.json",JSON.stringify(intended,null,2));
const table=summary.map(s=>`| ${s.stage} | ${s.contract} | ${s.profiles.idle.cleared}/5 | ${s.profiles["drop-only"].cleared}/5 | ${s.profiles["steady-agent"].cleared}/5 | ${s.profiles["fast-agent"].cleared}/5 | ${s.issues.join("; ")||"관측 범위 내 특이사항 없음"} |`).join("\n");
writeFileSync(out+"/COMPARISON.md",`# 기본 50 개발 의도 / 실행 시나리오 비교\n\n소스 SHA-256: ${result.sourceHash}\n\n50단계 × 4정책 × 5시드 = ${rows.length}판. 실제 사용자 실험이 아닌 엔진 자동 시뮬레이션. 50ms 시간 진행, 판당 240초 관측 상한. capped는 실패나 성공으로 환산하지 않는다. 별점 0.5~4.0의 체감 난이도는 미확인이다.\n\n| 단계 | 규칙 계약 | 무입력 성공 | DROP만 성공 | 느린 정책 성공 | 빠른 정책 성공 | 불일치/검토 사항 |\n|---|---|---|---|---|---|---|\n${table}\n\n규칙 위반: ${violations.length}\n\n승리 판정과 설계값 일치는 자동 검사 대상이다. 목표 성공률/인간 난이도 일치는 이 표로 보증하지 않는다. 자동 정책 실패가 곧 클리어 불가능을 뜻하지도 않는다. 상세 행동 경과는 simulation.json의 각 stage/profile/seed/samples를 참고한다.\n`);
console.log(JSON.stringify({executed:rows.length,violations,issues:summary.filter(s=>s.issues.length).map(s=>({stage:s.stage,issues:s.issues})),elapsedMs:result.elapsedMs}));
if(violations.length)process.exitCode=1;
