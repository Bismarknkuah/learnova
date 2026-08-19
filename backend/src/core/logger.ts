import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
  level: config.logLevel,
  // Pretty logs in dev; structured JSON in prod for aggregators.
  transport: config.isProd ? undefined : { target: 'pino-pretty', options: { colorize: true } },
});

export type Logger = typeof logger;
