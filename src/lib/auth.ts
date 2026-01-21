import { db } from "@/db";
import * as schema from "@/db/schema";
import { getUserById } from "@/db/users";
import { generateUniqueUsername } from "@/services/users";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL!,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  experimental: {
    joins: true,
  },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: true,
        input: false,
      },
      bio: {
        type: "string",
        required: false,
      },
      deletedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const username = await generateUniqueUsername(user.name, user.email);
          return { data: { ...user, username, image: null } };
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await getUserById(session.userId);
          if (user?.deletedAt) {
            return false;
          }
          return { data: session };
        },
      },
    },
  },
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
