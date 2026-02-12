import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
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
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  // Fetch user preferences when user logs in or userId changes
  useEffect(() => {
    async function loadUserPreferences() {
      // Only load if we have a user and haven't loaded preferences for this user yet
      if (!user || loadedUserId === user.userId) return;

      setLoading(true);
      try {
        console.log('[DarkMode] Loading preferences for user:', user.userId);
        const preferences = await getUserPreferences(user.userId);
        console.log('[DarkMode] Loaded preferences:', preferences);
        if (preferences && preferences.darkMode !== undefined) {
          setIsDarkMode(preferences.darkMode);
          // Also update localStorage as fallback
          localStorage.setItem('darkMode', JSON.stringify(preferences.darkMode));
        }
        setLoadedUserId(user.userId);
      } catch (error) {
        console.error('[DarkMode] Failed to load user preferences:', error);
        // Fallback to localStorage if API fails
        const saved = localStorage.getItem('darkMode');
        if (saved) {
          setIsDarkMode(JSON.parse(saved));
        }
        setLoadedUserId(user.userId); // Still mark as loaded to avoid retrying
      } finally {
        setLoading(false);
      }
    }

    loadUserPreferences();
  }, [user, loadedUserId]);

  // Reset loadedUserId when user logs out
  useEffect(() => {
    if (!user) {
      setLoadedUserId(null);
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
        console.log('[DarkMode] Saving preferences for user:', user.userId, 'darkMode:', newValue);
        const updated = await updateUserPreferences({ darkMode: newValue }, user.userId);
        console.log('[DarkMode] Preferences saved successfully:', updated);
        
        // Verify the save was successful
        if (!updated || updated.darkMode !== newValue) {
          console.warn('[DarkMode] Warning: Saved preferences do not match expected value', {
            expected: newValue,
            received: updated
          });
        }
      } catch (error: any) {
        console.error('[DarkMode] Failed to save user preferences:', error);
        console.error('[DarkMode] Error details:', {
          message: error.message,
          stack: error.stack,
          userId: user.userId,
          darkMode: newValue
        });
        // Show user-friendly error message
        alert(`Failed to save dark mode preference: ${error.message || 'Unknown error'}. Please try again.`);
        // Don't revert - localStorage already saved
      }
    } else {
      console.warn('[DarkMode] Cannot save preferences - user not authenticated');
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
