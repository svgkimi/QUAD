/**
 * colors.ts
 * -----------------------------------------------------------------------
 * 블록 타입별 렌더링 색상을 정의한다. QUAD 고유의 네온 팔레트이며, 업계 표준 낙하 블록
 * 가이드라인의 색상 배정(I=하늘, O=노랑, T=보라, S=초록, Z=빨강, J=파랑, L=주황)을
 * 의도적으로 사용하지 않는다 - 색상 배정은 저작권 분쟁에서 반복적으로 쟁점이 되어온
 * 요소라, 모든 조각의 색 계열을 독자적으로 다시 배정했다.
 *
 * 색 선택 기준: 7개 색상의 색상환(hue) 간격을 충분히 벌려 빠른 플레이 중에도 조각을
 * 즉시 구분할 수 있게 하고, 어두운 배경(#0a0a0f)에서 네온처럼 발광하도록 채도를 높였다.
 *
 * 순수 상수/유틸 파일이며 UI 렌더링 레이어(Canvas, CSS)에서 공통으로 참조한다.
 * 엔진 로직과는 무관한 "표현(presentation)" 전용 데이터.
 */

import type { BoardCell, TetrominoType } from "../engine";

/** 블록 타입별 기본(면) 색상 - I=네온로즈, O=바이올렛, T=라임, S=오렌지, Z=틸, J=옐로, L=스카이 */
export const TETROMINO_COLORS: Record<TetrominoType, string> = {
  I: "#ff2d78",
  O: "#8b5cf6",
  T: "#a3e635",
  S: "#fb923c",
  Z: "#2dd4bf",
  J: "#fde047",
  L: "#38bdf8",
};

/** 블록 타입별 강조(테두리/글로우) 색상 - 기본색보다 밝게 */
export const TETROMINO_GLOW_COLORS: Record<TetrominoType, string> = {
  I: "#ff8fb4",
  O: "#c4b5fd",
  T: "#d9f99d",
  S: "#fed7aa",
  Z: "#99f6e4",
  J: "#fef9c3",
  L: "#bae6fd",
};

/**
 * 대전(versus) 모드에서 상대에게 공격받아 올라오는 "GARBAGE" 셀 전용 색상.
 * TetrominoType이 아니므로 위 TETROMINO_COLORS/TETROMINO_GLOW_COLORS(Record<TetrominoType, string>)에는
 * 포함할 수 없어 별도 상수로 분리한다 (회색 계열, 다른 테트리미노와 명확히 구분).
 */
export const GARBAGE_COLOR = "#6b7280";
export const GARBAGE_GLOW_COLOR = "#9ca3af";

/**
 * 보드 셀(BoardCell) 하나의 렌더링 색상(면/글로우)을 조회한다.
 * "GARBAGE"는 별도 회색 상수를, 나머지 테트리미노 타입은 기존 색상 테이블을 사용한다.
 * 입력: cell(BoardCell, null이 아니어야 함) / 출력: { color, glow }
 */
export function getCellColors(cell: Exclude<BoardCell, null>): { color: string; glow: string } {
  if (cell === "GARBAGE") {
    return { color: GARBAGE_COLOR, glow: GARBAGE_GLOW_COLOR };
  }
  return { color: TETROMINO_COLORS[cell], glow: TETROMINO_GLOW_COLORS[cell] };
}

/**
 * 16진수 색상 문자열을 rgba() 문자열로 변환한다. (반투명 렌더링용)
 * 입력: hex(#rrggbb 형태), alpha(0~1) / 출력: rgba(r,g,b,a) 문자열
 */
export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
