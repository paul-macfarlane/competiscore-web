import * as dbEvents from "@/db/events";
import { EventParticipantRole } from "@/lib/shared/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_EVENT_TEAMS, MAX_EVENT_TEAM_MEMBERS } from "./constants";
import { addEventTeamMember, createEventTeam } from "./event-teams";
import { TEST_IDS } from "./test-helpers";

vi.mock("@/db/events", () => ({
  addEventTeamMember: vi.fn(),
  checkEventTeamNameExists: vi.fn(),
  countEventTeamMembers: vi.fn(),
  countEventTeams: vi.fn(),
  createEventTeam: vi.fn(),
  deleteEventTeam: vi.fn(),
  getEventParticipant: vi.fn(),
  getEventPlaceholderById: vi.fn(),
  getEventTeamById: vi.fn(),
  getEventTeamMemberById: vi.fn(),
  getEventTeamMembers: vi.fn(),
  getEventTeams: vi.fn(),
  getTeamForPlaceholder: vi.fn(),
  getTeamForUser: vi.fn(),
  removeEventTeamMember: vi.fn(),
  updateEventTeam: vi.fn(),
}));

const mockOrganizerMember = {
  id: TEST_IDS.EVENT_MEMBER_ID,
  eventId: TEST_IDS.EVENT_ID,
  userId: TEST_IDS.USER_ID,
  role: EventParticipantRole.ORGANIZER,
  joinedAt: new Date(),
};

const mockParticipantMember = {
  ...mockOrganizerMember,
  role: EventParticipantRole.PARTICIPANT,
};

const mockTeam = {
  id: TEST_IDS.EVENT_TEAM_ID,
  eventId: TEST_IDS.EVENT_ID,
  name: "Team Alpha",
  logo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("createEventTeam", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns validation error for empty name", async () => {
    const result = await createEventTeam(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      name: "",
    });

    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors).toBeDefined();
  });

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await createEventTeam(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      name: "Team Alpha",
    });

    expect(result.error).toBe("You don't have permission to manage teams");
  });

  it("returns error at team limit", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.checkEventTeamNameExists).mockResolvedValue(false);
    vi.mocked(dbEvents.countEventTeams).mockResolvedValue(MAX_EVENT_TEAMS);

    const result = await createEventTeam(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      name: "Team Zeta",
    });

    expect(result.error).toBe(
      "Event can have at most " + MAX_EVENT_TEAMS + " teams",
    );
  });

  it("returns error for duplicate name", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.checkEventTeamNameExists).mockResolvedValue(true);

    const result = await createEventTeam(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      name: "Team Alpha",
    });

    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors?.name).toBe(
      "A team with this name already exists",
    );
  });

  it("returns success when creating a team", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.checkEventTeamNameExists).mockResolvedValue(false);
    vi.mocked(dbEvents.countEventTeams).mockResolvedValue(0);
    vi.mocked(dbEvents.createEventTeam).mockResolvedValue(mockTeam as never);

    const result = await createEventTeam(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      name: "Team Alpha",
    });

    expect(result.data?.team.name).toBe("Team Alpha");
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });
});

describe("addEventTeamMember", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getEventTeamById).mockResolvedValue(mockTeam as never);
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await addEventTeamMember(TEST_IDS.USER_ID, {
      eventTeamId: TEST_IDS.EVENT_TEAM_ID,
      userId: TEST_IDS.USER_ID_2,
    });

    expect(result.error).toBe("You don't have permission to manage teams");
  });

  it("returns error at member limit", async () => {
    vi.mocked(dbEvents.getEventTeamById).mockResolvedValue(mockTeam as never);
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.countEventTeamMembers).mockResolvedValue(
      MAX_EVENT_TEAM_MEMBERS,
    );

    const result = await addEventTeamMember(TEST_IDS.USER_ID, {
      eventTeamId: TEST_IDS.EVENT_TEAM_ID,
      userId: TEST_IDS.USER_ID_2,
    });

    expect(result.error).toBe(
      "Team can have at most " + MAX_EVENT_TEAM_MEMBERS + " participants",
    );
  });

  it("returns error when user not an event member", async () => {
    vi.mocked(dbEvents.getEventTeamById).mockResolvedValue(mockTeam as never);
    vi.mocked(dbEvents.getEventParticipant)
      .mockResolvedValueOnce(mockOrganizerMember as never)
      .mockResolvedValueOnce(undefined);
    vi.mocked(dbEvents.countEventTeamMembers).mockResolvedValue(1);

    const result = await addEventTeamMember(TEST_IDS.USER_ID, {
      eventTeamId: TEST_IDS.EVENT_TEAM_ID,
      userId: TEST_IDS.USER_ID_2,
    });

    expect(result.error).toBe("User is not a participant in this event");
  });

  it("returns success when adding a team member", async () => {
    vi.mocked(dbEvents.getEventTeamById).mockResolvedValue(mockTeam as never);
    vi.mocked(dbEvents.getEventParticipant)
      .mockResolvedValueOnce(mockOrganizerMember as never)
      .mockResolvedValueOnce({
        ...mockParticipantMember,
        userId: TEST_IDS.USER_ID_2,
      } as never);
    vi.mocked(dbEvents.countEventTeamMembers).mockResolvedValue(1);
    vi.mocked(dbEvents.getTeamForUser).mockResolvedValue(undefined);
    vi.mocked(dbEvents.addEventTeamMember).mockResolvedValue(
      undefined as never,
    );

    const result = await addEventTeamMember(TEST_IDS.USER_ID, {
      eventTeamId: TEST_IDS.EVENT_TEAM_ID,
      userId: TEST_IDS.USER_ID_2,
    });

    expect(result.data?.added).toBe(true);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });
});
