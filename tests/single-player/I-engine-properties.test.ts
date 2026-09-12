import { afterAll, describe, expect, it, vi } from "vitest";
import { applyAction, createInitialState, getGhostPiece, MAX_LOCK_RESETS } from "../../src/engine/gameEngine";
import { checkCollision, createEmptyBoard, getPieceCells, lockPieceToBoard } from "../../src/engine/board";
import { moveDown, moveHorizontal } from "../../src/engine/movement";
import { tryRotate } from "../../src/engine/rotation";
import { processLineClear } from "../../src/engine/lineClear";
import { refillQueue, takeNextPiece } from "../../src/engine/bag";
import { createSeededRandom } from "../../src/engine/rng";
import { ALL_TETROMINO_TYPES, BOARD_TOTAL_HEIGHT, BOARD_WIDTH, type ActivePiece, type Board, type BoardCell, type EngineAction, type EngineState, type RandomFn, type RotationState, type TetrominoType } from "../../src/engine/types";

const STARTED = performance.now();
const GAME_CAP = 600;
const DELTAS = [0, 1, 8, 16, 1000 / 60, 33, 100, 250, 499, 500, 501, 999, 1000, 1001, 2500];
const INPUTS: EngineAction[] = [
  { type: "MOVE_LEFT" }, { type: "MOVE_RIGHT" }, { type: "SOFT_DROP" },
  { type: "ROTATE_CW" }, { type: "ROTATE_CCW" }, { type: "ROTATE_180" },
  { type: "HOLD" }, { type: "HARD_DROP" },
];
const FROZEN_INPUTS: EngineAction[] = [
  ...INPUTS, ...DELTAS.map((deltaMs): EngineAction => ({ type: "TICK", deltaMs })),
  { type: "TICK", deltaMs: 60_000 },
 { type: "PAUSE" },
];
const ALLOWED = new Set<BoardCell>([null, ...ALL_TETROMINO_TYPES]);
const METRICS = {
  seedCases: 0, simulations: 0, soloSimulations: 0,
  gameovers: 0, capReached: 0, replayComparisons: 0, gameplayActions: 0,
  pauseNoops: 0, gameoverNoops: 0, locks: 0, clearedLines: 0,
  frozenBoardTransitions: 0, fixedBoardCases: 0, fixedOperations: 0,
  lineClearFixtures: 0, bagSeeds: 0, bags: 0, pieces: 0, rngDraws: 0,
  actions: {} as Record<string, number>,
};

