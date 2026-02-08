---
name: generate-icons
description: Generate SVG icons for the competiscore app. Use when creating or updating avatar, team, game type, or tournament icons. Produces light/dark mode friendly SVGs with consistent sizing.
disable-model-invocation: true
argument-hint: [type] [name] (type: avatar|team|game-type|tournament)
allowed-tools: Read, Write, Bash, Glob
---

# SVG Icon Generator for Competiscore

You are an expert SVG designer creating icons for the Competiscore competitive scoring app. Generate high-quality, hand-crafted SVG icons that are visually distinct and professional.

## Arguments

- `$0` - Icon type: `avatar`, `team`, `game-type`, `tournament`, or `all`
- `$1` - (Optional) Specific icon name to generate, or `all` to generate the full set

If no arguments, ask the user what type and name they want.

## Output Locations

| Type       | Directory                  | Count    |
| ---------- | -------------------------- | -------- |
| avatar     | `public/avatars/`          | 20 icons |
| team       | `public/team-avatars/`     | 20 icons |
| game-type  | `public/game-type-icons/`  | 20 icons |
| tournament | `public/tournament-icons/` | 5 icons  |

## SVG Technical Requirements

All icons MUST follow these exact specifications:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- content here -->
</svg>
```

- **ViewBox**: Always `0 0 100 100` (square)
- **No width/height attributes** - let the container control sizing
- **No external dependencies** - no fonts, no linked images, no CSS classes
- **Inline styles only** if needed, but prefer attributes
- **Keep SVG compact** - single line or minimal lines, no unnecessary whitespace
- **No `id` attributes** - avoid conflicts when multiple icons on same page

## Light/Dark Mode Compatibility

This is CRITICAL. Icons must be visible on both light (`#ffffff`) and dark (`#1a1a2e`) backgrounds.

### Rules:

1. **NEVER use pure white (`#ffffff`) or pure black (`#000000`)** as primary fill colors
2. **Use medium-tone colors** that contrast well against both backgrounds:
   - Blues: `#3b82f6`, `#2563eb`, `#60a5fa`
   - Greens: `#22c55e`, `#16a34a`, `#4ade80`
   - Reds: `#ef4444`, `#dc2626`, `#f87171`
   - Purples: `#a855f7`, `#8b5cf6`, `#c084fc`
   - Oranges: `#f97316`, `#ea580c`, `#fb923c`
   - Yellows: `#eab308`, `#ca8a04`, `#facc15`
   - Pinks: `#ec4899`, `#db2777`, `#f472b6`
   - Teals: `#14b8a6`, `#0d9488`, `#2dd4bf`
   - Slate/Gray (for accents only): `#64748b`, `#94a3b8`, `#475569`
3. **Use strokes for definition** when shapes might blend with background:
   - Add `stroke` with a slightly darker/lighter shade
   - Use `stroke-width="2"` for outlines
4. **Test mentally**: Would this icon be visible on both white and near-black backgrounds?

## Visual Style by Type

### Avatars (`public/avatars/`)

**Style**: Cartoonish, fun character faces/figures. Think emoji-meets-game-character.

- Round or rounded shapes
- Expressive, personality-driven designs
- Each should feel like a unique character identity
- Use vibrant, saturated colors
- Examples of good avatar subjects: ninja, astronaut, pirate, wizard, viking, cat, fox, panda, owl, alien, dragon, unicorn, penguin, bear, wolf

### Team Icons (`public/team-avatars/`)

**Style**: Bold emblems/crests/badges. Think sports team logos.

- Shield, crest, or badge shapes as containers
- Strong, bold geometric designs inside
- Symmetric and balanced compositions
- Use 2-3 colors max per icon for logo clarity
- Examples of good team subjects: phoenix, wolf-pack, thunder, flame, viper, titan, hawk, kraken, lion, stag

### Game Type Icons (`public/game-type-icons/`)

**Style**: Clean activity/game iconography. Think app icons for specific games.

- Represent the game/activity clearly
- Clean lines, recognizable silhouettes
- Minimal detail - should read at small sizes (24px)
- Use 1-2 colors, with optional accent color
- Examples: ping-pong, pool, chess, darts, bowling, cards, dice, foosball, basketball, soccer

### Tournament Icons (`public/tournament-icons/`)

**Style**: Competition/bracket themed. Think championship imagery.

- Bracket shapes, podiums, championship themes
- Should convey "organized competition"
- Bold and authoritative designs
- Use gold/silver/bronze accent colors for prestige
- Examples: bracket, champion, podium, versus, grand-prix

## Naming Convention

- Lowercase, hyphenated: `chess-knight.svg`, `ping-pong.svg`
- Descriptive of the icon content, not abstract
- No numbers or prefixes

## Icon Name Lists

When generating the full set for a type, use these EXACT names:

### Avatars (20)

ninja, astronaut, pirate, wizard, viking, cat, fox, panda, owl, alien, dragon, unicorn, penguin, bear, wolf, monkey, robot, ghost, knight, chef

### Teams (20)

phoenix, thunder, flame, viper, titan, hawk, kraken, lion, stag, wolf-pack, cobra, trident, spartan, avalanche, dragon, fortress, raptor, sentinel, storm, crown

### Game Types (20)

ping-pong, pool, chess, darts, bowling, cards, dice, foosball, basketball, soccer, tennis, hockey, golf, archery, boxing, racing, trivia, poker, volleyball, badminton

### Tournaments (5)

bracket, champion, podium, versus, grand-prix

## Quality Checklist

Before writing each SVG, verify:

- [ ] ViewBox is `0 0 100 100`
- [ ] No width/height attributes on root `<svg>`
- [ ] Colors work on both light and dark backgrounds
- [ ] No pure white or pure black fills
- [ ] Icon is recognizable at 32x32px display size
- [ ] SVG is valid and well-formed
- [ ] Filename matches the naming convention
- [ ] Design matches the type's visual style

## After Generating Icons

After generating icons, remind the user to update:

1. `src/lib/shared/constants.ts` - Update the icon name arrays and ICON_PATHS
2. Validators in `src/validators/` if icon name validation exists
3. Any forms that use icon selectors

## Example SVG (for reference style)

A good avatar (ninja):

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="45" r="30" fill="#1e293b"/><rect x="20" y="35" width="60" height="15" rx="7" fill="#334155"/><circle cx="38" cy="42" r="5" fill="#e2e8f0"/><circle cx="62" cy="42" r="5" fill="#e2e8f0"/><circle cx="38" cy="42" r="2.5" fill="#1e293b"/><circle cx="62" cy="42" r="2.5" fill="#1e293b"/><path d="M20 42 L5 35" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/><path d="M80 42 L95 35" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/><rect x="35" y="75" width="30" height="15" rx="3" fill="#1e293b"/></svg>
```

A good game type icon (chess):

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M35 90 L65 90 L60 75 L40 75 Z" fill="#475569" stroke="#334155" stroke-width="2"/><path d="M40 75 L60 75 L58 55 L42 55 Z" fill="#64748b" stroke="#475569" stroke-width="2"/><path d="M42 55 L58 55 L60 45 L55 35 L60 25 L55 15 L45 15 L40 25 L45 35 L40 45 Z" fill="#64748b" stroke="#475569" stroke-width="2"/><circle cx="50" cy="12" r="6" fill="#64748b" stroke="#475569" stroke-width="2"/></svg>
```
