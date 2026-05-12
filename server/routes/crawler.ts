import { Router, Request, Response } from 'express';
import { CrawlerService } from '../services/crawler.js';

export const crawlerRouter = Router();

let activeCrawler: CrawlerService | null = null;

// POST /api/crawler/start
crawlerRouter.post('/start', (req: Request, res: Response) => {
  const { keyword, tradeType, realEstateType, spcMin, spcMax } = req.body;

  if (!keyword || !tradeType || !realEstateType) {
    return res.status(400).json({ ok: false, error: '필수 파라미터 누락' });
  }

  if (activeCrawler && activeCrawler.isRunning()) {
    return res.status(409).json({ ok: false, error: '이미 크롤링 중입니다' });
  }

  // SSE 헤더 설정
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const sendEvent = (type: string, payload: unknown) => {
    res.write(`data: ${JSON.stringify({ type, payload })}\n\n`);
  };

  activeCrawler = new CrawlerService({
    keyword,
    tradeType,
    realEstateType,
    spcMin: spcMin ?? 0,
    spcMax: spcMax ?? 1000,
    onLog: (msg) => sendEvent('log', msg),
    onProgress: (progress) => sendEvent('progress', progress),
    onProperty: (property) => sendEvent('property', property),
    onDone: (summary) => {
      sendEvent('done', summary);
      res.end();
      activeCrawler = null;
    },
    onError: (err) => {
      sendEvent('error', err);
      res.end();
      activeCrawler = null;
    },
  });

  activeCrawler.start().catch((err) => {
    sendEvent('error', err.message);
    res.end();
    activeCrawler = null;
  });

  req.on('close', () => {
    if (activeCrawler) {
      activeCrawler.stop();
      activeCrawler = null;
    }
  });
});

// POST /api/crawler/stop
crawlerRouter.post('/stop', (_req: Request, res: Response) => {
  if (activeCrawler) {
    activeCrawler.stop();
    activeCrawler = null;
    res.json({ ok: true, message: '크롤링을 중지했습니다' });
  } else {
    res.json({ ok: true, message: '실행 중인 크롤링이 없습니다' });
  }
});

// GET /api/crawler/status
crawlerRouter.get('/status', (_req: Request, res: Response) => {
  res.json({ ok: true, running: activeCrawler?.isRunning() ?? false });
});
