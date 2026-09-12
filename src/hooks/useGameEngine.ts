/**
 * useGameEngine.ts
 * -----------------------------------------------------------------------
 * React와 순수 게임 엔진(src/engine)을 연결하는 유일한 접점(hook).
 * - requestAnimationFrame 기반 고정 타임스텝 루프로 매 프레임 TICK 액션을 dispatch한다.
 * - 키보드 입력을 수집해 엔진 액션으로 변환한다 (DAS/ARR 방식의 좌우/소프트드롭 자동 반복 포함).
 * - 브라우저 탭이 비활성화되면 자동으로 PAUSE 한다.
 * - 하드 드롭 잔상 이펙트에 필요한 정보(HardDropTrailInfo)는 엔진 상태를 오염시키지 않도록
 *   이 훅의 로컬 상태로 별도 관리한다.
 *
 * 성능 규칙(CLAUDE.md 60FPS 방어): 엔진 리듀서가 반환하는 EngineState는 실제로 값이 바뀐
 * 필드만 새 참조를 갖도록 설계되어 있으므로(gameEngine.ts 참고), 이 훅을 사용하는 컴포넌트들은
 * React.memo + 얕은 비교로 불필요한 재렌더링을 자연스럽게 피할 수 있다.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  applyAction,
  createInitialState,
  getGhostPiece,
  type ActivePiece,
  type EngineAction,
  type EngineState,
  type LineClearCategory,
  type RotationState,
  type TetrominoType,
} from "../engine";
import type { SoundEffects } from "./useSound";

/** 하드 드롭 낙하 궤적(잔상) 이펙트에 필요한 정보. 엔진 상태와 분리된 UI 전용 데이터 */
export interface HardDropTrailInfo {
  readonly type: TetrominoType;
  readonly rotation: RotationState;
  readonly x: number;
  readonly fromY: number;
  readonly toY: number;
  /** 같은 위치로 연속 하드 드롭되어도 이펙트가 재트리거되도록 매번 증가하는 토큰 */
  readonly token: number;
}

/** useGameEngine 훅 옵션 */
export interface UseGameEngineOptions {
  /** 캠페인은 엔진의 조작 결과에 목표/AI 상태를 함께 갱신한다. 기본값은 기존 엔진이다. */
  readonly reducer?: typeof applyAction;
  /** 입력/점수 이벤트에 맞춰 재생할 효과음 모음 (없으면 무음) */
  readonly sounds?: SoundEffects;
  /** 로비/카운트다운에서는 엔진 입력과 실행을 차단한다. */
  readonly enabled?: boolean;
}

/** useGameEngine 훅의 반환 타입 */
export interface UseGameEngineResult {
  readonly state: EngineState;
  /** 현재 활성 피스가 하드 드롭될 경우 도달할 고스트 피스 (없으면 null) */
  readonly ghost: ActivePiece | null;
  readonly hardDropTrail: HardDropTrailInfo | null;
  readonly start: (seed?: number) => void;
  readonly restart: (seed?: number) => void;
  readonly pause: () => void;
  readonly resume: () => void;
  /**
   * 엔진 리듀서에 타입이 지정된 EngineAction을 직접 전달한다.
   * 싱글플레이 흐름에서는 사용하지 않아도 되며, start/restart/pause/resume이 대부분의 경우를 커버한다.
   */
  readonly dispatch: (action: EngineAction) => void;
  /**
   * 하드 드롭을 트리거한다 (잔상 이펙트 계산 + HARD_DROP 액션 + 효과음까지 포함).
   * 키보드(Space)와 터치 컨트롤(TouchControls)이 동일한 하드 드롭 경험을 갖도록 노출한다.
   */
  readonly triggerHardDrop: () => void;
}

/** 자동 반복(DAS: Delayed Auto Shift) 대상이 되는 액션 종류 */
type RepeatableAction = "MOVE_LEFT" | "MOVE_RIGHT" | "SOFT_DROP";

/** 최초 입력 후 자동 반복이 시작되기까지의 지연시간(ms) */
const DAS_DELAY_MS = 150;
/** 자동 반복 간격(ms, ARR: Auto Repeat Rate) */
const ARR_INTERVAL_MS = 35;

/** 라인 클리어 카테고리를 지워진 줄 수(정수)로 변환한다. 입력: category / 출력: 줄 수 */
function categoryToLineCount(category: LineClearCategory): number {
  switch (category) {
    case "single":
      return 1;
    case "double":
      return 2;
    case "triple":
      return 3;
    case "tetris":
      return 4;
    default:
      return 0;
  }
}

