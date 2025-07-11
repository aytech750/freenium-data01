import admin from "firebase-admin";

// ✅ Firebase Admin Initialization
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// 🔁 Clubkonnect Buy Data Handler
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { network, phone, plan, amount, requestId, userId } = req.body;

  // ✅ Input Validation
  if (
    !network || !phone || !plan || !amount || !requestId || !userId ||
    typeof phone !== "string" || phone.trim() === ""
  ) {
    return res.status(400).json({ error: "Missing or invalid required fields" });
  }

  // 🔐 Clubkonnect Credentials
  const apiKey = process.env.CLUBKONNECT_API_KEY;
  const userID = "CK101252894";

  // 📡 Map network names to Clubkonnect codes
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
  const DataPlan = plan;
  const RequestID = requestId;

  const payload = new URLSearchParams({
    UserID: userID,
    APIKey: apiKey,
    MobileNetwork,
    MobileNumber,
    DataPlan,
    RequestID
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
      parsedResponse = JSON.parse(text);
    } catch {
      parsedResponse = { raw: text };
    }

    const successKeywords = ["order_received", "successful", "success"];
    const isSuccess = successKeywords.some(keyword =>
      text.toLowerCase().includes(keyword)
    );

    if (isSuccess) {
      // 1️⃣ Save transaction to Firestore
      await db.collection("transactions").add({
        userId,
        type: "data",
        network,
        phone,
        plan,
        amount,
        requestId,
        status: "success",
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      // 2️⃣ Deduct wallet balance
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const currentWallet = userDoc.data().wallet || 0;
        const newWallet = currentWallet - parseFloat(amount);

        await userRef.update({
          wallet: newWallet >= 0 ? newWallet : 0
        });
      }

      // ✅ Respond success
      return res.status(200).json({
        ORDER_RECEIVED: true,
        message: "✅ Data purchase successful",
        data: parsedResponse
      });
    }

    // ❌ If purchase failed
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
