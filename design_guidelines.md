# Design Guidelines: Decentralized EHR Management System

## Design Philosophy
**Professional Healthcare Dashboard** prioritizing clinical trust, information clarity, and security transparency. Inspired by Epic MyChart, Cerner, and enterprise tools like Linear for data hierarchy.

### Core Principles
1. **Clinical Professionalism** - Medical-grade clean design
2. **Information Clarity** - Excellent hierarchy for dense medical data
3. **Security Transparency** - Visual indicators for permissions & blockchain verification
4. **Role Differentiation** - Distinct identities maintaining system consistency

---

## Color System

### Base Palette (HSL)
**Light Mode:**
- Primary: `210 85% 45%` | Secondary: `210 75% 55%`
- Success: `142 70% 45%` | Warning: `38 92% 50%` | Danger: `0 84% 60%`
- BG: `210 20% 98%` (off-white), `0 0% 100%` (cards)
- Text: `220 15% 20%` (primary), `220 10% 45%` (secondary)
- Borders: `220 15% 90%`

**Dark Mode:**
- Primary: `210 85% 55%` | Secondary: `210 70% 65%`
- Success: `142 60% 50%` | Warning: `38 85% 55%` | Danger: `0 75% 65%`
- BG: `220 15% 10%` (base), `220 12% 15%` (cards)
- Text: `210 15% 95%` (primary), `210 10% 70%` (secondary)
- Borders: `220 10% 25%`

### Role Accents (for dashboard branding)
Patient: `270 60% 55%` | Doctor: `210 85% 45%` | Lab: `180 65% 45%` | Admin: `0 0% 35%` | Insurance: `25 75% 50%` | Researcher: `142 55% 45%`

---

## Typography

**Fonts:** Inter (UI/data), JetBrains Mono (hashes/IDs)

**Scale:**
- Display: `text-3xl font-bold` → `lg:text-4xl` (dashboard titles)
- Heading: `text-xl font-semibold` (sections)
- Body: `text-base` (16px, records)
- Small: `text-sm` (labels)
- Tiny: `text-xs` (timestamps, IDs)

**Line Heights:** `leading-tight` (tables), `leading-relaxed` (body), `leading-snug` (headings)

---

## Layout & Spacing

**Spacing Units:** `2, 4, 6, 8, 12, 16` (Tailwind)
- Micro: `p-2 gap-2` | Components: `p-4 gap-4` | Cards: `p-6 p-8` | Sections: `my-12 my-16`

**Grid:**
- Container: `max-w-7xl mx-auto px-4`
- Forms: `max-w-2xl` for readability
- Breakpoints: Mobile (single column) → md:768px (2-col) → lg:1024px (multi-col dashboards) → xl:1280px (optimal density)

---

## Components

### Navigation
**Top Bar:** Fixed, `h-16`, `backdrop-blur-md bg-white/90`, contains logo, role badge, profile dropdown, notifications
**Sidebar:** `w-64`, role-specific active accent, Heroicons (outline/solid), grouped sections
**Role Indicator:** Badge with role-accent color, "Logged in as: [Role]"

### Data Display

**Record Cards:**
```
rounded-lg shadow-md p-6
border-l-4 [status-color]
hover:shadow-lg transition-shadow
```
Status colors: blue (active), green (verified), amber (pending)

**Tables:**
- Header: `bg-gray-50 font-semibold` (light) / `bg-gray-800` (dark)
- Rows: `hover:bg-gray-50`, `px-6 py-4`, `border-b border-gray-200`
- Sticky header for long tables, sortable columns

**Blockchain Panel:**
- Gradient border/background
- Monospace hashes with copy button
- Status: green (verified), blue (pending), red (failed)

**Consent Toggles:**
- Large ON/OFF switches
- Shows avatar + name
- Confirmation modal for revocation

### Forms

**Input Fields:**
```
border-gray-300 rounded-md p-3
focus:ring-2 focus:ring-primary focus:border-primary
Error: border-red-500 + red message
Label: text-sm font-medium text-gray-700 mb-2
```

**File Upload:**
- Dashed border dropzone, `bg-gray-50/800`
- Progress bar, thumbnail previews with remove

**Search/Filters:**
- Full-width search with icon, debounced
- Multi-select filters → removable pill badges

### Buttons

**Variants:**
```
Primary: bg-primary text-white hover:bg-primary-dark shadow-sm
Secondary: border border-gray-300 hover:bg-gray-50
Danger: bg-red-600 text-white
Sizes: px-4 py-2 (default) | px-6 py-3 (large) | px-3 py-1.5 (small)
```

**Status Badges:**
```
rounded-full px-3 py-1 text-xs font-medium
Green (Active/Approved) | Amber (Pending) | Red (Revoked) | Blue (Verified)
```

### Overlays

**Modals:** Centered, `backdrop-blur`, `shadow-2xl`, danger actions use red confirm button
**Side Panels:** Slide-in right, `w-full md:w-2/3 lg:w-1/2`, tabs for details/history/permissions
**Toasts:** Top-right, color-coded `border-left`, auto-dismiss 5s with progress bar

---

## Role Dashboards

**Patient:** Welcome hero → Quick actions (view/share/consent) → Activity timeline → Consent panel
**Doctor:** Patient search → Today's appointments → Prescription pad → Access requests
**Lab:** Upload center → Pending queue → Completed reports table
**Admin:** Stats cards → User management tables → Blockchain audit log
**Insurance:** Claims queue → Verification tool → Approved/rejected table
**Researcher:** Data request form → Available datasets → Analytics visualizations

---

## Interactions

**Allowed:**
- Card hover: `transition-shadow duration-200`
- Button hover: `hover:opacity-90`
- Modal: fade + `scale-95` → `scale-100`
- Toast: slide-in right

**Avoid:** Page transitions, distracting spinners (use progress bars), auto-play animations

---

## Accessibility & Security

- **WCAG AAA:** 7:1 contrast for medical data
- **Focus:** 2px visible outline for keyboard nav
- **ARIA:** Labels on all icons/buttons
- **Icons:** Shield+check (verified), lock/unlock (permissions), clock (timestamp), chain (blockchain)

---

## Images

**Avatars:** Circular, `w-10 h-10` (nav) / `w-8 h-8` (inline), fallback to initials on role-accent background
**Document Previews:** Thumbnails with modal viewer, format detection icons
**Empty States:** Optional minimal line art (primary color palette), centered in empty areas
**No Hero Images:** Utility-first application—dashboards lead with functional content

---

## Implementation Notes

- Use Tailwind CSS utilities throughout
- Dark mode via `dark:` variants on all components
- Responsive: mobile-first, enhance at breakpoints
- Icons: Heroicons library
- All medical data in Inter, all hashes in JetBrains Mono
- Form validation: inline errors, clear messaging
- Loading states: skeleton screens preferred over spinners