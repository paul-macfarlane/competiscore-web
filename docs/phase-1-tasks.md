# Phase 1: Foundation - Task List

This document tracks all tasks for Phase 1 of Competiscore development based on the [Product Vision](./product-vision.md).

## Progress Summary

| Category                        | Status         | Progress |
| ------------------------------- | -------------- | -------- |
| 1. Authentication               | ✅ Complete    | 100%     |
| 2. User Profiles                | ✅ Complete    | 100%     |
| 3. League Creation & Management | ⏳ Not Started | 0%       |
| 4. Member Management            | ⏳ Not Started | 0%       |
| 5. Role-Based Permissions       | ⏳ Not Started | 0%       |
| 6. Moderation System            | ⏳ Not Started | 0%       |
| 7. Usage Limits                 | ⏳ Not Started | 0%       |

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

**Status: ⏳ Not Started**

### Database Schema

- [ ] League member table (userId, leagueId, role, joinedAt)
- [ ] Placeholder member table (id, leagueId, displayName, username, createdAt)
- [ ] League invitation table (id, leagueId, inviterId, inviteeEmail/userId, role, placeholderId, status, createdAt, expiresAt)

### Member Operations

- [ ] View all league members
- [ ] Invite user to league (by username search)
- [ ] Generate shareable invite link
- [ ] Invite link handling for authenticated users
- [ ] Invite link handling for unauthenticated users with accounts
- [ ] Invite link handling for new users (sign-up flow)
- [ ] Accept/decline league invitation
- [ ] Leave league functionality
- [ ] Remove member from league

### Placeholder Members

- [ ] Create placeholder member
- [ ] Link placeholder to real user on join
- [ ] Retire placeholder without linking
- [ ] Prevent placeholder from being in multiple leagues
- [ ] Placeholder member list view

### UI/UX

- [ ] Member list page
- [ ] Member card component
- [ ] Invite member modal/form
- [ ] Pending invitations view
- [ ] Member profile within league context

---

## 5. Role-Based Permissions

**Status: ⏳ Not Started**

### Database

- [ ] Role enum (member, manager, executive)
- [ ] Role stored in league_member table

### Permission System

- [ ] Permission checking utility functions
- [ ] Role-based UI rendering (show/hide based on permissions)
- [ ] API route protection based on role

### Role Management

- [ ] Change member role (Executive only)
- [ ] Transfer executive role
- [ ] Prevent sole executive from leaving without replacement

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

**Status: ⏳ Not Started**

### Database Schema

- [ ] Report table (id, reporterId, reportedUserId, leagueId, reason, description, evidence, status, createdAt)
- [ ] Report reason enum (unsportsmanlike, false_reporting, harassment, spam, other)
- [ ] Moderation action table (id, reportId, moderatorId, action, reason, createdAt)
- [ ] Action enum (dismissed, warned, suspended, removed)
- [ ] Member warning/suspension status in league_member

### Reporting

- [ ] Report member form
- [ ] Report reason selection
- [ ] Report description and evidence fields
- [ ] View own reports submitted

### Remediation (Managers/Executives)

- [ ] View pending reports
- [ ] Dismiss report with reason
- [ ] Warn member
- [ ] Suspend member (temporary)
- [ ] Remove member

### Audit Trail

- [ ] Log all moderation actions
- [ ] View member's offense history
- [ ] Members can see warnings against them

### UI/UX

- [ ] Report button on member profiles
- [ ] Moderation dashboard for managers
- [ ] Report detail view
- [ ] Member moderation history view

---

## 7. Usage Limits with Admin Override

**Status: ⏳ Not Started**

### Default Limits (Free Tier)

- [ ] Max 3 leagues per user (as creator or member)
- [ ] Max 20 active members per league
- [ ] Max 20 game types per league

### Limit Tracking

- [ ] Track user's league count
- [ ] Track league's active member count
- [ ] Track league's game type count
- [ ] Display usage in UI ("X of Y used")

### Limit Enforcement

- [ ] Prevent creating league when at limit
- [ ] Prevent joining league when at limit
- [ ] Prevent inviting when league at member limit
- [ ] Prevent creating game type when at limit
- [ ] Clear error messages when limits reached

### Admin Override System

- [ ] Admin user role/flag
- [ ] Override table (userId/leagueId, limitType, overrideValue)
- [ ] Admin UI to manage overrides
- [ ] Grant "Pro" status to user/league

### UI/UX

- [ ] Usage indicators in relevant UIs
- [ ] Warning when approaching limits
- [ ] Clear messaging about limits and future paid tier

---

## Technical Debt & Polish

- [ ] Add loading states for all async operations
- [ ] Error boundary components
- [ ] Toast notifications for success/error feedback
- [ ] Comprehensive form validation messages
- [ ] Accessibility audit (ARIA labels, keyboard navigation)
- [ ] SEO meta tags for public pages
- [ ] Rate limiting on sensitive operations

---

## Notes

- All database changes require migrations via `pnpm db:generate` and `pnpm db:migrate`
- Follow established patterns in `src/services/` for business logic
- Follow established patterns in `src/db/` for database operations
- Use Zod schemas in `src/validators/` for shared validation
- Mobile-first responsive design required for all new UI
