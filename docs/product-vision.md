# Competiscore - Product Vision Document

**Competition Tracking & Gaming Platform**

---

## 1. Product Overview

### 1.1 Vision Statement

Competiscore is the best way to keep score of all the different games you play with your friends. Whether it’s Ping Pong, Pool, Pacman, Poker, or any other competition, Competiscore lets you track records, calculate rankings, run tournaments, and build friendly rivalries within your community.

### 1.2 Problem Statement

Friend groups, offices, and clubs frequently play casual competitive games but lack a simple, unified way to track results over time. Spreadsheets are cumbersome, memories are unreliable, and existing apps are either too narrow (single game focus) or too complex (designed for professional leagues). There is no good solution for tracking the full variety of casual competitions that happen in social settings.

### 1.3 Target Users

**Primary:** Office workers, friend groups, clubs, and recreational leagues who regularly play competitive games and want to track standings, settle debates about who’s the best, and add stakes to their competitions.

**Secondary:** Casual gaming communities, bar leagues, college dorms, and family groups looking for a fun way to formalize their ongoing competitions.

### 1.4 Key Value Propositions

- Universal game support: Create any competition type with customizable rules
- ELO rankings for head-to-head and free-for-all games
- Eternal leaderboards for high score games like arcade classics
- Tournament brackets with multiple formats
- Seasons that aggregate multiple competitions into unified standings
- Placeholder members allow tracking before everyone has signed up

---

## 2. Core Concepts & Terminology

### 2.1 Leagues

A **League** is a community of players who compete against each other. Each league has its own game types, tournaments, seasons, and leaderboards. Users can belong to multiple leagues. Leagues can be public (discoverable and open to join) or private (invite-only).

### 2.2 Members & Roles

Each league has three member roles with escalating permissions:

| Permission                 | Member | Manager | Executive |
| -------------------------- | ------ | ------- | --------- |
| Play games & record scores | ✓      | ✓       | ✓         |
| View all members           | ✓      | ✓       | ✓         |
| Create game types          |        | ✓       | ✓         |
| Create tournaments         |        | ✓       | ✓         |
| Create seasons             |        | ✓       | ✓         |
| Invite members             |        | ✓       | ✓         |
| Create placeholder members |        | ✓       | ✓         |
| Remove members             |        | ✓       | ✓         |
| Manage member roles        |        |         | ✓         |
| Edit league settings       |        |         | ✓         |
| Archive league             |        |         | ✓         |
| Delete league              |        |         | ✓         |
| Transfer executive role    |        |         | ✓         |

### 2.3 Placeholder Members

**Placeholder members** represent real people who have not yet signed up for the app or joined the league. This allows leagues to start tracking history immediately without waiting for everyone to create accounts. Placeholders have a display name and username. When a real user joins, they can be linked to their placeholder to inherit all match history.

**Placeholder member rules:**

- Can only exist in one league
- Can only be claimed by one real user
- An invite can only be associated with one placeholder
- Match history can only be added by opponents or managers (not the placeholder itself)
- Can be retired without linking to a real user
- No time limit on claiming

### 2.4 Teams

The app supports two types of teams:

**Registered Teams:** Persistent teams with names, logos, and their own ELO ratings. Players create teams and invite others (placeholder members can be added without invitation). Players can be on multiple registered teams. Team composition can change over time, but team ELO persists regardless of roster changes.

**Ad-hoc Teams:** Ephemeral teams formed at match time for one-off competitions. These appear in match history (e.g., “Player A & Player B vs Player C & Player D”) but have no persistent identity, page, or ELO.

---

## 3. Game Types

Leagues can create custom game types to track their competitions. Each game type has a name, optional logo, and configuration options specific to its category.

### 3.1 Head-to-Head (H2H)

Two competitors (individuals or teams) face off. One winner, one loser, or a draw.

**Configuration options:**

- Scoring type: Win/Loss only, or Score-based (e.g., 21-18)
- Score description: Points, games, sets, or custom label
- Draws allowed: Yes/No
- Min/Max players per side (for team games)
- Rules link: Optional URL to rules document

**ELO Calculation:** Yes, individual and team ELO tracked separately.

**Examples:** Pool (8-ball, 9-ball, straight pool), Ping Pong, Foosball, Chess, Arm Wrestling, Beer Pong, Cornhole, Tic-Tac-Toe, Darts (H2H variant), Shuffleboard, Croquet, Horseshoes, Spikeball, Kan Jam, Fighting video games (Smash Bros, Street Fighter), Sports video games (FIFA, Madden, NBA 2K), Flip Cup, Quarters

### 3.2 Free-for-All (FFA)

Three or more competitors (individuals or teams) in a single match. Results in a ranking (1st, 2nd, 3rd, etc.).

