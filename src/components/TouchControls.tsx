/**
 * TouchControls.tsx
 * -----------------------------------------------------------------------
 * 모바일(터치) 환경 전용 가상 게임패드. 데스크톱 키보드 입력(useGameEngine의
 * 키 리스너)과는 완전히 분리된 별도 입력 경로이며, 엔진 로직은 건드리지 않고
 * useGameEngine이 노출하는 `dispatch` / `triggerHardDrop`만 사용한다.
 *
 * 배치: 좌우 각각 3키 방향키 클러스터를 둔다. 왼쪽은 상단 홀드 + 하단 좌/우,
 * 오른쪽은 상단 소프트드롭 + 하단 회전/하드드롭이다. 버튼 안에는 SVG 아이콘만 표시한다.
 *
 * - 좌/우 이동, 소프트드롭: pointerdown 동안 DAS(최초 지연 후) + ARR(반복 간격)로 자동 반복한다.
 *   (useGameEngine의 키보드 DAS_DELAY_MS=150 / ARR_INTERVAL_MS=35와 동일한 값을 사용해
 *   키보드와 터치의 조작감을 통일한다.)
 * - 하드드롭/회전(시계 방향 1개만 제공)/홀드: pointerdown 시 1회만 발동.
 * - 모든 버튼은 touch-action: none + preventDefault로 스크롤/더블탭 확대/컨텍스트 메뉴를 막는다.
 * - 모든 버튼은 pointerdown 시 짧은 진동(navigator.vibrate)으로 손끝에 클릭감을 준다.
 *   Vibration API를 지원하지 않는 브라우저(iOS Safari 등)에서는 조용히 무시된다.
 * - 일시정지 버튼은 여기 없다 - 상단 HUD 바로 옮겨졌다(호출부인 SinglePlayerApp 참고).
 * - 컨테이너는 position: fixed가 아니라 모바일 레이아웃의 일반 flex 자식이다. 보드 영역이
 *   항상 남은 공간에 맞춰 줄어들도록 만들어(GameBoard의 responsive 모드), 이 컨트롤 바가
 *   보드 하단을 겹쳐 가리는 문제 자체가 구조적으로 발생하지 않는다.
 *
 * 입력: TouchControlsProps(엔진 dispatch류 콜백, 현재 상태) / 출력: 터치 버튼 레이아웃 JSX
 */

import { useCallback, useRef } from "react";
import type { EngineAction, GameStatus } from "../engine";
import type { SoundEffects } from "../hooks/useSound";

/** 최초 입력 후 자동 반복이 시작되기까지의 지연시간(ms). useGameEngine의 DAS_DELAY_MS와 동일 */
const DAS_DELAY_MS = 150;
/** 자동 반복 간격(ms). useGameEngine의 ARR_INTERVAL_MS와 동일 */
const ARR_INTERVAL_MS = 35;
/** 버튼 탭 진동 길이(ms). 너무 길면 "웅"거리는 느낌이라 아주 짧게(클릭감만) 유지한다 */
const HAPTIC_TAP_MS = 12;

/** 터치 시 짧게 진동시켜 클릭감을 준다. Vibration API 미지원 브라우저에서는 조용히 무시한다 */
function vibrateTap() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(HAPTIC_TAP_MS);
  }
}

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
}

/** 자동 반복(DAS/ARR) 대상이 되는 액션 종류 */
type RepeatableAction = "MOVE_LEFT" | "MOVE_RIGHT" | "SOFT_DROP";

/**
 * 눌러서 즉시 1회 실행 + 누르고 있으면 자동 반복되는 버튼 하나를 구현하는 내부 훅.
 * 최초 pointerdown 시 한 번만 진동시킨다(ARR로 반복될 때마다 울리면 부저처럼 거슬린다).
 * 입력: 반복 시작/1회 실행 콜백 / 출력: pointerdown/up/leave/cancel에 바인딩할 핸들러
 */
