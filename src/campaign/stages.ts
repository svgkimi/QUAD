import { ALL_TETROMINO_TYPES, BOARD_TOTAL_HEIGHT, BOARD_WIDTH, createEmptyBoard, type Board, type TetrominoType } from "../engine";

export interface StageLayer { readonly rows: number; readonly gap: number; readonly width: number }
export interface StageDefinition {
  readonly id: number;
  readonly chapter: number;
  readonly name: string;
  readonly kind: "lines" | "dig" | "puzzle" | "timed" | "survival" | "duel" | "limited" | "combo";
  readonly difficulty: number;
  readonly isBoss: boolean;
  readonly target: number;
  readonly layers: readonly StageLayer[];
  readonly sequence: readonly TetrominoType[];
  readonly gravityMs: number;
  readonly aiMistakeEvery?: number;
  readonly reverseControls?: boolean;
  readonly pieceLimit?: number;
  readonly limitMs?: number;
  readonly surviveMs?: number;
  readonly pressureMs?: number;
  readonly aiHandicapRows?: number;
  readonly aiLookahead?: boolean;
  readonly aiMoveMs?: number;
  readonly aiHeadStartMs?: number;
}

export const CHAPTER_NAMES = ["첫 도전", "클리어의 리듬", "한 단계 더", "도전의 속도", "마지막 관문"] as const;
type StageSeed = readonly [kind: "lines" | "timed" | "survival" | "duel", amount: number, difficulty: number, obstacleRows: number];

// 목표량/제한 시간은 승인된 50개 설계. 난이도 별점은 실기기 밸런스 검증 전의 목표치다.
const CONTENT: readonly StageSeed[] = [
  ["lines",3,0.5,0],
  ["lines",4,0.5,0],
  ["timed",4,0.5,0],
  ["lines",5,1,0],
  ["duel",0,1,0],
  ["lines",5,1,0],
  ["timed",5,1,0],
  ["lines",6,1,2],
  ["timed",6,1,0],
  ["duel",0,1.5,0],
  ["lines",7,1,0],
  ["timed",7,1.5,0],
  ["lines",8,1.5,2],
  ["survival",75,1.5,0],
  ["duel",0,1.5,0],
  ["lines",8,1.5,0],
  ["timed",8,1.5,0],
  ["lines",9,1.5,3],
  ["timed",9,2,0],
  ["duel",0,2,0],
  ["lines",10,1.5,0],
  ["timed",10,2,0],
  ["survival",90,2,0],
  ["lines",10,2,3],
  ["duel",0,2,0],
  ["lines",12,2,0],
  ["timed",11,2,0],
  ["lines",12,2.5,4],
  ["timed",12,2.5,0],
  ["duel",0,3,0],
  ["lines",12,2.5,0],
  ["timed",13,2.5,0],
  ["survival",90,2.5,0],
  ["lines",14,3,4],
  ["duel",0,3,0],
  ["lines",14,2.5,0],
  ["timed",14,3,0],
  ["lines",15,3,5],
  ["timed",15,3,0],
  ["duel",0,3.5,0],
  ["lines",15,3,0],
  ["timed",15,3,0],
  ["survival",105,3.5,0],
  ["lines",16,3.5,5],
  ["duel",0,3.5,0],
  ["lines",16,3,0],
  ["timed",17,3.5,0],
  ["lines",18,3.5,6],
  ["timed",18,4,0],
  ["duel",0,4,0],
];
const GRAVITY: Readonly<Record<number, number>> = { .5: 1000, 1: 850, 1.5: 650, 2: 450, 2.5: 300, 3: 190, 3.5: 120, 4: 65 };
const AI_PROFILES = [
  { aiMoveMs: 1800, aiMistakeEvery: 5 }, { aiMoveMs: 1600, aiMistakeEvery: 7 },
  { aiMoveMs: 1650, aiMistakeEvery: 7 }, { aiMoveMs: 1400, aiMistakeEvery: 9 },
  { aiMoveMs: 1450, aiMistakeEvery: 9 }, { aiMoveMs: 1150, aiMistakeEvery: 12 },
  { aiMoveMs: 1200, aiMistakeEvery: 12 }, { aiMoveMs: 950, aiMistakeEvery: 0 },
  { aiMoveMs: 1000, aiMistakeEvery: 0 }, { aiMoveMs: 750, aiMistakeEvery: 0 },
] as const;

