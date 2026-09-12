import { DirectionIcon, RotateIcon } from "../TouchControls";
import { Modal } from "./Modal";

/** 입력: 터치/키보드 구분·종료 콜백 / 출력: 실제 패드 위치와 SVG를 공유하는 안내. */
export function ControlsGuide({ isMobile, onClose }: { readonly isMobile: boolean; readonly onClose: () => void }) {
  const key = "flex h-11 min-w-12 items-center justify-center rounded-lg border border-white/30 bg-white/5 text-xs font-bold";
  return <Modal title="조작 안내" description="가로줄을 빈칸 없이 채우면 사라져요." onClose={onClose}>
    {isMobile ? <>
      <div className="mb-3 flex justify-between gap-4" aria-label="기본 조작 패드 배치">
        <div className="grid grid-cols-2 gap-2"><span className={`${key} col-span-2 justify-self-center px-3 text-violet-200`}>HOLD</span><span className={`${key} text-cyan-100`}><DirectionIcon direction="left" /><span className="sr-only">왼쪽</span></span><span className={`${key} text-cyan-100`}><DirectionIcon direction="right" /><span className="sr-only">오른쪽</span></span></div>
        <div className="grid grid-cols-2 gap-2"><span className={`${key} col-span-2 justify-self-center text-indigo-100`}><DirectionIcon direction="down" /><span className="sr-only">내리기</span></span><span className={`${key} text-amber-100`}><RotateIcon /><span className="sr-only">회전</span></span><span className={`${key} text-rose-100`}>DROP</span></div>
      </div>
      <p className="mb-2 text-xs text-white/60">기본 배치예요. 게임 설정에서 버튼 위치를 바꿀 수 있어요.</p>
      <dl className="divide-y divide-white/10">
        {[
          { name: "좌우 이동", icon: <span className="flex"><DirectionIcon direction="left" /><DirectionIcon direction="right" /></span>, text: "길게 누르면 계속 이동해요." },
          { name: "회전", icon: <RotateIcon />, text: "한 번 누르면 시계 방향으로 돌아요." },
          { name: "빠르게 내리기", icon: <DirectionIcon direction="down" />, text: "누르는 동안 더 빠르게 내려요." },
          { name: "즉시 낙하", icon: "DROP", text: "바로 떨어뜨려 고정해요." },
          { name: "보관 / 교체", icon: "HOLD", text: "고정 전 한 번, 블록을 보관하거나 바꿔요." },
        ].map(item => <div key={item.name} className="flex items-center gap-3 py-3">
          <dt className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/5 text-[10px] font-bold tracking-wide text-white">
            <span aria-hidden="true">{item.icon}</span><span className="sr-only">{item.name}</span>
          </dt>
          <dd className="min-w-0"><span className="block text-sm font-semibold text-white">{item.name}</span><span className="mt-0.5 block text-xs leading-relaxed text-white/65">{item.text}</span></dd>
        </div>)}
      </dl>
    </> : <dl className="space-y-2 text-sm text-white/85">{[
      ["← / →", "이동 (길게 누르기 가능)"], ["↓", "빠르게 내리기"], ["Space", "즉시 낙하·고정"],
      ["↑ / X", "시계 방향 회전"], ["Z", "반시계 회전"], ["A", "180도 회전"],
      ["C / Shift", "HOLD (고정 전 한 번)"], ["Esc / P", "일시정지"],
    ].map(([keys, action]) => <div key={keys} className="flex justify-between gap-3"><dt className="font-mono">{keys}</dt><dd>{action}</dd></div>)}</dl>}
    <p className="mt-4 text-xs text-white/75">윤곽선(ghost)은 블록이 떨어질 위치예요. 일시정지에서 안내를 다시 볼 수 있어요.</p>
  </Modal>;
}
