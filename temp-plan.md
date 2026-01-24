# Plan: Usage Limits with Admin Override

## Overview

Implement usage limits for the free tier with admin override capabilities, as defined in the product vision (Section 14).

**Default Limits:**

- Max 3 leagues per user (as creator or member)
- Max 20 active members per league (placeholder members don't count)
- Max 20 game types per league (Phase 2 - add constant only)

## Current State

**Already implemented:**

- Constants: `MAX_LEAGUES_PER_USER = 3`, `MAX_MEMBERS_PER_LEAGUE = 20` in `src/services/constants.ts`
- Enforcement in `createLeague()`, `joinLeague()`, invitation services
- Database functions: `getUserLeagueCount()`, `getMemberCount()`

**Needs implementation:**

- Admin flag on user table
- Limit override table for custom limits
- Centralized limit checking with override support
- UI usage indicators ("X of Y used")
- Warning states when approaching limits

---

## Implementation Plan

### Phase 1: Database Schema

**1.1 Add `isAdmin` to user table (`src/db/schema.ts`)**

```typescript
isAdmin: boolean("is_admin").default(false).notNull(),
```

**1.2 Add `limitType` enum (`src/db/schema.ts`)**

```typescript
export const limitType = pgEnum("limit_type", [
  "max_leagues_per_user",
  "max_members_per_league",
  "max_game_types_per_league",
]);
```

**1.3 Create `limit_override` table (`src/db/schema.ts`)**

```typescript
export const limitOverride = pgTable(
  "limit_override",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    limitType: limitType("limit_type").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    leagueId: text("league_id").references(() => league.id, {
      onDelete: "cascade",
    }),
    limitValue: integer("limit_value"), // null = unlimited
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    reason: text("reason"),
  },
  (table) => [
    index("limit_override_user_idx").on(table.userId),
    index("limit_override_league_idx").on(table.leagueId),
  ],
);
```

**1.4 Generate and apply migration**

```bash
pnpm run db:generate && pnpm run db:migrate
```

---

### Phase 2: Database Layer

**2.1 Create `src/db/limit-overrides.ts`**

Functions:

- `getLimitOverrideForUser(userId, limitType)` - Get user's override for a limit type
- `getLimitOverrideForLeague(leagueId, limitType)` - Get league's override for a limit type
- `createLimitOverride(data)` - Create new override (admin only)
- `deleteLimitOverride(id)` - Remove override (admin only)

**2.2 Add to `src/db/users.ts`**

Function:

- `isUserAdmin(userId)` - Check if user has admin flag

---

### Phase 3: Limit Checking Library

**3.1 Create `src/lib/limits.ts`**

Centralized limit checking with override support:

```typescript
export type LimitInfo = {
  current: number;
  max: number | null; // null = unlimited
  isAtLimit: boolean;
  isNearLimit: boolean; // within 1 of limit
};

export type LimitCheckResult = {
  allowed: boolean;
  limitInfo: LimitInfo;
  message?: string;
};

// Get effective limit (checks for overrides first)
export async function getEffectiveUserLeagueLimit(
  userId: string,
): Promise<number | null>;
export async function getEffectiveLeagueMemberLimit(
  leagueId: string,
): Promise<number | null>;

// Get usage info with limit status
export async function getUserLeagueLimitInfo(
  userId: string,
): Promise<LimitInfo>;
export async function getLeagueMemberLimitInfo(
  leagueId: string,
): Promise<LimitInfo>;

// Check if action is allowed
export async function canUserJoinAnotherLeague(
  userId: string,
): Promise<LimitCheckResult>;
export async function canLeagueAddMember(
  leagueId: string,
): Promise<LimitCheckResult>;
```

**3.2 Update `src/services/constants.ts`**

Add:

```typescript
export const MAX_GAME_TYPES_PER_LEAGUE = 20;
export const NEAR_LIMIT_THRESHOLD = 1;

export const LimitType = {
  MAX_LEAGUES_PER_USER: "max_leagues_per_user",
  MAX_MEMBERS_PER_LEAGUE: "max_members_per_league",
  MAX_GAME_TYPES_PER_LEAGUE: "max_game_types_per_league",
} as const;
```

---

### Phase 4: Service Layer Updates

**4.1 Update `src/services/leagues.ts`**

Replace direct limit checks with centralized library:

```typescript
// Before:
const userLeagueCount = await getUserLeagueCount(userId);
if (userLeagueCount >= MAX_LEAGUES_PER_USER) { ... }

// After:
const limitCheck = await canUserJoinAnotherLeague(userId);
if (!limitCheck.allowed) {
return { error: limitCheck.message };
}
```

**4.2 Update `src/services/invitations.ts`**

Update `joinLeague()` helper to use centralized limit checks.

**4.3 Create `src/services/limit-overrides.ts` (Admin service)**

Functions:

- `setUserLeagueLimit(adminUserId, targetUserId, limit, reason)` - Set user's league limit
- `setLeagueMemberLimit(adminUserId, leagueId, limit, reason)` - Set league's member limit
- `removeOverride(adminUserId, overrideId)` - Remove an override

---

### Phase 5: UI Components

**5.1 Add Progress component from shadcn**

```bash
npx shadcn@latest add progress
```

**5.2 Create `src/components/usage-indicator.tsx`**

Reusable component showing "X of Y used" with progress bar:

- Shows warning color when near limit
- Shows error color when at limit
- Shows "unlimited" for null max

**5.3 Create `src/components/at-limit-message.tsx`**

Message displayed when user hits a limit, mentioning paid tier is coming.

**5.4 Update Dashboard (`src/app/dashboard/page.tsx`)**

Update `LeagueCountCard` to show usage indicator:

```
Active Leagues
2 of 3 used
[========--] (progress bar)
```

**5.5 Update Leagues Page (`src/app/leagues/page.tsx`)**

- Show usage indicator above league list
- Disable "Create League" button when at limit with tooltip

**5.6 Update Create League Page (`src/app/leagues/new/page.tsx`)**

- Block access and show `AtLimitMessage` if user at limit

**5.7 Update League Dashboard (`src/app/leagues/[id]/page.tsx`)**

- Update Members card to show "X of Y members"

**5.8 Update Members Page (`src/app/leagues/[id]/members/page.tsx`)**

- Show member count with limit in header
- Disable invite button when at limit

---

### Phase 6: Testing

**6.1 Create `src/lib/limits.test.ts`**

- Test `getEffectiveLimit` with/without overrides
- Test `LimitInfo` states (at limit, near limit, under limit)
- Test unlimited (null) handling

**6.2 Update `src/services/leagues.test.ts`**

- Mock limit library
- Verify limit checks use centralized system

**6.3 Create `src/services/limit-overrides.test.ts`**

- Test admin-only access
- Test override CRUD operations

---

## Files to Create/Modify

**New files:**

- `src/db/limit-overrides.ts` - Database functions for overrides
- `src/lib/limits.ts` - Centralized limit checking
- `src/lib/limits.test.ts` - Tests for limit library
- `src/services/limit-overrides.ts` - Admin service for overrides
- `src/services/limit-overrides.test.ts` - Tests for admin service
- `src/components/usage-indicator.tsx` - Reusable usage display
- `src/components/at-limit-message.tsx` - At-limit messaging

**Modified files:**

- `src/db/schema.ts` - Add isAdmin, limitType enum, limit_override table
- `src/db/users.ts` - Add isUserAdmin function
- `src/services/constants.ts` - Add new constants
- `src/services/leagues.ts` - Use centralized limit checks
- `src/services/invitations.ts` - Use centralized limit checks
- `src/app/dashboard/page.tsx` - Add usage indicator
- `src/app/leagues/page.tsx` - Add usage indicator, disable create at limit
- `src/app/leagues/new/page.tsx` - Block when at limit
- `src/app/leagues/[id]/page.tsx` - Show member capacity
- `src/app/leagues/[id]/members/page.tsx` - Show member capacity

---

## Verification

1. **Database migration**: Run `pnpm run db:generate` and `pnpm run db:migrate`
2. **Unit tests**: Run `pnpm test` - all tests should pass
3. **Manual testing**:

- Create 3 leagues as a user - verify cannot create 4th
- Add 20 members to a league - verify cannot invite 21st
- Set override for a user via database - verify they can exceed limit
- Check dashboard shows "X of 3" leagues
- Check members page shows "X of 20" members

4. **Build**: Run `pnpm build` - no type errors

---

## Deferred (Post-MVP)

- Admin UI for managing overrides (can be done via direct database for now)
- Game type limit enforcement (requires Phase 2 game types feature)
- "Pro" tier concept with automatic limit elevation
