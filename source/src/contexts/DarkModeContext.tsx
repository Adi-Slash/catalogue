import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getUserPreferences, updateUserPreferences } from '../api/userPreferences';

interface DarkModeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  loading: boolean;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage for saved preference (fallback for non-authenticated users)
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [loading, setLoading] = useState(false);
  const [hasLoadedUserPrefs, setHasLoadedUserPrefs] = useState(false);

  // Fetch user preferences when user logs in
  useEffect(() => {
    async function loadUserPreferences() {
      if (!user || hasLoadedUserPrefs) return;

      setLoading(true);
      try {
        const preferences = await getUserPreferences(user.userId);
        if (preferences && preferences.darkMode !== undefined) {
          setIsDarkMode(preferences.darkMode);
          // Also update localStorage as fallback
          localStorage.setItem('darkMode', JSON.stringify(preferences.darkMode));
        }
        setHasLoadedUserPrefs(true);
      } catch (error) {
        console.error('Failed to load user preferences:', error);
        // Fallback to localStorage if API fails
        const saved = localStorage.getItem('darkMode');
        if (saved) {
          setIsDarkMode(JSON.parse(saved));
        }
        setHasLoadedUserPrefs(true);
      } finally {
        setLoading(false);
      }
    }

    loadUserPreferences();
  }, [user, hasLoadedUserPrefs]);

  // Reset hasLoadedUserPrefs when user logs out
  useEffect(() => {
    if (!user) {
      setHasLoadedUserPrefs(false);
    }
  }, [user]);

  // Apply dark mode class to root element
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark-mode');
    } else {
      root.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const toggleDarkMode = async () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    
    // Save to localStorage immediately (fallback)
    localStorage.setItem('darkMode', JSON.stringify(newValue));

    // Save to backend if user is authenticated
    if (user) {
      try {
        await updateUserPreferences({ darkMode: newValue }, user.userId);
      } catch (error) {
        console.error('Failed to save user preferences:', error);
        // Don't revert - localStorage already saved
      }
    }
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode, loading }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
}
