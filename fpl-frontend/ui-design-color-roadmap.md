# UI Design & Color Roadmap — FPL Clone

Built on the official Premier League / FPL brand palette so the app feels authentic out of the box.

---

## 1. Core Color Palette

| Token | Hex | RGB | Usage |
|---|---|---|---|
| `--color-purple-900` (Primary) | `#38003C` | 56, 0, 60 | Main brand color — navbar, headers, primary buttons, footer |
| `--color-purple-700` | `#4B0055` | 75, 0, 85 | Hover states, secondary surfaces, card backgrounds on dark mode |
| `--color-green-500` (Accent/Success) | `#00FF85` | 0, 255, 133 | Points highlights, positive price changes, "live" indicators, CTAs |
| `--color-cyan-400` (Accent) | `#04F5FF` | 4, 245, 255 | Links, active states, chip highlights, secondary CTA |
| `--color-pink-500` (Alert/Highlight) | `#E90052` | 233, 0, 82 | Captain armband, negative price changes, warnings, red cards |
| `--color-white` | `#FFFFFF` | 255, 255, 255 | Base background (light mode), text on dark surfaces |
| `--color-gray-50` | `#F5F5F7` | 245, 245, 247 | App background (light mode) |
| `--color-gray-200` | `#E1E1E6` | 225, 225, 230 | Borders, dividers |
| `--color-gray-500` | `#8A8A94` | 138, 138, 148 | Secondary/muted text |
| `--color-gray-900` | `#1A1A1D` | 26, 26, 29 | Primary text (light mode) |

### Semantic mapping
| Purpose | Color |
|---|---|
| Primary brand / nav / headers | `purple-900` |
| Primary action buttons | `green-500` (dark text on it, high contrast) |
| Secondary action / links | `cyan-400` |
| Captain indicator | `pink-500` badge with white "C" |
| Vice-captain indicator | `cyan-400` badge with white "V" |
| Price rise | `green-500` with ▲ |
| Price fall | `pink-500` with ▼ |
| Live gameweek badge | `green-500` pulsing dot |
| Warning / points hit (-4) | `pink-500` |
| Bench / inactive player | `gray-200` background, `gray-500` text |

> **Contrast note:** `green-500` and `cyan-400` are both very light/bright — never use them for body text on a white background. Reserve them for buttons, badges, chips, and accents on dark (`purple-900`) surfaces, where they pop the way they do in the real FPL app.

---

## 2. Typography

| Role | Font | Weight | Notes |
|---|---|---|---|
| Headings | Inter or Poppins | 700–800 | Bold, condensed feel matches FPL's sporty branding |
| Body | Inter | 400–500 | Clean, highly legible at small sizes (player stats tables) |
| Numeric/stats (prices, points) | Inter (tabular nums) or Roboto Mono | 600 | `font-variant-numeric: tabular-nums` so columns of numbers align |

Type scale (Tailwind-friendly):
```
text-xs   12px  — table meta, timestamps
text-sm   14px  — body, player names in lists
text-base 16px  — default body
text-lg   18px  — card titles
text-xl   20px  — section headers
text-2xl  24px  — page titles
text-3xl  30px  — gameweek score hero number
```

---

## 3. Component Color Behavior

### Navbar
- Background: `purple-900`
- Text/icons: `white`, active tab underlined in `green-500`
- Gameweek switcher pill: `purple-700` background, `cyan-400` on hover

