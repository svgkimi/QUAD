import { applyAction, BOARD_BUFFER_HEIGHT, BOARD_WIDTH, type EngineAction, type EngineState } from "../engine";

/** 입력: 실제 고정 후 보드 / 출력: 줄 제거를 우선하고 구멍·높이·굴곡을 피하는 배치 점수. */
function evaluate(state: EngineState, beforeLines: number): number {
  if (state.status === "gameover") return -1e9;
  const heights = Array<number>(BOARD_WIDTH).fill(0);
  let holes = 0;
  for (let x = 0; x < BOARD_WIDTH; x++) {
    let occupied = false;
    for (let y = BOARD_BUFFER_HEIGHT; y < state.board.length; y++) {
      if (state.board[y][x] !== null) { if (!occupied) heights[x] = state.board.length - y; occupied = true; }
      else if (occupied) holes++;
    }
  }
  const roughness = heights.slice(1).reduce((n, h, i) => n + Math.abs(h - heights[i]), 0);
  return (state.totalLinesCleared - beforeLines) * 10000 - holes * 200 - heights.reduce((a, b) => a + b, 0) * 10 - Math.max(...heights) * 20 - roughness * 2;
}

/** 입력: AI 엔진 상태 / 출력: 실제 회전·이동·하드드롭 액션. 48개 이하 배치만 탐색한다. */
function placements(state: EngineState): { actions: readonly EngineAction[]; state: EngineState; score: number }[] {
  if (state.status !== "playing" || !state.active) return [];
  const candidates: { actions: readonly EngineAction[]; state: EngineState; score: number }[] = [];
  const seen = new Set<string>();
  for (let rotations = 0; rotations < 4; rotations++) {
    let rotated = state;
    const prefix: EngineAction[] = [];
    for (let r = 0; r < rotations; r++) { const action = { type: "ROTATE_CW" } as const; rotated = applyAction(rotated, action); prefix.push(action); }
    for (let offset = -5; offset <= 6; offset++) {
      let candidate = rotated;
      const plan = [...prefix];
      for (let i = 0; i < Math.abs(offset); i++) {
        const action: EngineAction = { type: offset < 0 ? "MOVE_LEFT" : "MOVE_RIGHT" };
        const next = applyAction(candidate, action);
        if (next.active === candidate.active) break;
        candidate = next; plan.push(action);
      }
      const key = `${candidate.active!.rotation}:${candidate.active!.position.x}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const landed = applyAction(candidate, { type: "HARD_DROP" });
      const score = evaluate(landed, state.totalLinesCleared);
      candidates.push({ actions: [...plan, { type: "HARD_DROP" }], state: landed, score });
    }
  }
  return candidates.sort((a, b) => b.score - a.score);
}

/** 입력: 실제 상태·보스 여부 / 출력: 합법 액션. 보스만 상위 2개 후보의 NEXT까지 읽는다(최대 144배치). */
export function chooseOpponentActions(state: EngineState, lookahead = false, imperfect = false): readonly EngineAction[] {
  const candidates = placements(state);
  // O 회전처럼 같은 보드인 후보는 '실수'가 아니다. 실제로 다른 안전 배치를 선택한다.
  if (imperfect && candidates.length) {
    const bestBoard = JSON.stringify(candidates[0].state.board);
    const alternative = candidates.find(candidate => candidate.state.status === "playing" && JSON.stringify(candidate.state.board) !== bestBoard);
    if (alternative) return alternative.actions;
  }
  if (!lookahead || candidates.length === 0) return candidates[0]?.actions ?? [];
  let best = candidates[0], bestScore = -Infinity;
  for (const candidate of candidates.slice(0, 2)) {
    const future = placements(candidate.state)[0];
    const score = candidate.score + (future ? future.score * .5 : -1e9);
    if (score > bestScore) { bestScore = score; best = candidate; }
  }
  return best.actions;
}
