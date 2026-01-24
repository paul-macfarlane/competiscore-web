import {
  InferInsertModel,
  InferSelectModel,
  getTableColumns,
  relations,
} from "drizzle-orm";
import {
  boolean,
  index,
  integer,
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
    suspendedUntil: timestamp("suspended_until"),
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
    token: text("token").unique(),
    maxUses: integer("max_uses"),
    useCount: integer("use_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
  },
  (table) => [
    index("league_invitation_league_idx").on(table.leagueId),
    index("league_invitation_invitee_idx").on(table.inviteeUserId),
    index("league_invitation_token_idx").on(table.token),
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
    linkedUserId: text("linked_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    retiredAt: timestamp("retired_at"),
  },
  (table) => [
    index("placeholder_member_league_idx").on(table.leagueId),
    index("placeholder_member_linked_user_idx").on(table.linkedUserId),
  ],
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
    linkedUser: one(user, {
      fields: [placeholderMember.linkedUserId],
      references: [user.id],
    }),
  }),
);

export const userColumns = getTableColumns(user);
export const leagueColumns = getTableColumns(league);
export const leagueMemberColumns = getTableColumns(leagueMember);
export const leagueInvitationColumns = getTableColumns(leagueInvitation);
export const placeholderMemberColumns = getTableColumns(placeholderMember);

export const reportReason = pgEnum("report_reason", [
  "unsportsmanlike",
  "false_reporting",
  "harassment",
  "spam",
  "other",
]);

export const reportStatus = pgEnum("report_status", ["pending", "resolved"]);

export const moderationActionType = pgEnum("moderation_action_type", [
  "dismissed",
  "warned",
  "suspended",
  "removed",
  "suspension_lifted",
]);

export const report = pgTable(
  "report",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reportedUserId: text("reported_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    leagueId: text("league_id")
      .notNull()
      .references(() => league.id, { onDelete: "cascade" }),
    reason: reportReason("reason").notNull(),
    description: text("description").notNull(),
    evidence: text("evidence"),
    status: reportStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("report_league_idx").on(table.leagueId),
    index("report_reported_user_idx").on(table.reportedUserId),
    index("report_reporter_idx").on(table.reporterId),
    index("report_status_idx").on(table.status),
  ],
);

export type Report = InferSelectModel<typeof report>;
export type NewReport = InferInsertModel<typeof report>;

export const moderationAction = pgTable(
  "moderation_action",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    reportId: text("report_id").references(() => report.id, {
      onDelete: "cascade",
    }),
    moderatorId: text("moderator_id")
      .notNull()
      .references(() => user.id, { onDelete: "set null" }),
    targetUserId: text("target_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    leagueId: text("league_id")
      .notNull()
      .references(() => league.id, { onDelete: "cascade" }),
    action: moderationActionType("action").notNull(),
    reason: text("reason").notNull(),
    suspendedUntil: timestamp("suspended_until"),
    acknowledgedAt: timestamp("acknowledged_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("moderation_action_report_idx").on(table.reportId),
    index("moderation_action_target_idx").on(table.targetUserId),
    index("moderation_action_league_idx").on(table.leagueId),
  ],
);

export type ModerationAction = InferSelectModel<typeof moderationAction>;
export type NewModerationAction = InferInsertModel<typeof moderationAction>;

export const reportRelations = relations(report, ({ one, many }) => ({
  reporter: one(user, {
    fields: [report.reporterId],
    references: [user.id],
    relationName: "reportedBy",
  }),
  reportedUser: one(user, {
    fields: [report.reportedUserId],
    references: [user.id],
    relationName: "reportsAgainst",
  }),
  league: one(league, {
    fields: [report.leagueId],
    references: [league.id],
  }),
  moderationActions: many(moderationAction),
}));

export const moderationActionRelations = relations(
  moderationAction,
  ({ one }) => ({
    report: one(report, {
      fields: [moderationAction.reportId],
      references: [report.id],
    }),
    moderator: one(user, {
      fields: [moderationAction.moderatorId],
      references: [user.id],
      relationName: "moderatedBy",
    }),
    targetUser: one(user, {
      fields: [moderationAction.targetUserId],
      references: [user.id],
      relationName: "moderationActionsAgainst",
    }),
    league: one(league, {
      fields: [moderationAction.leagueId],
      references: [league.id],
    }),
  }),
);

export const reportColumns = getTableColumns(report);
export const moderationActionColumns = getTableColumns(moderationAction);
