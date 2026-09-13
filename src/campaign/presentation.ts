import type { StageDefinition } from "./stages";

/** 입력: 단계 규칙 / 출력: 추가 HUD 행 없이 표시할 짧은 한국어 모드명. */
export function stageModeLabel(stage: StageDefinition): string {
  switch (stage.kind) {
    case "duel": return stage.isBoss ? "보스 대전" : "AI 대전";
    case "timed": return "타임어택";
    case "survival": return "생존";
    case "mission": return "단일 미션";
    case "combo": return "연속 제거";
    case "limited": return "블록 제한";
    case "dig": case "puzzle": return "장애물 제거";
    default: return "줄 제거";
  }
}
