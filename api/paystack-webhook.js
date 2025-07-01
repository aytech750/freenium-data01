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
    const email = event.data.customer.email;

    // 🔍 Optional: look up user by email in Firebase
    // and update their wallet balance and log transaction

    console.log("✅ Payment Verified:", reference, "₦" + amount);
    // await updateDoc logic here
  }

  return res.status(200).send("Webhook received");
}
