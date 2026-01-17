import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"; // your drizzle instance

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL!, 
    database: drizzleAdapter(db, {
        provider: "sqlite",
    }),
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
