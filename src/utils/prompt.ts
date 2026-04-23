import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = createInterface({ input, output });

  try {
    const suffix = defaultValue ? ` [${defaultValue}]` : "";
    const answer = await rl.question(`${question}${suffix}: `);
    return answer.trim() || defaultValue || "";
  } finally {
    rl.close();
  }
}
