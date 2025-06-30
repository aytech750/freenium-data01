// api/airtime.js (Vercel-compatible format)
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post("/api/airtime", async (req, res) => {
  const { network, mobile, amount, request_id } = req.body;

  const API_KEY = "a42e03b76d90921de3dfd6f4add234fb850bca7944c6d1576244a8904cf59294";

  try {
    const simhostRes = await fetch("https://simhostng.com/api/airtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: API_KEY,
        network,
        mobile,
        amount,
        request_id,
      }),
    });

    const result = await simhostRes.json();
    res.status(200).json(result);
  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});

export default app;