**Configuration options:**

- Scoring type: Ranked finish only, or Score-based ranking
- Score order: Highest wins or Lowest wins
- Min/Max players: Configurable range
- Rules link: Optional URL

**ELO Calculation:** Yes, using multiplayer ELO algorithms.

**Examples:** Mario Kart, Poker night, Disc Golf round, Bowling, Golf (real or mini), 21 (basketball), Battle royale video games, Racing video games, Board games (Catan, Settlers variants), Card games (Cribbage, Euchre, Spades, Hearts)

### 3.3 High Score Challenge

Asynchronous competition where players submit scores over time against an eternal leaderboard. No head-to-head matches; players compete against all-time records.

**Configuration options:**

- Score order: Highest wins or Lowest wins
- Score description: Points, time, distance, or custom label
- Individual or Team: Who can submit scores
- Rules link: Optional URL

**ELO Calculation:** No (leaderboard ranking only).

**Examples:** Pacman, arcade games, most pushups in 1 minute, fastest mile run, typing speed test, Nerf basketball high score, paper airplane distance, waste bin toss streak, darts 501 high score

### 3.4 Game Type Templates

App administrators provide pre-built templates for common games (e.g., 8-Ball Pool, Ping Pong, Bowling). League managers can use these templates to quickly create game types with sensible defaults, then customize as needed.

_Future: Community-shared templates._

### 3.5 Game Type Editing Rules

After creation, game types can have their name and logo edited. However, if the fundamental rules need to change (scoring type, score order, etc.), a new game type must be created to preserve historical data integrity.

Game types can be **archived** (hidden from new matches but history preserved).

---

## 4. Matches & Scoring

### 4.1 Recording Matches

Members can record match results in two ways:

**Direct Recording:** Any member can record a completed match at any time by selecting the game type, participants, and entering the result.

**Challenge System:** Members can challenge other members (or teams) to a game, creating a pending match visible to both parties. Once played, either party can record the result.

### 4.2 Match Data Captured

- Date and time played (defaults to now, backdating allowed)
- Game type
- Participants (individuals or teams)
- Result (winner/loser, scores, or rankings depending on game type)
- Draw indicator (if applicable)
- Recorder (who submitted the result)

### 4.3 Match Verification

For MVP, matches are assumed accurate when recorded. Trust is placed in the community.

_Future: Dispute/confirmation system._

### 4.4 Match Immutability

Recorded matches cannot be deleted. All match recordings are auditable (who recorded what, when). This ensures historical integrity and prevents manipulation of standings.

### 4.5 High Score Submissions

For High Score Challenge games, any member can submit a score at any time. There is no challenge period; the leaderboard is eternal. Users can filter the leaderboard by time period (this week, this month, this year, all-time).

---

## 5. ELO System & Rankings

### 5.1 ELO Overview

ELO ratings are calculated for Head-to-Head and Free-for-All game types. Each player and registered team has a separate ELO rating per game type within a league.

### 5.2 ELO Parameters

- **Starting ELO:** 1200 for new players/teams
- **K-factor:** 32 (standard volatility)
- **Provisional period:** First 10 games use K-factor of 40 for faster calibration
- **ELO decay:** None (MVP)

### 5.3 Team ELO

Registered teams have their own ELO independent of individual member ratings. When roster changes occur, the team ELO persists. Ad-hoc teams do not have persistent ELO.

### 5.4 FFA ELO Calculation

For Free-for-All games, ELO is calculated by treating each pairing as a virtual head-to-head match. A player who finishes 1st is considered to have “beaten” all other participants; 2nd place beat everyone except 1st, and so on. ELO changes are averaged across all virtual matches.

---

## 6. Standings & Leaderboards

### 6.1 Per-Game-Type Standings

Each game type has its own standings page showing:

- ELO rankings (for H2H and FFA games)
- Overall win/loss/draw record
- Win percentage
- Current streak (win/loss)
- Recent form (last 10 games)
- Leaderboard position (for High Score games)

### 6.2 Filtering Options

All standings and leaderboards can be filtered by:

- Time period: This week, this month, this year, all-time
- Individual vs Team (where applicable)

### 6.3 Head-to-Head Records

Users can view their personal record against any specific opponent, including win/loss breakdown and recent matches.

### 6.4 Personal Stats Page

Each user has a personal stats page showing their performance across all game types in the league, including overall records and rivalries (frequent opponents).

### 6.5 League-Wide Stats

The league dashboard shows aggregate statistics:

- Total matches played
- Most active players
- Most popular game types
- Recent activity feed

---

## 7. Tournaments

### 7.1 Tournament Overview

Tournaments are structured bracket competitions using any game type as the match format. Managers create tournaments, set the format, and manage progression.

### 7.2 Tournament Configuration

