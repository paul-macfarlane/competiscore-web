# Phase 1: Foundation - Task List

This document tracks all tasks for Phase 1 of Competiscore development based on the [Product Vision](./product-vision.md).

## Progress Summary

| Category                        | Status         | Progress |
| ------------------------------- | -------------- | -------- |
| 1. Authentication               | ✅ Complete    | 100%     |
| 2. User Profiles                | ✅ Complete    | 100%     |
| 3. League Creation & Management | 🚧 In Progress | 95%      |
| 4. Member Management            | ✅ Complete    | 100%     |
| 5. Role-Based Permissions       | ✅ Complete    | 100%     |
| 6. Moderation System            | ✅ Complete    | 100%     |
| 7. Usage Limits                 | 🚧 In Progress | 0%       |

---

## 1. Authentication (Google, Discord)

**Status: ✅ Complete**

- [x] Set up Better Auth library
- [x] Google OAuth sign-in
- [x] Discord OAuth sign-in
- [x] Session management
- [x] Sign out functionality
- [x] Auth route handler (`/api/auth/[...all]`)

---

## 2. User Profiles

**Status: ✅ Complete**

### Completed

- [x] User database schema (id, name, email, username, bio, image)
- [x] Auto-generate unique username on sign-up
- [x] Profile page with edit form
- [x] Username validation (unique, length, allowed characters)
- [x] Bio field with character limit
- [x] Display name editing
- [x] Avatar selection (20 game-themed avatars)
- [x] Username availability check (real-time)
- [x] Form validation with Zod schemas
- [x] Mobile-responsive profile UI

### Remaining

