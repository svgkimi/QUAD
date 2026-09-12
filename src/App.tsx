/** 최상위 진입점: 토스 초기화를 유지하고 싱글 플레이를 표시한다. */

import { useEffect } from "react";
import SinglePlayerApp from "./components/SinglePlayerApp";
import { useAppsInTossSafeArea } from "./hooks/useAppsInTossSafeArea";
import { getUserAnonymousKey, setIosBackSwipeEnabled } from "./lib/appsInToss";
import { setItem } from "./lib/persistentStorage";



/** 앱인토스 사용자 익명 식별자(hash)를 저장하는 키 */
const USER_KEY_STORAGE_KEY = "quad:user-key";

function App() {

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

  return <SinglePlayerApp />;
}

export default App;
