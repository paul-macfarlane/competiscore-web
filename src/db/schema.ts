import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    username: text("username").notNull().unique(),
    bio: text("bio"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("user_username_idx").on(table.username)],
);

export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  leagueMemberships: many(leagueMember),
  sentInvitations: many(leagueInvitation),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const leagueVisibility = pgEnum("league_visibility", [
  "public",
  "private",
]);

export const league = pgTable(
  "league",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description").notNull(),
    visibility: leagueVisibility("visibility").notNull().default("private"),
    logo: text("logo"),
    isArchived: boolean("is_archived").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("league_name_idx").on(table.name)],
);

export type League = InferSelectModel<typeof league>;
export type NewLeague = InferInsertModel<typeof league>;

export const leagueMemberRole = pgEnum("league_member_role", [
  "member",
  "manager",
  "executive",
]);

export const leagueMember = pgTable(
  "league_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    leagueId: text("league_id")
      .notNull()
      .references(() => league.id, { onDelete: "cascade" }),
    role: leagueMemberRole("role").notNull().default("member"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("league_member_unique").on(table.userId, table.leagueId),
    index("league_member_user_idx").on(table.userId),
    index("league_member_league_idx").on(table.leagueId),
  ],
);

export type LeagueMember = InferSelectModel<typeof leagueMember>;
export type NewLeagueMember = InferInsertModel<typeof leagueMember>;

export const invitationStatus = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "declined",
  "expired",
]);

export const leagueInvitation = pgTable(
  "league_invitation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    leagueId: text("league_id")
      .notNull()
      .references(() => league.id, { onDelete: "cascade" }),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id),
    inviteeUserId: text("invitee_user_id").references(() => user.id),
    inviteeEmail: text("invitee_email"),
    role: leagueMemberRole("role").notNull().default("member"),
    status: invitationStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
  },
  (table) => [
    index("league_invitation_league_idx").on(table.leagueId),
    index("league_invitation_invitee_idx").on(table.inviteeUserId),
  ],
);

export type LeagueInvitation = InferSelectModel<typeof leagueInvitation>;
export type NewLeagueInvitation = InferInsertModel<typeof leagueInvitation>;

export const placeholderMember = pgTable(
  "placeholder_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    leagueId: text("league_id")
      .notNull()
      .references(() => league.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("placeholder_member_league_idx").on(table.leagueId)],
);

export type PlaceholderMember = InferSelectModel<typeof placeholderMember>;
export type NewPlaceholderMember = InferInsertModel<typeof placeholderMember>;

export const leagueRelations = relations(league, ({ many }) => ({
  members: many(leagueMember),
  invitations: many(leagueInvitation),
  placeholderMembers: many(placeholderMember),
}));

export const leagueMemberRelations = relations(leagueMember, ({ one }) => ({
  user: one(user, {
    fields: [leagueMember.userId],
    references: [user.id],
  }),
  league: one(league, {
    fields: [leagueMember.leagueId],
    references: [league.id],
  }),
}));

export const leagueInvitationRelations = relations(
  leagueInvitation,
  ({ one }) => ({
    league: one(league, {
      fields: [leagueInvitation.leagueId],
      references: [league.id],
    }),
    inviter: one(user, {
      fields: [leagueInvitation.inviterId],
      references: [user.id],
    }),
  }),
);

export const placeholderMemberRelations = relations(
  placeholderMember,
  ({ one }) => ({
    league: one(league, {
      fields: [placeholderMember.leagueId],
      references: [league.id],
    }),
  }),
);
