import { LeagueMemberRole, ModerationActionType } from "./constants";

export const NotificationType = {
  LEAGUE_INVITATION: "league_invitation",
  MODERATION_ACTION: "moderation_action",
  // Future: CHALLENGE: "challenge",
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

// Future notification types follow the same pattern:
// export type ChallengeNotification = BaseNotification & {
//   type: typeof NotificationType.CHALLENGE;
//   data: {
//     challengeId: string;
//     challengerName: string;
//     gameTypeName: string;
//     leagueName: string;
//   };
// };

export type Notification =
  | LeagueInvitationNotification
  | ModerationActionNotification;
// Future: | ChallengeNotification | MatchResultNotification
