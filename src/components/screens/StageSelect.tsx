import { useState } from "react";
import { STAGES, type StageDefinition } from "../../campaign/stages";
import { canStartStage } from "../../campaign/access";
import { compactStageGoal } from "../../campaign/stars";
import { StageCriteria } from "../StageCriteria";
import { StageStars } from "../StageStars";
import { Modal } from "./Modal";

/** 입력: 진행·별·시작 콜백 / 출력: 별이 표시된 단계 선택과 간결한 도전 카드. */
export function StageSelect({ completed, stars = {}, ready, error, onRetry, onStart, onClose, developerAccess = false }: {
  readonly completed: number; readonly stars?: Readonly<Record<number, number>>;
  readonly developerAccess?: boolean;
  readonly ready: boolean; readonly error: boolean;
  readonly onRetry: () => void; readonly onStart: (id: number) => void; readonly onClose: () => void;
}) {
  const [selected, setSelected] = useState<StageDefinition | null>(null);
  const count = (id: number) => developerAccess ? 0 : stars[id] ?? (id <= completed ? 1 : 0);
  return <Modal title={selected ? `스테이지 ${selected.id}` : "스테이지"}
    description={developerAccess ? "개발자 연습 · 전체 단계 선택 · 기록 저장 안 함" : selected ? undefined : `클리어 ${completed} / ${STAGES.length} · 획득 별 ${STAGES.reduce((sum, stage) => sum + count(stage.id), 0)} / ${STAGES.length * 3}`}
    onClose={onClose}>
    {!developerAccess && !ready && !error && <p role="status" className="py-4 text-sm text-white/75">기록 불러오는 중…</p>}
    {!developerAccess && error && <div role="status" className="mb-4 rounded-xl border border-amber-200/40 p-3 text-sm text-amber-100">
      {ready ? "저장하지 못했어요. 다시 시도해 주세요." : "기록을 불러오지 못했어요."}
      <button type="button" onClick={onRetry} className="mt-2 min-h-11 w-full rounded-lg border border-amber-200/40">다시 시도</button>
    </div>}
    {selected ? <div className="space-y-5 text-center">
      <div className="py-2">
        <p className="mb-3 text-2xl font-black tracking-tight text-white">{compactStageGoal(selected)}</p>
        <StageStars count={count(selected.id)} size={36} />
      </div>
      <StageCriteria stage={selected} />
      <button type="button" aria-label="이 스테이지 시작" disabled={!canStartStage(selected.id, completed, ready, developerAccess)} onClick={() => onStart(selected.id)} className="min-h-14 w-full rounded-xl bg-cyan-300 font-bold text-black disabled:opacity-40">시작</button>
      <button type="button" onClick={() => setSelected(null)} className="min-h-11 w-full text-sm text-white/75">단계 목록</button>
    </div> : <div className="space-y-5">
      {Array.from({ length: Math.ceil(STAGES.length / 10) }, (_, chapter) => <section key={chapter}>
        <h3 className="mb-2 text-sm font-bold text-white">{chapter + 1}장</h3>
        <div className="grid grid-cols-5 gap-2">{STAGES.slice(chapter * 10, chapter * 10 + 10).map(stage => {
          const done = !developerAccess && stage.id <= completed, unlocked = canStartStage(stage.id, completed, ready, developerAccess);
          return <button key={stage.id} type="button" disabled={!unlocked} aria-describedby={`stage-${stage.id}-stars`} aria-label={`${stage.id}번 ${stage.name}${done ? " 완료" : !unlocked ? " 잠김" : " 도전"}`}
            onClick={() => setSelected(stage)} className={`flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-1 rounded-lg border text-sm font-bold disabled:opacity-35 ${stage.isBoss ? "border-amber-200/50 bg-amber-200/10 text-amber-100" : done ? "border-cyan-200/40 bg-cyan-300/10 text-cyan-100" : "border-white/25 bg-white/5 text-white"}`}>
            <span>{stage.id}</span>
            <StageStars count={count(stage.id)} size={10} />
            <span id={`stage-${stage.id}-stars`} className="sr-only">획득 별 {count(stage.id)} / 3</span>
            <span className="text-[9px] font-medium">{stage.isBoss ? "보스" : stage.kind === "duel" ? "중간 AI" : !unlocked ? "잠김" : "\u00a0"}</span>
          </button>;
        })}</div>
      </section>)}
    </div>}
  </Modal>;
}
