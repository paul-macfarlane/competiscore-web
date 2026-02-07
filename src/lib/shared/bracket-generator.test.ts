import { describe, expect, it } from "vitest";

import {
  BracketSlot,
  generateSingleEliminationBracket,
} from "./bracket-generator";

function getRound1Seeds(
  slots: BracketSlot[],
): { seed1: number | null; seed2: number | null }[] {
  return slots
    .filter((s) => s.round === 1)
    .sort((a, b) => a.position - b.position)
    .map((s) => ({ seed1: s.seed1, seed2: s.seed2 }));
}

describe("generateSingleEliminationBracket", () => {
  it("throws for fewer than 2 participants", () => {
    expect(() => generateSingleEliminationBracket(1)).toThrow(
      "At least 2 participants are required",
    );
  });

  it("generates correct bracket for 2 participants", () => {
    const slots = generateSingleEliminationBracket(2);
    expect(slots).toHaveLength(1);
    expect(slots[0].round).toBe(1);
    expect(slots[0].seed1).toBe(1);
    expect(slots[0].seed2).toBe(2);
    expect(slots[0].isBye).toBe(false);
    expect(slots[0].nextPosition).toBeNull();
  });

  it("generates correct bracket for 4 participants", () => {
    const slots = generateSingleEliminationBracket(4);
    // 2 round-1 matches + 1 final = 3
    expect(slots).toHaveLength(3);

    const round1 = slots.filter((s) => s.round === 1);
    const round2 = slots.filter((s) => s.round === 2);
    expect(round1).toHaveLength(2);
    expect(round2).toHaveLength(1);

    // No byes
    expect(round1.every((s) => !s.isBye)).toBe(true);

    // Final has no next
    expect(round2[0].nextPosition).toBeNull();

    // Round 1 matches advance to round 2
    expect(round1[0].nextPosition).toEqual({
      round: 2,
      position: 1,
      slot: 1,
    });
    expect(round1[1].nextPosition).toEqual({
      round: 2,
      position: 1,
      slot: 2,
    });
  });

  it("generates correct bracket for 3 participants (1 bye)", () => {
    const slots = generateSingleEliminationBracket(3);
    // bracket size = 4: 2 round-1 + 1 final = 3
    expect(slots).toHaveLength(3);

    const round1 = slots.filter((s) => s.round === 1);
    const byes = round1.filter((s) => s.isBye);
    expect(byes).toHaveLength(1);

    // Seed 1 gets the bye (paired with null)
    const byeMatch = byes[0];
    expect(byeMatch.seed1).toBe(1);
    expect(byeMatch.seed2).toBeNull();
  });

  it("generates correct bracket for 5 participants (3 byes)", () => {
    const slots = generateSingleEliminationBracket(5);
    // bracket size = 8: 4 round-1 + 2 round-2 + 1 final = 7
    expect(slots).toHaveLength(7);

    const round1 = slots.filter((s) => s.round === 1);
    const byes = round1.filter((s) => s.isBye);
    expect(byes).toHaveLength(3);
  });

  it("generates correct bracket for 6 participants (2 byes)", () => {
    const slots = generateSingleEliminationBracket(6);
    // bracket size = 8: 4 + 2 + 1 = 7
    expect(slots).toHaveLength(7);

    const round1 = slots.filter((s) => s.round === 1);
    const byes = round1.filter((s) => s.isBye);
    expect(byes).toHaveLength(2);
  });

  it("generates correct bracket for 8 participants (no byes)", () => {
    const slots = generateSingleEliminationBracket(8);
    // 4 + 2 + 1 = 7
    expect(slots).toHaveLength(7);

    const round1 = slots.filter((s) => s.round === 1);
    expect(round1.every((s) => !s.isBye)).toBe(true);
  });

  it("generates correct bracket for 16 participants", () => {
    const slots = generateSingleEliminationBracket(16);
    // 8 + 4 + 2 + 1 = 15
    expect(slots).toHaveLength(15);

    const round1 = slots.filter((s) => s.round === 1);
    expect(round1).toHaveLength(8);
    expect(round1.every((s) => !s.isBye)).toBe(true);
  });

  it("has correct seeding for 8 participants", () => {
    const slots = generateSingleEliminationBracket(8);
    const seeds = getRound1Seeds(slots);

    // Standard seeding: 1v8, 4v5, 2v7, 3v6
    expect(seeds[0]).toEqual({ seed1: 1, seed2: 8 });
    expect(seeds[1]).toEqual({ seed1: 4, seed2: 5 });
    expect(seeds[2]).toEqual({ seed1: 2, seed2: 7 });
    expect(seeds[3]).toEqual({ seed1: 3, seed2: 6 });
  });

  it("wires nextPosition correctly through all rounds", () => {
    const slots = generateSingleEliminationBracket(8);

    // Round 1 positions 1 and 2 feed into round 2 position 1
    const r1p1 = slots.find((s) => s.round === 1 && s.position === 1);
    const r1p2 = slots.find((s) => s.round === 1 && s.position === 2);
    expect(r1p1?.nextPosition).toEqual({ round: 2, position: 1, slot: 1 });
    expect(r1p2?.nextPosition).toEqual({ round: 2, position: 1, slot: 2 });

    // Round 1 positions 3 and 4 feed into round 2 position 2
    const r1p3 = slots.find((s) => s.round === 1 && s.position === 3);
    const r1p4 = slots.find((s) => s.round === 1 && s.position === 4);
    expect(r1p3?.nextPosition).toEqual({ round: 2, position: 2, slot: 1 });
    expect(r1p4?.nextPosition).toEqual({ round: 2, position: 2, slot: 2 });

    // Round 2 feeds into round 3 (final)
    const r2p1 = slots.find((s) => s.round === 2 && s.position === 1);
    const r2p2 = slots.find((s) => s.round === 2 && s.position === 2);
    expect(r2p1?.nextPosition).toEqual({ round: 3, position: 1, slot: 1 });
    expect(r2p2?.nextPosition).toEqual({ round: 3, position: 1, slot: 2 });

    // Final has no next
    const final = slots.find((s) => s.round === 3 && s.position === 1);
    expect(final?.nextPosition).toBeNull();
  });

  it("gives byes to top seeds", () => {
    const slots = generateSingleEliminationBracket(6);
    const round1 = slots.filter((s) => s.round === 1);
    const byes = round1.filter((s) => s.isBye);

    // Seeds 1 and 2 should get byes (they appear in bye matches)
    const byeSeeds = byes
      .map((b) => b.seed1 ?? b.seed2)
      .filter(Boolean)
      .sort();
    expect(byeSeeds).toEqual([1, 2]);
  });
});
