/**
 * Tests for BotConnection component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BotConnection } from '../BotConnection';

// Mock fetch
global.fetch = jest.fn();

// Mock window.confirm
global.confirm = jest.fn();

describe('BotConnection Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset location state
    Object.assign(window.location, {
      href: 'http://localhost/',
      search: '',
      pathname: '/',
    });
  });

  describe('Loading state', () => {
    it('should show loading spinner initially', () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<BotConnection />);

      expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });
  });

  describe('No bot account connected', () => {
    it('should show connect button when no account connected', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ botAccount: null }),
      });

      render(<BotConnection />);

      await waitFor(() => {
        expect(screen.getByText('Conectar Cuenta de Twitter')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/No hay ninguna cuenta conectada/)
      ).toBeInTheDocument();
    });

    it('should show connect button that can be clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ botAccount: null }),
      });

      render(<BotConnection />);

      await waitFor(() => {
        expect(screen.getByText('Conectar Cuenta de Twitter')).toBeInTheDocument();
      });

      const connectButton = screen.getByText('Conectar Cuenta de Twitter');
      expect(connectButton).toBeEnabled();

      // Note: We don't test the actual redirect as jsdom doesn't support it well
      // The redirect logic is simple and will be tested in E2E tests
    });
  });

  describe('Bot account connected', () => {
    const mockBotAccount = {
      id: 'bot123',
      username: 'testbot',
      displayName: 'Test Bot',
      profileImageUrl: 'https://example.com/avatar.jpg',
      isConnected: true,
      connectedAt: '2024-01-01T00:00:00Z',
      lastUsedAt: '2024-01-15T12:00:00Z',
    };

    it('should display connected bot account info', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ botAccount: mockBotAccount }),
      });

      render(<BotConnection />);

      await waitFor(() => {
        expect(screen.getByText('Test Bot')).toBeInTheDocument();
      });

      expect(screen.getByText('@testbot')).toBeInTheDocument();
      expect(screen.getByText('Conectada')).toBeInTheDocument();
    });

    it('should show profile image', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ botAccount: mockBotAccount }),
      });

      render(<BotConnection />);

      await waitFor(() => {
        expect(screen.getByText('Test Bot')).toBeInTheDocument();
      });

      const img = screen.getByRole('img', { name: 'testbot' });
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('should show reconnect button', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ botAccount: mockBotAccount }),
      });

      render(<BotConnection />);

      await waitFor(() => {
        expect(screen.getByText('Reconectar')).toBeInTheDocument();
      });
    });

    it('should show disconnect button', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ botAccount: mockBotAccount }),
      });

      render(<BotConnection />);

      await waitFor(() => {
        expect(screen.getByText('Desconectar')).toBeInTheDocument();
      });
    });
  });

  describe('Disconnect functionality', () => {
    const mockBotAccount = {
      id: 'bot123',
      username: 'testbot',
      displayName: 'Test Bot',
      isConnected: true,
      connectedAt: '2024-01-01T00:00:00Z',
    };

    it('should ask for confirmation before disconnecting', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ botAccount: mockBotAccount }),
      });

      (global.confirm as jest.Mock).mockReturnValueOnce(false);

      render(<BotConnection />);

      await waitFor(() => {
        expect(screen.getByText('Desconectar')).toBeInTheDocument();
      });

      const disconnectButton = screen.getByText('Desconectar');
      fireEvent.click(disconnectButton);

      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('¿Desconectar cuenta del bot?')
      );

      // Should not call DELETE API if not confirmed
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only the initial GET
    });

    it('should disconnect bot account when confirmed', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ botAccount: mockBotAccount }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      (global.confirm as jest.Mock).mockReturnValueOnce(true);

      render(<BotConnection />);

      await waitFor(() => {
        expect(screen.getByText('Desconectar')).toBeInTheDocument();
      });

      const disconnectButton = screen.getByText('Desconectar');
      fireEvent.click(disconnectButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/bot-account', {
          method: 'DELETE',
        });
      });

      // Should show connect button after disconnect
      await waitFor(() => {
        expect(screen.getByText('Conectar Cuenta de Twitter')).toBeInTheDocument();
      });
    });

    it('should show error message if disconnect fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ botAccount: mockBotAccount }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ message: 'Failed to disconnect' }),
        });

      (global.confirm as jest.Mock).mockReturnValueOnce(true);

      render(<BotConnection />);

      await waitFor(() => {
        expect(screen.getByText('Desconectar')).toBeInTheDocument();
      });

      const disconnectButton = screen.getByText('Desconectar');
      fireEvent.click(disconnectButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to disconnect/)).toBeInTheDocument();
      });
    });
  });

  // Note: OAuth callback handling tests are skipped as jsdom doesn't properly
  // support URLSearchParams modifications without triggering navigation errors.
  // This functionality will be covered by E2E tests with Playwright.

  describe('Error handling', () => {
    it('should show error message if fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<BotConnection />);

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    it('should show error if API returns non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      render(<BotConnection />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch bot account/)).toBeInTheDocument();
      });
    });
  });
});
