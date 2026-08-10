/**
 * SinglePlayerApp.tsx
 * -----------------------------------------------------------------------
 * 1인 플레이 화면 흐름(타이틀 -> 카운트다운 -> 플레이 -> 일시정지/게임오버)을 조립하는 컴포넌트.
 * PRD 4.1 사용자 시나리오의 순서를 그대로 따른다.
 * 이 컴포넌트는 화면 전환/레이아웃만 담당하며, 실제 게임 로직은 useGameEngine(엔진 훅)에,
 * 이펙트는 useEffects에, 사운드는 useSound에 위임한다 (관심사 분리).
 *
 * 기존 App.tsx의 1인 플레이 로직을 그대로 옮긴 것으로, 대전 모드 추가를 위해
 * App.tsx는 "싱글/대전" 두 모드를 라우팅하는 얇은 컴포넌트로 분리되었다.
 * (대전 모드 진입 진입점만 onOpenMultiplayer prop으로 추가됨 — 그 외 로직은 변경 없음)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { calculateSpeedMultiplier, previewNext } from "../engine";
import { useGameEngine } from "../hooks/useGameEngine";
import { useEffects } from "../hooks/useEffects";
import { useSound } from "../hooks/useSound";
import { useHighScore } from "../hooks/useHighScore";
import { useIsMobile } from "../hooks/useIsMobile";
import { GameBoard } from "./GameBoard";
import { HoldPanel } from "./HoldPanel";
import { MiniPiece } from "./MiniPiece";
import { NextQueue } from "./NextQueue";
import { ScoreBoard } from "./ScoreBoard";
import { SoundControl } from "./SoundControl";
import { TouchControls } from "./TouchControls";
import { EffectPopups } from "./effects/EffectPopups";
import { AppsInTossTopBar } from "./AppsInTossTopBar";
import { TitleScreen } from "./screens/TitleScreen";
import { CountdownOverlay } from "./screens/CountdownOverlay";
import { PauseOverlay } from "./screens/PauseOverlay";
import { GameOverScreen } from "./screens/GameOverScreen";
import { SpeakerOffIcon, SpeakerOnIcon } from "./icons";

/** 화면 흐름 단계 (엔진의 GameStatus와는 별개인, 순수 UI 레이어의 상태) */
type AppPhase = "title" | "countdown" | "game";

/** 카운트다운 시작 값 (3, 2, 1 -> 0은 "GO!" 표시) */
const COUNTDOWN_START = 3;
/** 카운트다운 한 단계당 대기 시간(ms) */
const COUNTDOWN_STEP_MS = 700;
/** "GO!" 표시 후 실제 게임 시작까지 대기 시간(ms) */
const COUNTDOWN_GO_MS = 450;

/** SinglePlayerApp props */
export interface SinglePlayerAppProps {
  /** 타이틀 화면의 "대전 모드" 버튼 클릭 시 호출된다 (없으면 버튼 숨김) */
  readonly onOpenMultiplayer?: () => void;
}

