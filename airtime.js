export default async function handler(req, res) {
  // ✅ Allow CORS from your frontend
  res.setHeader("Access-Control-Allow-Origin", "https://freenium-data01.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ❌ Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  // ✅ Destructure correct payload keys
  const { MobileNetwork, MobileNumber, Amount, request_id } = req.body;

  console.log("📦 Incoming Payload:", req.body);

  // ✅ Validate required fields
  if (!MobileNetwork || !MobileNumber || !Amount || !request_id) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // ✅ Clubkonnect credentials
  const userID = "CK101252894";
  const apiKey = "988DL2CSH2Y942I37AH84J9K8836R595UDC64O7I6S5NC5FXAM643ZYRR9QJT3T0";

  // ✅ Construct request URL
  const url = `https://www.nellobytesystems.com/APIAirtimeV1.asp?UserID=${userID}&APIKey=${apiKey}&MobileNetwork=${MobileNetwork}&Amount=${Amount}&MobileNumber=${MobileNumber}&RequestID=${request_id}`;

  try {
    const response = await fetch(url);
    const text = await response.text();

    // Try to parse JSON, fallback to raw text
    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch (err) {
      console.warn("📃 Non-JSON response from Clubkonnect:", text);
      return res.status(200).json({ raw: text });
    }
  } catch (err) {
    console.error("🔥 API Error:", err);
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}
