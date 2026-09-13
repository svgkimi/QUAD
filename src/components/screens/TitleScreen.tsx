/**
 * TitleScreen.tsx
 * -----------------------------------------------------------------------
 * 메인 로비 화면. 플레이 CTA를 최우선으로 두고, 조작 안내와 게임 설정은
 * 각각 모달로 분리해 작은 모바일 화면에서도 정보 위계가 흐트러지지 않게 한다.
 */

import { useState } from "react";
import { Modal as LobbyModalShell } from "./Modal";
import { ControlsGuide } from "./ControlsGuide";
import { GearIcon, HelpCircleIcon, MusicNoteIcon, SpeakerOffIcon, SpeakerOnIcon } from "../icons";

/** TitleScreen props */
export interface TitleScreenProps {
  readonly highScore: number;
  readonly soundEnabled: boolean;
  readonly onStart: () => void;
  readonly onToggleSound: () => void;
  readonly musicTracks: readonly { readonly id: string; readonly name: string }[];
  readonly musicTrackIndex: number;
  readonly onSelectMusicTrack: (index: number) => void;
  readonly musicVolume: number;
  readonly onChangeMusicVolume: (volume: number) => void;
  /** 모바일에서는 키보드가 아닌 실제 터치 버튼 조작법을 보여준다. */
  readonly isMobile: boolean;
  readonly storageError?: boolean;
  readonly onCustomizeControls?: () => void;
  readonly onOpenStages?: () => void;
  readonly developerStageAccess?: boolean;
}

type LobbyModal = "controls" | "settings" | null;

