import { afterEach, describe, expect, it, vi } from 'vitest';
import { listMachineReadingSubmissions } from './api';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function response(data: unknown) {
  vi.stubGlobal('localStorage', { getItem: () => null });
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data }), { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
describe('reading submissions server search client', () => {
  it('keeps unpaged dashboard calls unpaged and returns the complete server array', async () => {
    const submissions = Array.from({ length: 45 }, (_, i) => ({ _id: String(i) }));
    const fetch = response({ submissions });
    expect((await listMachineReadingSubmissions('pending')).submissions).toHaveLength(45);
    const url = new URL(String(fetch.mock.calls[0][0]), 'http://localhost:5000');
    expect(url.searchParams.get('status')).toBe('pending'); expect(url.searchParams.has('page')).toBe(false); expect(url.searchParams.has('limit')).toBe(false);
  });
  it('encodes literal search, selected status and paging and passes cancellation to fetch', async () => {
    const data = { submissions: [], pagination: { page: 3, limit: 20, total: 43, pages: 3 } };
    const fetch = response(data), controller = new AbortController();
    expect(await listMachineReadingSubmissions('approved', { search: '  ARS-[A]+ & Quantum  ', page: 3, limit: 20 }, controller.signal)).toEqual(data);
    const url = new URL(String(fetch.mock.calls[0][0]), 'http://localhost:5000');
    expect(url.searchParams.get('search')).toBe('ARS-[A]+ & Quantum'); expect(url.searchParams.get('status')).toBe('approved');
    expect(url.searchParams.get('page')).toBe('3'); expect(url.searchParams.get('limit')).toBe('20');
    expect(fetch.mock.calls[0][1].signal).toBe(controller.signal);
  });
  it('clears the server search parameter while retaining explicit paging', async () => {
    const fetch = response({ submissions: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } });
    await listMachineReadingSubmissions('rejected', { search: '  ', page: 1, limit: 20 });
    const url = new URL(String(fetch.mock.calls[0][0]), 'http://localhost:5000');
    expect(url.searchParams.has('search')).toBe(false); expect(url.searchParams.get('status')).toBe('rejected'); expect(url.searchParams.get('page')).toBe('1');
  });
});
