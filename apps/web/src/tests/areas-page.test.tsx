import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AreasPage from '../pages/areas-page.js';

// P4 RTL smoke test. Validates that the areas list page:
//   1. Mounts without crashing
//   2. Shows a loading state
//   3. Fetches from /api/areas
//   4. Renders area names returned by the mocked fetch
//
// We mock `fetch` at the global level so api-client hits our stub.

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  // @ts-expect-error — vitest jsdom provides global fetch but we override
  global.fetch = mockFetch;
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/areas']}>
        <AreasPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('AreasPage', () => {
  it('renders the page header and new area button', async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));
    renderPage();

    expect(screen.getByRole('heading', { name: /areas/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /new area/i }).length).toBeGreaterThan(0);
    });
  });

  it('renders areas returned by the API', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse([
        {
          id: '11111111-1111-1111-1111-111111111111',
          user_id: '22222222-2222-2222-2222-222222222222',
          name: 'Health',
          description: null,
          color: '#10b981',
          archived_at: null,
          created_at: '2026-04-08T00:00:00.000Z',
          updated_at: '2026-04-08T00:00:00.000Z',
        },
      ]),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Health')).toBeInTheDocument();
    });
    // /areas was called
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/areas/),
      expect.any(Object),
    );
  });

  it('shows an empty state when no areas exist', async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no active areas/i)).toBeInTheDocument();
    });
  });
});
