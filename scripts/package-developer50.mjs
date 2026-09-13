import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const root = process.argv[2];
if (!root) throw Error("Usage: node scripts/package-developer50.mjs BUILD_ROOT");
const dest = "final/QUAD-DEV-STAGES-2026-09-13";
const app = join(root, "DerivedNormal/Build/Products/Debug-iphonesimulator/QUADTest.app");
const bundle = execFileSync("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleIdentifier", join(app, "Info.plist")], { encoding: "utf8" }).trim();
if (bundle !== "dev.quad.preview.basic50dev") throw Error("Not an interactive developer app");
if (existsSync(join(dest, "BUILD_MANIFEST.json"))) throw Error("Developer artifact already exists; do not overwrite");
mkdirSync(dest, { recursive: true });
copyFileSync(join(root, "normal/Web/index.html"), join(dest, "QUAD-Dev.html"));
execFileSync("ditto", ["-c", "-k", "--keepParent", app, join(dest, "QUAD-Dev-Simulator.app.zip")]);
/** 입력: 소스 폴더 / 출력: 비밀값·캐시를 포함하지 않는 정렬된 소스 파일 목록. */
const sourceFiles = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : [join(dir, entry.name)]).sort();
const digest = file => createHash("sha256").update(readFileSync(file)).digest("hex");
const manifest = {
  revision: "developer-stage-access-2026-09-13", builtAt: new Date().toISOString(),
  gitHead: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), dirtySource: true,
  bundleId: bundle, displayName: "QUAD Dev", developerStageAccess: true,
  distribution: "LOCAL TEST ONLY; not an App Store/Toss build or signed iPhone app",
  campaignProgress: "No campaign progress reads/writes in developer practice; normal app is unchanged",
  webSha256: digest(join(dest, "QUAD-Dev.html")), simulatorZipSha256: digest(join(dest, "QUAD-Dev-Simulator.app.zip")),
  sourceHashes: Object.fromEntries(sourceFiles("src").map(file => [file, digest(file)])),
  excluded: ["QA automation/probe", "node_modules", ".env*", "credentials", "DerivedData", "old RC/QA"],
};
writeFileSync(join(dest, "BUILD_MANIFEST.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ artifact: resolve(dest), bundle, webSha256: manifest.webSha256 }));
