import { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  // Ref to track which userId we've loaded for - ensures we always load when user becomes available
  const loadedForUserIdRef = useRef<string | null>(null);

  // Reset ref when user logs out
  useEffect(() => {
    if (!user) {
      loadedForUserIdRef.current = null;
    }
  }, [user]);

  // Fetch user preferences when user logs in - depend only on user?.userId so we always run when user is set
  useEffect(() => {
    const userId = user?.userId;
    if (!userId) {
      return;
    }
    if (loadedForUserIdRef.current === userId) {
      return;
    }

    let cancelled = false;
    loadedForUserIdRef.current = userId;
    console.log('[DarkMode] Loading preferences for user:', userId);
    setLoading(true);

    getUserPreferences(userId)
      .then((preferences) => {
        if (cancelled) return;
        console.log('[DarkMode] Loaded preferences from API:', preferences);
        const darkModeValue =
          preferences?.darkMode !== undefined ? preferences.darkMode : false;
        console.log('[DarkMode] Applying darkMode value:', darkModeValue);
        setIsDarkMode(darkModeValue);
        localStorage.setItem('darkMode', JSON.stringify(darkModeValue));
      })
      .catch((error: any) => {
        if (cancelled) return;
        console.error('[DarkMode] Failed to load user preferences:', error);
        const saved = localStorage.getItem('darkMode');
        if (saved) {
          setIsDarkMode(JSON.parse(saved));
        } else {
          setIsDarkMode(false);
          localStorage.setItem('darkMode', JSON.stringify(false));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.userId]); // Only depend on userId - effect runs whenever user identity is set

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
        console.log('[DarkMode] User object:', { userId: user.userId, userDetails: user.userDetails });
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
          status: error.status,
          stack: error.stack,
          userId: user.userId,
          darkMode: newValue,
          errorData: (error as any).errorData
        });
        // Show error in console but don't block UI - dark mode change still works locally
        console.warn('[DarkMode] Dark mode preference saved to localStorage only. Backend save failed.');
        // Don't revert - localStorage already saved, UI already updated
      }
    } else {
      console.warn('[DarkMode] User not authenticated - saving to localStorage only');
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
