export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "https://freenium-data01.vercel.app"); // You can replace * with your frontend URL for more security
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { network, mobile, amount, request_id } = req.body;

  const API_KEY = "a42e03b76d90921de3dfd6f4add234fb850bca7944c6d1576244a8904cf59294"; // Replace with your actual key

  try {
    const response = await fetch("https://simhostng.com/api/airtime", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        apikey: API_KEY,
        network,
        mobile,
        amount,
        request_id
      })
    });

    const result = await response.json();
    return res.status(200).json(result);
  } catch (error) {
    console.error("Proxy error:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}
