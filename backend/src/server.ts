import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth";
import rfqRouter from "./routes/rfq";
dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "B2B RFQ Marketplace API is running",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/rfqs", rfqRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});