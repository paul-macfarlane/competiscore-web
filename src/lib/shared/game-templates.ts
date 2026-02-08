import {
  GameCategory,
  ICON_PATHS,
  ParticipantType,
  ScoreOrder,
  ScoringType,
} from "./constants";

export type H2HConfig = {
  scoringType: ScoringType;
  scoreDescription?: string;
  drawsAllowed: boolean;
  minPlayersPerSide: number;
  maxPlayersPerSide: number;
  rules?: string;
};

export type FFAConfig = {
  scoringType: ScoringType;
  scoreOrder: ScoreOrder;
  minPlayers: number;
  maxPlayers: number;
  rules?: string;
};

export type HighScoreConfig = {
  scoreOrder: ScoreOrder;
  scoreDescription: string;
  participantType: ParticipantType;
  rules?: string;
};

export type GameConfig = H2HConfig | FFAConfig | HighScoreConfig;

export type GameTemplate = {
  name: string;
  description: string;
  category: GameCategory;
  logo: string;
  config: GameConfig;
};

export const GAME_TEMPLATES: Record<string, GameTemplate> = {
  "ping-pong": {
    name: "Ping Pong",
    description: "Classic table tennis matches",
    category: GameCategory.HEAD_TO_HEAD,
    logo: `${ICON_PATHS.GAME_TYPE_ICONS}/ping-pong.svg`,
    config: {
      scoringType: ScoringType.SCORE_BASED,
      scoreDescription: "Points",
      drawsAllowed: false,
      minPlayersPerSide: 1,
      maxPlayersPerSide: 2,
    } as H2HConfig,
  },
  "8-ball-pool": {
    name: "8-Ball Pool",
    description: "Standard 8-ball billiards",
    category: GameCategory.HEAD_TO_HEAD,
    logo: `${ICON_PATHS.GAME_TYPE_ICONS}/pool.svg`,
    config: {
      scoringType: ScoringType.WIN_LOSS,
      drawsAllowed: false,
      minPlayersPerSide: 1,
      maxPlayersPerSide: 1,
    } as H2HConfig,
  },
  "9-ball-pool": {
    name: "9-Ball Pool",
    description: "Fast-paced 9-ball billiards",
    category: GameCategory.HEAD_TO_HEAD,
    logo: `${ICON_PATHS.GAME_TYPE_ICONS}/pool.svg`,
    config: {
      scoringType: ScoringType.WIN_LOSS,
      drawsAllowed: false,
      minPlayersPerSide: 1,
      maxPlayersPerSide: 1,
    } as H2HConfig,
  },
  foosball: {
    name: "Foosball",
    description: "Table soccer matches",
    category: GameCategory.HEAD_TO_HEAD,
    logo: `${ICON_PATHS.GAME_TYPE_ICONS}/foosball.svg`,
    config: {
      scoringType: "score_based",
      scoreDescription: "Goals",
      drawsAllowed: false,
      minPlayersPerSide: 1,
      maxPlayersPerSide: 2,
    } as H2HConfig,
  },
  chess: {
    name: "Chess",
    description: "Classic chess matches",
    category: GameCategory.HEAD_TO_HEAD,
    logo: `${ICON_PATHS.GAME_TYPE_ICONS}/chess.svg`,
    config: {
      scoringType: "win_loss",
      drawsAllowed: true,
      minPlayersPerSide: 1,
      maxPlayersPerSide: 1,
    } as H2HConfig,
  },
  "beer-pong": {
    name: "Beer Pong",
    description: "Party game classic",
    category: GameCategory.HEAD_TO_HEAD,
    logo: `${ICON_PATHS.GAME_TYPE_ICONS}/ping-pong.svg`,
    config: {
      scoringType: "win_loss",
      drawsAllowed: false,
      minPlayersPerSide: 1,
      maxPlayersPerSide: 2,
    } as H2HConfig,
  },
  darts: {
    name: "Darts",
    description: "Traditional dart games",
    category: GameCategory.HEAD_TO_HEAD,
    logo: `${ICON_PATHS.GAME_TYPE_ICONS}/darts.svg`,
    config: {
      scoringType: "score_based",
      scoreDescription: "Points",
      drawsAllowed: false,
      minPlayersPerSide: 1,
      maxPlayersPerSide: 1,
    } as H2HConfig,
  },
  "mario-kart": {
    name: "Mario Kart",
    description: "Racing game competition",
    category: GameCategory.FREE_FOR_ALL,
    logo: `${ICON_PATHS.GAME_TYPE_ICONS}/racing.svg`,
    config: {
      scoringType: ScoringType.RANKED_FINISH,
      scoreOrder: ScoreOrder.HIGHEST_WINS,
      minPlayers: 2,
      maxPlayers: 8,
    } as FFAConfig,
  },
  poker: {
    name: "Poker",
    description: "Texas Hold'em or other variants",
    category: GameCategory.FREE_FOR_ALL,
    logo: `${ICON_PATHS.GAME_TYPE_ICONS}/poker.svg`,
    config: {
      scoringType: ScoringType.RANKED_FINISH,
      scoreOrder: ScoreOrder.HIGHEST_WINS,
      minPlayers: 2,
      maxPlayers: 10,
    } as FFAConfig,
  },
  bowling: {
    name: "Bowling",
    description: "Ten-pin bowling",
    category: GameCategory.FREE_FOR_ALL,
    logo: `${ICON_PATHS.GAME_TYPE_ICONS}/bowling.svg`,
    config: {
      scoringType: ScoringType.SCORE_BASED,
      scoreOrder: ScoreOrder.HIGHEST_WINS,
      minPlayers: 2,
      maxPlayers: 8,
    } as FFAConfig,
  },
  golf: {
    name: "Golf",
    description: "18-hole golf rounds",
    category: GameCategory.FREE_FOR_ALL,
    logo: `${ICON_PATHS.GAME_TYPE_ICONS}/golf.svg`,
    config: {
      scoringType: ScoringType.SCORE_BASED,
      scoreOrder: ScoreOrder.LOWEST_WINS,
      minPlayers: 2,
      maxPlayers: 4,
    } as FFAConfig,
  },
  pacman: {
    name: "Pac-Man",
    description: "Classic arcade high score",
    category: GameCategory.HIGH_SCORE,
    logo: `${ICON_PATHS.GAME_TYPE_ICONS}/video-game.svg`,
    config: {
      scoreOrder: ScoreOrder.HIGHEST_WINS,
      scoreDescription: "Points",
      participantType: ParticipantType.INDIVIDUAL,
    } as HighScoreConfig,
  },
  "arcade-game": {
    name: "Arcade Game",
    description: "Generic arcade game high scores",
    category: GameCategory.HIGH_SCORE,
    logo: `${ICON_PATHS.GAME_TYPE_ICONS}/video-game.svg`,
    config: {
      scoreOrder: ScoreOrder.HIGHEST_WINS,
      scoreDescription: "Points",
      participantType: ParticipantType.INDIVIDUAL,
    } as HighScoreConfig,
  },
  "fastest-mile": {
    name: "Fastest Mile",
    description: "Best mile run time",
    category: GameCategory.HIGH_SCORE,
    logo: `${ICON_PATHS.GAME_TYPE_ICONS}/racing.svg`,
    config: {
      scoreOrder: ScoreOrder.LOWEST_WINS,
      scoreDescription: "Minutes",
      participantType: ParticipantType.INDIVIDUAL,
    } as HighScoreConfig,
  },
  pushups: {
    name: "Push-ups",
    description: "Most push-ups in 1 minute",
    category: GameCategory.HIGH_SCORE,
    logo: `${ICON_PATHS.GAME_TYPE_ICONS}/boxing.svg`,
    config: {
      scoreOrder: "highest_wins",
      scoreDescription: "Reps",
      participantType: "individual",
    } as HighScoreConfig,
  },
};