/** 간단한 독립 LCG로 액션을 생성한다. 입력: uint32 seed / 출력: [0,1) 함수. */
function actionRng(seed: number): RandomFn {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/** 객체 그래프를 동결해 인플레이스 변경을 탐지한다. 입력/출력: 같은 T 객체. */
function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

/** RNG 함수의 숨은 상태를 제외한 비교값. 입력: EngineState / 출력: JSON string. */
function snapshot(state: EngineState): string {
  return JSON.stringify(state);
}

/** 실패를 즉시 추적 가능한 예외로 만든다. 입력: boolean, 설명 / 출력: void. */
function requireInvariant(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** 피스가 차지하는 실제 셀을 독립 범위 검사한다. 박스 원점의 음수 x는 합법일 수 있다. */
function assertPiece(board: Board, piece: ActivePiece): void {
  requireInvariant(ALL_TETROMINO_TYPES.includes(piece.type), "invalid piece type");
  requireInvariant([0, 1, 2, 3].includes(piece.rotation), "invalid rotation");
  const cells = getPieceCells(piece);
  requireInvariant(cells.length === 4 && new Set(cells.map(({ x, y }) => `${x},${y}`)).size === 4, "not four distinct cells");
  for (const { x, y } of cells) {
    requireInvariant(Number.isInteger(x) && Number.isInteger(y), `noninteger cell ${x},${y}`);
    requireInvariant(x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_TOTAL_HEIGHT, `out of bounds ${x},${y}`);
    requireInvariant(board[y][x] === null, `active collides at ${x},${y}`);
  }
  requireInvariant(!checkCollision(board, piece), "collision API disagrees with legal cells");
}

/** 전체 보드·수치·활성/고스트 피스 불변식. 입력: EngineState / 출력: void. */
function assertState(state: EngineState): void {
  requireInvariant(state.board.length === BOARD_TOTAL_HEIGHT, "board height changed");
  for (const row of state.board) {
    requireInvariant(row.length === BOARD_WIDTH, "board width changed");
    for (const cell of row) requireInvariant(ALLOWED.has(cell), `invalid board value ${String(cell)}`);
  }
  for (const [key, value] of Object.entries({ score: state.score, level: state.level, lines: state.totalLinesCleared, combo: state.combo, resets: state.lockDelay.resetCount })) {
    requireInvariant(Number.isSafeInteger(value) && value >= 0, `invalid ${key}=${value}`);
  }
  requireInvariant(state.level >= 1, "zero level");
  requireInvariant(state.lockDelay.resetCount <= MAX_LOCK_RESETS, "reset cap exceeded");
  requireInvariant(Number.isFinite(state.gravityElapsedMs) && state.gravityElapsedMs >= 0, "invalid gravity timer");
  requireInvariant(Number.isFinite(state.lockDelay.elapsedMs) && state.lockDelay.elapsedMs >= 0, "invalid lock timer");
  requireInvariant(state.pieceQueue.length >= 6 && state.pieceQueue.length <= 12, "queue out of range");
  requireInvariant(state.pieceQueue.every((type) => ALL_TETROMINO_TYPES.includes(type)), "invalid queue type");
  if (state.status === "playing" || state.status === "paused") {
    requireInvariant(state.active !== null, "missing active piece");
    assertPiece(state.board, state.active);
    const ghost = getGhostPiece(state);
    requireInvariant(ghost !== null, "missing ghost");
    assertPiece(state.board, ghost);
    requireInvariant(ghost.type === state.active.type && ghost.rotation === state.active.rotation, "ghost shape changed");
    requireInvariant(ghost.position.x === state.active.position.x && ghost.position.y >= state.active.position.y, "ghost teleported");
    requireInvariant(checkCollision(state.board, { ...ghost, position: { x: ghost.position.x, y: ghost.position.y + 1 } }), "ghost is not grounded");
  }
}

/** 합법 플레이 액션을 생성한다. 입력: 상태/step/RNG/대전 여부 / 출력: EngineAction. */
function chooseAction(state: EngineState, step: number, random: RandomFn): EngineAction {
  if (state.status === "paused") return { type: "RESUME" };
  // 종료까지 도달시키되 대부분의 액션은 무작위. 600회 CPU 상한을 유지한다.
  if (step % 12 === 11) return { type: "HARD_DROP" };
  const roll = random();
  if (roll < 0.04) return { type: "PAUSE" };
  if (roll < 0.43) return { type: "TICK", deltaMs: DELTAS[Math.floor(random() * DELTAS.length)] };
  let action = INPUTS[Math.floor(random() * INPUTS.length)];
  if (action.type === "HOLD" && !state.hold.canHold) action = { type: "MOVE_LEFT" };
  return action;
}

/** 한 시드를 종료까지 실행한다. 입력: seed, 대전 여부 / 출력: 매 액션 상태 스냅샷. */
function simulate(seed: number): string[] {
  const random = actionRng(seed ^ 0xa5a5a5a5);
  const spy = vi.spyOn(Math, "random").mockImplementation(() => {
    throw new Error("unexpected global RNG in seeded solo simulation");
  });
  const trace: EngineAction[] = [{ type: "START", seed }];
  const frames: string[] = [];
  let state = applyAction(createInitialState({ seed }), trace[0]);
  let previous = snapshot(state);
  let step = -1;
  METRICS.simulations++;
  METRICS.soloSimulations++;
  try {
    assertState(state);
    for (step = 0; step < GAME_CAP && state.status !== "gameover"; step++) {
      freeze(state);
      previous = snapshot(state);
      const before = state;
      const action = chooseAction(state, step, random);
      trace.push(action);
      state = applyAction(before, action);
      METRICS.gameplayActions++;
      METRICS.actions[action.type] = (METRICS.actions[action.type] ?? 0) + 1;
      requireInvariant(snapshot(before) === previous, "input state mutated");
      METRICS.frozenBoardTransitions++;
      assertState(state);
      requireInvariant(state.score >= before.score, "score regressed");
      requireInvariant(state.totalLinesCleared >= before.totalLinesCleared, "lines regressed");
      const locked = state.lastScoreEvent !== before.lastScoreEvent;
      if (locked) {
        METRICS.locks++;
        METRICS.clearedLines += state.totalLinesCleared - before.totalLinesCleared;
        const occupied = (board: Board): number => board.reduce((sum, row) => sum + row.filter((cell) => cell !== null).length, 0);
        requireInvariant(occupied(state.board) === occupied(before.board) + 4 - 10 * (state.totalLinesCleared - before.totalLinesCleared), "lock/clear cell conservation failed");
        requireInvariant(!state.board.some((row) => row.every((cell) => cell !== null)), "full row remains after lock");
      }
      if (!locked) requireInvariant(state.board === before.board, "nonlock action replaced fixed board");
      if (state.status === "paused") {
        freeze(state);
        const pausedSnapshot = snapshot(state);
        for (const ignored of FROZEN_INPUTS) {
          requireInvariant(applyAction(state, ignored) === state, `paused input changed state: ${JSON.stringify(ignored)}`);
          METRICS.pauseNoops++;
        }
        requireInvariant(snapshot(state) === pausedSnapshot, "pause advanced timers or mutated state");
      }
      frames.push(snapshot(state));
    }
    requireInvariant(state.status === "gameover", `simulation exceeded ${GAME_CAP} actions`);
    METRICS.gameovers++;
    freeze(state);
    const endedSnapshot = snapshot(state);
    for (const ignored of [...FROZEN_INPUTS, { type: "RESUME" } as const]) {
      requireInvariant(applyAction(state, ignored) === state, `gameover input changed state: ${JSON.stringify(ignored)}`);
      METRICS.gameoverNoops++;
    }
    requireInvariant(snapshot(state) === endedSnapshot, "gameover state mutated");
    return frames;
  } catch (error) {
    if (step === GAME_CAP) METRICS.capReached++;
    throw new Error(`seed=${seed} mode=solo step=${step}\ntrace=${JSON.stringify(trace)}\nbefore=${previous}\nafter=${snapshot(state)}\n${String(error)}`);
  } finally {
    spy.mockRestore();
  }
}

describe("I seeded gameplay, frozen boards, pause/gameover, deterministic replay", () => {
  it.each(Array.from({ length: 500 }, (_, seed) => seed))("seed %i (500 solo seeds each replayed)", (seed) => {
    const first = simulate(seed);
    const replay = simulate(seed);
    expect(replay, `seed=${seed}; same seed/action trace must match every state`).toEqual(first);
    METRICS.replayComparisons += first.length;
    METRICS.seedCases++;
  });
});

describe("I independent immutable fixed-board and line-clear properties", () => {
  it.each(Array.from({ length: 100 }, (_, seed) => seed))("fixed terrain seed %i", (seed) => {
    const random = actionRng(seed + 9000);
    const board = createEmptyBoard() as BoardCell[][];
    for (let y = 28; y < BOARD_TOTAL_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) board[y][x] = random() < 0.55 ? ALL_TETROMINO_TYPES[Math.floor(random() * 7)] : null;
      board[y][seed % 10] = null; // no full rows in the fixture
    }
    freeze(board);
    const before = JSON.stringify(board);
    for (const type of ALL_TETROMINO_TYPES) {
      for (const rotation of [0, 1, 2, 3] as RotationState[]) {
        const piece = freeze<ActivePiece>({ type, rotation, position: { x: 3, y: 20 } });
        assertPiece(board, piece);
        const results = [moveHorizontal(board, piece, -1).piece, moveHorizontal(board, piece, 1).piece, moveDown(board, piece).piece, ...(["CW", "CCW", "180"] as const).map((direction) => tryRotate(board, piece, direction).piece)];
        for (const result of results) assertPiece(board, result);
        const state: EngineState = { ...createInitialState({ seed }), status: "playing", board, active: piece };
        const ghost = getGhostPiece(state)!;
        assertPiece(board, ghost);
        const locked = lockPieceToBoard(board, ghost);
        expect(locked.flat().filter((cell) => cell !== null).length).toBe(board.flat().filter((cell) => cell !== null).length + 4);
        expect(JSON.stringify(board)).toBe(before);
        METRICS.fixedOperations += 8;
      }
    }
    METRICS.fixedBoardCases++;
  });

  it.each(Array.from({ length: 40 }, (_, seed) => seed))("frozen vertical-I line-clear fixture %i", (seed) => {
    const lines = 1 + (seed % 4);
    const gap = Math.floor(seed / 4);
    const board = createEmptyBoard() as BoardCell[][];
    for (let y = BOARD_TOTAL_HEIGHT - lines; y < BOARD_TOTAL_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) if (x !== gap) board[y][x] = "J";
    }
    freeze(board);
    const before = JSON.stringify(board);
    const state = freeze<EngineState>({ ...createInitialState({ seed }), status: "playing", board, active: { type: "I", rotation: 1, position: { x: gap - 2, y: 20 } } });
    const after = applyAction(state, { type: "HARD_DROP" });
    expect(after.totalLinesCleared).toBe(lines);
    expect(after.lastScoreEvent?.category).toBe(["none", "single", "double", "triple", "tetris"][lines]);
    expect(after.board.flat().filter((cell) => cell !== null).length).toBe(4 - lines);
    expect(processLineClear(after.board).clearedLineCount).toBe(0);
    expect(JSON.stringify(board)).toBe(before);
    assertState(after);
    METRICS.lineClearFixtures++;
  });
});

