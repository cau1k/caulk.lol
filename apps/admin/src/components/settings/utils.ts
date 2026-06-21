import { toast } from "sonner";

export async function copyToClipboard(value: string, message: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  } catch (error) {
    toast.error(errorMessage(error));
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed.";
}

export function formField(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  if (typeof value !== "string") throw new Error(`Missing ${name}.`);
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${name} is required.`);
  return trimmed;
}

export function formatDate(value: string | null): string {
  if (!value) return "unknown date";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
