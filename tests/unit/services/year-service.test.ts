import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted mocks
const { mockOfetch, mockCacheInstance } = vi.hoisted(() => ({
  mockOfetch: vi.fn(),
  mockCacheInstance: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
  },
}));

// Mock ofetch
vi.mock('ofetch', () => ({
  ofetch: mockOfetch,
}));

// Mock Cache
vi.mock('../../../src/lib/cache.js', () => ({
  Cache: vi.fn().mockImplementation(() => mockCacheInstance),
}));

// Import after mocks
import { YearService } from '../../../src/services/year-service.js';

describe('YearService', () => {
  let service: YearService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheInstance.get.mockReturnValue(null);
    service = new YearService();
  });

  describe('getAvailableYears', () => {
    it('should fetch years from jsDelivr API', async () => {
      const mockFiles = {
        files: [
          { name: '2017.json', type: 'file' },
          { name: '2018.json', type: 'file' },
          { name: '2025.json', type: 'file' },
          { name: '2026.json', type: 'file' },
        ],
      };
      mockOfetch.mockResolvedValueOnce(mockFiles);

      const years = await service.getAvailableYears();

      expect(mockOfetch).toHaveBeenCalledWith(
        'https://data.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/',
        expect.any(Object)
      );
      expect(years).toEqual([2017, 2018, 2025, 2026]);
    });

    it('should return cached years if available and not expired', async () => {
      const cachedData = {
        timestamp: Date.now(),
        years: [2017, 2018, 2019],
      };
      mockCacheInstance.get.mockReturnValue(cachedData);

      const years = await service.getAvailableYears();

      expect(mockOfetch).not.toHaveBeenCalled();
      expect(years).toEqual([2017, 2018, 2019]);
    });

    it('should fetch from API if cache is expired', async () => {
      const expiredCache = {
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        years: [2017, 2018],
      };
      mockCacheInstance.get.mockReturnValue(expiredCache);

      const mockFiles = {
        files: [
          { name: '2017.json', type: 'file' },
          { name: '2018.json', type: 'file' },
          { name: '2019.json', type: 'file' },
        ],
      };
      mockOfetch.mockResolvedValueOnce(mockFiles);

      const years = await service.getAvailableYears();

      expect(mockOfetch).toHaveBeenCalled();
      expect(years).toEqual([2017, 2018, 2019]);
    });

    it('should cache fetched years', async () => {
      const mockFiles = {
        files: [{ name: '2025.json', type: 'file' }],
      };
      mockOfetch.mockResolvedValueOnce(mockFiles);

      await service.getAvailableYears();

      expect(mockCacheInstance.set).toHaveBeenCalledWith(
        'available_years',
        expect.objectContaining({
          years: [2025],
        })
      );
    });

    it('should return fallback years on API error', async () => {
      mockOfetch.mockRejectedValueOnce(new Error('Network error'));

      const years = await service.getAvailableYears();

      expect(years.length).toBeGreaterThan(0);
      expect(years).toContain(new Date().getFullYear());
    });

    it('should use old cache on API error if available', async () => {
      const oldCache = {
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // expired
        years: [2020, 2021, 2022],
      };
      mockCacheInstance.get.mockReturnValue(oldCache);
      mockOfetch.mockRejectedValueOnce(new Error('Network error'));

      const years = await service.getAvailableYears();

      expect(years).toEqual([2020, 2021, 2022]);
    });

    it('should filter out non-json files', async () => {
      const mockFiles = {
        files: [
          { name: '2025.json', type: 'file' },
          { name: 'README.md', type: 'file' },
          { name: 'index.html', type: 'file' },
        ],
      };
      mockOfetch.mockResolvedValueOnce(mockFiles);

      const years = await service.getAvailableYears();

      expect(years).toEqual([2025]);
    });

    it('should sort years in ascending order', async () => {
      const mockFiles = {
        files: [
          { name: '2026.json', type: 'file' },
          { name: '2017.json', type: 'file' },
          { name: '2022.json', type: 'file' },
        ],
      };
      mockOfetch.mockResolvedValueOnce(mockFiles);

      const years = await service.getAvailableYears();

      expect(years).toEqual([2017, 2022, 2026]);
    });
  });

  describe('getSupportedYearRange', () => {
    it('should return start and end years', async () => {
      const mockFiles = {
        files: [
          { name: '2017.json', type: 'file' },
          { name: '2018.json', type: 'file' },
          { name: '2026.json', type: 'file' },
        ],
      };
      mockOfetch.mockResolvedValueOnce(mockFiles);

      const range = await service.getSupportedYearRange();

      expect(range).toEqual({ start: 2017, end: 2026 });
    });

    it('should return fallback range on error', async () => {
      mockOfetch.mockRejectedValueOnce(new Error('Network error'));

      const range = await service.getSupportedYearRange();

      expect(range.start).toBeDefined();
      expect(range.end).toBeDefined();
      expect(range.start).toBeLessThanOrEqual(range.end);
    });
  });

  describe('isYearSupported', () => {
    it('should return true for supported year', async () => {
      const mockFiles = {
        files: [
          { name: '2025.json', type: 'file' },
          { name: '2026.json', type: 'file' },
        ],
      };
      mockOfetch.mockResolvedValueOnce(mockFiles);

      const result = await service.isYearSupported(2025);

      expect(result).toBe(true);
    });

    it('should return false for unsupported year', async () => {
      const mockFiles = {
        files: [{ name: '2025.json', type: 'file' }],
      };
      mockOfetch.mockResolvedValueOnce(mockFiles);

      const result = await service.isYearSupported(2030);

      expect(result).toBe(false);
    });
  });

  describe('getYearsForCompletion', () => {
    it('should return space-separated years string', async () => {
      const mockFiles = {
        files: [
          { name: '2024.json', type: 'file' },
          { name: '2025.json', type: 'file' },
          { name: '2026.json', type: 'file' },
        ],
      };
      mockOfetch.mockResolvedValueOnce(mockFiles);

      const result = await service.getYearsForCompletion();

      expect(result).toBe('2024 2025 2026');
    });
  });
});

// Test for global singleton
describe('getYearService', () => {
  it('should return singleton instance', async () => {
    const { getYearService } = await import('../../../src/services/year-service.js');

    const service1 = getYearService();
    const service2 = getYearService();

    expect(service1).toBe(service2);
  });
});
