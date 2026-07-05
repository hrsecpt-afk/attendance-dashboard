# Mobile Responsive Design Specification

## Overview
This specification details the structural and stylistic changes required to make the Attendance Dashboard fully usable on mobile devices, ensuring a premium user experience across all features.

## 1. Header & Navigation Refactoring
**Problem:** The top header contains too many action buttons (Reset, PDF, CSV, Theme, Notification, Settings) which overflow and clutter mobile screens.
**Solution:**
- Introduce a **Hamburger Menu (☰)** for mobile view.
- Hide secondary action buttons (Reset, PDF, CSV, Theme, Settings) inside the hamburger menu on screens `< 768px`.
- Keep the Notification Bell visible at all times.
- Adjust the Notification Dropdown to take up full screen width (`width: 90vw; right: 5vw;`) on mobile to prevent clipping.

## 2. View Mode Tabs (Horizontal Scroll)
**Problem:** The buttons for switching views (Dashboard, Leave System, Manage, etc.) wrap onto multiple lines, taking up vertical space.
**Solution:**
- Convert the tab wrapper to a horizontal scrollable container (`overflow-x: auto`, `white-space: nowrap`, `flex-wrap: nowrap`).
- Hide the scrollbar for a cleaner look (`::-webkit-scrollbar { display: none; }`).

## 3. Data Tables to Cards Transformation
**Problem:** HTML `<table>` elements cause horizontal scrolling and are unreadable on mobile.
**Solution:**
- Use CSS Media Queries (`@media (max-width: 768px)`) to transform table rows (`<tr>`) into block-level cards.
- Hide `<thead>` elements.
- Set `<td>` elements to `display: flex; justify-content: space-between;`.
- Use the `::before` pseudo-element and a `data-label` attribute injected via React to display column names inline (e.g., `content: attr(data-label); font-weight: bold;`).

## 4. Forms and Grid Layouts
**Problem:** Forms use `grid-template-columns: 1fr 1fr`, squeezing inputs on mobile.
**Solution:**
- Add media queries to collapse all multi-column grid layouts into a single column (`grid-template-columns: 1fr`) on screens `< 768px`.
- Ensure all input fields have `width: 100%`.

## 5. Scope and Implementation Limits
- No new features are being added; this is strictly a UI/UX refactor.
- All changes will primarily occur in `index.css`, `App.jsx`, and `LeaveOnlineSystem.jsx`.
- The design must support both Light and Dark themes seamlessly.

## Ambiguity / Self-Review Notes
- *Hamburger Menu state:* Requires adding a new boolean state `isMobileMenuOpen` in `App.jsx`.
- *Data Tables:* React components rendering tables must be updated to include `data-label` on every `<td>` to enable the CSS card transformation.
