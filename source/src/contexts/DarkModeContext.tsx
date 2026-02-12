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
      if (!user) {
        console.log('[DarkMode] No user, skipping preference load');
        return;
      }
      
      if (loadedUserId === user.userId) {
        console.log('[DarkMode] Preferences already loaded for user:', user.userId);
        return;
      }

      console.log('[DarkMode] Loading preferences for user:', user.userId, 'previous loadedUserId:', loadedUserId);
      setLoading(true);
      try {
        const preferences = await getUserPreferences(user.userId);
        console.log('[DarkMode] Loaded preferences from API:', preferences);
        console.log('[DarkMode] Preference darkMode value:', preferences?.darkMode, 'type:', typeof preferences?.darkMode);
        
        if (preferences) {
          // Use darkMode from preferences, defaulting to false if undefined
          const darkModeValue = preferences.darkMode !== undefined ? preferences.darkMode : false;
          console.log('[DarkMode] Applying darkMode value:', darkModeValue);
          setIsDarkMode(darkModeValue);
          // Also update localStorage as fallback
          localStorage.setItem('darkMode', JSON.stringify(darkModeValue));
        } else {
          // No preferences found, default to false
          console.log('[DarkMode] No preferences found in response, defaulting to darkMode=false');
          setIsDarkMode(false);
          localStorage.setItem('darkMode', JSON.stringify(false));
        }
        setLoadedUserId(user.userId);
        console.log('[DarkMode] Successfully loaded and applied preferences for user:', user.userId);
      } catch (error: any) {
        console.error('[DarkMode] Failed to load user preferences:', error);
        console.error('[DarkMode] Error status:', error.status);
        
        // If 404, the Functions might not be deployed or linked
        if (error.status === 404) {
          console.warn('[DarkMode] 404 error - Functions may not be deployed or Static Web Apps not linked to Functions app');
          console.warn('[DarkMode] Falling back to localStorage. Preferences will not persist across sessions.');
        }
        
        // Fallback to localStorage if API fails, but still default to false if not found
        const saved = localStorage.getItem('darkMode');
        if (saved) {
          console.log('[DarkMode] Using localStorage fallback:', saved);
          setIsDarkMode(JSON.parse(saved));
        } else {
          console.log('[DarkMode] No localStorage value, defaulting to false');
          setIsDarkMode(false);
          localStorage.setItem('darkMode', JSON.stringify(false));
        }
        setLoadedUserId(user.userId); // Still mark as loaded to avoid retrying
      } finally {
        setLoading(false);
      }
    }

    loadUserPreferences();
  }, [user, loadedUserId]);

  // Reset loadedUserId when user logs out or changes
  useEffect(() => {
    if (!user) {
      console.log('[DarkMode] User logged out, resetting loadedUserId');
      setLoadedUserId(null);
    } else {
      // Check if user changed using functional update to avoid stale closure
      setLoadedUserId((prevLoadedUserId) => {
        if (prevLoadedUserId && prevLoadedUserId !== user.userId) {
          // User changed (different user logged in), reset loadedUserId to force reload
          console.log('[DarkMode] User changed from', prevLoadedUserId, 'to', user.userId, '- resetting loadedUserId');
          return null;
        }
        return prevLoadedUserId; // Keep current value if same user
      });
    }
  }, [user?.userId]); // Only depend on user.userId

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
