import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { cert } from "firebase-admin/app";

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY); // Store JSON key in env

const app = initializeApp({
  credential: cert(serviceAccount),
});
const db = getFirestore(app);

export default async function handler(req, res) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const hash = req.headers['x-paystack-signature'];
  const crypto = require('crypto');

  const rawBody = JSON.stringify(req.body);
  const expectedHash = crypto
    .createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');

  if (hash !== expectedHash) {
    return res.status(401).send("🔒 Unauthorized webhook");
  }

  const event = req.body;

  if (event.event === "charge.success") {
    const reference = event.data.reference;
    const amount = event.data.amount / 100;

    console.log("✅ Payment Verified:", reference, "₦" + amount);

    // 🔍 Find the payment record by reference
    const paymentQuery = await db
      .collection("payments")
      .where("reference", "==", reference)
      .limit(1)
      .get();

    if (paymentQuery.empty) {
      console.log("⚠️ No payment record found for:", reference);
      return res.status(200).send("No matching payment record.");
    }

    const paymentDoc = paymentQuery.docs[0];
    const uid = paymentDoc.data().uid;

    // 💰 Credit the user's wallet
    const userRef = db.collection("users").doc(uid);
    await userRef.update({
      wallet: getFirestore.FieldValue.increment(amount),
    });

    // 📝 Mark the payment as successful
    await paymentDoc.ref.update({
      status: "success",
      credited: true,
      processedAt: new Date(),
    });

    console.log("✅ Wallet credited for:", uid);
  }

  return res.status(200).send("Webhook handled");
}
