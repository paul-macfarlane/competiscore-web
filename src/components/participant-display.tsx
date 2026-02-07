import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/shared/utils";
import { User, Users } from "lucide-react";

export type ParticipantData = {
  user?: {
    id: string;
    name: string;
    username?: string;
    image?: string | null;
  } | null;
  team?: {
    id: string;
    name: string;
    logo?: string | null;
  } | null;
  placeholderMember?: {
    id: string;
    displayName: string;
  } | null;
};

type ParticipantDisplayProps = {
  participant: ParticipantData;
  showAvatar?: boolean;
  showUsername?: boolean;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right";
  className?: string;
};

const sizeClasses = {
  sm: {
    avatar: "h-6 w-6",
    icon: "h-3 w-3",
    name: "text-sm",
    username: "text-xs",
  },
  md: {
    avatar: "h-8 w-8",
    icon: "h-4 w-4",
    name: "text-sm",
    username: "text-xs",
  },
  lg: {
    avatar: "h-10 w-10",
    icon: "h-5 w-5",
    name: "text-base",
    username: "text-sm",
  },
};

export function ParticipantDisplay({
  participant,
  showAvatar = true,
  showUsername = false,
  size = "md",
  align = "left",
  className,
}: ParticipantDisplayProps) {
  const name = getParticipantName(participant);
  const image = participant.user?.image || participant.team?.logo;
  const isTeam = !!participant.team;
  const username = participant.user?.username;
  const sizes = sizeClasses[size];

  if (!showAvatar) {
    return (
      <div
        className={cn("truncate", align === "right" && "text-right", className)}
      >
        <span className={cn("font-medium", sizes.name)}>{name}</span>
        {showUsername && username && (
          <span className={cn("text-muted-foreground ml-1", sizes.username)}>
            @{username}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        align === "right" && "flex-row-reverse",
        className,
      )}
    >
      <Avatar className={sizes.avatar}>
        {image && <AvatarImage src={image} alt={name} />}
        <AvatarFallback>
          {isTeam ? (
            <Users className={sizes.icon} />
          ) : (
            <User className={sizes.icon} />
          )}
        </AvatarFallback>
      </Avatar>
      <div className={cn("min-w-0", align === "right" && "text-right")}>
        <p className={cn("font-medium truncate", sizes.name)}>{name}</p>
        {showUsername && username && (
          <p className={cn("text-muted-foreground truncate", sizes.username)}>
            @{username}
          </p>
        )}
      </div>
    </div>
  );
}

export function getParticipantName(participant: ParticipantData): string {
  if (participant.user) return participant.user.name;
  if (participant.team) return participant.team.name;
  if (participant.placeholderMember)
    return participant.placeholderMember.displayName;
  return "Unknown";
}

type ParticipantNameProps = {
  participant: ParticipantData;
  className?: string;
};

export function ParticipantName({
  participant,
  className,
}: ParticipantNameProps) {
  return (
    <span className={cn("font-medium", className)}>
      {getParticipantName(participant)}
    </span>
  );
}
