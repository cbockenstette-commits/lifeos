import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { BacklinksPanel } from '../components/links/backlinks-panel.js';

// P7 RTL smoke test for the Backlinks panel. Verifies:
//   1. Loads hydrated links from /api/entity-links/hydrated
//   2. Renders both "Links to" (outgoing) and "Referenced by" (incoming)
//   3. Empty state when nothing links

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

// Each fetch call must get its own Response instance because the body
// stream can only be consumed once. A single shared Response from
// mockResolvedValue gets consumed by whichever query fires first and
// every subsequent fetch throws "body already read".
function makeJsonFactory(bodyByUrl: (url: string) => unknown) {
  return async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    return new Response(JSON.stringify(bodyByUrl(url)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <BacklinksPanel
          entity_type="task"
          entity_id="00000000-0000-0000-0000-000000000001"
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BacklinksPanel', () => {
  it('renders outgoing and incoming hydrated edges', async () => {
    mockFetch.mockImplementation(
      makeJsonFactory((url) => {
        if (url.includes('/api/entity-links/hydrated')) {
          return {
            outgoing: [
              {
                link_id: 'link-1',
                relation_type: 'references',
                other: {
                  type: 'resource',
                  id: 'r1',
                  title: 'Couch to 5k',
                  archived_at: null,
                  secondary: 'url',
                  color: null,
                },
              },
            ],
            incoming: [
              {
                link_id: 'link-2',
                relation_type: 'references',
                other: {
                  type: 'project',
                  id: 'p1',
                  title: 'Run a 5k',
                  archived_at: null,
                  secondary: 'active',
                  color: null,
                },
              },
            ],
          };
        }
        // Other endpoints (areas/projects/tasks/resources) can return [].
        return [];
      }),
    );

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('Couch to 5k')).toBeInTheDocument();
    });
    expect(screen.getByText('References')).toBeInTheDocument();
    expect(screen.getByText('Links to')).toBeInTheDocument();
    expect(screen.getByText('Referenced by')).toBeInTheDocument();
    expect(screen.getByText('Run a 5k')).toBeInTheDocument();
  });

  it('shows empty state when no edges exist', async () => {
    mockFetch.mockImplementation(
      makeJsonFactory((url) => {
        if (url.includes('/api/entity-links/hydrated')) {
          return { outgoing: [], incoming: [] };
        }
        return [];
      }),
    );

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText(/no links yet/i)).toBeInTheDocument();
    });
  });
});
