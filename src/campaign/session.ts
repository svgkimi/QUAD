import { applyAction, createInitialState, type EngineAction, type EngineState } from "../engine";
import { chooseOpponentActions } from "./opponent";
import { addGarbage, handicapOpponent, stackHeight } from "./garbage";
import { makeStageBoard, type StageDefinition } from "./stages";

export interface CampaignRun {
  readonly stageId: number;
  readonly outcome: "playing" | "cleared" | "failed";
  readonly reason?: "goal" | "ai-topout" | "topout" | "timeout" | "pieces";
  readonly piecesUsed: number;
  readonly streak: number;
  readonly elapsedMs: number;
  readonly dangerMs: number;
  readonly aiElapsedMs: number;
  readonly pressureElapsedMs: number;
  readonly attackSeed: number;
  readonly sent: number;
  readonly received: number;
  readonly targetRows: readonly number[];
  readonly ai: EngineState | null;
}
interface CampaignState extends EngineState { readonly campaign: CampaignRun }

/** 입력: 공통 엔진 상태 / 출력: 캠페인 부가 상태. 무한 모드에는 부가 상태가 없다. */
export function getCampaignRun(state: EngineState): CampaignRun | null {
  return (state as Partial<CampaignState>).campaign ?? null;
}

/** 입력: 아직 남은 준비 줄과 이번에 삭제한 줄 / 출력: 줄 이동을 반영한 남은 목표. */
export function advanceTargetRows(targets: readonly number[], cleared: readonly number[]): readonly number[] {
  return targets.filter(y => !cleared.includes(y)).map(y => y + cleared.filter(row => row > y).length);
}

/** 입력: 스테이지 / 출력: 입력 시드로 재현 가능한 새 랜덤 순서와 독립된 AI 엔진. UI가 매 도전 새 시드를 전달한다. */
function startCampaign(stage: StageDefinition, seed: number): CampaignState {
  const board = makeStageBoard(stage);
  const setup = { board, sequence: stage.sequence, gravityIntervalMs: stage.gravityMs, randomizer: "independent" as const };
  const player = applyAction(createInitialState({ seed: seed }), { type: "START", seed: seed, setup });
  const ai = stage.kind === "duel" ? handicapOpponent(applyAction(createInitialState({ seed: seed }), { type: "START", seed: seed, setup: { ...setup, board: createInitialState({ seed: 1 }).board } }), stage.aiHandicapRows ?? 0, seed ^ 1234) : null;
  return { ...player, campaign: { stageId: stage.id, outcome: "playing", piecesUsed: 0, streak: 0, elapsedMs: 0, dangerMs: 0, aiElapsedMs: 0, pressureElapsedMs: 0, attackSeed: seed ^ 93217, sent: 0, received: 0,
    targetRows: board.flatMap((row, y) => row.some(cell => cell !== null) ? [y] : []), ai,
  } };
}

