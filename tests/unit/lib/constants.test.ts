import { describe, it, expect } from 'vitest';
import {
  API_BASE_URL,
  API_TIMEOUT_MS,
  API_HEALTH_CHECK_TIMEOUT_MS,
  CACHE_TTL_MS,
  CACHE_KEY_PREFIX,
  PROJECT_NAME,
  CLI_VERSION,
  OUTPUT_FORMATS,
  CONFIG_KEYS,
  DEFAULT_OUTPUT_FORMAT,
  KNOWN_COMMANDS,
  MONTH_RANGE,
  CACHE_KEY_YEAR_PATTERN,
} from '../../../src/lib/constants.js';

describe('constants', () => {
  describe('API constants', () => {
    it('should have valid API base URL', () => {
      expect(API_BASE_URL).toBe('https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data');
      expect(API_BASE_URL).toMatch(/^https:\/\//);
    });

    it('should have reasonable timeout values', () => {
      expect(API_TIMEOUT_MS).toBe(10000);
      expect(API_HEALTH_CHECK_TIMEOUT_MS).toBe(5000);
      expect(API_TIMEOUT_MS).toBeGreaterThan(API_HEALTH_CHECK_TIMEOUT_MS);
    });
  });

  describe('Cache constants', () => {
    it('should have cache TTL of 1 hour', () => {
      expect(CACHE_TTL_MS).toBe(60 * 60 * 1000);
    });

    it('should have cache key prefix', () => {
      expect(CACHE_KEY_PREFIX).toBe('holidays_');
    });

    it('should have cache key year pattern', () => {
      expect(CACHE_KEY_YEAR_PATTERN.test('holidays_2025')).toBe(true);
      expect(CACHE_KEY_YEAR_PATTERN.test('other_key')).toBe(false);

      const match = 'holidays_2025'.match(CACHE_KEY_YEAR_PATTERN);
      expect(match?.[1]).toBe('2025');
    });
  });

  describe('Config constants', () => {
    it('should have project name', () => {
      expect(PROJECT_NAME).toBe('taiwan-holiday-cli');
    });

    it('should have CLI version', () => {
      expect(CLI_VERSION).toBe('1.0.0');
      expect(CLI_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have valid output formats', () => {
      expect(OUTPUT_FORMATS).toContain('simple');
      expect(OUTPUT_FORMATS).toContain('json');
      expect(OUTPUT_FORMATS).toContain('table');
      expect(OUTPUT_FORMATS).toHaveLength(3);
    });

    it('should have valid config keys', () => {
      expect(CONFIG_KEYS).toContain('format');
      expect(CONFIG_KEYS).toHaveLength(1);
    });

    it('should have default output format', () => {
      expect(DEFAULT_OUTPUT_FORMAT).toBe('simple');
      expect(OUTPUT_FORMATS).toContain(DEFAULT_OUTPUT_FORMAT);
    });
  });

  describe('CLI constants', () => {
    it('should have known commands list', () => {
      expect(KNOWN_COMMANDS).toContain('check');
      expect(KNOWN_COMMANDS).toContain('today');
      expect(KNOWN_COMMANDS).toContain('range');
      expect(KNOWN_COMMANDS).toContain('stats');
      expect(KNOWN_COMMANDS).toContain('list');
      expect(KNOWN_COMMANDS).toContain('years');
      expect(KNOWN_COMMANDS).toContain('next');
      expect(KNOWN_COMMANDS).toContain('month');
      expect(KNOWN_COMMANDS).toContain('workdays');
      expect(KNOWN_COMMANDS).toContain('between');
      expect(KNOWN_COMMANDS).toContain('cache');
      expect(KNOWN_COMMANDS).toContain('config');
      expect(KNOWN_COMMANDS).toContain('health');
      expect(KNOWN_COMMANDS).toContain('completion');
      expect(KNOWN_COMMANDS).toContain('help');
    });
  });

  describe('Date constants', () => {
    it('should have valid month range', () => {
      expect(MONTH_RANGE.min).toBe(1);
      expect(MONTH_RANGE.max).toBe(12);
    });
  });
});
