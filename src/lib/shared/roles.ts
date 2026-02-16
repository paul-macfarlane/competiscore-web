import {
  EventParticipantRole,
  LeagueMemberRole,
  TeamMemberRole,
} from "./constants";

export const ROLE_HIERARCHY: Record<LeagueMemberRole, number> = {
  [LeagueMemberRole.MEMBER]: 1,
  [LeagueMemberRole.MANAGER]: 2,
  [LeagueMemberRole.EXECUTIVE]: 3,
};

export const ROLE_LABELS: Record<LeagueMemberRole, string> = {
  [LeagueMemberRole.MEMBER]: "Member",
  [LeagueMemberRole.MANAGER]: "Manager",
  [LeagueMemberRole.EXECUTIVE]: "Executive",
};

export const ROLE_BADGE_VARIANTS: Record<
  LeagueMemberRole,
  "secondary" | "default" | "outline"
> = {
  [LeagueMemberRole.MEMBER]: "secondary",
  [LeagueMemberRole.MANAGER]: "secondary",
  [LeagueMemberRole.EXECUTIVE]: "secondary",
};

export const TEAM_ROLE_LABELS: Record<TeamMemberRole, string> = {
  [TeamMemberRole.MEMBER]: "Member",
  [TeamMemberRole.MANAGER]: "Manager",
};

export const ALL_ROLES: LeagueMemberRole[] = [
  LeagueMemberRole.MEMBER,
  LeagueMemberRole.MANAGER,
  LeagueMemberRole.EXECUTIVE,
];

export function canActOnRole(
  actorRole: LeagueMemberRole,
  targetRole: LeagueMemberRole,
): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
}

export function getAssignableRoles(
  actorRole: LeagueMemberRole,
): LeagueMemberRole[] {
  return ALL_ROLES.filter(
    (role) => ROLE_HIERARCHY[role] <= ROLE_HIERARCHY[actorRole],
  );
}

export const EVENT_ROLE_LABELS: Record<EventParticipantRole, string> = {
  [EventParticipantRole.ORGANIZER]: "Organizer",
  [EventParticipantRole.PARTICIPANT]: "Participant",
};

export const EVENT_ROLE_HIERARCHY: Record<EventParticipantRole, number> = {
  [EventParticipantRole.PARTICIPANT]: 1,
  [EventParticipantRole.ORGANIZER]: 2,
};

export function canActOnEventRole(
  actorRole: EventParticipantRole,
  targetRole: EventParticipantRole,
): boolean {
  return EVENT_ROLE_HIERARCHY[actorRole] > EVENT_ROLE_HIERARCHY[targetRole];
}
