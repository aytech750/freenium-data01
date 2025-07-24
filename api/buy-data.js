import admin from "firebase-admin";

// ✅ Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// ✅ POST handler
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { MobileNetwork, MobileNumber, DataPlan, request_id } = req.body;
  console.log("📥 Received Payload:", req.body);

  if (!MobileNetwork || !MobileNumber || !DataPlan || !request_id) {
    return res.status(400).json({ error: "Missing or invalid required fields" });
  }

  try {
    // ✅ Fetch User from Request ID
    const uid = request_id.split("_")[1]; // assuming request_id = data_UID_TIMESTAMP
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    const amount = getAmountByDataPlan(MobileNetwork, DataPlan);

    if (userData.wallet < amount) {
      return res.status(400).json({ error: "Insufficient wallet balance" });
    }

    const payload = new URLSearchParams({
      UserID: "CK101252894",
      APIKey: process.env.CLUBKONNECT_API_KEY,
      MobileNetwork,
      MobileNumber,
      DataPlan,
      RequestID: request_id,
    });

    const clubUrl = "https://www.nellobytesystems.com/APIDatabundleV1.asp";

    const clubResponse = await fetch(clubUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload,
    });

    const text = await clubResponse.text();
    console.log("📦 Clubkonnect Raw Response:", text);

    const isSuccess = text.toLowerCase().includes("order_received") || text.toLowerCase().includes("success");

    if (isSuccess) {
      // 🔁 Deduct wallet and record transaction
      await userRef.update({ wallet: userData.wallet - amount });

      await db.collection("transactions").add({
        uid,
        type: "data",
        network: MobileNetwork,
        phone: MobileNumber,
        plan: DataPlan,
        amount,
        requestId: request_id,
        status: "success",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({
        statuscode: "100",
        message: "Data purchase successful",
        reference: request_id,
      });
    } else {
      return res.status(500).json({
        statuscode: "500",
        message: "Clubkonnect failed to process request",
        raw: text,
      });
    }
  } catch (error) {
    console.error("🔥 Server Error:", error.message);
    return res.status(500).json({
      message: "Server error occurred",
      error: error.message,
    });
  }
}

// 🔎 Match price to DataPlan (you can extend this)
function getAmountByDataPlan(networkCode, planCode) {
  const priceMap = {
    "01": { "100.01": 98, "200.01": 197, "350.01": 340.5, "500.01": 490 },
    "02": { "1000.11": 300, "3000.11": 920, "5000.11": 1550 },
    "04": { "499.91": 490, "599.91": 587.7, "749.91": 735 },
    "03": { "100.01": 96, "150.01": 140.5, "200.01": 190 },
  };

  return priceMap[networkCode]?.[planCode] || 0;
}