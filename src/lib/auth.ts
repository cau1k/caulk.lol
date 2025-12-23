import { betterAuth } from "better-auth";

export const auth = betterAuth({
  // Database-less/stateless mode
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  // Trust our domain
  trustedOrigins: [
    "http://localhost:3000",
    "https://caulk.lol",
  ],
});

export type Session = typeof auth.$Infer.Session;