function useHoldRepeat(fire: (isFirst: boolean) => void) {
  const dasTimeout = useRef<number | undefined>(undefined);
  const arrInterval = useRef<number | undefined>(undefined);

  const clear = useCallback(() => {
    if (dasTimeout.current !== undefined) window.clearTimeout(dasTimeout.current);
    if (arrInterval.current !== undefined) window.clearInterval(arrInterval.current);
    dasTimeout.current = undefined;
    arrInterval.current = undefined;
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      clear();
      vibrateTap();
      fire(true);
      dasTimeout.current = window.setTimeout(() => {
        arrInterval.current = window.setInterval(() => fire(false), ARR_INTERVAL_MS);
      }, DAS_DELAY_MS);
    },
    [clear, fire],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      clear();
    },
    [clear],
  );

  return { onPointerDown, onPointerUp, onPointerLeave: onPointerUp, onPointerCancel: onPointerUp };
}

/**
 * 공통 버튼 구조 스타일 (색상은 각 버튼마다 ACCENT_* 클래스로 덧붙인다).
 * 그라디언트 배경 + 컬러 글로우 + 또렷한 눌림 반응으로 "누르는 맛"을 살렸다.
 */
const BUTTON_BASE =
  "relative flex select-none items-center justify-center overflow-hidden rounded-2xl border shadow-[0_5px_0_0_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm transition-[transform,box-shadow,filter] duration-75 active:translate-y-[3px] active:scale-[0.96] active:brightness-125 active:shadow-[0_1px_0_0_rgba(0,0,0,0.48),inset_0_1px_3px_rgba(0,0,0,0.35)] disabled:cursor-not-allowed";

/** 이동(◀▶): 시원한 시안 톤 */
const ACCENT_MOVE =
  "border-cyan-300/50 bg-gradient-to-b from-cyan-400/25 to-cyan-600/10 text-cyan-100 shadow-[0_2px_0_0_rgba(8,145,178,0.5),0_0_14px_rgba(34,211,238,0.35)] active:bg-cyan-400/35";
/** 소프트드롭(▼ 꾹 내리기, D-pad 아래): 인디고 톤 */
const ACCENT_SOFTDROP =
  "border-indigo-300/50 bg-gradient-to-b from-indigo-400/25 to-indigo-600/10 text-indigo-100 shadow-[0_2px_0_0_rgba(79,70,229,0.5),0_0_14px_rgba(129,140,248,0.35)] active:bg-indigo-400/35";
/** 홀드(D-pad 오른쪽): 홀드 슬롯과 통일감 있는 바이올렛 톤 */
const ACCENT_HOLD =
  "border-violet-300/50 bg-gradient-to-b from-violet-400/25 to-violet-600/10 text-violet-100 shadow-[0_2px_0_0_rgba(124,58,237,0.5),0_0_14px_rgba(196,181,253,0.35)] active:bg-violet-400/35";
/** 회전(D-pad 왼쪽): 활기찬 앰버 톤 */
const ACCENT_ROTATE =
  "border-amber-300/50 bg-gradient-to-b from-amber-400/25 to-amber-600/10 text-amber-100 shadow-[0_2px_0_0_rgba(217,119,6,0.5),0_0_14px_rgba(252,211,77,0.35)] active:bg-amber-400/35";
/** 하드드롭(D-pad 위): 가장 임팩트 있는 액션이므로 가장 강렬한 핫핑크/레드 톤으로 강조 */
const ACCENT_DROP =
  "border-rose-300/60 bg-gradient-to-b from-rose-400/35 to-rose-600/15 text-rose-100 shadow-[0_2px_0_0_rgba(190,18,60,0.6),0_0_18px_rgba(251,113,133,0.45)] active:bg-rose-400/45";

/** 기기 폭과 실제 가용 높이에 따라 56~64px 사이에서 자동 조절되는 터치 키 크기. */
const CONTROL_KEY =
  "h-[clamp(3.5rem,min(15vw,8dvh),4rem)] w-[clamp(3.5rem,min(15vw,8dvh),4rem)]";
const ICON_SIZE = "h-7 w-7";

/** 좌/우/아래 방향을 표시하는 폰트 비의존 SVG 화살표 */
function DirectionIcon({ direction }: { readonly direction: "left" | "right" | "down" }) {
  const rotation = direction === "left" ? "rotate(90 12 12)" : direction === "right" ? "rotate(-90 12 12)" : undefined;
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ICON_SIZE} aria-hidden="true">
      <path d="m6 9 6 6 6-6" transform={rotation} stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 회전을 표시하는 원형 화살표 SVG 아이콘 */
