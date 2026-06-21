import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const goodLinks = sqliteTable(
  "good_links",
  {
    id: text("id").primaryKey(),
    url: text("url").notNull().unique(),
    canonicalUrl: text("canonical_url").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    reason: text("reason").notNull(),
    tags: text("tags").notNull(),
    status: text("status").notNull().default("published"),
    source: text("source").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("good_links_created_at_idx").on(table.createdAt),
    index("good_links_status_idx").on(table.status),
  ],
);
