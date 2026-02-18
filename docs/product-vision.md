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
- Events that aggregate multiple competitions into unified standings with flexible point scoring
- Placeholder members allow tracking before everyone has signed up

---

## 2. Core Concepts & Terminology

### 2.1 Leagues

A **League** is a community of players who compete against each other. Each league has its own game types, tournaments, and leaderboards. Users can belong to multiple leagues. Leagues can be public (discoverable and open to join) or private (invite-only).

### 2.2 Members & Roles

Each league has three member roles with escalating permissions:

| Permission                 | Member | Manager | Executive |
| -------------------------- | ------ | ------- | --------- |
| Play games & record scores | ✓      | ✓       | ✓         |
| View all members           | ✓      | ✓       | ✓         |
| Report members             | ✓      | ✓       | ✓         |
| Create teams               | ✓      | ✓       | ✓         |
| Record matches for others  |        | ✓       | ✓         |
| Create game types          |        | ✓       | ✓         |
| Create tournaments         |        | ✓       | ✓         |
| Invite members             |        | ✓       | ✓         |
| Create placeholder members |        | ✓       | ✓         |
| Remove members             |        | ✓       | ✓         |
| View reports & moderate    |        | ✓       | ✓         |
| Manage all teams           |        | ✓       | ✓         |
| Manage member roles        |        |         | ✓         |
| Edit league settings       |        |         | ✓         |
| Archive/unarchive league   |        |         | ✓         |
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

**Team Member Roles:**

Each registered team has two member roles:

| Permission          | Member | Manager |
| ------------------- | ------ | ------- |
| View team           | ✓      | ✓       |
| Leave team          | ✓      | ✓       |
| Edit team details   |        | ✓       |
| Invite members      |        | ✓       |
| Add placeholders    |        | ✓       |
| Remove members      |        | ✓       |
| Manage member roles |        | ✓       |
| Archive/Unarchive   |        | ✓       |
| Delete team         |        | ✓       |

The team creator is automatically assigned the Manager role. League Managers and Executives can also manage any team as a fallback (league-level permission overrides team-level).

**Team Invitations:**

Team managers can invite users to join their team via two methods:

**In-App Invitation:** Search for existing league members and send them a team invitation directly. The invitee will see the invitation in their notifications and can accept or reject it. Only current league members can be invited via in-app invitation.

**Invite Link:** Generate a shareable team invite link that can be sent via any channel. The link handles three scenarios:

- **League member:** Shows the team details and allows them to join immediately
- **Non-league member (authenticated):** Prompts to join both the league AND the team. User is informed they will become a member of both.
- **Unauthenticated user:** Prompts sign-in/sign-up flow, then handles league + team joining as above

Team invite links can be configured to expire after a set time or number of uses. When joining via a team invite link, the user is added to the league (if not already a member) with the default "Member" role before being added to the team.

