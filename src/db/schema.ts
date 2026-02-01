import {
  GameCategory,
  InvitationStatus,
  LeagueMemberRole,
  LeagueVisibility,
  MatchResult,
  MatchStatus,
  ModerationActionType,
  ReportReason,
  ReportStatus,
  TeamMemberRole,
} from "@/lib/shared/constants";
import { LimitType } from "@/services/constants";
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
  real,
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
    isAdmin: boolean("is_admin").default(false).notNull(),
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
  LeagueVisibility.PUBLIC,
  LeagueVisibility.PRIVATE,
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
  LeagueMemberRole.MEMBER,
  LeagueMemberRole.MANAGER,
  LeagueMemberRole.EXECUTIVE,
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
  InvitationStatus.PENDING,
  InvitationStatus.ACCEPTED,
  InvitationStatus.DECLINED,
  InvitationStatus.EXPIRED,
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
  gameTypes: many(gameType),
  teams: many(team),
  matches: many(match),
  highScoreEntries: many(highScoreEntry),
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
  ReportReason.UNSPORTSMANLIKE,
  ReportReason.FALSE_REPORTING,
  ReportReason.HARASSMENT,
  ReportReason.SPAM,
  ReportReason.OTHER,
]);

export const reportStatus = pgEnum("report_status", [
  ReportStatus.PENDING,
  ReportStatus.RESOLVED,
]);

export const moderationActionType = pgEnum("moderation_action_type", [
  ModerationActionType.DISMISSED,
  ModerationActionType.WARNED,
  ModerationActionType.SUSPENDED,
  ModerationActionType.REMOVED,
  ModerationActionType.SUSPENSION_LIFTED,
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

export const limitType = pgEnum("limit_type", [
  LimitType.MAX_LEAGUES_PER_USER,
  LimitType.MAX_MEMBERS_PER_LEAGUE,
  LimitType.MAX_GAME_TYPES_PER_LEAGUE,
]);

export const limitOverride = pgTable(
  "limit_override",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    limitType: limitType("limit_type").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    leagueId: text("league_id").references(() => league.id, {
      onDelete: "cascade",
    }),
    limitValue: integer("limit_value"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    reason: text("reason"),
  },
  (table) => [
    index("limit_override_user_idx").on(table.userId),
    index("limit_override_league_idx").on(table.leagueId),
  ],
);

export type LimitOverride = InferSelectModel<typeof limitOverride>;
export type NewLimitOverride = InferInsertModel<typeof limitOverride>;

export const limitOverrideRelations = relations(limitOverride, ({ one }) => ({
  user: one(user, {
    fields: [limitOverride.userId],
    references: [user.id],
    relationName: "limitOverrideUser",
  }),
  league: one(league, {
    fields: [limitOverride.leagueId],
    references: [league.id],
  }),
  createdByUser: one(user, {
    fields: [limitOverride.createdBy],
    references: [user.id],
    relationName: "limitOverrideCreatedBy",
  }),
}));

export const limitOverrideColumns = getTableColumns(limitOverride);

export const gameCategory = pgEnum("game_category", [
  GameCategory.HEAD_TO_HEAD,
  GameCategory.FREE_FOR_ALL,
  GameCategory.HIGH_SCORE,
]);

export const gameType = pgTable(
  "game_type",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    leagueId: text("league_id")
      .notNull()
      .references(() => league.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    logo: text("logo"),
    category: gameCategory("category").notNull(),
    config: text("config").notNull(),
    isArchived: boolean("is_archived").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("game_type_league_idx").on(table.leagueId),
    index("game_type_name_league_idx").on(table.leagueId, table.name),
  ],
);

export type GameType = InferSelectModel<typeof gameType>;
export type NewGameType = InferInsertModel<typeof gameType>;

export const gameTypeRelations = relations(gameType, ({ one, many }) => ({
  league: one(league, {
    fields: [gameType.leagueId],
    references: [league.id],
  }),
  matches: many(match),
  highScoreEntries: many(highScoreEntry),
}));

export const gameTypeColumns = getTableColumns(gameType);

export const team = pgTable(
  "team",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    leagueId: text("league_id")
      .notNull()
      .references(() => league.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    logo: text("logo"),
    isArchived: boolean("is_archived").default(false).notNull(),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("team_league_idx").on(table.leagueId),
    index("team_name_league_idx").on(table.leagueId, table.name),
    index("team_created_by_idx").on(table.createdById),
  ],
);

export type Team = InferSelectModel<typeof team>;
export type NewTeam = InferInsertModel<typeof team>;

export const teamMemberRole = pgEnum("team_member_role", [
  TeamMemberRole.MEMBER,
  TeamMemberRole.MANAGER,
]);

export const teamMember = pgTable(
  "team_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    placeholderMemberId: text("placeholder_member_id").references(
      () => placeholderMember.id,
      { onDelete: "cascade" },
    ),
    role: teamMemberRole("role").notNull().default("member"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    leftAt: timestamp("left_at"),
  },
  (table) => [
    index("team_member_team_idx").on(table.teamId),
    index("team_member_user_idx").on(table.userId),
    index("team_member_placeholder_idx").on(table.placeholderMemberId),
  ],
);

export type TeamMember = InferSelectModel<typeof teamMember>;
export type NewTeamMember = InferInsertModel<typeof teamMember>;

export const teamInvitation = pgTable(
  "team_invitation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id),
    inviteeUserId: text("invitee_user_id").references(() => user.id),
    role: teamMemberRole("role").notNull().default("member"),
    status: invitationStatus("status").notNull().default("pending"),
    token: text("token").unique(),
    maxUses: integer("max_uses"),
    useCount: integer("use_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
  },
  (table) => [
    index("team_invitation_team_idx").on(table.teamId),
    index("team_invitation_invitee_idx").on(table.inviteeUserId),
    index("team_invitation_token_idx").on(table.token),
  ],
);

export type TeamInvitation = InferSelectModel<typeof teamInvitation>;
export type NewTeamInvitation = InferInsertModel<typeof teamInvitation>;

export const teamRelations = relations(team, ({ one, many }) => ({
  league: one(league, {
    fields: [team.leagueId],
    references: [league.id],
  }),
  createdBy: one(user, {
    fields: [team.createdById],
    references: [user.id],
  }),
  members: many(teamMember),
  invitations: many(teamInvitation),
}));

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
  team: one(team, {
    fields: [teamMember.teamId],
    references: [team.id],
  }),
  user: one(user, {
    fields: [teamMember.userId],
    references: [user.id],
  }),
  placeholderMember: one(placeholderMember, {
    fields: [teamMember.placeholderMemberId],
    references: [placeholderMember.id],
  }),
}));

