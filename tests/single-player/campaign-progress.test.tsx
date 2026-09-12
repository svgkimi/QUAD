import { act, StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "./agent-A-harness";
import { parseCampaignProgress, parseCampaignStars, useCampaignProgress } from "../../src/hooks/useCampaignProgress";

const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn() }));
vi.mock("../../src/lib/persistentStorage", () => storage);
let progress: ReturnType<typeof useCampaignProgress>;
function Probe() { progress = useCampaignProgress(); return <div>{progress.status}:{progress.completed}</div>; }
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: Error) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
beforeEach(() => { storage.getItem.mockReset().mockResolvedValue(null); storage.setItem.mockReset().mockResolvedValue(true); });

describe("campaign progress storage", () => {
  it.each([null, "bad", '{}', '{"version":2,"completed":10}', '{"version":1,"completed":51}', '{"version":1,"completed":-1}', '{"version":1,"completed":1.5}'])("validates version and range: %s", raw => {
    expect(parseCampaignProgress(raw)).toBe(0);
  });
  it("reads before writing, merges existing progress, and forbids skipped unlocks", async () => {
    const read = deferred<string | null>(); storage.getItem.mockReturnValue(read.promise);
    await mount(<StrictMode><Probe /></StrictMode>);
    await act(async () => { progress.complete(1); });
    expect(storage.setItem).not.toHaveBeenCalled(); expect(progress.ready).toBe(false);
    await act(async () => { read.resolve('{"version":1,"completed":10}'); });
    expect(progress.completed).toBe(10);
    await act(async () => { progress.complete(10); progress.complete(12); });
    expect(storage.setItem).not.toHaveBeenCalled();
    await act(async () => { progress.complete(11); });
    expect(JSON.parse(storage.setItem.mock.lastCall![1])).toEqual({ version: 1, completed: 11, stars: Object.fromEntries(Array.from({ length: 11 }, (_, i) => [i + 1, 1])) });
  });
  it("read failure blocks play until retry succeeds", async () => {
    storage.getItem.mockRejectedValueOnce(new Error("offline"));
    await mount(<Probe />); expect(progress.ready).toBe(false); expect(progress.status).toBe("error");
    await act(async () => { progress.complete(1); }); expect(storage.setItem).not.toHaveBeenCalled();
    await act(async () => { progress.retry(); }); expect(progress.ready).toBe(true);
  });
  it("failed write retains in-memory progress and retries the latest value", async () => {
    await mount(<Probe />); storage.setItem.mockResolvedValueOnce(false);
    await act(async () => { progress.complete(1); }); expect(progress.completed).toBe(1); expect(progress.status).toBe("error");
    await act(async () => { progress.retry(); }); expect(progress.status).toBe("saved");
    expect(storage.setItem).toHaveBeenLastCalledWith("quad:campaign-basic50-v1", '{"version":1,"completed":1,"stars":{"1":1}}');
  });
  it("late old write responses cannot mask the latest write failure", async () => {
    await mount(<Probe />); const first = deferred<boolean>(), second = deferred<boolean>();
    storage.setItem.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await act(async () => { progress.complete(1); progress.complete(2); });
    await act(async () => { second.resolve(false); }); expect(progress.status).toBe("error");
    await act(async () => { first.resolve(true); }); expect(progress.status).toBe("error");
  });
  it("migrates legacy clears conservatively and ignores invalid or locked stars", () => {
    expect(parseCampaignStars('{"version":1,"completed":2}')).toEqual({ 1: 1, 2: 1 });
    expect(parseCampaignStars('{"version":1,"completed":3,"stars":{"1":3,"2":4,"3":1.5,"4":3}}')).toEqual({ 1: 3, 2: 1, 3: 1 });
    expect(parseCampaignStars("bad")).toEqual({});
  });
  it("replay improves best stars without regressing records or skipping unlocks", async () => {
    storage.getItem.mockResolvedValue('{"version":1,"completed":2,"stars":{"1":2,"2":1}}');
    await mount(<Probe />);
    await act(async () => { progress.complete(1, 1); progress.complete(4, 3); progress.complete(3, 0); progress.complete(3, 4); });
    expect(storage.setItem).not.toHaveBeenCalled();
    await act(async () => { progress.complete(1, 3); });
    expect(progress.completed).toBe(2); expect(progress.stars).toEqual({ 1: 3, 2: 1 });
    expect(JSON.parse(storage.setItem.mock.lastCall![1]).stars).toEqual({ 1: 3, 2: 1 });
    await act(async () => { progress.complete(3, 2); });
    expect(progress.completed).toBe(3); expect(progress.stars).toEqual({ 1: 3, 2: 1, 3: 2 });
  });
  it("preserves improved stars after write failure and retry", async () => {
    storage.getItem.mockResolvedValue('{"version":1,"completed":1}');
    await mount(<Probe />); storage.setItem.mockResolvedValueOnce(false);
    await act(async () => { progress.complete(1, 3); });
    expect(progress.status).toBe("error"); expect(progress.stars[1]).toBe(3);
    await act(async () => { progress.retry(); });
    expect(progress.status).toBe("saved");
    expect(JSON.parse(storage.setItem.mock.lastCall![1]).stars).toEqual({ 1: 3 });
  });
});
