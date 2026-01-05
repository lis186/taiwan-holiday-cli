import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCacheCommand, formatCacheStatus } from '../../../src/commands/cache.js';
import type { CacheStatus } from '../../../src/lib/cache.js';

// Mock console.log
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

// Mock holiday service
const mockHolidayService = {
  getCacheStatus: vi.fn(),
  clearCache: vi.fn(),
};

vi.mock('../../../src/services/holiday-service.js', () => ({
  getHolidayService: () => mockHolidayService,
}));

describe('cache command', () => {
  const mockStatus: CacheStatus = {
    cachedYears: [2024, 2025],
    itemCount: 2,
    ttl: 3600000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
    mockHolidayService.getCacheStatus.mockReturnValue(mockStatus);
  });

  describe('formatCacheStatus', () => {
    it('should format cache status in simple format', () => {
      const result = formatCacheStatus(mockStatus, 'simple');
      expect(result).toContain('2024');
      expect(result).toContain('2025');
      expect(result).toContain('2');
    });

    it('should format as JSON', () => {
      const result = formatCacheStatus(mockStatus, 'json');
      const parsed = JSON.parse(result);
      expect(parsed.cachedYears).toEqual([2024, 2025]);
      expect(parsed.itemCount).toBe(2);
    });

    it('should handle empty cache', () => {
      const emptyStatus: CacheStatus = {
        cachedYears: [],
        itemCount: 0,
        ttl: 3600000,
      };
      const result = formatCacheStatus(emptyStatus, 'simple');
      expect(result).toContain('無');
    });
  });

  describe('createCacheCommand', () => {
    it('should create a command with correct name', () => {
      const cmd = createCacheCommand();
      expect(cmd.name()).toBe('cache');
    });

    it('should have subcommands', () => {
      const cmd = createCacheCommand();
      const subcommands = cmd.commands;
      expect(subcommands.length).toBeGreaterThan(0);
    });

    it('should have status subcommand', () => {
      const cmd = createCacheCommand();
      const statusCmd = cmd.commands.find((c) => c.name() === 'status');
      expect(statusCmd).toBeDefined();
    });

    it('should have clear subcommand', () => {
      const cmd = createCacheCommand();
      const clearCmd = cmd.commands.find((c) => c.name() === 'clear');
      expect(clearCmd).toBeDefined();
    });

    it('should execute status subcommand', () => {
      const cmd = createCacheCommand();
      cmd.parse(['node', 'test', 'status']);

      expect(mockHolidayService.getCacheStatus).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should execute clear subcommand', () => {
      const cmd = createCacheCommand();
      cmd.parse(['node', 'test', 'clear']);

      expect(mockHolidayService.clearCache).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });
});
