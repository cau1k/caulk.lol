import { z } from "zod";

export const linkStatusSchema = z.enum(["draft", "published", "archived"]);
export const linkSourceSchema = z.enum([
  "ios",
  "cli",
  "chrome",
  "admin",
  "manual",
]);

const tagsSchema = z
  .array(z.string().trim().min(1).max(32))
  .max(12)
  .default([])
  .transform((tags) =>
    Array.from(
      new Set(tags.map((tag) => tag.toLowerCase().replace(/\s+/g, "-"))),
    ),
  );

export const createLinkInputSchema = z.object({
  url: z.string().trim().url(),
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(280).optional(),
  reason: z.string().trim().min(1).max(400),
  tags: tagsSchema,
  source: linkSourceSchema.default("manual"),
  status: linkStatusSchema.default("published"),
});

export const updateLinkInputSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(280).nullable().optional(),
    reason: z.string().trim().min(1).max(400).optional(),
    tags: tagsSchema.optional(),
    status: linkStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No link fields provided.",
  });

export type CreateLinkInput = z.infer<typeof createLinkInputSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkInputSchema>;
export type LinkStatus = z.infer<typeof linkStatusSchema>;
export type LinkSource = z.infer<typeof linkSourceSchema>;

export function normalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname === "/" && !url.search) return url.origin;
  return url.toString();
}
