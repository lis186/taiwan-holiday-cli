import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { output, OutputService } from '../../../src/lib/output.js';

describe('OutputService', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('print', () => {
    it('should print to stdout', () => {
      output.print('Hello World');
      expect(consoleLogSpy).toHaveBeenCalledWith('Hello World');
    });

    it('should handle empty string', () => {
      output.print('');
      expect(consoleLogSpy).toHaveBeenCalledWith('');
    });
  });

  describe('error', () => {
    it('should print error to stderr', () => {
      output.error('Something went wrong');
      expect(consoleErrorSpy).toHaveBeenCalledWith('錯誤: Something went wrong');
    });
  });

  describe('errorRaw', () => {
    it('should print raw error without prefix', () => {
      output.errorRaw('Raw error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Raw error message');
    });
  });

  describe('success', () => {
    it('should print success message', () => {
      output.success('Operation completed');
      expect(consoleLogSpy).toHaveBeenCalledWith('Operation completed');
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton output instance', () => {
      expect(output).toBeInstanceOf(OutputService);
    });
  });
});
