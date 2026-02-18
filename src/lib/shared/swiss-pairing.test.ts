import { describe, expect, it } from "vitest";

import {
  SwissMatchRecord,
  computeSwissStandings,
  generateSwissNextRound,
  generateSwissRound1,
  getSwissRanking,
} from "./swiss-pairing";

const makeParticipants = (names: string[]) =>
  names.map((name, i) => ({ id: `p${i + 1}`, name }));

describe("generateSwissRound1", () => {
  it("pairs participants alphabetically", () => {
    const participants = makeParticipants(["Charlie", "Alice", "Bob", "Diana"]);
    const result = generateSwissRound1(participants);

    expect(result.pairings).toHaveLength(2);
    expect(result.byeParticipantId).toBeNull();

    // Sorted: Alice(p2), Bob(p3), Charlie(p1), Diana(p4)
    expect(result.pairings[0].participant1Id).toBe("p2"); // Alice
    expect(result.pairings[0].participant2Id).toBe("p3"); // Bob
    expect(result.pairings[1].participant1Id).toBe("p1"); // Charlie
    expect(result.pairings[1].participant2Id).toBe("p4"); // Diana
  });

  it("assigns bye to last alphabetical participant for odd count", () => {
    const participants = makeParticipants(["Charlie", "Alice", "Bob"]);
    const result = generateSwissRound1(participants);

    expect(result.pairings).toHaveLength(1);
    expect(result.byeParticipantId).toBe("p1"); // Charlie (last alphabetically)
    expect(result.pairings[0].participant1Id).toBe("p2"); // Alice
    expect(result.pairings[0].participant2Id).toBe("p3"); // Bob
  });

  it("handles 2 participants", () => {
    const participants = makeParticipants(["Zara", "Amy"]);
    const result = generateSwissRound1(participants);

    expect(result.pairings).toHaveLength(1);
    expect(result.byeParticipantId).toBeNull();
    expect(result.pairings[0].participant1Id).toBe("p2"); // Amy
    expect(result.pairings[0].participant2Id).toBe("p1"); // Zara
  });
});

