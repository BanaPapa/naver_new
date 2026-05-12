import { Router } from 'express';
import { getRegions } from '../services/kbland.js';

export const regionRouter = Router();

// GET /api/region?step=1
// GET /api/region?step=2&code=41
// GET /api/region?step=3&code=41450
regionRouter.get('/', async (req, res) => {
  const step = parseInt(req.query.step as string) || 1;
  const code = req.query.code as string | undefined;

  try {
    const data = await getRegions(step, code);
    res.json({ ok: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[region]', message);
    res.status(500).json({ ok: false, error: message });
  }
});
