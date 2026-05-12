import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { regionRouter } from './routes/region.js';
import { naverRouter } from './routes/naver.js';
import { crawlerRouter } from './routes/crawler.js';
import { settingsRouter } from './routes/settings.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/region', regionRouter);
app.use('/api/naver', naverRouter);
app.use('/api/crawler', crawlerRouter);
app.use('/api/settings', settingsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', cookie: !!process.env.NAVER_COOKIE });
});

app.listen(PORT, () => {
  console.log(`[Server] running on http://localhost:${PORT}`);
  if (!process.env.NAVER_COOKIE) {
    console.warn('[Server] NAVER_COOKIE not set in .env');
  }
});
