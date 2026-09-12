// Agent B release QA. Expected-correct assertions intentionally expose current defects.
// No application files are changed. All fixtures are local deterministic engine states.
import { applyAction, createInitialState, tick, MAX_LOCK_RESETS } from "../../src/engine/gameEngine";
import { checkCollision, getPieceCells } from "../../src/engine/board";
import { createSeededRandom } from "../../src/engine/rng";
import { detectTSpin } from "../../src/engine/rotation";
import { getSpawnX, getSpawnY } from "../../src/engine/tetrominoes";
import { takeNextPiece } from "../../src/engine/bag";
import { ALL_TETROMINO_TYPES, type EngineState, type BoardCell } from "../../src/engine/types";

/** Input: partial EngineState; output: reproducible playing state with a valid O piece. */
function playing(overrides: Partial<EngineState> = {}): EngineState {
  return {
    ...createInitialState({ seed: 20260909 }),
    status: "playing",
    active: { type: "O", rotation: 0, position: { x: 4, y: 20 } },
    ...overrides,
  };
}

/** Input: none; output: valid T-R in a double-clear slot, followed by a real CW rotation. */
function rotatedTDouble(): EngineState {
  const base = playing();
  const board = base.board.map(row => row.slice()) as BoardCell[][];
  for (let x = 0; x < 10; x++) {
    if (![3, 4, 5].includes(x)) board[38][x] = "J";
    if (x !== 4) board[39][x] = "J";
  }
  board[37][3] = "J";
  const before = playing({ board, active: { type: "T", rotation: 1, position: { x: 3, y: 37 } } });
  expect(checkCollision(board, before.active!)).toBe(false);
  const after = applyAction(before, { type: "ROTATE_CW" });
  expect(after.active?.rotation).toBe(2);
  expect(after.lastActionWasRotation).toBe(true);
  expect(detectTSpin(board, after.active!, true, after.lastRotationKickIndex)).toBe("normal");
  return after;
}

/** Input: none; output: valid grounded I with one missing column in four bottom rows. */
function tetrisWell(): EngineState {
  const base = playing();
  const board = base.board.map(row => row.slice()) as BoardCell[][];
  for (let y = 36; y <= 39; y++) for (let x = 1; x < 10; x++) board[y][x] = "J";
  return playing({ board, active: { type: "I", rotation: 1, position: { x: -2, y: 36 } } });
}

describe("Agent B: expected-correct regression checks (current bugs fail)", () => {
  it("B01 zero-distance HARD_DROP preserves the same T-Spin Double as timed lock", () => {
    const state = rotatedTDouble();
    const timed = tick(state, 500);
    const dropped = applyAction(state, { type: "HARD_DROP" });
    expect(timed.lastScoreEvent).toMatchObject({ category: "double", tSpin: "normal", points: 1200 });
    expect(dropped.board).toEqual(timed.board);
    expect(dropped.lastScoreEvent).toEqual(timed.lastScoreEvent);
  });

  it("B02 stepping off/on the same ledge cannot bypass an exhausted lock-reset budget", () => {
    const base = playing();
    const board = base.board.map(row => row.slice()) as BoardCell[][];
    board[38][3] = "J";
    let state = playing({ board, active: { type: "O", rotation: 0, position: { x: 3, y: 36 } } });
    expect(checkCollision(board, state.active!)).toBe(false);
    for (let i = 0; i < MAX_LOCK_RESETS; i++) {
      state = applyAction(state, { type: i % 2 === 0 ? "MOVE_LEFT" : "MOVE_RIGHT" });
    }
    state = applyAction(state, { type: "MOVE_RIGHT" }); // return to x=3, still supported
    expect(state.lockDelay.resetCount).toBe(MAX_LOCK_RESETS);
    state = tick(state, 490);
    expect(state.lockDelay.elapsedMs).toBe(490);
    state = applyAction(state, { type: "MOVE_RIGHT" }); // x=4: airborne, no time elapsed
    state = applyAction(state, { type: "MOVE_LEFT" }); // same support, same height
    state = tick(state, 20);
    expect(state.board[36][3]).toBe("O"); // total grounded time 510 ms: should have locked
  });

  it("B03 unsuccessful SOFT_DROP must not reset lock time or consume a move/rotate reset", () => {
    const state = tick(playing({ active: { type: "O", rotation: 0, position: { x: 4, y: 38 } } }), 490);
    const dropped = applyAction(state, { type: "SOFT_DROP" });
    expect(dropped.active).toEqual(state.active);
    expect(dropped.score).toBe(state.score);
    expect(dropped.lockDelay).toEqual(state.lockDelay);
  });

  it("B02 airborne gravity must not grant a fresh 15-reset budget to the same piece", () => {
    const base = playing();
    const board = base.board.map(row => row.slice()) as BoardCell[][];
    board[34][3] = "J";
    let state = playing({ board, active: { type: "O", rotation: 0, position: { x: 3, y: 32 } } });
    for (let i = 0; i < MAX_LOCK_RESETS; i++) {
      state = applyAction(state, { type: i % 2 === 0 ? "MOVE_LEFT" : "MOVE_RIGHT" });
    }
    state = applyAction(state, { type: "MOVE_RIGHT" });
    expect(state.lockDelay.resetCount).toBe(MAX_LOCK_RESETS);
    state = applyAction(state, { type: "MOVE_RIGHT" });
    state = tick(state, 1000);
    expect(state.active?.position).toEqual({ x: 4, y: 33 });
    expect(state.lockDelay.resetCount).toBe(MAX_LOCK_RESETS);
  });

  it("B04 a 1000-ms tick equals ten 100-ms ticks before landing (level 19)", () => {
    const state = playing({ level: 19, totalLinesCleared: 180 });
    let sliced = state;
    for (let i = 0; i < 10; i++) sliced = tick(sliced, 100);
    expect(sliced.active?.position.y).toBe(30);
    const batched = tick(state, 1000);
    expect(batched.active?.position.y).toBe(sliced.active?.position.y);
  });

  it("B04 gravity keeps fractional-frame remainder: level 20 moves 12 cells in 600 ms", () => {
    let state = playing({ level: 20, totalLinesCleared: 190 });
    for (let i = 0; i < 30; i++) state = tick(state, 20);
    expect(state.active?.position.y).toBe(32);
  });

  it("B05 first difficult clear retains 800 points and arms B2B; attack removed", () => {
    const result = applyAction(tetrisWell(), { type: "HARD_DROP" });
    expect(result.lastScoreEvent).toMatchObject({ category: "tetris", points: 800, combo: 1 });
    expect(result.backToBack).toBe(true); // chain is now armed; no bonus earned on its first clear
    expect(result.score).toBe(800);
  });
});