/** 입력: 엔진 상태·액션·선택된 스테이지 / 출력: 조작/승패/AI/시간을 원자적으로 갱신한 상태. */
export function reduceCampaign(state: EngineState, action: EngineAction, stage: StageDefinition): EngineState {
  if (action.type === "START" || action.type === "RESTART") return startCampaign(stage, action.seed ?? state.rngState);
  const run = getCampaignRun(state);
  if (!run || run.stageId !== stage.id) return applyAction(state, action);
  if (run.outcome !== "playing") return state;
  const ticking = action.type === "TICK" && state.status === "playing" && Number.isFinite(action.deltaMs) && action.deltaMs > 0;
  const deadline = stage.limitMs ?? stage.surviveMs;
  const delta = ticking ? Math.min(action.deltaMs, deadline ? Math.max(0, deadline - run.elapsedMs) : action.deltaMs) : 0;
  // 입력 경계에서 한 번만 반전: 키보드/터치/반복 입력에 동일하게 적용한다.
  const mappedAction: EngineAction = stage.reverseControls && action.type === "MOVE_LEFT" ? { type: "MOVE_RIGHT" }
    : stage.reverseControls && action.type === "MOVE_RIGHT" ? { type: "MOVE_LEFT" } : action;
  let next = applyAction(state, ticking ? { type: "TICK", deltaMs: delta } : mappedAction);
  let updated: CampaignRun = { ...run, elapsedMs: run.elapsedMs + delta, dangerMs: run.dangerMs + (stackHeight(state) >= 12 ? delta : 0) };
  if (next.lastScoreEvent !== state.lastScoreEvent && next.lastScoreEvent) updated = { ...updated, piecesUsed: run.piecesUsed + 1, streak: next.combo, targetRows: advanceTargetRows(run.targetRows, next.lastScoreEvent.clearedRows) };
  const won = stage.kind === "combo" ? updated.streak >= stage.target : stage.kind === "duel" ? false : stage.kind === "survival" ? updated.elapsedMs >= stage.surviveMs! : stage.kind === "dig" || stage.kind === "puzzle" || stage.kind === "limited" ? updated.targetRows.length === 0 : next.totalLinesCleared >= stage.target;
  if (next.status === "gameover" && stage.kind === "survival") updated = { ...updated, outcome: "failed", reason: "topout" };
  else if (won) updated = { ...updated, outcome: "cleared", reason: "goal" };
  else if (next.status === "gameover") updated = { ...updated, outcome: "failed", reason: "topout" };
  else if (stage.pieceLimit && updated.piecesUsed >= stage.pieceLimit) updated = { ...updated, outcome: "failed", reason: "pieces" };
  else if (stage.limitMs && updated.elapsedMs >= stage.limitMs) updated = { ...updated, outcome: "failed", reason: "timeout" };

  if (updated.outcome === "playing" && updated.ai) {
    const cleared = next.totalLinesCleared - state.totalLinesCleared;
    if (cleared > 0) {
      const attack = addGarbage(updated.ai, cleared, updated.attackSeed);
      updated = { ...updated, ai: attack.state, attackSeed: attack.seed, sent: updated.sent + cleared };
      if (attack.state.status === "gameover") updated = { ...updated, outcome: "cleared", reason: "ai-topout" };
    }
  }
  if (ticking && updated.outcome === "playing" && updated.ai) {
    const activeDelta = Math.max(0, updated.elapsedMs - (stage.aiHeadStartMs ?? 0)) - Math.max(0, run.elapsedMs - (stage.aiHeadStartMs ?? 0));
    let aiElapsedMs = run.aiElapsedMs + activeDelta, ai = updated.ai;
    if (aiElapsedMs >= stage.aiMoveMs!) {
      // 긴 프레임에서도 AI가 여러 블록을 한꺼번에 놓아 따라잡지 않는다.
      aiElapsedMs %= stage.aiMoveMs!;
      const beforeLines = ai.totalLinesCleared;
      for (const move of chooseOpponentActions(ai, stage.aiLookahead, !!stage.aiMistakeEvery && ai.score > 0 && (Math.floor(updated.elapsedMs / stage.aiMoveMs!) % stage.aiMistakeEvery === 0))) ai = applyAction(ai, move);
      const cleared = ai.totalLinesCleared - beforeLines;
      if (cleared > 0 && ai.status !== "gameover") {
        const attack = addGarbage(next, cleared, updated.attackSeed);
        next = attack.state; updated = { ...updated, attackSeed: attack.seed, received: updated.received + cleared };
      }
    }
    updated = { ...updated, ai, aiElapsedMs };
    if (ai.status === "gameover") updated = { ...updated, outcome: "cleared", reason: "ai-topout" };
    else if (next.status === "gameover") updated = { ...updated, outcome: "failed", reason: "topout" };
  }
  if (ticking && stage.kind === "survival" && stage.pressureMs && updated.outcome === "playing") {
    let pressureElapsedMs = run.pressureElapsedMs + delta;
    if (pressureElapsedMs >= stage.pressureMs!) {
      pressureElapsedMs %= stage.pressureMs!;
      const attack = addGarbage(next, 1, updated.attackSeed);
      next = attack.state; updated = { ...updated, attackSeed: attack.seed, received: updated.received + 1 };
      if (next.status === "gameover") updated = { ...updated, outcome: "failed", reason: "topout" };
    }
    updated = { ...updated, pressureElapsedMs };
  }
  if (updated.outcome !== "playing") next = { ...next, status: "paused" };
  return { ...next, campaign: updated } as CampaignState;
}
