import type { ThemeRegistration } from "shiki";

/**
 * Monoglow "z" variant - a minimal dark theme with green accent
 * Based on the monoglow color palette
 */
export const monoGlowTheme: ThemeRegistration = {
  name: "monoglow",
  type: "dark",
  colors: {
    "editor.background": "#121212",
    "editor.foreground": "#cccccc",
    "editor.lineHighlightBackground": "#1a1a1a",
    "editor.selectionBackground": "#1bfd9c30",
    "editorCursor.foreground": "#1bfd9c",
    "editorLineNumber.foreground": "#444444",
    "editorLineNumber.activeForeground": "#7a7a7a",
  },
  settings: [
    {
      settings: {
        background: "#121212",
        foreground: "#cccccc",
      },
    },
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: {
        foreground: "#555555",
        fontStyle: "italic",
      },
    },
    {
      scope: ["string", "string.quoted", "string.template"],
      settings: {
        foreground: "#7a7a7a",
      },
    },
    {
      scope: ["constant.numeric", "constant.language", "constant.character"],
      settings: {
        foreground: "#1bfd9c",
      },
    },
    {
      scope: ["constant.other", "variable.other.constant"],
      settings: {
        foreground: "#cccccc",
      },
    },
    {
      scope: [
        "keyword",
        "keyword.control",
        "storage",
        "storage.type",
        "storage.modifier",
      ],
      settings: {
        foreground: "#888888",
      },
    },
    {
      scope: [
        "keyword.operator",
        "keyword.operator.assignment",
        "keyword.operator.arithmetic",
        "keyword.operator.comparison",
        "keyword.operator.logical",
        "keyword.operator.type",
        "keyword.operator.arrow",
        "punctuation.definition.arrow",
        "storage.type.function.arrow",
      ],
      settings: {
        foreground: "#1bfd9c",
      },
    },
    {
      scope: ["entity.name.function", "support.function", "meta.function-call"],
      settings: {
        foreground: "#cccccc",
      },
    },
    {
      scope: [
        "entity.name.type",
        "entity.name.class",
        "support.type",
        "support.class",
      ],
      settings: {
        foreground: "#aaaaaa",
      },
    },
    {
      scope: ["entity.name.tag", "support.tag"],
      settings: {
        foreground: "#888888",
      },
    },
    {
      scope: ["entity.other.attribute-name"],
      settings: {
        foreground: "#7a7a7a",
      },
    },
    {
      scope: ["variable", "variable.other", "variable.parameter"],
      settings: {
        foreground: "#cccccc",
      },
    },
    {
      scope: ["variable.language", "variable.language.this"],
      settings: {
        foreground: "#888888",
        fontStyle: "italic",
      },
    },
    {
      scope: ["punctuation", "meta.brace"],
      settings: {
        foreground: "#555555",
      },
    },
    {
      scope: [
        "punctuation.definition.tag",
        "punctuation.separator",
        "punctuation.terminator",
      ],
      settings: {
        foreground: "#444444",
      },
    },
    {
      scope: ["support.type.property-name", "meta.object-literal.key"],
      settings: {
        foreground: "#aaaaaa",
      },
    },
    {
      scope: ["meta.import", "meta.export"],
      settings: {
        foreground: "#888888",
      },
    },
    {
      scope: ["markup.heading", "entity.name.section"],
      settings: {
        foreground: "#1bfd9c",
        fontStyle: "bold",
      },
    },
    {
      scope: ["markup.bold"],
      settings: {
        fontStyle: "bold",
      },
    },
    {
      scope: ["markup.italic"],
      settings: {
        fontStyle: "italic",
      },
    },
    {
      scope: ["markup.inline.raw", "markup.fenced_code"],
      settings: {
        foreground: "#7a7a7a",
      },
    },
    {
      scope: ["markup.list"],
      settings: {
        foreground: "#888888",
      },
    },
    {
      scope: ["markup.quote"],
      settings: {
        foreground: "#555555",
        fontStyle: "italic",
      },
    },
    {
      scope: ["invalid", "invalid.illegal"],
      settings: {
        foreground: "#ffc0b9",
      },
    },
  ],
};

