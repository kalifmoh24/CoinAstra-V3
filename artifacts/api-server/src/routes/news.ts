import { Router, type IRouter } from "express";
import { ListNewsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/news", async (req, res): Promise<void> => {
  const parsed = ListNewsQueryParams.safeParse(req.query);
  void parsed;
  res.json([]);
});

export default router;
