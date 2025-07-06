export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { network, phone, plan, amount, requestId } = req.body;

  // ✅ Validate required fields
  if (
    !network || 
    !phone || 
    !plan || 
    !amount || 
    !requestId || 
    typeof phone !== "string" || 
    phone.trim() === ""
  ) {
    return res.status(400).json({ error: "Missing or invalid required fields" });
  }

  // 🔐 Credentials
  const apiKey = process.env.CLUBKONNECT_API_KEY; // Set this in Vercel or .env
  const userID = "CK101252894";

  // 🧠 Map frontend network to Clubkonnect codes
  const networkMap = {
    MTN: "01",
    Glo: "02",
    etisalat: "03", // 9mobile
    Airtel: "04"
  };

  const MobileNetwork = networkMap[network];

  if (!MobileNetwork) {
    return res.status(400).json({ error: "Invalid network name" });
  }

  const MobileNumber = phone.trim();

  const payload = new URLSearchParams({
    UserID: userID,
    APIKey: apiKey,
    MobileNetwork,
    MobileNumber,
    DataPlan: plan,
    RequestID: requestId
  });

  const url = "https://www.nellobytesystems.com/APIDatabundleV1.asp";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: payload
    });

    const text = await response.text();

    console.log("📦 Clubkonnect Raw Response:", text);

    let parsedResponse = {};
    try {
      parsedResponse = JSON.parse(text); // Clubkonnect sometimes returns JSON
    } catch {
      parsedResponse = { raw: text }; // fallback to raw if not valid JSON
    }

    if (
      parsedResponse.status?.toLowerCase() === "order_received" ||
      text.toLowerCase().includes("order_received")
    ) {
      return res.status(200).json({
        ORDER_RECEIVED: true,
        message: "✅ Data purchase successful",
        data: parsedResponse
      });
    }

    return res.status(500).json({
      ORDER_RECEIVED: false,
      message: parsedResponse.status || "❌ Unknown error",
      error: parsedResponse
    });

  } catch (err) {
    console.error("🔥 Error purchasing data:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error while purchasing data",
      error: err.message
    });
  }
}
