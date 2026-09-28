import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

export function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env");
  let raw = "";
  try {
    raw = readFileSync(envPath, "utf8");
  } catch {
    return;
  }

  for (const [key, value] of Object.entries(parseEnv(raw))) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
