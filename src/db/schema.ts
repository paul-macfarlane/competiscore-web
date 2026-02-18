import {
  EventParticipantRole,
  EventPointCategory,
  EventPointOutcome,
  EventScoringType,
  EventStatus,
  EventVisibility,
  GameCategory,
  HighScoreSessionStatus,
  InvitationStatus,
  LeagueMemberRole,
  LeagueVisibility,
  MatchResult,
  MatchStatus,
  ModerationActionType,
  ReportReason,
  ReportStatus,
  SeedingType,
  TeamMemberRole,
  TournamentStatus,
  TournamentType,
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
  unique,
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
    placeholderId: text("placeholder_id").references(
      () => placeholderMember.id,
      {
        onDelete: "set null",
      },
    ),
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
    index("league_invitation_placeholder_idx").on(table.placeholderId),
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

export const eloRating = pgTable(
  "elo_rating",
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
    rating: real("rating").notNull().default(1200),
    matchesPlayed: integer("matches_played").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("elo_rating_league_game_type_idx").on(
      table.leagueId,
      table.gameTypeId,
    ),
    index("elo_rating_user_idx").on(table.userId),
    index("elo_rating_team_idx").on(table.teamId),
    index("elo_rating_placeholder_idx").on(table.placeholderMemberId),
    index("elo_rating_rating_idx").on(table.rating),
    uniqueIndex("elo_rating_user_game_type_unique").on(
      table.userId,
      table.gameTypeId,
    ),
    uniqueIndex("elo_rating_team_game_type_unique").on(
      table.teamId,
      table.gameTypeId,
    ),
    uniqueIndex("elo_rating_placeholder_game_type_unique").on(
      table.placeholderMemberId,
      table.gameTypeId,
    ),
  ],
);

export type EloRating = InferSelectModel<typeof eloRating>;
export type NewEloRating = InferInsertModel<typeof eloRating>;

export const eloHistory = pgTable(
  "elo_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eloRatingId: text("elo_rating_id")
      .notNull()
      .references(() => eloRating.id, { onDelete: "cascade" }),
    matchId: text("match_id")
      .notNull()
      .references(() => match.id, { onDelete: "cascade" }),
    ratingBefore: real("rating_before").notNull(),
    ratingAfter: real("rating_after").notNull(),
    ratingChange: real("rating_change").notNull(),
    kFactor: integer("k_factor").notNull(),
    opponentRatingAvg: real("opponent_rating_avg").notNull(),
    expectedScore: real("expected_score").notNull(),
    actualScore: real("actual_score").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("elo_history_elo_rating_idx").on(table.eloRatingId),
    index("elo_history_match_idx").on(table.matchId),
    index("elo_history_created_at_idx").on(table.createdAt),
  ],
);

export type EloHistory = InferSelectModel<typeof eloHistory>;
export type NewEloHistory = InferInsertModel<typeof eloHistory>;

export const eloRatingRelations = relations(eloRating, ({ one, many }) => ({
  league: one(league, {
    fields: [eloRating.leagueId],
    references: [league.id],
  }),
  gameType: one(gameType, {
    fields: [eloRating.gameTypeId],
    references: [gameType.id],
  }),
  user: one(user, {
    fields: [eloRating.userId],
    references: [user.id],
  }),
  team: one(team, {
    fields: [eloRating.teamId],
    references: [team.id],
  }),
  placeholderMember: one(placeholderMember, {
    fields: [eloRating.placeholderMemberId],
    references: [placeholderMember.id],
  }),
  history: many(eloHistory),
}));

export const eloHistoryRelations = relations(eloHistory, ({ one }) => ({
  eloRating: one(eloRating, {
    fields: [eloHistory.eloRatingId],
    references: [eloRating.id],
  }),
  match: one(match, {
    fields: [eloHistory.matchId],
    references: [match.id],
  }),
}));

export const eloRatingColumns = getTableColumns(eloRating);
export const eloHistoryColumns = getTableColumns(eloHistory);

export const tournamentStatusEnum = pgEnum("tournament_status", [
  TournamentStatus.DRAFT,
  TournamentStatus.IN_PROGRESS,
  TournamentStatus.COMPLETED,
]);

export const tournamentTypeEnum = pgEnum("tournament_type", [
  TournamentType.SINGLE_ELIMINATION,
  TournamentType.SWISS,
]);

export const seedingTypeEnum = pgEnum("seeding_type", [
  SeedingType.MANUAL,
  SeedingType.RANDOM,
]);

export const tournament = pgTable(
  "tournament",
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
    name: text("name").notNull(),
    description: text("description"),
    logo: text("logo"),
    tournamentType: tournamentTypeEnum("tournament_type")
      .notNull()
      .default(TournamentType.SINGLE_ELIMINATION),
    status: tournamentStatusEnum("status")
      .notNull()
      .default(TournamentStatus.DRAFT),
    participantType: text("participant_type").notNull(),
    seedingType: seedingTypeEnum("seeding_type").notNull(),
    bestOf: integer("best_of").notNull().default(1),
    totalRounds: integer("total_rounds"),
    startDate: timestamp("start_date"),
    completedAt: timestamp("completed_at"),
    placementPointConfig: text("placement_point_config"),
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
    index("tournament_league_idx").on(table.leagueId),
    index("tournament_game_type_idx").on(table.gameTypeId),
    index("tournament_status_idx").on(table.status),
    index("tournament_created_by_idx").on(table.createdById),
  ],
);

