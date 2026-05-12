import { Router } from 'express';
import fs from 'fs';
import path from 'path';

export const settingsRouter = Router();

const ENV_PATH = path.resolve(process.cwd(), '.env');

// GET /api/settings/cookie-status
settingsRouter.get('/cookie-status', (_req, res) => {
  const cookie = process.env.NAVER_COOKIE || '';
  res.json({
    ok: true,
    hasCookie: !!cookie,
    preview: cookie ? cookie.substring(0, 30) + '...' : '',
  });
});

// POST /api/settings/cookie
settingsRouter.post('/cookie', (req, res) => {
  const { cookie } = req.body;
  if (typeof cookie !== 'string' || !cookie.trim()) {
    return res.status(400).json({ ok: false, error: '쿠키가 비어 있습니다' });
  }

  // 환경 변수 업데이트 (런타임)
  process.env.NAVER_COOKIE = cookie.trim();

  // .env 파일 업데이트
  try {
    let content = '';
    if (fs.existsSync(ENV_PATH)) {
      content = fs.readFileSync(ENV_PATH, 'utf-8');
    }

    if (content.includes('NAVER_COOKIE=')) {
      content = content.replace(/NAVER_COOKIE=.*/g, `NAVER_COOKIE=${cookie.trim()}`);
    } else {
      content += `\nNAVER_COOKIE=${cookie.trim()}\n`;
    }

    fs.writeFileSync(ENV_PATH, content, 'utf-8');
    res.json({ ok: true, message: '쿠키가 저장되었습니다' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});
