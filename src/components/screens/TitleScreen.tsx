/**
 * TitleScreen.tsx
 * -----------------------------------------------------------------------
 * 메인 로비 화면. 플레이 CTA를 최우선으로 두고, 조작 안내와 게임 설정은
 * 각각 모달로 분리해 작은 모바일 화면에서도 정보 위계가 흐트러지지 않게 한다.
 */

import { useEffect, useState, type ReactNode } from "react";
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
  readonly onOpenMultiplayer?: () => void;
}

type LobbyModal = "controls" | "settings" | null;

/** 로비의 조작 안내/설정이 공유하는 접근 가능한 모달 쉘 */
function LobbyModalShell({
  title,
  description,
  onClose,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 backdrop-blur-md sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lobby-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[82dvh] w-full max-w-sm overflow-y-auto rounded-[1.75rem] border border-white/15 bg-[#15151f] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="lobby-modal-title" className="text-xl font-black tracking-tight text-white">
              {title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-white/45">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`${title} 닫기`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** 데스크톱 키보드 조작법 한 줄 */
function KeyboardControlRow({ keys, action }: { readonly keys: string; readonly action: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-5 rounded-xl border border-white/10 bg-white/[0.035] px-3">
      <span className="rounded-lg bg-white/10 px-2 py-1 font-mono text-xs font-bold text-white/75">{keys}</span>
      <span className="text-sm text-white/55">{action}</span>
    </div>
  );
}

/** 모바일 실제 버튼과 같은 색으로 표시하는 조작 안내 카드 */
function TouchControlCard({
  icon,
  label,
  description,
  tone,
}: {
  readonly icon: string;
  readonly label: string;
  readonly description: string;
  readonly tone: "cyan" | "amber" | "violet" | "indigo" | "rose";
}) {
  const tones = {
    cyan: "border-cyan-300/30 bg-cyan-400/10 text-cyan-200",
    amber: "border-amber-300/30 bg-amber-400/10 text-amber-200",
    violet: "border-violet-300/30 bg-violet-400/10 text-violet-200",
    indigo: "border-indigo-300/30 bg-indigo-400/10 text-indigo-200",
    rose: "border-rose-300/30 bg-rose-400/10 text-rose-200",
  } as const;

  return (
    <div className={`flex min-h-[5.25rem] flex-col justify-between rounded-2xl border p-3 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xl font-black leading-none">{icon}</span>
        <span className="text-xs font-bold">{label}</span>
      </div>
      <span className="text-[10px] leading-snug text-white/45">{description}</span>
    </div>
  );
}

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
  onOpenMultiplayer,
}: TitleScreenProps) {
  const [openModal, setOpenModal] = useState<LobbyModal>(null);

  // 모달은 화면 닫기 버튼 외에도 Escape로 닫힌다.
  useEffect(() => {
    if (openModal === null) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenModal(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openModal]);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#08080d] px-4 py-4 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
      <div className="pointer-events-none absolute left-1/2 top-[8%] h-64 w-64 -translate-x-1/2 rounded-full bg-fuchsia-500/15 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[-7rem] left-1/2 h-64 w-[34rem] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[100px]" />

      <main className="relative flex h-full max-h-[50rem] w-full max-w-sm flex-col">
        <div className="flex flex-1 flex-col items-center justify-center pb-4 pt-2">
          <div className="mb-3 flex items-center gap-2 text-[9px] font-black tracking-[0.34em] text-cyan-200/55">
            <span className="h-px w-7 bg-gradient-to-r from-transparent to-cyan-300/60" />
            BLOCK SYSTEM 01
            <span className="h-px w-7 bg-gradient-to-l from-transparent to-cyan-300/60" />
          </div>
          <h1 className="w-full bg-gradient-to-b from-cyan-200 via-fuchsia-300 to-amber-300 bg-clip-text text-center text-[5.6rem] font-black leading-[0.85] tracking-[-0.055em] text-transparent drop-shadow-[0_0_42px_rgba(168,85,247,0.46)] sm:text-[6.75rem]">
            QUAD
          </h1>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-[9px] font-semibold tracking-[0.22em] text-white/30">PERSONAL BEST</span>
            <span className="h-3 w-px bg-white/15" />
            <span className="font-mono text-sm font-black tracking-wider text-amber-300">{highScore.toLocaleString("en-US")}</span>
          </div>
        </div>

        <div className="flex w-full -translate-y-16 flex-col gap-2.5">
          <button
            type="button"
            onClick={onStart}
            className="group relative min-h-[7.25rem] w-full overflow-hidden rounded-[1.75rem] border border-cyan-200/35 bg-gradient-to-br from-cyan-300 via-cyan-400 to-fuchsia-400 p-5 text-left text-[#07080d] shadow-[0_18px_50px_rgba(34,211,238,0.2),0_4px_0_rgba(8,145,178,0.55)] transition duration-150 hover:brightness-110 active:translate-y-1 active:shadow-[0_8px_25px_rgba(34,211,238,0.16),0_1px_0_rgba(8,145,178,0.55)]"
          >
            <span className="absolute -right-5 -top-8 grid rotate-12 grid-cols-3 gap-1 opacity-20 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" aria-hidden="true">
              {Array.from({ length: 9 }, (_, index) => <span key={index} className="h-8 w-8 rounded-md border-2 border-black/50" />)}
            </span>
            <span className="relative flex h-full items-center justify-between">
              <span>
                <span className="block text-[10px] font-black tracking-[0.24em] text-black/50">QUICK START</span>
                <span className="mt-1 block text-2xl font-black tracking-tight">싱글 플레이</span>
                <span className="mt-1 block text-[11px] font-semibold text-black/50">끝없이 쌓고, 최고 기록에 도전하세요</span>
              </span>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black/85 text-white shadow-lg transition-transform group-hover:scale-105" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6"><path d="m9 6 8 6-8 6V6Z" fill="currentColor" /></svg>
              </span>
            </span>
          </button>

          {onOpenMultiplayer && (
            <button
              type="button"
              onClick={onOpenMultiplayer}
              className="group flex min-h-[4.5rem] w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.055] px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition hover:border-fuchsia-300/30 hover:bg-white/[0.085] active:scale-[0.99]"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-fuchsia-300/20 bg-fuchsia-400/10 font-mono text-xs font-black text-fuchsia-200">VS</span>
                <span><span className="block text-sm font-black text-white/90">1:1 대전</span><span className="mt-0.5 block text-[10px] text-white/35">친구와 실시간 블록 배틀</span></span>
              </span>
              <span className="text-xl text-white/25 transition group-hover:translate-x-1 group-hover:text-fuchsia-200">›</span>
            </button>
          )}
        </div>

        <div className="mt-3 grid w-full -translate-y-16 grid-cols-2 gap-2 rounded-2xl border border-white/[0.07] bg-black/25 p-1.5 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setOpenModal("controls")}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl text-xs font-bold text-white/45 transition hover:bg-white/5 hover:text-white"
          >
            <HelpCircleIcon className="h-4 w-4 text-cyan-300/70" />
            조작 안내
          </button>
          <button
            type="button"
            onClick={() => setOpenModal("settings")}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl text-xs font-bold text-white/45 transition hover:bg-white/5 hover:text-white"
          >
            <GearIcon className="h-4 w-4 text-fuchsia-300/70" />
            게임 설정
          </button>
        </div>
      </main>

      {openModal === "controls" && (
        <LobbyModalShell
          title="조작 안내"
          description={isMobile ? "실제 게임 화면의 버튼과 같은 색상으로 기능을 확인하세요." : "키보드로 빠르게 블록을 조작하세요."}
          onClose={() => setOpenModal(null)}
        >
          {isMobile ? (
            <div className="grid grid-cols-2 gap-2.5">
              <TouchControlCard icon="◀" label="왼쪽" description="블록을 왼쪽으로 이동" tone="cyan" />
              <TouchControlCard icon="▶" label="오른쪽" description="블록을 오른쪽으로 이동" tone="cyan" />
              <TouchControlCard icon="↻" label="회전" description="블록을 시계 방향으로 회전" tone="amber" />
              <TouchControlCard icon="H" label="보관" description="현재 블록을 나중에 사용" tone="violet" />
              <TouchControlCard icon="▼" label="내리기" description="누르는 동안 빠르게 내림" tone="indigo" />
              <TouchControlCard icon="⇊" label="즉시 낙하" description="블록을 바닥까지 바로 낙하" tone="rose" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <KeyboardControlRow keys="← →" action="이동" />
              <KeyboardControlRow keys="↓" action="소프트 드롭" />
              <KeyboardControlRow keys="Space" action="즉시 낙하" />
              <KeyboardControlRow keys="↑ / X" action="시계 방향 회전" />
              <KeyboardControlRow keys="Z / A" action="반시계 / 180도 회전" />
              <KeyboardControlRow keys="C / Shift" action="홀드" />
              <KeyboardControlRow keys="Esc / P" action="일시정지" />
            </div>
          )}
        </LobbyModalShell>
      )}

      {openModal === "settings" && (
        <LobbyModalShell
          title="게임 설정"
          description="사운드와 배경음악을 플레이 스타일에 맞게 조절하세요."
          onClose={() => setOpenModal(null)}
        >
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={onToggleSound}
              aria-label={soundEnabled ? "사운드 끄기" : "사운드 켜기"}
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
              <span className={`text-xs font-black ${soundEnabled ? "text-cyan-300" : "text-white/35"}`}>
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
                    className={`min-h-11 rounded-xl border px-3 text-left text-xs font-semibold transition ${
                      index === musicTrackIndex
                        ? "border-cyan-300/35 bg-cyan-400/15 text-cyan-100"
                        : "border-white/10 bg-white/[0.025] text-white/45 hover:bg-white/10"
                    }`}
                  >
                    {track.name}
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
