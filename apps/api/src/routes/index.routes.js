import { Router } from "express";

import {
  getHealth,
} from "../controllers/health.controller.js";

import {
  gasolinerasRouter,
} from "./gasolineras.routes.js";

export const router = Router();
export const apiRouter = router;

router.get("/health", getHealth);

router.use(
  "/gasolineras",
  gasolinerasRouter,
);