import { act } from "react";
import { describe, expect, it } from "vitest";
import { useGameEngine, type UseGameEngineResult } from "../../src/hooks/useGameEngine";
import { advance, frame, key, mount, visibility } from "./agent-A-harness";

let game: UseGameEngineResult;

/** Mount the actual hook; input: none, output: empty view (state is observed through public result). */
function Probe() {
  game = useGameEngine();
  return null;
}

describe("Agent A | actual useGameEngine transition integration", () => {
  it("start and restart remove the previous hard-drop trail", async () => {
    await mount(<Probe />);
    await act(async () => game.start(1));
    for (const reset of ["restart", "start"] as const) {
      await act(async () => game.triggerHardDrop());
      expect(game.hardDropTrail).not.toBeNull();
      await act(async () => game[reset](1));
      expect(game.hardDropTrail).toBeNull();
    }
  });
  it("control: ready -> playing -> paused -> playing -> restart preserves/reset expected state", async () => {
    await mount(<Probe />);
    expect(game.state.status).toBe("ready");
    await act(async () => { game.start(1); });
    await frame(0);
    await frame(100);
    await act(async () => { game.pause(); });
    const paused = game.state;
    await frame(2000);
    expect(game.state).toEqual(paused);
    await act(async () => { game.resume(); });
    expect(game.state.status).toBe("playing");
    expect(game.state.active).toEqual(paused.active);
    await act(async () => { game.triggerHardDrop(); });
    expect(game.state.score).toBeGreaterThan(0);
    await act(async () => { game.restart(1); });
    expect(game.state.status).toBe("playing");
    expect(game.state.score).toBe(0);
    expect(game.state.board.flat().every((cell) => cell === null)).toBe(true);
  });

  it("control: active play auto-pauses when hidden and does not auto-resume", async () => {
    await mount(<Probe />);
    await act(async () => { game.start(1); });
    await visibility(true);
    expect(game.state.status).toBe("paused");
    const paused = game.state;
    await frame(0);
    await frame(60_000);
    expect(game.state).toEqual(paused);
    await visibility(false);
    expect(game.state.status).toBe("paused");
  });

  it("A-03: hidden transition should clear held-key repeat before resume without keyup", async () => {
    await mount(<Probe />);
    await act(async () => { game.start(1); });
    await key("ArrowRight");
    await visibility(true);
    expect(game.state.status).toBe("paused");
    const x = game.state.active!.position.x;
    await advance(200);
    expect(game.state.active!.position.x).toBe(x);
    // Key released while another tab owns focus: this window receives no keyup.
    await visibility(false);
    await act(async () => { game.resume(); });
    await advance(35);
    expect(game.state.active!.position.x, "stale ARR must not move the resumed piece").toBe(x);
  });

  it("A-03: repeat started while paused should not become live after resume", async () => {
    await mount(<Probe />);
    await act(async () => { game.start(1); game.pause(); });
    await key("ArrowRight");
    await advance(200);
    const x = game.state.active!.position.x;
    await act(async () => { game.resume(); });
    await advance(35);
    expect(game.state.active!.position.x, "paused gameplay input must be discarded, including its repeat timer").toBe(x);
  });

  it("A-04: resume before the first returning RAF should not include hidden time in lock delay", async () => {
    await mount(<Probe />);
    await act(async () => { game.start(1); });
    // Use legal public SOFT_DROP actions, not a mocked reducer or fabricated state.
    for (let i = 0; i < 40; i++) {
      await act(async () => { game.dispatch({ type: "SOFT_DROP" }); });
    }
    expect(game.ghost?.position).toEqual(game.state.active?.position);
    expect(game.state.board.flat().every((cell) => cell === null)).toBe(true);
    await frame(100);
    await visibility(true);
    const occupiedBefore = game.state.board.flat().filter((cell) => cell !== null).length;
    await visibility(false);
    // Simulated legal event order: user resumes before throttled RAF returns.
    await act(async () => { game.resume(); });
    await frame(60_100);
    const occupiedAfter = game.state.board.flat().filter((cell) => cell !== null).length;
    expect(occupiedAfter, "paused wall-clock time must not instantly lock a grounded piece").toBe(occupiedBefore);
  });

  it("control: returning RAF before resume discards the hidden gap without locking the piece", async () => {
    await mount(<Probe />);
    await act(async () => { game.start(1); });
    for (let i = 0; i < 40; i++) {
      await act(async () => { game.dispatch({ type: "SOFT_DROP" }); });
    }
    expect(game.ghost?.position).toEqual(game.state.active?.position);
    await frame(100);
    await visibility(true);
    await visibility(false);
    await frame(60_100);
    expect(game.state.status).toBe("paused");
    await act(async () => { game.resume(); });
    await frame(60_116);
    expect(game.state.board.flat().filter((cell) => cell !== null)).toHaveLength(0);
  });
});
