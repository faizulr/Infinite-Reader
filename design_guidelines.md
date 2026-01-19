# PDF Reader Design Guidelines

## Brand Identity

**Purpose**: A distraction-free PDF reader that makes long-form reading feel natural and effortless.

**Aesthetic Direction**: Brutally minimal. The UI should disappear into the background, letting the document be the hero. Maximum whitespace, stark interfaces, essential controls only. When not reading, the app breathes with generous spacing. When reading, it's just you and the text.

**Memorable Element**: The infinite scroll feels like reading a physical scroll - no jarring page breaks, just continuous flow. The UI fades away completely when reading, triggered by scroll momentum.

## Navigation Architecture

**Type**: Stack-Only Navigation

**Screens**:
1. **Library** - Browse and manage imported PDFs
2. **Reader** - Immersive reading view with infinite scroll
3. **Settings** - Display preferences and app settings

## Screen-by-Screen Specifications

### Library Screen
**Purpose**: Import, organize, and select PDFs to read

**Layout**:
- Header: Custom transparent header
  - Title: "Library" (left-aligned)
  - Right button: Settings icon
  - No search bar (small library doesn't need it)
- Content: Scrollable vertical list of PDF cards
  - Each card shows: thumbnail preview, title, page count, last read date
  - Floating Action Button (bottom-right): "+" to import PDF
- Safe area: top insets.top + Spacing.xl, bottom insets.bottom + Spacing.xl + 80 (FAB height + spacing)

**Empty State**: Illustration showing a document floating upward with prompt "Import your first PDF"

### Reader Screen
**Purpose**: Read PDF with seamless infinite scrolling

**Layout**:
- Header: None. Controls overlay appears on tap, fades after 3 seconds
  - Overlay header (top): Back button (left), dark mode toggle (right), progress indicator (center, subtle)
  - Overlay footer (bottom): Brightness slider
- Content: Infinite scrollable PDF pages stitched together
  - Pages flow vertically without visible breaks
  - Generous horizontal margins for comfortable line length
  - Auto-hide UI on scroll momentum
- Safe area: Full bleed. Content padding handles readability margins internally

**Interactions**:
- Single tap: Show/hide overlay controls
- Scroll: Auto-hide controls after 200ms of momentum
- Double-tap: Zoom in/out (optional enhancement)

### Settings Screen
**Purpose**: Configure reading preferences

**Layout**:
- Header: Default navigation header, title "Settings"
- Content: Scrollable form grouped by category
  - Reading: Default theme (Light/Dark/Auto), font size multiplier
  - Storage: Clear cache, about
- Submit: None (settings save automatically)
- Safe area: top Spacing.xl, bottom insets.bottom + Spacing.xl

## Color Palette

**Light Mode**:
- Primary: #1A1A1A (almost black, used sparingly for icons/controls)
- Background: #FFFFFF
- Surface: #F8F8F8 (cards in library)
- Text Primary: #1A1A1A
- Text Secondary: #6B6B6B
- Border: #E5E5E5

**Dark Mode**:
- Primary: #FFFFFF (controls/icons)
- Background: #0A0A0A (true dark for OLED)
- Surface: #1C1C1C (cards)
- Text Primary: #E8E8E8
- Text Secondary: #8E8E8E
- Border: #2A2A2A

**Accent**: #4A4A4A (progress indicators, subtle highlights) - used minimally

## Typography

**Font**: System default (SF Pro for iOS, Roboto for Android) - prioritize PDF text rendering over custom fonts

**Type Scale**:
- Title (Library header): Bold, 34pt
- PDF Card Title: Semibold, 17pt
- PDF Metadata: Regular, 13pt, Secondary color
- Settings Labels: Regular, 17pt
- Reader PDF Text: Render at PDF's native size × user's multiplier preference

**PDF Rendering**: Preserve original document typography. Apply global size multiplier only.

## Assets to Generate

1. **icon.png** - App icon featuring a minimalist scroll/document symbol in stark black on white
   - WHERE USED: Device home screen

2. **splash-icon.png** - Same scroll symbol, clean and simple
   - WHERE USED: Launch screen

3. **empty-library.png** - Illustration of a floating document with subtle upward motion lines, monochromatic
   - WHERE USED: Library screen when no PDFs imported

4. **sample-pdf-thumbnail.png** - Placeholder PDF preview thumbnail (simple geometric pattern)
   - WHERE USED: Library cards during development/testing

## Visual Design

- **Library Cards**: Rounded corners (12pt), subtle border in light mode, elevated appearance in dark mode
- **FAB**: 56×56 circle, Primary color, floating shadow (offset: 0/2, opacity: 0.10, radius: 2)
- **Overlay Controls**: Semi-transparent backdrop (black 50% opacity in light, black 70% in dark), controls appear with fade-in animation
- **Progress Indicator**: Hair-thin line at top of reader, fills as you scroll through document
- **All Icons**: Feather icon set, 24pt size, consistent stroke weight