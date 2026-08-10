# Attendance Dashboard - Codebase Guide

## 📋 Project Overview

A React + Vite attendance and leave management dashboard for Thai special education centers. Supports leave tracking, duty request management, personnel administration, and comprehensive reporting.

**Technology Stack:**
- React 19.2.6 + React DOM
- Vite 8.0.12 (build tool)
- Supabase (cloud database)
- Tesseract.js (OCR)
- html2pdf.js (PDF generation)

## 🏗️ Architecture

### Two Supabase Projects
- **Main project** (`obxgfqztkbmoqyicjjuk`): app_state key-value storage, write operations
- **Secondary project** (`vayvssbxuskhyujtbtyw`): attendance check-in data (read-only)

See `src/config/supabaseConfig.js` for centralized configuration.

### Directory Structure
```
src/
├── components/       (28 React components)
│   ├── LeaveOnlineSystem.jsx (2,638 lines)
│   ├── DailyReportGenerator.jsx (1,972 lines)
│   ├── DutyOutsideSystem.jsx (1,823 lines)
│   └── ...
├── config/          (Centralized configuration)
│   └── supabaseConfig.js
├── context/         (React Context - auth, user management)
├── utils/           (Shared utilities)
│   ├── appState.js (cloud sync)
│   ├── leaveDataHelpers.js (constants, data transforms)
│   └── ...
├── styles/          (CSS modules)
│   ├── variables.css (design tokens)
│   ├── utilities.css (utility classes)
│   └── index.css (component styles)
└── data/            (Mock data)
```

## 🔐 Security & Configuration

### Environment Variables
Never commit `.env` to git. Use `.env.example` as a template.

```bash
VITE_SUPABASE_MAIN_URL=https://obxgfqztkbmoqyicjjuk.supabase.co
VITE_SUPABASE_MAIN_KEY=sb_publishable_...

VITE_SUPABASE_SECONDARY_URL=https://vayvssbxuskhyujtbtyw.supabase.co
VITE_SUPABASE_SECONDARY_KEY=sb_publishable_...
```

### Sensitive Credentials
- Default users are **NOT hardcoded** - add via UserManagement component
- Telegram tokens must be configured in app settings
- API keys are in `.env`, injected at build time via `vite.config.js`

## 🎨 Styling

### Design System
- CSS Custom Properties in `src/styles/variables.css`
- Utility classes in `src/styles/utilities.css`
- Component-specific styles in `src/index.css`

Theme support: light/dark via `data-theme` attribute or system preference.

### Using Variables
```css
color: var(--color-primary);
padding: var(--spacing-md);
border-radius: var(--radius-lg);
```

## 📦 Key Utilities

### Leave Data Helpers (`src/utils/leaveDataHelpers.js`)
- `createEmptyLeave()` - Initialize leave data structure
- `recalculateAccumulatedLeaves()` - Sum monthly leave to yearly
- `migrateToMonthly()` - Migrate old leave data to new structure
- `getPositionRank()`, `getLocationRank()` - Sorting helpers
- `cleanNameForMatch()` - Normalize names for comparison
- `VIEWS`, `MONTHS_LIST`, `POSITION_ORDER` - Constants

### App State (`src/utils/appState.js`)
- `getAppState(key)` - Read from Supabase app_state table
- `setAppState(key, value)` - Write to Supabase
- Uses main project only, never touches secondary

### Cloud Settings (`src/utils/cloudSettings.js`)
- `restoreSettingsFromCloud()` - Sync settings from Supabase to localStorage
- `schedulePush(key)` - Debounced push to cloud on change

## 🔄 Data Flow

1. **Initialization** (App.jsx mount)
   - Restore cloud settings via `restoreSettingsFromCloud()`
   - Load employees from localStorage or Supabase
   - Migrate old leave data if needed

2. **Employee Data** (App.jsx + components)
   - Raw data from `src/data/attendance.json` (fallback)
   - Enhanced with Supabase data via `syncEmployeeDetailsWithRaw()`
   - Sorted by user list order or position/location rank

3. **Leave Requests** (LeaveOnlineSystem)
   - Stored in Supabase `leaves` table
   - Synced to cloud via `setAppState()` for backup
   - Real-time polling for approvals

4. **Duty Requests** (DutyOutsideSystem)
   - Stored in Supabase `duty_requests` table
   - File attachments stored separately
   - Optional Telegram notifications

## ⚡ Recent Improvements

### Security
- Extracted hardcoded API keys to `.env` file
- Removed hardcoded default user credentials
- Added `.env` to `.gitignore`
- Centralized Supabase configuration in `src/config/supabaseConfig.js`

### Code Organization
- Extracted complex helpers from App.jsx to `leaveDataHelpers.js`
- Re-enabled ESLint React hooks validation rules
- Created modular CSS structure with design tokens

### Build Config
- Updated `vite.config.js` to inject environment variables at build time
- All 8 source files now use centralized config

## ⚠️ Known Limitations & Future Improvements

### Monolithic Components (HIGH)
- `LeaveOnlineSystem.jsx` (2,638 lines)
- `DailyReportGenerator.jsx` (1,972 lines)
- `DutyOutsideSystem.jsx` (1,823 lines)

**Recommendation:** Break into smaller, focused components (modals, forms, tables).

### ESLint Hooks
- Re-enabled `exhaustive-deps` (warn level) - review and fix cases as they arise
- Run `npm run lint` regularly to catch issues

### Testing
- No unit/integration tests yet
- Consider adding tests for:
  - Leave calculations (`leaveDataHelpers.js`)
  - Supabase sync operations
  - Component state logic

### TypeScript Migration
- Project is ready for TypeScript (no breaking changes needed)
- Start with utility functions, then components

## 🚀 Development Workflow

### Running the App
```bash
npm install
npm run dev  # Vite dev server on http://localhost:5173
```

### Building
```bash
npm run build  # Production build to dist/
npm run preview  # Preview build locally
```

### Linting
```bash
npm run lint  # Check code quality
```

### Environment Setup
1. Copy `.env.example` to `.env`
2. Add your Supabase keys
3. Start dev server

## 🔗 Important Files

| File | Purpose |
|------|---------|
| `src/config/supabaseConfig.js` | Centralized Supabase config |
| `src/utils/leaveDataHelpers.js` | Leave data constants & transforms |
| `src/utils/appState.js` | Cloud sync for app_state table |
| `src/context/AuthContext.jsx` | User auth & session management |
| `src/App.jsx` | Main app orchestration |
| `src/index.css` | Global component styles |
| `vite.config.js` | Build config & env injection |
| `.env.example` | Environment variable template |

## 💡 Best Practices

### Adding New Features
1. Extract constants to `leaveDataHelpers.js`
2. Use centralized Supabase config (`getSupabaseConfig()`)
3. Use CSS variables for colors/spacing
4. Keep components under 500 lines (split if needed)
5. Write prop validation if data-heavy

### Modifying Supabase Config
- **Never** hardcode keys in components
- Always use `getSupabaseConfig()` from `src/config/supabaseConfig.js`
- Environment variables are injected at build time

### Form Validation
- Validate at component boundaries (user input)
- Trust internal APIs (they're already validated)
- Use `safeConfirm()` / `safeAlert()` for webdriver tests

### Performance
- Use `useMemo` for expensive calculations
- Avoid re-renders with `useCallback` for event handlers
- Implement virtual scrolling for large employee lists

---

Last Updated: 2026-08-10
