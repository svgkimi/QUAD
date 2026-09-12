// Agent C: finite component-only tests against the user-owned live source.
// No engine, server, browser, device, native bridge, or real timers are exercised.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TouchControls,
  type TouchControlsProps,
} from "../../src/components/TouchControls";

vi.mock("@apps-in-toss/web-framework", () => ({
  generateHapticFeedback: vi.fn(async () => undefined),
}));
vi.mock("../../src/lib/appsInToss.ts", () => ({
  isAppsInToss: () => false,
}));

const DAS = 150;
const ARR = 35;
const repeatables = [
  { label: "왼쪽 이동", type: "MOVE_LEFT" },
  { label: "오른쪽 이동", type: "MOVE_RIGHT" },
  { label: "소프트드롭", type: "SOFT_DROP" },
] as const;
const disabledStatuses = ["ready", "paused", "gameover"] as const;
let container: HTMLDivElement;
let root: Root | undefined;
let dispatch: ReturnType<typeof vi.fn>;
let triggerHardDrop: ReturnType<typeof vi.fn>;
let captures: WeakMap<Element, Set<number>>;
let props: TouchControlsProps;
const evidence: Array<Record<string, unknown>> = [];

/** Render/re-render the real component with mock callbacks. Input: props patch; output: void. */
function render(patch: Partial<TouchControlsProps> = {}): void {
  props = { ...props, ...patch };
  act(() => root!.render(createElement(TouchControls, props)));
}

/** Query an accessible-name button. Input: Korean aria-label; output: HTMLButtonElement. */
function button(label: string): HTMLButtonElement {
  const result = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!result) throw new Error(`Missing TouchControls button: ${label}`);
  return result;
}

/** Dispatch a finite synthetic touch pointer event. Input: target, type, id; output: void. */
function pointer(target: Element, type: string, pointerId: number): void {
  // jsdom lacks real pointer capture/hit testing. Only event fields and capture ownership
  // are stubbed; React still receives real bubbling DOM events via dispatchEvent.
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons: type === "pointerdown" ? 1 : 0,
  });
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: "touch" },
    isPrimary: { value: pointerId === 1 },
  });
  act(() => target.dispatchEvent(event));
}

/** Advance bounded fake time. Input: milliseconds; output: void. Never runAllTimers. */
function advance(milliseconds: number): void {
  act(() => vi.advanceTimersByTime(milliseconds));
}

/** Unmount without inventing a browser-generated pointerup. Input: none; output: void. */
function unmount(): void {
  if (!root) return;
  act(() => root!.unmount());
  root = undefined;
}

/** Count mock dispatches by action type. Input: type; output: nonnegative count. */
function count(type: string): number {
  return dispatch.mock.calls.filter(([action]) => action.type === type).length;
}

/** Emit local, non-secret observations before assertions and before test cleanup. */
function record(observation: Record<string, unknown>): void {
  evidence.push(observation);
  console.info("C-touch evidence", JSON.stringify(observation));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  captures = new WeakMap();
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Agent C tests must not use network"); }));
  vi.stubGlobal("WebSocket", vi.fn(() => { throw new Error("Agent C tests must not use network"); }));
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: {
      configurable: true,
      value(this: Element, id: number): void {
        const ids = captures.get(this) ?? new Set<number>();
        ids.add(id);
        captures.set(this, ids);
      },
    },
    hasPointerCapture: {
      configurable: true,
      value(this: Element, id: number): boolean { return captures.get(this)?.has(id) ?? false; },
    },
    releasePointerCapture: {
      configurable: true,
      value(this: Element, id: number): void { captures.get(this)?.delete(id); },
    },
  });
  dispatch = vi.fn();
  triggerHardDrop = vi.fn();
  props = { dispatch, triggerHardDrop, status: "playing" };
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  render();
});

afterEach(() => {
  // Inspect leak evidence inside each test first; cleanup must not hide the observation.
  unmount();
  container.remove();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, "setPointerCapture");
  Reflect.deleteProperty(HTMLElement.prototype, "hasPointerCapture");
  Reflect.deleteProperty(HTMLElement.prototype, "releasePointerCapture");
});

