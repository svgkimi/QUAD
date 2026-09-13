import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UseGameEngineResult } from "../../src/hooks/useGameEngine";
import { advance, click, finishCountdown, frame, key, mount, remount, visibility } from "./agent-A-harness";

const observation = vi.hoisted(() => ({
  current: null as UseGameEngineResult | null,
  mobile: false,
  developerAccess: false,
  submitScore: vi.fn(() => true),
}));

// 빌드 상수만 대체한다. 실제 단계 선택·진입 가드·엔진·저장은 그대로 검증한다.
vi.mock("../../src/campaign/access", async importOriginal => ({
  ...await importOriginal<typeof import("../../src/campaign/access")>(),
  get DEVELOPER_STAGE_ACCESS() { return observation.developerAccess; },
}));

const audio = vi.hoisted(() => ({
  enabled: false,
  toggle: vi.fn(),
  sounds: Object.fromEntries([
    "move", "rotate", "softDrop", "hardDrop", "hold", "lock", "lineClear", "tetris",
    "tSpin", "levelUp", "gameOver", "countdownTick", "uiSelect",
  ].map((name) => [name, vi.fn()])),
  music: {
    start: vi.fn(), stop: vi.fn(), setSpeedMultiplier: vi.fn(), setTrackIndex: vi.fn(), setVolume: vi.fn(),
    trackIndex: 0, tracks: [{ id: "agent-A-silent", name: "QA silent stub" }], volume: 0,
  },
}));

// Observe the public result of the REAL hook; no mocked transitions/reducer.
vi.mock("../../src/hooks/useGameEngine", async () => {
  const actual = await vi.importActual<typeof import("../../src/hooks/useGameEngine")>(
    "../../src/hooks/useGameEngine",
  );
  return {
    ...actual,
    useGameEngine(options: Parameters<typeof actual.useGameEngine>[0]) {
      const result = actual.useGameEngine(options);
      observation.current = result;
      return result;
    },
  };
});

// Out-of-scope hooks/rendering/platform bridges are isolated. No SDK or audio calls.
vi.mock("../../src/hooks/useSound", () => ({ useSound: () => audio }));
vi.mock("../../src/hooks/useHighScore", () => ({
  useHighScore: () => ({ highScore: 0, submitScore: observation.submitScore }),
}));
vi.mock("../../src/hooks/useIsMobile", () => ({ useIsMobile: () => observation.mobile }));
vi.mock("../../src/hooks/useEffects", () => ({ useEffects: () => ({ shake: null, popups: [] }) }));
vi.mock("../../src/components/AppsInTossTopBar", () => ({ AppsInTossTopBar: () => null }));
vi.mock("../../src/components/GameBoard", () => ({
  GameBoard: ({ status, board, active, ghost, hardDropTrail }: { status: string; board: (string | null)[][]; active: unknown; ghost: unknown; hardDropTrail: unknown }) => <output aria-label="Agent A board status" data-filled={board.flat().filter(Boolean).length} data-active={!!active} data-ghost={!!ghost} data-trail={!!hardDropTrail}>{status}</output>,
}));

import { getCampaignRun } from "../../src/campaign/session";
import { chooseOpponentActions } from "../../src/campaign/opponent";
import SinglePlayerApp from "../../src/components/SinglePlayerApp";

/** Read latest actual hook state; input: none, output: public hook result. */
function game(): UseGameEngineResult {
  if (!observation.current) throw new Error("Hook was not mounted");
  return observation.current;
}

/** Enter normal play through the REAL title button/countdown; input: none, output: host. */
async function enterGame(): Promise<HTMLDivElement> {
  const host = await mount(<StrictMode><SinglePlayerApp /></StrictMode>);
  await click(host, "게임 시작");
  await finishCountdown();
  expect(game().state.status).toBe("playing");
  return host;
}

/** Reach gameover by deterministic legal hard drops; input/output: none. */
async function reachGameover(): Promise<void> {
  for (let i = 0; i < 60 && game().state.status === "playing"; i++) await key("Space");
  expect(game().state.status).toBe("gameover");
}

beforeEach(() => {
  observation.mobile = false;
  observation.developerAccess = false;
  observation.current = null;
  vi.clearAllMocks();
  vi.spyOn(Math, "random").mockReturnValue(0.123456);
});

