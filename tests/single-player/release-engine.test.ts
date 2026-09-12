import { describe, expect, it } from "vitest";
import { applyAction, createInitialState, tick, MAX_LOCK_RESETS, getSpawnY, createSeededRandom, refillQueue, takeNextPiece, type EngineState, type BoardCell } from "../../src/engine";

/** 입력: 없음 / 출력: 빈 게임판에서 시작한 시드 고정 상태. */
const start = () => applyAction(createInitialState({ seed: 1 }), { type: "START", seed: 1 });

describe("RC2 engine boundary contracts", () => {
  it.each([1, 19, 20])("level %i keeps remainder across irregular frames", level => {
    const state = { ...start(), level };
    const split = [16, 33, 16, 100, 33, 16].reduce((s, dt) => tick(s, dt), state);
    const whole = tick(state, 214);
    expect(whole.active).toEqual(split.active);
    expect(whole.gravityElapsedMs).toBeCloseTo(split.gravityElapsedMs);
  });
  it.each([NaN, Infinity, -1, 0])("invalid/nonpositive delta %s is a no-op", delta => {
    const state = start(); expect(tick(state, delta)).toBe(state);
  });
  it("a huge frame locks at most one piece and does not advance its successor", () => {
    const result = tick({ ...start(), level: 20 }, 60000);
    expect(result.board.flat().filter(Boolean)).toHaveLength(4);
    expect(result.active?.position.y).toBe(getSpawnY());
    expect(result.gravityElapsedMs).toBe(0);
    expect(result.lockDelay.resetCount).toBe(0);
  });
  it.each(["HARD_DROP", "HOLD"] as const)("%s replay keeps old RNG/state untouched", type => {
    const state = start(), before = JSON.stringify(state);
    expect(applyAction(state, { type })).toEqual(applyAction(state, { type }));
    expect(JSON.stringify(state)).toBe(before);
  });
  it("seeded engine sequence matches the original mulberry32 bag consumer over 140 draws", () => {
    const random = createSeededRandom(1);
    let queue = refillQueue([], random), state = start();
    for (let n = 0; n < 140; n++) {
      const next = takeNextPiece(queue, random); queue = next.queue;
      expect(state.active?.type).toBe(next.piece); expect(state.pieceQueue).toEqual(queue);
      state = applyAction({ ...state, board: createInitialState({ seed: 0 }).board }, { type: "HARD_DROP" });
    }
  });
  it("four-line B2B score and combo remain; ordinary clear resets B2B", () => {
    const well = (state: EngineState, rows: number): EngineState => {
      const board = createInitialState({ seed: 0 }).board.map(row => [...row]) as BoardCell[][];
      for (let y = 40 - rows; y < 40; y++) for (let x = 1; x < 10; x++) board[y][x] = "J";
      return { ...state, board, active: { type: "I", rotation: 1, position: { x: -2, y: 36 } } };
    };
    let state = applyAction(well(start(), 4), { type: "HARD_DROP" });
    expect(state.score).toBe(800); expect(state.backToBack).toBe(true);
    state = applyAction(well(state, 4), { type: "HARD_DROP" });
    expect(state.lastScoreEvent?.points).toBe(1250); expect(state.combo).toBe(2);
    state = applyAction(well(state, 1), { type: "HARD_DROP" });
    expect(state.backToBack).toBe(false); expect(state.combo).toBe(3);
    expect(state.totalLinesCleared).toBe(9);
  });
  it("exhausted airborne budget cannot reset and cannot lock in mid-air", () => {
    const initial = { ...start(), lockDelay: { isActive: false, elapsedMs: 499, resetCount: MAX_LOCK_RESETS } };
    const moved = tick(initial, 1000);
    expect(moved.lockDelay.resetCount).toBe(MAX_LOCK_RESETS);
    expect(moved.lockDelay.elapsedMs).toBe(499);
    expect(moved.board.flat().filter(Boolean)).toHaveLength(0);
    const held = applyAction(moved, { type: "HOLD" });
    expect(held.lockDelay).toEqual({ isActive: false, elapsedMs: 0, resetCount: 0 });
  });
});
