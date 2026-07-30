import express from "express";
import cors from "cors";
import routes from "./routes/index.route";
import dotenv from "dotenv";
import { connectDB } from "./config/database";
import cookieParser = require("cookie-parser");

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 4000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

connectDB();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: frontendUrl,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/", routes);

app.listen(port, "0.0.0.0", () => {
  console.log(`Website dang chay tren cong ${port}`);
});