- ~~`[ ] Profile visibility settings (only visible to league members) Not applicable, since profiles are only visible to league members anyway or when searching for users using invites.~~
- [x] Account deletion with data anonymization ("Deleted User")
- ~~[ ] Profile picture upload (custom images, not just preset avatars) This is non-mvp.~~

---

## 3. League Creation & Management

**Status: 🚧 In Progress**

### Database Schema

- [x] League table (id, name, description, visibility, logo, createdAt, updatedAt)
- [x] League visibility enum (public, private)

### League CRUD

- [x] Create league form (name, description, visibility, optional logo)
- [x] League settings page (edit name, description, visibility, logo)
- [x] Archive league functionality
- [x] View archived leagues (for former executives)
- [x] Unarchive/reactivate league functionality
- [x] Delete league functionality (with confirmation)
- [x] League dashboard/home page

### League Discovery

- [x] Public league search (by name)
- [ ] Public league search by game type (requires Phase 2: Game Types)
- [x] Search results display (name, description, member count)
- [x] Join public league functionality

### UI/UX

- [x] League list view (user's leagues)
- [x] League card component
- [x] League header/navigation
- [x] Empty state for no leagues

---

## 4. Member Management

**Status: ✅ Complete**

### Database Schema

- [x] League member table (userId, leagueId, role, joinedAt)
- [x] Placeholder member table (id, leagueId, displayName, createdAt)
- [x] League invitation table (id, leagueId, inviterId, inviteeEmail/userId, role, status, token, maxUses, useCount, createdAt, expiresAt)

### Member Operations

- [x] View all league members
- [x] Invite user to league (by username search)
- [x] Generate shareable invite link
- [x] Invite link handling for authenticated users
- [x] Invite link handling for unauthenticated users (redirect to sign in)
- [x] Accept/decline league invitation
- [x] Leave league functionality
- [x] Remove member from league

### Placeholder Members

- [x] Create placeholder member
- [x] Retire placeholder (soft-delete with `retiredAt` for match history preservation)
- [x] Restore retired placeholder
- [x] Placeholder member list view (active and retired sections)
- [ ] Link placeholder to real user on join (deferred to Phase 2 - requires match history)

### UI/UX

- [x] Member list page (`/leagues/[id]/members`)
- [x] Member card component (in members-list.tsx)
- [x] Invite member page (`/leagues/[id]/members/invite`)
- [x] Pending invitations view (shows invitee name for direct invitations)
- [x] Copy invite link button for link-type invitations
- [x] User invitations page (`/invitations`)
- [x] Leave league button on league dashboard (all roles)
- [x] Dashboard active league count (real-time)
- [x] Notification bell in header with pending invitation count
- [x] Notification dropdown with accept/decline inline actions

---

## 5. Role-Based Permissions

**Status: ✅ Complete**

### Database

- [x] Role enum (member, manager, executive)
- [x] Role stored in league_member table

### Permission System

- [x] Permission checking utility functions (`src/lib/permissions.ts`)
- [x] Role-based UI rendering (show/hide based on permissions)
- [x] Service layer protection based on role

### Role Management

- [x] Change member role (Executive only)
- [x] Prevent sole executive from leaving without replacement
- [x] Prevent demoting sole executive

### Permission Matrix Implementation

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

---

## 6. Moderation System

**Status: ✅ Complete**

### Database Schema

- [x] Report table (id, reporterId, reportedUserId, leagueId, reason, description, evidence, status, createdAt)
- [x] Report reason enum (unsportsmanlike, false_reporting, harassment, spam, other)
- [x] Moderation action table (id, reportId, moderatorId, action, reason, createdAt)
- [x] Action enum (dismissed, warned, suspended, removed)
- [x] Member warning/suspension status in league_member (suspendedUntil field)

### Reporting

- [x] Report member form (`/leagues/[id]/members/[memberId]/report`)
- [x] Report reason selection
- [x] Report description and evidence fields
- [x] View own reports submitted (`/leagues/[id]/my-reports`)

### Remediation (Managers/Executives)

- [x] View pending reports (`/leagues/[id]/moderation`)
- [x] Dismiss report with reason
- [x] Warn member
- [x] Suspend member (temporary)
- [x] Remove member

### Audit Trail

- [x] Log all moderation actions (moderation_action table)
- [x] View member's offense history (shown on report detail page)
- [x] Members can see warnings against them (`/leagues/[id]/my-warnings`)

### UI/UX

- [x] Report button on member profiles (in member dropdown menu)
- [x] Moderation dashboard for managers (`/leagues/[id]/moderation`)
- [x] Report detail view (`/leagues/[id]/moderation/[reportId]`)
- [x] Member moderation history view (for managers viewing reports)
- [x] Moderation card on league dashboard with pending report count
- [x] My Reports and My Warnings cards on league dashboard for all members

---

## 7. Usage Limits with Admin Override

**Status: ⏳ Not Started**

### Default Limits (Free Tier)

- [x] Max 3 leagues per user (as creator or member)
- [x] Max 20 active members per league
- [x] Max 20 game types per league

### Limit Tracking

- [x] Track user's league count
- [x] Track league's active member count
- [ ] Track league's game type count (deferred to future phase since games are not implemented yet)
- [x] Display usage in UI ("X of Y used")

### Limit Enforcement

- [x] Prevent creating league when at limit
- [x] Prevent joining league when at limit
- [x] Prevent inviting when league at member limit
- [ ] Prevent creating game type when at limit (deferred to future phase when creating game types is a feature)
- [x] Clear error messages when limits reached

### Admin Override System

- [ ] Admin user role/flag (deferred to future phase)
- [x] Override table (userId/leagueId, limitType, overrideValue)
- [ ] Admin UI to manage overrides (deferred to future phase)
- [ ] Grant "Pro" status to user/league (deferred to future phase)

### UI/UX

- [x] Usage indicators in relevant UIs
- [x] Warning when approaching limits
- [ ] Clear messaging about limits and future paid tier (deferred to future phase)

---

## Technical Debt & Polish

- [ ] Add loading states for all async operations
- [ ] Error boundary components
- [ ] Toast notifications for success/error feedback
- [ ] Comprehensive form validation messages
- [ ] Accessibility audit (ARIA labels, keyboard navigation) (deferred to future phase)
- [ ] SEO meta tags for public pages
- [ ] Favicon for apple touch icon for app
- [ ] Rate limiting on sensitive operations (deferred to future phase)

---

## Notes

- All database changes require migrations via `pnpm db:generate` and `pnpm db:migrate`
- Follow established patterns in `src/services/` for business logic
- Follow established patterns in `src/db/` for database operations
- Use Zod schemas in `src/validators/` for shared validation
- Mobile-first responsive design required for all new UI
