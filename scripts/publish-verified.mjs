import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const env = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
/** 입력: Git 인자 / 출력: 현재 저장소에서 읽은 문자열. 대화형 인증은 하지 않는다. */
const git = (...args) => execFileSync("git", args, { encoding: "utf8", env }).trim();
const branch = "codex/basic-50-stages";
if (git("branch", "--show-current") !== branch) throw Error("Only " + branch + " may be uploaded.");
const remote = git("remote", "get-url", "origin");
if (!["https://github.com/svgkimi/QUAD.git", "git@github.com:svgkimi/QUAD.git"].includes(remote)) throw Error("Unexpected remote");
const sha = git("rev-parse", "HEAD");
const dependencies = resolve("node_modules");
if (!existsSync(dependencies)) throw Error("Existing node_modules required; no automatic installation.");
const temp = mkdtempSync(join(tmpdir(), "quad-verified-"));
try {
  // 입력: 검토된 HEAD 커밋 / 출력: 미커밋·미추적 파일을 전혀 포함하지 않는 독립 검증 폴더.
  const archive = execFileSync("git", ["archive", "--format=tar", sha], { maxBuffer: 64 * 1024 * 1024 });
  execFileSync("tar", ["-xf", "-", "-C", temp], { input: archive });
  symlinkSync(dependencies, join(temp, "node_modules"), "dir");
  /** 입력: Node 검사 명령 인자 / 출력: 별도 커밋 스냅샷의 검사 결과, 실패하면 예외. */
  const check = args => execFileSync(process.execPath, args, { cwd: temp, stdio: "inherit", env });
  check(["node_modules/vitest/vitest.mjs", "run"]);
  check(["node_modules/typescript/bin/tsc", "--noEmit"]);
  check(["node_modules/vite/bin/vite.js", "build"]);
  if (git("rev-parse", "HEAD") !== sha || git("branch", "--show-current") !== branch || git("remote", "get-url", "origin") !== remote) {
    throw Error("Commit, branch or remote changed during verification; upload cancelled.");
  }
  if (!process.argv.includes("--check-only")) {
    execFileSync("git", ["push", "--set-upstream", "origin", sha + ":refs/heads/" + branch], { stdio: "inherit", env });
  }
  console.log("Verified commit:", sha, process.argv.includes("--check-only") ? "(no push)" : "(uploaded)");
} finally {
  // 이 실행에서 mkdtemp로 생성한 전용 폴더만 정리한다. 원본 사용자 파일은 손대지 않는다.
  rmSync(temp, { recursive: true, force: true });
}
