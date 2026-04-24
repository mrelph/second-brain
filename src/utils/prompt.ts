import { createInterface, type Interface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

let rl: Interface | null = null;

function getInterface(): Interface {
  if (!rl) {
    rl = createInterface({ input, output });
  }
  return rl;
}

export async function prompt(question: string, defaultValue?: string): Promise<string> {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = await getInterface().question(`${question}${suffix}: `);
  return answer.trim() || defaultValue || "";
}

export function closePrompts(): void {
  if (rl) {
    rl.close();
    rl = null;
  }
}
