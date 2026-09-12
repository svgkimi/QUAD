import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { useGameEngine, type UseGameEngineResult } from "../../src/hooks/useGameEngine";
import { TouchControls } from "../../src/components/TouchControls";
import { advance, key, mount, remount, visibility } from "./agent-A-harness";

vi.mock("@apps-in-toss/web-framework", () => ({ generateHapticFeedback: vi.fn(async () => undefined) }));
vi.mock("../../src/lib/appsInToss", () => ({ isAppsInToss: () => false }));
let game: UseGameEngineResult;
/** 입력: 없음 / 출력: 실제 게임 훅의 공개 상태를 관측하는 테스트 화면. */
function Probe() { game = useGameEngine(); return null; }

describe("RC2 input ownership", () => {
  it("horizontal repeat survives down press/release", async () => {
    await mount(<Probe />); await act(async () => game.start(1));
    await key("ArrowRight"); await advance(150);
    await key("ArrowDown"); await advance(35);
    const x = game.state.active!.position.x;
    await key("ArrowDown", "keyup"); await advance(35);
    expect(game.state.active!.position.x).toBe(x + 1);
    await key("ArrowRight", "keyup"); const finalX = game.state.active!.position.x;
    await advance(300); expect(game.state.active!.position.x).toBe(finalX);
  });
  it("last horizontal key wins then releasing it restores the earlier key", async () => {
    await mount(<Probe />); await act(async () => game.start(1));
    await key("ArrowLeft"); await key("ArrowRight");
    const x = game.state.active!.position.x;
    await key("ArrowRight", "keyup"); expect(game.state.active!.position.x).toBe(x - 1);
    await key("ArrowLeft", "keyup");
  });
  it("blur suspends play and clears held repeats", async () => {
    await mount(<Probe />); await act(async () => game.start(1)); await key("ArrowRight");
    await act(async () => window.dispatchEvent(new Event("blur")));
    expect(game.state.status).toBe("paused"); const x = game.state.active!.position.x;
    await act(async () => game.resume()); await advance(500); expect(game.state.active!.position.x).toBe(x);
  });
  it.each(["회전", "홀드", "하드드롭"])("%s pointer tap plus click fires once; semantic click separately fires once", async label => {
    const dispatch = vi.fn(), drop = vi.fn();
    const host = await mount(<TouchControls status="playing" dispatch={dispatch} triggerHardDrop={drop} />);
    const button = host.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;
    const down = new MouseEvent("pointerdown", { bubbles: true, button: 0 });
    Object.defineProperty(down, "pointerId", { value: 1 });
    await act(async () => { button.dispatchEvent(down); button.dispatchEvent(new MouseEvent("pointerup", { bubbles: true })); button.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })); });
    const action = label === "하드드롭" ? drop : dispatch;
    expect(action).toHaveBeenCalledTimes(1);
    await act(async () => button.click()); expect(action).toHaveBeenCalledTimes(2);
  });
  it("disabled HOLD has neither dispatch nor feedback", async () => {
    const dispatch = vi.fn();
    const host = await mount(<TouchControls status="playing" canHold={false} dispatch={dispatch} triggerHardDrop={vi.fn()} />);
    const hold = host.querySelector<HTMLButtonElement>('[aria-label="홀드"]')!;
    expect(hold.disabled).toBe(true); await act(async () => hold.click()); expect(dispatch).not.toHaveBeenCalled();
  });
  it("touch hidden/blur clears timer even without pointerup", async () => {
    const dispatch = vi.fn();
    const host = await mount(<TouchControls status="playing" dispatch={dispatch} triggerHardDrop={vi.fn()} />);
    const down = new MouseEvent("pointerdown", { bubbles: true }); Object.defineProperty(down, "pointerId", { value: 7 });
    await act(async () => host.querySelector('[aria-label="왼쪽 이동"]')!.dispatchEvent(down));
    await visibility(true); const count = dispatch.mock.calls.length;
    await advance(500); await visibility(false); await advance(500); expect(dispatch).toHaveBeenCalledTimes(count);
    await remount(<Probe />);
  });
});
