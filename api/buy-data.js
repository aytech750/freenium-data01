// api/buy-data.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send({ error: 'Method Not Allowed' });

  const { network, phone, plan, amount } = req.body;

  // Define your Clubkonnect secret
  const userID = "CK101252894"; // your UserID
  const apiKey = process.env.CLUBKONNECT_API_KEY; // Store safely in Vercel's env vars
  const url = "https://www.nellobytesystems.com/APIDatabundleV1.asp";

  const requestBody = new URLSearchParams({
    UserID: userID,
    APIKey: apiKey,
    MobileNetwork: network,
    MobileNumber: phone,
    DataPlan: plan,
    RequestID: `data_${Date.now()}`
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: requestBody,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const result = await response.text();

    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("Error buying data:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
