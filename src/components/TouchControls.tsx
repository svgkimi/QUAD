/**
 * TouchControls.tsx
 * -----------------------------------------------------------------------
 * 모바일(터치) 환경 전용 가상 게임패드. 데스크톱 키보드 입력(useGameEngine의
 * 키 리스너)과는 완전히 분리된 별도 입력 경로이며, 엔진 로직은 건드리지 않고
 * useGameEngine이 노출하는 `dispatch` / `triggerHardDrop`만 사용한다.
 *
 * 배치: 좌우 각각 3키 방향키 클러스터를 둔다. 왼쪽은 상단 홀드 + 하단 좌/우,
 * 오른쪽은 상단 소프트드롭 + 하단 회전/하드드롭이다. HOLD/DROP은 영문, 나머지는 SVG다.
 *
 * - 좌/우 이동, 소프트드롭: pointerdown 동안 DAS(최초 지연 후) + ARR(반복 간격)로 자동 반복한다.
 *   (useGameEngine의 키보드 DAS_DELAY_MS=150 / ARR_INTERVAL_MS=35와 동일한 값을 사용해
 *   키보드와 터치의 조작감을 통일한다.)
 * - 하드드롭/회전(시계 방향 1개만 제공)/홀드: pointerdown 시 1회만 발동.
 * - 모든 버튼은 touch-action: none + preventDefault로 스크롤/더블탭 확대/컨텍스트 메뉴를 막는다.
 * - 첫 입력에서 토스/자체 iOS 컨테이너/지원 웹 호스트에 짧은 햅틱을 요청한다.
 *   미지원 호스트에서는 눌림 표시와 기존 효과음만 제공한다. 자동 반복은 진동시키지 않는다.
 * - 일시정지 버튼은 여기 없다 - 상단 HUD 바로 옮겨졌다(호출부인 SinglePlayerApp 참고).
 * - 사용자 배치는 게임판 아래 패드 영역에만 배치한다. 게임판 크기는 유지한다.
 *
 * 입력: TouchControlsProps(엔진 dispatch류 콜백, 현재 상태) / 출력: 터치 버튼 레이아웃 JSX
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { EngineAction, GameStatus } from "../engine";
import type { SoundEffects } from "../hooks/useSound";
import { playGameHaptic, type GameHaptic } from "../lib/haptics";
import { CONTROL_LABELS, controlPositionStyle, isControlLayoutUsable, type ControlId, type ControlLayout } from "../lib/controlLayout";

/** 최초 입력 후 자동 반복이 시작되기까지의 지연시간(ms). useGameEngine의 DAS_DELAY_MS와 동일 */
const DAS_DELAY_MS = 150;
/** 자동 반복 간격(ms). useGameEngine의 ARR_INTERVAL_MS와 동일 */
const ARR_INTERVAL_MS = 35;

/** TouchControls 컴포넌트 props */
export interface TouchControlsProps {
  /** 임의의 엔진 액션을 전달한다 (이동/회전/홀드 등) */
  readonly dispatch: (action: EngineAction) => void;
  /** 하드드롭 전용 함수 (잔상 이펙트 + 효과음 포함, 키보드 Space와 동일 동작) */
  readonly triggerHardDrop: () => void;
  /** 현재 게임 상태 - "playing"이 아니면(일시정지/게임오버) 버튼을 비활성화한다 */
  readonly status: GameStatus;
  /** 버튼 탭에 맞춰 재생할 효과음 (없으면 무음) */
  readonly sounds?: SoundEffects;
  readonly canHold?: boolean;
  readonly layout?: ControlLayout | null;
}

/** 자동 반복(DAS/ARR) 대상이 되는 액션 종류 */
type RepeatableAction = "MOVE_LEFT" | "MOVE_RIGHT" | "SOFT_DROP";

/**
 * 눌러서 즉시 1회 실행 + 누르고 있으면 자동 반복되는 버튼 하나를 구현하는 내부 훅.
 * 최초 pointerdown 시 한 번만 진동시킨다(ARR로 반복될 때마다 울리면 부저처럼 거슬린다).
 * 입력: 반복 시작/1회 실행 콜백 / 출력: pointerdown/up/leave/cancel에 바인딩할 핸들러
 */
