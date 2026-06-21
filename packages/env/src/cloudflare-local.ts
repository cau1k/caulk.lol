const runtimeEnv = typeof process === "undefined" ? {} : process.env;

export const env = new Proxy<Record<string, unknown>>(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined;
      return runtimeEnv[prop];
    },
  },
);
