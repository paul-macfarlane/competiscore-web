export interface BracketSlot {
  round: number;
  position: number;
  seed1: number | null;
  seed2: number | null;
  isBye: boolean;
  nextPosition: { round: number; position: number; slot: 1 | 2 } | null;
}

function nextPowerOf2(n: number): number {
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}

/**
 * Generates standard tournament seeding order for a bracket of given size.
 * For an 8-person bracket: [1,8,4,5,2,7,3,6]
 * This ensures 1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6 in round 1.
 */
function generateSeedOrder(bracketSize: number): number[] {
  if (bracketSize === 1) return [1];
  if (bracketSize === 2) return [1, 2];

  const result: number[] = new Array(bracketSize);
  result[0] = 1;
  result[1] = 2;

  for (let round = 1; round < Math.log2(bracketSize); round++) {
    const currentSize = Math.pow(2, round + 1);
    const half = currentSize / 2;

    const temp: number[] = [];
    for (let i = 0; i < half; i++) {
      temp.push(result[i]);
      temp.push(currentSize + 1 - result[i]);
    }
    for (let i = 0; i < currentSize; i++) {
      result[i] = temp[i];
    }
  }

  return result.slice(0, bracketSize);
}

export function generateSingleEliminationBracket(
  participantCount: number,
): BracketSlot[] {
  if (participantCount < 2) {
    throw new Error("At least 2 participants are required");
  }

  const bracketSize = nextPowerOf2(participantCount);
  const totalRounds = Math.log2(bracketSize);

  const seedOrder = generateSeedOrder(bracketSize);
  const slots: BracketSlot[] = [];

  const round1Matches = bracketSize / 2;
  for (let i = 0; i < round1Matches; i++) {
    const seed1 = seedOrder[i * 2];
    const seed2 = seedOrder[i * 2 + 1];
    const isBye = seed1 > participantCount || seed2 > participantCount;

    const position = i + 1;
    const nextRound = totalRounds > 1 ? 2 : null;
    const nextPos = nextRound ? Math.ceil(position / 2) : null;
    const nextSlot: 1 | 2 = position % 2 === 1 ? 1 : 2;

    slots.push({
      round: 1,
      position,
      seed1: seed1 <= participantCount ? seed1 : null,
      seed2: seed2 <= participantCount ? seed2 : null,
      isBye,
      nextPosition:
        nextRound && nextPos
          ? { round: nextRound, position: nextPos, slot: nextSlot }
          : null,
    });
  }

  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let i = 0; i < matchesInRound; i++) {
      const position = i + 1;
      const nextRound = round < totalRounds ? round + 1 : null;
      const nextPos = nextRound ? Math.ceil(position / 2) : null;
      const nextSlot: 1 | 2 = position % 2 === 1 ? 1 : 2;

      slots.push({
        round,
        position,
        seed1: null,
        seed2: null,
        isBye: false,
        nextPosition:
          nextRound && nextPos
            ? { round: nextRound, position: nextPos, slot: nextSlot }
            : null,
      });
    }
  }

  return slots;
}
