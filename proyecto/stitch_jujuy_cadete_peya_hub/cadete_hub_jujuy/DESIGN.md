---
name: Cadete Hub Jujuy
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#5e3f3d'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#936e6b'
  outline-variant: '#e8bcb9'
  surface-tint: '#c00020'
  primary: '#bb001f'
  on-primary: '#ffffff'
  primary-container: '#ea0029'
  on-primary-container: '#fffcff'
  inverse-primary: '#ffb3ae'
  secondary: '#575e70'
  on-secondary: '#ffffff'
  secondary-container: '#d9dff5'
  on-secondary-container: '#5c6274'
  tertiary: '#006a45'
  on-tertiary: '#ffffff'
  tertiary-container: '#008659'
  on-tertiary-container: '#f9fff8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad7'
  primary-fixed-dim: '#ffb3ae'
  on-primary-fixed: '#410005'
  on-primary-fixed-variant: '#930016'
  secondary-fixed: '#dce2f7'
  secondary-fixed-dim: '#c0c6db'
  on-secondary-fixed: '#141b2b'
  on-secondary-fixed-variant: '#404758'
  tertiary-fixed: '#6efcb9'
  tertiary-fixed-dim: '#4edf9f'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005234'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '800'
    lineHeight: 32px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '800'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
---

## Brand & Style

This design system targets urban delivery workers navigating the unique topography, climate, and logistical realities of San Salvador de Jujuy, Argentina. The experience reflects the speed, agility, and camaraderie of courier life under demanding conditions—from high-altitude UV glare to rapid weather shifts across neighborhoods like Alto Comedero, Cuyaya, and Los Perales.

### Aesthetic Persona & Style
- **Visual Direction:** Modern Utility & Delivery Tactile. High-energy, crisp, and high-visibility. It combines the familiar urgency and energy of quick-commerce gig platforms with the rock-solid reliability of an essential worker utility tool.
- **Design Metaphor:** Pure-white elevated sheets suspended over a calm, low-glare pavement grey ground. Visual hierarchy is driven by saturated signal spots and decisive, heavy pill controls engineered for gloved fingertips and one-handed thumb interaction.
- **Tone & Mood:** Direct, supportive, urgent when necessary, and reassuringly robust. It eliminates micro-friction, cuts through bright sunlight, and communicates mission-critical information (active shifts, SOS safety alerts, earnings, road incidents, puncture spots) at a single glance.

## Colors

The palette establishes maximum legibility under harsh outdoor sunlight while preserving the high-energy identity of delivery networks.

### Primary & Action
- **Brand Primary (`#EA0029`):** The primary pulse. Applied to key calls to action, active navigation indicators, dynamic route states, and primary badge accents.
- **Primary Pressed/Hover (`#C60023`):** High-contrast tactile response for interactive state verification.

### Neutrals & Foundation
- **Canvas Base (`#F4F5F7`):** Neutral ground designed to prevent retinal fatigue and reduce outdoor reflective glare compared to raw white.
- **Card Surface (`#FFFFFF`):** High-clarity white for modular cards, sheets, and popups.
- **Text Dominant (`#111827`):** Deep slate black for absolute contrast and rapid scanning.
- **Text Secondary (`#6B7280`):** Muted cool grey for metadata, timestamps, zone descriptors, and vehicle tags.
- **Card Border (`#E2E8F0`):** Ultra-subtle hairline stroke used to reinforce elevation boundaries in outdoor brightness.

### System & Status Badges
- **Success / Active Shift (`#00B67A`):** Vivid emerald green signifying an active shift, safe delivery completion, or verified station.
- **Warning / Alert / Traffic (`#FFB800`):** Punchy amber yellow for road work, rain advisories, police check warnings, or high-demand surges.
- **Emergency / SOS (`#EF4444`):** Pure warning red reserved solely for panic triggers, severe traffic hazard alerts, or vehicle breakdown support.

## Typography

The typography uses **Plus Jakarta Sans** across all levels. Its geometric proportions, wide apertures, and bold letterforms guarantee rapid legibility on mounted handlebars, through screen protectors, and in fluctuating lighting conditions.

- **Headlines:** Use weights `700` and `800` with tight vertical metrics to command authority and quickly highlight key indicators such as earnings, current order IDs, and urgent alerts.
- **Body:** Standardized on weight `500` rather than `400` to prevent thin strokes from disappearing under high outdoor glare.
- **Labels & Micro-Data:** Set in weights `700` and `800` with uppercase transformations on small badges (`label-sm`) to ensure delivery metrics, batch numbers, and operational zones (e.g., "CENTRO", "HUAICO") are immediately readable.

## Layout & Spacing

This design system uses a mobile-first fluid layout optimized for portrait aspect ratios and single-handed thumb operation.

### Layout Geometry
- **Form Factor Constraint:** Designed for progressive web apps (PWAs). On desktop and tablet viewports, main functional modules sit inside a constrained central shell (`max-width: 480px`) flanked by ambient gray workspace, matching real-world smartphone ergonomics.
- **Safe Zones & Action Dock:** Bottom navigation and critical operational buttons are anchored with fixed positioning, honoring mobile home-indicator insets with bottom padding of at least `1rem` plus `env(safe-area-inset-bottom)`.
- **Vertical Rhythm:** Content cards stack rhythmically using `space-md` (`1rem`) gaps. Dense data points within cards strictly adhere to the `space-xs` (`0.25rem`) and `space-sm` (`0.5rem`) step intervals.

