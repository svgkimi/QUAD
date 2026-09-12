import { beforeEach, describe, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn() }));
vi.mock("@apps-in-toss/web-framework", () => ({ Storage: sdk }));
vi.mock("../../src/lib/appsInToss", () => ({ isAppsInToss: () => true }));
import { getItem, setItem } from "../../src/lib/persistentStorage";
beforeEach(() => { sdk.getItem.mockReset(); sdk.setItem.mockReset().mockResolvedValue(undefined); });
describe("RC2 storage adapter", () => {
  it("serializes writes: a slower old write cannot finish after a newer one", async () => {
    let resolveFirst!: () => void; let stored = "";
    sdk.setItem.mockImplementationOnce(async (_key, value) => { await new Promise<void>(r => resolveFirst = r); stored = value; })
      .mockImplementationOnce(async (_key, value) => { stored = value; });
    const first = setItem("quad:serial", "80"), last = setItem("quad:serial", "100");
    expect(sdk.setItem).toHaveBeenCalledTimes(1); resolveFirst(); await Promise.all([first, last]);
    expect(stored).toBe("100");
  });
  it("read failure rejects rather than masquerading as empty storage", async () => {
    sdk.getItem.mockRejectedValue(new Error("blocked"));
    await expect(getItem("quad:failed-read")).rejects.toThrow(); expect(sdk.setItem).not.toHaveBeenCalled();
  });
  it("write failure returns false and does not poison following writes", async () => {
    sdk.setItem.mockRejectedValueOnce(new Error("blocked"));
    await expect(setItem("quad:failure", "1")).resolves.toBe(false);
    await expect(setItem("quad:failure", "2")).resolves.toBe(true);
  });
  it("legacy settings migrate when the current key is absent", async () => {
    sdk.getItem.mockResolvedValueOnce(null).mockResolvedValueOnce("0.4");
    await expect(getItem("quad:legacy")).resolves.toBe("0.4");
    expect(sdk.setItem).toHaveBeenCalledWith("quad:legacy", "0.4");
  });
  it("late legacy read cannot overwrite a newer user write", async () => {
    let resolveLegacy!: (value: string) => void;
    sdk.getItem.mockResolvedValueOnce(null).mockImplementationOnce(() => new Promise(r => resolveLegacy = r));
    const read = getItem("quad:legacy-race"); await Promise.resolve();
    await setItem("quad:legacy-race", "new"); resolveLegacy("old"); await read;
    expect(sdk.setItem.mock.calls.map(call => call[1])).toEqual(["new"]);
  });
});
