import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const root = process.argv[2], out = "qa/rules50-v2-2026-09-13";
if (!root) throw Error("Usage: node scripts/archive-rules50-qa.mjs BUILD_ROOT");
const summaries = [];
for (const suffix of ["", "-compact"]) {
  const events = JSON.parse(readFileSync(join(root, "native-events" + suffix + ".json"), "utf8"));
  const terminal = events.find(e => e.phase === "done");
  if (terminal?.checkedStages !== 50 || terminal?.clearedThroughUI !== 4 || events.some(e => e.error)) throw Error("Incomplete/failed native run " + suffix);
  copyFileSync(join(root, "native-events" + suffix + ".json"), join(out, "native-events" + suffix + ".json"));
  const screenshotDir = join(out, suffix ? "screenshots-320x568" : "screenshots-393x759");
  mkdirSync(screenshotDir, { recursive: true });
  const captures = events.filter(e => e.capture).map(e => e.capture);
  for (const name of captures) {
    if (!/^rules-v2-[a-z0-9-]+$/.test(name)) throw Error("Unexpected screenshot name");
    copyFileSync(join(root, "screenshots" + suffix, name + ".png"), join(screenshotDir, name + ".png"));
  }
  const stages = events.filter(e => e.phase === "stage-checked");
  summaries.push({ viewport: stages[0].viewport, stageChecks: stages.length, clearChecks: events.filter(e => e.phase === "clear-checked"),
    board: stages[0].board, minButtonWidth: Math.min(...stages.flatMap(e => e.keys.map(k => k.w))),
    minButtonHeight: Math.min(...stages.flatMap(e => e.keys.map(k => k.h))), captures });
}
const logs = {
  "quad-rules-v2-baseline.log": "baseline-tests.log",
  "quad-rules-v2-final-tests.log": "final-tests.log",
  "quad-rules-v2-final-simulation.log": "simulation.log",
  "quad-rules-v2-vite.log": "vite.log",
  "quad-rules-v2-release-build.log": "native-build.log",
  "quad-rules-v2-release-ui.log": "native-ui.log",
  "quad-rules-v2-release-ui-compact.log": "native-ui-compact.log",
  "quad-rules-v2-resume-before.log": "resume-regression-before.log",
  "quad-rules-v2-resume-after.log": "resume-regression-after.log",
  "quad-rules-v2-native-ui.log": "native-first-attempt-failed.log",
};
mkdirSync(join(out, "logs"), { recursive: true });
for (const [source, dest] of Object.entries(logs)) copyFileSync(join("/private/tmp", source), join(out, "logs", dest));
const manifest = JSON.parse(readFileSync("final/QUAD-RULES50-V2-PREVIEW-2026-09-13/BUILD_MANIFEST.json", "utf8"));
writeFileSync(join(out, "native-summary.json"), JSON.stringify({ build: manifest.webSha256, device: "QUAD Basic50 QA — iPhone 16", udid: "95B30CB4-4355-4E6F-BB51-50DC8534A662", os: "iOS 26.5 (23F77)", xcode: "26.6 (17F113)", host: "Simulator WKWebView; compact is a constrained view on the SAME simulator, not another physical device", qaBundleId: "dev.quad.preview.basic50qa", note: "54 UI cases per view. Fixed QA seeds/keyboard events for four actual clears, not realistic human play speed. Native app normal bundle excludes instrumentation. Sequential unlock and reload preservation additionally covered by component tests.", summaries }, null, 2));
console.log(JSON.stringify(summaries.map(s => ({ viewport: s.viewport, stageChecks: s.stageChecks, clearChecks: s.clearChecks.length, screenshots: s.captures.length }))));
