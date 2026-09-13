import { BOARD_BUFFER_HEIGHT, BOARD_TOTAL_HEIGHT, BOARD_WIDTH, checkCollision, nextRandom, type EngineState } from "../engine";

/** 입력: 실제 방어 보드·방해 줄 수·독립 시드 / 출력: 위로 밀린 보드와 넘침 판정. 네트워크와 무관하다. */
export function addGarbage(state: EngineState, count: number, seed: number): { state: EngineState; seed: number } {
  if (state.status !== "playing" || !Number.isInteger(count) || count <= 0) return { state, seed };
  const rows = Math.min(BOARD_TOTAL_HEIGHT, count), random = nextRandom(seed), gap = Math.floor(random.value * BOARD_WIDTH);
  const bottom = Array.from({ length: rows }, () => Array.from({ length: BOARD_WIDTH }, (_, x) => x === gap ? null : "J" as const));
  const board = [...state.board.slice(rows).map(row => [...row]), ...bottom];
  const active = state.active ? { ...state.active, position: { ...state.active.position, y: state.active.position.y - rows } } : null;
  const overflow = state.board.slice(0, rows).some(row => row.some(cell => cell !== null)) || board.slice(0, BOARD_BUFFER_HEIGHT).some(row => row.some(cell => cell !== null)) || !!(active && checkCollision(board, active));
  return { state: { ...state, board, active, status: overflow ? "gameover" : "playing" }, seed: random.state };
}

/** 입력: AI 초반 핸디캡 높이·시드 / 출력: 서버 없이 생성하는 불규칙한 빈칸의 준비 보드. */
export function handicapOpponent(state: EngineState, rows: number, seed: number): EngineState {
  let result = state;
  for (let i = 0; i < rows; i++) {
    const added = addGarbage(result, 1, seed); result = added.state; seed = added.seed;
  }
  // 준비 보드를 만든 뒤 활성 피스는 원래 스폰 위치로 둔다.
  return { ...result, active: state.active };
}

/** 입력: 보드 / 출력: 가시 영역에서 가장 높은 고정 블록의 높이(0~20). */
export function stackHeight(state: EngineState): number {
  const first = state.board.findIndex(row => row.some(cell => cell !== null));
  return first < 0 ? 0 : Math.min(20, BOARD_TOTAL_HEIGHT - first);
}