### Pitch / Squad Builder
- Pitch background: subtle green gradient (`#0B7A3E` → `#0A5C30`, football-pitch green — **not** brand green, keep that reserved for UI accents so it doesn't clash)
- Player cards on pitch: `white` card, `purple-900` name text, points badge in `green-500`
- Captain armband: `pink-500` circle, white "C"
- Selected/dragging state: `cyan-400` border glow

### Points & Live Scoring
- Positive points: `green-500` text/background
- Zero/no data: `gray-500`
- Live pulsing dot: `green-500` with CSS pulse animation
- Bonus points tag: small `purple-900` pill with white "+3 BPS" text

### Transfers
- Player being sold: `pink-500` outline, strikethrough price
- Player being bought: `green-500` outline
- Points-hit warning banner: `pink-500` background at 10% opacity, `pink-500` text, bold "-4 pts"

### Leagues / Standings Table
- Header row: `purple-900` background, white text
- Rank-up arrow: `green-500`
- Rank-down arrow: `pink-500`
- Current user's row: highlighted with `cyan-400` left border (4px) + light purple tint background

### Buttons
| Type | Background | Text | Border |
|---|---|---|---|
| Primary | `green-500` | `purple-900` (dark text for contrast) | none |
| Secondary | transparent | `purple-900` | 1px `purple-900` |
| Danger/Confirm transfer with hit | `pink-500` | `white` | none |
| Disabled | `gray-200` | `gray-500` | none |

---

## 4. Dark Mode (optional, Phase 9 polish)
| Token | Light | Dark |
|---|---|---|
| Background | `#F5F5F7` | `#150017` (near-black purple) |
| Surface/card | `#FFFFFF` | `#26002B` |
| Text primary | `#1A1A1D` | `#F5F5F7` |
| Text secondary | `#8A8A94` | `#B0AEB5` |
| Accents (green/cyan/pink) | unchanged | unchanged — they already pop on dark |

---

## 5. UI Design Roadmap (build order, mirrors frontend-roadmap.md)

### Stage 1 — Design Foundations (before/alongside Frontend Phase 0)
- [ ] Set up Tailwind config with the palette above as custom theme colors (`purple`, `pitchGreen`, `accentGreen`, `cyan`, `pink`)
- [ ] Build base component library: Button, Badge, Card, Modal, Input, Table — all themed
- [ ] Establish spacing scale (4px base unit: 4/8/12/16/24/32/48/64)
- [ ] Define border-radius scale (cards: 12px, badges/pills: full-round, buttons: 8px)
- [ ] Icon set: use a sports-friendly icon library (Lucide/Phosphor) recolored to match palette

### Stage 2 — Navigation & Shell (Frontend Phase 1)
- [ ] Navbar in `purple-900` with green active-tab underline
- [ ] Mobile bottom-tab-bar variant (FPL's real app is mobile-first — consider a bottom nav on small screens: Team / Transfers / Leagues / Stats)
- [ ] Gameweek switcher component

### Stage 3 — Squad Builder Visual System (Frontend Phase 2)
- [ ] Pitch background gradient + line markings (SVG)
- [ ] Player card component (shirt icon by real team color, name, price, points badge)
- [ ] Captain/vice-captain badge overlays
- [ ] Formation selector pill group (3-4-3, 3-5-2, 4-4-2, etc.) in `cyan-400` active state

### Stage 4 — Points & Live Visuals (Frontend Phase 3 / 8)
- [ ] Live pulsing indicator component
- [ ] Points breakdown modal with icon + color per stat type (goal green, card pink, assist cyan)
- [ ] Animated score count-up on gameweek finalize

### Stage 5 — Transfers & Chips Visuals (Frontend Phase 4 / 5)
- [ ] Buy/sell color states on player cards
- [ ] Points-hit warning banner
- [ ] Chip cards with distinct icon + accent color per chip (Wildcard = purple/gold, Bench Boost = green, Triple Captain = pink, Free Hit = cyan)

### Stage 6 — Leagues & Stats Visuals (Frontend Phase 6 / 7)
- [ ] Standings table with rank-change arrows
- [ ] Price history / points-over-time charts themed with palette (green line for points, pink for price drops)
- [ ] Player profile hero section (purple gradient header, stats grid below)

### Stage 7 — Motion & Polish (Frontend Phase 9)
- [ ] Micro-interactions: button press states, card hover lift, transfer confirm animation
- [ ] Loading skeletons in `gray-200` shimmer
- [ ] Toast notifications themed by type (success=green, error=pink, info=cyan)
- [ ] Dark mode toggle (optional)

---

## 6. Quick Reference — Tailwind Theme Snippet

```js
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      purple: {
        900: '#38003C',
        700: '#4B0055',
      },
      accentGreen: '#00FF85',
      cyan: '#04F5FF',
      pink: '#E90052',
      pitchGreen: {
        DEFAULT: '#0B7A3E',
        dark: '#0A5C30',
      },
      gray: {
        50: '#F5F5F7',
        200: '#E1E1E6',
        500: '#8A8A94',
        900: '#1A1A1D',
      },
    },
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
      heading: ['Poppins', 'sans-serif'],
    },
  },
}
```
