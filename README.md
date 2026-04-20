# SmartSplit 🚀
### AI-Powered Multi-Platform Expense Splitting & Real-Time Settlements

SmartSplit is a high-performance, real-time web application designed to eliminate the complexity of shared expenses. Built for speed, responsiveness, and scale, it handles everything from group management to automated debt simplification.

---

## ✨ Key Features

### 💎 Core Splitting
- **Real-Time Group Management**: Create circles and invite friends via email.
- **Equal & Custom Splits**: Track bills split evenly or with precise custom amounts for every participant.
- **Debt Simplification**: Advanced greedy algorithm minimizes the total number of transactions needed to settle up.
- **Live Balances**: Instant balance re-computation powered by Firestore real-time listeners.

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
- **State & Auth**: Firebase Authentication & Context API.
- **Data Layer**: Cloud Firestore (Real-time `onSnapshot` listeners).
- **Backend API**: Node.js / Express — All mutations flow through an authenticated backend for business logic enforcement and server-side authorization.
- **AI Engine**: Google Gemini API for categorization and spending pattern analysis.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+
- A Firebase Project (with Auth and Firestore enabled)
- A Gemini API Key (for AI features)

### 2. Environment Setup
Create a `.env` in the root directory:
```env
# Frontend (Vite)
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Backend (Express)
PORT=5001
GEMINI_API_KEY=your_gemini_key
```

### 3. Installation
```powershell
npm install
```

### 4. Run Development
```powershell
# Run both servers
npm run dev    # Starts Vite on :5173
node server.js # Starts Backend on :5001
```

### 5. Production Build
```powershell
npm run build
$env:NODE_ENV='production'; node server.js
```

---

## 🛠️ Implementation Details
- **Balance Calculation**: Client-side re-computation on every Firestore update ensures the UI is never stale.
- **Optimistic UI**: Modals close and toasts show immediately, while backend writes happen in the background.
- **Auth Guarding**: Custom `ProtectedRoute` component ensures zero access to group data without a valid session.

---

## Deployment Link : 
https://smart-split-eight.vercel.app/