/** keydown 이벤트의 code로부터 자동 반복 대상 액션을 판별한다 */
function resolveRepeatableAction(code: string): RepeatableAction | null {
  switch (code) {
    case "ArrowLeft":
      return "MOVE_LEFT";
    case "ArrowRight":
      return "MOVE_RIGHT";
    case "ArrowDown":
      return "SOFT_DROP";
    default:
      return null;
  }
}

/**
 * 테트리스 게임 엔진 + 입력 + 게임 루프를 결합하는 메인 훅.
 * 입력: options(효과음 콜백 등) / 출력: UseGameEngineResult
 */
export function useGameEngine(options?: UseGameEngineOptions): UseGameEngineResult {
  // 엔진 리듀서(applyAction)를 그대로 React useReducer에 연결한다.
  // gameEngine.ts의 모든 상태 전이 로직은 순수 함수이므로 React 쪽에서 재구현하지 않는다.
  const reducerRef = useRef(options?.reducer ?? applyAction);
  reducerRef.current = options?.reducer ?? applyAction;
  const [state, applyAndSet] = useReducer((current: EngineState, action: EngineAction) => reducerRef.current(current, action), undefined, () => createInitialState());

  // 최신 state/사운드를 이펙트 클로저 밖에서도 참조하기 위한 ref (키 리스너 재등록을 막기 위함)
  const stateRef = useRef(state);
  stateRef.current = state;
  const soundsRef = useRef<SoundEffects | undefined>(options?.sounds);
  soundsRef.current = options?.sounds;

  const enabled = options?.enabled ?? true;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const [hardDropTrail, setHardDropTrail] = useState<HardDropTrailInfo | null>(null);
  const trailTokenRef = useRef(0);

  // ---- 게임 흐름 제어 함수 ----
  const start = useCallback((seed?: number) => {
    setHardDropTrail(null);
    applyAndSet({ type: "START", seed: seed ?? Math.floor(Math.random() * 4294967296) });
  }, [applyAndSet]);
  const restart = useCallback((seed?: number) => {
    setHardDropTrail(null);
    applyAndSet({ type: "RESTART", seed: seed ?? Math.floor(Math.random() * 4294967296) });
  }, [applyAndSet]);
  const pause = useCallback(() => applyAndSet({ type: "PAUSE" }), [applyAndSet]);
  const resume = useCallback(() => {
    if (enabledRef.current && !document.hidden) applyAndSet({ type: "RESUME" });
  }, [applyAndSet]);

  const togglePause = useCallback(() => {
    if (!enabledRef.current || document.hidden) return;
    const status = stateRef.current.status;
    if (status === "playing") applyAndSet({ type: "PAUSE" });
    else if (status === "paused") applyAndSet({ type: "RESUME" });
  }, [applyAndSet]);

  /** 하드 드롭: 잔상 이펙트 정보를 먼저 계산한 뒤 실제 엔진 액션을 적용한다 */
  const triggerHardDrop = useCallback(() => {
    const current = stateRef.current;
    if (!enabledRef.current || document.hidden || current.status !== "playing" || !current.active) return;
    const ghostPiece = getGhostPiece(current);
    if (ghostPiece) {
      trailTokenRef.current += 1;
      setHardDropTrail({
        type: current.active.type,
        rotation: current.active.rotation,
        x: current.active.position.x,
        fromY: current.active.position.y,
        toY: ghostPiece.position.y,
        token: trailTokenRef.current,
      });
    }
    applyAndSet({ type: "HARD_DROP" });
    soundsRef.current?.hardDrop();
  }, [applyAndSet]);

  // ---- requestAnimationFrame 기반 게임 루프: 매 프레임 TICK 디스패치 ----
  useEffect(() => {
    if (!enabled || state.status !== "playing" || document.hidden) return;
    let rafId = 0;
    let lastTime: number | null = null;
    const loop = (time: number) => {
      if (lastTime !== null) {
        const deltaMs = time - lastTime;
        applyAndSet({ type: "TICK", deltaMs });
      }
      lastTime = time;
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [applyAndSet, enabled, state.status]);

  // ---- 키보드 입력 처리 (DAS/ARR 자동 반복 포함) ----
  useEffect(() => {
    type Axis = "horizontal" | "down";
    const timers: Record<Axis, { das?: number; arr?: number; action?: RepeatableAction }> = { horizontal: {}, down: {} };
    const held: string[] = [];
    const axisFor = (action: RepeatableAction): Axis => action === "SOFT_DROP" ? "down" : "horizontal";
    const stop = (axis: Axis) => {
      window.clearTimeout(timers[axis].das);
      window.clearInterval(timers[axis].arr);
      timers[axis] = {};
    };
    const clear = () => { stop("horizontal"); stop("down"); held.length = 0; };
    const playable = () => enabledRef.current && !document.hidden && stateRef.current.status === "playing";
    const fire = (action: RepeatableAction, sound: boolean) => {
      if (!playable()) return;
      applyAndSet({ type: action });
      if (sound) {
        if (action === "SOFT_DROP") soundsRef.current?.softDrop();
        else soundsRef.current?.move();
      }
    };
    const repeat = (action: RepeatableAction) => {
      const axis = axisFor(action);
      stop(axis);
      timers[axis].action = action;
      fire(action, true);
      timers[axis].das = window.setTimeout(() => {
        timers[axis].arr = window.setInterval(() => fire(action, false), ARR_INTERVAL_MS);
      }, DAS_DELAY_MS);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (!enabledRef.current || document.hidden || event.defaultPrevented ||
          (target instanceof Element && target.closest('input,select,textarea,button,[contenteditable="true"],[role="dialog"]')) ||
          document.querySelector('[role="dialog"]')) return;
      if ((event.code === "Escape" || event.code === "KeyP") && !event.repeat) {
        event.preventDefault(); clear(); togglePause(); return;
      }
      if (!playable() || event.repeat) return;
      const action = resolveRepeatableAction(event.code);
      if (action) {
        event.preventDefault();
        if (held.includes(event.code)) return;
        held.push(event.code); repeat(action); return;
      }
      switch (event.code) {
        case "ArrowUp": case "KeyX":
          event.preventDefault(); applyAndSet({ type: "ROTATE_CW" }); soundsRef.current?.rotate(); break;
        case "KeyZ":
          event.preventDefault(); applyAndSet({ type: "ROTATE_CCW" }); soundsRef.current?.rotate(); break;
        case "KeyA":
          event.preventDefault(); applyAndSet({ type: "ROTATE_180" }); soundsRef.current?.rotate(); break;
        case "Space": event.preventDefault(); triggerHardDrop(); break;
        case "KeyC": case "ShiftLeft": case "ShiftRight":
          event.preventDefault();
          if (stateRef.current.hold.canHold) { applyAndSet({ type: "HOLD" }); soundsRef.current?.hold(); }
          break;
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const index = held.indexOf(event.code);
      if (index >= 0) held.splice(index, 1);
      const action = resolveRepeatableAction(event.code);
      if (!action || timers[axisFor(action)].action !== action) return;
      stop(axisFor(action));
      // 좌우 동시 입력은 마지막 키 우선, 해제하면 아직 누른 반대 키로 복귀한다.
      if (axisFor(action) === "horizontal" && playable()) {
        const other = [...held].reverse().find(code => code === "ArrowLeft" || code === "ArrowRight");
        if (other) repeat(resolveRepeatableAction(other)!);
      }
    };
    const suspend = () => { clear(); applyAndSet({ type: "PAUSE" }); };
    const visibility = () => { if (document.hidden) suspend(); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", suspend);
    document.addEventListener("visibilitychange", visibility);
    if (!enabled && state.status === "playing") applyAndSet({ type: "PAUSE" });
    return () => {
      clear(); window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", suspend); document.removeEventListener("visibilitychange", visibility);
    };
  }, [applyAndSet, togglePause, triggerHardDrop, enabled, state.status]);

  // ---- 점수 이벤트 -> 효과음 트리거 (lastScoreEvent 참조가 실제로 바뀔 때만 실행) ----
  useEffect(() => {
    const event = state.lastScoreEvent;
    const sounds = soundsRef.current;
    if (!event || !sounds) return;
    if (event.tSpin !== "none") {
      sounds.tSpin(categoryToLineCount(event.category));
    } else if (event.category === "tetris") {
      sounds.tetris();
    } else if (event.category !== "none") {
      sounds.lineClear(categoryToLineCount(event.category));
    } else {
      sounds.lock();
    }
    if (event.isLevelUp) {
      sounds.levelUp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastScoreEvent]);

  // ---- 게임오버 전환 시 효과음 ----
  const prevStatusRef = useRef(state.status);
  useEffect(() => {
    if (prevStatusRef.current !== "gameover" && state.status === "gameover") {
      soundsRef.current?.gameOver();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  // 고스트 피스는 board/active 참조가 실제로 바뀔 때만 재계산한다 (매 TICK마다 재계산 방지)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ghost = useMemo(() => getGhostPiece(state), [state.board, state.active]);

  return { state, ghost, hardDropTrail, start, restart, pause, resume, dispatch: applyAndSet, triggerHardDrop };
}
