import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  DateValidationError,
  ServiceError,
  DataError,
  NetworkError,
  ConfigError,
  ExitCode,
  getExitCode,
  formatErrorMessage,
} from '../../../src/lib/errors.js';

describe('errors', () => {
  describe('AppError', () => {
    it('should create error with message and code', () => {
      const error = new AppError('test error', ExitCode.GENERAL);
      expect(error.message).toBe('test error');
      expect(error.code).toBe(ExitCode.GENERAL);
      expect(error.name).toBe('AppError');
    });

    it('should default to GENERAL exit code', () => {
      const error = new AppError('test error');
      expect(error.code).toBe(ExitCode.GENERAL);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('invalid input');
      expect(error.message).toBe('invalid input');
      expect(error.code).toBe(ExitCode.VALIDATION);
      expect(error.name).toBe('ValidationError');
    });

    it('should be instanceof AppError', () => {
      const error = new ValidationError('test');
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('DateValidationError', () => {
    it('should create date validation error', () => {
      const error = new DateValidationError('invalid date format');
      expect(error.message).toBe('invalid date format');
      expect(error.code).toBe(ExitCode.VALIDATION);
      expect(error.name).toBe('DateValidationError');
    });

    it('should be instanceof ValidationError', () => {
      const error = new DateValidationError('test');
      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  describe('ServiceError', () => {
    it('should create service error', () => {
      const error = new ServiceError('service failed');
      expect(error.message).toBe('service failed');
      expect(error.code).toBe(ExitCode.GENERAL);
      expect(error.name).toBe('ServiceError');
    });
  });

  describe('DataError', () => {
    it('should create data error', () => {
      const error = new DataError('data not found');
      expect(error.message).toBe('data not found');
      expect(error.code).toBe(ExitCode.DATA);
      expect(error.name).toBe('DataError');
    });
  });

  describe('NetworkError', () => {
    it('should create network error', () => {
      const error = new NetworkError('connection failed');
      expect(error.message).toBe('connection failed');
      expect(error.code).toBe(ExitCode.NETWORK);
      expect(error.name).toBe('NetworkError');
    });
  });

  describe('ConfigError', () => {
    it('should create config error', () => {
      const error = new ConfigError('invalid config');
      expect(error.message).toBe('invalid config');
      expect(error.code).toBe(ExitCode.CONFIG);
      expect(error.name).toBe('ConfigError');
    });
  });

  describe('ExitCode', () => {
    it('should have correct exit code values', () => {
      expect(ExitCode.SUCCESS).toBe(0);
      expect(ExitCode.GENERAL).toBe(1);
      expect(ExitCode.VALIDATION).toBe(2);
      expect(ExitCode.NETWORK).toBe(3);
      expect(ExitCode.DATA).toBe(4);
      expect(ExitCode.CONFIG).toBe(5);
    });
  });

  describe('getExitCode', () => {
    it('should return code from AppError', () => {
      const error = new ValidationError('test');
      expect(getExitCode(error)).toBe(ExitCode.VALIDATION);
    });

    it('should return GENERAL for regular Error', () => {
      const error = new Error('test');
      expect(getExitCode(error)).toBe(ExitCode.GENERAL);
    });

    it('should return GENERAL for unknown error', () => {
      expect(getExitCode('string error')).toBe(ExitCode.GENERAL);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format ValidationError message', () => {
      const error = new ValidationError('invalid input');
      expect(formatErrorMessage(error)).toBe('驗證錯誤: invalid input');
    });

    it('should format DateValidationError message', () => {
      const error = new DateValidationError('invalid date');
      expect(formatErrorMessage(error)).toBe('日期格式錯誤: invalid date');
    });

    it('should format NetworkError message', () => {
      const error = new NetworkError('connection failed');
      expect(formatErrorMessage(error)).toBe('網路錯誤: connection failed');
    });

    it('should format DataError message', () => {
      const error = new DataError('not found');
      expect(formatErrorMessage(error)).toBe('資料錯誤: not found');
    });

    it('should format ConfigError message', () => {
      const error = new ConfigError('invalid');
      expect(formatErrorMessage(error)).toBe('設定錯誤: invalid');
    });

    it('should format ServiceError message', () => {
      const error = new ServiceError('failed');
      expect(formatErrorMessage(error)).toBe('服務錯誤: failed');
    });

    it('should format generic AppError message', () => {
      const error = new AppError('something went wrong');
      expect(formatErrorMessage(error)).toBe('錯誤: something went wrong');
    });

    it('should format regular Error message', () => {
      const error = new Error('unknown error');
      expect(formatErrorMessage(error)).toBe('錯誤: unknown error');
    });

    it('should format unknown error', () => {
      expect(formatErrorMessage('string error')).toBe('錯誤: string error');
    });
  });
});
