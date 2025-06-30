// pages/api/verify.js (or /api/verify on Vercel)
import fetch from "node-fetch";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { cert } from "firebase-admin/app";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SDK))
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const { reference, amount } = req.body;

  try {
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    });

    const verifyData = await verifyRes.json();

    if (verifyData.data && verifyData.data.status === "success") {
      const email = verifyData.data.customer.email;

      // Lookup the user by email
      const userSnap = await db.collection("users").where("email", "==", email).get();
      if (userSnap.empty) return res.status(404).json({ message: "User not found" });

      const userDoc = userSnap.docs[0];
      const userRef = userDoc.ref;

      // Update wallet
      await userRef.update({
        wallet: admin.firestore.FieldValue.increment(amount)
      });

      // Log transaction
      await db.collection("transactions").add({
        uid: userDoc.id,
        type: "wallet-fund",
        amount,
        status: "success",
        reference,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      return res.status(200).json({ success: true, message: "Wallet funded successfully" });
    } else {
      return res.status(400).json({ success: false, message: "Verification failed" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