describe("Agent A | actual SinglePlayerApp and useGameEngine lifecycle", () => {
  it.each([30, 40, 50])("developer stage %s starts, pauses and restarts without altering normal progress", async id => {
    observation.developerAccess = true; observation.mobile = true;
    const stored = '{"version":1,"completed":2,"stars":{"1":3,"2":2}}';
    localStorage.setItem("quad:campaign-basic50-v1", stored);
    const host = await mount(<StrictMode><SinglePlayerApp /></StrictMode>);
    expect(host.textContent).toContain("DEV · 전체 단계 연습");
    await click(host, "스테이지 모드");
    await click(host, `${id}번 ${id / 10}장 보스 도전`);
    await click(host, "이 스테이지 시작"); await finishCountdown();
    expect(getCampaignRun(game().state)?.stageId).toBe(id);
    expect(game().state.status).toBe("playing");
    await key("KeyP"); await click(host, "다시하기"); await finishCountdown();
    expect(getCampaignRun(game().state)?.stageId).toBe(id);
    expect(game().state.status).toBe("playing");
    expect(localStorage.getItem("quad:campaign-basic50-v1")).toBe(stored);
    await remount(<StrictMode><SinglePlayerApp /></StrictMode>);
    await click(host, "스테이지 모드");
    expect([...host.querySelectorAll<HTMLButtonElement>('button[aria-label*="번 "]')].every(b => !b.disabled)).toBe(true);
  });

  it("a skipped developer mission shows earned stars and allows next stage but does not save progress", async () => {
    observation.developerAccess = true; observation.mobile = true;
    const stored = '{"version":1,"completed":1,"stars":{"1":2}}';
    localStorage.setItem("quad:campaign-basic50-v1", stored);
    vi.mocked(Math.random).mockReturnValue(7 / 4294967296);
    const host = await mount(<StrictMode><SinglePlayerApp /></StrictMode>);
    await click(host, "스테이지 모드");
    const label = host.querySelector('[aria-label^="12번 "]')!.getAttribute("aria-label")!;
    await click(host, label); await click(host, "이 스테이지 시작"); await finishCountdown();
    for (const code of ["ArrowUp", "ArrowLeft", "ArrowLeft", "ArrowLeft", "ArrowLeft", "Space"]) {
      await key(code); await key(code, "keyup");
    }
    expect(getCampaignRun(game().state)?.outcome).toBe("cleared");
    expect(host.textContent).toContain("이번 연습 3별");
    expect(localStorage.getItem("quad:campaign-basic50-v1")).toBe(stored);
    await click(host, "다음 스테이지"); await finishCountdown();
    expect(getCampaignRun(game().state)?.stageId).toBe(13);
    expect(observation.submitScore).not.toHaveBeenCalled();
    expect(localStorage.getItem("quad:campaign-basic50-v1")).toBe(stored);
  });

  it("normal build does not unlock from a developer URL or localStorage toggle", async () => {
    localStorage.setItem("quad:developer-mode", "true");
    const previousUrl = location.href;
    history.replaceState(null, "", "?developer=true&unlockStages=1");
    try {
      const host = await mount(<StrictMode><SinglePlayerApp /></StrictMode>);
      await click(host, "스테이지 모드");
      expect(host.querySelector<HTMLButtonElement>('[aria-label^="50번 "]')!.disabled).toBe(true);
      expect(host.textContent).not.toContain("기록 저장 안 함");
    } finally { history.replaceState(null, "", previousUrl); }
  });
  it.each([false, true])("stage criteria pauses AI/time and resumes on one explicit click (mobile=%s)", async mobile => {
    observation.mobile = mobile;
    localStorage.setItem("quad:campaign-basic50-v1", JSON.stringify({ version: 1, completed: 4 }));
    const host = await mount(<StrictMode><SinglePlayerApp /></StrictMode>);
    await click(host, "스테이지 모드"); await click(host, "5번 1장 라이벌 도전");
    await click(host, "이 스테이지 시작"); await finishCountdown();
    await frame(1000); await frame(1050);
    await click(host, "목표와 별 조건 보기");
    expect(game().state.status).toBe("paused");
    const frozen = JSON.stringify(game().state);
    await key("KeyP"); await key("KeyP", "keyup"); await frame(50000);
    expect(JSON.stringify(game().state)).toBe(frozen);
    await click(host, "계속하기");
    expect(game().state.status).toBe("playing");
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    const before = getCampaignRun(game().state)!.elapsedMs;
    await frame(60000); await frame(60050);
    expect(getCampaignRun(game().state)!.elapsedMs - before).toBe(50);
    await click(host, "목표와 별 조건 보기"); await visibility(true);
    await click(host, "계속하기"); await visibility(false);
    expect(game().state.status).toBe("paused");
  });

  it("campaign unlocks through real UI, saves separately, and returns to classic cleanly", async () => {
    localStorage.setItem("quad:campaign-progress", '{"version":1,"completed":17}');
    const host = await mount(<StrictMode><SinglePlayerApp /></StrictMode>);
    await click(host, "스테이지 모드");
    await click(host, "1번 3줄 제거 도전");
    await click(host, "이 스테이지 시작");
    await finishCountdown();
    expect(getCampaignRun(game().state)?.stageId).toBe(1);
    // Real key events execute a legal three-line solution; a single drop is no longer a win.
    const codes = { MOVE_LEFT: "ArrowLeft", MOVE_RIGHT: "ArrowRight", ROTATE_CW: "ArrowUp", HARD_DROP: "Space" };
    for (let pieces = 0; pieces < 30 && getCampaignRun(game().state)?.outcome === "playing"; pieces++) {
      for (const action of chooseOpponentActions(game().state)) {
        const code = codes[action.type as keyof typeof codes];
        expect(code).toBeDefined();
        await key(code); await key(code, "keyup");
      }
    }
    expect(host.textContent).toContain("스테이지 클리어!");
    expect(getCampaignRun(game().state)?.outcome).toBe("cleared");
    expect(JSON.parse(localStorage.getItem("quad:campaign-basic50-v1")!)).toEqual({ version: 1, completed: 1, stars: { 1: 3 } });
    expect(host.querySelector('[aria-label="획득 별 3 / 3"]')).not.toBeNull();
    expect(JSON.parse(localStorage.getItem("quad:campaign-progress")!)).toEqual({ version: 1, completed: 17 });
    expect(observation.submitScore).not.toHaveBeenCalled();
    await click(host, "다음 스테이지"); await finishCountdown();
    expect(getCampaignRun(game().state)?.stageId).toBe(2);
    await key("KeyP"); await click(host, "메인으로");
    await click(host, "게임 시작"); await finishCountdown();
    expect(getCampaignRun(game().state)).toBeNull();
    expect(game().state.gravityIntervalMs).toBeUndefined();
  });
  it("new countdown never draws the previous board, active piece, ghost or drop trail", async () => {
    const host = await enterGame();
    await key("Space"); await key("KeyC"); await key("KeyP");
    const previous = game().state;
    expect(previous.board.flat().some(Boolean)).toBe(true);
    await click(host, "메인으로"); await click(host, "게임 시작");
    const board = host.querySelector('[aria-label="Agent A board status"]')!;
    expect(board.textContent).toBe("ready");
    expect(board.getAttribute("data-filled")).toBe("0");
    for (const key of ["active", "ghost", "trail"]) expect(board.getAttribute(`data-${key}`)).toBe("false");
    await key("Space"); await frame(50_000);
    expect(game().state).toEqual(previous);
    await finishCountdown();
    expect(game().state.score).toBe(0); expect(game().state.board.flat().some(Boolean)).toBe(false);
  });
  it("control: initial countdown keeps engine ready until 3/2/1/GO ends", async () => {
    const host = await mount(<StrictMode><SinglePlayerApp /></StrictMode>);
    expect(game().state.status).toBe("ready");
    await click(host, "게임 시작");
    for (const value of [3, 2, 1]) {
      expect(host.querySelector(".animate-countdown-pulse")?.textContent).toBe(String(value));
      expect(game().state.status).toBe("ready");
      await advance(700);
    }
    expect(host.querySelector(".animate-countdown-pulse")?.textContent).toBe("GO!");
    await advance(449);
    expect(game().state.status).toBe("ready");
    await advance(1);
    expect(game().state.status).toBe("playing");
    expect(host.querySelector(".animate-countdown-pulse")).toBeNull();
  });

  it("control: pause/resume and pause/restart buttons use real state transitions", async () => {
    const host = await enterGame();
    await key("Space");
    await key("KeyP");
    const paused = game().state;
    await frame(0);
    await frame(5_000);
    expect(game().state).toEqual(paused);
    await click(host, "계속하기");
    expect(game().state.status).toBe("playing");
    expect(game().state.board).toEqual(paused.board);
    await key("KeyP");
    await click(host, "다시하기");
    expect(game().state.status).toBe("playing");
    expect(game().state.score).toBe(0);
    expect(game().state.board.flat().every((cell) => cell === null)).toBe(true);
  });

  it("control: gameover submits final score once, blocks game input, and allows restart", async () => {
    const host = await enterGame();
    await reachGameover();
    const finalState = game().state;
    expect(host.textContent).toContain("GAME OVER");
    expect(observation.submitScore).toHaveBeenCalledTimes(1);
    expect(observation.submitScore).toHaveBeenCalledWith(finalState.score);
    for (const code of ["ArrowLeft", "ArrowUp", "Space", "KeyC", "KeyP"]) await key(code);
    await key("ArrowLeft", "keyup");
    await frame(0);
    await frame(60_000);
    expect(game().state).toEqual(finalState);
    expect(observation.submitScore).toHaveBeenCalledTimes(1);
    await click(host, "다시하기");
    expect(game().state.status).toBe("playing");
    expect(game().state.score).toBe(0);
  });

  it("control: mobile countdown exit cancels pending start even after its deadline", async () => {
    observation.mobile = true;
    const host = await mount(<StrictMode><SinglePlayerApp /></StrictMode>);
    await click(host, "게임 시작");
    await advance(700);
    await click(host, "메인으로");
    await advance(10_000);
    expect(game().state.status).toBe("ready");
    expect(host.textContent).toContain("QUAD");
    expect(host.querySelector(".animate-countdown-pulse")).toBeNull();
  });

  it("control: component reload returns to title/ready (no full-game save contract asserted)", async () => {
    const host = await enterGame();
    await key("Space");
    expect(game().state.score).toBeGreaterThan(0);
    await remount(<StrictMode><SinglePlayerApp /></StrictMode>);
    expect(game().state.status).toBe("ready");
    expect(game().state.score).toBe(0);
    expect(host.textContent).toContain("QUAD");
    // High-score hydration/persistence is owned by Main and deliberately not tested here.
  });

  it("A-01: Escape closing lobby settings after pause/home must not resume the abandoned game", async () => {
    const host = await enterGame();
    await key("KeyP");
    await click(host, "메인으로");
    expect(host.textContent).toContain("QUAD");
    await click(host, "게임 설정");
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    const scoreBefore = game().state.score;
    await key("Escape");
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    await key("Space");
    expect({
      titleVisible: host.textContent?.includes("QUAD"),
      status: game().state.status,
      score: game().state.score,
    }, "closing a title modal must not enable hidden gameplay or scoring").toEqual({
      titleVisible: true,
      status: expect.stringMatching(/^(ready|paused)$/),
      score: scoreBefore,
    });
  });

  it.each(["paused", "gameover"] as const)("A-01: %s -> home -> start must not carry old overlays into countdown", async (status) => {
    const host = await enterGame();
    if (status === "paused") await key("KeyP");
    else await reachGameover();
    await click(host, "메인으로");
    await click(host, "게임 시작");
    expect(host.querySelector(".animate-countdown-pulse")?.textContent).toBe("3");
    const headings = [...host.querySelectorAll("h2")].map((heading) => heading.textContent);
    expect(headings, "countdown should not coexist with stale pause/gameover menus").not.toContain(
      status === "paused" ? "PAUSED" : "GAME OVER",
    );
  });

  it("A-02: hiding during countdown must not start gameplay while hidden or auto-run on return", async () => {
    const host = await mount(<StrictMode><SinglePlayerApp /></StrictMode>);
    await click(host, "게임 시작");
    await visibility(true);
    expect(game().state.status).toBe("ready");
    await finishCountdown();
    const hiddenStatus = game().state.status;
    await visibility(false);
    expect({ hiddenStatus, returnedStatus: game().state.status }).toEqual({
      hiddenStatus: expect.stringMatching(/^(ready|paused)$/),
      returnedStatus: expect.stringMatching(/^(ready|paused)$/),
    });
  });
});