export type Tournament = InferSelectModel<typeof tournament>;
export type NewTournament = InferInsertModel<typeof tournament>;

export const tournamentParticipant = pgTable(
  "tournament_participant",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournament.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => team.id, { onDelete: "cascade" }),
    placeholderMemberId: text("placeholder_member_id").references(
      () => placeholderMember.id,
      { onDelete: "cascade" },
    ),
    seed: integer("seed"),
    isEliminated: boolean("is_eliminated").default(false).notNull(),
    eliminatedInRound: integer("eliminated_in_round"),
    finalPlacement: integer("final_placement"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("tournament_participant_tournament_idx").on(table.tournamentId),
    index("tournament_participant_user_idx").on(table.userId),
    index("tournament_participant_team_idx").on(table.teamId),
    index("tournament_participant_placeholder_idx").on(
      table.placeholderMemberId,
    ),
  ],
);

export type TournamentParticipant = InferSelectModel<
  typeof tournamentParticipant
>;
export type NewTournamentParticipant = InferInsertModel<
  typeof tournamentParticipant
>;

export const tournamentRoundMatch = pgTable(
  "tournament_round_match",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournament.id, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    position: integer("position").notNull(),
    participant1Id: text("participant1_id").references(
      () => tournamentParticipant.id,
      { onDelete: "set null" },
    ),
    participant2Id: text("participant2_id").references(
      () => tournamentParticipant.id,
      { onDelete: "set null" },
    ),
    winnerId: text("winner_id").references(() => tournamentParticipant.id, {
      onDelete: "set null",
    }),
    matchId: text("match_id").references(() => match.id, {
      onDelete: "set null",
    }),
    isBye: boolean("is_bye").default(false).notNull(),
    isForfeit: boolean("is_forfeit").default(false).notNull(),
    isDraw: boolean("is_draw").default(false).notNull(),
    nextMatchId: text("next_match_id"),
    nextMatchSlot: integer("next_match_slot"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("tournament_round_match_tournament_idx").on(table.tournamentId),
    index("tournament_round_match_tournament_round_idx").on(
      table.tournamentId,
      table.round,
    ),
    index("tournament_round_match_match_idx").on(table.matchId),
    unique("tournament_round_match_unique").on(
      table.tournamentId,
      table.round,
      table.position,
    ),
  ],
);

export type TournamentRoundMatch = InferSelectModel<
  typeof tournamentRoundMatch
>;
export type NewTournamentRoundMatch = InferInsertModel<
  typeof tournamentRoundMatch
>;

export const tournamentRelations = relations(tournament, ({ one, many }) => ({
  league: one(league, {
    fields: [tournament.leagueId],
    references: [league.id],
  }),
  gameType: one(gameType, {
    fields: [tournament.gameTypeId],
    references: [gameType.id],
  }),
  createdBy: one(user, {
    fields: [tournament.createdById],
    references: [user.id],
  }),
  participants: many(tournamentParticipant),
  roundMatches: many(tournamentRoundMatch),
}));

export const tournamentParticipantRelations = relations(
  tournamentParticipant,
  ({ one }) => ({
    tournament: one(tournament, {
      fields: [tournamentParticipant.tournamentId],
      references: [tournament.id],
    }),
    user: one(user, {
      fields: [tournamentParticipant.userId],
      references: [user.id],
    }),
    team: one(team, {
      fields: [tournamentParticipant.teamId],
      references: [team.id],
    }),
    placeholderMember: one(placeholderMember, {
      fields: [tournamentParticipant.placeholderMemberId],
      references: [placeholderMember.id],
    }),
  }),
);

export const tournamentRoundMatchRelations = relations(
  tournamentRoundMatch,
  ({ one }) => ({
    tournament: one(tournament, {
      fields: [tournamentRoundMatch.tournamentId],
      references: [tournament.id],
    }),
    participant1: one(tournamentParticipant, {
      fields: [tournamentRoundMatch.participant1Id],
      references: [tournamentParticipant.id],
      relationName: "participant1Matches",
    }),
    participant2: one(tournamentParticipant, {
      fields: [tournamentRoundMatch.participant2Id],
      references: [tournamentParticipant.id],
      relationName: "participant2Matches",
    }),
    winner: one(tournamentParticipant, {
      fields: [tournamentRoundMatch.winnerId],
      references: [tournamentParticipant.id],
      relationName: "wonMatches",
    }),
    match: one(match, {
      fields: [tournamentRoundMatch.matchId],
      references: [match.id],
    }),
  }),
);

export const tournamentColumns = getTableColumns(tournament);
export const tournamentParticipantColumns = getTableColumns(
  tournamentParticipant,
);
export const tournamentRoundMatchColumns =
  getTableColumns(tournamentRoundMatch);

// ============================================================
// Event tables (independent top-level entity)
// ============================================================

export const eventVisibility = pgEnum("event_visibility", [
  EventVisibility.PUBLIC,
  EventVisibility.PRIVATE,
]);

