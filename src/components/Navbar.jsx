import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, PieChart, Users, PlusCircle, Menu, X, Moon, Sun } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!user) return null;

  return (
    <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 text-indigo-600 font-bold text-xl" onClick={() => setMenuOpen(false)}>
              <PieChart className="w-7 h-7" />
              <span>SmartSplit</span>
            </Link>
            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-6 text-gray-600 dark:text-gray-300 font-medium">
              <Link to="/" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                <Users className="w-4 h-4" /> Dashboard
              </Link>
              <Link to="/create-group" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                <PlusCircle className="w-4 h-4" /> New Group
              </Link>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400 truncate max-w-[160px]">{user.email}</span>

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-all"
              aria-label="Toggle dark mode"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md active:scale-95"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-indigo-50 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-all"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md animate-fade-in">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest px-3 pb-2">{user.email}</p>
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-700 dark:text-gray-200 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 transition-all"
            >
              <Users className="w-5 h-5" /> Dashboard
            </Link>
            <Link
              to="/create-group"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-700 dark:text-gray-200 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 transition-all"
            >
              <PlusCircle className="w-5 h-5" /> New Group
            </Link>
            {/* Dark mode in drawer */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button
              onClick={() => { setMenuOpen(false); handleLogout(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-600 font-bold hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
            >
              <LogOut className="w-5 h-5" /> Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
