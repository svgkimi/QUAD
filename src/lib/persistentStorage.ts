import { Storage } from "@apps-in-toss/web-framework";
import { isAppsInToss } from "./appsInToss";

const pendingWrites = new Map<string, Promise<boolean>>();
const revisions = new Map<string, number>();

/** 입력: 키 / 출력: 저장값. 실패와 빈 값을 구분하도록 읽기 실패는 reject한다. */
async function readRaw(key: string): Promise<string | null> {
  if (isAppsInToss()) return Storage.getItem(key);
  if (typeof window === "undefined") throw new Error("Storage unavailable");
  return window.localStorage.getItem(key);
}

/** 입력: 현재 키 / 출력: 값 또는 null. 읽는 동안 새 쓰기가 발생하면 구 키 이관은 생략한다. */
export async function getItem(key: string): Promise<string | null> {
  const revision = revisions.get(key) ?? 0;
  const value = await readRaw(key);
  if (value !== null || !key.startsWith("quad:")) return value;
  const legacy = await readRaw("modern-tetris:" + key.slice(5));
  if (legacy !== null && revision === (revisions.get(key) ?? 0)) {
    if (!await setItem(key, legacy)) throw new Error("Storage migration failed");
  }
  return legacy;
}

/** 입력: 키와 값 / 출력: 성공 여부. 키별 쓰기를 직렬화해 늦은 이전 요청의 덮어쓰기를 막는다. */
export function setItem(key: string, value: string): Promise<boolean> {
  revisions.set(key, (revisions.get(key) ?? 0) + 1);
  const write = async () => {
    try {
      if (isAppsInToss()) await Storage.setItem(key, value);
      else {
        if (typeof window === "undefined") return false;
        window.localStorage.setItem(key, value);
      }
      return true;
    } catch { return false; }
  };
  const previous = pendingWrites.get(key);
  const result = previous ? previous.then(write, write) : write();
  pendingWrites.set(key, result);
  void result.then(() => { if (pendingWrites.get(key) === result) pendingWrites.delete(key); });
  return result;
}
