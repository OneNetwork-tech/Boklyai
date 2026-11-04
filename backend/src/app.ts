import fs from 'fs';
import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { config } from './config';
import { pool } from './db';
import { attachSession, originCheck } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import companyRoutes, { companyRouter } from './routes/companies';
import ledgerRoutes from './routes/ledger';
import salesRoutes from './routes/sales';
import purchaseRoutes from './routes/purchases';
import bankRoutes from './routes/bank';
import documentRoutes from './routes/documents';
import payrollRoutes from './routes/payroll';
import reportRoutes from './routes/reports';

// Company-scoped modules all live under /api/companies/:companyId.
companyRouter.use(ledgerRoutes);
companyRouter.use(salesRoutes);
companyRouter.use(purchaseRoutes);
companyRouter.use(bankRoutes);
companyRouter.use(documentRoutes);
companyRouter.use(payrollRoutes);
companyRouter.use(reportRoutes);

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:'],
        'connect-src': ["'self'"],
        'object-src': ["'none'"],
        'frame-src': ["'self'"],
        'frame-ancestors': ["'self'"],
        'upgrade-insecure-requests': config.httpsOnly ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'same-origin' },
  }));

  if (!config.isTest) {
    morgan.token('url', (req: any) => req.originalUrl.replace(/([?&]token=)[^&]+/g, '$1[redacted]'));
    app.use(morgan(config.isProduction ? 'combined' : 'dev', { skip: (req) => req.url === '/api/health' }));
  }

  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  const api = express.Router();
  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-store'); // financial data must not be cached
    next();
  });
  api.get('/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'degraded' });
    }
  });
  api.use(originCheck, attachSession);
  api.use('/auth', authRoutes);
  api.use('/companies', companyRoutes);
  api.use(notFoundHandler);
  app.use('/api', api);

  // Built SPA (frontend/dist) in production; any non-API path serves index.html.
  const indexFile = path.join(config.staticDir, 'index.html');
  if (fs.existsSync(indexFile)) {
    app.use(express.static(config.staticDir, { index: false, maxAge: '1h' }));
    app.get('*', (req, res) => res.sendFile(indexFile));
  }

  app.use(errorHandler);
  return app;
}
