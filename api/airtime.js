export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "https://freenium-data01.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { network, mobile, amount, request_id } = req.body;

  // ✅ Replace with your real values
  const userID = "CK101252894";
  const apiKey = "988DL2CSH2Y942I37AH84J9K8836R595UDC64O7I6S5NC5FXAM643ZYRR9QJT3T0";

  // Clubkonnect endpoint
  const url = `https://www.nellobytesystems.com/APIAirtimeV1.asp?UserID=${userID}&APIKey=${apiKey}&MobileNetwork=${network}&Amount=${amount}&MobileNumber=${mobile}&RequestID=${request_id}`;

  try {
    const response = await fetch(url);
    const text = await response.text();

    let result;
    try {
      result = JSON.parse(text);
    } catch (err) {
      // Sometimes Clubkonnect returns plain text, not JSON
      console.warn("Non-JSON response received from Clubkonnect:", text);
      return res.status(200).json({ raw: text });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ Proxy error:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}
