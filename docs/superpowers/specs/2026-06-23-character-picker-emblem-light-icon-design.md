# Character Picker: Emblem & Light Level Icon Enhancement

**Date:** 2026-06-23  
**Status:** Approved

## Overview

Enhance the character picker on the lobby page to display the equipped emblem thumbnail next to each character and add a light level icon beside the light level number. This adds visual richness and makes the picker more scannable at a glance.

## Current State

Character buttons currently display:
- Checkmark (if selected)
- Class name and light level
- Example: `"✓ Warlock · 299"`

## Desired State

Character buttons will display:
- **Emblem thumbnail** (32×32px, left-aligned)
- **Checkmark** (green, when selected)
- **Class name**
- **Separator dot**
- **Light level icon** (inline star/power SVG) + **light level number**

Example layout: `[🌙 Emblem] ✓ Warlock · ⭐ 299`

## Design Decisions

### Emblem Display
- **Source:** `emblemPath` from `DestinyCharacter` type (full emblem background not required)
- **Format:** 32×32px thumbnail with subtle rounded border and border styling
- **Fallback:** Use class emoji or placeholder if image fails to load
- **CDN:** Prepend Bungie CDN URL (`https://www.bungie.net`) to emblem path

### Light Level Icon
- **Style:** Inline SVG star/power icon, themed to match Destiny 2's light indicator
- **Color:** Golden/amber to evoke light/power (matches emblem theme)
- **Size:** 16×16px, positioned inline with light level number
- **No external requests:** Inlined as SVG to avoid extra image loads

### Responsive Behavior
- **Single row at all breakpoints:** Buttons stay in a flex row, with gap/padding adjusting naturally
- **Mobile:** Elements scale down proportionally; emblem remains 32×32px for clickability

## Component Structure

### Modified Component
- **Location:** `LobbyRoom.tsx`, lines 800–804 (character picker buttons)
- **Changes:**
  - Add emblem thumbnail before class name
  - Add light level icon before light level number
  - Keep layout as single flex row

### New/Modified Elements
- **EmblemThumbnail** (optional component): Wraps emblem image with fallback logic
- **LightLevelIcon** (inline SVG): Reusable star icon for light level display

## Data Flow

1. Fetch characters via existing `/api/bungie/characters` endpoint
2. Each character has `emblemPath` (string) and `light` (number)
3. Build CDN URL: `https://www.bungie.net${character.emblemPath}`
4. Render emblem as `<img>` with error handler
5. Render inline SVG for light icon

## Edge Cases & Fallbacks

| Case | Behavior |
|------|----------|
| Emblem image fails to load | Show class emoji (Titan ⚔️, Hunter 🦅, Warlock 🌙) |
| Missing emblem path | Fall back to class emoji |
| Very small screens (mobile) | Flex layout shrinks gap; all elements remain visible |
| User has no characters | Character picker doesn't render (existing behavior) |

## Styling Notes

- **Emblem border:** Subtle 1px border with `rgba(255,255,255,0.1)` to define edges
- **Emblem radius:** 4px rounded corners to match button aesthetics
- **Spacing:** Use `gap` in flex container to handle all responsive spacing
- **Icon color:** Golden/amber for light icon to distinguish from other UI elements

## Performance Considerations

- Emblem images are small (32×32px) and cached by browser
- Light icon is inlined SVG (no extra requests)
- No new data fetching required—uses existing `DestinyCharacter` data
- Fallback emojis render instantly if image fails

## Testing Checklist

- [ ] Emblem thumbnails load and display correctly
- [ ] Fallback emoji shows when emblem image fails
- [ ] Light level icon displays inline with number
- [ ] Selected state checkmark is visible alongside new elements
- [ ] Buttons remain in single row on mobile
- [ ] Hover and selected states have proper contrast
- [ ] All three class types (Titan, Hunter, Warlock) render correctly

## Next Steps

1. Implement emblem thumbnail and light icon in character picker
2. Add fallback handling for missing/broken emblem images
3. Test across breakpoints and browsers
4. Verify no performance regression from image loading
