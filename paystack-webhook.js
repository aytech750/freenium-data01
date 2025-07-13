const admin = require("firebase-admin");
const crypto = require("crypto");
const getRawBody = require("raw-body");

if (!admin.apps.length) {
 const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();
module.exports = async function handler(req, res) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const hash = req.headers["x-paystack-signature"];
    const rawBody = (await getRawBody(req)).toString();

    const expectedHash = crypto
      .createHmac("sha512", secret)
      .update(rawBody)
      .digest("hex");

    if (hash !== expectedHash) {
      return res.status(401).send("🔒 Unauthorized webhook");
    }

    const event = JSON.parse(rawBody);

    if (event.event === "charge.success") {
      const reference = event.data.reference;
      const amount = Number(event.data.amount) / 100;

      const paymentQuery = await db
        .collection("payments")
        .where("reference", "==", reference)
        .limit(1)
        .get();

      if (paymentQuery.empty) {
        await db.collection("missedWebhooks").add({
          reference,
          amount,
          receivedAt: new Date(),
          raw: event,
        });
        return res.status(200).send("Logged for retry.");
      }

      const paymentDoc = paymentQuery.docs[0];
      const uid = paymentDoc.data().uid;

      const userRef = db.collection("users").doc(uid);
      await userRef.update({
        wallet: admin.firestore.FieldValue.increment(amount),
      });

      await paymentDoc.ref.update({
        status: "success",
        credited: true,
        processedAt: new Date(),
      });

      console.log("✅ Wallet credited for:", uid);
    }

    return res.status(200).send("Webhook handled");
  } catch (error) {
    console.error("🔥 Webhook Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};
module.exports.config = {
  api: {
    bodyParser: false,
  },
};