import {
  EventParticipantRole,
  LeagueMemberRole,
  TeamMemberRole,
} from "./constants";

export const LeagueAction = {
  VIEW_MEMBERS: "view_members",
  PLAY_GAMES: "play_games",
  RECORD_MATCHES_FOR_OTHERS: "record_matches_for_others",
  CREATE_GAME_TYPES: "create_game_types",
  CREATE_TOURNAMENTS: "create_tournaments",
  INVITE_MEMBERS: "invite_members",
  CREATE_PLACEHOLDERS: "create_placeholders",
  REMOVE_MEMBERS: "remove_members",
  MANAGE_ROLES: "manage_roles",
  EDIT_SETTINGS: "edit_settings",
  ARCHIVE_LEAGUE: "archive_league",
  UNARCHIVE_LEAGUE: "unarchive_league",
  DELETE_LEAGUE: "delete_league",
  TRANSFER_EXECUTIVE: "transfer_executive",
  REPORT_MEMBER: "report_member",
  VIEW_REPORTS: "view_reports",
  MODERATE_MEMBERS: "moderate_members",
  CREATE_TEAMS: "create_teams",
  MANAGE_TEAMS: "manage_teams",
} as const;

export type LeagueAction = (typeof LeagueAction)[keyof typeof LeagueAction];

const LEAGUE_PERMISSIONS: Record<LeagueMemberRole, Set<LeagueAction>> = {
  [LeagueMemberRole.MEMBER]: new Set([
    LeagueAction.VIEW_MEMBERS,
    LeagueAction.PLAY_GAMES,
    LeagueAction.REPORT_MEMBER,
    LeagueAction.CREATE_TEAMS,
  ]),
  [LeagueMemberRole.MANAGER]: new Set([
    LeagueAction.VIEW_MEMBERS,
    LeagueAction.PLAY_GAMES,
    LeagueAction.RECORD_MATCHES_FOR_OTHERS,
    LeagueAction.CREATE_GAME_TYPES,
    LeagueAction.CREATE_TOURNAMENTS,

    LeagueAction.INVITE_MEMBERS,
    LeagueAction.CREATE_PLACEHOLDERS,
    LeagueAction.REMOVE_MEMBERS,
    LeagueAction.REPORT_MEMBER,
    LeagueAction.VIEW_REPORTS,
    LeagueAction.MODERATE_MEMBERS,
    LeagueAction.CREATE_TEAMS,
    LeagueAction.MANAGE_TEAMS,
  ]),
  [LeagueMemberRole.EXECUTIVE]: new Set([
    LeagueAction.VIEW_MEMBERS,
    LeagueAction.PLAY_GAMES,
    LeagueAction.RECORD_MATCHES_FOR_OTHERS,
    LeagueAction.CREATE_GAME_TYPES,
    LeagueAction.CREATE_TOURNAMENTS,

    LeagueAction.INVITE_MEMBERS,
    LeagueAction.CREATE_PLACEHOLDERS,
    LeagueAction.REMOVE_MEMBERS,
    LeagueAction.MANAGE_ROLES,
    LeagueAction.EDIT_SETTINGS,
    LeagueAction.ARCHIVE_LEAGUE,
    LeagueAction.UNARCHIVE_LEAGUE,
    LeagueAction.DELETE_LEAGUE,
    LeagueAction.TRANSFER_EXECUTIVE,
    LeagueAction.REPORT_MEMBER,
    LeagueAction.VIEW_REPORTS,
    LeagueAction.MODERATE_MEMBERS,
    LeagueAction.CREATE_TEAMS,
    LeagueAction.MANAGE_TEAMS,
  ]),
};

export function canPerformAction(
  role: LeagueMemberRole,
  action: LeagueAction,
): boolean {
  return LEAGUE_PERMISSIONS[role]?.has(action) ?? false;
}

export function getPermittedActions(role: LeagueMemberRole): LeagueAction[] {
  return Array.from(LEAGUE_PERMISSIONS[role] ?? []);
}

export const LeaguePage = {
  DASHBOARD: "dashboard",
  SETTINGS: "settings",
  MEMBERS: "members",
  GAMES: "games",
  TOURNAMENTS: "tournaments",
  MODERATION: "moderation",
  TEAMS: "teams",
} as const;

export type LeaguePage = (typeof LeaguePage)[keyof typeof LeaguePage];

