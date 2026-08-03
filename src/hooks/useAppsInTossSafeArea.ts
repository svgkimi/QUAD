/**
 * useAppsInTossSafeArea.ts
 * -----------------------------------------------------------------------
 * 앱인토스 환경에서 Safe Area inset 값을 구독해 documentElement의 CSS 변수
 * (--ait-safe-top/right/bottom/left)로 반영한다. 토스 환경이 아니면 아무 동작도 하지
 * 않는다(index.css의 기본값 0px가 그대로 유지되어 기존 웹 배포와 동일하게 동작한다).
 * 앱 최상위(App.tsx)에서 한 번만 호출한다.
 */
import { useEffect } from "react";
import { getSafeAreaInsets, subscribeSafeArea, type SafeAreaInsets } from "../lib/appsInToss";

function applyInsets(insets: SafeAreaInsets): void {
  const root = document.documentElement.style;
  root.setProperty("--ait-safe-top", `${insets.top}px`);
  root.setProperty("--ait-safe-right", `${insets.right}px`);
  root.setProperty("--ait-safe-bottom", `${insets.bottom}px`);
  root.setProperty("--ait-safe-left", `${insets.left}px`);
}

export function useAppsInTossSafeArea(): void {
  useEffect(() => {
    applyInsets(getSafeAreaInsets());
    return subscribeSafeArea(applyInsets);
  }, []);
}
