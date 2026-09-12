// @vitest-environment jsdom
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { TouchControls } from "../../src/components/TouchControls";
import { playGameHaptic } from "../../src/lib/haptics";
import { advance, mount, visibility } from "./agent-A-harness";

const platform = vi.hoisted(() => ({ toss: false, feedback: vi.fn(async () => undefined) }));
vi.mock("@apps-in-toss/web-framework", () => ({ generateHapticFeedback: platform.feedback }));
vi.mock("../../src/lib/appsInToss", () => ({ isAppsInToss: () => platform.toss }));

/** 입력: 버튼/이벤트 종류. 출력: 포인터 ID가 있는 실제 DOM 이벤트 전달. */
async function pointer(button: Element, type: string) {
  const event = new MouseEvent(type, { bubbles: true, button: 0 });
  Object.defineProperty(event, "pointerId", { value: 1 });
  await act(async () => { button.dispatchEvent(event); });
}

describe("touch feedback", () => {
  it("native bridge receives one tap while held repeats keep moving, and no duplicate click", async () => {
    const postMessage = vi.fn(), dispatch = vi.fn();
    vi.stubGlobal("webkit", { messageHandlers: { quadHaptic: { postMessage } } });
    const host = await mount(<TouchControls status="playing" dispatch={dispatch} triggerHardDrop={vi.fn()} />);
    const button = host.querySelector('[aria-label="왼쪽 이동"]')!;
    await pointer(button, "pointerdown"); await advance(300);
    expect(button.getAttribute("data-pressed")).toBe("true");
    expect(dispatch.mock.calls.length).toBeGreaterThan(1);
    expect(postMessage.mock.calls).toEqual([["tap"]]);
    await pointer(button, "pointerup");
    await act(async () => { button.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })); });
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(button.getAttribute("data-pressed")).toBe("false");
  });
  it("DROP semantic click requests stronger feedback once and resets its visual pulse", async () => {
    const postMessage = vi.fn(), drop = vi.fn();
    vi.stubGlobal("webkit", { messageHandlers: { quadHaptic: { postMessage } } });
    const host = await mount(<TouchControls status="playing" dispatch={vi.fn()} triggerHardDrop={drop} />);
    const button = host.querySelector<HTMLButtonElement>('[aria-label="하드드롭"]')!;
    await act(async () => button.click());
    expect(postMessage.mock.calls).toEqual([["drop"]]); expect(drop).toHaveBeenCalledTimes(1);
    expect(button.getAttribute("data-pressed")).toBe("true");
    await advance(90); expect(button.getAttribute("data-pressed")).toBe("false");
  });
  it("hidden cancels semantic feedback pulse and disabled HOLD has no haptic", async () => {
    const postMessage = vi.fn();
    vi.stubGlobal("webkit", { messageHandlers: { quadHaptic: { postMessage } } });
    const host = await mount(<TouchControls status="playing" canHold={false} dispatch={vi.fn()} triggerHardDrop={vi.fn()} />);
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="홀드"]')!.click());
    expect(postMessage).not.toHaveBeenCalled();
    const rotate = host.querySelector<HTMLButtonElement>('[aria-label="회전"]')!;
    await act(async () => rotate.click()); await visibility(true);
    expect(rotate.getAttribute("data-pressed")).toBe("false");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("bridge failure cannot swallow game input", async () => {
    vi.stubGlobal("webkit", { messageHandlers: { quadHaptic: { postMessage() { throw new Error("closed"); } } } });
    const dispatch = vi.fn();
    const host = await mount(<TouchControls status="playing" dispatch={dispatch} triggerHardDrop={vi.fn()} />);
    await pointer(host.querySelector('[aria-label="회전"]')!, "pointerdown");
    expect(dispatch).toHaveBeenCalledWith({ type: "ROTATE_CW" });
  });
  it("Toss uses tap/medium feedback, not the standalone native bridge", () => {
    const postMessage = vi.fn();
    vi.stubGlobal("webkit", { messageHandlers: { quadHaptic: { postMessage } } });
    platform.toss = true;
    try {
      platform.feedback.mockClear(); playGameHaptic(); playGameHaptic("drop");
      expect(platform.feedback.mock.calls).toEqual([[{ type: "tap" }], [{ type: "tickMedium" }]]);
      expect(postMessage).not.toHaveBeenCalled();
    } finally { platform.toss = false; }
  });
  it("unsupported web vibration is a safe no-op", () => {
    vi.stubGlobal("webkit", undefined);
    vi.stubGlobal("navigator", {});
    expect(() => playGameHaptic()).not.toThrow();
  });
});
