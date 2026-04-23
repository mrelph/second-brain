import { resolve } from "node:path";
import { scaffoldSecondBrainProject } from "../core/project-scaffold.ts";

export interface InitCommandOptions {
  directory?: string;
  force: boolean;
  git: boolean;
  name?: string;
}

export async function runInitCommand(options: InitCommandOptions): Promise<void> {
  const targetDir = resolve(process.cwd(), options.directory ?? ".");
  const scaffoldOptions =
    options.name === undefined
      ? {
          targetDir,
          force: options.force,
          initGit: options.git
        }
      : {
          targetDir,
          projectName: options.name,
          force: options.force,
          initGit: options.git
        };

  const result = await scaffoldSecondBrainProject(scaffoldOptions);

  console.log(`Initialized second-brain project in ${result.targetDir}`);
  console.log("");
  console.log("Created:");
  for (const file of result.createdPaths) {
    console.log(`  - ${file}`);
  }

  if (result.gitInitialized) {
    console.log("");
    console.log("Initialized git repository.");
  }

  console.log("");
  console.log("Next steps:");
  console.log("  1. Review the generated schema file and customize the preserved project block if needed.");
  console.log("  2. Add source documents under sources/.");
  console.log("  3. Re-run `second-brain schema --agent <agent>` if you want a different coding-agent target.");
  console.log("  4. Commit the initial scaffold to git.");
}

export function parseInitArgs(args: string[]): InitCommandOptions {
  const options: InitCommandOptions = {
    force: false,
    git: true
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      break;
    }

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--no-git") {
      options.git = false;
      continue;
    }

    if (arg === "--git") {
      options.git = true;
      continue;
    }

    if (arg === "--name") {
      const value = args[index + 1];
      if (!value) {
        throw new Error("Missing value for --name");
      }
      options.name = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--name=")) {
      options.name = arg.slice("--name=".length);
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option for init: ${arg}`);
    }

    if (!options.directory) {
      options.directory = arg;
      continue;
    }

    throw new Error(`Unexpected argument for init: ${arg}`);
  }

  return options;
}
