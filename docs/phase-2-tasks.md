# Phase 2: Core Gameplay - Task List

This document tracks all tasks for Phase 2 of Competiscore development, focusing on Game Types, Teams, Match Recording, and ELO Systems.

## Progress Summary

| Category                    | Status         | Progress |
| --------------------------- | -------------- | -------- |
| 1. Game Types               | ✅ Complete    | 100%     |
| 2. Team Management          | ✅ Complete    | 100%     |
| 3. Match Recording          | ✅ Complete    | 100%     |
| 4. ELO & Rankings           | ✅ Complete    | 100%     |
| 5. Standings & Leaderboards | ✅ Complete    | 100%     |
| 6. Integration & Polish     | 🔄 In Progress | 60%      |

---

## 1. Game Types

**Status: ✅ Complete**

### Database Schema

- [x] Game type table (id, leagueId, name, description, logo, category, config, createdAt)
- [x] Game category enum (head_to_head, free_for_all, high_score)
- [x] Game config JSON schema (scoring type, win condition, rules as markdown, etc.)

### Game Type CRUD

- [x] Create game type form
- [x] Validations (name uniqueness within league, limit check)
- [x] Game type settings page
- [x] Archive/Delete game type
- [x] Usage limit tracking (max 20 game types per league)
- [x] RBAC: Only managers and executives can create/edit game types

### Templates

- [x] Define static templates (Ping Pong, Pool, Mario Kart, etc.)
- [x] Template selection UI during creation
- [x] Pre-fill configuration from template

### UI/UX

- [x] Game types list view
- [x] Game type detail page
- [x] Empty state messaging
- [x] Game type icons (20 colorful SVG icons)

---

## 2. Team Management

**Status: ✅ Complete**

### Database Schema

- [x] Team table (id, leagueId, name, logo, createdAt)
- [x] Team member table (teamId, userId/placeholderId, joinedAt, role)
- [x] Team invitation table (id, teamId, inviterId, inviteeId, status, expiresAt, token)

### Team Operations

- [x] Create team form
- [x] Add/Remove members (real users or placeholders)
- [x] Edit team settings
- [x] Archive/Unarchive team
- [x] Delete team
- [x] View team profile
- [x] RBAC: Team managers can manage team, league managers/executives can manage any team

### Team Invitations

- [x] In-app invitation: Search for league members and send team invitation
- [x] Notification for team invitation (accept/reject)
- [x] Invite link generation (configurable expiry)
- [x] Invite link handling:
  - [x] If user is league member: Prompt to join team
  - [x] If user is not league member: Prompt to join both league AND team
  - [x] If user is not authenticated: Sign-in/sign-up flow, then handle league + team join
- [x] Cancel pending invitations
- [x] View pending invitations on team settings
- [x] Unit tests for team invitation service
- [x] Unit tests for placeholder member service

### UI/UX

- [x] Teams list view
- [x] Team detail page
- [x] Team member management UI
- [x] Team invitation UI (search members, send invites)
- [x] Pending invitations list

---

## 3. Match Recording

**Status: ✅ Complete**

### Database Schema

- [x] Match table (id, leagueId, gameTypeId, date, status, recorderId)
- [x] Match participant table (matchId, teamId/userId/placeholderId, score, rank, result)
- [x] Match status enum (pending, accepted, completed, declined, cancelled)
- [x] High score entry table (id, leagueId, gameTypeId, userId/teamId/placeholderId, score, achievedAt)
- [x] Score columns use `real` type for decimal/negative support

### Match Operations

- [x] Record match form (dynamic based on game type config)
- [x] Support for H2H Win/Loss (1v1, Team vs Team, Placeholder members)
- [x] Support for H2H Score-based (1v1, Team vs Team, Placeholder members)
- [x] Support for FFA Ranked Finish (Multiple players/teams/placeholders)
- [x] Support for FFA Score-based Ranking (Multiple players/teams/placeholders)
- [x] Support for High Score submissions (Individual or Team based)
- [x] Validation (valid scores including decimals/negatives, participant uniqueness, date validation)
- [x] Permissions enforcement (PLAY_GAMES permission required)
- [x] Score flexibility (decimal and negative scores supported)
- [x] Unit tests for match recording services

