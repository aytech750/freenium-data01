import fetch from "node-fetch";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { cert } from "firebase-admin/app";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY)),
  });
}
const db = getFirestore();

// Helper to reverse Paystack fee (in Naira)
function calculateNetAmount(paystackAmount) {
  const amount = paystackAmount / 100; // Convert from Kobo to Naira
  const flatFee = amount >= 2500 ? 100 : 0;
  const fee = Math.min(amount * 0.015 + flatFee, 2000);
  return Math.round(amount - fee); // Round to nearest Naira
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { reference } = req.body;
  if (!reference) {
    return res.status(400).json({ success: false, message: "Missing reference" });
  }

  try {
    // 1️⃣ Verify payment from Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });
    const verifyData = await verifyRes.json();

    if (!(verifyData.data && verifyData.data.status === "success")) {
      return res.status(400).json({ success: false, message: "Payment not successful" });
    }

    const paystackAmount = verifyData.data.amount; // In Kobo
    const netAmount = calculateNetAmount(paystackAmount); // In Naira

    // 2️⃣ Extract metadata
    const customFields = verifyData.data.metadata?.custom_fields || [];
    const uid = customFields.find((f) => f.variable_name === "uid")?.value;
    const walletAmountRaw = customFields.find((f) => f.variable_name === "walletAmount")?.value;

    if (!uid || !walletAmountRaw) {
      return res.status(400).json({ success: false, message: "Metadata missing UID or walletAmount" });
    }

    const walletAmount = Number(walletAmountRaw);

    if (isNaN(walletAmount)) {
      return res.status(400).json({ success: false, message: "Invalid wallet amount" });
    }

    // 3️⃣ Credit user wallet
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await userRef.update({
      wallet: admin.firestore.FieldValue.increment(walletAmount),
    });

    // 4️⃣ Log to transactions collection
    await db.collection("transactions").add({
      uid,
      type: "wallet-fund",
      amount: netAmount,
      paystackAmount: paystackAmount / 100, // Show full amount paid
      status: "success",
      reference,
      method: verifyData.data.channel || "unknown",
      metadata: verifyData.data.metadata || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 5️⃣ Optionally update "payments" collection from pending to success
    const paySnap = await db
      .collection("payments")
      .where("reference", "==", reference)
      .limit(1)
      .get();

    if (!paySnap.empty) {
      await paySnap.docs[0].ref.update({ status: "success" });
    }

    return res.status(200).json({ success: true, message: "Wallet funded successfully" });

  } catch (err) {
    console.error("🔥 verify.js error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
