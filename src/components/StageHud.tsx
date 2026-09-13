import { memo } from "react";
import type { EngineState } from "../engine";
import type { CampaignRun } from "../campaign/session";
import { STAGES, type StageDefinition } from "../campaign/stages";
import { stageModeLabel } from "../campaign/presentation";
import { TETROMINO_COLORS } from "../lib/colors";
import { stackHeight } from "../campaign/garbage";
import { previewStageStars } from "../campaign/stars";
import { StageStars } from "./StageStars";

/** 입력: 목표·플레이어·AI 진행 / 출력: 점수 HUD 자리를 재사용하는 작은 목표 표시. */
export function StageHud({ stage, run, lines, onShowCriteria }: { readonly stage: StageDefinition; readonly run: CampaignRun | null; readonly lines: number; readonly onShowCriteria?: () => void }) {
  const progress = !run ? 0 : stage.targetCells ? stage.target - run.targetCells.length : stage.kind === "mission" ? run.bestClear : stage.kind === "combo" ? run.streak : stage.kind === "dig" || stage.kind === "puzzle" || stage.kind === "limited" ? stage.target - run.targetRows.length : lines;
  const seconds = Math.ceil(Math.max(0, (stage.limitMs ?? stage.surviveMs ?? 0) - (run?.elapsedMs ?? 0)) / 1000);
  const content = <div className="text-center leading-tight" aria-label={`스테이지 ${stage.id} 진행`}>
    <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-white/80"><span>{stage.id} / {STAGES.length} · {stageModeLabel(stage)}</span><StageStars count={previewStageStars(stage, run, lines)} size={8} label={`목표 달성 시 예상 ${previewStageStars(stage, run, lines)}별`} /></div>
    <div className="mt-1 whitespace-nowrap text-lg font-black tabular-nums text-white">
      {stage.kind === "duel" ? <span aria-label={`AI 블록 높이 ${run?.ai ? stackHeight(run.ai) : stage.aiHandicapRows ?? 0} / 20`}>AI {run?.ai ? stackHeight(run.ai) : stage.aiHandicapRows ?? 0}/20</span>
        : stage.kind === "survival" ? `${seconds}초` : `${stage.targetCells ? "◇ " : ""}${Math.min(stage.target, progress)} / ${stage.target}${stage.targetCells ? "개" : "줄"}`}
      {stage.limitMs && <span className="ml-1 text-xs font-semibold text-amber-200">{seconds}초</span>}
    </div>
  </div>;
  return onShowCriteria ? <button type="button" onClick={onShowCriteria} aria-label="목표와 별 조건 보기" className="min-h-11 min-w-0 rounded-lg px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200">{content}</button> : content;
}

/** 입력: AI가 실제 고정한 보드 / 출력: NEXT 레일 아래의 보조 미니 보드. */
export const OpponentPreview = memo(function OpponentPreview({ ai }: { readonly ai: EngineState }) {
  return <div className="mt-1 w-9" aria-label={`AI 보드, ${ai.totalLinesCleared}줄 제거`}>
    <div className="mb-1 text-center text-[8px] font-bold text-amber-200">AI</div>
    <div className="grid aspect-[1/2] grid-cols-10 overflow-hidden rounded border border-white/30 bg-black/60" aria-hidden="true">
      {ai.board.slice(-20).flat().map((cell, index) => <span key={index} style={{ backgroundColor: cell ? TETROMINO_COLORS[cell] : "transparent" }} />)}
    </div>
  </div>;
});
