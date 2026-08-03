import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// 배포 대상마다 서비스되는 경로가 달라 base를 분기한다.
//  - Vercel: 도메인 루트("/"). 빌드 환경에 VERCEL 환경변수가 자동으로 설정된다.
//  - 앱인토스: WebView가 번들을 자체 경로에서 서빙하므로 어디에 올라가도 깨지지 않도록
//    상대경로("./")를 쓴다. `npm run build:apps-in-toss`가 APPS_IN_TOSS를 설정한다.
//    (이 분기가 없으면 아래 GitHub Pages용 하위 경로가 그대로 적용되어 웹뷰에서
//     에셋이 전부 404가 난다.)
//  - GitHub Pages: https://<user>.github.io/<저장소명>/ 하위 경로.
//    ※ 아래 경로는 GitHub 저장소 이름과 반드시 일치해야 한다.
//  - 로컬 개발 서버(`npm run dev`)는 항상 루트 경로.
export default defineConfig(({ command }) => ({
  base:
    command !== "build" || process.env.VERCEL
      ? "/"
      : process.env.APPS_IN_TOSS
        ? "./"
        : "/QUAD/",
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
  },
}));
