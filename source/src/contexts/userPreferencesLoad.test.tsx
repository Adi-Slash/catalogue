import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { LanguageProvider, useLanguage } from './LanguageContext';
import { DarkModeProvider, useDarkMode } from './DarkModeContext';
import * as userPreferencesApi from '../api/userPreferences';

// Mock auth to provide a user
const mockUser = {
  userId: 'test-user-123',
  userDetails: 'Test User',
  identityProvider: 'aad',
  userRoles: [] as string[],
  claims: {},
};

vi.mock('./AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Component that reads language and dark mode so providers run their effects
function Consumer() {
  const { language } = useLanguage();
  const { isDarkMode } = useDarkMode();
  return (
    <span data-testid="consumer">
      {language}|{isDarkMode ? 'dark' : 'light'}
    </span>
  );
}

describe('User preferences load on login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(userPreferencesApi, 'getUserPreferences').mockResolvedValue({
      id: mockUser.userId,
      userId: mockUser.userId,
      darkMode: true,
      language: 'fr',
      updatedAt: new Date().toISOString(),
    });
  });

  it('calls getUserPreferences when user is present', async () => {
    render(
      <LanguageProvider>
        <DarkModeProvider>
          <Consumer />
        </DarkModeProvider>
      </LanguageProvider>
    );
    await waitFor(() => {
      expect(userPreferencesApi.getUserPreferences).toHaveBeenCalledWith(mockUser.userId);
    });
    // Both providers call getUserPreferences
    expect(userPreferencesApi.getUserPreferences).toHaveBeenCalledTimes(2);
  });

  it('applies loaded language preference', async () => {
    render(
      <LanguageProvider>
        <DarkModeProvider>
          <Consumer />
        </DarkModeProvider>
      </LanguageProvider>
    );
    await waitFor(() => {
      expect(userPreferencesApi.getUserPreferences).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId('consumer')).toHaveTextContent('fr|');
    });
  });

  it('applies loaded dark mode preference', async () => {
    render(
      <LanguageProvider>
        <DarkModeProvider>
          <Consumer />
        </DarkModeProvider>
      </LanguageProvider>
    );
    await waitFor(() => {
      expect(userPreferencesApi.getUserPreferences).toHaveBeenCalled();
    });
    await waitFor(() => {
      const el = screen.getByTestId('consumer');
      expect(el.textContent).toContain('dark');
    });
  });
});
