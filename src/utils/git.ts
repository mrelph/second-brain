import { spawn } from "node:child_process";

export async function runGitInit(cwd: string): Promise<boolean> {
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn("git", ["init"], {
      cwd,
      stdio: "ignore"
    });

    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    throw new Error("Failed to initialize git repository.");
  }

  return true;
}
