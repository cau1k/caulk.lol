export function formatDate(date: string | Date) {
  // Extract YYYY-MM-DD and parse as local time to avoid timezone shifts
  const str = typeof date === "string" ? date : date.toISOString();
  const [datePart] = str.split("T");
  const d = new Date(`${datePart}T00:00`);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
