import { isDifficultClear, type ScoreEvent } from "../engine";

const BASE = { none: 0, single: 0, double: 1, triple: 2, tetris: 4 } as const;
const SPIN = { none: 0, single: 2, double: 4, triple: 6, tetris: 6 } as const;

/** 입력: 이번 고정 이벤트·고정 전 B2B 체인 / 출력: 과거 1:1 규칙의 공격 줄 수. 다음 체인 상태를 보너스로 오인하지 않는다. */
export function calculateAttackLines(event: ScoreEvent, wasBackToBack: boolean): number {
  if (event.category === "none") return 0;
  const base = event.tSpin === "mini" ? 1 : event.tSpin === "normal" ? SPIN[event.category] : BASE[event.category];
  const combo = event.combo >= 6 ? 3 : event.combo >= 4 ? 2 : event.combo >= 2 ? 1 : 0;
  return base + combo + (wasBackToBack && isDifficultClear(event.category, event.tSpin) ? 1 : 0);
}