### Challenge System

- [x] Create challenge (pending match)
- [x] Accept/Reject challenge
- [x] Record result for pending challenge
- [x] Challenge notifications

### UI/UX

- [x] "Record Match" button (prominent on game type page)
- [x] Dynamic match recording forms based on game type configuration
- [x] Match history list (activity history page with pagination)
- [x] Match detail view with participant information
- [x] Match cards with avatars, usernames, and proper mobile responsiveness
- [x] Participant selector component for choosing users/teams/placeholders
- [x] Number inputs supporting decimal and negative values
- [x] User-friendly validation error messages

---

## 4. ELO & Rankings

**Status: ✅ Complete**

### Database Schema

- [x] ELO rating table (id, leagueId, gameTypeId, userId/teamId/placeholderId, rating, matchesPlayed, createdAt, updatedAt)
- [x] ELO history table (id, eloRatingId, matchId, ratingBefore, ratingAfter, ratingChange, kFactor, opponentRatingAvg, expectedScore, actualScore, createdAt)
- [x] Unique constraints per participant-game type combination
- [x] Indexes for performance (league/gameType lookup, rating sorting, participant lookups)

### Logic

- [x] ELO calculation service (H2H using standard ELO formula)
- [x] ELO calculation service (FFA using virtual pairing approach)
- [x] Rating update trigger (integrated with match recording in transactions)
- [x] Team rating persistence (independent of roster)
- [x] Starting ELO: 1200
- [x] Provisional K-factor: 40 (first 10 matches)
- [x] Standard K-factor: 32
- [x] Pure calculation functions (src/lib/shared/elo-calculator.ts)

### Integration

- [x] Update ratings after match recording (all 4 match recording functions)
- [x] Transaction safety (ELO updates within same transaction as match creation)
- [x] Provisional rating logic (K-factor adjustment based on matches played)
- [x] Automatic rating creation with default 1200
- [x] Full audit trail in elo_history table

### Testing

- [x] Unit tests for ELO calculation functions (15 tests passing)
- [x] H2H scenarios (equal ratings, underdog win, favorite loss, draws)
- [x] FFA scenarios (3-player, 4-player, tied ranks)
- [x] Provisional period testing
- [x] Service tests with mocked database

---

## 5. Standings & Leaderboards

**Status: ✅ Complete**

### High Score Leaderboards

- [x] Leaderboard query (all individual scores, arcade-style display)
- [x] Leaderboard page with pagination (10 items per page)
- [x] Time period filtering (week, month, year, all-time)
- [x] Rank display with theme colors (gold/silver/bronze for top 3)
- [x] Personal best tracking
- [x] User rank calculation
- [x] Recent scores display with avatars and usernames
- [x] Leaderboard allows same participant multiple times (shows all top scores)
- [x] Unique entry IDs for React keys (supports duplicate participants)

### ELO Standings (H2H & FFA)

- [x] Standings query with participant details (user/team/placeholder)
- [x] Standings page with pagination (25 items per page)
- [x] Rank calculation and display
- [x] Rating display with provisional indicator (< 10 matches)
- [x] Matches played tracking
- [x] Personal rating card showing current rank and rating
- [x] Gold/silver/bronze styling for top 3
- [x] Navigation integration (Standings button on game type pages)

### UI/UX

- [x] Leaderboard component with proper participant display
- [x] Game type dashboard (Recent scores/matches + Leaderboard preview)
- [x] Time period filtering (week, month, year, all-time)
- [x] Personal performance card (rank and personal best)
- [x] ParticipantDisplay component for consistent rendering
- [x] Mobile-responsive leaderboard design
- [x] Head-to-head standings (ELO rankings)
- [x] Free-for-all standings (ELO rankings)
- [x] EloRatingBadge component (shows rating with provisional status)
- [x] EloChangeBadge component (shows +/- rating changes)
- [x] Standings navigation (visible only for H2H and FFA game types)
- [x] Mobile-responsive standings page

