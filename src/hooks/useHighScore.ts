import { useCallback, useEffect, useRef, useState } from "react";
import { getItem, setItem } from "../lib/persistentStorage";

const STORAGE_KEY = "quad:high-score";
type SaveStatus = "loading" | "saved" | "saving" | "error";

/** 입력: 저장 문자열 / 출력: 유효한 비음수 정수 기록. 손상 값은 0. */
function parseScore(raw: string | null): number {
  const value = raw === null ? 0 : Number(raw);
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

/** 입력: 없음 / 출력: 일반 웹 동기 초기 기록. SDK 실제 기록은 비동기로 병합한다. */
function readInitialScore(): number {
  try { return parseScore(window.localStorage.getItem(STORAGE_KEY)); } catch { return 0; }
}

export interface UseHighScoreResult {
  readonly highScore: number;
  readonly saveStatus: SaveStatus;
  readonly submitScore: (score: number) => boolean;
}

/** 입력: 없음 / 출력: 최고기록·제출 함수·저장 상태. 초기 읽기 이전에는 낮은 값을 쓰지 않는다. */
export function useHighScore(): UseHighScoreResult {
  const [highScore, setHighScore] = useState(readInitialScore);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const best = useRef(highScore);
  const ready = useRef(false);
  const mounted = useRef(false);
  const submitted = useRef(false);
  const writeVersion = useRef(0);
  const persist = useCallback(() => {
    const version = ++writeVersion.current;
    setSaveStatus("saving");
    void setItem(STORAGE_KEY, String(best.current)).then(ok => {
      if (mounted.current && writeVersion.current === version) setSaveStatus(ok === false ? "error" : "saved");
    }).catch(() => { if (mounted.current && writeVersion.current === version) setSaveStatus("error"); });
  }, []);
  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    void getItem(STORAGE_KEY).then(raw => {
      if (cancelled) return;
      best.current = Math.max(best.current, parseScore(raw));
      setHighScore(best.current);
      ready.current = true;
      if (submitted.current) persist(); else setSaveStatus("saved");
    }).catch(() => { if (!cancelled) setSaveStatus("error"); });
    return () => { cancelled = true; mounted.current = false; };
  }, [persist]);
  const submitScore = useCallback((score: number) => {
    if (!Number.isSafeInteger(score) || score <= best.current) return false;
    best.current = score;
    submitted.current = true;
    setHighScore(score);
    if (ready.current) persist();
    return true;
  }, [persist]);
  return { highScore, saveStatus, submitScore };
}
