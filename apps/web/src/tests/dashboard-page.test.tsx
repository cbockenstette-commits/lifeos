import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../pages/dashboard-page.js';

// P6 RTL smoke test: render the dashboard against a mocked aggregator
// response and assert every widget section renders with the expected
// data. Verifies:
//   1. Single /api/dashboard network request (no N+1 per widget)
//   2. All 6 widgets render
//   3. Empty arrays render the empty-state message, not a crash

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardPage', () => {
  it('renders all 6 widgets from a populated dashboard response', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        currentSprint: {
          id: 'sprint-1',
          user_id: 'user-1',
          start_date: '2026-04-05T00:00:00.000Z',
          end_date: '2026-04-11T00:00:00.000Z',
          status: 'active',
          goal: 'Ship lifeos',
          created_at: '2026-04-05T00:00:00.000Z',
          updated_at: '2026-04-05T00:00:00.000Z',
        },
        inProgressTasks: [
          {
            id: 'task-1',
            user_id: 'user-1',
            project_id: null,
            area_id: 'area-1',
            parent_id: null,
            sprint_id: 'sprint-1',
            title: 'Running',
            description: null,
            status: 'in_progress',
            urgency: 2,
            importance: 3,
            estimate_minutes: 30,
            due_date: null,
            priority_score: 6,
            sort_order: 1000,
            archived_at: null,
            completed_at: null,
            created_at: '2026-04-08T00:00:00.000Z',
            updated_at: '2026-04-08T00:00:00.000Z',
          },
        ],
        dueToday: [],
        staleTasks: [],
        weeklyFocusByArea: [
          {
            area_id: 'area-1',
            area_name: 'Health',
            task_count: 3,
            total_estimate_minutes: 90,
          },
        ],
        recentResources: [
          {
            id: 'res-1',
            user_id: 'user-1',
            area_id: null,
            title: 'Couch to 5k',
            url: 'https://example.com',
            body_md: null,
            source_kind: 'url',
            archived_at: null,
            created_at: '2026-04-08T00:00:00.000Z',
            updated_at: '2026-04-08T00:00:00.000Z',
          },
        ],
      }),
    );

    renderPage();

    await waitFor(() => {
      // Current sprint widget
      expect(screen.getByText('Current sprint')).toBeInTheDocument();
      expect(screen.getByText('Ship lifeos')).toBeInTheDocument();
    });
    // In progress widget shows the task
    expect(screen.getByText('Running')).toBeInTheDocument();
    // Area focus widget shows Health
    expect(screen.getByText('Health')).toBeInTheDocument();
    // Recent resources widget shows the resource
    expect(screen.getByText('Couch to 5k')).toBeInTheDocument();
    // All widget titles rendered
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Due today')).toBeInTheDocument();
    expect(screen.getByText('This week by area')).toBeInTheDocument();
    expect(screen.getByText('Stale')).toBeInTheDocument();
    expect(screen.getByText('Recent resources')).toBeInTheDocument();

    // Exactly one /api/dashboard call (single round-trip guarantee).
    const dashboardCalls = mockFetch.mock.calls.filter((c) =>
      String(c[0]).includes('/api/dashboard'),
    );
    expect(dashboardCalls.length).toBe(1);
  });

  it('renders empty states when every section is empty', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        currentSprint: null,
        inProgressTasks: [],
        dueToday: [],
        staleTasks: [],
        weeklyFocusByArea: [],
        recentResources: [],
      }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no sprint for this week/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/nothing due today/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing's fallen through/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing saved yet/i)).toBeInTheDocument();
  });
});
