import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { config } from './config/index.js';
import { apiRouter } from './routes.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  // Accept a comma-separated CORS_ORIGIN list, plus any *.vercel.app URL and localhost,
  // so preview/production Vercel hostnames don't each need reconfiguring.
  const allowedOrigins = String(config.corsOrigin ?? '')
    .split(',').map((o) => o.trim()).filter(Boolean);
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // same-origin, curl, server-to-server
      try {
        const host = new URL(origin).hostname;
        const ok = allowedOrigins.includes(origin)
          || host.endsWith('.vercel.app')
          || host === 'localhost' || host === '127.0.0.1';
        return cb(null, ok);
      } catch { return cb(null, false); }
    },
    credentials: true,
  }));
  // Keep the raw body for webhook signature verification.
  app.use(express.json({
    limit: '5mb',
    verify: (req, _res, buf) => { (req as Request & { rawBody?: Buffer }).rawBody = buf; },
  }));
  app.use(cookieParser());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.correlationId = 'req_' + Math.random().toString(36).slice(2, 10);
    next();
  });

  // Liveness: process is up. Readiness: dependencies are reachable.
  app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now(), env: config.env }));
  app.get('/ready', (_req, res) => {
    const mongoUp = mongoose.connection.readyState === 1;
    res.status(mongoUp ? 200 : 503).json({ ready: mongoUp, mongo: mongoUp });
  });
  app.use('/api/v1', apiLimiter, apiRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