export const eventScoringType = pgEnum("event_scoring_type", [
  EventScoringType.TEAM,
]);

export const eventStatusEnum = pgEnum("event_status", [
  EventStatus.DRAFT,
  EventStatus.ACTIVE,
  EventStatus.COMPLETED,
]);

export const event = pgTable(
  "event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    logo: text("logo"),
    visibility: eventVisibility("visibility").notNull().default("private"),
    scoringType: eventScoringType("scoring_type").notNull().default("team"),
    status: eventStatusEnum("status").notNull().default(EventStatus.DRAFT),
    startDate: timestamp("start_date"),
    completedAt: timestamp("completed_at"),
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
    index("event_name_idx").on(table.name),
    index("event_created_by_idx").on(table.createdById),
    index("event_status_idx").on(table.status),
  ],
);

export type Event = InferSelectModel<typeof event>;
export type NewEvent = InferInsertModel<typeof event>;

export const eventParticipantRoleEnum = pgEnum("event_participant_role", [
  EventParticipantRole.ORGANIZER,
  EventParticipantRole.PARTICIPANT,
]);

export const eventParticipant = pgTable(
  "event_participant",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: eventParticipantRoleEnum("role").notNull().default("participant"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("event_participant_unique").on(table.eventId, table.userId),
    index("event_participant_event_idx").on(table.eventId),
    index("event_participant_user_idx").on(table.userId),
  ],
);

export type EventParticipant = InferSelectModel<typeof eventParticipant>;
export type NewEventParticipant = InferInsertModel<typeof eventParticipant>;

export const eventPlaceholderParticipant = pgTable(
  "event_placeholder_participant",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    linkedUserId: text("linked_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    retiredAt: timestamp("retired_at"),
  },
  (table) => [
    index("event_placeholder_participant_event_idx").on(table.eventId),
    index("event_placeholder_participant_linked_user_idx").on(
      table.linkedUserId,
    ),
  ],
);

export type EventPlaceholderParticipant = InferSelectModel<
  typeof eventPlaceholderParticipant
>;
export type NewEventPlaceholderParticipant = InferInsertModel<
  typeof eventPlaceholderParticipant
>;

export const eventInvitation = pgTable(
  "event_invitation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id),
    inviteeUserId: text("invitee_user_id").references(() => user.id),
    eventPlaceholderParticipantId: text(
      "event_placeholder_participant_id",
    ).references(() => eventPlaceholderParticipant.id, {
      onDelete: "set null",
    }),
    role: eventParticipantRoleEnum("role").notNull().default("participant"),
    status: invitationStatus("status").notNull().default("pending"),
    token: text("token").unique(),
    maxUses: integer("max_uses"),
    useCount: integer("use_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
  },
  (table) => [
    index("event_invitation_event_idx").on(table.eventId),
    index("event_invitation_invitee_idx").on(table.inviteeUserId),
    index("event_invitation_token_idx").on(table.token),
  ],
);

export type EventInvitation = InferSelectModel<typeof eventInvitation>;
export type NewEventInvitation = InferInsertModel<typeof eventInvitation>;

export const eventGameType = pgTable(
  "event_game_type",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
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
    index("event_game_type_event_idx").on(table.eventId),
    index("event_game_type_name_event_idx").on(table.eventId, table.name),
  ],
);

export type EventGameType = InferSelectModel<typeof eventGameType>;
export type NewEventGameType = InferInsertModel<typeof eventGameType>;

export const eventTeam = pgTable(
  "event_team",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    logo: text("logo"),
    color: text("color"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("event_team_event_idx").on(table.eventId),
    index("event_team_name_event_idx").on(table.eventId, table.name),
  ],
);

export type EventTeam = InferSelectModel<typeof eventTeam>;
export type NewEventTeam = InferInsertModel<typeof eventTeam>;

