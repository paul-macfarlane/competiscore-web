import {
  FFAConfig,
  H2HConfig,
  HighScoreConfig,
} from "@/lib/shared/game-templates";
import {
  ffaConfigSchema,
  h2hConfigSchema,
  highScoreConfigSchema,
} from "@/validators/game-configs";

import { GameCategory, ParticipantType } from "./constants";

export function parseH2HConfig(configString: string): H2HConfig {
  try {
    const parsed = JSON.parse(configString);
    const result = h2hConfigSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }

    console.error("Failed to parse H2H config:", result.error);
    console.error("Config string:", configString);

    return {
      scoringType: "win_loss" as const,
      drawsAllowed: false,
      participantType: "individual" as const,
      minPlayersPerSide: 1,
      maxPlayersPerSide: 1,
    };
  } catch (error) {
    console.error("Failed to JSON.parse H2H config:", error);
    return {
      scoringType: "win_loss" as const,
      drawsAllowed: false,
      participantType: "individual" as const,
      minPlayersPerSide: 1,
      maxPlayersPerSide: 1,
    };
  }
}

export function parseFFAConfig(configString: string): FFAConfig {
  try {
    const parsed = JSON.parse(configString);
    const result = ffaConfigSchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }

    console.error("Failed to parse FFA config:", result.error);
    console.error("Config string:", configString);

    return {
      scoringType: "ranked_finish" as const,
      scoreOrder: "highest_wins" as const,
      participantType: "individual" as const,
      minPlayers: 2,
      maxPlayers: 10,
    };
  } catch (error) {
    console.error("Failed to JSON.parse FFA config:", error);
    return {
      scoringType: "ranked_finish" as const,
      scoreOrder: "highest_wins" as const,
      participantType: "individual" as const,
      minPlayers: 2,
      maxPlayers: 10,
    };
  }
}

export function parseHighScoreConfig(configString: string): HighScoreConfig {
  try {
    const parsed = JSON.parse(configString);
    const result = highScoreConfigSchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }

    console.error("Failed to parse HighScore config:", result.error);
    console.error("Config string:", configString);

    return {
      scoreOrder: "highest_wins" as const,
      scoreDescription: "Points",
      participantType: "individual" as const,
    };
  } catch (error) {
    console.error("Failed to JSON.parse HighScore config:", error);
    return {
      scoreOrder: "highest_wins" as const,
      scoreDescription: "Points",
      participantType: "individual" as const,
    };
  }
}

export function isPartnershipGameType(config: H2HConfig): boolean {
  return (
    config.participantType === ParticipantType.INDIVIDUAL &&
    config.maxPlayersPerSide > 1
  );
}

export function getPartnershipSize(config: H2HConfig): number {
  return config.maxPlayersPerSide;
}

export function getScoreDescription(
  configString: string,
  category: string,
): string | undefined {
  const config = parseGameConfig(configString, category as GameCategory);
  if ("scoreDescription" in config) {
    return config.scoreDescription;
  }
  return undefined;
}

export function parseGameConfig(
  configString: string,
  category: GameCategory,
): H2HConfig | FFAConfig | HighScoreConfig {
  switch (category) {
    case GameCategory.HEAD_TO_HEAD:
      return parseH2HConfig(configString);
    case GameCategory.FREE_FOR_ALL:
      return parseFFAConfig(configString);
    case GameCategory.HIGH_SCORE:
      return parseHighScoreConfig(configString);
    default:
      throw new Error(`Unknown game category: ${category}`);
  }
}
