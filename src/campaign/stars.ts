import type { EngineState } from "../engine";
import { getCampaignRun } from "./session";
import type { StageDefinition } from "./stages";

/** 입력: 스테이지 / 출력: 2·3별의 상한. UI와 실제 판정이 같은 기준을 쓴다. */
export function starThresholds(stage: StageDefinition): readonly [number, number] {
  if (stage.kind === "survival") return [Math.floor(stage.surviveMs! * .2), Math.floor(stage.surviveMs! * .05)];
  if (stage.kind === "duel") return [120000, 75000];
  if (stage.limitMs) return [Math.floor(stage.limitMs * 2 / 3 / 1000) * 1000, Math.floor(stage.limitMs * .45 / 1000) * 1000];
  const preparedCells = stage.layers.reduce((sum, layer) => sum + layer.rows * (10 - layer.width), 0);
  const minimum = Math.max(1, (stage.target * 10 - preparedCells) / 4);
  return [Math.ceil(minimum * 1.8) + 3, Math.ceil(minimum * 1.4) + 2];
}

/** 입력: 해당 스테이지의 종료 상태 / 출력: 실패0, 클리어1~3별. 정지 시간은 엔진에서 제외된다. */
export function earnedStageStars(stage: StageDefinition, state: EngineState): number {
  const run = getCampaignRun(state);
  if (!run || run.stageId !== stage.id || run.outcome !== "cleared") return 0;
  const value = stage.kind === "survival" ? run.dangerMs : stage.kind === "lines" ? run.piecesUsed : run.elapsedMs;
  const [two, three] = starThresholds(stage);
  return value <= three ? 3 : value <= two ? 2 : 1;
}

/** 입력: 스테이지 / 출력: 시작 전 별 조건의 짧은 라벨. */
export function starRequirements(stage: StageDefinition): readonly string[] {
  return ["클리어", ...starThresholds(stage).map(value => stage.kind === "survival" ? `위험 ${value / 1000}초 이하` : stage.kind === "lines" ? `${value}개 이내` : `${value / 1000}초 이내`)];
}

/** 입력: 스테이지 / 출력: 문단 없이 표시하는 목표. */
export function compactStageGoal(stage: StageDefinition): string {
  if (stage.kind === "duel") return "AI 보드 넘치게 하기";
  if (stage.kind === "survival") return `${stage.surviveMs! / 1000}초 생존`;
  return `${stage.target}줄 제거${stage.limitMs ? ` · ${stage.limitMs / 1000}초` : ""}`;
}
