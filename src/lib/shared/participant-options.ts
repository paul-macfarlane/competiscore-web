import { LeagueMemberWithUser } from "@/db/league-members";
import { PlaceholderMember, Team } from "@/db/schema";
import { MatchParticipantType } from "@/lib/shared/constants";
import { isSuspended } from "@/services/shared";

export type ParticipantOption = {
  id: string;
  type: MatchParticipantType;
  name: string;
  image?: string | null;
  username?: string;
  isSuspended?: boolean;
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
