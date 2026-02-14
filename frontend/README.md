# CareOps Frontend — Complete Next.js App

## 🚀 Quick Setup (5 minutes)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Edit `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000    # Your backend URL
NEXT_PUBLIC_APP_URL=http://localhost:3000    # This frontend URL
```

### 3. Run development server
```bash
npm run dev
```

Open http://localhost:3000

---

## 📁 Complete File Structure

```
careops-frontend/
├── app/
│   ├── layout.tsx                    ✅ Root layout with fonts & toaster
│   ├── globals.css                   ✅ Design system + custom animations
│   ├── page.tsx                      ✅ Landing page (dark, premium)
│   ├── login/page.tsx                ✅ Login form with validation
│   ├── register/page.tsx             ✅ Split-panel register with perks
│   ├── onboarding/page.tsx           ✅ 5-step wizard (business→email→services→availability→launch)
│   ├── book/[workspaceSlug]/
│   │   └── page.tsx                  ✅ Public booking page (4-step flow, no auth)
│   └── dashboard/
│       ├── layout.tsx                ✅ Sidebar + header shell
│       ├── overview/page.tsx         ✅ Stats, trend chart, alerts, upcoming bookings
│       ├── inbox/page.tsx            ✅ Full conversation list + message thread + reply
│       ├── bookings/page.tsx         ✅ Table with filter + status update
│       ├── contacts/page.tsx         ✅ Card grid with search + status filter
│       ├── forms/page.tsx            ✅ Submission tracker with overdue detection
│       ├── inventory/page.tsx        ✅ Stock levels + add item + quantity controls
│       ├── analytics/page.tsx        ✅ 6 charts: trend, hourly, pie, monthly, outcomes
│       └── settings/page.tsx         ✅ General, integrations, team, booking link tabs
├── components/
│   └── ui/
│       ├── button.tsx                ✅ Variants: default, outline, ghost, secondary
│       ├── badge.tsx                 ✅ Variants: default, secondary, destructive, outline
│       ├── card.tsx                  ✅ Card, CardHeader, CardTitle, CardContent, CardFooter
│       ├── input.tsx                 ✅ Styled input with focus ring
│       ├── label.tsx                 ✅ Form label
│       ├── textarea.tsx              ✅ Auto-resize textarea
│       └── skeleton.tsx              ✅ Loading skeleton
├── lib/
│   ├── api.ts                        ✅ Axios with auth interceptors + 401 redirect
│   └── utils.ts                      ✅ cn(), formatDate(), getInitials(), getStatusColor()
├── store/
│   └── useStore.ts                   ✅ Zustand: user, workspace, sidebarOpen, logout
├── types/
│   └── index.ts                      ✅ Full TypeScript types for all models
├── package.json                      ✅ All dependencies listed
├── tailwind.config.js                ✅ Custom fonts, colors, animations
├── tsconfig.json                     ✅ Path aliases (@/*)
├── next.config.js                    ✅ Next.js config
└── .env.local                        ✅ Environment template
```

---

## 🎨 Design System

**Fonts:**
- Display: `Syne` (headings, stats, titles)
- Body: `DM Sans` (all text)

**Colors:**
- Primary: `blue-600` (#2563eb)
- Accent: `violet-600`
- Success: `emerald-500`
- Warning: `amber-500`
- Error: `red-500`

**Component Patterns:**
```css
.stat-card    /* White card with hover shadow */
.page-title   /* 2xl bold Syne font */
.page-subtitle /* sm gray text */
.sidebar-link /* Rounded nav link */
.badge-blue / badge-green / badge-yellow / badge-red  /* Status badges */
.card-hover   /* Hover lift effect */
```

---

## 🔌 API Endpoints Used

| Page | Endpoints |
|------|-----------|
| Auth | POST /api/auth/login, POST /api/auth/register, GET /api/auth/me |
| Dashboard | GET /api/dashboard/overview |
| Inbox | GET /api/conversations, GET /api/conversations/:id/messages, POST /api/conversations/:id/messages |
| Bookings | GET /api/bookings, PUT /api/bookings/:id/status |
| Contacts | GET /api/contacts |
| Forms | GET /api/forms/submissions |
| Inventory | GET /api/inventory, POST /api/inventory, PUT /api/inventory/:id |
| Settings | PUT /api/workspaces/:id, POST /api/workspaces/:id/invite |
| Onboarding | PUT /api/workspaces/:id/integrations, POST /api/workspaces/:id/service-types, POST /api/workspaces/:id/availability, PUT /api/workspaces/:id/activate |
| Public Booking | GET /api/public/:slug/info, GET /api/public/:slug/availability, POST /api/public/:slug/book |

---

## 📱 Mobile Responsive

- Dashboard sidebar → hamburger on mobile
- Inbox → conversation list / thread toggle on mobile
- Booking page → single column on mobile
- All grids → stack on small screens

---

## ✅ Features Checklist

**Authentication**
- [x] Login with email/password
- [x] Register with business name
- [x] JWT token stored in localStorage
- [x] Auto-redirect on 401
- [x] Protected dashboard routes

**Onboarding**
- [x] Step 1: Business details (name, address, timezone, email)
- [x] Step 2: Email integration (Resend API key + test)
- [x] Step 3: Services (add multiple, remove)
- [x] Step 4: Availability (day + time ranges)
- [x] Step 5: Review & activate

**Dashboard**
- [x] Stat cards with trends
- [x] Booking trend chart (recharts AreaChart)
- [x] Quick stats panel
- [x] Alerts list with severity colors
- [x] Upcoming bookings with date badges

**Inbox**
- [x] Conversation list with tags, unread count, relative timestamps
- [x] Message thread with inbound/outbound/automated styling
- [x] Reply with optimistic updates
- [x] Automation paused indicator
- [x] Mobile: list/thread toggle

**Bookings**
- [x] Filter by status (ALL / PENDING / CONFIRMED / etc)
- [x] Inline status update buttons
- [x] Customer + service info in table

**Contacts**
- [x] Card grid with initials avatar
- [x] Search by name/email
- [x] Filter by status
- [x] Source, phone, email display

**Forms**
- [x] Summary cards (pending, overdue, completed)
- [x] Table with overdue row highlighting
- [x] Filter by status

**Inventory**
- [x] Summary cards (critical, low, stocked)
- [x] Add new item form
- [x] +/- quantity controls
- [x] Stock status badges

**Analytics**
- [x] KPI cards with trend indicators
- [x] Bookings vs Leads comparison chart
- [x] Peak hours bar chart
- [x] Lead sources pie chart
- [x] 30-day trend line chart
- [x] Booking outcomes mini-pie charts

**Settings**
- [x] General: business details editor
- [x] Integrations: Resend + Google Calendar status
- [x] Team: invite staff + view members
- [x] Booking Link: copy + open + embed snippet

**Public Booking Page** (no auth)
- [x] Service selection cards
- [x] Interactive calendar with month navigation
- [x] Available time slots grid
- [x] Contact info form
- [x] Booking confirmation summary
- [x] Success screen with recap

---

## 🚀 Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set env vars in Vercel dashboard:
# NEXT_PUBLIC_API_URL = https://your-backend.railway.app
# NEXT_PUBLIC_APP_URL = https://your-app.vercel.app

# Deploy to production
vercel --prod
```

---

## 🔧 Extending

**Add a new dashboard page:**
1. Create `app/dashboard/your-page/page.tsx`
2. Add entry to `nav` array in `app/dashboard/layout.tsx`
3. Import icon from `lucide-react`

**Add a new API call:**
```typescript
import api from '@/lib/api';

const response = await api.get('/api/your-endpoint');
const data = response.data.data;
```

**Add a new type:**
Edit `types/index.ts` and add your interface.

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| next 14 | Framework |
| react 18 | UI library |
| axios | HTTP client |
| zustand | State management |
| react-hook-form | Form handling |
| zod | Schema validation |
| recharts | Charts & analytics |
| date-fns | Date formatting |
| sonner | Toast notifications |
| lucide-react | Icons |
| tailwindcss | Styling |
| class-variance-authority | Component variants |
| clsx + tailwind-merge | Class utilities |
