export interface SwissParticipantStanding {
  participantId: string;
  name: string;
  points: number;
  buchholz: number;
  byeReceived: boolean;
  opponentIds: string[];
  wins: number;
  draws: number;
  losses: number;
}

export interface SwissRoundResult {
  pairings: Array<{ participant1Id: string; participant2Id: string }>;
  byeParticipantId: string | null;
}

export interface SwissMatchRecord {
  participant1Id: string | null;
  participant2Id: string | null;
  winnerId: string | null;
  isDraw: boolean;
  isBye: boolean;
  isForfeit: boolean;
}

export function computeSwissStandings(
  participants: Array<{ id: string; name: string }>,
  completedMatches: SwissMatchRecord[],
): Map<string, SwissParticipantStanding> {
  const standings = new Map<string, SwissParticipantStanding>();

  for (const p of participants) {
    standings.set(p.id, {
      participantId: p.id,
      name: p.name,
      points: 0,
      buchholz: 0,
      byeReceived: false,
      opponentIds: [],
      wins: 0,
      draws: 0,
      losses: 0,
    });
  }

  for (const match of completedMatches) {
    if (match.isBye) {
      const byeParticipantId = match.participant1Id ?? match.participant2Id;
      if (byeParticipantId) {
        const s = standings.get(byeParticipantId);
        if (s) {
          s.points += 1;
          s.wins += 1;
          s.byeReceived = true;
        }
      }
      continue;
    }

    if (!match.participant1Id || !match.participant2Id) continue;

    const s1 = standings.get(match.participant1Id);
    const s2 = standings.get(match.participant2Id);
    if (!s1 || !s2) continue;

    s1.opponentIds.push(match.participant2Id);
    s2.opponentIds.push(match.participant1Id);

    if (match.isDraw) {
      s1.points += 0.5;
      s2.points += 0.5;
      s1.draws += 1;
      s2.draws += 1;
    } else if (match.isForfeit) {
      // Forfeit: winner gets point, loser gets nothing
      // winnerId is the non-forfeiting participant
      if (match.winnerId === match.participant1Id) {
        s1.points += 1;
        s1.wins += 1;
        s2.losses += 1;
      } else if (match.winnerId === match.participant2Id) {
        s2.points += 1;
        s2.wins += 1;
        s1.losses += 1;
      }
    } else if (match.winnerId) {
      if (match.winnerId === match.participant1Id) {
        s1.points += 1;
        s1.wins += 1;
        s2.losses += 1;
      } else {
        s2.points += 1;
        s2.wins += 1;
        s1.losses += 1;
      }
    }
  }

  // Compute Buchholz (sum of opponents' points)
  for (const s of standings.values()) {
    s.buchholz = s.opponentIds.reduce((sum, oppId) => {
      const opp = standings.get(oppId);
      return sum + (opp ? opp.points : 0);
    }, 0);
  }

  return standings;
}

export function generateSwissRound1(
  participants: Array<{ id: string; name: string }>,
): SwissRoundResult {
  const sorted = [...participants].sort((a, b) => a.name.localeCompare(b.name));

  const pairings: SwissRoundResult["pairings"] = [];
  let byeParticipantId: string | null = null;

  const toPair = [...sorted];

  // Odd number: last alphabetically gets bye
  if (toPair.length % 2 !== 0) {
    byeParticipantId = toPair[toPair.length - 1].id;
    toPair.pop();
  }

  for (let i = 0; i < toPair.length; i += 2) {
    pairings.push({
      participant1Id: toPair[i].id,
      participant2Id: toPair[i + 1].id,
    });
  }

  return { pairings, byeParticipantId };
}

function sortByStandings(
  standings: Map<string, SwissParticipantStanding>,
): SwissParticipantStanding[] {
  return [...standings.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
    return a.name.localeCompare(b.name);
  });
}

export function generateSwissNextRound(
  standings: Map<string, SwissParticipantStanding>,
): SwissRoundResult {
  const sorted = sortByStandings(standings);
  const pairings: SwissRoundResult["pairings"] = [];
  let byeParticipantId: string | null = null;

  const available = [...sorted];

  // Odd number: give bye to lowest-ranked who hasn't had one
  if (available.length % 2 !== 0) {
    for (let i = available.length - 1; i >= 0; i--) {
      if (!available[i].byeReceived) {
        byeParticipantId = available[i].participantId;
        available.splice(i, 1);
        break;
      }
    }
    // If everyone has had a bye, give it to the lowest-ranked
    if (byeParticipantId === null && available.length % 2 !== 0) {
      byeParticipantId = available[available.length - 1].participantId;
      available.pop();
    }
  }

  const paired = new Set<string>();

  for (let i = 0; i < available.length; i++) {
    if (paired.has(available[i].participantId)) continue;

    // Find the best opponent (next in order, not already paired, not a rematch)
    let opponentIdx = -1;
    for (let j = i + 1; j < available.length; j++) {
      if (paired.has(available[j].participantId)) continue;
      if (!available[i].opponentIds.includes(available[j].participantId)) {
        opponentIdx = j;
        break;
      }
    }

    // If no non-rematch available, allow rematch with closest rank
    if (opponentIdx === -1) {
      for (let j = i + 1; j < available.length; j++) {
        if (paired.has(available[j].participantId)) continue;
        opponentIdx = j;
        break;
      }
    }

    if (opponentIdx !== -1) {
      pairings.push({
        participant1Id: available[i].participantId,
        participant2Id: available[opponentIdx].participantId,
      });
      paired.add(available[i].participantId);
      paired.add(available[opponentIdx].participantId);
    }
  }

  return { pairings, byeParticipantId };
}

export function getSwissRanking(
  standings: Map<string, SwissParticipantStanding>,
): SwissParticipantStanding[] {
  return sortByStandings(standings);
}