/** 메인 로비를 렌더링한다. 입력: TitleScreenProps / 출력: JSX */
export function TitleScreen({
  highScore,
  soundEnabled,
  onStart,
  onToggleSound,
  musicTracks,
  musicTrackIndex,
  onSelectMusicTrack,
  musicVolume,
  onChangeMusicVolume,
  isMobile,
  storageError,
  onCustomizeControls,
  onOpenStages,
  developerStageAccess = false,
}: TitleScreenProps) {
  const [openModal, setOpenModal] = useState<LobbyModal>(null);


  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-y-auto bg-[#08080d] px-4 py-4 text-white sm:px-6">
      <main className="relative flex min-h-full w-full max-w-sm flex-col items-center justify-center gap-6 py-6">
        <h1 className="w-full bg-gradient-to-b from-cyan-200 via-fuchsia-300 to-amber-300 bg-clip-text text-center text-[5.6rem] font-black leading-[0.85] tracking-[-0.055em] text-transparent sm:text-[6.75rem]">QUAD</h1>
        <p className="-mt-2 text-sm font-medium text-white/60">한 줄씩 지우고, 기록을 넘어요.</p>
        <div className="relative my-1 flex w-full items-center justify-between gap-4 rounded-xl border border-white/15 bg-[#13151b] px-5 py-4" aria-label="개인 최고 기록">
          <div className="absolute bottom-4 left-0 top-4 w-[3px] rounded-r bg-amber-300" aria-hidden="true" />
          <div className="shrink-0"><p className="text-xs font-semibold text-amber-200">최고 기록</p><div className="mt-2 flex gap-1" aria-hidden="true">{[0,1,2,3].map(i => <span key={i} className="h-2 w-2 rounded-[2px] bg-amber-300" style={{ opacity: 1 - i * .17 }} />)}</div></div>
          <p className="min-w-0 break-all text-right text-[clamp(2.25rem,9vw,3.25rem)] font-black tabular-nums leading-none tracking-[-0.045em] text-white">{highScore.toLocaleString("en-US")}</p>
        </div>
        <button type="button" aria-label="게임 시작" onClick={() => { if (!openModal) onStart(); }}
          className="group relative flex min-h-20 w-full items-center justify-between overflow-hidden rounded-xl border-b-4 border-cyan-600 bg-cyan-300 px-6 text-[#08080d] transition-colors active:bg-cyan-100 focus-visible:outline-cyan-100">
          <span className="relative text-2xl font-black tracking-tight">게임 시작</span>
          <span className="relative flex h-12 w-12 items-center justify-center rounded-lg bg-[#08080d] text-cyan-200" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="ml-0.5 h-7 w-7" fill="currentColor"><path d="m8 5 11 7-11 7V5Z" /></svg>
          </span>
        </button>
        <div aria-hidden="true" className="-mt-4 flex w-full justify-end gap-1 pr-1">
          {['#c084fc','#c084fc','#facc15','#facc15','#22d3ee','#22d3ee','#22d3ee','#22d3ee'].map((color, i) => <span key={i} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: color }} />)}
        </div>
        {onOpenStages && <button type="button" onClick={() => { if (!openModal) onOpenStages(); }} className="flex min-h-14 w-full items-center justify-between rounded-xl border border-cyan-200/40 bg-cyan-200/5 px-5 text-left text-white"><span className="font-bold">스테이지 모드</span><span className="text-xs text-cyan-100">{developerStageAccess ? "DEV · 전체 단계 연습" : "50개 도전 · AI 대전"}</span></button>}
        <div className="flex w-full justify-center gap-8">
          <button type="button" onClick={() => { if (!openModal) setOpenModal("controls"); }}
            className="flex min-h-14 min-w-16 flex-col items-center justify-center gap-2 rounded-xl text-xs font-medium text-white/75">
            <HelpCircleIcon className="h-6 w-6" />조작 안내
          </button>
          <button type="button" onClick={() => { if (!openModal) setOpenModal("settings"); }}
            className="flex min-h-14 min-w-16 flex-col items-center justify-center gap-2 rounded-xl text-xs font-medium text-white/75">
            <GearIcon className="h-6 w-6" />게임 설정
          </button>
        </div>
      </main>

      {openModal === "controls" && <ControlsGuide isMobile={isMobile} onClose={() => setOpenModal(null)} />}

      {openModal === "settings" && (
        <LobbyModalShell
          title="게임 설정"
          description="사운드와 배경음악을 플레이 스타일에 맞게 조절하세요."
          onClose={() => setOpenModal(null)}
        >
          <div className="flex flex-col gap-4">
            {isMobile && onCustomizeControls && <button type="button" onClick={() => { setOpenModal(null); onCustomizeControls(); }} className="flex min-h-14 items-center justify-between rounded-xl border border-white/25 px-4 text-sm font-semibold text-white">버튼 배치 편집<span aria-hidden="true">↗</span></button>}
            {storageError && <p role="status" className="text-sm text-amber-200">설정을 저장하지 못했어요. 이번 실행에는 적용되지만 다시 열면 달라질 수 있어요.</p>}
            {!soundEnabled && <p className="text-xs text-white/80">소리를 켜면 선택한 음악과 볼륨이 적용돼요.</p>}
            <button
              type="button"
              onClick={onToggleSound}
              aria-label={soundEnabled ? "사운드 끄기" : "사운드 켜기"}
              aria-pressed={soundEnabled}
              className="flex min-h-14 items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4"
            >
              <span className="flex items-center gap-3 text-sm font-bold text-white/75">
                {soundEnabled ? (
                  <SpeakerOnIcon className="h-5 w-5 text-cyan-300" />
                ) : (
                  <SpeakerOffIcon className="h-5 w-5 text-white/35" />
                )}
                전체 사운드
              </span>
              <span className={`text-xs font-black ${soundEnabled ? "text-cyan-300" : "text-white/80"}`}>
                {soundEnabled ? "ON" : "OFF"}
              </span>
            </button>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wide text-white/55">
                <MusicNoteIcon className="h-4 w-4 text-fuchsia-300" />
                배경음악
              </div>
              <div className="grid grid-cols-1 gap-2">
                {musicTracks.map((track, index) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => onSelectMusicTrack(index)}
                    aria-pressed={index === musicTrackIndex}
                    className={`min-h-11 rounded-xl border px-3 text-left text-xs font-semibold transition ${
                      index === musicTrackIndex
                        ? "border-cyan-300/35 bg-cyan-400/15 text-cyan-100"
                        : "border-white/10 bg-white/[0.025] text-white/45 hover:bg-white/10"
                    }`}
                  >
                    {track.name}{index === musicTrackIndex && <span aria-hidden="true" className="float-right">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-3 flex items-center justify-between text-xs">
                <label htmlFor="title-music-volume" className="font-bold text-white/55">음악 볼륨</label>
                <span className="font-mono font-bold text-cyan-300">{Math.round(musicVolume * 100)}%</span>
              </div>
              <input
                id="title-music-volume"
                type="range"
                min={0}
                max={100}
                value={Math.round(musicVolume * 100)}
                onChange={(event) => onChangeMusicVolume(Number(event.target.value) / 100)}
                className="h-1.5 w-full cursor-pointer accent-cyan-400"
              />
            </div>
          </div>
        </LobbyModalShell>
      )}
    </div>
  );
}