describe("computeSwissStandings", () => {
  it("computes win/loss points correctly", () => {
    const participants = makeParticipants(["Alice", "Bob", "Charlie", "Diana"]);
    const matches: SwissMatchRecord[] = [
      {
        participant1Id: "p1",
        participant2Id: "p2",
        winnerId: "p1",
        isDraw: false,
        isBye: false,
        isForfeit: false,
      },
      {
        participant1Id: "p3",
        participant2Id: "p4",
        winnerId: "p4",
        isDraw: false,
        isBye: false,
        isForfeit: false,
      },
    ];

    const standings = computeSwissStandings(participants, matches);

    expect(standings.get("p1")!.points).toBe(1);
    expect(standings.get("p1")!.wins).toBe(1);
    expect(standings.get("p2")!.points).toBe(0);
    expect(standings.get("p2")!.losses).toBe(1);
    expect(standings.get("p4")!.points).toBe(1);
    expect(standings.get("p3")!.points).toBe(0);
  });

  it("computes draw points correctly", () => {
    const participants = makeParticipants(["Alice", "Bob"]);
    const matches: SwissMatchRecord[] = [
      {
        participant1Id: "p1",
        participant2Id: "p2",
        winnerId: null,
        isDraw: true,
        isBye: false,
        isForfeit: false,
      },
    ];

    const standings = computeSwissStandings(participants, matches);

    expect(standings.get("p1")!.points).toBe(0.5);
    expect(standings.get("p1")!.draws).toBe(1);
    expect(standings.get("p2")!.points).toBe(0.5);
    expect(standings.get("p2")!.draws).toBe(1);
  });

  it("computes bye points correctly", () => {
    const participants = makeParticipants(["Alice", "Bob", "Charlie"]);
    const matches: SwissMatchRecord[] = [
      {
        participant1Id: "p1",
        participant2Id: "p2",
        winnerId: "p1",
        isDraw: false,
        isBye: false,
        isForfeit: false,
      },
      {
        participant1Id: "p3",
        participant2Id: null,
        winnerId: "p3",
        isDraw: false,
        isBye: true,
        isForfeit: false,
      },
    ];

    const standings = computeSwissStandings(participants, matches);

    expect(standings.get("p3")!.points).toBe(1);
    expect(standings.get("p3")!.wins).toBe(1);
    expect(standings.get("p3")!.byeReceived).toBe(true);
  });

  it("computes Buchholz tiebreaker correctly", () => {
    const participants = makeParticipants(["Alice", "Bob", "Charlie", "Diana"]);
    // Round 1: Alice beats Bob, Charlie beats Diana
    // Round 2: Alice beats Charlie, Bob beats Diana
    const matches: SwissMatchRecord[] = [
      {
        participant1Id: "p1",
        participant2Id: "p2",
        winnerId: "p1",
        isDraw: false,
        isBye: false,
        isForfeit: false,
      },
      {
        participant1Id: "p3",
        participant2Id: "p4",
        winnerId: "p3",
        isDraw: false,
        isBye: false,
        isForfeit: false,
      },
      {
        participant1Id: "p1",
        participant2Id: "p3",
        winnerId: "p1",
        isDraw: false,
        isBye: false,
        isForfeit: false,
      },
      {
        participant1Id: "p2",
        participant2Id: "p4",
        winnerId: "p2",
        isDraw: false,
        isBye: false,
        isForfeit: false,
      },
    ];

    const standings = computeSwissStandings(participants, matches);

    // Alice: 2 wins, opponents Bob(1pt) + Charlie(1pt) = Buchholz 2
    expect(standings.get("p1")!.points).toBe(2);
    expect(standings.get("p1")!.buchholz).toBe(2);

    // Bob: 1 win, opponents Alice(2pt) + Diana(0pt) = Buchholz 2
    expect(standings.get("p2")!.points).toBe(1);
    expect(standings.get("p2")!.buchholz).toBe(2);

    // Charlie: 1 win, opponents Diana(0pt) + Alice(2pt) = Buchholz 2
    expect(standings.get("p3")!.points).toBe(1);
    expect(standings.get("p3")!.buchholz).toBe(2);

    // Diana: 0 wins, opponents Charlie(1pt) + Bob(1pt) = Buchholz 2
    expect(standings.get("p4")!.points).toBe(0);
    expect(standings.get("p4")!.buchholz).toBe(2);
  });

  it("handles forfeit correctly", () => {
    const participants = makeParticipants(["Alice", "Bob"]);
    const matches: SwissMatchRecord[] = [
      {
        participant1Id: "p1",
        participant2Id: "p2",
        winnerId: "p1",
        isDraw: false,
        isBye: false,
        isForfeit: true,
      },
    ];

    const standings = computeSwissStandings(participants, matches);

    expect(standings.get("p1")!.points).toBe(1);
    expect(standings.get("p1")!.wins).toBe(1);
    expect(standings.get("p2")!.points).toBe(0);
    expect(standings.get("p2")!.losses).toBe(1);
  });
});

