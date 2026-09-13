import { ALL_TETROMINO_TYPES, BOARD_TOTAL_HEIGHT, BOARD_WIDTH, createEmptyBoard, type Board, type Position, type TetrominoType } from "../engine";

export interface StageLayer { readonly rows: number; readonly gap: number; readonly width: number }
export interface StageDefinition {
  readonly id: number;
  readonly chapter: number;
  readonly name: string;
  readonly kind: "lines" | "dig" | "puzzle" | "timed" | "survival" | "duel" | "limited" | "combo" | "mission";
  readonly targetCells?: readonly Position[];
  /** 생존의 2/3별 줄 수. 완료 시간 자체는 모두 같으므로 플레이 성과를 평가한다. */
  readonly starLines?: readonly [number, number];
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
type StageSeed = readonly [goal: "lines" | "targets" | "mission" | "survival" | "duel", amount: number, difficulty: number, obstacleRows: number, seconds: number];

// 규칙 확장 v2: 생존/대전/타임어택/학습 미션. .5~4는 200단계 척도의 목표치이며 인간 검증 전이다.
const CONTENT: readonly StageSeed[] = [
  ["lines",3,.5,0,150], ["lines",4,.5,0,150], ["mission",2,.5,2,150], ["lines",5,1,0,150], ["duel",0,1,0,180],
  ["targets",4,1,2,150], ["lines",5,1,0,140], ["targets",4,1,3,145], ["lines",6,1,0,130], ["duel",0,1.5,0,180],
  ["lines",6,1,0,140], ["mission",4,1.5,4,180], ["targets",6,1.5,3,140], ["survival",60,1.5,0,60], ["duel",0,1.5,0,175],
  ["targets",4,1.5,3,130], ["lines",8,1.5,0,135], ["targets",6,1.5,4,135], ["lines",9,2,0,125], ["duel",0,2,0,170],
  ["lines",8,1.5,0,135], ["lines",10,2,0,130], ["survival",75,2,0,75], ["targets",6,2,4,125], ["duel",0,2,0,170],
  ["targets",6,2,4,130], ["lines",11,2,0,125], ["targets",8,2.5,5,120], ["lines",12,2.5,0,120], ["duel",0,3,0,165],
  ["targets",6,2.5,4,130], ["lines",13,2.5,0,120], ["survival",80,2.5,0,80], ["targets",8,3,5,115], ["duel",0,3,0,160],
  ["targets",8,2.5,5,125], ["lines",14,3,0,115], ["targets",10,3,6,115], ["lines",15,3,0,110], ["duel",0,3.5,0,155],
  ["targets",8,3,5,120], ["lines",15,3,0,115], ["survival",90,3.5,0,90], ["targets",10,3.5,6,110], ["duel",0,3.5,0,150],
  ["targets",8,3,5,115], ["lines",17,3.5,0,110], ["targets",12,3.5,7,110], ["lines",18,4,0,105], ["duel",0,4,0,150],
];
const GRAVITY: Readonly<Record<number, number>> = { .5: 1000, 1: 850, 1.5: 650, 2: 450, 2.5: 300, 3: 190, 3.5: 120, 4: 65 };
const AI_PROFILES = [
  { aiMoveMs: 3200, aiMistakeEvery: 3, aiHandicapRows: 3 }, { aiMoveMs: 2600, aiMistakeEvery: 5, aiHandicapRows: 0 },
  { aiMoveMs: 2800, aiMistakeEvery: 4, aiHandicapRows: 2 }, { aiMoveMs: 2200, aiMistakeEvery: 7, aiHandicapRows: 0 },
  { aiMoveMs: 2350, aiMistakeEvery: 5, aiHandicapRows: 1 }, { aiMoveMs: 1800, aiMistakeEvery: 9, aiHandicapRows: 0 },
  { aiMoveMs: 1950, aiMistakeEvery: 7, aiHandicapRows: 0 }, { aiMoveMs: 1450, aiMistakeEvery: 0, aiHandicapRows: 0 },
  { aiMoveMs: 1600, aiMistakeEvery: 9, aiHandicapRows: 0 }, { aiMoveMs: 1150, aiMistakeEvery: 0, aiHandicapRows: 0 },
] as const;

/** 입력: 장애물 높이·단계 번호 / 출력: 네 칸 통로를 좌우에 배치한 시작 층. 중앙 DROP만으로 정리되지 않는다. */
function obstacleLayers(rows: number, id: number): readonly StageLayer[] {
  return rows ? [{ rows, gap: [1, 4, 2, 5][(id - 1) % 4], width: 4 }] : [];
}
export const STAGES: readonly StageDefinition[] = CONTENT.map(([goal, amount, difficulty, rows, seconds], index) => {
  const id = index + 1, chapter = Math.floor(index / 10) + 1, isBoss = id % 10 === 0;
  const kind = goal === "lines" || goal === "targets" ? "timed" : goal;
  const targetCells = goal === "targets" ? Array.from({ length: amount }, (_, n) => ({ x: n % 2 ? 9 : 0, y: 39 - Math.floor(n / 2) })) : undefined;
  const layers = goal === "mission" ? [{ rows, gap: 1, width: amount === 2 ? 2 : 1 }] : obstacleLayers(rows, id);
  const name = kind === "duel" ? `${chapter}장 ${isBoss ? "보스" : "라이벌"}`
    : kind === "survival" ? `${amount}초 생존` : kind === "mission" ? `한 번에 ${amount}줄` : targetCells ? `목표 블록 ${amount}개` : `${amount}줄 제거`;
  return {
    id, chapter, name, kind, target: kind === "survival" ? 0 : amount, difficulty, isBoss,
    layers, sequence: [], targetCells,
    gravityMs: kind === "survival" ? Math.min(200, GRAVITY[difficulty]) : GRAVITY[difficulty],
    ...(kind === "survival" ? { surviveMs: amount * 1000, starLines: [Math.ceil(amount / 10), Math.ceil(amount / 6)] as const } : { limitMs: seconds * 1000 }),
    ...(kind === "duel" ? { ...AI_PROFILES[id / 5 - 1], aiHeadStartMs: 0, aiLookahead: isBoss } : {}),
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
  if (stage.kind === "mission") return `${stage.limitMs! / 1000}초 안에 한 번에 ${stage.target}줄 이상 지우기`;
  if (stage.targetCells) return `${stage.limitMs! / 1000}초 안에 ◇ 표시 블록 ${stage.target}개 모두 제거하기`;
  if (stage.kind === "limited") return `블록 ${stage.pieceLimit}개 안에 준비된 ${stage.target}줄 정리하기`;
  if (stage.kind === "combo") return `블록 ${stage.target}개를 연속으로 줄 지우며 놓기`;
  if (stage.kind === "duel") return `${stage.limitMs ? `${stage.limitMs / 1000}초 안에 ` : ""}줄을 지워 방해 줄을 보내고 AI 보드를 넘치게 만들기`;
  if (stage.kind === "survival") return `${stage.surviveMs! / 1000}초 동안 살아남기`;
  if (stage.kind === "dig" || stage.kind === "puzzle") return `준비된 ${stage.target}줄 모두 정리하기`;
  if (stage.kind === "timed") return `${stage.limitMs! / 1000}초 안에 ${stage.target}줄 지우기`;
  return `${stage.target}줄 지우기`;
}
