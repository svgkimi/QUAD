/**
 * App.tsx
 * -----------------------------------------------------------------------
 * 최상위 진입 컴포넌트. "싱글플레이"와 "대전(1:1 versus)" 두 모드를 라우팅만 한다.
 * - 싱글플레이 화면 흐름(타이틀 -> 카운트다운 -> 플레이 -> 일시정지/게임오버)은 전부
 *   SinglePlayerApp.tsx로 이동되어 있으며, 이 파일의 변경과 무관하게 동일하게 동작한다.
 * - 대전 모드는 MultiplayerApp.tsx가 담당한다 (로비 -> 매치 -> 결과).
 * 두 모드는 완전히 분리된 컴포넌트 트리이므로, 대전 모드의 useMultiplayer/useGameEngine 인스턴스는
 * 싱글플레이 쪽 훅과 전혀 상태를 공유하지 않는다 (관심사 분리).
 */

import { useCallback, useEffect, useState } from "react";
import SinglePlayerApp from "./components/SinglePlayerApp";
import { MultiplayerApp } from "./components/multiplayer/MultiplayerApp";
import { useAppsInTossSafeArea } from "./hooks/useAppsInTossSafeArea";
import { getUserAnonymousKey, setIosBackSwipeEnabled } from "./lib/appsInToss";
import { setItem } from "./lib/persistentStorage";

/** 최상위 모드: 싱글플레이 또는 대전 */
type AppMode = "single" | "multiplayer";

/** 앱인토스 사용자 익명 식별자(hash)를 저장하는 키 */
const USER_KEY_STORAGE_KEY = "quad:user-key";

function App() {
  const [mode, setMode] = useState<AppMode>("single");

  // 앱인토스 환경이면 Safe Area 값을 CSS 변수로 반영한다 (그 외에는 no-op).
  useAppsInTossSafeArea();

  // 앱인토스 게임 심사 체크리스트 대응:
  // - 사용자 식별자(익명 hash)를 조회해 영속 저장한다.
  // - iOS 스와이프 뒤로가기(OS 백 제스처)를 꺼서 플레이 중 실수로 미니앱을 벗어나지 않게 한다.
  useEffect(() => {
    void getUserAnonymousKey().then((hash) => {
      if (hash !== null) void setItem(USER_KEY_STORAGE_KEY, hash);
    });
    void setIosBackSwipeEnabled(false);
  }, []);

  const handleOpenMultiplayer = useCallback(() => setMode("multiplayer"), []);
  const handleExitMultiplayer = useCallback(() => setMode("single"), []);

  if (mode === "multiplayer") {
    return <MultiplayerApp onExit={handleExitMultiplayer} />;
  }

  return <SinglePlayerApp onOpenMultiplayer={handleOpenMultiplayer} />;
}

export default App;