describe("generateSwissNextRound", () => {
  it("pairs by points descending", () => {
    const participants = makeParticipants(["Alice", "Bob", "Charlie", "Diana"]);
    const matches: SwissMatchRecord[] = [
      {
        participant1Id: "p1",
        participant2Id: "p2",
        winnerId: "p1",
        isDraw: false,
        isBye: false,
        isForfeit: false,
      },
      {
        participant1Id: "p3",
        participant2Id: "p4",
        winnerId: "p3",
        isDraw: false,
        isBye: false,
        isForfeit: false,
      },
    ];

    const standings = computeSwissStandings(participants, matches);
    const result = generateSwissNextRound(standings);

    expect(result.pairings).toHaveLength(2);
    expect(result.byeParticipantId).toBeNull();

    // Winners (Alice=1pt, Charlie=1pt) play each other
    // Losers (Bob=0pt, Diana=0pt) play each other
    const pair1Ids = [
      result.pairings[0].participant1Id,
      result.pairings[0].participant2Id,
    ].sort();
    const pair2Ids = [
      result.pairings[1].participant1Id,
      result.pairings[1].participant2Id,
    ].sort();

    expect(pair1Ids).toEqual(["p1", "p3"]); // winners together
    expect(pair2Ids).toEqual(["p2", "p4"]); // losers together
  });

  it("avoids rematches when possible", () => {
    const participants = makeParticipants(["Alice", "Bob", "Charlie", "Diana"]);
    // Round 1: Alice beat Bob, Charlie beat Diana
    // Round 2: Alice beat Charlie, Diana beat Bob
    // Now all have: Alice=2, Charlie=1, Diana=1, Bob=0
    const matches: SwissMatchRecord[] = [
      {
        participant1Id: "p1",
        participant2Id: "p2",
        winnerId: "p1",
        isDraw: false,
        isBye: false,
        isForfeit: false,
      },
      {
        participant1Id: "p3",
        participant2Id: "p4",
        winnerId: "p3",
        isDraw: false,
        isBye: false,
        isForfeit: false,
      },
      {
        participant1Id: "p1",
        participant2Id: "p3",
        winnerId: "p1",
        isDraw: false,
        isBye: false,
        isForfeit: false,
      },
      {
        participant1Id: "p4",
        participant2Id: "p2",
        winnerId: "p4",
        isDraw: false,
        isBye: false,
        isForfeit: false,
      },
    ];

    const standings = computeSwissStandings(participants, matches);
    const result = generateSwissNextRound(standings);

    expect(result.pairings).toHaveLength(2);

    // Alice(2pt) has played Bob and Charlie. Should play Diana.
    // Charlie(1pt) has played Diana and Alice. Should play Bob.
    const pair1 = [
      result.pairings[0].participant1Id,
      result.pairings[0].participant2Id,
    ].sort();
    const pair2 = [
      result.pairings[1].participant1Id,
      result.pairings[1].participant2Id,
    ].sort();

    const allPairs = [pair1, pair2].sort((a, b) => a[0].localeCompare(b[0]));
    expect(allPairs).toEqual([
      ["p1", "p4"], // Alice vs Diana
      ["p2", "p3"], // Bob vs Charlie
    ]);
  });

  it("gives bye to lowest-ranked without previous bye", () => {
    const participants = makeParticipants(["Alice", "Bob", "Charlie"]);
    // Round 1: Alice beat Bob, Charlie got bye
    const matches: SwissMatchRecord[] = [
      {
        participant1Id: "p1",
        participant2Id: "p2",
        winnerId: "p1",
        isDraw: false,
        isBye: false,
        isForfeit: false,
      },
      {
        participant1Id: "p3",
        participant2Id: null,
        winnerId: "p3",
        isDraw: false,
        isBye: true,
        isForfeit: false,
      },
    ];

    const standings = computeSwissStandings(participants, matches);
    const result = generateSwissNextRound(standings);

    // Bob (0pt) is lowest ranked without bye. Bob gets bye.
    expect(result.byeParticipantId).toBe("p2");
    expect(result.pairings).toHaveLength(1);
  });
});

describe("getSwissRanking", () => {
  it("sorts by points then buchholz then name", () => {
    const participants = makeParticipants(["Alice", "Bob", "Charlie", "Diana"]);
    const matches: SwissMatchRecord[] = [
      {
        participant1Id: "p1",
        participant2Id: "p2",
        winnerId: "p1",
        isDraw: false,
        isBye: false,
        isForfeit: false,
      },
      {
        participant1Id: "p3",
        participant2Id: "p4",
        winnerId: "p3",
        isDraw: false,
        isBye: false,
        isForfeit: false,
      },
    ];

    const standings = computeSwissStandings(participants, matches);
    const ranking = getSwissRanking(standings);

    expect(ranking[0].participantId).toBe("p1"); // Alice 1pt
    expect(ranking[1].participantId).toBe("p3"); // Charlie 1pt
    // Bob and Diana both 0pt, same buchholz, alphabetical
    expect(ranking[2].participantId).toBe("p2"); // Bob
    expect(ranking[3].participantId).toBe("p4"); // Diana
  });
});
