// /**
//  * Import function triggers from their respective submodules:
//  *
//  * const {onCall} = require("firebase-functions/v2/https");
//  * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
//  *
//  * See a full list of supported triggers at https://firebase.google.com/docs/functions
//  */

const functions = require("firebase-functions");
// const { onRequest } = require("firebase-functions/https");
// const logger = require("firebase-functions/logger");
const { runAgent } = require("./agent-vertexAI");
const cors = require('cors')({ origin: true });
const { databaseAgent } = require("./agent-userDB");


// // For cost control, you can set the maximum number of containe  rs that can be
// // running at the same time. This helps mitigate the impact of unexpected
// // traffic spikes by instead downgrading performance. This limit is a
// // per-function limit. You can override the limit for each function using the
// // `maxInstances` option in the function's options, e.g.
// // `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// // NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// // functions should each use functions.runWith({ maxInstances: 10 }) instead.
// // In the v1 API, each function can only serve one request per container, so
// // this will be the maximum concurrent request count.
// setGlobalOptions({ maxInstances: 10 });

// // Create and deploy your first functions
// // https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//     logger.info("Hello logs!", { structuredData: true });
//     response.send("Hello from Firebase!");
// });

exports.agentAPI = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
        try {
            const question = req.body.question
            if (!question) {
                return res.status(400).json({ error: "Question is required" });
            }
            const result = await runAgent(question);
            res.json({ answer: result });
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: error.message })
        }
    });
});


//Required for Database syncing with Firestore, CRUD operations - Updated CORS
exports.userAPI = functions.https.onRequest(async (req, res) => {
    // Set CORS headers explicitly
    const origin = req.headers.origin;
    const allowedOrigins = [
        'http://localhost:3000',
        'https://hackathon-competition-2025.web.app',
        'https://hackathon-competition-2025.firebaseapp.com'
    ];
    
    if (allowedOrigins.includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
    } else {
        res.set('Access-Control-Allow-Origin', '*');
    }
    
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Credentials', 'true');
 
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    return cors(req, res, async () => {
        try {
            const { action, userData } = req.body;
            // Validate input first
            if (!userData || !userData.uid) {
                res.json({ success: false, error: "UID is required" });
                return;
            }

            const result = await databaseAgent(action, userData);

            if (result === null) {
                res.json({ success: false, error: "User not found or failed to process request" });
                return;
            }

            res.json({ success: true, user: result });

        } catch (error) {
            console.error('User API error:', error);
            res.status(500).json({ error: error.message });
        }
    });
});