- Name and optional logo
- Format: Single Elimination, Round Robin, Swiss
- Match format: Best-of-X series (e.g., best of 1, best of 3, best of 5)
- Variation: Single game type for all rounds, or different game types per round
- Participant type: Individuals or Teams
- Seeding: Manual or Random
- Start date/time (manager-specified)

_Future: ELO-based seeding, Double Elimination format_

### 7.3 Tournament Formats (MVP)

**Single Elimination:** Standard bracket where losers are eliminated. Supports bye handling for non-power-of-2 participant counts.

**Round Robin:** Every participant plays every other participant. Final standings based on win count.

**Swiss:** Fixed number of rounds where participants are paired against others with similar records. No elimination.

### 7.4 Tournament Operations

- Bracket generation handles byes automatically for non-power-of-2 counts
- Matches can be scheduled within the tournament
- No-shows are recorded as losses (forfeit)
- Tournaments can span any period of time (no time limits per round)
- Tournament history is preserved and browsable

### 7.5 ELO Impact

Tournament matches affect ELO ratings the same as regular matches. There is no separate tournament ELO.

---

## 8. Seasons

### 8.1 Season Overview

Seasons are defined periods where multiple competitions (matches, tournaments) contribute to unified standings. They allow leagues to crown an overall champion across different game types.

### 8.2 Season Configuration

- Name and optional logo
- Participant type: Solo (individuals) or Team
- Start and end dates
- Included game types and their point values
- Included tournaments and their point values
- Scoring rules for each component

### 8.3 Season Scoring

Managers define how each competition type contributes to the season leaderboard. Examples:

- H2H match win: +3 points
- H2H match draw: +1 point
- FFA 1st place: +5 points, 2nd: +3 points, 3rd: +1 point
- High Score top 3 finish: +2 points
- Tournament winner: +10 points, finalist: +5 points

### 8.4 Season Leaderboard

The season leaderboard shows accumulated points, ranking, and breakdown by competition type. Historical seasons are preserved for reference.

---

## 9. User Features

### 9.1 Authentication

Supported sign-in methods:

- Google Sign-In
- Apple Sign-In (stretch goal, non-MVP)
- Discord Sign-In
- Magic Link Email (stretch goal, non-MVP)

### 9.2 Profile Attributes

- **Username:** Unique identifier (auto-generated if skipped during setup)
- **Display name:** Human-readable name (first and last name)
- **Profile picture:** Optional
- **Bio:** Optional

### 9.3 Profile Visibility

Profiles are only visible to members of the same leagues. Non-league members cannot see your profile.

### 9.4 Account Deletion

Users can delete their account. Upon deletion, all personally identifying information is removed. Match history, rankings, and statistics are preserved with the user displayed as “Deleted User” to maintain league data integrity.

### 9.5 Profile Editing

After initial sign-in, users complete profile setup. If skipped, a random username is generated. Profile attributes can be edited at any time.

---

## 10. League Management

### 10.1 Creating a League

Any user can create a new league by specifying:

- Name (required)
- Description (required)
- Visibility: Public or Private (required)
- Logo (optional)

The creator automatically becomes a League Executive.

### 10.2 Public vs Private Leagues

**Public Leagues:** Discoverable via search. Any user can join without invitation. Search results show league name, description, featured game type, and member count.

**Private Leagues:** Invite-only. Not discoverable via search.

### 10.3 Searching for Leagues

Users can search for public leagues by:

- League name
- Game type name

Search results display league name, description, featured game type, and member count.

### 10.4 Inviting Members

Managers and Executives can invite users to the league. Invitations specify the role (Member, Manager, or Executive). Users can be searched by name or username. When inviting, an existing placeholder member can be linked so the invitee inherits their history upon joining.

### 10.5 Managing Members

- Executives can change member roles and remove members
- Managers can remove members but not change roles
- Any member can leave the league
- Exception: An Executive who is the sole Executive must appoint a replacement before leaving

### 10.6 League Deletion & Archival

- **Deletion:** Executives can delete the league. This is permanent and destructive - all league data is permanently removed and cannot be recovered.
- **Archival:** Executives can archive the league. Archived leagues are hidden from all members and do not appear in searches. Data is fully preserved. Only former Executives can view or reactivate an archived league.

### 10.7 Member Dashboard

All members can view a dashboard showing all league members, their roles, and basic stats.

### 10.8 Moderation

**Reporting:**
Any member can report another member. Reports are visible only to Managers and Executives.

Report includes:

- Reason (selected from categories below)
- Description (free text)
- Optional evidence/context

**Report Categories:**

- Unsportsmanlike conduct
- False match reporting
- Harassment
- Spam
- Other

**Remediation Options (Managers and Executives):**

