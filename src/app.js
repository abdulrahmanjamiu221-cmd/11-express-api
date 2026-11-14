import express from 'express';
import { fileURLToPath } from 'node:url';
import HttpError from './errors/HttpError.js';
import productsRouter from './routes/products.routes.js';

const app = express();
const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));

app.use(express.json());

app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
});

app.use(express.static(publicDirectory));

app.get('/api/health', (req, res) => {
  res.json({ data: { status: 'ok', uptime: process.uptime() } });
});

app.use('/api/products', productsRouter);

app.use((req, res, next) => {
  next(new HttpError(404, 'Route not found'));
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600
    ? err.status
    : 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const message = status === 500 && isProduction ? 'Internal server error' : err.message;
  const error = { message };

  if (err.fields) {
    error.fields = err.fields;
  }

  if (status >= 500 && !isProduction) {
    console.error(err.stack);
  }

  res.status(status).json({ error });
});

export default app;
