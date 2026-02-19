<p align="center">
  <a href="README.md">English</a> |
  <a href="README_KO.md">한국어</a> |
  <a href="README_JA.md">日本語</a> |
  <a href="README_ZH.md">中文</a> |
  <a href="README_FR.md">Français</a>
</p>

# Human-to-Human CAPTCHA (H2H-CAPTCHA)

> **"Real-time verification by humans, for humans."**

H2H-CAPTCHA is an innovative security solution that replaces automated Turing tests with real-time human interaction. Instead of identifying traffic lights or bicycles, users ("Clients") are paired with human verifiers ("Validators") to perform interactive tasks.

---

## 🏗 Architecture

The system is built entirely on **React + Supabase** — no dedicated backend server required.

### Frontend (React + TypeScript + Vite)
- **Supabase Realtime Broadcast**: Delivers mouse tracking data at up to 40 events/second without database writes.
- **Supabase Presence**: Detects partner disconnection in real time.
- **Postgres Changes**: Notifies waiting users the moment a match is created.

### Database & Realtime (Supabase + PostgreSQL)
- **`queued_participants`** table: Manages the waiting queue for Clients and Validators.
- **`matches`** table: Stores active and completed match records.
- **`client_states`** table: Tracks failure counts and validator blacklists per client.
- **`try_match()`** RPC: Atomic 1:1 matching using `FOR UPDATE SKIP LOCKED` to prevent race conditions.
- **`record_decision()`** RPC: Handles approve/reject verdicts and updates failure counts.
- **`handle_disconnect()`** RPC: Cleans up queue entries and active matches on disconnect.

### Channel Strategy
```
queued_participants  → Postgres Changes  (waiting for match)
session:{match_id}   → Broadcast         (mouse / game / result events)
session:{match_id}   → Presence          (disconnect detection)
```

---

## 🎮 Interactive Challenges

The system supports four verification modes, controlled by the Validator:

1. **🖱️ Mouse Tracking (Passive)**
   - The Validator observes the Client's natural mouse movements.
   - Goal: Detect bot-like linear jumps or instant teleports.
   - Tech: Realtime Broadcast at 30 fps (no DB writes).

2. **✏️ Drawing (Active)**
   - Validator assigns a topic (e.g., "Apple"). Client draws on a canvas.
   - Goal: Verify human creativity and motor control.
   - Tech: Dual-coordinate system (global + canvas-relative).

3. **👊 Rock-Paper-Scissors (Reaction)**
   - Validator sends a challenge move. Client must respond with the winning move.
   - Goal: Test cognitive response and rule understanding.

4. **💬 Chat (Turing)**
   - Free-form text conversation with real-time "Typing..." indicators.
   - Goal: The ultimate Turing test.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+
- A **Supabase** project ([supabase.com](https://supabase.com))

### 1. Database Setup

Run the migration in your Supabase SQL Editor:

```bash
# File: supabase/migrations/001_h2h_captcha.sql
```

Then enable Realtime for the `matches` table in the Supabase Dashboard → Database → Replication.

### 2. Environment Variables

```bash
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key
```

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

### How to Use
1. **Tab 1**: Select **"I am a User (Client)"**.
2. **Tab 2**: Select **"I am a Validator"**.
3. The system matches you instantly.
4. Use the Validator console to switch tasks and verify the Client.

---

## 🛡️ Security Features
- **UUID-based Routing**: Each session uses a unique UUID stored in `localStorage` for secure, persistent identity across reconnects.
- **Isolation**: Clients cannot communicate with other Clients.
- **Validator Blacklist**: A Client cannot be re-matched with the same Validator (tracked in `client_states`).
- **Failure Tracking**: Clients are permanently blocked after 3 consecutive rejections.
- **Row Level Security**: All Supabase tables enforce RLS; sensitive operations run via `SECURITY DEFINER` functions.

---

## 🗂 Project Structure

```
├── src/
│   ├── hooks/
│   │   └── useSupabase.ts     # Main hook (matching + broadcast + presence)
│   ├── lib/
│   │   └── supabase.ts        # Supabase client singleton
│   ├── pages/
│   │   ├── ClientPage.tsx
│   │   └── ValidatorPage.tsx
│   ├── types/
│   │   └── index.ts           # MatchRow, SessionBroadcast, etc.
│   └── i18n/
│       └── translations.ts    # 5-language support
├── supabase/
│   └── migrations/
│       └── 001_h2h_captcha.sql
├── .env.local                 # Supabase credentials (gitignored)
└── vite.config.ts
```

---

© 2025 H2H Captcha Project.
