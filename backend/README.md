# CareOps Backend — Complete Node.js/Express/Prisma API

## ⚡ Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Copy env and fill in your values
cp .env .env.local   # edit DATABASE_URL and JWT_SECRET

# 3. Run database migrations
npx prisma migrate dev --name init

# 4. Seed demo data (optional but recommended)
npm run seed

# 5. Start dev server
npm run dev
# → API running at http://localhost:8000
```

---

## 📁 Complete File Structure

```
careops-backend/
├── prisma/
│   ├── schema.prisma              ✅ Full database schema (11 models)
│   ├── seed.ts                    ✅ Demo data seeder
│   └── migrations/
│       └── 001_init/
│           └── migration.sql      ✅ Initial migration SQL
│
├── src/
│   ├── server.ts                  ✅ Express app entry point, all routes
│   │
│   ├── config/
│   │   └── prisma.ts              ✅ PrismaClient singleton
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts     ✅ JWT authentication + role guards
│   │   └── error.middleware.ts    ✅ Global error handler + Zod validation
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts         ✅ register, login, me, changePassword
│   │   ├── workspace.controller.ts    ✅ update, activate, serviceTypes, availability, integrations, team, invite
│   │   ├── booking.controller.ts      ✅ CRUD + status update + conflict check
│   │   ├── contact.controller.ts      ✅ CRUD + search + filter
│   │   ├── conversation.controller.ts ✅ list, messages, send, tags, pause/resume
│   │   ├── dashboard.controller.ts    ✅ overview stats + analytics
│   │   ├── form.controller.ts         ✅ templates + submissions + complete
│   │   ├── inventory.controller.ts    ✅ CRUD + low-stock alerts
│   │   ├── public.controller.ts       ✅ info, availability, book (no auth)
│   │   ├── integration.controller.ts  ✅ email test, Google OAuth, status
│   │   └── automation.controller.ts   ✅ rules CRUD + logs
│   │
│   ├── routes/
│   │   ├── auth.routes.ts         ✅
│   │   ├── workspace.routes.ts    ✅
│   │   ├── booking.routes.ts      ✅
│   │   ├── contact.routes.ts      ✅
│   │   ├── conversation.routes.ts ✅
│   │   ├── dashboard.routes.ts    ✅
│   │   ├── form.routes.ts         ✅
│   │   ├── inventory.routes.ts    ✅
│   │   ├── public.routes.ts       ✅ (no auth)
│   │   ├── integration.routes.ts  ✅
│   │   └── automation.routes.ts   ✅
│   │
│   ├── services/
│   │   ├── email.service.ts       ✅ Resend integration, HTML templates
│   │   ├── automation.service.ts  ✅ Event-driven rule execution
│   │   ├── booking.service.ts     ✅ Conflict checking, slot generation
│   │   ├── calendar.service.ts    ✅ Google Calendar sync
│   │   └── cron.service.ts        ✅ 24h reminders, inventory alerts, overdue forms
│   │
│   └── utils/
│       ├── response.ts            ✅ successResponse, errorResponse, AppError
│       ├── jwt.ts                 ✅ signToken, verifyToken
│       ├── password.ts            ✅ hashPassword, comparePassword
│       ├── slug.ts                ✅ slugify, generateUniqueSlug
│       └── validators.ts          ✅ All Zod schemas
│
├── Dockerfile                     ✅ Production-ready (multi-stage)
├── .dockerignore                  ✅
├── .gitignore                     ✅
├── .env                           ✅ Template
├── package.json                   ✅ All dependencies
└── tsconfig.json                  ✅
```

---

## 🔌 Complete API Reference

### Auth  `POST /api/auth/*`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | ❌ | Create workspace + owner account |
| POST | `/login` | ❌ | Login, get JWT |
| GET | `/me` | ✅ | Get current user + workspace |
| PUT | `/change-password` | ✅ | Update password |

### Workspace  `PUT /api/workspaces/*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Get current workspace |
| PUT | `/:id` | Update business details |
| PUT | `/:id/activate` | Activate workspace (go live) |
| GET/POST | `/:id/service-types` | List / create services |
| PUT/DELETE | `/:id/service-types/:stId` | Update / deactivate service |
| GET/POST | `/:id/availability` | Get / replace availability rules |
| GET/PUT | `/:id/integrations` | Get / upsert integration |
| GET | `/:id/team` | List team members |
| POST | `/:id/invite` | Invite staff member |

### Bookings  `GET /api/bookings/*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List bookings (filter: status, from, to, contactId) |
| GET | `/:id` | Get single booking |
| POST | `/` | Create booking (checks conflicts) |
| PUT | `/:id` | Update booking details |
| PUT | `/:id/status` | Update status (CONFIRMED/COMPLETED/NO_SHOW/etc) |
| DELETE | `/:id` | Cancel booking |

### Contacts  `GET /api/contacts/*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List contacts (search, status filter, pagination) |
| GET | `/:id` | Get contact with bookings |
| POST | `/` | Create contact (triggers automations) |
| PUT | `/:id` | Update contact |
| DELETE | `/:id` | Delete contact |

### Conversations  `/api/conversations/*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List conversations (filter: status, tag, search) |
| GET | `/:id` | Get conversation detail |
| GET | `/:id/messages` | Get all messages |
| POST | `/:id/messages` | Send reply (pauses automation) |
| PUT | `/:id/tags` | Update tags |
| PUT | `/:id/status` | Update status (ACTIVE/PAUSED/CLOSED) |
| PUT | `/:id/resume-automation` | Resume automation |

### Dashboard  `/api/dashboard/*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/overview` | KPIs, alerts, upcoming bookings |
| GET | `/analytics?range=7` | Trends, conversion, hourly distribution |

### Forms  `/api/forms/*`
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/templates` | List / create form templates |
| PUT/DELETE | `/templates/:id` | Update / delete template |
| GET/POST | `/submissions` | List / create submissions |
| GET | `/submissions/:id` | Get submission detail |
| PUT | `/submissions/:id/complete` | Mark form as completed |

### Inventory  `/api/inventory/*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all items |
| GET | `/alerts` | Get critical/low stock items |
| GET | `/:id` | Get single item |
| POST | `/` | Create item |
| PUT | `/:id` | Update item (auto-alerts on threshold cross) |
| DELETE | `/:id` | Delete item |

### Integrations  `/api/integrations/*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/status` | Get all integration statuses |
| POST | `/email/test` | Test Resend API key |
| GET | `/google/auth-url` | Get Google OAuth URL |
| GET | `/google/callback` | OAuth callback (redirect) |
| DELETE | `/:type` | Disconnect integration |

### Automations  `/api/automations/*`
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/rules` | List / create automation rules |
| PUT/DELETE | `/rules/:id` | Update / delete rule |
| GET | `/logs` | View automation execution logs |

### Public Booking (No Auth)  `/api/public/:slug/*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/:slug/info` | Get workspace info + service types |
| GET | `/:slug/availability?date=&serviceTypeId=` | Get available time slots |
| POST | `/:slug/book` | Create booking + contact + send emails |

---

## 🗄️ Database Models

| Model | Purpose |
|-------|---------|
| `Workspace` | Business account container |
| `User` | Owner/staff accounts |
| `Contact` | Customers/leads |
| `ServiceType` | Bookable services (name, duration, location) |
| `AvailabilityRule` | Weekly schedule per workspace |
| `Booking` | Appointments with conflict prevention |
| `Conversation` | Per-contact message threads |
| `Message` | Individual messages (inbound/outbound/system) |
| `FormTemplate` | Custom form definitions |
| `FormSubmission` | Submitted form instances |
| `InventoryItem` | Stock tracking with vendor alerts |
| `AutomationRule` | Event-triggered action rules |
| `AutomationLog` | Execution history |
| `Integration` | Third-party connections (Resend, Google) |

---

## 🤖 Automation Events

| Trigger | When It Fires |
|---------|--------------|
| `contact_created` | New contact/lead added |
| `booking_created` | New booking confirmed |
| `booking_confirmed` | Booking status set to CONFIRMED |
| `booking_24h_before` | Cron: 24 hours before appointment |
| `form_pending_3d` | Cron: Form still pending after 3 days |
| `inventory_below_threshold` | Quantity drops to/below threshold |

**Action types:** `send_email`, `add_tag`, `create_conversation`

---

## 📧 Email Templates (Resend)

| Template | Trigger | Description |
|----------|---------|-------------|
| Welcome | `contact_created` | Branded welcome + booking link button |
| Booking Confirmation | `booking_created` | Service, date, time, location details |
| Booking Reminder | `booking_24h_before` | "Tomorrow at X" reminder |
| Inventory Alert | Low stock | Vendor restock request |
| Integration Test | Manual | API key verification email |

---

## 🚀 Deploy to Railway

```bash
# 1. Push to GitHub

# 2. In Railway dashboard:
#    - New Project → Deploy from GitHub repo
#    - Add PostgreSQL service
#    - Set environment variables:

DATABASE_URL=         # From Railway PostgreSQL service (auto-set)
JWT_SECRET=           # Long random string (32+ chars)
NODE_ENV=production
FRONTEND_URL=         # Your Vercel frontend URL
RESEND_API_KEY=       # From resend.com

# 3. Railway auto-builds with Dockerfile
# 4. Runs: prisma migrate deploy && node dist/server.js
```

---

## 🔧 Environment Variables

```bash
# Required
DATABASE_URL="postgresql://..."   # PostgreSQL connection string
JWT_SECRET="min-32-char-secret"  # JWT signing secret
NODE_ENV=development              # development | production

# Recommended
FRONTEND_URL=http://localhost:3000  # For CORS
RESEND_API_KEY=re_xxx               # Global fallback email key

# Optional (Google Calendar)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/integrations/google/callback

# Server
PORT=8000
```

---

## 🌱 Demo Seed Data

Run `npm run seed` to populate:
- 1 workspace (`demo-clinic`)
- Owner: `owner@demo.com` / `demo1234`
- Staff: `staff@demo.com` / `demo1234`  
- 4 service types (consultation, follow-up, massage, acupuncture)
- 5-day availability (Mon–Fri)
- 8 contacts (various statuses)
- 6 bookings (past and upcoming)
- 5 conversations with messages
- 6 inventory items (some low/critical)
- 1 form template + 4 submissions
- 6 automation rules

---

## 🛡️ Security Features

- Passwords hashed with bcrypt (12 rounds)
- JWT with configurable expiry
- Every route verifies `workspaceId` matches logged-in user
- Public booking routes use workspace slug (not ID)
- Prisma parameterized queries (SQL injection safe)
- Input validation with Zod on all POST/PUT routes
- CORS restricted to configured `FRONTEND_URL`
