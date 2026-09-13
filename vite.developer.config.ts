import { mergeConfig } from "vite";
import standalone from "./vite.standalone.config";

// 명시적인 전용 설정으로만 전체 단계 연습을 허용한다. 일반 배포 설정은 항상 false다.
export default mergeConfig(standalone, {
  define: { __QUAD_DEVELOPER_STAGE_ACCESS__: true },
  build: { outDir: "dist-developer" },
});
