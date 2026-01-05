import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHealthCommand, formatHealthResult } from '../../../src/commands/health.js';
import { createConsoleLogSpy, createMockHolidayService } from '../../helpers/mocks.js';
import type { HealthStatus } from '../../../src/commands/health.js';

// Mock console.log using helper
const mockConsoleLog = createConsoleLogSpy();

// Mock holiday service using helper
const mockHolidayService = createMockHolidayService();

vi.mock('../../../src/services/holiday-service.js', () => ({
  getHolidayService: () => mockHolidayService,
}));

describe('health command', () => {
  const mockHealthy: HealthStatus = {
    status: 'healthy',
    cache: {
      available: true,
      itemCount: 2,
    },
    api: {
      reachable: true,
      latency: 120,
    },
    version: '1.0.0',
  };

  const mockUnhealthy: HealthStatus = {
    status: 'degraded',
    cache: {
      available: true,
      itemCount: 0,
    },
    api: {
      reachable: false,
      error: '無法連線',
    },
    version: '1.0.0',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
  });

  describe('formatHealthResult', () => {
    it('should format healthy status in simple format', () => {
      const result = formatHealthResult(mockHealthy, 'simple');
      expect(result).toContain('正常');
      expect(result).toContain('✓');
    });

    it('should format degraded status in simple format', () => {
      const result = formatHealthResult(mockUnhealthy, 'simple');
      expect(result).toContain('降級');
      expect(result).toContain('✗');
    });

    it('should format as JSON', () => {
      const result = formatHealthResult(mockHealthy, 'json');
      const parsed = JSON.parse(result);
      expect(parsed.status).toBe('healthy');
      expect(parsed.cache.available).toBe(true);
      expect(parsed.api.reachable).toBe(true);
    });

    it('should show latency when api is reachable', () => {
      const result = formatHealthResult(mockHealthy, 'simple');
      expect(result).toContain('120ms');
    });

    it('should show error when api is not reachable', () => {
      const result = formatHealthResult(mockUnhealthy, 'simple');
      expect(result).toContain('無法連線');
    });
  });

  describe('createHealthCommand', () => {
    it('should create a command with correct name', () => {
      const cmd = createHealthCommand();
      expect(cmd.name()).toBe('health');
    });

    it('should have format option', () => {
      const cmd = createHealthCommand();
      const formatOption = cmd.options.find((opt) => opt.long === '--format');
      expect(formatOption).toBeDefined();
    });

    it('should execute action and output result', async () => {
      mockHolidayService.getCacheStatus.mockReturnValue({
        cachedYears: [2024, 2025],
        itemCount: 2,
        ttl: 3600000,
      });
      mockHolidayService.checkApiHealth.mockResolvedValue({
        reachable: true,
        latency: 100,
      });

      const cmd = createHealthCommand();
      await cmd.parseAsync(['node', 'test']);

      expect(mockHolidayService.getCacheStatus).toHaveBeenCalled();
      expect(mockHolidayService.checkApiHealth).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });
});