function useHoldRepeat(fire: (isFirst: boolean) => void, disabled: boolean, repeat = true, haptic: GameHaptic = "tap") {
  const fireRef = useRef(fire);
  fireRef.current = fire;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const pointers = useRef(new Set<number>());
  const das = useRef<number>();
  const arr = useRef<number>();
  const pulse = useRef<number>();
  const [pressed, setPressed] = useState(false);
  const clear = useCallback(() => {
    window.clearTimeout(das.current); window.clearInterval(arr.current);
    window.clearTimeout(pulse.current);
    das.current = undefined; arr.current = undefined; pointers.current.clear();
    setPressed(false);
  }, []);
  useEffect(() => {
    if (disabled) clear();
    const hidden = () => { if (document.hidden) clear(); };
    window.addEventListener("blur", clear); document.addEventListener("visibilitychange", hidden);
    return () => { clear(); window.removeEventListener("blur", clear); document.removeEventListener("visibilitychange", hidden); };
  }, [disabled, clear]);
  const release = (event: React.PointerEvent<HTMLButtonElement>) => {
    pointers.current.delete(event.pointerId);
    if (!pointers.current.size) clear();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return {
    'data-pressed': pressed,
    onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
      if (disabledRef.current || document.hidden || event.button > 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      const wasEmpty = pointers.current.size === 0;
      pointers.current.add(event.pointerId);
      if (!wasEmpty) return;
      window.clearTimeout(pulse.current);
      setPressed(true); playGameHaptic(haptic); fireRef.current(true);
      if (repeat) das.current = window.setTimeout(() => {
        arr.current = window.setInterval(() => {
          if (!disabledRef.current && !document.hidden && pointers.current.size) fireRef.current(false);
        }, ARR_INTERVAL_MS);
      }, DAS_DELAY_MS);
    },
    onPointerUp: release, onPointerCancel: release,
    onLostPointerCapture: release,
    onClick(event: React.MouseEvent<HTMLButtonElement>) {
      // 실제 포인터 클릭(detail>0)은 pointerdown에서 이미 처리했다. AT/키보드 click만 1회 실행.
      if (event.detail === 0 && !disabledRef.current && !document.hidden) {
        setPressed(true); playGameHaptic(haptic); fireRef.current(true);
        window.clearTimeout(pulse.current);
        pulse.current = window.setTimeout(() => { if (!pointers.current.size) setPressed(false); }, 90);
      }
    },
  };
}

/** 간결한 공통 패드: 히트 영역은 유지하고 눌림은 배경/아이콘에만 반영한다. */
export const CONTROL_BUTTON_CLASS = "quad-control flex select-none items-center justify-center rounded-xl border border-white/30 bg-[#14161c]/95 text-white disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200";

const ICON_SIZE = "h-7 w-7";

/** 좌/우/아래 방향을 표시하는 폰트 비의존 SVG 화살표 */
export function DirectionIcon({ direction }: { readonly direction: "left" | "right" | "down" }) {
  const rotation = direction === "left" ? "rotate(90 12 12)" : direction === "right" ? "rotate(-90 12 12)" : undefined;
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ICON_SIZE} aria-hidden="true">
      <path d="m6 9 6 6 6-6" transform={rotation} stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 회전을 표시하는 원형 화살표 SVG 아이콘 */
export function RotateIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ICON_SIZE} aria-hidden="true">
      <path d="M19 7v5h-5" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.2 12A6.5 6.5 0 1 1 16.6 7.7L19 10" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * 모바일 전용 가상 게임패드. 좌우에 각각 상단 1키 + 하단 2키의 3:3 클러스터를 둔다.
 * 데스크톱에서는 렌더링되지
 * 않는다(호출부에서 useIsMobile로 조건부 렌더).
 */