function RotateIcon() {
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
export function TouchControls({ dispatch, triggerHardDrop, status, sounds }: TouchControlsProps) {
  const disabled = status !== "playing";
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

  const leftRepeat = useHoldRepeat((isFirst) => dispatchRepeatable("MOVE_LEFT", isFirst));
  const rightRepeat = useHoldRepeat((isFirst) => dispatchRepeatable("MOVE_RIGHT", isFirst));
  const softDropRepeat = useHoldRepeat((isFirst) => dispatchRepeatable("SOFT_DROP", isFirst));

  const handleHardDrop = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      vibrateTap();
      triggerHardDrop();
    },
    [triggerHardDrop],
  );

  // 회전은 시계 방향 한 종류만 제공한다 (버튼 개수를 줄이기 위해 반시계 회전 버튼은 제거).
  const handleRotate = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      vibrateTap();
      dispatch({ type: "ROTATE_CW" });
      sounds?.rotate();
    },
    [dispatch, sounds],
  );

  const handleHold = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      vibrateTap();
      dispatch({ type: "HOLD" });
      sounds?.hold();
    },
    [dispatch, sounds],
  );

  return (
    <div
      className={`flex w-full touch-none select-none items-end justify-between gap-3 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom),var(--ait-safe-bottom,0px))] pt-1 transition-opacity ${
        disabled ? "pointer-events-none opacity-30" : ""
      }`}
      style={{ touchAction: "none" }}
      data-testid="touch-controls"
    >
      {/* 왼손: 키보드 방향키처럼 홀드를 위에, 좌우 이동을 아래에 둔다. */}
      <div className="grid grid-cols-2 gap-[clamp(0.5rem,2vw,0.75rem)]">
        <button
          type="button"
          aria-label="홀드"
          disabled={disabled}
          onPointerDown={handleHold}
          className={`${BUTTON_BASE} ${ACCENT_HOLD} ${CONTROL_KEY} col-span-2 justify-self-center`}
        >
          <span className="text-[11px] font-black tracking-[0.16em]" aria-hidden="true">HOLD</span>
        </button>
        <button
          type="button"
          aria-label="왼쪽 이동"
          disabled={disabled}
          className={`${BUTTON_BASE} ${ACCENT_MOVE} ${CONTROL_KEY}`}
          {...leftRepeat}
        >
          <DirectionIcon direction="left" />
        </button>
        <button
          type="button"
          aria-label="오른쪽 이동"
          disabled={disabled}
          className={`${BUTTON_BASE} ${ACCENT_MOVE} ${CONTROL_KEY}`}
          {...rightRepeat}
        >
          <DirectionIcon direction="right" />
        </button>
      </div>

      {/* 오른손: 자주 누르는 내리기를 위에, 회전과 즉시 낙하를 아래에 둔다. */}
      <div className="grid grid-cols-2 gap-[clamp(0.5rem,2vw,0.75rem)]">
        <button
          type="button"
          aria-label="소프트드롭"
          disabled={disabled}
          className={`${BUTTON_BASE} ${ACCENT_SOFTDROP} ${CONTROL_KEY} col-span-2 justify-self-center`}
          {...softDropRepeat}
        >
          <DirectionIcon direction="down" />
        </button>
        <button
          type="button"
          aria-label="회전"
          disabled={disabled}
          onPointerDown={handleRotate}
          className={`${BUTTON_BASE} ${ACCENT_ROTATE} ${CONTROL_KEY}`}
        >
          <RotateIcon />
        </button>
        <button
          type="button"
          aria-label="하드드롭"
          disabled={disabled}
          onPointerDown={handleHardDrop}
          className={`${BUTTON_BASE} ${ACCENT_DROP} ${CONTROL_KEY}`}
        >
          <span className="text-[11px] font-black tracking-[0.16em]" aria-hidden="true">DROP</span>
        </button>
      </div>
    </div>
  );
}