- Dismiss report (with documented reason)
- Warn the member (recorded in their history, visible to league leadership)
- Suspend member (temporary - cannot record matches or participate in tournaments)
- Remove member (permanently kicked from league)

**Audit Trail:**

- All reports and remediation actions are logged with timestamps
- Members can see warnings and actions taken against them
- Leadership can view a member’s full offense history when reviewing new reports

---

## 11. Notifications

### 11.1 MVP Notifications (In-App Only)

- Challenge received
- Invited to a league
- Match result recorded involving you

### 11.2 Future Notifications

- Tournament starting soon / your turn in bracket
- Someone beat your high score
- Weekly/monthly activity digest
- Push notifications
- Email notifications

---

## 12. Technical Considerations

### 12.1 Platform

Web application (MVP). Mobile apps may follow.

### 12.2 Data Integrity

- All match recordings are auditable (who, what, when)
- Matches cannot be deleted
- Rate limiting on match recording to prevent spam

### 12.3 Image Storage

Profile pictures, league logos, game type logos, and team logos stored in blob storage.

### 12.4 Timezone Handling

Times displayed in the user’s browser/device timezone. No explicit timezone stored in user profile.

### 12.5 Future Technical Features

- Offline support
- Real-time updates (live brackets, live leaderboards)
- Data export
- Full-text search
- External integrations (Discord bot, API, webhooks)

---

## 13. MVP Scope & Prioritization

### Phase 1: Foundation

1. Authentication (Google, Discord)
2. User profiles
3. League creation and management
4. Member management (including placeholder members)
5. Role-based permissions
6. Moderation system (reporting and remediation)
7. Usage limits with admin override system

### Phase 2: Core Gameplay

1. Game type creation (H2H, FFA, High Score)
2. Game type templates
3. Match recording (direct and via challenges)
4. ELO calculations
5. Standings and leaderboards
6. Team management (registered and ad-hoc)

### Phase 3: Tournaments

1. Single Elimination tournaments
2. Round Robin tournaments
3. Swiss tournaments
4. Bracket management and bye handling
5. Tournament history

### Phase 4: Seasons

1. Season creation and configuration
2. Season scoring rules
3. Season leaderboards
4. Season history

### Post-MVP Features

- Double Elimination tournaments
- ELO-based tournament seeding
- Match dispute/confirmation system
- Push notifications
- Email notifications
- Discord integration
- API for external systems
- Data export
- Full-text search
- Custom stat tracking per game type
- Achievements/badges
- Community-shared game type templates
- ELO decay for inactive players
- Payment processing and Pro tier billing
- Advanced analytics for Pro users
- Custom league branding for Pro users

---

## 14. Future Monetization

### 14.1 Monetization Philosophy

The app will launch with all features available but with usage limits clearly communicated. Users will understand from the start that a paid tier will eventually exist, avoiding any “rug pull” perception. The free tier is designed to be genuinely useful for casual friend groups while the paid tier unlocks scale for larger, more active communities.

### 14.2 Freemium Model

**Free Tier:**

- Up to 3 leagues (as creator or member)
- Up to 20 active members per league (placeholder members do not count toward this limit)
- Up to 20 game types per league
- Full access to all features: tournaments, seasons, all game types, full stats
- Community support only

**Pro Tier (pricing TBD):**

- Unlimited leagues
- Unlimited members per league
- Unlimited game types
- Priority support
- Advanced analytics (TBD)
- Custom league branding (TBD)

### 14.3 Limit Overrides

The system will support administrative overrides to usage limits on a per-league or per-user basis. This allows:

- Exemptions for specific communities (e.g., the developer’s workplace) before paid tier launches
- Promotional upgrades for early adopters
- Flexible handling of edge cases

Override capabilities:

- Override member limit for a specific league
- Override league count for a specific user
- Override game type limit for a specific league
- Grant “Pro” status to a user or league without payment

Overrides are managed by app administrators and are invisible to end users (they simply see the elevated limits).

### 14.4 Transparency

Usage limits will be clearly displayed in the app:

- League creation screen shows “X of 3 leagues used”
- Member management shows “X of 20 active members”
- Game type creation shows “X of 20 game types”

When approaching limits, users will see gentle warnings. When at limits, clear messaging explains the limit and that a paid tier is coming.

---

## 15. Open Questions

1. **Domain:** Secure competiscore.com or competiscore.app
2. **Pro Tier Pricing:** To be determined based on market research and user feedback.
3. **Pro Tier Additional Features:** Advanced analytics and custom branding mentioned but not fully specified.

---

## 16. Success Metrics

- Number of active leagues
- Matches recorded per week
- User retention (weekly active users)
- League growth (members joining existing leagues)
- Tournament completion rate
- Time from league creation to first match recorded

---