export const eventTeamMember = pgTable(
  "event_team_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventTeamId: text("event_team_id")
      .notNull()
      .references(() => eventTeam.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    eventPlaceholderParticipantId: text(
      "event_placeholder_participant_id",
    ).references(() => eventPlaceholderParticipant.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("event_team_member_team_idx").on(table.eventTeamId),
    index("event_team_member_user_idx").on(table.userId),
    index("event_team_member_placeholder_idx").on(
      table.eventPlaceholderParticipantId,
    ),
    unique("event_team_member_user_unique").on(table.eventTeamId, table.userId),
    unique("event_team_member_placeholder_unique").on(
      table.eventTeamId,
      table.eventPlaceholderParticipantId,
    ),
  ],
);

export type EventTeamMember = InferSelectModel<typeof eventTeamMember>;
export type NewEventTeamMember = InferInsertModel<typeof eventTeamMember>;

export const eventMatch = pgTable(
  "event_match",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    eventGameTypeId: text("event_game_type_id")
      .notNull()
      .references(() => eventGameType.id, { onDelete: "cascade" }),
    eventTournamentRoundMatchId: text("event_tournament_round_match_id"),
    playedAt: timestamp("played_at").notNull(),
    recorderId: text("recorder_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("event_match_event_idx").on(table.eventId),
    index("event_match_game_type_idx").on(table.eventGameTypeId),
    index("event_match_played_at_idx").on(table.playedAt),
    index("event_match_round_match_idx").on(table.eventTournamentRoundMatchId),
  ],
);

export type EventMatch = InferSelectModel<typeof eventMatch>;
export type NewEventMatch = InferInsertModel<typeof eventMatch>;

export const eventMatchParticipant = pgTable(
  "event_match_participant",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventMatchId: text("event_match_id")
      .notNull()
      .references(() => eventMatch.id, { onDelete: "cascade" }),
    eventTeamId: text("event_team_id").references(() => eventTeam.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    eventPlaceholderParticipantId: text(
      "event_placeholder_participant_id",
    ).references(() => eventPlaceholderParticipant.id, { onDelete: "cascade" }),
    side: integer("side"),
    score: real("score"),
    rank: integer("rank"),
    result: matchResult("result"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("event_match_participant_match_idx").on(table.eventMatchId),
    index("event_match_participant_team_idx").on(table.eventTeamId),
    index("event_match_participant_user_idx").on(table.userId),
    index("event_match_participant_placeholder_idx").on(
      table.eventPlaceholderParticipantId,
    ),
  ],
);

export type EventMatchParticipant = InferSelectModel<
  typeof eventMatchParticipant
>;
export type NewEventMatchParticipant = InferInsertModel<
  typeof eventMatchParticipant
>;

export const highScoreSessionStatusEnum = pgEnum("high_score_session_status", [
  HighScoreSessionStatus.OPEN,
  HighScoreSessionStatus.CLOSED,
]);

export const eventHighScoreSession = pgTable(
  "event_high_score_session",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    eventGameTypeId: text("event_game_type_id")
      .notNull()
      .references(() => eventGameType.id, { onDelete: "cascade" }),
    name: text("name"),
    description: text("description"),
    status: highScoreSessionStatusEnum("status")
      .notNull()
      .default(HighScoreSessionStatus.OPEN),
    placementPointConfig: text("placement_point_config"),
    openedById: text("opened_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    closedById: text("closed_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    openedAt: timestamp("opened_at").defaultNow().notNull(),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("event_hs_session_event_idx").on(table.eventId),
    index("event_hs_session_game_type_idx").on(table.eventGameTypeId),
    index("event_hs_session_status_idx").on(table.status),
  ],
);

export type EventHighScoreSession = InferSelectModel<
  typeof eventHighScoreSession
>;
export type NewEventHighScoreSession = InferInsertModel<
  typeof eventHighScoreSession
>;

export const eventHighScoreEntry = pgTable(
  "event_high_score_entry",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id")
      .notNull()
      .references(() => eventHighScoreSession.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    eventGameTypeId: text("event_game_type_id")
      .notNull()
      .references(() => eventGameType.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    eventPlaceholderParticipantId: text(
      "event_placeholder_participant_id",
    ).references(() => eventPlaceholderParticipant.id, { onDelete: "cascade" }),
    eventTeamId: text("event_team_id").references(() => eventTeam.id, {
      onDelete: "cascade",
    }),
    score: real("score").notNull(),
    recorderId: text("recorder_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    achievedAt: timestamp("achieved_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("event_hs_entry_session_idx").on(table.sessionId),
    index("event_hs_entry_event_idx").on(table.eventId),
    index("event_hs_entry_game_type_idx").on(table.eventGameTypeId),
    index("event_hs_entry_user_idx").on(table.userId),
    index("event_hs_entry_placeholder_idx").on(
      table.eventPlaceholderParticipantId,
    ),
    index("event_hs_entry_team_idx").on(table.eventTeamId),
  ],
);

export type EventHighScoreEntry = InferSelectModel<typeof eventHighScoreEntry>;
export type NewEventHighScoreEntry = InferInsertModel<
  typeof eventHighScoreEntry
>;

export const eventHighScoreEntryMember = pgTable(
  "event_high_score_entry_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventHighScoreEntryId: text("event_high_score_entry_id")
      .notNull()
      .references(() => eventHighScoreEntry.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    eventPlaceholderParticipantId: text(
      "event_placeholder_participant_id",
    ).references(() => eventPlaceholderParticipant.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("event_hs_entry_member_entry_idx").on(table.eventHighScoreEntryId),
    index("event_hs_entry_member_user_idx").on(table.userId),
    index("event_hs_entry_member_placeholder_idx").on(
      table.eventPlaceholderParticipantId,
    ),
  ],
);

export type EventHighScoreEntryMember = InferSelectModel<
  typeof eventHighScoreEntryMember
>;
export type NewEventHighScoreEntryMember = InferInsertModel<
  typeof eventHighScoreEntryMember
>;

export const eventPointCategoryEnum = pgEnum("event_point_category", [
  EventPointCategory.H2H_MATCH,
  EventPointCategory.FFA_MATCH,
  EventPointCategory.HIGH_SCORE,
  EventPointCategory.TOURNAMENT,
  EventPointCategory.DISCRETIONARY,
]);

export const eventPointOutcomeEnum = pgEnum("event_point_outcome", [
  EventPointOutcome.WIN,
  EventPointOutcome.LOSS,
  EventPointOutcome.DRAW,
  EventPointOutcome.PLACEMENT,
  EventPointOutcome.SUBMISSION,
  EventPointOutcome.AWARD,
]);

export const eventDiscretionaryAward = pgTable(
  "event_discretionary_award",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    points: real("points").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("event_discretionary_award_event_idx").on(table.eventId),
    index("event_discretionary_award_created_by_idx").on(table.createdByUserId),
  ],
);

export type EventDiscretionaryAward = InferSelectModel<
  typeof eventDiscretionaryAward
>;
export type NewEventDiscretionaryAward = InferInsertModel<
  typeof eventDiscretionaryAward
>;

export const eventPointEntry = pgTable(
  "event_point_entry",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    category: eventPointCategoryEnum("category").notNull(),
    outcome: eventPointOutcomeEnum("outcome").notNull(),
    eventTeamId: text("event_team_id").references(() => eventTeam.id, {
      onDelete: "cascade",
    }),
    eventMatchId: text("event_match_id").references(() => eventMatch.id, {
      onDelete: "cascade",
    }),
    eventHighScoreSessionId: text("event_high_score_session_id").references(
      () => eventHighScoreSession.id,
      { onDelete: "cascade" },
    ),
    eventTournamentId: text("event_tournament_id").references(
      () => eventTournament.id,
      { onDelete: "cascade" },
    ),
    eventDiscretionaryAwardId: text("event_discretionary_award_id").references(
      () => eventDiscretionaryAward.id,
      { onDelete: "cascade" },
    ),
    points: real("points").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("event_point_entry_event_idx").on(table.eventId),
    index("event_point_entry_team_idx").on(table.eventTeamId),
    index("event_point_entry_match_idx").on(table.eventMatchId),
    index("event_point_entry_session_idx").on(table.eventHighScoreSessionId),
    index("event_point_entry_tournament_idx").on(table.eventTournamentId),
    index("event_point_entry_discretionary_idx").on(
      table.eventDiscretionaryAwardId,
    ),
  ],
);

export type EventPointEntry = InferSelectModel<typeof eventPointEntry>;
export type NewEventPointEntry = InferInsertModel<typeof eventPointEntry>;

export const eventPointEntryParticipant = pgTable(
  "event_point_entry_participant",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventPointEntryId: text("event_point_entry_id")
      .notNull()
      .references(() => eventPointEntry.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    eventPlaceholderParticipantId: text(
      "event_placeholder_participant_id",
    ).references(() => eventPlaceholderParticipant.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("event_pep_entry_idx").on(table.eventPointEntryId),
    index("event_pep_user_idx").on(table.userId),
    index("event_pep_placeholder_idx").on(table.eventPlaceholderParticipantId),
  ],
);

export type EventPointEntryParticipant = InferSelectModel<
  typeof eventPointEntryParticipant
>;
export type NewEventPointEntryParticipant = InferInsertModel<
  typeof eventPointEntryParticipant
>;

export const eventTournament = pgTable(
  "event_tournament",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    eventGameTypeId: text("event_game_type_id")
      .notNull()
      .references(() => eventGameType.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    logo: text("logo"),
    tournamentType: tournamentTypeEnum("tournament_type")
      .notNull()
      .default(TournamentType.SINGLE_ELIMINATION),
    status: tournamentStatusEnum("status")
      .notNull()
      .default(TournamentStatus.DRAFT),
    participantType: text("participant_type").notNull().default("individual"),
    seedingType: seedingTypeEnum("seeding_type").notNull(),
    bestOf: integer("best_of").notNull().default(1),
    roundBestOf: text("round_best_of"),
    placementPointConfig: text("placement_point_config"),
    totalRounds: integer("total_rounds"),
    startDate: timestamp("start_date"),
    completedAt: timestamp("completed_at"),
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
    index("event_tournament_event_idx").on(table.eventId),
    index("event_tournament_game_type_idx").on(table.eventGameTypeId),
    index("event_tournament_status_idx").on(table.status),
  ],
);

export type EventTournament = InferSelectModel<typeof eventTournament>;
export type NewEventTournament = InferInsertModel<typeof eventTournament>;

export const eventTournamentParticipant = pgTable(
  "event_tournament_participant",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventTournamentId: text("event_tournament_id")
      .notNull()
      .references(() => eventTournament.id, { onDelete: "cascade" }),
    eventTeamId: text("event_team_id")
      .notNull()
      .references(() => eventTeam.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    eventPlaceholderParticipantId: text(
      "event_placeholder_participant_id",
    ).references(() => eventPlaceholderParticipant.id, { onDelete: "cascade" }),
    seed: integer("seed"),
    isEliminated: boolean("is_eliminated").default(false).notNull(),
    eliminatedInRound: integer("eliminated_in_round"),
    finalPlacement: integer("final_placement"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("event_tp_tournament_idx").on(table.eventTournamentId),
    index("event_tp_team_idx").on(table.eventTeamId),
  ],
);

export type EventTournamentParticipant = InferSelectModel<
  typeof eventTournamentParticipant
>;
export type NewEventTournamentParticipant = InferInsertModel<
  typeof eventTournamentParticipant
>;

export const eventTournamentRoundMatch = pgTable(
  "event_tournament_round_match",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventTournamentId: text("event_tournament_id")
      .notNull()
      .references(() => eventTournament.id, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    position: integer("position").notNull(),
    participant1Id: text("participant1_id").references(
      () => eventTournamentParticipant.id,
      { onDelete: "set null" },
    ),
    participant2Id: text("participant2_id").references(
      () => eventTournamentParticipant.id,
      { onDelete: "set null" },
    ),
    winnerId: text("winner_id").references(
      () => eventTournamentParticipant.id,
      { onDelete: "set null" },
    ),
    eventMatchId: text("event_match_id").references(() => eventMatch.id, {
      onDelete: "set null",
    }),
    isBye: boolean("is_bye").default(false).notNull(),
    isForfeit: boolean("is_forfeit").default(false).notNull(),
    isDraw: boolean("is_draw").default(false).notNull(),
    participant1Score: real("participant1_score"),
    participant2Score: real("participant2_score"),
    participant1Wins: integer("participant1_wins").notNull().default(0),
    participant2Wins: integer("participant2_wins").notNull().default(0),
    nextMatchId: text("next_match_id"),
    nextMatchSlot: integer("next_match_slot"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("event_trm_tournament_idx").on(table.eventTournamentId),
    index("event_trm_round_idx").on(table.eventTournamentId, table.round),
    unique("event_trm_unique").on(
      table.eventTournamentId,
      table.round,
      table.position,
    ),
  ],
);

export type EventTournamentRoundMatch = InferSelectModel<
  typeof eventTournamentRoundMatch
>;
export type NewEventTournamentRoundMatch = InferInsertModel<
  typeof eventTournamentRoundMatch
>;

export const eventTournamentParticipantMember = pgTable(
  "event_tournament_participant_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventTournamentParticipantId: text("event_tournament_participant_id")
      .notNull()
      .references(() => eventTournamentParticipant.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    eventPlaceholderParticipantId: text(
      "event_placeholder_participant_id",
    ).references(() => eventPlaceholderParticipant.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("event_tpm_participant_idx").on(table.eventTournamentParticipantId),
    index("event_tpm_user_idx").on(table.userId),
    index("event_tpm_placeholder_idx").on(table.eventPlaceholderParticipantId),
  ],
);

export type EventTournamentParticipantMember = InferSelectModel<
  typeof eventTournamentParticipantMember
>;
export type NewEventTournamentParticipantMember = InferInsertModel<
  typeof eventTournamentParticipantMember
>;

// Event relations

export const eventRelations = relations(event, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [event.createdById],
    references: [user.id],
  }),
  participants: many(eventParticipant),
  placeholderParticipants: many(eventPlaceholderParticipant),
  invitations: many(eventInvitation),
  gameTypes: many(eventGameType),
  teams: many(eventTeam),
  matches: many(eventMatch),
  highScoreSessions: many(eventHighScoreSession),
  pointEntries: many(eventPointEntry),
  tournaments: many(eventTournament),
  discretionaryAwards: many(eventDiscretionaryAward),
}));

export const eventParticipantRelations = relations(
  eventParticipant,
  ({ one }) => ({
    event: one(event, {
      fields: [eventParticipant.eventId],
      references: [event.id],
    }),
    user: one(user, {
      fields: [eventParticipant.userId],
      references: [user.id],
    }),
  }),
);

export const eventPlaceholderParticipantRelations = relations(
  eventPlaceholderParticipant,
  ({ one }) => ({
    event: one(event, {
      fields: [eventPlaceholderParticipant.eventId],
      references: [event.id],
    }),
    linkedUser: one(user, {
      fields: [eventPlaceholderParticipant.linkedUserId],
      references: [user.id],
    }),
  }),
);

export const eventInvitationRelations = relations(
  eventInvitation,
  ({ one }) => ({
    event: one(event, {
      fields: [eventInvitation.eventId],
      references: [event.id],
    }),
    inviter: one(user, {
      fields: [eventInvitation.inviterId],
      references: [user.id],
    }),
    invitee: one(user, {
      fields: [eventInvitation.inviteeUserId],
      references: [user.id],
    }),
    placeholderParticipant: one(eventPlaceholderParticipant, {
      fields: [eventInvitation.eventPlaceholderParticipantId],
      references: [eventPlaceholderParticipant.id],
    }),
  }),
);

export const eventGameTypeRelations = relations(
  eventGameType,
  ({ one, many }) => ({
    event: one(event, {
      fields: [eventGameType.eventId],
      references: [event.id],
    }),
    matches: many(eventMatch),
    highScoreSessions: many(eventHighScoreSession),
  }),
);

export const eventTeamRelations = relations(eventTeam, ({ one, many }) => ({
  event: one(event, {
    fields: [eventTeam.eventId],
    references: [event.id],
  }),
  members: many(eventTeamMember),
}));

export const eventTeamMemberRelations = relations(
  eventTeamMember,
  ({ one }) => ({
    team: one(eventTeam, {
      fields: [eventTeamMember.eventTeamId],
      references: [eventTeam.id],
    }),
    user: one(user, {
      fields: [eventTeamMember.userId],
      references: [user.id],
    }),
    placeholderParticipant: one(eventPlaceholderParticipant, {
      fields: [eventTeamMember.eventPlaceholderParticipantId],
      references: [eventPlaceholderParticipant.id],
    }),
  }),
);

export const eventMatchRelations = relations(eventMatch, ({ one, many }) => ({
  event: one(event, {
    fields: [eventMatch.eventId],
    references: [event.id],
  }),
  gameType: one(eventGameType, {
    fields: [eventMatch.eventGameTypeId],
    references: [eventGameType.id],
  }),
  recorder: one(user, {
    fields: [eventMatch.recorderId],
    references: [user.id],
  }),
  participants: many(eventMatchParticipant),
}));

export const eventMatchParticipantRelations = relations(
  eventMatchParticipant,
  ({ one }) => ({
    match: one(eventMatch, {
      fields: [eventMatchParticipant.eventMatchId],
      references: [eventMatch.id],
    }),
    team: one(eventTeam, {
      fields: [eventMatchParticipant.eventTeamId],
      references: [eventTeam.id],
    }),
    user: one(user, {
      fields: [eventMatchParticipant.userId],
      references: [user.id],
    }),
    placeholderParticipant: one(eventPlaceholderParticipant, {
      fields: [eventMatchParticipant.eventPlaceholderParticipantId],
      references: [eventPlaceholderParticipant.id],
    }),
  }),
);

export const eventHighScoreSessionRelations = relations(
  eventHighScoreSession,
  ({ one, many }) => ({
    event: one(event, {
      fields: [eventHighScoreSession.eventId],
      references: [event.id],
    }),
    gameType: one(eventGameType, {
      fields: [eventHighScoreSession.eventGameTypeId],
      references: [eventGameType.id],
    }),
    openedBy: one(user, {
      fields: [eventHighScoreSession.openedById],
      references: [user.id],
      relationName: "openedSessions",
    }),
    closedBy: one(user, {
      fields: [eventHighScoreSession.closedById],
      references: [user.id],
      relationName: "closedSessions",
    }),
    entries: many(eventHighScoreEntry),
  }),
);

export const eventHighScoreEntryRelations = relations(
  eventHighScoreEntry,
  ({ one, many }) => ({
    session: one(eventHighScoreSession, {
      fields: [eventHighScoreEntry.sessionId],
      references: [eventHighScoreSession.id],
    }),
    event: one(event, {
      fields: [eventHighScoreEntry.eventId],
      references: [event.id],
    }),
    gameType: one(eventGameType, {
      fields: [eventHighScoreEntry.eventGameTypeId],
      references: [eventGameType.id],
    }),
    user: one(user, {
      fields: [eventHighScoreEntry.userId],
      references: [user.id],
    }),
    placeholderParticipant: one(eventPlaceholderParticipant, {
      fields: [eventHighScoreEntry.eventPlaceholderParticipantId],
      references: [eventPlaceholderParticipant.id],
    }),
    team: one(eventTeam, {
      fields: [eventHighScoreEntry.eventTeamId],
      references: [eventTeam.id],
    }),
    recorder: one(user, {
      fields: [eventHighScoreEntry.recorderId],
      references: [user.id],
      relationName: "recordedEventHighScores",
    }),
    members: many(eventHighScoreEntryMember),
  }),
);

export const eventHighScoreEntryMemberRelations = relations(
  eventHighScoreEntryMember,
  ({ one }) => ({
    entry: one(eventHighScoreEntry, {
      fields: [eventHighScoreEntryMember.eventHighScoreEntryId],
      references: [eventHighScoreEntry.id],
    }),
    user: one(user, {
      fields: [eventHighScoreEntryMember.userId],
      references: [user.id],
    }),
    placeholderParticipant: one(eventPlaceholderParticipant, {
      fields: [eventHighScoreEntryMember.eventPlaceholderParticipantId],
      references: [eventPlaceholderParticipant.id],
    }),
  }),
);

export const eventDiscretionaryAwardRelations = relations(
  eventDiscretionaryAward,
  ({ one, many }) => ({
    event: one(event, {
      fields: [eventDiscretionaryAward.eventId],
      references: [event.id],
    }),
    createdBy: one(user, {
      fields: [eventDiscretionaryAward.createdByUserId],
      references: [user.id],
    }),
    pointEntries: many(eventPointEntry),
  }),
);

export const eventPointEntryRelations = relations(
  eventPointEntry,
  ({ one, many }) => ({
    event: one(event, {
      fields: [eventPointEntry.eventId],
      references: [event.id],
    }),
    team: one(eventTeam, {
      fields: [eventPointEntry.eventTeamId],
      references: [eventTeam.id],
    }),
    match: one(eventMatch, {
      fields: [eventPointEntry.eventMatchId],
      references: [eventMatch.id],
    }),
    highScoreSession: one(eventHighScoreSession, {
      fields: [eventPointEntry.eventHighScoreSessionId],
      references: [eventHighScoreSession.id],
    }),
    tournament: one(eventTournament, {
      fields: [eventPointEntry.eventTournamentId],
      references: [eventTournament.id],
    }),
    discretionaryAward: one(eventDiscretionaryAward, {
      fields: [eventPointEntry.eventDiscretionaryAwardId],
      references: [eventDiscretionaryAward.id],
    }),
    participants: many(eventPointEntryParticipant),
  }),
);

export const eventPointEntryParticipantRelations = relations(
  eventPointEntryParticipant,
  ({ one }) => ({
    pointEntry: one(eventPointEntry, {
      fields: [eventPointEntryParticipant.eventPointEntryId],
      references: [eventPointEntry.id],
    }),
    user: one(user, {
      fields: [eventPointEntryParticipant.userId],
      references: [user.id],
    }),
    placeholderParticipant: one(eventPlaceholderParticipant, {
      fields: [eventPointEntryParticipant.eventPlaceholderParticipantId],
      references: [eventPlaceholderParticipant.id],
    }),
  }),
);

export const eventTournamentRelations = relations(
  eventTournament,
  ({ one, many }) => ({
    event: one(event, {
      fields: [eventTournament.eventId],
      references: [event.id],
    }),
    gameType: one(eventGameType, {
      fields: [eventTournament.eventGameTypeId],
      references: [eventGameType.id],
    }),
    createdBy: one(user, {
      fields: [eventTournament.createdById],
      references: [user.id],
    }),
    participants: many(eventTournamentParticipant),
    roundMatches: many(eventTournamentRoundMatch),
  }),
);

export const eventTournamentParticipantRelations = relations(
  eventTournamentParticipant,
  ({ one, many }) => ({
    tournament: one(eventTournament, {
      fields: [eventTournamentParticipant.eventTournamentId],
      references: [eventTournament.id],
    }),
    team: one(eventTeam, {
      fields: [eventTournamentParticipant.eventTeamId],
      references: [eventTeam.id],
    }),
    user: one(user, {
      fields: [eventTournamentParticipant.userId],
      references: [user.id],
    }),
    placeholderParticipant: one(eventPlaceholderParticipant, {
      fields: [eventTournamentParticipant.eventPlaceholderParticipantId],
      references: [eventPlaceholderParticipant.id],
    }),
    members: many(eventTournamentParticipantMember),
  }),
);

export const eventTournamentParticipantMemberRelations = relations(
  eventTournamentParticipantMember,
  ({ one }) => ({
    participant: one(eventTournamentParticipant, {
      fields: [eventTournamentParticipantMember.eventTournamentParticipantId],
      references: [eventTournamentParticipant.id],
    }),
    user: one(user, {
      fields: [eventTournamentParticipantMember.userId],
      references: [user.id],
    }),
    placeholderParticipant: one(eventPlaceholderParticipant, {
      fields: [eventTournamentParticipantMember.eventPlaceholderParticipantId],
      references: [eventPlaceholderParticipant.id],
    }),
  }),
);

export const eventTournamentRoundMatchRelations = relations(
  eventTournamentRoundMatch,
  ({ one }) => ({
    tournament: one(eventTournament, {
      fields: [eventTournamentRoundMatch.eventTournamentId],
      references: [eventTournament.id],
    }),
    participant1: one(eventTournamentParticipant, {
      fields: [eventTournamentRoundMatch.participant1Id],
      references: [eventTournamentParticipant.id],
      relationName: "eventParticipant1Matches",
    }),
    participant2: one(eventTournamentParticipant, {
      fields: [eventTournamentRoundMatch.participant2Id],
      references: [eventTournamentParticipant.id],
      relationName: "eventParticipant2Matches",
    }),
    winner: one(eventTournamentParticipant, {
      fields: [eventTournamentRoundMatch.winnerId],
      references: [eventTournamentParticipant.id],
      relationName: "eventWonMatches",
    }),
    match: one(eventMatch, {
      fields: [eventTournamentRoundMatch.eventMatchId],
      references: [eventMatch.id],
    }),
  }),
);

// Event column exports
export const eventColumns = getTableColumns(event);
export const eventParticipantColumns = getTableColumns(eventParticipant);
export const eventPlaceholderParticipantColumns = getTableColumns(
  eventPlaceholderParticipant,
);
export const eventInvitationColumns = getTableColumns(eventInvitation);
export const eventGameTypeColumns = getTableColumns(eventGameType);
export const eventTeamColumns = getTableColumns(eventTeam);
export const eventTeamMemberColumns = getTableColumns(eventTeamMember);
export const eventMatchColumns = getTableColumns(eventMatch);
export const eventMatchParticipantColumns = getTableColumns(
  eventMatchParticipant,
);
export const eventHighScoreSessionColumns = getTableColumns(
  eventHighScoreSession,
);
export const eventHighScoreEntryColumns = getTableColumns(eventHighScoreEntry);
export const eventHighScoreEntryMemberColumns = getTableColumns(
  eventHighScoreEntryMember,
);
export const eventPointEntryColumns = getTableColumns(eventPointEntry);
export const eventTournamentColumns = getTableColumns(eventTournament);
export const eventTournamentParticipantColumns = getTableColumns(
  eventTournamentParticipant,
);
export const eventDiscretionaryAwardColumns = getTableColumns(
  eventDiscretionaryAward,
);
export const eventTournamentRoundMatchColumns = getTableColumns(
  eventTournamentRoundMatch,
);
export const eventTournamentParticipantMemberColumns = getTableColumns(
  eventTournamentParticipantMember,
);
export const eventPointEntryParticipantColumns = getTableColumns(
  eventPointEntryParticipant,
);