## Elevation & Depth

Elevation conveys clean physical separation without introducing visual clutter or heavy drop-shadow artifacts under strong light.

### Elevation Levels
- **Ground (`0dp`):** Surface `#F4F5F7`. Used for base screen viewports and scrollable app containers.
- **Raised (`1dp` - Standard Cards):** Surface `#FFFFFF`, border `1px solid #E2E8F0`, shadow `0 2px 4px -1px rgba(17, 24, 39, 0.04), 0 4px 6px -1px rgba(17, 24, 39, 0.03)`. Used for list items, community announcements, and route previews.
- **Floating (`2dp` - Persistent Bars & Quick Toggles):** Surface `#FFFFFF`, border `1px solid #E2E8F0`, shadow `0 4px 12px -2px rgba(17, 24, 39, 0.08), 0 2px 4px -2px rgba(17, 24, 39, 0.04)`. Used for bottom navigation bars and floating quick-filter toolbars.
- **Overlay (`3dp` - Bottom Sheets & Emergency Banners):** Surface `#FFFFFF`, shadow `0 12px 28px -4px rgba(17, 24, 39, 0.16), 0 6px 12px -4px rgba(17, 24, 39, 0.08)`. Used for modal order sheets, mechanic claim overlays, and SOS confirmation dialogs.

## Shapes

The design system uses a structural corner radius of **16px** (`rounded-lg` under scale `2`) for primary container surfaces, matching modern app delivery containers. 

### Corner Archetypes
- **Cards & Modal Sheets:** Uniformly set to `16px` (`rounded-lg`) to create friendly, tactile, and distinct modules against the `#F4F5F7` backdrop.
- **Buttons & Interactive Pills:** Styled with a full pill radius (`9999px`) to visually reinforce single-touch affordance and differentiate actions from content containers.
- **Badges & Status Tags:** Built with an `8px` or full-pill (`9999px`) radius to balance card contours without competing visually with primary action buttons.
- **Input Fields:** Built with `12px` to `16px` radii for comfortable touch-target framing.

## Components

### Buttons
- **Primary Pill:** Background `#EA0029`, text `#FFFFFF`, border `none`, corner radius `9999px`, height `48px` or `54px` for main actions. Font `label-lg`. Active state scales subtly (`transform: scale(0.98)`) with `#C60023` fill.
- **Secondary Dark:** Background `#111827`, text `#FFFFFF`, border `none`, corner radius `9999px`, height `48px`. Used for shift check-ins, utility tool toggles, and administrative reports.
- **Outline / Ghost:** Background `transparent`, border `1.5px solid #E2E8F0`, text `#111827`. Hover/active shifts background to `#FFFFFF`.
- **SOS Button:** Background `#EF4444`, text `#FFFFFF`, pill shape with an animated pulsing ring shadow (`rgba(239, 68, 68, 0.35)`).

### Cards
- **Base Structure:** Background `#FFFFFF`, corner radius `16px`, border `1px solid #E2E8F0`, padding `1.25rem`.
- **Card Variants:**
  - *Order / Duty Card:* Features a top split header with order ID, store logo/pill badge, distance metric, and a prominent bottom action row.
  - *Alert Card (Incident/Weather):* Left border accented with a `4px` solid bar using status colors (`#FFB800` or `#EF4444`), providing instant peripheral awareness.

### Micro-Badges & Chips
- **Status Badges:** Small padding (`0.25rem 0.625rem`), radius `9999px`, typography `label-sm`.
  - *Active:* Background `#E6F8F2`, text `#00B67A`.
  - *Warning:* Background `#FFF8E6`, text `#B27B00`.
  - *Danger:* Background `#FEECEE`, text `#EA0029`.
- **Filter Chips:** Height `36px`, radius `9999px`, background `#FFFFFF`, border `1px solid #E2E8F0`, text `#6B7280`. When active: background `#EA0029`, border `1px solid #EA0029`, text `#FFFFFF`.

### Input Fields
- **Container:** Minimum height `48px`, background `#FFFFFF`, border `1.5px solid #E2E8F0`, radius `12px`, padding `0 1rem`. Typography `body-lg`. Focus state transitions border to `#EA0029` with no offset outline ring.
- **Search & Filter Bars:** Integrated prefix icon (search lens / pin icon) tinted `#6B7280` with right-aligned instant clear action.

### Lists & Row Items
- **List Rows:** Background `#FFFFFF`, padding `1rem`, separated by hairline dividers `#F4F5F7` or nested inside isolated cards.
- **Touch Target:** Minimum vertical tap footprint of `48px` to ensure fast, safe use while stopped on a bike or motorcycle.

### Domain-Specific Components
- **Shift Status Bar:** Persistent top summary bar indicating rider operational zone (e.g., "San Pedrito", "Ciudad de Nieva"), battery status, active shift timer, and toggle between "Disponible" and "En Pausa".
- **Safety / Incident Report Quick-Trigger:** Floating thumb-level pill trigger positioned above the bottom bar for rapid one-touch reporting of tire punctures (gomerías de turno), rain delays, and active traffic hazards.