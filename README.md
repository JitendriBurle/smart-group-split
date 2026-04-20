# SmartSplit 🚀
### AI-Powered Multi-Platform Expense Splitting & Real-Time Settlements

SmartSplit is a high-performance, real-time web application designed to eliminate the complexity of shared expenses. Built for speed, responsiveness, and scale, it handles everything from group management to automated debt simplification.

---

## ✨ Key Features

### 💎 Core Splitting
- **Real-Time Group Management**: Create circles and invite friends via email.
- **Equal & Custom Splits**: Track bills split evenly or with precise custom amounts for every participant.
- **Debt Simplification**: Advanced greedy algorithm minimizes the total number of transactions needed to settle up.
- **Live Balances**: Instant balance re-computation powered by Supabase real-time listeners.

### 🤖 AI Capabilities
- **Smart Categorization**: Automatically tags your expenses (Food, Travel, Rent, etc.) using Gemini 1.5 Pro/Flash to keep your history clean.
- **Spending Insights**: AI analyzes your group's spending patterns to provide friendly, actionable financial advice.

### 🎨 Premium Experience
- **Responsive Design**: Fluid layout optimized for everything from mobile phones to ultra-wide monitors.
- **Glassmorphism UI**: A state-of-the-art interface built with Tailwind CSS v4 and Framer Motion.
- **Dark Mode**: Native system-aware dark/light theme support.
- **Skeleton Loaders**: Zero layout shift with built-in transition states.

---

## 🏗️ Technical Architecture

SmartSplit uses a modern **Full-stack Node.js + React** architecture with a real-time data layer:

- **Frontend**: React (Vite) + Tailwind CSS v4 + Lucide Icons.
- **State & Auth**: Supabase Auth & Context API.
- **Data Layer**: Supabase (Postgres with Realtime "postgres_changes" listeners).
- **Backend API**: Node.js / Express — All mutations flow through an authenticated backend for business logic enforcement and server-side authorization.
- **AI Engine**: Google Gemini API for categorization and spending pattern analysis.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+
- A Supabase Project (Database + Auth enabled)
- A Gemini API Key (for AI features)

### 2. Environment Setup
Create a `.env` in the root directory:
```env
# Frontend (Vite)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Backend (Express)
PORT=5001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your_gemini_key
```

### 3. Database Setup (Supabase SQL Editor)
Run the following structure in your Supabase SQL Editor:
- Enable **Realtime** for `groups` and `expenses` tables.
- Standard PostgreSQL setup for `profiles`, `groups`, `group_members`, `expenses`, and `expense_splits`.
- Set up Row Level Security (RLS) to ensure data privacy.

### 4. Installation
```powershell
npm install
```

### 5. Run Development
```powershell
# Run both servers
npm run dev    # Starts Vite on :5173
node server.js # Starts Backend on :5001
```

### 6. Production Build
```powershell
npm run build
$env:NODE_ENV='production'; node server.js
```

---

## 🛠️ Implementation Details
- **Balance Calculation**: Client-side re-computation on every database update ensures the UI is never stale.
- **Optimistic UI**: Modals close and toasts show immediately, while backend writes happen in the background.
- **Auth Guarding**: Custom `ProtectedRoute` component ensures zero access to group data without a valid session via Supabase JWT.

---

## Deployment Link : 
https://smart-split-eight.vercel.app/
