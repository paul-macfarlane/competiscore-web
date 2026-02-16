import { EventTeamMemberForParticipant } from "@/db/events";
import { LeagueMemberWithUser } from "@/db/league-members";
import { EventTeam, PlaceholderMember, Team } from "@/db/schema";
import { MatchParticipantType } from "@/lib/shared/constants";
import { isSuspended } from "@/services/shared";

export type ParticipantOption = {
  id: string;
  type: MatchParticipantType;
  name: string;
  image?: string | null;
  username?: string;
  isSuspended?: boolean;
  teamName?: string;
  teamColor?: string | null;
};

export function buildParticipantOptions(
  members: LeagueMemberWithUser[],
  teams: Team[],
  placeholders: PlaceholderMember[],
): ParticipantOption[] {
  const options: ParticipantOption[] = [];

  for (const member of members) {
    options.push({
      id: member.userId,
      type: MatchParticipantType.USER,
      name: member.user.name,
      image: member.user.image,
      username: member.user.username,
      isSuspended: isSuspended(member),
    });
  }

  for (const team of teams) {
    if (!team.isArchived) {
      options.push({
        id: team.id,
        type: MatchParticipantType.TEAM,
        name: team.name,
        image: team.logo,
      });
    }
  }

  for (const placeholder of placeholders) {
    options.push({
      id: placeholder.id,
      type: MatchParticipantType.PLACEHOLDER,
      name: placeholder.displayName,
    });
  }

  return options;
}

export function buildEventTeamOptions(
  teams: Pick<EventTeam, "id" | "name" | "logo" | "color">[],
): ParticipantOption[] {
  return teams.map((team) => ({
    id: team.id,
    type: MatchParticipantType.TEAM,
    name: team.name,
    image: team.logo,
    teamColor: team.color,
  }));
}

export function buildEventParticipantOptions(
  teamMembers: EventTeamMemberForParticipant[],
): ParticipantOption[] {
  const options: ParticipantOption[] = [];

  for (const member of teamMembers) {
    if (member.userId && member.user) {
      options.push({
        id: member.userId,
        type: MatchParticipantType.USER,
        name: member.user.name,
        image: member.user.image,
        username: member.user.username,
        teamName: member.teamName,
        teamColor: member.teamColor,
      });
    } else if (
      member.eventPlaceholderParticipantId &&
      member.placeholderParticipant
    ) {
      options.push({
        id: member.eventPlaceholderParticipantId,
        type: MatchParticipantType.PLACEHOLDER,
        name: member.placeholderParticipant.displayName,
        teamName: member.teamName,
        teamColor: member.teamColor,
      });
    }
  }

  return options;
}