describe("Agent C ordinary-input controls", () => {
  it.each(repeatables)("40 short down/up cycles: $type leaves no timer", ({ label, type }) => {
    const target = button(label);
    for (let id = 1; id <= 40; id += 1) {
      pointer(target, "pointerdown", id);
      advance(20);
      pointer(target, "pointerup", id);
      expect(vi.getTimerCount()).toBe(0);
    }
    advance(1000);
    expect(count(type)).toBe(40);
  });

  it.each(repeatables)("12 held down/up cycles: $type clears ARR on every release", ({ label, type }) => {
    const target = button(label);
    for (let id = 1; id <= 12; id += 1) {
      pointer(target, "pointerdown", id);
      advance(DAS + ARR * 3);
      pointer(target, "pointerup", id);
      expect(vi.getTimerCount()).toBe(0);
    }
    advance(1000);
    expect(count(type)).toBe(48);
  });

  it.each([40, DAS + ARR * 2])("pointercancel at %i ms clears all repeatable inputs", (delay) => {
    for (const [index, { label }] of repeatables.entries()) {
      pointer(button(label), "pointerdown", index + 1);
    }
    advance(delay);
    for (const [index, { label }] of repeatables.entries()) {
      pointer(button(label), "pointercancel", index + 1);
    }
    const calls = dispatch.mock.calls.length;
    advance(1000);
    expect(dispatch).toHaveBeenCalledTimes(calls);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([40, DAS + ARR * 2])("lostpointercapture at %i ms clears the held input", (delay) => {
    const target = button("왼쪽 이동");
    pointer(target, "pointerdown", 1);
    advance(delay);
    captures.get(target)?.delete(1);
    pointer(target, "lostpointercapture", 1);
    const calls = dispatch.mock.calls.length;
    advance(1000);
    expect(dispatch).toHaveBeenCalledTimes(calls);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("three different held buttons repeat and release independently", () => {
    for (const [index, { label }] of repeatables.entries()) pointer(button(label), "pointerdown", index + 1);
    advance(DAS + ARR * 2);
    expect(repeatables.map(({ type }) => count(type))).toEqual([3, 3, 3]);
    expect(vi.getTimerCount()).toBe(3);
    pointer(button("왼쪽 이동"), "pointerup", 1);
    advance(ARR * 2);
    expect(repeatables.map(({ type }) => count(type))).toEqual([3, 5, 5]);
    expect(vi.getTimerCount()).toBe(2);
    pointer(button("소프트드롭"), "pointercancel", 3);
    advance(ARR * 2);
    expect(repeatables.map(({ type }) => count(type))).toEqual([3, 7, 5]);
    pointer(button("오른쪽 이동"), "pointerup", 2);
    advance(1000);
    expect(repeatables.map(({ type }) => count(type))).toEqual([3, 7, 5]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["홀드", "회전", "하드드롭"])("%s taps do not interfere with held movement", (label) => {
    pointer(button("왼쪽 이동"), "pointerdown", 1);
    for (let id = 2; id <= 7; id += 1) {
      pointer(button(label), "pointerdown", id);
      pointer(button(label), "pointerup", id);
    }
    advance(DAS + ARR * 2);
    expect(count("MOVE_LEFT")).toBe(3);
    if (label === "하드드롭") expect(triggerHardDrop).toHaveBeenCalledTimes(6);
    else expect(count(label === "홀드" ? "HOLD" : "ROTATE_CW")).toBe(6);
    pointer(button("왼쪽 이동"), "pointerup", 1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(disabledStatuses)("initial %s renders all controls disabled without timers", (status) => {
    render({ status });
    expect([...container.querySelectorAll("button")].every((target) => target.disabled)).toBe(true);
    advance(1000);
    expect(dispatch).not.toHaveBeenCalled();
    expect(triggerHardDrop).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    // Do not dispatch synthetic pointerdown to disabled nodes: jsdom cannot model hit testing.
  });

  it("a delivered pointercancel after pause still stops the existing repeat", () => {
    const target = button("왼쪽 이동");
    pointer(target, "pointerdown", 1);
    advance(DAS + ARR);
    render({ status: "paused" });
    pointer(target, "pointercancel", 1);
    const calls = dispatch.mock.calls.length;
    advance(1000);
    expect(dispatch).toHaveBeenCalledTimes(calls);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("Agent C current single-player lifecycle contracts", () => {
  it.each([40, DAS + ARR * 2])("C-01 unmount at %i ms stops callbacks and clears timers", (delay) => {
    pointer(button("왼쪽 이동"), "pointerdown", 1);
    advance(delay);
    const callsAtUnmount = dispatch.mock.calls.length;
    unmount();
    const timersAtUnmount = vi.getTimerCount();
    advance(1000);
    record({ issue: "C-01", delay, callsAtUnmount, timersAtUnmount,
      extraCalls: dispatch.mock.calls.length - callsAtUnmount, timersAfter1000ms: vi.getTimerCount() });
    expect.soft(timersAtUnmount).toBe(0);
    expect.soft(dispatch).toHaveBeenCalledTimes(callsAtUnmount);
    expect.soft(vi.getTimerCount()).toBe(0);
  });

  it("C-01 all three held buttons are cleaned on unmount", () => {
    for (const [index, { label }] of repeatables.entries()) pointer(button(label), "pointerdown", index + 1);
    advance(DAS + ARR * 2);
    const callsAtUnmount = dispatch.mock.calls.length;
    unmount();
    advance(ARR * 10);
    record({ issue: "C-01-multiple", extraCalls: dispatch.mock.calls.length - callsAtUnmount,
      timersAfterUnmount: vi.getTimerCount() });
    expect.soft(vi.getTimerCount()).toBe(0);
    expect.soft(dispatch).toHaveBeenCalledTimes(callsAtUnmount);
  });

  for (const status of disabledStatuses) {
    it.each([40, DAS + ARR * 2])(`C-02 playing -> ${status} at %i ms cancels the held repeat`, (delay) => {
      pointer(button("왼쪽 이동"), "pointerdown", 1);
      advance(delay);
      const callsAtDisable = dispatch.mock.calls.length;
      render({ status });
      expect(button("왼쪽 이동").disabled).toBe(true);
      const timersAtDisable = vi.getTimerCount();
      advance(1000);
      const extraWhileDisabled = dispatch.mock.calls.length - callsAtDisable;
      const callsBeforeResume = dispatch.mock.calls.length;
      render({ status: "playing" });
      advance(ARR * 2);
      record({ issue: "C-02", status, delay, timersAtDisable, extraWhileDisabled,
        extraAfterResumeWithoutNewDown: dispatch.mock.calls.length - callsBeforeResume,
        timersAfterResume: vi.getTimerCount() });
      expect.soft(timersAtDisable).toBe(0);
      expect.soft(extraWhileDisabled).toBe(0);
      expect.soft(dispatch).toHaveBeenCalledTimes(callsBeforeResume);
      expect.soft(vi.getTimerCount()).toBe(0);
    });
  }

  it.each(["pointerup", "pointercancel"])("C-03 first finger %s does not cancel the second finger on the same button", (endEvent) => {
    const target = button("왼쪽 이동");
    pointer(target, "pointerdown", 1);
    advance(40);
    pointer(target, "pointerdown", 2);
    advance(DAS + ARR);
    const callsBeforeFirstRelease = count("MOVE_LEFT");
    pointer(target, endEvent, 1);
    expect(target.hasPointerCapture(2)).toBe(true);
    advance(ARR * 4);
    const extraWhileSecondHeld = count("MOVE_LEFT") - callsBeforeFirstRelease;
    record({ issue: "C-03", endEvent, secondPointerStillCaptured: target.hasPointerCapture(2),
      extraWhileSecondHeld, timersWhileSecondHeld: vi.getTimerCount() });
    expect.soft(extraWhileSecondHeld).toBeGreaterThan(0);
    pointer(target, "pointerup", 2);
    advance(1000);
    expect(vi.getTimerCount()).toBe(0);
  });
});
