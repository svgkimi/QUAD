// @vitest-environment jsdom
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { CONTROL_IDS, controlPositionStyle, defaultControlLayout, isControlLayoutUsable, parseControlLayout } from "../../src/lib/controlLayout";
import { useControlLayout } from "../../src/hooks/useControlLayout";
import { mount, remount } from "./agent-A-harness";

const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn() }));
vi.mock("../../src/lib/persistentStorage", () => storage);
let current: ReturnType<typeof useControlLayout>;
function Probe() { current = useControlLayout(); return null; }
const layout = defaultControlLayout(393, 600, 71, 53);

describe("custom control layout", () => {
  it("never reuses old full-game coordinates in the protected pad", () => {
    expect(parseControlLayout(JSON.stringify({ version: 1, positions: layout }))).toBeNull();
  });
  it("persists per-button size and rejects invalid size values", () => {
    const sized = { ...layout, hold: { ...layout.hold, scale: 1.1 } };
    expect(parseControlLayout(JSON.stringify({ version: 2, positions: sized }))).toEqual(sized);
    for (const scale of [0, .79, 1.26, "1"]) expect(parseControlLayout(JSON.stringify({ version: 2, positions: { ...layout, hold: { ...layout.hold, scale } } }))).toBeNull();
    expect(controlPositionStyle(sized.hold).width).toBe("var(--key-width)");
  });
  it.each([320,360,393,430,767,768,820,1280])("default pad fits without using any board area at width %i", width => {
    const w = Math.max(64, Math.min(80, width * .18)), h = 48;
    const height = 2 * h + Math.max(8, Math.min(12, width * .02)) + 12;
    expect(isControlLayoutUsable(defaultControlLayout(width - 12, height, w, h), width - 12, height, w, h)).toBe(true);
  });
  it("rejects overlapping layouts after resizing; default layout fits the original screen", () => {
    expect(isControlLayoutUsable(layout, 393, 600, 71, 53)).toBe(true);
    expect(isControlLayoutUsable({ ...layout, left: layout.right }, 393, 600, 71, 53)).toBe(false);
    expect(isControlLayoutUsable(layout, 150, 200, 71, 53)).toBe(false);
  });
  it("round trips all six positions; reset and corrupt records fall back to default", () => {
    expect(parseControlLayout(JSON.stringify({ version: 2, positions: layout }))).toEqual(layout);
    for (const raw of [null, "{", "{}", '{"version":2,"positions":null}']) expect(parseControlLayout(raw)).toBeNull();
  });
  it.each(CONTROL_IDS)("rejects invalid or missing position: %s", id => {
    expect(parseControlLayout(JSON.stringify({ version: 2, positions: { ...layout, [id]: { x: 1.1, y: 0 } } }))).toBeNull();
    expect(parseControlLayout(JSON.stringify({ version: 2, positions: { ...layout, [id]: null } }))).toBeNull();
  });
  it("render positions keep a whole button within the viewport", () => {
    expect(controlPositionStyle({ x: 0, y: 1 }).left).toContain("clamp(");
    expect(controlPositionStyle({ x: 0, y: 1 }).top).toContain("100% - var(--key-height) / 2 - 6px");
  });
  it("does not write before delayed hydration or replace a saved layout with defaults", async () => {
    let resolve!: (raw: string) => void;
    storage.getItem.mockReturnValue(new Promise<string>(r => { resolve = r; })); storage.setItem.mockReset();
    await mount(<Probe />); expect(current.ready).toBe(false);
    await act(async () => { expect(await current.save(null)).toBe(false); });
    expect(storage.setItem).not.toHaveBeenCalled();
    await act(async () => resolve(JSON.stringify({ version: 2, positions: layout })));
    expect(current.layout).toEqual(layout); expect(current.ready).toBe(true);
  });
  it("failed save preserves previous layout, retry saves, reset persists and survives remount", async () => {
    storage.getItem.mockResolvedValue(JSON.stringify({ version: 2, positions: layout }));
    storage.setItem.mockResolvedValue(false);
    await mount(<Probe />);
    await act(async () => { expect(await current.save(null)).toBe(false); });
    expect(current.layout).toEqual(layout); expect(current.error).toBe(true);
    storage.setItem.mockResolvedValue(true);
    await act(async () => { expect(await current.save(null)).toBe(true); });
    expect(current.layout).toBeNull(); expect(current.error).toBe(false);
    storage.getItem.mockResolvedValue('{"version":2,"positions":null}');
    await remount(<Probe />); expect(current.layout).toBeNull();
  });
});