Note: Placeholder members can be added directly to teams without invitation (since they represent people who haven't signed up yet).

**Ad-hoc Teams:** _Future feature._ Ephemeral teams formed at match time for one-off competitions. These would appear in match history (e.g., "Player A & Player B vs Player C & Player D") but have no persistent identity, page, or ELO.

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
- Rules: Optional markdown-formatted rules text

**ELO Calculation:** Yes, individual and team ELO tracked separately.

**Examples:** Pool (8-ball, 9-ball, straight pool), Ping Pong, Foosball, Chess, Arm Wrestling, Beer Pong, Cornhole, Tic-Tac-Toe, Darts (H2H variant), Shuffleboard, Croquet, Horseshoes, Spikeball, Kan Jam, Fighting video games (Smash Bros, Street Fighter), Sports video games (FIFA, Madden, NBA 2K), Flip Cup, Quarters

### 3.2 Free-for-All (FFA)

Three or more competitors (individuals or teams) in a single match. Results in a ranking (1st, 2nd, 3rd, etc.).

**Configuration options:**

- Scoring type: Ranked finish only, or Score-based ranking
- Score order: Highest wins or Lowest wins
- Min/Max players: Configurable range
- Rules: Optional markdown-formatted rules text

**ELO Calculation:** Yes, using multiplayer ELO algorithms.

**Examples:** Mario Kart, Poker night, Disc Golf round, Bowling, Golf (real or mini), 21 (basketball), Battle royale video games, Racing video games, Board games (Catan, Settlers variants), Card games (Cribbage, Euchre, Spades, Hearts)

### 3.3 High Score Challenge

Asynchronous competition where players submit scores over time against an eternal leaderboard. No head-to-head matches; players compete against all-time records.

**Configuration options:**

- Score order: Highest wins or Lowest wins
- Score description: Points, time, distance, or custom label
- Individual or Team: Who can submit scores
- Rules: Optional markdown-formatted rules text

**Leaderboard Display:** Shows all individual score submissions (arcade-style), not just best scores per participant. If a player has multiple top scores, they can occupy multiple positions on the leaderboard (e.g., ranks 1, 3, and 7). This creates the classic arcade game high score experience where dedication is rewarded with board dominance.

**Score Flexibility:** Scores support both decimal values (e.g., 98.5 for Bowling) and negative values (e.g., -5 for golf relative to par) to accommodate diverse game types.

**ELO Calculation:** No (leaderboard ranking only).

**Examples:** Pacman, arcade games, most pushups in 1 minute, fastest mile run, typing speed test, Nerf basketball high score, paper airplane distance, waste bin toss streak, darts 501 high score, Bowling (decimal scores), Golf (negative scores relative to par)

### 3.4 Game Type Templates

The app provides 15 pre-built templates for common games. League managers can use these templates to quickly create game types with sensible defaults, then customize as needed.

**Available templates:**

- **H2H:** Ping Pong, 8-Ball Pool, 9-Ball Pool, Foosball, Chess, Beer Pong, Darts
- **FFA:** Mario Kart, Poker, Bowling, Golf
- **High Score:** Pac-Man, Arcade Game, Fastest Mile, Push-ups

_Future: Community-shared templates._

### 3.5 Game Type Editing Rules

After creation, game types can have their name and logo edited. However, if the fundamental rules need to change (scoring type, score order, etc.), a new game type must be created to preserve historical data integrity.

Game types can be **archived** (hidden from new matches but history preserved) or **deleted** (permanently removed). Archived game types can be unarchived.

Archiving a game type hides it from:

- Match recording, high score submission, and challenge creation (blocked at the service layer)
- Activity feeds and match history
- Leaderboards overview
- Game type filter dropdowns

Existing historical data for archived game types is preserved but not displayed in feeds or listings.

---

## 4. Matches & Scoring

### 4.1 Recording Matches

Members can record match results in two ways:

**Direct Recording:** Any member can record a completed match at any time by selecting the game type, participants, and entering the result.

**Challenge System:** Members can challenge other individual members (real authenticated users only) to a Head-to-Head game, creating a pending match. The challenged party can accept or decline. The challenger can cancel pending challenges. Once accepted, either party can record the result. Challenges are only available for H2H game types. Placeholder members and teams cannot participate in challenges, since they cannot receive notifications. Team-based challenges may be added in the future with proper notification support.

### 4.2 Match Data Captured

- Date and time played (defaults to now, backdating allowed)
- Game type
- Participants (individuals, teams, or placeholder members)
- Result (winner/loser, scores, or rankings depending on game type)
- Draw indicator (if applicable)
- Recorder (who submitted the result)
- Scores support decimal values (e.g., 21.5) and negative values (e.g., -3) to accommodate diverse game types

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

**For H2H and FFA games (ELO standings):**

- ELO rating and rank position
- Number of matches played
- Provisional indicator for players with fewer than 10 matches
- Rank badges (gold, silver, bronze for top 3)

**For High Score games (leaderboards):**

- Arcade-style leaderboard showing all individual score submissions
- Rank badges (gold, silver, bronze for top 3)
- Score value with appropriate label
- Time period filtering (week, month, year, all-time)

_Future: Overall win/loss/draw record, win percentage, current streak, recent form (last 10 games)_

### 6.2 High Score Leaderboards

High Score Challenge leaderboards display all individual score submissions in descending order (or ascending for "lowest wins" games). The same participant can appear multiple times if they have multiple top scores, creating a classic arcade-style leaderboard where skill and dedication are rewarded with board dominance.

Each leaderboard entry shows:

- Rank position with special highlighting for top 3 (gold, silver, bronze)
- Participant avatar, name, and username
- Score value with appropriate label (points, time, etc.)
- Date achieved
- Time period filter (week, month, year, all-time)

Personal statistics show the user's best score and their best rank position.

### 6.3 Filtering Options

High score leaderboards can be filtered by time period: This week, this month, this year, all-time.

_Future: Individual vs Team filtering for all standings._

### 6.4 Head-to-Head Records

_Future feature._ Users will be able to view their personal record against any specific opponent, including win/loss breakdown and recent matches.

### 6.5 Personal Stats Page

_Future feature._ Each user will have a personal stats page showing their performance across all game types in the league, including overall records and rivalries (frequent opponents).

### 6.6 League-Wide Stats

_Future feature._ The league dashboard will show aggregate statistics:

- Total matches played
- Most active players
- Most popular game types
- Recent activity feed

---

## 7. Tournaments

### 7.1 Tournament Overview

Tournaments are structured bracket competitions using any game type as the match format. Managers create tournaments, set the format, and manage progression. Multiple tournament types are supported to accommodate different competition styles.

### 7.2 Tournament Types

- **Single Elimination:** Standard bracket where losers are eliminated. Supports bye handling for non-power-of-2 participant counts.
- **Swiss:** Non-elimination format where participants play a fixed number of rounds against opponents with similar scores. Standings based on Swiss points (Win=1, Draw=0.5, Loss=0) with Buchholz tiebreaking. Round 1 paired alphabetically; subsequent rounds paired by standings. Round count defaults to ⌈log₂(N)⌉ but can be overridden by the organizer.
- **Group Play → Single Elimination:** Participants are divided into groups for a round-robin phase. Top finishers from each group advance to a single elimination bracket. _(Future)_
- **Series:** A best-of-X series between two participants (individuals or teams), such as best of 3, best of 5, or best of 7. The first participant to win the majority of games wins the series. _(Future)_

_Future: Round Robin (standalone), Double Elimination_

### 7.3 Tournament Configuration

- Name and optional logo
- Tournament type: Single Elimination, Swiss, Group Play → Single Elimination _(Future)_, Series _(Future)_
- Match format: Default best-of-X for all rounds (e.g., best of 1, best of 3, best of 5), with optional per-round overrides (e.g., Round 1 = Bo1, Semifinals = Bo3, Finals = Bo5) — applies to Single Elimination and Group Play types. Best-of values must be odd numbers (1, 3, 5, 7, 9).
- Variation: Single game type for all rounds, or different game types per round
- Participant type: Individuals or Teams
- Seeding: Manual or Random
- Start date/time (manager-specified)

_Future: ELO-based seeding_

### 7.4 Tournament Formats

**Single Elimination** and **Swiss** are the currently supported formats. Single elimination uses a standard bracket where losers are eliminated, with bye handling for non-power-of-2 participant counts. Swiss is a non-elimination format where all participants play every round, paired against opponents with similar records.

### 7.5 Tournament Operations

- Bracket generation handles byes automatically for non-power-of-2 counts
- Matches can be scheduled within the tournament
- No-shows are recorded as losses (forfeit)
- Tournaments can span any period of time (no time limits per round)
- Tournaments can be deleted regardless of status (draft, in progress, or completed). Deleting a tournament also removes all related matches and scores. For completed tournaments that awarded placement points, those points are reverted.

### 7.6 ELO Impact

Tournament matches affect ELO ratings the same as regular matches. There is no separate tournament ELO.

---

## 8. Events

### 8.1 Event Overview

Events are independent, top-level entities (separate from leagues) for running time-bounded, multi-game competitions. Events have their own participants, game types, teams, and point-based leaderboards. Think "Game Night Tournament" or "Office Olympics" — events aggregate multiple competitions (H2H matches, FFA matches, high score sessions, tournaments) into a unified team-based standings.

Events are completely separate from leagues. They have their own participant system, game types, and match recording. No data is shared between events and leagues. Only participants that are members of teams can take part in matches, FFA, high score, and tournaments. Participant teams should be visible when viewing that participant throughout the UI.

The current focus is on team-based events, but the architecture is not tightly coupled to this to allow for individual-based events in the future.

### 8.2 Event Lifecycle

Events follow a three-phase lifecycle:

1. **Draft:** Set up game types, create teams, invite participants, assign participants to teams. Game types can only be added during draft.
2. **Active:** Record matches, run high score sessions, run tournaments. All activities earn points toward the event leaderboard.
3. **Completed:** Event is finished. Leaderboard is frozen. Historical data preserved for reference.

Organizers can reopen completed events (transition back to Active) if additional activity needs to be recorded.

### 8.3 Event Participants & Roles

Events have two roles (referred to as "participants" in the UI, not "members"):

| Permission                      | Participant | Organizer |
| ------------------------------- | ----------- | --------- |
| View event                      | ✓           | ✓         |
| Submit own high scores          | ✓           | ✓         |
| Record own matches              | ✓           | ✓         |
| Record matches for others       |             | ✓         |
| Submit high scores for others   |             | ✓         |
| Delete own matches & scores     | ✓           | ✓         |
| Delete others' matches & scores |             | ✓         |
| Manage game types               |             | ✓         |
| Manage teams                    |             | ✓         |
| Manage participants             |             | ✓         |
| Open/close high score sessions  |             | ✓         |
| Create tournaments              |             | ✓         |
| Invite participants             |             | ✓         |
| Manage placeholders             |             | ✓         |
| Promote to organizer            |             | ✓         |
| Start/complete/reopen event     |             | ✓         |
| Edit/archive/delete event       |             | ✓         |

The event creator is automatically assigned the Organizer role.

### 8.4 Event Configuration

- Name and optional logo (uses event icon set)
- Description (optional)
- Start date (optional)
- Visibility: Private only (invite-only via invite link or direct invite). Schema supports future public events.
- Scoring type: Team only (schema supports future individual scoring)

### 8.5 Event Game Types

Events define their own game types independently from leagues. Supports the same three categories:

- **Head-to-Head (H2H):** Same configuration as league H2H game types
- **Free-for-All (FFA):** Same configuration as league FFA game types
- **High Score:** Same configuration as league High Score game types

Game types can only be added during the draft phase. They can be archived but not deleted.

### 8.6 Event Teams

Organizers create teams and assign participants (real users or placeholder members) to teams. Participants can only be on one team per event. Teams have a name and optional logo. Organizers can edit team details and delete teams.

### 8.7 Event Point Configuration

Points are set per-activity at recording time, not as pre-defined rules:

- **H2H matches:** Win points, loss points, and optional draw points set at recording time. These are optional — matches don't need points associated with them.
- **FFA matches:** Per-placement points set at recording time alongside ranks/scores. These are optional.
- **High scores:** Optional placement point config set when opening a session, applied when closing.
- **Tournaments:** Optional placement point config set at creation, applied when tournament completes.

This approach gives maximum flexibility — the same event can award different point values for different matches.

### 8.8 Event Match Recording & Deletion

**Recording:** Both organizers and participants can record H2H and FFA matches. Participants can only record matches they are personally involved in; organizers can record matches for anyone.

**Deletion:** Matches can be deleted. The same self-only restriction applies — participants can only delete matches they are involved in; organizers can delete any match. When a match is deleted, associated point entries are removed from the leaderboard.

_Future: Match editing (modify results after recording, with point recalculation)._

### 8.9 Event High Score Sessions

High scores in events work through a session-based flow:

1. **Organizer opens a session** for a specific high score game type, optionally configuring placement point awards
2. **Participants submit their own scores** to the open session. Organizers can submit scores on behalf of any participant.
3. **Organizer closes the session** — scores are ranked and placement points (if configured) are awarded to the submitters' teams

**Deletion:** Individual high score entries can be deleted. Participants can only delete their own entries; organizers can delete any entry.

_Future: High score entry editing (modify scores after submission)._

### 8.10 Event Scoring

Team-based scoring only (for now):

- Match results (H2H wins, FFA placements) earn points for the participating teams
- High score session closures award placement points to submitters' teams
- Tournament completions award placement points to participating teams
- Discretionary awards give organizers ad-hoc bonus/penalty points for teams
- Points are tracked per-team with category labels (h2h_match, ffa_match, high_score, tournament, discretionary)
- Points are removed when matches/entries/awards are deleted
- Point entries store individual participant info (userId or placeholder participant) where applicable, enabling individual attribution in analytics:
  - **H2H matches:** Individual stored when exactly one participant per team on a side; null for multi-participant teams
  - **FFA matches:** Individual stored per participant (entries are per-participant)
  - **High scores:** Individual who achieved the best placement for their team is stored
  - **Tournaments:** Individual tournament participant is stored
  - **Discretionary:** Team-level only (recipients schema only has team IDs)

No ELO ratings in events — points only.

### 8.11 Discretionary Points

Organizers can award ad-hoc bonus (or penalty) points to teams outside of normal match/tournament/high-score flows. This supports recognizing sportsmanship, penalizing rule violations, awarding participation bonuses, or any other scenario the organizer deems fit.

**Discretionary Award Properties:**

- Name (required, max 100 characters)
- Description (required, max 500 characters)
- Points value (positive for bonuses, negative for penalties — supports decimals)
- Recipients: One or more teams (up to 50)

**How it works:**

- Only organizers can create, edit, and delete discretionary awards
- Awards can only be created/edited when the event is active
- Each selected recipient team receives the specified points as a point entry (category: discretionary, outcome: award)
- When an award is edited (points or recipients changed), existing point entries are deleted and re-created
- Deleting an award cascades to remove its point entries from the leaderboard
- All participants can view discretionary awards

_Future: Support awarding discretionary points to individual participants (resolved to their team) in addition to direct team selection._

### 8.12 Event Leaderboard

The event leaderboard shows:

- Teams ranked by total accumulated points
- Per-game-type leaderboards for high score game types (individual-based, showing participant name and team)
- Historical events preserved for reference after completion

### 8.13 Event Metrics Dashboard

The event homepage displays a rich analytics dashboard for all participants, built with Recharts. The dashboard shows the following visualizations (only displayed when point data exists, zero-point entries are excluded):

**Standings Bar Chart:** Horizontal bar chart showing teams ranked by total points with team colors.

**Points Over Time:** Line chart showing cumulative point totals per team over time. Each data point is a clickable dot that opens a popover showing the scoring entry details (team, category, outcome, points change) with a link to the relevant match/tournament/discretionary page. The Y-axis includes padding above the highest value to prevent dots from being cut off.

**Team Share Pie Chart:** Donut chart showing each team's share of total points, colored by team color.

**Top Contributors / Points by Category:** When individual participant data is available on point entries, shows a "Top Contributors" pie chart with each contributor in a distinct color (tooltip shows team affiliation). When no individual data is available, falls back to a "Points by Category" donut chart showing the distribution across H2H, FFA, High Score, Tournament, and Discretionary categories.

**Scoring History Log:** Reverse-chronological list of all scoring events. Each entry shows category badge, outcome badge, team color badge, individual name (when available), point value (color-coded: green for positive, red for negative), relative timestamp, and a link icon to the relevant match/tournament/discretionary detail page. Paginated with "Show more" (10 entries at a time).

### 8.14 Event Placeholder Members

Events support placeholder members (same concept as leagues) for tracking participants who haven't signed up yet. Placeholders can be assigned to teams and participate in matches.

### 8.15 Event Invitations

Events are private and invite-only. Organizers can:

- **Invite users directly** via in-app search
- **Generate invite links** that can be shared externally

Invite links handle the same scenarios as league invite links (authenticated, non-authenticated users).

### 8.16 Event Tournaments

Events support single elimination tournaments with individual participants (representing their teams). Tournament matches earn points for the event leaderboard. Optional placement point config awards bonus points when the tournament completes.

**Best-of Series:** Each tournament round can have its own best-of setting (e.g., early rounds Bo1, semifinals Bo3, finals Bo5). Individual games within a series are tracked, and a winner is automatically determined when one side reaches the win threshold (e.g., 2 wins in a Bo3). A default best-of applies to all rounds, with optional per-round overrides configurable during the draft phase.

**Recording:** Both organizers and participants can record tournament match results. Participants can only record results for matches they are involved in. In a best-of series, each game is recorded individually and the series advances automatically when one side clinches.

**Undo:** Tournament match results can be undone (reverted). For best-of series, undoing removes the most recent game. If the series-deciding game is undone, the winner is un-advanced and the loser is un-eliminated. Undo is blocked if a subsequent match further down the bracket has already been played.

_Future: Tournament match editing (modify results in-place without undo)._

### 8.17 Future Event Enhancements

- Public events (discoverable and open to join)
- Individual scoring mode (no teams required)
- Discretionary points for individual participants (resolved to their team)
- Event templates for common formats

---

## 9. User Features

### 9.1 Authentication

Supported sign-in methods:

- Google Sign-In
- Apple Sign-In (stretch goal, non-MVP)
- Discord Sign-In
- Magic Link Email (stretch goal, non-MVP)

### 9.2 Profile Attributes

- **Username:** Unique identifier (3-30 characters, alphanumeric with underscores/hyphens, auto-lowercased). Auto-generated during sign-up.
- **Display name:** Human-readable name (1-100 characters)
- **Profile picture:** Selected from a set of predefined avatar options (not uploaded)
- **Bio:** Optional (max 500 characters)
- **isAdmin:** Admin flag for app-level administration

### 9.3 Profile Visibility

Profiles are only visible to members of the same leagues. Non-league members cannot see your profile.

### 9.4 Account Deletion

Users can delete their account via a confirmation flow (must type "DELETE" to confirm). Upon deletion, the account is soft-deleted and anonymized: name becomes "Deleted User", email and username are replaced with deleted placeholders, bio and image are removed. All sessions and OAuth accounts are hard-deleted. Match history, rankings, and statistics are preserved to maintain league data integrity. Deleted users cannot create new sessions.

### 9.5 Profile Editing

On initial sign-in, a username is auto-generated from the user's name and email. Profile attributes (username, display name, avatar, bio) can be edited at any time via the profile page. Username changes include real-time availability checking.

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

- League name or description (case-insensitive)
- Game type name

Search results display league name, description, game type badge, member count, and whether the user is already a member. Results are limited to 20.

### 10.4 Inviting Members

Managers and Executives can invite users to the league via two methods:

**In-App Invitation:** Search for existing users by name or username and send them an invitation directly. The invitee will see the invitation in their notifications.

**Invite Link:** Generate a shareable invite link that can be sent via any channel (email, text, etc.). The link handles three scenarios:

- **Authenticated user:** Shows the league details and allows them to join immediately
- **Unauthenticated user with existing account:** Prompts sign-in, then shows league details and allows joining
- **New user without account:** Prompts sign-up flow, then automatically joins the league upon completion

Invitations specify the role (Member, Manager, or Executive). When inviting, an existing placeholder member can be linked so the invitee inherits their history upon joining. Invite links can be configured to expire after a set time or number of uses.

### 10.5 Managing Members

- Executives can change member roles and remove members
- Managers can remove members but not change roles
- Any member can leave the league
- Members can be suspended (temporary, up to 30 days) preventing match recording, score submission, challenge acceptance, and reporting
- Suspensions can be lifted early by moderators
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
- Warn the member (recorded in their history, visible to league leadership; member must acknowledge)
- Suspend member (temporary, max 30 days - cannot record matches, submit scores, accept challenges, or create reports)
- Lift suspension early (manual override by moderator)
- Remove member (permanently kicked from league)

Moderators cannot take action against members with equal or higher roles, or moderate their own reports.

**Audit Trail:**

- All reports and remediation actions are logged with timestamps
- Members can see warnings and actions taken against them (and must acknowledge warnings)
- Leadership can view a member's full offense history when reviewing new reports

---

## 11. Notifications

### 11.1 MVP Notifications (In-App Only)

- Challenge received
- Invited to a league
- Invited to a team
- Moderation action taken against you (warning, suspension, removal)

### 11.2 Future Notifications

- Match result recorded involving you
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

Profile pictures are selected from predefined avatar SVG options. League logos, game type logos, and team logos reference SVG icon paths stored as text in the database. _Future: Blob storage for user-uploaded images._

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

### Phase 1: Foundation (Complete)

1. ~~Authentication (Google, Discord)~~
2. ~~User profiles (with predefined avatars, bio, real-time username availability)~~
3. ~~League creation and management~~
4. ~~Member management (including placeholder members)~~
5. ~~Role-based permissions~~
6. ~~Moderation system (reporting, warnings, suspensions, removal)~~
7. ~~Usage limits with admin override system (DB-level overrides, no admin UI yet)~~

### Phase 2: Core Gameplay (Complete)

1. ~~Game type creation (H2H, FFA, High Score)~~
2. ~~Game type templates (15 pre-built templates)~~
3. ~~Match recording (direct and via challenges)~~
4. ~~ELO calculations (H2H and FFA with provisional periods)~~
5. ~~Standings and leaderboards (ELO standings + arcade-style high score boards)~~
6. ~~Team management (registered teams with roles, invitations, and invite links)~~

### Phase 2.5: UX Simplification (Complete)

1. ~~Remove `/dashboard`, make `/leagues` the default landing page for authenticated users~~
2. ~~Add league sub-navigation tabs (Home, Activity, Leaderboards, People + Manage for managers)~~
3. ~~League-level Leaderboards page showing all game type standings in one view~~
4. ~~Quick-action buttons on league home (Record Match, Submit Score, Challenge) with game type dropdown~~
5. ~~Recent match activity on league home page~~
6. ~~Responsive navigation: desktop dropdown nav for leagues, mobile drawer nav~~
7. ~~Dialog-based match recording and challenge creation (inline on league pages)~~

### Future Dashboard Vision

When `/dashboard` returns, it should show cross-league personal data:

- **Your Recent Activity**: Last 10 matches/scores across all leagues
- **Your Rankings**: Current rank and ELO in each game type you play, across leagues
- **Pending Challenges**: All pending challenges across all leagues
- **Performance Summary**: Overall W/L/D record, win rate trends
- **League Quick Access**: Cards for each league with activity indicators

### Phase 3: Tournaments (Complete)

1. ~~Single Elimination tournaments (MVP tournament type)~~
2. ~~Bracket management and bye handling~~
3. ~~Tournament history~~
4. ~~Per-round best-of configuration (e.g., Round 1 = Bo1, Finals = Bo5)~~
5. ~~Team-based tournament support (individuals on teams for multi-player game types)~~
6. ~~Swiss-style tournaments (non-elimination, points-based standings with Buchholz tiebreaking)~~
7. ~~Tournament deletion regardless of status with match/score cleanup~~
8. _Future: Group Play → Single Elimination, Series, Round Robin, Double Elimination, optional 3rd place match_

### Phase 4: Enhanced Stats & Records

1. Per-game-type detailed stats (win/loss/draw record, win percentage, streaks, recent form)
2. Head-to-head records between opponents
3. Personal stats page (performance across all game types in a league)
4. League-wide aggregate stats (most active players, popular game types)
5. Ad-hoc teams for one-off match groupings
6. Admin UI for managing usage limit overrides

### Phase 5: Events (Complete)

1. ~~Independent event entity (separate from leagues) with own participants, game types, teams~~
2. ~~Event lifecycle: Draft → Active → Completed (with reopen capability)~~
3. ~~Two-role participant system: Organizer + Participant~~
4. ~~Team-based scoring with point-based leaderboards (no ELO)~~
5. ~~H2H match recording, FFA match recording, high score sessions~~
6. ~~Match and high score deletion with self-only restriction for participants~~
7. ~~Per-activity point configuration (set at recording time), removed on delete~~
8. ~~High score session flow (open → submit → close with optional placement points)~~
9. ~~Event tournaments (single elimination, individual participants representing teams)~~
10. ~~Tournament match undo with downstream bracket protection~~
11. ~~Per-round best-of series configuration with individual game tracking~~
12. ~~Event invitations (direct invite + invite links, private events only)~~
13. ~~Placeholder member support~~
14. ~~Top-level navigation (Events alongside Leagues in header)~~
15. ~~Per-game-type individual leaderboards for high score game types~~
16. ~~Discretionary points — organizers can award ad-hoc bonus/penalty points to teams~~
17. ~~Event metrics dashboard — standings bar chart, points over time (clickable), team share pie chart, top contributors/category breakdown pie chart, scoring history log with detail links~~
18. ~~Individual participant tracking on point entries for analytics attribution~~

### Post-MVP Features

- Additional tournament types (Group Play → Single Elimination, Series, Round Robin, Double Elimination)
- ELO-based tournament seeding
- Match dispute/confirmation system
- Match result notifications
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
- Uploaded profile pictures (replacing predefined avatars)
- Apple Sign-In
- Magic Link Email authentication
- Public events (discoverable and open to join)
- Individual scoring mode for events (no teams required)
- Event templates for common formats

---

## 14. Future Monetization

### 14.1 Monetization Philosophy

The app will launch with all features available but with usage limits clearly communicated. Users will understand from the start that a paid tier will eventually exist, avoiding any “rug pull” perception. The free tier is designed to be genuinely useful for casual friend groups while the paid tier unlocks scale for larger, more active communities.

### 14.2 Freemium Model

**Free Tier:**

- Up to 3 leagues (as creator or member)
- Up to 20 active members per league (placeholder members do not count toward this limit)
- Up to 20 game types per league
- Full access to all features: tournaments, events, all game types, full stats
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
