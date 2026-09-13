import type { StageDefinition } from "../campaign/stages";
import type { CampaignRun } from "../campaign/session";
import { starRequirements } from "../campaign/stars";

/** 입력: 실제 단계 규칙·선택적 진행 상태 / 출력: 시작/정지/결과에서 같은 기준을 보여주는 별 조건표. */
export function StageCriteria({ stage, run, lines = 0 }: { readonly stage: StageDefinition; readonly run?: CampaignRun | null; readonly lines?: number }) {
  return <div className="space-y-2 text-center">
    <div className="grid grid-cols-3 gap-2" aria-label="별 획득 조건">
      {starRequirements(stage).map((label, index) => <div key={label} className="rounded-xl bg-white/5 px-1 py-3">
        <div className="text-xs font-bold text-amber-200">{index + 1}별</div>
        <div className="mt-1 text-[11px] text-white/80">{label}</div>
      </div>)}
    </div>
    <p className="text-[11px] text-white/65">목표를 달성해야 별을 얻어요.</p>
    {stage.targetCells && <p className="text-xs text-white/80">◇ 표시 블록이 있는 가로줄을 채워 없애세요.</p>}
    {stage.kind === "mission" && <p className="text-xs text-white/80">여러 번 나눠 지운 줄은 합산하지 않아요.</p>}
    {stage.kind === "duel" && <p className="text-xs text-white/80">한 번에 1 / 2 / 3 / 4줄 → 기본 공격 0 / 1 / 2 / 4줄{stage.aiHandicapRows ? ` · AI 시작 방해 ${stage.aiHandicapRows}줄` : ""}</p>}
    {run && <p className="text-xs tabular-nums text-white/80" role="status">현재 기록: {stage.starLines ? `${lines}줄 제거` : `${(run.elapsedMs / 1000).toFixed(1)}초`}</p>}
  </div>;
}
