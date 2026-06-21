import { readFile } from "node:fs/promises";

import { ZodError } from "zod";

export async function readJsonBody(body: string) {
  try {
    const text = body === "-" ? await stdin() : await readFile(body, "utf-8");
    const parsed: unknown = JSON.parse(text);
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new CliError(`Invalid JSON: ${error.message}`, 2);
    }
    throw error;
  }
}

export function printError(error: unknown) {
  if (error instanceof CliError) {
    console.error(error.message);
    process.exitCode = error.exitCode;
    return;
  }

  if (error instanceof ZodError) {
    for (const issue of error.issues) {
      console.error(`${issue.path.join(".") || "input"}: ${issue.message}`);
    }
    process.exitCode = 2;
    return;
  }

  if (error instanceof Error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  console.error("Unexpected CLI error.");
  process.exitCode = 1;
}

export class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

async function stdin() {
  const chunks: Uint8Array[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}
