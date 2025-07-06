// /api/buy-data.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import axios from 'axios';

// Initialize Firebase Admin (only once)
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: firebasePrivateKey,
};

if (!getFirestore.length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { uid, network, phone, plan, amount } = req.body;

  if (!uid || !network || !phone || !plan || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const CLUBKONNECT_API_KEY = process.env.CLUBKONNECT_API_KEY;
    const requestId = `data_${uid}_${Date.now()}`;

    const payload = {
      MobileNetwork: network.toUpperCase(),
      MobileNumber: phone,
      Dataplan: plan, // ✅ spelling must be "Dataplan"
      request_id: requestId,
    };

    const clubkonnectRes = await axios.post(
      'https://clubkonnect.com/api/v2/databundle',
      payload,
      {
        headers: {
          Authorization: `Token ${CLUBKONNECT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const status = clubkonnectRes.data.Status === 'ORDER_RECEIVED' ? 'success' : 'failed';

    // Save transaction to Firestore
    await db.collection('transactions').add({
      uid,
      phone,
      network,
      plan,
      amount,
      request_id: requestId,
      status,
      response: clubkonnectRes.data,
      createdAt: new Date(),
    });

    return res.status(200).json({ success: true, status, response: clubkonnectRes.data });
  } catch (error) {
    console.error('Clubkonnect Error:', error.message);
    return res.status(500).json({ error: 'Something went wrong', message: error.message });
  }
}
