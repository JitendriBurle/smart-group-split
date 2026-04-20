import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Layout-aware skeleton shown during the ~50ms Firebase auth check.
// Matches the Dashboard shape so there's no jarring layout shift when content arrives.
const AuthSkeleton = () => (
  <div className="space-y-8 animate-fade-in">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <div className="h-8 w-52 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="h-11 w-36 bg-indigo-100 rounded-2xl animate-pulse" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[0, 1, 2].map(i => (
        <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 flex items-center gap-6 animate-pulse">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-20 bg-gray-100 rounded" />
            <div className="h-7 w-12 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {[0, 1, 2].map(i => (
        <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 animate-pulse space-y-6">
          <div className="flex justify-between">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl" />
            <div className="w-5 h-5 bg-gray-100 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-5 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-50 rounded w-1/2" />
          </div>
          <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
            <div className="flex -space-x-2">
              {[0, 1, 2].map(j => <div key={j} className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white" />)}
            </div>
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <AuthSkeleton />;
  if (!user)   return <Navigate to="/login" replace />;

  return <Outlet />;
};

export default ProtectedRoute;