describe("I 7-bag exact distribution, drought bound, RNG repeatability", () => {
  it.each(Array.from({ length: 100 }, (_, seed) => seed))("100 bags × 7 pieces for seed %i", (seed) => {
    const random = createSeededRandom(seed);
    const replay = createSeededRandom(seed);
    let queue: readonly TetrominoType[] = refillQueue([], random);
    let twin: readonly TetrominoType[] = refillQueue([], replay);
    const counts = Object.fromEntries(ALL_TETROMINO_TYPES.map((type) => [type, 0]));
    const lastSeen = new Map<TetrominoType, number>();
    for (let bagIndex = 0; bagIndex < 100; bagIndex++) {
      const bag: TetrominoType[] = [];
      for (let i = 0; i < 7; i++) {
        freeze(queue);
        const before = JSON.stringify(queue);
        const next = takeNextPiece(queue, random);
        const other = takeNextPiece(twin, replay);
        expect(next, `seed=${seed} bag=${bagIndex} index=${i}`).toEqual(other);
        expect(JSON.stringify(queue)).toBe(before);
        expect(next.queue.length).toBeGreaterThanOrEqual(6);
        expect(next.queue.length).toBeLessThanOrEqual(12);
        const index = bagIndex * 7 + i;
        if (lastSeen.has(next.piece)) expect(index - lastSeen.get(next.piece)!).toBeLessThanOrEqual(13);
        lastSeen.set(next.piece, index);
        counts[next.piece]++;
        bag.push(next.piece);
        queue = next.queue;
        twin = other.queue;
        METRICS.pieces++;
      }
      expect([...bag].sort()).toEqual([...ALL_TETROMINO_TYPES].sort());
      METRICS.bags++;
    }
    expect(Object.values(counts)).toEqual(Array(7).fill(100));
    METRICS.bagSeeds++;
  });

  it("uint32 boundary seeds repeat exactly and stay in [0,1)", () => {
    for (const seed of [0, 1, -1, 0x7fffffff, 0x80000000, 0xffffffff]) {
      const first = createSeededRandom(seed);
      const second = createSeededRandom(seed);
      for (let i = 0; i < 10_000; i++) {
        const value = first();
        requireInvariant(Number.isFinite(value) && value >= 0 && value < 1, `seed=${seed} index=${i} out of range`);
        requireInvariant(value === second(), `seed=${seed} index=${i} RNG mismatch`);
        METRICS.rngDraws += 2;
      }
    }
  });
});

afterAll(() => {
  console.log("I_PROPERTY_METRICS " + JSON.stringify({ ...METRICS, elapsedMs: Math.round((performance.now() - STARTED) * 100) / 100, gameActionCap: GAME_CAP, boardCellDomain: "null | I | O | T | S | Z | J | L" }));
});
