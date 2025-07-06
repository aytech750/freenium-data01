// pages/api/verify.js
import fetch from "node-fetch";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { cert } from "firebase-admin/app";

// ——————————————————————————————————————————————
// 1) Initialize Firebase Admin
// ——————————————————————————————————————————————
if (!admin.apps.length) {
  admin.initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SDK))
  });
}
const db = getFirestore();

// ——————————————————————————————————————————————
// 2) Paystack Verify Handler
// ——————————————————————————————————————————————
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { reference } = req.body;
  if (!reference) {
    return res.status(400).json({ success: false, message: "Missing reference" });
  }

  try {
    // 2a) Verify transaction with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    });
    const verifyData = await verifyRes.json();

    if (!(verifyData.data && verifyData.data.status === "success")) {
      return res.status(400).json({ success: false, message: "Payment not successful" });
    }

    // 2b) Extract amount (in kobo → naira)
    const amount = verifyData.data.amount / 100;

    // 2c) Extract UID from metadata.custom_fields
    const customFields = verifyData.data.metadata?.custom_fields || [];
    const uidField = customFields.find(f => f.variable_name === "uid");
    const uid = uidField?.value;
    if (!uid) {
      return res.status(400).json({ success: false, message: "User ID not found in metadata" });
    }

    // 2d) Reference the user document
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2e) Credit the user's wallet
    await userRef.update({
      wallet: admin.firestore.FieldValue.increment(amount)
    });

    // 2f) Log the wallet-fund transaction
    await db.collection("transactions").add({
      uid,
      type: "wallet-fund",
      amount,
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
