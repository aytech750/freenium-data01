import fetch from "node-fetch";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { cert } from "firebase-admin/app";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SDK))
  });
}
const db = getFirestore();

// Helper to reverse Paystack fee (in Naira)
function calculateNetAmount(paystackAmount) {
  const amount = paystackAmount / 100; // Convert from Kobo
  const flatFee = amount >= 2500 ? 100 : 0;
  const fee = Math.min(amount * 0.015 + flatFee, 2000);
  return Math.round(amount - fee); // Round to whole Naira
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
    // 🔍 1. Verify payment from Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    });
    const verifyData = await verifyRes.json();

    if (!(verifyData.data && verifyData.data.status === "success")) {
      return res.status(400).json({ success: false, message: "Payment not successful" });
    }

    // 🧮 2. Get original amount intended (by subtracting Paystack fee)
    const paystackAmount = verifyData.data.amount; // In Kobo
    const netAmount = calculateNetAmount(paystackAmount); // In Naira

    // 🆔 3. Extract UID from metadata
    const customFields = verifyData.data.metadata?.custom_fields || [];
    const uidField = customFields.find(f => f.variable_name === "uid");
    const uid = uidField?.value;
    if (!uid) {
      return res.status(400).json({ success: false, message: "User ID not found in metadata" });
    }

    // 👤 4. Credit user wallet
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

   const walletAmount = customFields.find(f => f.variable_name === "walletAmount")?.value;
if (!walletAmount) {
  return res.status(400).json({ success: false, message: "walletAmount not found in metadata" });
}

await userRef.update({
  wallet: admin.firestore.FieldValue.increment(walletAmount)
});


    // 🧾 5. Log transaction
    await db.collection("transactions").add({
      uid,
      type: "wallet-fund",
      amount: netAmount,
      paystackAmount: paystackAmount / 100, // full paid amount
      status: "success",
      reference,
      method: verifyData.data.channel || "unknown",
      metadata: verifyData.data.metadata || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({ success: true, message: "Wallet funded successfully" });

  } catch (err) {
    console.error("🔥 verify.js error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
