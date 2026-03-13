import { afterEach, describe, expect, test } from "vitest";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const launcherPath = join(process.cwd(), "bin", "qmd");
const tempDirs: string[] = [];

function writeExecutable(path: string, content: string): void {
  writeFileSync(path, content, "utf8");
  chmodSync(path, 0o755);
}

function runLauncher(): string {
  const tempDir = mkdtempSync(join(tmpdir(), "qmd-launcher-test-"));
  tempDirs.push(tempDir);
  const logFile = join(tempDir, "runtime.log");
  const binDir = join(tempDir, "bin");

  writeFileSync(logFile, "", "utf8");
  mkdirSync(binDir);

  writeExecutable(
    join(binDir, "bun"),
    `#!/bin/sh
printf 'bun\\n' >> "${logFile}"
exit 0
`
  );

  writeExecutable(
    join(binDir, "node"),
    `#!/bin/sh
printf 'node\\n' >> "${logFile}"
exit 0
`
  );

  const result = spawnSync(launcherPath, ["query", "lobster"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH || ""}`,
    },
    encoding: "utf8",
  });

  expect(result.status).toBe(0);
  return readFileSync(logFile, "utf8").trim();
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("bin/qmd launcher", () => {
  test("uses node even when bun is available in PATH", () => {
    const runtime = runLauncher();
    expect(runtime).toBe("node");
  });
});
