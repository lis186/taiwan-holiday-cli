import Conf from 'conf';
import {
  PROJECT_NAME,
  OUTPUT_FORMATS,
  CONFIG_KEYS,
  DEFAULT_OUTPUT_FORMAT,
  type OutputFormat,
  type ConfigKey,
} from './constants.js';
import { ConfigError } from './errors.js';

export interface ConfigStore {
  format: OutputFormat;
}

export interface ConfigService {
  list: () => Record<string, string>;
  get: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  getDefaultFormat: () => OutputFormat;
}

let configService: ConfigService | null = null;

export function createConfigService(): ConfigService {
  const conf = new Conf<ConfigStore>({
    projectName: PROJECT_NAME,
    defaults: {
      format: DEFAULT_OUTPUT_FORMAT,
    },
  });

  return {
    list: () => {
      const result: Record<string, string> = {};
      for (const key of CONFIG_KEYS) {
        const value = conf.get(key);
        if (value !== undefined) {
          result[key] = String(value);
        }
      }
      return result;
    },

    get: (key: string) => {
      if (!CONFIG_KEYS.includes(key as ConfigKey)) {
        return undefined;
      }
      const value = conf.get(key as ConfigKey);
      return value !== undefined ? String(value) : undefined;
    },

    set: (key: string, value: string) => {
      if (!CONFIG_KEYS.includes(key as ConfigKey)) {
        throw new ConfigError(`無效的設定項目: ${key}`);
      }

      if (key === 'format' && !OUTPUT_FORMATS.includes(value as OutputFormat)) {
        throw new ConfigError(`無效的格式: ${value}，可用格式: ${OUTPUT_FORMATS.join(', ')}`);
      }

      conf.set(key as ConfigKey, value as OutputFormat);
    },

    getDefaultFormat: () => {
      return conf.get('format') || DEFAULT_OUTPUT_FORMAT;
    },
  };
}

export function getConfigService(): ConfigService {
  if (!configService) {
    configService = createConfigService();
  }
  return configService;
}

export function isValidConfigKey(key: string): key is ConfigKey {
  return CONFIG_KEYS.includes(key as ConfigKey);
}
