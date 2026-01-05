import Conf from 'conf';
import type { OutputFormat } from '../commands/check.js';

export interface ConfigStore {
  format: OutputFormat;
}

const VALID_KEYS = ['format'] as const;
type ValidKey = (typeof VALID_KEYS)[number];

const VALID_FORMATS: OutputFormat[] = ['simple', 'json', 'table'];

export interface ConfigService {
  list: () => Record<string, string>;
  get: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  getDefaultFormat: () => OutputFormat;
}

let configService: ConfigService | null = null;

export function createConfigService(): ConfigService {
  const conf = new Conf<ConfigStore>({
    projectName: 'taiwan-holiday-cli',
    defaults: {
      format: 'simple',
    },
  });

  return {
    list: () => {
      const result: Record<string, string> = {};
      for (const key of VALID_KEYS) {
        const value = conf.get(key);
        if (value !== undefined) {
          result[key] = String(value);
        }
      }
      return result;
    },

    get: (key: string) => {
      if (!VALID_KEYS.includes(key as ValidKey)) {
        return undefined;
      }
      const value = conf.get(key as ValidKey);
      return value !== undefined ? String(value) : undefined;
    },

    set: (key: string, value: string) => {
      if (!VALID_KEYS.includes(key as ValidKey)) {
        throw new Error(`無效的設定項目: ${key}`);
      }

      if (key === 'format' && !VALID_FORMATS.includes(value as OutputFormat)) {
        throw new Error(`無效的格式: ${value}，可用格式: ${VALID_FORMATS.join(', ')}`);
      }

      conf.set(key as ValidKey, value as OutputFormat);
    },

    getDefaultFormat: () => {
      return conf.get('format') || 'simple';
    },
  };
}

export function getConfigService(): ConfigService {
  if (!configService) {
    configService = createConfigService();
  }
  return configService;
}

export function isValidConfigKey(key: string): key is ValidKey {
  return VALID_KEYS.includes(key as ValidKey);
}