const PAGE_PERMISSIONS: Record<LeaguePage, Set<LeagueMemberRole>> = {
  [LeaguePage.DASHBOARD]: new Set([
    LeagueMemberRole.MEMBER,
    LeagueMemberRole.MANAGER,
    LeagueMemberRole.EXECUTIVE,
  ]),
  [LeaguePage.MEMBERS]: new Set([
    LeagueMemberRole.MEMBER,
    LeagueMemberRole.MANAGER,
    LeagueMemberRole.EXECUTIVE,
  ]),
  [LeaguePage.GAMES]: new Set([
    LeagueMemberRole.MEMBER,
    LeagueMemberRole.MANAGER,
    LeagueMemberRole.EXECUTIVE,
  ]),
  [LeaguePage.TOURNAMENTS]: new Set([
    LeagueMemberRole.MEMBER,
    LeagueMemberRole.MANAGER,
    LeagueMemberRole.EXECUTIVE,
  ]),
  [LeaguePage.SETTINGS]: new Set([LeagueMemberRole.EXECUTIVE]),
  [LeaguePage.MODERATION]: new Set([
    LeagueMemberRole.MEMBER,
    LeagueMemberRole.MANAGER,
    LeagueMemberRole.EXECUTIVE,
  ]),
  [LeaguePage.TEAMS]: new Set([
    LeagueMemberRole.MEMBER,
    LeagueMemberRole.MANAGER,
    LeagueMemberRole.EXECUTIVE,
  ]),
};

export function canAccessPage(
  role: LeagueMemberRole,
  page: LeaguePage,
): boolean {
  return PAGE_PERMISSIONS[page]?.has(role) ?? false;
}

// Team-level permissions
export const TeamAction = {
  VIEW_TEAM: "view_team",
  LEAVE_TEAM: "leave_team",
  EDIT_TEAM: "edit_team",
  ADD_MEMBERS: "add_members",
  REMOVE_MEMBERS: "remove_members",
  MANAGE_ROLES: "manage_roles",
  ARCHIVE_TEAM: "archive_team",
  UNARCHIVE_TEAM: "unarchive_team",
  DELETE_TEAM: "delete_team",
} as const;

export type TeamAction = (typeof TeamAction)[keyof typeof TeamAction];

const TEAM_PERMISSIONS: Record<TeamMemberRole, Set<TeamAction>> = {
  [TeamMemberRole.MEMBER]: new Set([
    TeamAction.VIEW_TEAM,
    TeamAction.LEAVE_TEAM,
  ]),
  [TeamMemberRole.MANAGER]: new Set([
    TeamAction.VIEW_TEAM,
    TeamAction.LEAVE_TEAM,
    TeamAction.EDIT_TEAM,
    TeamAction.ADD_MEMBERS,
    TeamAction.REMOVE_MEMBERS,
    TeamAction.MANAGE_ROLES,
    TeamAction.ARCHIVE_TEAM,
    TeamAction.UNARCHIVE_TEAM,
    TeamAction.DELETE_TEAM,
  ]),
};

export function canPerformTeamAction(
  role: TeamMemberRole,
  action: TeamAction,
): boolean {
  return TEAM_PERMISSIONS[role]?.has(action) ?? false;
}

// Event-level permissions
export const EventAction = {
  VIEW_EVENT: "view_event",
  MANAGE_EVENT: "manage_event",
  MANAGE_TEAMS: "manage_teams",
  MANAGE_GAME_TYPES: "manage_game_types",
  RECORD_MATCHES: "record_matches",
  RECORD_MATCHES_FOR_OTHERS: "record_matches_for_others",
  SUBMIT_SCORES: "submit_scores",
  MANAGE_SESSIONS: "manage_sessions",
  INVITE_PARTICIPANTS: "invite_participants",
  MANAGE_PARTICIPANTS: "manage_participants",
  CREATE_TOURNAMENTS: "create_tournaments",
  PROMOTE_TO_ORGANIZER: "promote_to_organizer",
  MANAGE_PLACEHOLDERS: "manage_placeholders",
} as const;

export type EventAction = (typeof EventAction)[keyof typeof EventAction];

const EVENT_PERMISSIONS: Record<EventParticipantRole, Set<EventAction>> = {
  [EventParticipantRole.PARTICIPANT]: new Set([
    EventAction.VIEW_EVENT,
    EventAction.RECORD_MATCHES,
    EventAction.SUBMIT_SCORES,
  ]),
  [EventParticipantRole.ORGANIZER]: new Set([
    EventAction.VIEW_EVENT,
    EventAction.MANAGE_EVENT,
    EventAction.MANAGE_TEAMS,
    EventAction.MANAGE_GAME_TYPES,
    EventAction.RECORD_MATCHES,
    EventAction.RECORD_MATCHES_FOR_OTHERS,
    EventAction.SUBMIT_SCORES,
    EventAction.MANAGE_SESSIONS,
    EventAction.INVITE_PARTICIPANTS,
    EventAction.MANAGE_PARTICIPANTS,
    EventAction.CREATE_TOURNAMENTS,
    EventAction.PROMOTE_TO_ORGANIZER,
    EventAction.MANAGE_PLACEHOLDERS,
  ]),
};

export function canPerformEventAction(
  role: EventParticipantRole,
  action: EventAction,
): boolean {
  return EVENT_PERMISSIONS[role]?.has(action) ?? false;
}
