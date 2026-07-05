# Mobile Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Attendance Dashboard to be fully mobile responsive.

**Architecture:** Use CSS media queries (max-width: 768px) to collapse headers into a hamburger menu, enable horizontal scrolling for tabs, stack form columns vertically, and convert HTML tables into block-level cards.

**Tech Stack:** React, Vanilla CSS

---

### Task 1: Hamburger Menu and Header Refactoring

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/index.css`

- [ ] **Step 1: Add state for Mobile Menu**
Modify `src/App.jsx` to import `useState` if not already and add `isMobileMenuOpen` state inside the `App` component.

```javascript
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
```

- [ ] **Step 2: Add CSS for Mobile Menu and Header**
Append these media queries to `src/index.css` to handle the hamburger menu layout, hiding the action buttons on mobile, and showing the hamburger toggle.

```css
/* Mobile Header and Hamburger Menu */
.mobile-menu-toggle {
  display: none;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-main);
  cursor: pointer;
  padding: 8px;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .mobile-menu-toggle {
    display: block;
  }
  
  .header-actions {
    display: none;
    flex-direction: column;
    width: 100%;
    position: absolute;
    top: 100%;
    left: 0;
    background: var(--bg-modal);
    padding: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    z-index: 1000;
  }
  
  .header-actions.open {
    display: flex;
  }
}
```

- [ ] **Step 3: Update Header JSX**
In `src/App.jsx`, locate the `<header>` element and update the action buttons wrapper. Add the hamburger toggle button. Note: Keep the NotificationBell outside the collapsible menu or next to the toggle for quick access. (Modify the `div` containing the buttons to use the `header-actions` class).

- [ ] **Step 4: Commit**
```bash
git add src/App.jsx src/index.css
git commit -m "feat(mobile): add hamburger menu for header actions"
```

---

### Task 2: Horizontal Scroll Tabs for View Mode

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/index.css`

- [ ] **Step 1: Add CSS for Horizontal Scroll Tabs**
Append to `src/index.css`:

```css
/* Horizontal Scroll Tabs */
.view-mode-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 6px;
  width: fit-content;
  max-width: 100%;
  overflow-x: auto;
  white-space: nowrap;
  flex-wrap: nowrap;
}

.view-mode-tabs::-webkit-scrollbar {
  display: none;
}
```

- [ ] **Step 2: Apply Class to App.jsx**
In `src/App.jsx`, locate the View Mode Toggle wrapper (around line 1109) which is currently `<div className="no-print" style={{ display: 'flex', gap: '8px', ... }}>`.
Change it to `<div className="no-print view-mode-tabs">` and remove the inline styles that conflict with the new class.

- [ ] **Step 3: Commit**
```bash
git add src/App.jsx src/index.css
git commit -m "style(mobile): convert view mode tabs to horizontal scroll"
```

---

### Task 3: Data Tables to Cards Transformation (CSS)

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add CSS Rules for Responsive Tables**
Append to `src/index.css`:

```css
/* Responsive Data Tables */
@media (max-width: 768px) {
  table.responsive-table {
    display: block;
    width: 100%;
  }
  table.responsive-table thead {
    display: none;
  }
  table.responsive-table tbody,
  table.responsive-table tr,
  table.responsive-table td {
    display: block;
    width: 100%;
  }
  table.responsive-table tr {
    margin-bottom: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 12px;
  }
  table.responsive-table td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    text-align: right;
  }
  table.responsive-table td:last-child {
    border-bottom: none;
  }
  table.responsive-table td::before {
    content: attr(data-label);
    font-weight: 600;
    color: var(--text-muted);
    text-align: left;
    margin-right: 16px;
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add src/index.css
git commit -m "style(mobile): add css rules for responsive card tables"
```

---

### Task 4: Apply Responsive Tables to LeaveOnlineSystem

**Files:**
- Modify: `src/components/LeaveOnlineSystem.jsx`

- [ ] **Step 1: Update Table Tags and Data Labels**
In `src/components/LeaveOnlineSystem.jsx`, locate the `<table style={{ width: '100%', borderCollapse: 'collapse' }}>` in the history tab (around line 2012+).
Add the `className="responsive-table"` to the `<table>`.
For EVERY `<td>` inside the `<tbody>`, add a `data-label` attribute matching the column header.
Example: `<td data-label="วันเวลาที่ส่ง">...</td>`, `<td data-label="ประเภท">...</td>`.

- [ ] **Step 2: Fix Form Grids**
In `src/components/LeaveOnlineSystem.jsx`, locate inline styles with `gridTemplateColumns: '1fr 1fr'`.
Change them to use a new CSS class instead of inline styles, or use a media query in `index.css`.
Add to `index.css`:
```css
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
```
Apply `className="form-grid"` in `LeaveOnlineSystem.jsx` instead of inline grid styles.

- [ ] **Step 3: Commit**
```bash
git add src/components/LeaveOnlineSystem.jsx src/index.css
git commit -m "feat(mobile): apply responsive classes to leave system forms and tables"
```

---

### Task 5: Mobile Notification Bell Fix

**Files:**
- Modify: `src/components/NotificationBell.jsx`

- [ ] **Step 1: Update Dropdown Width on Mobile**
In `src/components/NotificationBell.jsx`, locate the dropdown container styles.
Update the `width` property to dynamically adjust on mobile, or add a CSS class.
Instead of inline `width: '380px'`, add a class to `index.css`:
```css
.notification-dropdown {
  width: 380px;
  max-width: 90vw;
  right: 0;
}
@media (max-width: 768px) {
  .notification-dropdown {
    position: fixed !important;
    top: 70px !important;
    left: 5vw !important;
    right: 5vw !important;
    width: 90vw !important;
  }
}
```
Apply `className="notification-dropdown"` to the dropdown div in `NotificationBell.jsx`.

- [ ] **Step 2: Commit**
```bash
git add src/components/NotificationBell.jsx src/index.css
git commit -m "style(mobile): fix notification bell dropdown width on mobile"
```
