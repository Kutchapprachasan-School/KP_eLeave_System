import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db.ts";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    async sendResetPassword(data, request) {
      console.log("Mock sending reset password email to:", data.user.email);
      console.log("Reset link:", data.url);
    }
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? {
          facebook: {
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
          },
        }
      : {}),
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  user: {
    additionalFields: {
      isApproved: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "TEACHER",
      },
      position: {
        type: "string",
        required: false,
      },
      subjectGroup: {
        type: "string",
        required: false,
      },
      lineUserId: {
        type: "string",
        required: false,
      },
      username: {
        type: "string",
        required: false,
      },
      hasSignature: {
        type: "boolean",
        required: false,
      },
      address: {
        type: "string",
        required: false,
      },
      phoneNumber: {
        type: "string",
        required: false,
      },
      level: {
        type: "string",
        required: false,
      },
    },
  },
  // Allow requests from production URL, localhost dev, and any Vercel preview deployment
  trustedOrigins: [
    // Production URL (from env vars — always trusted)
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
    // Vercel Deployment URL — injected automatically per deploy (no https:// prefix)
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    // Vercel Branch Alias URL — injected automatically per branch (no https:// prefix)
    ...(process.env.VERCEL_BRANCH_URL ? [`https://${process.env.VERCEL_BRANCH_URL}`] : []),
    // Extra trusted origins — set as comma-separated list in Vercel env vars if needed
    ...(process.env.TRUSTED_ORIGINS
      ? process.env.TRUSTED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
      : []),
    // Local development
    "http://localhost:3001",
    "http://localhost:3000",
    // Production & known preview domains (hardcoded fallback)
    "https://e-leave-system-kappa.vercel.app",
    "https://e-leave-system-git-dev-kutchapprachasan-school.vercel.app",
  ].filter(Boolean) as string[],
});
