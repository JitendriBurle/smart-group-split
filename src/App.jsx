import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Auth
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
// Each page is split into its own JS chunk. The browser only downloads the
// chunk for the page the user is actually navigating to, not the entire app.
const Login      = lazy(() => import('./pages/Login'));
const Register   = lazy(() => import('./pages/Register'));
const Dashboard  = lazy(() => import('./pages/Dashboard'));
const CreateGroup = lazy(() => import('./pages/CreateGroup'));
const GroupDetail = lazy(() => import('./pages/GroupDetail'));
const EditGroup  = lazy(() => import('./pages/EditGroup'));

// Minimal inline fallback — matches page shape so there's no layout shift
const PageFallback = () => (
  <div className="space-y-6 animate-fade-in">
    <div className="h-8 w-56 bg-gray-200 rounded-xl animate-pulse" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[0, 1, 2].map(i => (
        <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 animate-pulse h-32" />
      ))}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {[0, 1, 2].map(i => (
        <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 animate-pulse h-48" />
      ))}
    </div>
  </div>
);

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
            <Navbar />
            <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
              {/* Suspense wraps ALL routes — each lazy page shows PageFallback while its chunk loads */}
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login"    element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Protected routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/"               element={<Dashboard />} />
                    <Route path="/create-group"   element={<CreateGroup />} />
                    <Route path="/group/:id"      element={<GroupDetail />} />
                    <Route path="/group/:id/edit" element={<EditGroup />} />
                  </Route>
                </Routes>
              </Suspense>
            </main>
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '14px',
              },
              success: { duration: 3000 },
              error:   { duration: 4000 },
            }}
          />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
