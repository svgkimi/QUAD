/**
 * granite.config.ts
 * -----------------------------------------------------------------------
 * 앱인토스(@apps-in-toss/web-framework) 미니앱 설정. 기존 Vercel 웹 배포(package.json의
 * dev/build 스크립트)는 그대로 두고, 앱인토스 전용 빌드(`npm run build:apps-in-toss`)만
 * 이 설정을 사용한다. `npx ait init`은 기존 dev/build 스크립트를 덮어써 Vercel 배포를
 * 깨뜨리므로 사용하지 않고, 설치된 @apps-in-toss/web-framework@2.10.8의 실제 타입
 * 정의(config.d.ts, @apps-in-toss/plugins의 AppsInTossPluginOptions)를 직접 확인해
 * 이 파일을 수동으로 작성했다.
 *
 * brand.icon은 임시 플레이스홀더(public/icon.svg)를 가리킨다 - 실제 로고가 준비되면
 * 이 경로의 파일만 교체하면 된다.
 */
import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "quad",
  brand: {
    displayName: "쿼드",
    primaryColor: "#ff2d78",
    icon: "/icon.svg",
  },
  permissions: [],
  // 자체 상단바(AppsInTossTopBar)에서 브랜드/닫기 UI를 직접 그리므로, 네이티브 내비게이션
  // 바는 모두 끄고 풀스크린으로 사용한다 (게임 미니앱 심사 체크리스트: 풀스크린 필수).
  navigationBar: {
    withTitle: false,
    withBackButton: false,
    withHomeButton: false,
  },
  webViewProps: {
    type: "partner",
    // 터치로 빠르게 스와이프하는 게임이므로 iOS 바운스/풀투리프레시/뒤로가기 스와이프가
    // 오조작으로 이어지지 않도록 모두 끈다.
    bounces: false,
    pullToRefreshEnabled: false,
    allowsBackForwardNavigationGestures: false,
  },
  web: {
    port: 5173,
    commands: {
      dev: "vite",
      build: "tsc && vite build",
    },
  },
  outdir: "dist",
});
