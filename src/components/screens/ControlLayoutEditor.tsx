import { useEffect, useRef, useState } from "react";
import { CONTROL_IDS, CONTROL_LABELS, controlPositionStyle, defaultControlLayout, isControlLayoutUsable, type ControlId, type ControlLayout } from "../../lib/controlLayout";
import { CONTROL_BUTTON_CLASS, ControlGlyph } from "../TouchControls";
import { useModalFocus } from "./Modal";
import { GameBoard } from "../GameBoard";
import { createInitialState, type Board } from "../../engine";
const EMPTY_BOARD = createInitialState({ seed: 0 }).board;

/** 입력: 저장된 배치·저장/닫기 콜백 / 출력: 실제 입력과 분리된 드래그 편집 화면. */
export function ControlLayoutEditor({ layout, ready, loadError, onSave, onClose, board = EMPTY_BOARD }: {
  readonly board?: Board;
  readonly layout: ControlLayout | null; readonly ready: boolean; readonly loadError: boolean;
  readonly onSave: (layout: ControlLayout | null) => Promise<boolean>; readonly onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<ControlLayout | null>(layout);
  const [selected, setSelected] = useState<ControlId>("hold");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const dragging = useRef<{ id: ControlId; pointer: number; dx: number; dy: number } | null>(null);
  useModalFocus(root, () => { if (!busy) onClose(); });
  useEffect(() => {
    if (layout) { setDraft(layout); return; }
    const area = stage.current;
    if (!area) return;
    const box = area.getBoundingClientRect();
    const w = Math.max(64, Math.min(80, window.innerWidth * .18)), h = Math.max(48, Math.min(64, window.innerHeight * .07));
    if (box.width && box.height) setDraft(defaultControlLayout(box.width, box.height, w, h));
  }, [layout]);
  useEffect(() => {
    const cancel = () => { dragging.current = null; };
    window.addEventListener("blur", cancel); document.addEventListener("visibilitychange", cancel);
    window.addEventListener("resize", cancel);
    return () => { cancel(); window.removeEventListener("blur", cancel); document.removeEventListener("visibilitychange", cancel); window.removeEventListener("resize", cancel); };
  }, []);

  /** 입력: 기본 복원 여부 / 출력: 겹침 검사 후 저장. 실패 시 편집을 유지한다. */
  const save = async (reset = false) => {
    if (busy || !ready || (!reset && !draft)) return;
    if (!reset) {
      const rects = [...stage.current!.querySelectorAll("button")].map(el => el.getBoundingClientRect());
      if (rects.some((a, i) => rects.slice(i + 1).some(b => a.left < b.right + 6 && a.right + 6 > b.left && a.top < b.bottom + 6 && a.bottom + 6 > b.top))) {
        setError("버튼 사이를 조금 더 띄워 주세요. 서로 겹치면 잘못 눌릴 수 있어요."); return;
      }
    }
    setBusy(true); setError("");
    try {
      if (await onSave(reset ? null : draft)) onClose();
      else setError("배치를 저장하지 못했어요. 다시 저장하거나 취소해 주세요.");
    } catch { setError("배치를 저장하지 못했어요. 다시 시도해 주세요."); }
    finally { setBusy(false); }
  };

  return <div ref={root} role="dialog" aria-modal="true" aria-labelledby="control-layout-title" tabIndex={-1}
    className="fixed inset-0 z-[120] flex flex-col bg-[#0a0a0f] px-[max(6px,env(safe-area-inset-left),var(--ait-safe-left,0px))] pb-[max(8px,env(safe-area-inset-bottom),var(--ait-safe-bottom,0px))] pt-[max(8px,env(safe-area-inset-top),var(--ait-safe-top,0px))] text-white">
    <header className="flex shrink-0 items-center justify-between gap-3">
      <div><h2 id="control-layout-title" className="text-lg font-bold">버튼 배치</h2><p className="text-xs text-white/65">아래 조작 영역에서 버튼을 옮겨 주세요.</p></div>
      <button type="button" disabled={busy} onClick={onClose} className="min-h-11 px-3 text-sm text-white/80">취소</button>
    </header>
    {!ready && <p role="status" className="text-xs text-white/65">저장된 배치를 불러오는 중이에요.</p>}
    {loadError && <p className="text-xs text-amber-200">기존 배치를 읽지 못했어요. 저장하면 새 배치로 바뀌어요.</p>}
    <div className="relative my-2 min-h-0 flex-1 px-11" data-testid="protected-board-region">
      <GameBoard board={board} active={null} ghost={null} status="ready" lastScoreEvent={null} hardDropTrail={null} shake={null} responsive />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><p className="rounded-lg bg-black/90 px-3 py-2 text-center text-xs text-white/80">게임판 미리보기<br />버튼을 놓을 수 없는 영역</p></div>
    </div>
    <div className="mb-2 shrink-0 rounded-lg bg-white/5 px-3 py-2">
      <div className="flex items-center justify-between text-xs"><label htmlFor="control-size">{CONTROL_LABELS[selected]} 크기</label><output>{Math.round((draft?.[selected].scale ?? 1) * 100)}%</output></div>
      <input id="control-size" type="range" min="80" max="125" step="5" value={Math.round((draft?.[selected].scale ?? 1) * 100)} disabled={!ready || busy || !draft}
        className="h-11 w-full accent-cyan-300" onChange={event => {
          if (!draft || !stage.current) return;
          const next = { ...draft, [selected]: { ...draft[selected], scale: Number(event.target.value) / 100 } };
          const b = stage.current.getBoundingClientRect();
          const w = Math.max(64, Math.min(80, window.innerWidth * .18)), h = Math.max(48, Math.min(64, window.innerHeight * .07));
          if (isControlLayoutUsable(next, b.width, b.height, w, h)) { setDraft(next); setError(""); }
          else setError("이 크기는 공간이 부족해요. 버튼 간격을 조절하거나 크기를 줄여 주세요.");
        }} />
      <p className="text-[11px] text-white/60">버튼 선택 → 크기 조절 · 최소 터치 영역 44px</p>
    </div>
    <div ref={stage} data-testid="control-editor-stage" className="control-editor-pad relative mb-2 shrink-0 overflow-hidden rounded-xl bg-cyan-300/[0.035] ring-1 ring-inset ring-cyan-200/30">
      {CONTROL_IDS.map(id => <button key={id} type="button" aria-label={`${CONTROL_LABELS[id]} 위치`} disabled={!ready || busy}
        aria-pressed={selected === id} onClick={() => setSelected(id)}
        className={CONTROL_BUTTON_CLASS + (selected === id ? " ring-2 ring-cyan-200" : "") + " touch-none cursor-grab focus-visible:cursor-move active:cursor-grabbing"}
        style={controlPositionStyle(draft?.[id] ?? { x: 0.5, y: 0.85 })}
        onPointerDown={event => {
          if (dragging.current || event.button > 0 || !draft) return;
          event.preventDefault(); setSelected(id); event.currentTarget.focus(); event.currentTarget.setPointerCapture?.(event.pointerId);
          const b = event.currentTarget.getBoundingClientRect();
          dragging.current = { id, pointer: event.pointerId, dx: event.clientX - (b.left + b.width / 2), dy: event.clientY - (b.top + b.height / 2) };
          setError("");
        }}
        onPointerMove={event => {
          const drag = dragging.current;
          if (!drag || drag.id !== id || drag.pointer !== event.pointerId) return;
          const b = stage.current!.getBoundingClientRect(), k = event.currentTarget.getBoundingClientRect();
          const x = Math.max(k.width / 2 + 6, Math.min(b.width - k.width / 2 - 6, event.clientX - b.left - drag.dx));
          const y = Math.max(k.height / 2 + 6, Math.min(b.height - k.height / 2 - 6, event.clientY - b.top - drag.dy));
          if (b.width && b.height) setDraft(prev => prev ? { ...prev, [id]: { ...prev[id], x: x / b.width, y: y / b.height } } : prev);
        }}
        onPointerUp={event => { if (dragging.current?.pointer === event.pointerId) dragging.current = null; }}
        onPointerCancel={() => { dragging.current = null; }} onLostPointerCapture={() => { dragging.current = null; }}
        onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
          event.preventDefault(); event.stopPropagation();
          setDraft(prev => prev ? { ...prev, [id]: { ...prev[id], x: Math.max(0, Math.min(1, prev[id].x + (event.key === "ArrowRight" ? .02 : event.key === "ArrowLeft" ? -.02 : 0))), y: Math.max(0, Math.min(1, prev[id].y + (event.key === "ArrowDown" ? .02 : event.key === "ArrowUp" ? -.02 : 0))) } } : prev);
        }}><ControlGlyph id={id} /></button>)}
    </div>
    {error && <p role="alert" className="mb-2 text-xs text-amber-200">{error}</p>}
    <footer className="flex shrink-0 gap-3">
      <button type="button" disabled={busy || !ready} onClick={() => { void save(true); }} className="min-h-12 flex-1 rounded-xl border border-white/25 text-sm disabled:opacity-40">기본 배치 복원</button>
      <button type="button" disabled={busy || !ready || !draft} onClick={() => { void save(); }} className="min-h-12 flex-1 rounded-xl bg-cyan-300 text-sm font-bold text-black disabled:opacity-40">{busy ? "저장 중…" : "배치 저장"}</button>
    </footer>
  </div>;
}
