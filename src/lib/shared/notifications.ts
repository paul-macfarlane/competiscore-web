import {
  EventParticipantRole,
  LeagueMemberRole,
  ModerationActionType,
  TeamMemberRole,
} from "./constants";

export const NotificationType = {
  LEAGUE_INVITATION: "league_invitation",
  TEAM_INVITATION: "team_invitation",
  EVENT_INVITATION: "event_invitation",
  MODERATION_ACTION: "moderation_action",
  CHALLENGE: "challenge",
  // Future: MATCH_RESULT: "match_result",
} as const;

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationAction = {
  ACCEPT: "accept",
  DECLINE: "decline",
  DISMISS: "dismiss",
} as const;

export type NotificationAction =
  (typeof NotificationAction)[keyof typeof NotificationAction];

interface BaseNotification {
  id: string;
  createdAt: Date;
}

export type LeagueInvitationNotification = BaseNotification & {
  type: typeof NotificationType.LEAGUE_INVITATION;
  data: {
    invitationId: string;
    leagueId: string;
    leagueName: string;
    leagueLogo: string | null;
    role: LeagueMemberRole;
    inviterName: string;
  };
};

export type TeamInvitationNotification = BaseNotification & {
  type: typeof NotificationType.TEAM_INVITATION;
  data: {
    invitationId: string;
    teamId: string;
    teamName: string;
    teamLogo: string | null;
    leagueId: string;
    leagueName: string;
    role: TeamMemberRole;
    inviterName: string;
  };
};

export type ModerationActionNotification = BaseNotification & {
  type: typeof NotificationType.MODERATION_ACTION;
  data: {
    actionId: string;
    leagueId: string;
    leagueName: string;
    leagueLogo: string | null;
    actionType: ModerationActionType;
    reason: string;
    suspendedUntil: Date | null;
  };
};

export type ChallengeNotification = BaseNotification & {
  type: typeof NotificationType.CHALLENGE;
  data: {
    matchId: string;
    leagueId: string;
    leagueName: string;
    challengerName: string;
    gameTypeName: string;
    challengedAt: Date;
  };
};

export type EventInvitationNotification = BaseNotification & {
  type: typeof NotificationType.EVENT_INVITATION;
  data: {
    invitationId: string;
    eventId: string;
    eventName: string;
    eventLogo: string | null;
    role: EventParticipantRole;
    inviterName: string;
  };
};

export type Notification =
  | LeagueInvitationNotification
  | TeamInvitationNotification
  | EventInvitationNotification
  | ModerationActionNotification
  | ChallengeNotification;
// Future: | MatchResultNotification