export function TouchControls({ dispatch, triggerHardDrop, status, sounds, canHold = true, layout = null }: TouchControlsProps) {
  const disabled = status !== "playing";
  const surface = useRef<HTMLDivElement>(null);
  const [layoutFits, setLayoutFits] = useState(true);
  useEffect(() => {
    const area = surface.current?.closest<HTMLElement>(".play-pad-region");
    if (!layout || !area || typeof ResizeObserver === "undefined") { setLayoutFits(true); return; }
    const measure = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const baseWidth = Math.max(64, Math.min(80, vw * .18)), baseHeight = Math.max(48, Math.min(64, vh * .07));
      setLayoutFits(isControlLayoutUsable(layout, area.clientWidth - 12, area.clientHeight, baseWidth, baseHeight));
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(area);
    return () => observer.disconnect();
  }, [layout]);
  const effectiveLayout = layoutFits ? layout : null;
  const dispatchRepeatable = useCallback(
    (action: RepeatableAction, playSound: boolean) => {
      if (action === "MOVE_LEFT") {
        dispatch({ type: "MOVE_LEFT" });
        if (playSound) sounds?.move();
      } else if (action === "MOVE_RIGHT") {
        dispatch({ type: "MOVE_RIGHT" });
        if (playSound) sounds?.move();
      } else {
        dispatch({ type: "SOFT_DROP" });
        if (playSound) sounds?.softDrop();
      }
    },
    [dispatch, sounds],
  );

  const leftRepeat = useHoldRepeat((isFirst) => dispatchRepeatable("MOVE_LEFT", isFirst), disabled);
  const rightRepeat = useHoldRepeat((isFirst) => dispatchRepeatable("MOVE_RIGHT", isFirst), disabled);
  const softDropRepeat = useHoldRepeat((isFirst) => dispatchRepeatable("SOFT_DROP", isFirst), disabled);

  const hardDropInput = useHoldRepeat(() => triggerHardDrop(), disabled, false, "drop");
  const rotateInput = useHoldRepeat(() => { dispatch({ type: "ROTATE_CW" }); sounds?.rotate(); }, disabled, false);
  const holdInput = useHoldRepeat(() => { dispatch({ type: "HOLD" }); sounds?.hold(); }, disabled || !canHold, false);

  const inputs = { hold: holdInput, left: leftRepeat, right: rightRepeat, down: softDropRepeat, rotate: rotateInput, drop: hardDropInput };
  const renderButton = (id: ControlId) => <button key={id} type="button" aria-label={CONTROL_LABELS[id]}
    disabled={disabled || (id === "hold" && !canHold)} {...inputs[id]}
    style={effectiveLayout ? controlPositionStyle(effectiveLayout[id]) : undefined}
    className={CONTROL_BUTTON_CLASS + " pointer-events-auto " + (!effectiveLayout && (id === "hold" || id === "down") ? "col-span-2 justify-self-center" : "")}>
    <ControlGlyph id={id} />
  </button>;
  return <div ref={surface} data-testid="touch-controls" style={{ touchAction: "none" }}
    className={(effectiveLayout ? "custom-control-surface pointer-events-none " : "flex w-full items-end justify-between gap-3 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom),var(--ait-safe-bottom,0px))] pt-1 ") + "touch-none select-none " + (disabled ? "opacity-30" : "")}>
    {layout && !layoutFits && <span role="status" className="pointer-events-none absolute left-0 right-0 -top-4 text-center text-[10px] text-amber-200">화면 크기에 맞춰 기본 배치를 사용해요.</span>}
    <div className={effectiveLayout ? "contents" : "grid grid-cols-2 gap-[clamp(0.5rem,2vw,0.75rem)]"}>{(["hold", "left", "right"] as const).map(renderButton)}</div>
    <div className={effectiveLayout ? "contents" : "grid grid-cols-2 gap-[clamp(0.5rem,2vw,0.75rem)]"}>{(["down", "rotate", "drop"] as const).map(renderButton)}</div>
  </div>;
}

/** 입력: 조작 ID / 출력: 게임·편집 화면에서 공통으로 사용하는 SVG 또는 HOLD/DROP 표기. */
export function ControlGlyph({ id }: { readonly id: ControlId }) {
  if (id === "rotate") return <RotateIcon />;
  if (id === "hold" || id === "drop") return <span aria-hidden="true" className="text-[11px] font-bold tracking-[0.12em]">{id.toUpperCase()}</span>;
  return <DirectionIcon direction={id === "down" ? "down" : id} />;
}