/**
 * Monoglow Light variant - inverted for light backgrounds
 */
export const monoGlowLightTheme: ThemeRegistration = {
  name: "monoglow-light",
  type: "light",
  colors: {
    "editor.background": "#fafafa",
    "editor.foreground": "#333333",
    "editor.lineHighlightBackground": "#f0f0f0",
    "editor.selectionBackground": "#0d9e6030",
    "editorCursor.foreground": "#0d9e60",
    "editorLineNumber.foreground": "#bbbbbb",
    "editorLineNumber.activeForeground": "#888888",
  },
  settings: [
    {
      settings: {
        background: "#fafafa",
        foreground: "#333333",
      },
    },
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: {
        foreground: "#999999",
        fontStyle: "italic",
      },
    },
    {
      scope: ["string", "string.quoted", "string.template"],
      settings: {
        foreground: "#666666",
      },
    },
    {
      scope: ["constant.numeric", "constant.language", "constant.character"],
      settings: {
        foreground: "#0d9e60",
      },
    },
    {
      scope: ["constant.other", "variable.other.constant"],
      settings: {
        foreground: "#333333",
      },
    },
    {
      scope: [
        "keyword",
        "keyword.control",
        "storage",
        "storage.type",
        "storage.modifier",
      ],
      settings: {
        foreground: "#666666",
      },
    },
    {
      scope: [
        "keyword.operator",
        "keyword.operator.assignment",
        "keyword.operator.arithmetic",
        "keyword.operator.comparison",
        "keyword.operator.logical",
        "keyword.operator.type",
        "keyword.operator.arrow",
        "punctuation.definition.arrow",
        "storage.type.function.arrow",
      ],
      settings: {
        foreground: "#0d9e60",
      },
    },
    {
      scope: ["entity.name.function", "support.function", "meta.function-call"],
      settings: {
        foreground: "#333333",
      },
    },
    {
      scope: [
        "entity.name.type",
        "entity.name.class",
        "support.type",
        "support.class",
      ],
      settings: {
        foreground: "#555555",
      },
    },
    {
      scope: ["entity.name.tag", "support.tag"],
      settings: {
        foreground: "#666666",
      },
    },
    {
      scope: ["entity.other.attribute-name"],
      settings: {
        foreground: "#777777",
      },
    },
    {
      scope: ["variable", "variable.other", "variable.parameter"],
      settings: {
        foreground: "#333333",
      },
    },
    {
      scope: ["variable.language", "variable.language.this"],
      settings: {
        foreground: "#666666",
        fontStyle: "italic",
      },
    },
    {
      scope: ["punctuation", "meta.brace"],
      settings: {
        foreground: "#888888",
      },
    },
    {
      scope: [
        "punctuation.definition.tag",
        "punctuation.separator",
        "punctuation.terminator",
      ],
      settings: {
        foreground: "#aaaaaa",
      },
    },
    {
      scope: ["support.type.property-name", "meta.object-literal.key"],
      settings: {
        foreground: "#555555",
      },
    },
    {
      scope: ["meta.import", "meta.export"],
      settings: {
        foreground: "#666666",
      },
    },
    {
      scope: ["markup.heading", "entity.name.section"],
      settings: {
        foreground: "#0d9e60",
        fontStyle: "bold",
      },
    },
    {
      scope: ["markup.bold"],
      settings: {
        fontStyle: "bold",
      },
    },
    {
      scope: ["markup.italic"],
      settings: {
        fontStyle: "italic",
      },
    },
    {
      scope: ["markup.inline.raw", "markup.fenced_code"],
      settings: {
        foreground: "#666666",
      },
    },
    {
      scope: ["markup.list"],
      settings: {
        foreground: "#666666",
      },
    },
    {
      scope: ["markup.quote"],
      settings: {
        foreground: "#999999",
        fontStyle: "italic",
      },
    },
    {
      scope: ["invalid", "invalid.illegal"],
      settings: {
        foreground: "#d43f3f",
      },
    },
  ],
};
