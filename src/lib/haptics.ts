import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { isAppsInToss } from "./appsInToss";

export type GameHaptic = "tap" | "drop";

/** 입력: 탭/즉시 낙하. 출력: 지원 호스트에만 짧은 햅틱 요청; 실패해도 게임 입력은 계속된다. */
export function playGameHaptic(kind: GameHaptic = "tap"): void {
  try {
    if (isAppsInToss()) {
      void generateHapticFeedback({ type: kind === "drop" ? "tickMedium" : "tap" }).catch(() => undefined);
      return;
    }
    const bridge = (window as Window & {
      webkit?: { messageHandlers?: { quadHaptic?: { postMessage: (message: GameHaptic) => void } } };
    }).webkit?.messageHandlers?.quadHaptic;
    if (typeof bridge?.postMessage === "function") {
      bridge.postMessage(kind);
      return;
    }
    if (typeof navigator.vibrate === "function") navigator.vibrate(kind === "drop" ? 20 : 12);
  } catch {
    // 미지원/권한 제한/네이티브 연결 종료는 이동·회전·낙하를 막지 않는다.
  }
}
