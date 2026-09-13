import type { Position } from "../engine";

/** 입력: 목표 칸·실제 제거 행 / 출력: 제거된 목표를 빼고 내려온 칸의 좌표. 일반 줄을 지워도 목표를 임의로 소모하지 않는다. */
export function advanceTargetCells(cells: readonly Position[], cleared: readonly number[]): readonly Position[] {
  if (!cleared.length) return cells;
  return cells.filter(cell => !cleared.includes(cell.y)).map(cell => ({ x: cell.x, y: cell.y + cleared.filter(y => y > cell.y).length }));
}
