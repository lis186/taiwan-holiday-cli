import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCompletionCommand, generateBashCompletion, generateZshCompletion, generateFishCompletion } from '../../../src/commands/completion.js';

// Mock console.log
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('completion command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
  });

  describe('generateBashCompletion', () => {
    it('should generate bash completion script', () => {
      const result = generateBashCompletion();
      expect(result).toContain('_holiday_completions');
      expect(result).toContain('complete -F');
      expect(result).toContain('holiday');
    });

    it('should include all commands in completion', () => {
      const result = generateBashCompletion();
      expect(result).toContain('check');
      expect(result).toContain('today');
      expect(result).toContain('range');
      expect(result).toContain('stats');
    });
  });

  describe('generateZshCompletion', () => {
    it('should generate zsh completion script', () => {
      const result = generateZshCompletion();
      expect(result).toContain('#compdef holiday');
      expect(result).toContain('_holiday');
    });

    it('should include all commands in completion', () => {
      const result = generateZshCompletion();
      expect(result).toContain('check');
      expect(result).toContain('today');
      expect(result).toContain('range');
    });
  });

  describe('generateFishCompletion', () => {
    it('should generate fish completion script', () => {
      const result = generateFishCompletion();
      expect(result).toContain('complete -c holiday');
    });

    it('should include all commands in completion', () => {
      const result = generateFishCompletion();
      expect(result).toContain('check');
      expect(result).toContain('today');
      expect(result).toContain('range');
    });
  });

  describe('createCompletionCommand', () => {
    it('should create a command with correct name', () => {
      const cmd = createCompletionCommand();
      expect(cmd.name()).toBe('completion');
    });

    it('should have shell argument', () => {
      const cmd = createCompletionCommand();
      const args = cmd.registeredArguments;
      expect(args.length).toBe(1);
      expect(args[0].name()).toBe('shell');
    });

    it('should output bash completion', () => {
      const cmd = createCompletionCommand();
      cmd.parse(['node', 'test', 'bash']);

      expect(mockConsoleLog).toHaveBeenCalled();
      const output = mockConsoleLog.mock.calls[0][0];
      expect(output).toContain('_holiday_completions');
    });

    it('should output zsh completion', () => {
      const cmd = createCompletionCommand();
      cmd.parse(['node', 'test', 'zsh']);

      expect(mockConsoleLog).toHaveBeenCalled();
      const output = mockConsoleLog.mock.calls[0][0];
      expect(output).toContain('#compdef holiday');
    });

    it('should output fish completion', () => {
      const cmd = createCompletionCommand();
      cmd.parse(['node', 'test', 'fish']);

      expect(mockConsoleLog).toHaveBeenCalled();
      const output = mockConsoleLog.mock.calls[0][0];
      expect(output).toContain('complete -c holiday');
    });

    it('should show error for invalid shell', () => {
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const cmd = createCompletionCommand();
      cmd.parse(['node', 'test', 'invalid']);

      expect(mockConsoleError).toHaveBeenCalled();
      mockConsoleError.mockRestore();
    });
  });
});
