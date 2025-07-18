/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
const functions = require("firebase-functions");
const axios = require("axios");
const cors = require("cors")({ origin: true }); // allow all origins

exports.buyAirtime = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { network, mobile, amount, request_id } = req.body;

      const response = await axios.post("https://simhostng.com/api/airtime", {
        apikey: "a42e03b76d90921de3dfd6f4add234fb850bca7944c6d1576244a8904cf59294",
        network,
        mobile,
        amount,
        request_id
      });

      return res.status(200).send(response.data);
    } catch (error) {
      console.error("Simhost error:", error.response?.data || error.message);
      return res.status(500).send({ message: "API request failed", error: error.message });
    }
  });
});
