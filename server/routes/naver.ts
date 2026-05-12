import { Router } from 'express';
import { searchComplexes, getArticleList } from '../services/naverApi.js';

export const naverRouter = Router();

// GET /api/naver/complexes?keyword=하남시+망월동&page=0&size=10
naverRouter.get('/complexes', async (req, res) => {
  const keyword = req.query.keyword as string;
  const page = parseInt(req.query.page as string) || 0;
  const size = parseInt(req.query.size as string) || 10;

  if (!keyword) {
    return res.status(400).json({ ok: false, error: 'keyword required' });
  }

  try {
    const data = await searchComplexes(keyword, page, size);
    res.json({ ok: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

// GET /api/naver/articles?complexNumber=106200&tradeType=A1&realEstateType=APT:JGC:JGB&spcMin=0&spcMax=1000&page=0&size=20
naverRouter.get('/articles', async (req, res) => {
  const complexNumber = parseInt(req.query.complexNumber as string);
  const tradeType = req.query.tradeType as string;
  const realEstateType = req.query.realEstateType as string;
  const spcMin = parseFloat(req.query.spcMin as string) || 0;
  const spcMax = parseFloat(req.query.spcMax as string) || 1000;
  const page = parseInt(req.query.page as string) || 0;
  const size = parseInt(req.query.size as string) || 20;
  const seed = req.query.seed as string | undefined;
  const lastInfo = req.query.lastInfo as string | undefined;

  try {
    const data = await getArticleList({
      complexNumber,
      tradeType,
      realEstateType,
      spcMin,
      spcMax,
      page,
      size,
      seed,
      lastInfo,
    });
    res.json({ ok: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});