function SinglePlayerApp({ onOpenMultiplayer }: SinglePlayerAppProps) {
  const { enabled: soundEnabled, toggle: toggleSound, sounds, music } = useSound();
  const { state, ghost, hardDropTrail, start, restart, pause, resume, dispatch, triggerHardDrop } = useGameEngine({
    sounds,
  });
  const { highScore, submitScore } = useHighScore();
  const { shake, popups } = useEffects(state.lastScoreEvent);
  const isMobile = useIsMobile();

  // 엔진 상태가 "playing"일 때만 배경음악을 재생하고, 그 외(일시정지/게임오버/준비)에는 멈춘다.
  useEffect(() => {
    if (state.status === "playing") {
      music.start();
    } else {
      music.stop();
    }
  }, [state.status, music]);

  // 레벨이 오를수록(=블록이 빨리 떨어질수록) 배경음악 템포도 같은 비율로 빨라지게 한다.
  useEffect(() => {
    music.setSpeedMultiplier(calculateSpeedMultiplier(state.level));
  }, [state.level, music]);

  const [phase, setPhase] = useState<AppPhase>("title");
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  /** "시작하기" 클릭: 카운트다운(3,2,1) 단계로 진입한다 (PRD 4.1 2단계) */
  const handleStartClick = useCallback(() => {
    // 이 onClick 핸들러 안에서 직접 사운드를 재생해, 실제 클릭 제스처 안에서 AudioContext가
    // 확실하게 생성/resume되도록 한다 (일부 브라우저는 전역 리스너를 통한 언락을 인정하지 않는다).
    sounds.uiSelect();
    setIsNewHighScore(false);
    setCountdownValue(COUNTDOWN_START);
    setPhase("countdown");
  }, [sounds]);

  // 카운트다운 진행: 1초 간격으로 감소시키다가 0이 되면 "GO!"를 잠깐 보여준 뒤 실제 엔진을 시작한다.
  useEffect(() => {
    if (phase !== "countdown" || countdownValue === null) return undefined;

    if (countdownValue > 0) {
      sounds.countdownTick();
      const timer = window.setTimeout(() => {
        setCountdownValue((prev) => (prev !== null ? prev - 1 : null));
      }, COUNTDOWN_STEP_MS);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      start();
      setCountdownValue(null);
      setPhase("game");
    }, COUNTDOWN_GO_MS);
    return () => window.clearTimeout(timer);
  }, [phase, countdownValue, start, sounds]);

  // 게임 오버 전환 시점에 최종 점수를 하이스코어로 제출한다.
  useEffect(() => {
    if (state.status === "gameover") {
      setIsNewHighScore(submitScore(state.score));
    }
  }, [state.status, state.score, submitScore]);

  /** 게임 오버/일시정지 메뉴의 "다시하기": 카운트다운 없이 즉시 새 게임을 시작한다 */
  const handleRestart = useCallback(() => {
    setIsNewHighScore(false);
    restart();
  }, [restart]);

  /** 게임 오버/일시정지 메뉴의 "메인으로": 타이틀 화면으로 복귀한다 */
  const handleMainMenu = useCallback(() => {
    setPhase("title");
  }, []);

  // 넥스트 큐 미리보기(5개)는 pieceQueue 참조가 바뀔 때만 새로 계산한다.
  const nextPreview = useMemo(() => previewNext(state.pieceQueue, 5), [state.pieceQueue]);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#0a0a0f]">
      {/* 앱인토스 환경이 아니면 null을 반환하므로, 기존 웹 배포 레이아웃에는 아무 영향이 없다 */}
      <AppsInTossTopBar />
      <div
        className={
          isMobile && phase !== "title"
            ? "flex w-full flex-1 min-h-0 flex-col items-stretch overflow-hidden"
            : "flex w-full flex-1 min-h-0 items-center justify-center overflow-hidden p-4"
        }
      >
        {phase === "title" && (
          <TitleScreen
            highScore={highScore}
            soundEnabled={soundEnabled}
            onStart={handleStartClick}
            onToggleSound={toggleSound}
            musicTracks={music.tracks}
            musicTrackIndex={music.trackIndex}
            onSelectMusicTrack={music.setTrackIndex}
            musicVolume={music.volume}
            onChangeMusicVolume={music.setVolume}
            isMobile={isMobile}
            onOpenMultiplayer={onOpenMultiplayer}
          />
        )}

        {phase !== "title" && !isMobile && (
          <div className="flex items-start gap-4">
            <div className="flex flex-col gap-4 pt-1">
              <HoldPanel hold={state.hold} />
              <SoundControl
                soundEnabled={soundEnabled}
                onToggleSound={toggleSound}
                tracks={music.tracks}
                trackIndex={music.trackIndex}
                onSelectTrack={music.setTrackIndex}
                volume={music.volume}
                onChangeVolume={music.setVolume}
              />
            </div>

            <div className="relative">
              <GameBoard
                board={state.board}
                active={state.active}
                ghost={ghost}
                status={state.status}
                lastScoreEvent={state.lastScoreEvent}
                hardDropTrail={hardDropTrail}
                shake={shake}
              />
              <EffectPopups popups={popups} />
              {phase === "countdown" && countdownValue !== null && <CountdownOverlay value={countdownValue} />}
              {state.status === "paused" && (
                <PauseOverlay onResume={resume} onRestart={handleRestart} onMainMenu={handleMainMenu} />
              )}
              {state.status === "gameover" && (
                <GameOverScreen
                  score={state.score}
                  highScore={highScore}
                  isNewHighScore={isNewHighScore}
                  onRestart={handleRestart}
                  onMainMenu={handleMainMenu}
                />
              )}
            </div>

            <div className="flex flex-col gap-4 pt-1">
              <ScoreBoard
                score={state.score}
                level={state.level}
                totalLinesCleared={state.totalLinesCleared}
                combo={state.combo}
                backToBack={state.backToBack}
              />
              <NextQueue upcoming={nextPreview} />
            </div>
          </div>
        )}

        {/* ---- 모바일 레이아웃: 상단에 점수 배너, 그 아래 보드 영역에 HOLD(좌)/NEXT(우)를
             배너 바로 밑에 붙는 위치(상단 정렬)로 좌우에 배치, 가운데는 반응형 보드,
             하단에 터치 컨트롤 - 스크롤이 필요 없고, 보드 하단이 터치 컨트롤에 가려지는 일도
             구조적으로 발생하지 않는다. ---- */}
        {phase !== "title" && isMobile && (
          <div className="flex h-full w-full flex-col items-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
            {/* 점수 배너: 점수를 가장 크게 중앙에 두고(주인공), 일시정지는 우측 끝에 작게 */}
            <div className="mb-1 flex w-full max-w-md shrink-0 flex-col rounded-xl border border-white/10 bg-white/5 px-2 py-1 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-2">
                {/* 사운드 On/Off - 게임 중에도 언제든 음소거할 수 있어야 한다(미니앱 심사 필수 항목).
                    데스크톱은 좌측 SoundControl 패널이 담당하지만 모바일 레이아웃에는 그 패널이
                    없으므로, 일시정지 버튼과 대칭되는 이 슬롯에 배치한다. */}
                <button
                  type="button"
                  aria-label={soundEnabled ? "소리 끄기" : "소리 켜기"}
                  onClick={toggleSound}
                  className="flex h-[clamp(2rem,4.5dvh,2.5rem)] w-[clamp(2rem,4.5dvh,2.5rem)] shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-white/80 transition active:scale-95"
                >
                  {soundEnabled ? (
                    <SpeakerOnIcon className="h-[1.125rem] w-[1.125rem] text-cyan-300" />
                  ) : (
                    <SpeakerOffIcon className="h-[1.125rem] w-[1.125rem] text-white/40" />
                  )}
                </button>
                <span className="flex-1 text-center font-mono text-[clamp(1.25rem,3dvh,1.75rem)] font-black tracking-tight text-white drop-shadow-[0_0_14px_rgba(34,211,238,0.35)]">
                  {state.score.toLocaleString("en-US")}
                </span>
                {/* 카운트다운 중에는 엔진이 아직 playing이 아니라 일시정지가 불가능하다. 그렇다고
                    버튼을 비활성화하면 카운트다운 동안 빠져나갈 방법이 전혀 없어지므로(심사 항목:
                    "모든 화면에서 나가는 방법 제공"), 이 구간에서는 메인으로 돌아가는 ✕로 동작시킨다. */}
                <button
                  type="button"
                  aria-label={
                    phase === "countdown" ? "메인으로" : state.status === "paused" ? "재개" : "일시정지"
                  }
                  onClick={
                    phase === "countdown" ? handleMainMenu : state.status === "paused" ? resume : pause
                  }
                  disabled={
                    phase !== "countdown" && state.status !== "playing" && state.status !== "paused"
                  }
                  className="flex h-[clamp(2rem,4.5dvh,2.5rem)] w-[clamp(2rem,4.5dvh,2.5rem)] shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-xs text-white/80 disabled:opacity-30"
                >
                  {phase === "countdown" ? "✕" : state.status === "paused" ? "▶" : "❚❚"}
                </button>
              </div>

              <div className="text-center text-[8px] font-semibold tracking-widest text-white/40">
                LV.{state.level} · LINES {state.totalLinesCleared}
              </div>
            </div>

            {/* HOLD/NEXT는 보드 좌우 여백에 떠 있게 해 게임판의 세로 공간을 차지하지 않는다. */}
            <div className="flex min-h-0 w-full max-w-md flex-1 flex-col items-center">
              <div className="relative min-h-0 w-full flex-1">
                <div className="pointer-events-none absolute left-0 top-1 z-10 flex w-11 flex-col items-center gap-1">
                  <span className="text-[7px] font-semibold tracking-widest text-white/40">HOLD</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-black/50">
                    <MiniPiece type={state.hold.type} cellSize={7} dimmed={!state.hold.canHold} />
                  </div>
                </div>
                <div className="pointer-events-none absolute right-0 top-1 z-10 flex w-11 flex-col items-center gap-1">
                  <span className="text-[7px] font-semibold tracking-widest text-white/40">NEXT</span>
                  {nextPreview.slice(0, 3).map((type, index) => (
                    <div
                      key={index}
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-black/50"
                      style={{ opacity: 1 - index * 0.22 }}
                    >
                      <MiniPiece type={type} cellSize={7} />
                    </div>
                  ))}
                </div>
                <GameBoard
                  board={state.board}
                  active={state.active}
                  ghost={ghost}
                  status={state.status}
                  lastScoreEvent={state.lastScoreEvent}
                  hardDropTrail={hardDropTrail}
                  shake={shake}
                  responsive
                />
                <EffectPopups popups={popups} />
                {phase === "countdown" && countdownValue !== null && <CountdownOverlay value={countdownValue} />}
                {state.status === "paused" && (
                  <PauseOverlay onResume={resume} onRestart={handleRestart} onMainMenu={handleMainMenu} />
                )}
                {state.status === "gameover" && (
                  <GameOverScreen
                    score={state.score}
                    highScore={highScore}
                    isNewHighScore={isNewHighScore}
                    onRestart={handleRestart}
                    onMainMenu={handleMainMenu}
                  />
                )}
              </div>
            </div>

            <div className="w-full shrink-0">
              <TouchControls
                dispatch={dispatch}
                triggerHardDrop={triggerHardDrop}
                status={state.status}
                sounds={sounds}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SinglePlayerApp;
