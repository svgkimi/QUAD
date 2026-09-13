import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const root = process.argv[2];
if (!root) throw Error("Usage: node scripts/package-rules50.mjs BUILD_ROOT");
const dest = "final/QUAD-RULES50-V2-PREVIEW-2026-09-13";
if (existsSync(join(dest, "native"))) throw Error("Preview already packaged; do not overwrite it");
const app = join(root, "DerivedNormal/Build/Products/Debug-iphonesimulator/QUADTest.app");
if (!existsSync(app) || !existsSync(join(root, "normal/Web/index.html"))) throw Error("Missing normal build");
mkdirSync(dest, { recursive: true });
cpSync(join(root, "normal"), join(dest, "native"), { recursive: true, errorOnExist: true, force: false });
execFileSync("ditto", ["-c", "-k", "--keepParent", app, join(dest, "QUAD-Simulator.app.zip")]);
/** 입력: 소스 폴더 / 출력: 자격정보·캐시를 읽지 않고 src 파일만 정렬한 경로 목록. */
const sourceFiles = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : [join(dir, entry.name)]).sort();
const digest = file => createHash("sha256").update(readFileSync(file)).digest("hex");
const files = sourceFiles("src");
const sourceHashes = Object.fromEntries(files.map(file => [file, digest(file)]));
const manifest = {
  revision: "rules50-v2-preview-2026-09-13", builtAt: new Date().toISOString(),
  gitHead: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), dirtySource: true,
  bundleId: "dev.quad.preview.basic50", platform: "iOS Simulator arm64; NOT a signed iPhone distribution",
  webSha256: digest(join(dest, "native/Web/index.html")),
  simulatorZipSha256: digest(join(dest, "QUAD-Simulator.app.zip")),
  ruleHash: JSON.parse(readFileSync("qa/rules50-v2-2026-09-13/simulation.json", "utf8")).sourceHash,
  sourceHashes,
  excluded: ["QA host and seed overrides", ".env*", "credentials", "node_modules", "old RC/QA", "DerivedData/module caches"],
};
writeFileSync(join(dest, "BUILD_MANIFEST.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ preview: resolve(dest), webSha256: manifest.webSha256, simulatorZipSha256: manifest.simulatorZipSha256 }));
