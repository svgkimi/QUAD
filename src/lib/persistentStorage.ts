/**
 * persistentStorage.ts
 * -----------------------------------------------------------------------
 * 로컬 영속 저장소 통합 어댑터. 앱인토스 환경에서는 Storage.getItem/setItem(비동기 SDK API)을,
 * 그 외(기존 웹 배포)에서는 지금까지와 동일하게 window.localStorage를 사용한다.
 * 두 경로 모두 Promise 인터페이스로 통일해 호출부(useHighScore/useSound)가 환경을 신경 쓰지 않게 한다.
 */
import { Storage } from "@apps-in-toss/web-framework";
import { isAppsInToss } from "./appsInToss";

/**
 * 브랜드명이 QUAD로 바뀌기 전에 쓰던 저장소 키 접두사. 기존 웹 사용자의 하이스코어/사운드
 * 설정이 리네이밍 때문에 사라지지 않도록, 새 키에 값이 없을 때만 구 키를 한 번 읽어 옮긴다.
 */
const LEGACY_KEY_PREFIX = "modern-tetris:";
/** 현재 저장소 키 접두사 */
const KEY_PREFIX = "quad:";

/** 새 키에 해당하는 구 키 이름을 만든다. 접두사가 다르면 null (마이그레이션 대상이 아님) */
function toLegacyKey(key: string): string | null {
  return key.startsWith(KEY_PREFIX) ? LEGACY_KEY_PREFIX + key.slice(KEY_PREFIX.length) : null;
}

/** 저장된 값을 읽는다. 키가 없거나 접근 불가능하면 null */
export async function getItem(key: string): Promise<string | null> {
  const value = await readRaw(key);
  if (value !== null) return value;

  // 새 키가 비어 있으면 구 키를 확인해 한 번만 옮겨온다 (리네이밍 이전 기록 보존)
  const legacyKey = toLegacyKey(key);
  if (legacyKey === null) return null;
  const legacyValue = await readRaw(legacyKey);
  if (legacyValue !== null) await setItem(key, legacyValue);
  return legacyValue;
}

/** 마이그레이션 없이 실제 저장소에서 값을 그대로 읽는다 */
async function readRaw(key: string): Promise<string | null> {
  if (isAppsInToss()) {
    try {
      return await Storage.getItem(key);
    } catch {
      return null;
    }
  }
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** 값을 저장한다. 접근 불가능한 환경(프라이빗 모드 등)에서는 조용히 무시한다 */
export async function setItem(key: string, value: string): Promise<void> {
  if (isAppsInToss()) {
    try {
      await Storage.setItem(key, value);
    } catch {
      // 저장 실패는 무시 - 세션 내 메모리 상태는 이미 반영되어 있으므로 게임 진행에는 지장 없다
    }
    return;
  }
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // LocalStorage 접근 불가 환경(프라이빗 모드 등)에서는 조용히 무시한다
  }
}
