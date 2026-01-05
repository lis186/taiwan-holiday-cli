import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createConfigCommand, formatConfigList } from '../../../src/commands/config.js';
import { createConsoleLogSpy } from '../../helpers/mocks.js';
import type { OutputFormat } from '../../../src/commands/check.js';

// Mock console.log using helper
const mockConsoleLog = createConsoleLogSpy();

// Mock config store
const mockStore = new Map<string, string>();
const mockConfigService = {
  list: vi.fn(() => Object.fromEntries(mockStore)),
  get: vi.fn((key: string) => mockStore.get(key)),
  set: vi.fn((key: string, value: string) => mockStore.set(key, value)),
  getDefaultFormat: vi.fn(() => (mockStore.get('format') as OutputFormat) || 'simple'),
};

vi.mock('../../../src/lib/config.js', () => ({
  getConfigService: () => mockConfigService,
}));

describe('config command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
    mockStore.clear();
    mockStore.set('format', 'simple');
  });

  describe('formatConfigList', () => {
    it('should format config list in simple format', () => {
      const config = { format: 'simple' };
      const result = formatConfigList(config, 'simple');
      expect(result).toContain('format');
      expect(result).toContain('simple');
    });

    it('should format config list as JSON', () => {
      const config = { format: 'table' };
      const result = formatConfigList(config, 'json');
      const parsed = JSON.parse(result);
      expect(parsed.format).toBe('table');
    });

    it('should handle empty config', () => {
      const result = formatConfigList({}, 'simple');
      expect(result).toContain('無設定');
    });
  });

  describe('createConfigCommand', () => {
    it('should create a command with correct name', () => {
      const cmd = createConfigCommand();
      expect(cmd.name()).toBe('config');
    });

    it('should have list subcommand', () => {
      const cmd = createConfigCommand();
      const listCmd = cmd.commands.find((c) => c.name() === 'list');
      expect(listCmd).toBeDefined();
    });

    it('should have get subcommand', () => {
      const cmd = createConfigCommand();
      const getCmd = cmd.commands.find((c) => c.name() === 'get');
      expect(getCmd).toBeDefined();
    });

    it('should have set subcommand', () => {
      const cmd = createConfigCommand();
      const setCmd = cmd.commands.find((c) => c.name() === 'set');
      expect(setCmd).toBeDefined();
    });

    it('should execute list subcommand', () => {
      const cmd = createConfigCommand();
      cmd.parse(['node', 'test', 'list']);

      expect(mockConfigService.list).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should execute get subcommand', () => {
      mockStore.set('format', 'table');
      const cmd = createConfigCommand();
      cmd.parse(['node', 'test', 'get', 'format']);

      expect(mockConfigService.get).toHaveBeenCalledWith('format');
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should execute set subcommand', () => {
      const cmd = createConfigCommand();
      cmd.parse(['node', 'test', 'set', 'format', 'json']);

      expect(mockConfigService.set).toHaveBeenCalledWith('format', 'json');
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should show error for invalid key on get', () => {
      mockConfigService.get.mockReturnValueOnce(undefined);
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const cmd = createConfigCommand();
      cmd.parse(['node', 'test', 'get', 'invalid']);

      expect(mockConsoleError).toHaveBeenCalled();
      mockConsoleError.mockRestore();
    });
  });
});
