import express from 'express';
import { fileURLToPath } from 'node:url';
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

app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found' } });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600
    ? err.status
    : 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  res.status(status).json({ error: { message } });
});

export default app;