/** 입력: 장애물 높이 / 출력: 특정 블록 하나를 기다리지 않는 넓은 4칸 통로의 시작 층. */
function obstacleLayers(rows: number): readonly StageLayer[] {
  return rows ? [{ rows, gap: 3, width: 4 }] : [];
}
export const STAGES: readonly StageDefinition[] = CONTENT.map(([kind, amount, difficulty, rows], index) => {
  const id = index + 1, chapter = Math.floor(index / 10) + 1, isBoss = id % 10 === 0;
  const name = kind === "duel" ? `${chapter}장 ${isBoss ? "보스" : "라이벌"}`
    : kind === "survival" ? `${amount}초 생존` : kind === "timed" ? `120초 · ${amount}줄` : `${amount}줄 제거`;
  return {
    id, chapter, name, kind, target: kind === "survival" ? 0 : amount, difficulty, isBoss,
    layers: obstacleLayers(rows), sequence: [],
    gravityMs: kind === "survival" ? Math.min(200, GRAVITY[difficulty]) : GRAVITY[difficulty],
    ...(kind === "survival" ? { surviveMs: amount * 1000 } : {}),
    ...(kind === "timed" ? { limitMs: 120000 } : {}),
    ...(kind === "duel" ? { ...AI_PROFILES[id / 5 - 1], aiHeadStartMs: 0, aiHandicapRows: 0, aiLookahead: isBoss } : {}),
  };
});

/** 입력: 스테이지 / 출력: 200단계 공통 척도의 예상 난이도 문자열. */
export function stageDifficulty(stage: StageDefinition): string { return "★ " + stage.difficulty.toFixed(1) + " / 5"; }

/** 입력: 스테이지 번호 / 출력: 정의. 범위를 벗어난 번호는 허용하지 않는다. */
export function getStage(id: number): StageDefinition | undefined { return STAGES.find(stage => stage.id === id); }

/** 입력: 위에서 아래 순서의 준비 블록 층 / 출력: 일반 블록만 사용하는 10×40 보드. */
export function makeStageBoard(stage: StageDefinition): Board {
  const board = createEmptyBoard().map(row => [...row]);
  let y = BOARD_TOTAL_HEIGHT - stage.layers.reduce((n, layer) => n + layer.rows, 0);
  for (const layer of stage.layers) {
    for (let row = 0; row < layer.rows; row++, y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) board[y][x] = x >= layer.gap && x < layer.gap + layer.width ? null : ALL_TETROMINO_TYPES[y % ALL_TETROMINO_TYPES.length];
    }
  }
  return board;
}

/** 입력: 스테이지 / 출력: 시작 전과 HUD에서 공유하는 실제 승리 조건 설명. */
export function stageGoal(stage: StageDefinition): string {
  if (stage.kind === "limited") return `블록 ${stage.pieceLimit}개 안에 준비된 ${stage.target}줄 정리하기`;
  if (stage.kind === "combo") return `블록 ${stage.target}개를 연속으로 줄 지우며 놓기`;
  if (stage.kind === "duel") return "줄을 지워 방해 줄을 보내고 AI 보드를 넘치게 만들기";
  if (stage.kind === "survival") return `${stage.surviveMs! / 1000}초 동안 살아남기`;
  if (stage.kind === "dig" || stage.kind === "puzzle") return `준비된 ${stage.target}줄 모두 정리하기`;
  if (stage.kind === "timed") return `${stage.limitMs! / 1000}초 안에 ${stage.target}줄 지우기`;
  return `${stage.target}줄 지우기`;
}
