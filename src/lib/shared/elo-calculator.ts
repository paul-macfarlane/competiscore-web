import { ELO_CONSTANTS } from "./constants";

export function getKFactor(matchesPlayed: number): number {
  return matchesPlayed < ELO_CONSTANTS.PROVISIONAL_MATCH_THRESHOLD
    ? ELO_CONSTANTS.PROVISIONAL_K_FACTOR
    : ELO_CONSTANTS.STANDARD_K_FACTOR;
}

export function calculateExpectedScore(
  ratingA: number,
  ratingB: number,
): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export interface H2HEloChangeResult {
  ratingChange: number;
  expectedScore: number;
  actualScore: number;
  opponentRating: number;
  kFactor: number;
}

export function calculateH2HEloChange(
  playerRating: number,
  playerMatchesPlayed: number,
  opponentRating: number,
  actualScore: number,
): H2HEloChangeResult {
  const kFactor = getKFactor(playerMatchesPlayed);
  const expectedScore = calculateExpectedScore(playerRating, opponentRating);
  const ratingChange = kFactor * (actualScore - expectedScore);

  return {
    ratingChange,
    expectedScore,
    actualScore,
    opponentRating,
    kFactor,
  };
}

export interface FFAParticipant {
  rating: number;
  matchesPlayed: number;
  rank: number;
}

export interface FFAEloChangeResult {
  ratingChange: number;
  expectedScore: number;
  actualScore: number;
  opponentRatingAvg: number;
  kFactor: number;
}

export function calculateFFAEloChanges(
  participants: FFAParticipant[],
): FFAEloChangeResult[] {
  const sortedParticipants = [...participants].sort((a, b) => a.rank - b.rank);

  return sortedParticipants.map((participant) => {
    let totalChange = 0;
    let totalExpected = 0;
    let totalActual = 0;
    let opponentCount = 0;
    let opponentRatingSum = 0;

    sortedParticipants.forEach((opponent) => {
      if (opponent === participant) return;

      opponentRatingSum += opponent.rating;
      opponentCount++;

      const expectedScore = calculateExpectedScore(
        participant.rating,
        opponent.rating,
      );

      let actualScore: number;
      if (participant.rank < opponent.rank) {
        actualScore = 1.0;
      } else if (participant.rank > opponent.rank) {
        actualScore = 0.0;
      } else {
        actualScore = 0.5;
      }

      const kFactor = getKFactor(participant.matchesPlayed);
      const change = kFactor * (actualScore - expectedScore);

      totalChange += change;
      totalExpected += expectedScore;
      totalActual += actualScore;
    });

    const averageChange = opponentCount > 0 ? totalChange / opponentCount : 0;
    const averageExpected =
      opponentCount > 0 ? totalExpected / opponentCount : 0;
    const averageActual = opponentCount > 0 ? totalActual / opponentCount : 0;
    const averageOpponentRating =
      opponentCount > 0 ? opponentRatingSum / opponentCount : 0;

    return {
      ratingChange: averageChange,
      expectedScore: averageExpected,
      actualScore: averageActual,
      opponentRatingAvg: averageOpponentRating,
      kFactor: getKFactor(participant.matchesPlayed),
    };
  });
}
