import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createConfigService, isValidConfigKey, type ConfigService } from '../../src/lib/config.js';

// Mock Conf
const mockStore = new Map<string, string>();

vi.mock('conf', () => {
  return {
    default: class MockConf {
      private defaults: Record<string, string>;

      constructor(options: { defaults: Record<string, string> }) {
        this.defaults = options.defaults;
        // Initialize with defaults
        for (const [key, value] of Object.entries(this.defaults)) {
          if (!mockStore.has(key)) {
            mockStore.set(key, value);
          }
        }
      }

      get(key: string) {
        return mockStore.get(key) ?? this.defaults[key];
      }

      set(key: string, value: string) {
        mockStore.set(key, value);
      }
    },
  };
});

describe('config service', () => {
  let configService: ConfigService;

  beforeEach(() => {
    mockStore.clear();
    configService = createConfigService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return all config items', () => {
      const result = configService.list();
      expect(result).toHaveProperty('format');
      expect(result.format).toBe('simple');
    });
  });

  describe('get', () => {
    it('should get existing config value', () => {
      const result = configService.get('format');
      expect(result).toBe('simple');
    });

    it('should return undefined for invalid key', () => {
      const result = configService.get('invalid');
      expect(result).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should set valid config value', () => {
      configService.set('format', 'json');
      expect(configService.get('format')).toBe('json');
    });

    it('should throw error for invalid key', () => {
      expect(() => configService.set('invalid', 'value')).toThrow('無效的設定項目');
    });

    it('should throw error for invalid format value', () => {
      expect(() => configService.set('format', 'invalid')).toThrow('無效的格式');
    });
  });

  describe('getDefaultFormat', () => {
    it('should return default format', () => {
      const result = configService.getDefaultFormat();
      expect(result).toBe('simple');
    });

    it('should return configured format', () => {
      configService.set('format', 'table');
      const result = configService.getDefaultFormat();
      expect(result).toBe('table');
    });
  });

  describe('isValidConfigKey', () => {
    it('should return true for valid key', () => {
      expect(isValidConfigKey('format')).toBe(true);
    });

    it('should return false for invalid key', () => {
      expect(isValidConfigKey('invalid')).toBe(false);
    });
  });
});