export const teamInvitationRelations = relations(teamInvitation, ({ one }) => ({
  team: one(team, {
    fields: [teamInvitation.teamId],
    references: [team.id],
  }),
  inviter: one(user, {
    fields: [teamInvitation.inviterId],
    references: [user.id],
  }),
  invitee: one(user, {
    fields: [teamInvitation.inviteeUserId],
    references: [user.id],
  }),
}));

export const teamColumns = getTableColumns(team);
export const teamMemberColumns = getTableColumns(teamMember);
export const teamInvitationColumns = getTableColumns(teamInvitation);

export const matchStatus = pgEnum("match_status", [
  MatchStatus.PENDING,
  MatchStatus.ACCEPTED,
  MatchStatus.COMPLETED,
  MatchStatus.DECLINED,
  MatchStatus.CANCELLED,
]);

export const matchResult = pgEnum("match_result", [
  MatchResult.WIN,
  MatchResult.LOSS,
  MatchResult.DRAW,
]);

export const match = pgTable(
  "match",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    leagueId: text("league_id")
      .notNull()
      .references(() => league.id, { onDelete: "cascade" }),
    gameTypeId: text("game_type_id")
      .notNull()
      .references(() => gameType.id, { onDelete: "cascade" }),
    status: matchStatus("status").notNull().default(MatchStatus.COMPLETED),
    playedAt: timestamp("played_at").notNull(),
    recorderId: text("recorder_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    challengerId: text("challenger_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    challengedAt: timestamp("challenged_at"),
    acceptedAt: timestamp("accepted_at"),
    declinedAt: timestamp("declined_at"),
    cancelledAt: timestamp("cancelled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("match_league_idx").on(table.leagueId),
    index("match_game_type_idx").on(table.gameTypeId),
    index("match_status_idx").on(table.status),
    index("match_played_at_idx").on(table.playedAt),
    index("match_recorder_idx").on(table.recorderId),
    index("match_challenger_idx").on(table.challengerId),
  ],
);

export type Match = InferSelectModel<typeof match>;
export type NewMatch = InferInsertModel<typeof match>;

export const matchParticipant = pgTable(
  "match_participant",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    matchId: text("match_id")
      .notNull()
      .references(() => match.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => team.id, { onDelete: "cascade" }),
    placeholderMemberId: text("placeholder_member_id").references(
      () => placeholderMember.id,
      { onDelete: "cascade" },
    ),
    side: integer("side"),
    score: real("score"),
    rank: integer("rank"),
    result: matchResult("result"),
    isChallenged: boolean("is_challenged"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("match_participant_match_idx").on(table.matchId),
    index("match_participant_user_idx").on(table.userId),
    index("match_participant_team_idx").on(table.teamId),
    index("match_participant_placeholder_idx").on(table.placeholderMemberId),
  ],
);

export type MatchParticipant = InferSelectModel<typeof matchParticipant>;
export type NewMatchParticipant = InferInsertModel<typeof matchParticipant>;

export const highScoreEntry = pgTable(
  "high_score_entry",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    leagueId: text("league_id")
      .notNull()
      .references(() => league.id, { onDelete: "cascade" }),
    gameTypeId: text("game_type_id")
      .notNull()
      .references(() => gameType.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => team.id, { onDelete: "cascade" }),
    placeholderMemberId: text("placeholder_member_id").references(
      () => placeholderMember.id,
      { onDelete: "cascade" },
    ),
    score: real("score").notNull(),
    recorderId: text("recorder_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    achievedAt: timestamp("achieved_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("high_score_entry_league_idx").on(table.leagueId),
    index("high_score_entry_game_type_idx").on(table.gameTypeId),
    index("high_score_entry_user_idx").on(table.userId),
    index("high_score_entry_team_idx").on(table.teamId),
    index("high_score_entry_placeholder_idx").on(table.placeholderMemberId),
    index("high_score_entry_score_idx").on(table.score),
    index("high_score_entry_achieved_at_idx").on(table.achievedAt),
  ],
);

export type HighScoreEntry = InferSelectModel<typeof highScoreEntry>;
export type NewHighScoreEntry = InferInsertModel<typeof highScoreEntry>;

export const matchRelations = relations(match, ({ one, many }) => ({
  league: one(league, {
    fields: [match.leagueId],
    references: [league.id],
  }),
  gameType: one(gameType, {
    fields: [match.gameTypeId],
    references: [gameType.id],
  }),
  recorder: one(user, {
    fields: [match.recorderId],
    references: [user.id],
    relationName: "recordedMatches",
  }),
  challenger: one(user, {
    fields: [match.challengerId],
    references: [user.id],
    relationName: "challengedMatches",
  }),
  participants: many(matchParticipant),
}));

export const matchParticipantRelations = relations(
  matchParticipant,
  ({ one }) => ({
    match: one(match, {
      fields: [matchParticipant.matchId],
      references: [match.id],
    }),
    user: one(user, {
      fields: [matchParticipant.userId],
      references: [user.id],
    }),
    team: one(team, {
      fields: [matchParticipant.teamId],
      references: [team.id],
    }),
    placeholderMember: one(placeholderMember, {
      fields: [matchParticipant.placeholderMemberId],
      references: [placeholderMember.id],
    }),
  }),
);

export const highScoreEntryRelations = relations(highScoreEntry, ({ one }) => ({
  league: one(league, {
    fields: [highScoreEntry.leagueId],
    references: [league.id],
  }),
  gameType: one(gameType, {
    fields: [highScoreEntry.gameTypeId],
    references: [gameType.id],
  }),
  user: one(user, {
    fields: [highScoreEntry.userId],
    references: [user.id],
  }),
  team: one(team, {
    fields: [highScoreEntry.teamId],
    references: [team.id],
  }),
  placeholderMember: one(placeholderMember, {
    fields: [highScoreEntry.placeholderMemberId],
    references: [placeholderMember.id],
  }),
  recorder: one(user, {
    fields: [highScoreEntry.recorderId],
    references: [user.id],
    relationName: "recordedHighScores",
  }),
}));

export const matchColumns = getTableColumns(match);
export const matchParticipantColumns = getTableColumns(matchParticipant);
export const highScoreEntryColumns = getTableColumns(highScoreEntry);
