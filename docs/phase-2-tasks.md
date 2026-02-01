# Phase 2: Core Gameplay - Task List

This document tracks all tasks for Phase 2 of Competiscore development, focusing on Game Types, Teams, Match Recording, and ELO Systems.

## Progress Summary

| Category                    | Status         | Progress |
| --------------------------- | -------------- | -------- |
| 1. Game Types               | ✅ Complete    | 100%     |
| 2. Team Management          | ✅ Complete    | 100%     |
| 3. Match Recording          | 🔄 In Progress | 75%      |
| 4. ELO & Rankings           | ⏳ Not Started | 0%       |
| 5. Standings & Leaderboards | 🔄 In Progress | 40%      |
| 6. Integration & Polish     | ⏳ Not Started | 0%       |

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

**Status: 🔄 In Progress (75%)**

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
- [ ] Accept/Reject challenge
- [ ] Record result for pending challenge
- [ ] Challenge notifications

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

**Status: ⏳ Not Started**

### Database Schema

- [ ] Rating table (entityId, entityType, gameTypeId, rating, matchCount, winCount, lossCount, drawCount)
- [ ] Rating history table (ratingId, matchId, oldRating, newRating, change)

### Logic

- [ ] ELO calculation service (H2H)
- [ ] ELO calculation service (FFA/Multiplayer)
- [ ] Rating update trigger (on match completion)
- [ ] Team rating persistence (independent of roster)

### Integration

- [ ] Update ratings after match recording
- [ ] Handle rating decay (optional/deferred)
- [ ] Provisional rating logic (K-factor adjustment)

---

## 5. Standings & Leaderboards

**Status: 🔄 In Progress (40%)**

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

### UI/UX

- [x] Leaderboard component with proper participant display
- [x] Game type dashboard (Recent scores/matches + Leaderboard preview)
- [x] Time period filtering (week, month, year, all-time)
- [x] Personal performance card (rank and personal best)
- [x] ParticipantDisplay component for consistent rendering
- [x] Mobile-responsive leaderboard design
- [ ] Head-to-head standings (ELO rankings)
- [ ] Free-for-all standings (ELO rankings)
- [ ] Overall win/loss/draw records
- [ ] Personal stats page (Performance across game types)
- [ ] League dashboard activity feed

---

## 6. Integration & Polish

**Status: ⏳ Not Started**

### Placeholder Integration

- [ ] Link placeholder to real user on join (migrate match history)

### Discovery

- [ ] Update public league search to support filtering by game type

### Usage Limits

- [ ] Enforce game type limits (20 max)

### Polish

- [ ] Loading states for new pages
- [ ] SEO metadata for new pages
- [ ] Error handling for match recording
