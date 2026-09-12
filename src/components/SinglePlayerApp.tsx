/**
 * SinglePlayerApp.tsx
 * -----------------------------------------------------------------------
 * 1인 플레이 화면 흐름(타이틀 -> 카운트다운 -> 플레이 -> 일시정지/게임오버)을 조립하는 컴포넌트.
 * PRD 4.1 사용자 시나리오의 순서를 그대로 따른다.
 * 이 컴포넌트는 화면 전환/레이아웃만 담당하며, 실제 게임 로직은 useGameEngine(엔진 훅)에,
 * 이펙트는 useEffects에, 사운드는 useSound에 위임한다 (관심사 분리).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { applyAction, calculateSpeedMultiplier, createInitialState, previewNext, type EngineState, type EngineAction } from "../engine";
import { useGameEngine } from "../hooks/useGameEngine";
import { useEffects } from "../hooks/useEffects";
import { useSound } from "../hooks/useSound";
import { useHighScore } from "../hooks/useHighScore";
import { useIsMobile } from "../hooks/useIsMobile";
import { getStage, STAGES } from "../campaign/stages";
import { earnedStageStars } from "../campaign/stars";
import { StageStars } from "./StageStars";
import { getCampaignRun, reduceCampaign } from "../campaign/session";
import { useCampaignProgress } from "../hooks/useCampaignProgress";
import { StageSelect } from "./screens/StageSelect";
import { StageHud, OpponentPreview } from "./StageHud";
import { useControlLayout } from "../hooks/useControlLayout";
import { ControlLayoutEditor } from "./screens/ControlLayoutEditor";
import { GameBoard } from "./GameBoard";
import { HoldPanel } from "./HoldPanel";
import { MiniPiece } from "./MiniPiece";
import { NextQueue } from "./NextQueue";
import { ScoreBoard } from "./ScoreBoard";
import { SoundControl } from "./SoundControl";
import { TouchControls } from "./TouchControls";
import { EffectPopups } from "./effects/EffectPopups";
import { AppsInTossTopBar } from "./AppsInTossTopBar";
import { ControlsGuide } from "./screens/ControlsGuide";
import { Modal } from "./screens/Modal";
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
// 준비 화면 전용 값. 실제 게임의 난수·진행 상태는 변경하지 않는다.
const READY_PREVIEW = createInitialState({ seed: 0 });

/** 입력: 없음 / 출력: 싱글 게임의 화면 흐름. */
function SinglePlayerApp() {
  const [phase, setPhase] = useState<AppPhase>("title");
  const [showGuide, setShowGuide] = useState(false);
  const [showControlEditor, setShowControlEditor] = useState(false);
  const controls = useControlLayout();
  const [showStages, setShowStages] = useState(false);
  const [stageId, setStageId] = useState<number | null>(null);
  const stage = stageId === null ? undefined : getStage(stageId);
  const progress = useCampaignProgress(showStages || stageId !== null);
  const sessionReducer = useCallback((current: EngineState, action: EngineAction) => stage ? reduceCampaign(current, action, stage) : applyAction(current, action), [stage]);
  const [confirmExit, setConfirmExit] = useState<"restart" | "main" | null>(null);
  const { enabled: soundEnabled, toggle: toggleSound, sounds, music, storageError } = useSound();
  const { state: engineState, ghost: engineGhost, hardDropTrail: engineTrail, start, restart, pause, resume, dispatch, triggerHardDrop } = useGameEngine({
    reducer: sessionReducer, sounds, enabled: phase === "game" && !showGuide && !confirmExit && !showControlEditor,
  });
  const campaignRun = getCampaignRun(engineState);
  const finishedStage = phase === "game" && stage && campaignRun?.stageId === stage.id && campaignRun.outcome !== "playing";
  const earnedStars = stage ? earnedStageStars(stage, engineState) : 0;
  useEffect(() => { if (phase === "game" && campaignRun?.outcome === "cleared") progress.complete(campaignRun.stageId, earnedStars); }, [phase, campaignRun?.outcome, campaignRun?.stageId, earnedStars, progress.complete]);
  const state = phase === "countdown" ? READY_PREVIEW : engineState;
  const ghost = phase === "countdown" ? null : engineGhost;
  const hardDropTrail = phase === "countdown" ? null : engineTrail;
  const { highScore, submitScore, saveStatus } = useHighScore();
  const { shake, popups } = useEffects(state.lastScoreEvent);
  const isMobile = useIsMobile();

  // 엔진 상태가 "playing"일 때만 배경음악을 재생하고, 그 외(일시정지/게임오버/준비)에는 멈춘다.
  useEffect(() => {
    if (phase === "game" && state.status === "playing") {
      music.start();
    } else {
      music.stop();
    }
  }, [phase, state.status, music]);

  // 레벨이 오를수록(=블록이 빨리 떨어질수록) 배경음악 템포도 같은 비율로 빨라지게 한다.
  useEffect(() => {
    music.setSpeedMultiplier(calculateSpeedMultiplier(state.level));
  }, [state.level, music]);

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
    if (document.hidden) { setPhase("title"); setCountdownValue(null); return; }

    if (countdownValue > 0) {
      sounds.countdownTick();
      const timer = window.setTimeout(() => {
        setCountdownValue((prev) => (prev !== null ? prev - 1 : null));
      }, COUNTDOWN_STEP_MS);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      if (document.hidden) { setPhase("title"); setCountdownValue(null); return; }
      start();
      setCountdownValue(null);
      setPhase("game");
    }, COUNTDOWN_GO_MS);
    return () => window.clearTimeout(timer);
  }, [phase, countdownValue, start, sounds]);

  useEffect(() => {
    const hidden = () => { if (document.hidden && phase === "countdown") { setPhase("title"); setCountdownValue(null); } };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, [phase]);

  // 게임 오버 전환 시점에 최종 점수를 하이스코어로 제출한다.
  useEffect(() => {
    if (engineState.status === "gameover" && !getCampaignRun(engineState)) {
      setIsNewHighScore(submitScore(engineState.score));
    }
  }, [engineState.status, engineState.score, submitScore]);

  /** 게임 오버/일시정지 메뉴의 "다시하기": 카운트다운 없이 즉시 새 게임을 시작한다 */
  const handleRestart = useCallback(() => {
    setIsNewHighScore(false);
    if (stage) { setCountdownValue(COUNTDOWN_START); setPhase("countdown"); }
    else restart();
  }, [restart, stage]);

  /** 게임 오버/일시정지 메뉴의 "메인으로": 타이틀 화면으로 복귀한다 */
  const handleMainMenu = useCallback(() => {
    pause();
    setCountdownValue(null);
    setPhase("title");
  }, [pause]);

  /** 입력: 해금된 단계 번호 / 출력: 해당 스테이지의 새 카운트다운. */
  const beginStage = (id: number) => {
    if (!progress.ready || !getStage(id) || id > progress.completed + 1) return;
    setStageId(id); setShowStages(false); setShowGuide(false); setShowControlEditor(false);
    handleStartClick();
  };
  const stageList = () => { handleMainMenu(); setShowStages(true); };

  // 넥스트 큐 미리보기(5개)는 pieceQueue 참조가 바뀔 때만 새로 계산한다.
  const nextPreview = useMemo(() => phase === "countdown" ? [] : previewNext(state.pieceQueue, 5), [phase, state.pieceQueue]);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#0a0a0f]" onContextMenu={event => {
      if (!(event.target as HTMLElement).closest("input, textarea, [contenteditable='true']")) event.preventDefault();
    }}>
      {/* 토스 셸이 게임 화면에 자체 종료 바(… / X)를 제공한다. 로비에서만 브랜드 바를
          노출해 중복 상단 바가 플레이 영역의 세로 공간을 잠식하지 않게 한다. */}
      {phase === "title" && <AppsInTossTopBar />}
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
            onStart={() => { setStageId(null); handleStartClick(); }}
            onOpenStages={() => setShowStages(true)}
            onToggleSound={toggleSound}
            musicTracks={music.tracks}
            musicTrackIndex={music.trackIndex}
            onSelectMusicTrack={music.setTrackIndex}
            musicVolume={music.volume}
            onChangeMusicVolume={music.setVolume}
            isMobile={isMobile}
            storageError={storageError}
            onCustomizeControls={() => setShowControlEditor(true)}
          />
        )}

        {phase !== "title" && !isMobile && (
          <div className="flex h-full max-h-[600px] items-start gap-4">
            <div className="flex flex-col gap-4 pt-1">
              <HoldPanel hold={state.hold} />
              <button type="button" onClick={phase === "countdown" ? handleMainMenu : pause} disabled={phase === "game" && state.status !== "playing"} className="min-h-11 rounded-xl border border-white/20 px-3 text-sm text-white/85">{phase === "countdown" ? "메인으로" : "일시정지 (Esc / P)"}</button>
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

            <div className="relative h-full min-h-0 w-[min(300px,35vw)]">
              <GameBoard
                key={phase === "countdown" ? "ready" : "game"}
                board={state.board}
                active={state.active}
                ghost={ghost}
                status={state.status}
                lastScoreEvent={state.lastScoreEvent}
                hardDropTrail={hardDropTrail}
                shake={state.lastScoreEvent ? shake : null}
                responsive
              />
              {phase === "game" && state.lastScoreEvent && <EffectPopups popups={popups} />}
              {phase === "countdown" && countdownValue !== null && <CountdownOverlay value={countdownValue} />}
              {phase === "game" && state.status === "paused" && !finishedStage && !showGuide && !confirmExit && !showControlEditor && (
                <PauseOverlay onResume={resume} onRestart={() => setConfirmExit("restart")} onMainMenu={() => setConfirmExit("main")} onHelp={() => setShowGuide(true)} />
              )}
              {phase === "game" && state.status === "gameover" && !stage && (
                <GameOverScreen
                  score={state.score}
                  highScore={highScore}
                  isNewHighScore={isNewHighScore && state.score >= highScore && saveStatus === "saved"}
                  onRestart={handleRestart}
                  onMainMenu={handleMainMenu}
                />
              )}
            </div>

            <div className="flex flex-col gap-4 pt-1">
              {stage && <StageHud stage={stage} run={phase === "countdown" ? null : campaignRun} lines={state.totalLinesCleared} />}
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
          <div className="mobile-playground flex h-full w-full flex-col items-center pt-[max(0.25rem,env(safe-area-inset-top))]">
            {/* 점수 배너: 점수를 가장 크게 중앙에 두고(주인공), 일시정지는 우측 끝에 작게 */}
            <div className="mb-1 flex w-[calc(100%-1.5rem)] max-w-md shrink-0 flex-col rounded-xl border border-white/10 bg-white/5 px-2 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-2">
                {/* 사운드 On/Off - 게임 중에도 언제든 음소거할 수 있어야 한다(미니앱 심사 필수 항목).
                    데스크톱은 좌측 SoundControl 패널이 담당하지만 모바일 레이아웃에는 그 패널이
                    없으므로, 일시정지 버튼과 대칭되는 이 슬롯에 배치한다. */}
                <button
                  type="button"
                  aria-label={soundEnabled ? "소리 끄기" : "소리 켜기"}
                  onClick={toggleSound}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-white/80 transition active:scale-95"
                >
                  {soundEnabled ? (
                    <SpeakerOnIcon className="h-[1.125rem] w-[1.125rem] text-cyan-300" />
                  ) : (
                    <SpeakerOffIcon className="h-[1.125rem] w-[1.125rem] text-white/40" />
                  )}
                </button>
                <div className="flex-1 text-center">
                  {stage ? <StageHud stage={stage} run={phase === "countdown" ? null : campaignRun} lines={state.totalLinesCleared} /> : <><div className="font-mono text-[clamp(1.25rem,3dvh,1.75rem)] font-black leading-tight tracking-tight text-white drop-shadow-[0_0_14px_rgba(34,211,238,0.35)]">
                    {state.score.toLocaleString("en-US")}
                  </div>
                  <div className="text-[8px] font-semibold tracking-widest text-white/60">
                    LV.{state.level} · LINES {state.totalLinesCleared}
                  </div></>}
                </div>
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
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-xs text-white/80 disabled:opacity-30"
                >
                  {phase === "countdown" ? "✕" : state.status === "paused" ? "▶" : "❚❚"}
                </button>
              </div>

            </div>

            {/* 바깥 여백을 레일로 옮겨 보드 가용 폭은 유지하고 NEXT/HOLD를 확대한다. */}
            <div className="play-board-region flex min-h-0 w-full max-w-md flex-1 flex-col items-center">
              <div className="relative min-h-0 w-full flex-1 px-11">
                <div className="pointer-events-none absolute left-1.5 top-1 z-10 flex w-9 flex-col items-center gap-1">
                  <span className="text-[9px] font-semibold tracking-widest text-white/60">HOLD</span>
                  <div className="flex h-10 w-9 items-center justify-center rounded-md border border-white/20 bg-black/50">
                    <MiniPiece type={state.hold.type} cellSize={9} dimmed={!state.hold.canHold} />
                  </div>
                </div>
                <div className="pointer-events-none absolute right-1.5 top-1 z-10 flex w-9 flex-col items-center gap-1" data-testid="next-preview">
                  <span className="text-[9px] font-semibold tracking-widest text-white/60">NEXT</span>
                  {nextPreview.slice(0, stage?.kind === "duel" ? 2 : 3).map((type, index) => (
                    <div
                      key={index}
                      className="flex h-10 w-9 items-center justify-center rounded-md border border-white/20 bg-black/50"
                      style={{ opacity: 1 - index * 0.12 }}
                    >
                      <MiniPiece type={type} cellSize={9} />
                    </div>
                  ))}
                  {stage?.kind === "duel" && campaignRun?.ai && phase === "game" && <OpponentPreview ai={campaignRun.ai} />}
                </div>
                <GameBoard
                  key={phase === "countdown" ? "ready" : "game"}
                  board={state.board}
                  active={state.active}
                  ghost={ghost}
                  status={state.status}
                  lastScoreEvent={state.lastScoreEvent}
                  hardDropTrail={hardDropTrail}
                  shake={state.lastScoreEvent ? shake : null}
                  responsive
                />
                {phase === "game" && state.lastScoreEvent && <EffectPopups popups={popups} />}
                {phase === "countdown" && countdownValue !== null && <CountdownOverlay value={countdownValue} />}
                {phase === "game" && state.status === "paused" && !finishedStage && !showGuide && !confirmExit && !showControlEditor && (
                  <PauseOverlay onResume={resume} onRestart={() => setConfirmExit("restart")} onMainMenu={() => setConfirmExit("main")} onHelp={() => setShowGuide(true)} onCustomizeControls={() => setShowControlEditor(true)} />
                )}
                {phase === "game" && state.status === "gameover" && !stage && (
                  <GameOverScreen
                    score={state.score}
                    highScore={highScore}
                    isNewHighScore={isNewHighScore && state.score >= highScore && saveStatus === "saved"}
                    onRestart={handleRestart}
                    onMainMenu={handleMainMenu}
                  />
                )}
              </div>
            </div>

            <div className={"play-pad-region w-full shrink-0 " + (controls.layout ? "custom-control-spacer" : "")}>
              <TouchControls
                layout={controls.layout}
                dispatch={dispatch}
                triggerHardDrop={triggerHardDrop}
                status={phase === "game" ? state.status : "ready"}
                canHold={state.hold.canHold}
                sounds={sounds}
              />
            </div>
          </div>
        )}
      </div>
      {showStages && <StageSelect completed={progress.completed} stars={progress.stars} ready={progress.ready} error={progress.status === "error"} onRetry={progress.retry} onStart={beginStage} onClose={() => setShowStages(false)} />}
      {finishedStage && stage && campaignRun && <Modal title={campaignRun.outcome === "cleared" ? stage.id === STAGES.length ? `${STAGES.length}개 스테이지 모두 클리어!` : "스테이지 클리어!" : "다시 도전해볼까요?"}
        description={campaignRun.outcome === "cleared" ? undefined : campaignRun.reason === "pieces" ? "블록을 모두 썼어요." : campaignRun.reason === "timeout" ? "시간이 다 됐어요." : "보드가 가득 찼어요."}
        onClose={stageList}>
        <div className="space-y-3">
          {campaignRun.outcome === "cleared" && <div className="pb-4 text-center">
            <StageStars count={earnedStars} size={48} />
            <p className="mt-2 text-sm tabular-nums text-white/70">{(campaignRun.elapsedMs / 1000).toFixed(1)}초 · 최고 {Math.max(earnedStars, progress.stars[stage.id] ?? 0)}별</p>
          </div>}
          {progress.status === "error" && <div role="status" className="text-sm text-amber-100">진행 기록을 저장하지 못했어요. 앱을 닫기 전에 다시 저장해 주세요.<button type="button" className="mt-2 min-h-11 w-full rounded-xl border border-amber-200/40" onClick={progress.retry}>기록 다시 저장</button></div>}
          {progress.status === "saving" && <p role="status" className="text-xs text-white/65">진행 기록 저장 중…</p>}
          {campaignRun.outcome === "cleared" && stage.id < STAGES.length && <button type="button" disabled={progress.completed < stage.id} onClick={() => beginStage(stage.id + 1)} className="min-h-14 w-full rounded-xl bg-cyan-300 font-bold text-black disabled:opacity-40">다음 스테이지</button>}
          <button type="button" onClick={() => beginStage(stage.id)} className="min-h-12 w-full rounded-xl border border-white/25 text-white">{campaignRun.outcome === "cleared" ? "한 번 더 플레이" : "다시 도전"}</button>
          <button type="button" onClick={stageList} className="min-h-11 w-full text-sm text-white/75">단계 목록</button>
        </div>
      </Modal>}
      {saveStatus === "error" && <p role="status" className="fixed left-1/2 top-2 z-[110] w-[90%] max-w-md -translate-x-1/2 rounded-lg bg-[#252018] p-2 text-center text-xs text-amber-100">기록 저장을 확인하지 못했어요. 이번 실행의 기록은 유지되지만 앱을 닫으면 사라질 수 있어요.</p>}
      {showGuide && <ControlsGuide isMobile={isMobile} onClose={() => setShowGuide(false)} />}
      {showControlEditor && <ControlLayoutEditor board={state.board} layout={controls.layout} ready={controls.ready} loadError={controls.error} onSave={controls.save} onClose={() => setShowControlEditor(false)} />}
      {confirmExit && <Modal title={confirmExit === "main" ? "메인으로 돌아갈까요?" : "다시 시작할까요?"}
        description={stage ? "현재 도전은 종료돼요. 이미 클리어한 스테이지 기록은 유지돼요." : "현재 게임은 종료돼요. 완료하지 않은 이번 판의 점수는 최고 기록에 반영되지 않아요."}
        onClose={() => setConfirmExit(null)}>
        <div className="flex gap-3">
          <button type="button" className="min-h-11 flex-1 rounded-xl bg-cyan-400 px-3 font-bold text-black" onClick={() => setConfirmExit(null)}>돌아가기</button>
          <button type="button" className="min-h-11 flex-1 rounded-xl border border-white/25 px-3 text-white" onClick={() => { const action = confirmExit; setConfirmExit(null); if (action === "main") handleMainMenu(); else handleRestart(); }}>{confirmExit === "main" ? "메인으로" : "다시 시작"}</button>
        </div>
      </Modal>}
    </div>
  );
}

export default SinglePlayerApp;