describe("Agent B: narrow passing controls / documented choices", () => {
  it("control T-Spin timed lock pays 1200 and normal clear breaks B2B", () => {
    expect(tick(rotatedTDouble(), 500).lastScoreEvent?.points).toBe(1200);
    const normal = playing({ ...rotatedTDouble(), backToBack: true, lastActionWasRotation: false });
    const result = tick(normal, 500);
    expect(result.lastScoreEvent).toMatchObject({ category: "double", points: 300 });
    expect(result.backToBack).toBe(false);
  });

  it("control HOLD is rejected twice, restored after lock, and swap resets orientation without queue consumption", () => {
    const state = applyAction(createInitialState({ seed: 1 }), { type: "START", seed: 1 });
    const held = applyAction(state, { type: "HOLD" });
    expect(applyAction(held, { type: "HOLD" })).toBe(held);
    const locked = applyAction(held, { type: "HARD_DROP" });
    expect(locked.hold.canHold).toBe(true);
    const swap = applyAction(applyAction(locked, { type: "ROTATE_CW" }), { type: "HOLD" });
    expect(swap.active?.rotation).toBe(0);
    expect(swap.active?.position).toEqual({ x: getSpawnX(swap.active!.type), y: getSpawnY() });
    expect(swap.pieceQueue).toEqual(locked.pieceQueue);
  });

  it("control blocked held-piece spawn produces gameover", () => {
    const base = playing({ hold: { type: "T", canHold: true } });
    const board = base.board.map(row => row.slice()) as BoardCell[][];
    board[getSpawnY()][4] = "J";
    const result = applyAction({ ...base, board }, { type: "HOLD" });
    expect(result.status).toBe("gameover");
  });

  it("choice spawn buffer is hidden for the first 1999 ms at level 1, visible at 2000 ms", () => {
    for (const type of ALL_TETROMINO_TYPES) {
      let state = playing({ active: { type, rotation: 0, position: { x: getSpawnX(type), y: getSpawnY() } } });
      expect(checkCollision(state.board, state.active!)).toBe(false);
      expect(getPieceCells(state.active!).every(cell => cell.y < 20)).toBe(true);
      state = tick(state, 1000);
      state = tick(state, 999);
      expect(getPieceCells(state.active!).every(cell => cell.y < 20)).toBe(true);
      state = tick(state, 1);
      expect(getPieceCells(state.active!).some(cell => cell.y >= 20)).toBe(true);
    }
  });

  it("choice fully hidden lock does not top out when next spawn is unobstructed (PRD block-out)", () => {
    const base = playing();
    const board = base.board.map(row => row.slice()) as BoardCell[][];
    board[20][0] = "J";
    const state = playing({ board, active: { type: "O", rotation: 0, position: { x: 0, y: 18 } } });
    const result = applyAction(state, { type: "HARD_DROP" });
    expect(result.board[18][0]).toBe("O");
    expect(result.status).toBe("playing");
  });

  it("control four consecutive bags contain every type exactly once (28 draws, fixed seed; no game simulation)", () => {
    const initial = createInitialState({ seed: 20260909 });
    let queue = initial.pieceQueue;
    const random = createSeededRandom(initial.rngState);
    const draws = [];
    for (let i = 0; i < 28; i++) {
      const next = takeNextPiece(queue, random);
      draws.push(next.piece);
      queue = next.queue;
      expect(queue.length).toBeGreaterThanOrEqual(5);
    }
    for (let i = 0; i < 28; i += 7) expect(new Set(draws.slice(i, i + 7))).toEqual(new Set(ALL_TETROMINO_TYPES));
  });
});
