import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/narratives", async (_req, res): Promise<void> => {
  res.json([]);
});

router.get("/narratives/:slug", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  void raw;
  res.status(404).json({ error: "Narrative not found" });
});

export default router;