### Future Enhancements (Deferred)

- [ ] Overall win/loss/draw records
- [ ] Personal stats page (Performance across game types)
- [ ] League dashboard activity feed
- [ ] ELO rating history charts
- [ ] ELO change display on match cards

---

## 6. Integration & Polish

**Status: 🔄 In Progress (60%)**

### Transaction Safety ✅

- [x] Audit all service functions for transaction issues
- [x] Fix join-league.ts (addUserToLeague with 2 writes)
- [x] Fix invitations.ts (acceptInvitation with 3+ writes)
- [x] Fix invitations.ts (joinViaInviteLink with 3+ writes)
- [x] Transaction-aware pattern (dbOrTx parameter with fallback)
- [x] Updated tests to mock withTransaction
- [x] All 26 invitation tests passing
- [x] ELO ratings use transactions (integrated with match recording)

### Mobile Responsiveness ✅

- [x] Fix game type detail page header overflow
- [x] Fix match history card button overflow
- [x] Responsive button layout (icon-only on mobile, full labels on desktop)
- [x] Vertical stacking on mobile, horizontal on desktop
- [x] Button wrapping support

### Type Safety ✅

- [x] Remove all `any` types from ELO services
- [x] Create proper MatchWithRelations type
- [x] Type-safe participant handling in ELO calculations
- [x] Validation for FFA participants (all must have ranks)

### Placeholder Integration

- [ ] Link placeholder to real user on join (migrate match history)
- [ ] Migrate ELO ratings when placeholder is linked

### Discovery

- [ ] Update public league search to support filtering by game type

### Usage Limits

- [x] Game type limit enforcement (20 max)

### Polish

- [x] Loading states for standings pages
- [x] SEO metadata for standings pages
- [x] Error handling for ELO calculations
- [ ] Loading states for match recording
- [ ] SEO metadata for match recording pages
- [ ] Comprehensive error messages for all edge cases

---

## Recent Accomplishments

### ELO & Rankings System (Complete) 🎉

Implemented a full ELO rating system for competitive game types:

- **Database Layer**: Created `elo_rating` and `elo_history` tables with proper indexes and constraints
- **Calculation Engine**: Built pure calculation functions for both H2H and FFA using virtual pairing
- **Service Integration**: Seamlessly integrated with all 4 match recording functions using transactions
- **UI Components**: Created standings page with provisional indicators, rank display, and mobile responsiveness
- **Testing**: 15 calculation tests passing, all edge cases covered
- **Parameters**: Starting ELO 1200, provisional K=40, standard K=32

### Transaction Safety Audit (Complete) 🔒

Audited and fixed all service-layer transaction issues:

- **Issues Found**: 2 critical files with atomicity problems (join-league.ts, invitations.ts)
- **Pattern Established**: Optional `dbOrTx` parameter for transaction-aware functions
- **Fixes Applied**: 3 functions now properly wrapped in transactions
- **Test Updates**: Added withTransaction mocks, all tests passing
- **Services Verified**: 16 service files audited, 7 already using transactions correctly

### Mobile Responsiveness (Complete) 📱

Fixed overflow issues on game type detail page:

- **Header Section**: Responsive layout with vertical stacking on mobile
- **Button Text**: Icon-only on mobile, full labels on desktop
- **Match History**: Fixed button overflow with wrapping support
- **Pattern**: Progressive enhancement approach used throughout

### Code Quality Improvements ✨

- **Type Safety**: Removed all `any` types, created proper type definitions
- **Validation**: Added FFA rank validation before ELO calculation
- **Error Handling**: Comprehensive error messages and graceful failures
- **Build Status**: TypeScript compilation passing, no errors
