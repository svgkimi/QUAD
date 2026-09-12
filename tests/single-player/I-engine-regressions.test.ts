import { describe, expect, it } from "vitest";
import { applyAction, createInitialState, getGhostPiece, LOCK_DELAY_MS, MAX_LOCK_RESETS } from "../../src/engine/gameEngine";
import { checkCollision, createEmptyBoard } from "../../src/engine/board";
import { calculateGravityIntervalMs } from "../../src/engine/scoring";
import type { BoardCell, EngineAction, EngineState } from "../../src/engine/types";

/** 결정론적 시작 상태. 입력: seed / 출력: playing EngineState. */
function start(seed: number): EngineState {
  return applyAction(createInitialState({ seed }), { type: "START", seed });
}

/** 현재 차이를 사람이 재현할 수 있도록 기록한다. 입력: ID/seed/trace/증거 / 출력: void. */
function evidence(id: string, seed: number, trace: unknown, actual: unknown, expected: unknown): void {
  console.log("I_REPRO " + JSON.stringify({ id, seed, trace, actual, expected }));
}

describe("I current single-player regression contracts", () => {
  it("I-01 same state + HARD_DROP must produce the same queue on reducer re-evaluation", () => {
    const state = start(1);
    expect(state.pieceQueue).toHaveLength(6); // this action crosses the refill boundary
    const originalVisibleState = JSON.stringify(state);
    const action: EngineAction = { type: "HARD_DROP" };
    const first = applyAction(state, action);
    const second = applyAction(state, action); // exact SAME input object, not first's successor
    expect(JSON.stringify(state)).toBe(originalVisibleState); // freeze/snapshot cannot see closure state
    evidence("I-01", 1, ["START(seed=1)", "HARD_DROP(state)", "HARD_DROP(same state again)"], second.pieceQueue, first.pieceQueue);
    expect(second.pieceQueue).toEqual(first.pieceQueue);
  });

  it("I-02a elapsed time must not disappear when a frame covers multiple gravity intervals", () => {
    const initial = start(2);
    const interval = calculateGravityIntervalMs(initial.level);
    const coarse = applyAction(initial, { type: "TICK", deltaMs: 2.5 * interval });
    let fine = start(2);
    for (const deltaMs of [interval, interval, interval / 2]) fine = applyAction(fine, { type: "TICK", deltaMs });
    const actual = { y: coarse.active?.position.y, elapsedMs: coarse.gravityElapsedMs };
    const expected = { y: fine.active?.position.y, elapsedMs: fine.gravityElapsedMs };
    evidence("I-02a", 2, { coarse: ["START(2)", { type: "TICK", deltaMs: 2.5 * interval }], fine: [interval, interval, interval / 2] }, actual, expected);
    expect(actual).toEqual(expected);
  });

  it("I-02b ordinary 16ms frame overshoot must retain the 15ms remainder", () => {
    let state = start(2);
    const interval = calculateGravityIntervalMs(state.level);
    state = applyAction(state, { type: "TICK", deltaMs: interval - 1 });
    state = applyAction(state, { type: "TICK", deltaMs: 16 });
    evidence("I-02b", 2, ["START(2)", { type: "TICK", deltaMs: interval - 1 }, { type: "TICK", deltaMs: 16 }], state.gravityElapsedMs, 15);
    expect(state.gravityElapsedMs).toBe(15);
  });

  it("I-03 lock-reset budget must remain exhausted when the same piece steps off a platform", () => {
    const board = createEmptyBoard() as BoardCell[][];
    for (let y = 36; y < 40; y++) for (let x = 0; x < 6; x++) board[y][x] = "J";
    for (const row of board) Object.freeze(row);
    Object.freeze(board);
    let state: EngineState = { ...start(3), board, active: { type: "O", rotation: 0, position: { x: 3, y: 34 } } };
    expect(checkCollision(board, state.active!)).toBe(false);
    const trace: EngineAction[] = [];
    for (let i = 0; i < MAX_LOCK_RESETS; i++) {
      const action: EngineAction = { type: i % 2 === 0 ? "MOVE_RIGHT" : "MOVE_LEFT" };
      trace.push(action);
      state = applyAction(state, action);
    }
    expect(state.lockDelay.resetCount).toBe(MAX_LOCK_RESETS);
    for (const action of [{ type: "MOVE_RIGHT" }, { type: "MOVE_RIGHT" }] as EngineAction[]) {
      trace.push(action);
      state = applyAction(state, action);
    }
    expect(state.active?.position).toEqual({ x: 6, y: 34 });
    expect(state.lockDelay.resetCount).toBe(MAX_LOCK_RESETS);
    const tick: EngineAction = { type: "TICK", deltaMs: calculateGravityIntervalMs(state.level) };
    trace.push(tick);
    state = applyAction(state, tick);
    expect(state.active?.position).toEqual({ x: 6, y: 35 });
    evidence("I-03", 3, { fixture: "board rows36..39 columns0..5=J; O rotation0 at(3,34)", actions: trace }, state.lockDelay.resetCount, MAX_LOCK_RESETS);
    expect(state.lockDelay.resetCount).toBe(MAX_LOCK_RESETS);
  });

  it("I-04 a zero-distance HARD_DROP after a legal rotation must retain T-Spin recognition", () => {
    const board = createEmptyBoard() as BoardCell[][];
    // Both upper T corners plus lower-left are occupied: three-corner normal T-Spin.
    board[37][3] = "J";
    board[37][5] = "J";
    board[39][3] = "J";
    for (const row of board) Object.freeze(row);
    Object.freeze(board);
    const initial: EngineState = { ...start(4), board, active: { type: "T", rotation: 3, position: { x: 3, y: 37 } } };
    expect(checkCollision(board, initial.active!)).toBe(false);
    const rotated = applyAction(initial, { type: "ROTATE_CW" });
    expect(rotated.active?.rotation).toBe(0);
    expect(rotated.active?.position).toEqual({ x: 3, y: 37 });
    expect(rotated.lastActionWasRotation).toBe(true);
    expect(getGhostPiece(rotated)?.position).toEqual(rotated.active?.position);
    const timedLock = applyAction(rotated, { type: "TICK", deltaMs: LOCK_DELAY_MS });
    const hardLock = applyAction(rotated, { type: "HARD_DROP" });
    expect(hardLock.board).toEqual(timedLock.board);
    expect(timedLock.lastScoreEvent?.tSpin).toBe("normal");
    const actual = { tSpin: hardLock.lastScoreEvent?.tSpin, score: hardLock.score };
    const expected = { tSpin: timedLock.lastScoreEvent?.tSpin, score: timedLock.score };
    evidence("I-04", 4, { fixture: "J at(3,37),(5,37),(3,39); T rotation3 at(3,37)", actions: ["ROTATE_CW", "HARD_DROP(distance=0)"], control: ["ROTATE_CW", "TICK(500)"] }, actual, expected);
    expect(actual).toEqual(expected);
  });
});
