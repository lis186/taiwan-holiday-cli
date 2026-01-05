/**
 * CLI 退出碼
 */
export enum ExitCode {
  /** 成功 */
  SUCCESS = 0,
  /** 一般錯誤 */
  GENERAL = 1,
  /** 驗證錯誤（無效輸入） */
  VALIDATION = 2,
  /** 網路錯誤（API 無法連線） */
  NETWORK = 3,
  /** 資料錯誤（資料不存在、快取錯誤） */
  DATA = 4,
  /** 設定錯誤 */
  CONFIG = 5,
}

/**
 * 應用程式基礎錯誤類別
 */
export class AppError extends Error {
  readonly code: ExitCode;

  constructor(message: string, code: ExitCode = ExitCode.GENERAL) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

/**
 * 驗證錯誤（無效輸入）
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, ExitCode.VALIDATION);
    this.name = 'ValidationError';
  }
}

/**
 * 日期驗證錯誤
 */
export class DateValidationError extends ValidationError {
  constructor(message: string) {
    super(message);
    this.name = 'DateValidationError';
  }
}

/**
 * 服務層錯誤
 */
export class ServiceError extends AppError {
  constructor(message: string) {
    super(message, ExitCode.GENERAL);
    this.name = 'ServiceError';
  }
}

/**
 * 資料存取錯誤
 */
export class DataError extends AppError {
  constructor(message: string) {
    super(message, ExitCode.DATA);
    this.name = 'DataError';
  }
}

/**
 * 網路錯誤
 */
export class NetworkError extends AppError {
  constructor(message: string) {
    super(message, ExitCode.NETWORK);
    this.name = 'NetworkError';
  }
}

/**
 * 設定錯誤
 */
export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, ExitCode.CONFIG);
    this.name = 'ConfigError';
  }
}

/**
 * 從錯誤取得退出碼
 */
export function getExitCode(error: unknown): ExitCode {
  if (error instanceof AppError) {
    return error.code;
  }
  return ExitCode.GENERAL;
}

/**
 * 格式化錯誤訊息
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof DateValidationError) {
    return `日期格式錯誤: ${error.message}`;
  }
  if (error instanceof ValidationError) {
    return `驗證錯誤: ${error.message}`;
  }
  if (error instanceof NetworkError) {
    return `網路錯誤: ${error.message}`;
  }
  if (error instanceof DataError) {
    return `資料錯誤: ${error.message}`;
  }
  if (error instanceof ConfigError) {
    return `設定錯誤: ${error.message}`;
  }
  if (error instanceof ServiceError) {
    return `服務錯誤: ${error.message}`;
  }
  if (error instanceof AppError) {
    return `錯誤: ${error.message}`;
  }
  if (error instanceof Error) {
    return `錯誤: ${error.message}`;
  }
  return `錯誤: ${String(error)}`;
}
