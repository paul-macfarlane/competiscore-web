import { describe, expect, it } from "vitest";

import { ELO_CONSTANTS } from "./constants";
import {
  calculateExpectedScore,
  calculateFFAEloChanges,
  calculateH2HEloChange,
  getKFactor,
} from "./elo-calculator";

describe("elo-calculator", () => {
  describe("getKFactor", () => {
    it("should return provisional K-factor for new players", () => {
      expect(getKFactor(0)).toBe(ELO_CONSTANTS.PROVISIONAL_K_FACTOR);
      expect(getKFactor(5)).toBe(ELO_CONSTANTS.PROVISIONAL_K_FACTOR);
      expect(getKFactor(9)).toBe(ELO_CONSTANTS.PROVISIONAL_K_FACTOR);
    });

    it("should return standard K-factor for established players", () => {
      expect(getKFactor(10)).toBe(ELO_CONSTANTS.STANDARD_K_FACTOR);
      expect(getKFactor(50)).toBe(ELO_CONSTANTS.STANDARD_K_FACTOR);
      expect(getKFactor(100)).toBe(ELO_CONSTANTS.STANDARD_K_FACTOR);
    });
  });

  describe("calculateExpectedScore", () => {
    it("should return 0.5 for equal ratings", () => {
      const result = calculateExpectedScore(1200, 1200);
      expect(result).toBeCloseTo(0.5, 2);
    });

    it("should return higher value when rating A is higher", () => {
      const result = calculateExpectedScore(1400, 1200);
      expect(result).toBeGreaterThan(0.5);
      expect(result).toBeCloseTo(0.76, 2);
    });

    it("should return lower value when rating A is lower", () => {
      const result = calculateExpectedScore(1200, 1400);
      expect(result).toBeLessThan(0.5);
      expect(result).toBeCloseTo(0.24, 2);
    });
  });

  describe("calculateH2HEloChange", () => {
    it("should calculate correct change for equal ratings with win", () => {
      const result = calculateH2HEloChange(1200, 0, 1200, 1.0);

      expect(result.kFactor).toBe(40);
      expect(result.expectedScore).toBeCloseTo(0.5, 2);
      expect(result.actualScore).toBe(1.0);
      expect(result.ratingChange).toBeCloseTo(20, 1);
    });

    it("should calculate correct change for underdog win", () => {
      const result = calculateH2HEloChange(1200, 10, 1400, 1.0);

      expect(result.kFactor).toBe(32);
      expect(result.expectedScore).toBeCloseTo(0.24, 2);
      expect(result.actualScore).toBe(1.0);
      expect(result.ratingChange).toBeGreaterThan(20);
    });

    it("should calculate correct change for favorite loss", () => {
      const result = calculateH2HEloChange(1400, 10, 1200, 0.0);

      expect(result.kFactor).toBe(32);
      expect(result.expectedScore).toBeCloseTo(0.76, 2);
      expect(result.actualScore).toBe(0.0);
      expect(result.ratingChange).toBeLessThan(-20);
    });

    it("should calculate correct change for draw", () => {
      const result = calculateH2HEloChange(1200, 10, 1200, 0.5);

      expect(result.kFactor).toBe(32);
      expect(result.expectedScore).toBeCloseTo(0.5, 2);
      expect(result.actualScore).toBe(0.5);
      expect(result.ratingChange).toBeCloseTo(0, 1);
    });

    it("should use higher K-factor for provisional players", () => {
      const provisional = calculateH2HEloChange(1200, 5, 1200, 1.0);
      const established = calculateH2HEloChange(1200, 15, 1200, 1.0);

      expect(provisional.kFactor).toBe(40);
      expect(established.kFactor).toBe(32);
      expect(Math.abs(provisional.ratingChange)).toBeGreaterThan(
        Math.abs(established.ratingChange),
      );
    });
  });

  describe("calculateFFAEloChanges", () => {
    it("should calculate correct changes for 3-player FFA", () => {
      const participants = [
        { rating: 1200, matchesPlayed: 10, rank: 1 },
        { rating: 1200, matchesPlayed: 10, rank: 2 },
        { rating: 1200, matchesPlayed: 10, rank: 3 },
      ];

      const results = calculateFFAEloChanges(participants);

      expect(results).toHaveLength(3);
      expect(results[0].ratingChange).toBeGreaterThan(0);
      expect(results[1].ratingChange).toBeCloseTo(0, 1);
      expect(results[2].ratingChange).toBeLessThan(0);
    });

    it("should calculate correct changes for 4-player FFA", () => {
      const participants = [
        { rating: 1200, matchesPlayed: 10, rank: 1 },
        { rating: 1200, matchesPlayed: 10, rank: 2 },
        { rating: 1200, matchesPlayed: 10, rank: 3 },
        { rating: 1200, matchesPlayed: 10, rank: 4 },
      ];

      const results = calculateFFAEloChanges(participants);

      expect(results).toHaveLength(4);
      expect(results[0].ratingChange).toBeGreaterThan(0);
      expect(results[1].ratingChange).toBeGreaterThan(results[2].ratingChange);
      expect(results[2].ratingChange).toBeGreaterThan(results[3].ratingChange);
      expect(results[3].ratingChange).toBeLessThan(0);
    });

    it("should handle tied ranks correctly", () => {
      const participants = [
        { rating: 1200, matchesPlayed: 10, rank: 1 },
        { rating: 1200, matchesPlayed: 10, rank: 2 },
        { rating: 1200, matchesPlayed: 10, rank: 2 },
      ];

      const results = calculateFFAEloChanges(participants);

      expect(results).toHaveLength(3);
      expect(results[0].ratingChange).toBeGreaterThan(0);
      expect(results[1].ratingChange).toBeCloseTo(results[2].ratingChange, 5);
    });

    it("should calculate larger changes for provisional players", () => {
      const participants = [
        { rating: 1200, matchesPlayed: 5, rank: 1 },
        { rating: 1200, matchesPlayed: 15, rank: 2 },
      ];

      const results = calculateFFAEloChanges(participants);

      expect(results[0].kFactor).toBe(40);
      expect(results[1].kFactor).toBe(32);
      expect(Math.abs(results[0].ratingChange)).toBeGreaterThan(
        Math.abs(results[1].ratingChange),
      );
    });

    it("should give correct average opponent rating", () => {
      const participants = [
        { rating: 1200, matchesPlayed: 10, rank: 1 },
        { rating: 1300, matchesPlayed: 10, rank: 2 },
        { rating: 1400, matchesPlayed: 10, rank: 3 },
      ];

      const results = calculateFFAEloChanges(participants);

      expect(results[0].opponentRatingAvg).toBeCloseTo(1350, 0);
      expect(results[1].opponentRatingAvg).toBeCloseTo(1300, 0);
      expect(results[2].opponentRatingAvg).toBeCloseTo(1250, 0);
    });
  });
});
