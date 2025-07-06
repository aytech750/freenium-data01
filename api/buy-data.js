export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { network, phone, plan, amount } = req.body;

  if (!network || !phone || !plan || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // 🔐 Get Clubkonnect API key from Vercel Environment Variables
  const apiKey = process.env.CLUBKONNECT_API_KEY;
  const userID = "CK101252894"; // Your Clubkonnect User ID
  const request_id = `data_${Date.now()}`;

  // 🧠 Determine MobileNetwork format for Clubkonnect
  const networkMap = {
    MTN: "01",
    Airtel: "04",
    Glo: "02",
    "etisalat": "03"
  };

  const MobileNetwork = networkMap[network];

  if (!MobileNetwork) {
    return res.status(400).json({ error: "Invalid network name" });
  }

  const url = `https://www.nellobytesystems.com/APIDatabundleV1.asp`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        UserID: userID,
        APIKey: apiKey,
        MobileNetwork,
        MobileNumber: phone,
        DataPlan: plan,
        RequestID: request_id
      })
    });

    const resultText = await response.text();

    // Optionally parse XML or check for success keywords if needed
    if (resultText.includes("successful")) {
      return res.status(200).json({ success: true, message: "✅ Data purchase successful", data: resultText });
    } else {
      return res.status(500).json({ success: false, message: "❌ Data purchase failed", error: resultText });
    }
  } catch (error) {
    console.error("🔥 Error purchasing data:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
