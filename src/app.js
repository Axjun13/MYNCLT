import express from "express";
import cors from "cors";
import ncltRoutes from "./routes/nclt.routes.js";

const app = express();

/**
 * ✅ CORS CONFIG
 */
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/health", (_, res) => res.send("OK"));

app.use("/nclt", ncltRoutes);

export default app;
