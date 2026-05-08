import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import crypto from "crypto";
import axios from "axios";
import webpush from "web-push";
import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Push Notification Setup
  const publicVapidKey = "BHQTt-eouqiorYrO3juFOFdde9cudT3y6Unoe9e4F7NRcrnbPw0kNcrAT5_0SYwX4LgK7EFcn8egCMGeyzV2t6U";
  const privateVapidKey = "FdZzBtxXf6vO4IWmu2huZLTndz5uYXK8Y6d2wM4hPNM";

  // Pre-load config
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
  const { projectId, firestoreDatabaseId } = firebaseConfig;
  
  // LOGGING: Be extremely explicit about the database target
  console.log(`[Firebase Configuration]`);
  console.log(` - Project ID: ${projectId}`);
  console.log(` - Database ID: ${firestoreDatabaseId || '(default)'}`);

  // CRITICAL: Set env vars globally for gRPC clients to ensure they target the right project/database
  if (projectId) {
    process.env.GOOGLE_CLOUD_PROJECT = projectId;
    if (firestoreDatabaseId) {
      process.env.FIRESTORE_DATABASE = firestoreDatabaseId;
      console.log(` - System ENV: FIRESTORE_DATABASE set to ${firestoreDatabaseId}`);
    }
  }

  webpush.setVapidDetails(
    "mailto:infodailyyield@gmail.com",
    publicVapidKey,
    privateVapidKey
  );

  // Lazy Firebase Admin Initialization
  let _db: any;
  const getDb = () => {
    if (!_db) {
      try {
        if (getApps().length === 0) {
          console.log(`[Firebase Admin] Initializing with Project ID: ${projectId}...`);
          try {
            // Try default initialization (Application Default Credentials)
            initializeApp();
          } catch (e) {
             console.log(`[Firebase Admin] App Default failed, falling back to explicit Project ID.`);
             initializeApp({ projectId });
          }
        }
        
        const adminApp = getApps()[0];
        // If we have a named database, use it. Otherwise default.
        if (firestoreDatabaseId && firestoreDatabaseId !== "(default)") {
          console.log(`[Firebase Admin] Target Database: ${firestoreDatabaseId}`);
          _db = getFirestore(adminApp, firestoreDatabaseId);
        } else {
          console.log(`[Firebase Admin] Target Database: (default)`);
          _db = getFirestore(adminApp);
        }
        
        _db.settings({ ignoreUndefinedProperties: true });
        console.log("[Firebase Admin] DB instance initialized successfully.");
      } catch (err: any) {
        console.error("[Firebase Admin Init Error]:", err.message);
        throw err;
      }
    }
    return _db;
  };

  // Connection Test
  setTimeout(async () => {
    try {
      const db = getDb();
      // Test query on 'broadcast' collection
      console.log(`[Firestore Admin] Running permission test on ${projectId}/${firestoreDatabaseId || '(default)'}...`);
      const testSnap = await db.collection("broadcast").limit(1).get();
      console.log(`[Firestore Admin] Permission test PASS. Found ${testSnap.size} broadcasts.`);
    } catch (err: any) {
      console.error("[Firestore Admin] Permission test FAIL:", err.message);
      if (err.message.includes("PERMISSION_DENIED")) {
        console.error("CRITICAL PERMISSION ERROR:");
        console.error(`1. Go to Google Cloud Console -> IAM & Admin -> IAM`);
        console.error(`2. Find: firebase-adminsdk-fbsvc@${projectId}.iam.gserviceaccount.com`);
        console.error(`3. Ensure it has the "Cloud Datastore User" or "Firebase Admin" role.`);
        console.error(`4. If using a named database (${firestoreDatabaseId}), ensure the role is granted at the project level or for that specific database.`);
      }
    }
  }, 15000);

  // Helper to handle Firestore operations
  async function withFirestore(op: (db: any) => Promise<any>) {
    try {
      const db = getDb();
      return await op(db);
    } catch (err: any) {
      console.error("[Firestore Admin Op Error]:", err.message);
      if (err.message && (err.message.includes("PERMISSION_DENIED") || err.message.includes("not been used in project"))) {
         console.warn(`[Firestore Admin] Error accessing: ${projectId}/${firestoreDatabaseId}. Verify database is provisioned and SA has access.`);
      }
      throw err;
    }
  }

  // Global Logging Middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  // 1. Paystack Webhook - DISABLED auto-credit as per request
  app.post("/api/paystack/webhook", express.raw({ type: "application/json" }), async (req: any, res) => {
    // Only log and respond 200 to satisfy Paystack
    console.log("Paystack Webhook received (Auto-credit disabled)");
    res.sendStatus(200);
  });

  // 2. Standard Parsers for ALL other routes
  app.use(express.json());

  // 3. API: Admin Migration
  app.post("/api/admin/migrate", async (req, res) => {
    const { secret } = req.body;
    console.log("Migration request received...");
    
    if (secret !== "migrate_secret_2024") {
      console.warn("Migration unauthorized");
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      await withFirestore(async (db) => {
        const usersSnap = await db.collection("users").get();
        const batch = db.batch();
        let count = 0;

        usersSnap.forEach((doc: any) => {
          const data = doc.data();
          const updates: any = {};

          // Core fields
          if (data.firstDepositBonusClaimed === undefined) updates.firstDepositBonusClaimed = false;
          if (data.walletBalance === undefined) updates.walletBalance = data.balanceNGN || 0;
          if (data.balanceNGN === undefined) updates.balanceNGN = data.balanceNGN || 0;
          if (data.hasDepositedBefore === undefined) updates.hasDepositedBefore = false;
          if (data.referralActive === undefined) updates.referralActive = false;
          if (data.totalProfitNGN === undefined) updates.totalProfitNGN = data.totalProfit || 0;
          if (!data.referralCode) updates.referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          if (data.referralEarnings === undefined) updates.referralEarnings = 0;
          if (data.totalReferrals === undefined) updates.totalReferrals = 0;
          if (data.totalDepositedNGN === undefined) updates.totalDepositedNGN = 0;
          if (data.totalWithdrawnNGN === undefined) updates.totalWithdrawnNGN = 0;
          if (data.kycStatus === undefined) updates.kycStatus = 'unverified';
          if (data.hasRedeemedCode === undefined) updates.hasRedeemedCode = false;
          if (!data.tier) updates.tier = 'tier1';
          if (data.streak === undefined) updates.streak = 0;
          if (data.totalGamesPlayed === undefined) updates.totalGamesPlayed = 0;
          
          if (data.lastDepositReference === undefined) updates.lastDepositReference = null;
          if (data.lastDepositAt === undefined) updates.lastDepositAt = null;

          if (Object.keys(updates).length > 0) {
            batch.update(doc.ref, updates);
            count++;
          }
        });

        if (count > 0) await batch.commit();
        console.log(`Migration complete: ${count} users updated`);
        res.json({ success: true, migratedCount: count });
      });
    } catch (err: any) {
      console.error("Migration error:", err);
      res.status(500).json({ error: "Migration error: " + err.message });
    }
  });

  // API: Initialize Paystack
  app.post("/api/paystack/initialize", async (req, res) => {
    const { email, amount, userId, callbackUrl } = req.body;
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret) return res.status(500).json({ error: "Missing API Key" });

    try {
      console.log(`[Initialize] User: ${email}, Amount: ${amount}, UID: ${userId}`);
      const payload = {
        email,
        amount: Math.round(amount * 100),
        metadata: { 
          user_id: userId,
          custom_fields: [{ display_name: "User ID", variable_name: "user_id", value: userId }]
        },
        callback_url: callbackUrl || process.env.APP_URL || "https://ais-pre-hx2rhnjg3qqm6jympywjbv-778709981789.europe-west2.run.app/"
      };
      
      const response = await axios.post("https://api.paystack.co/transaction/initialize", payload, {
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }
      });
      console.log(`[Initialize] Success: ${response.data.data.reference}`);
      res.json(response.data);
    } catch (err: any) {
      console.error("[Initialize] Error:", err.response?.data || err.message);
      res.status(500).json({ error: "Initiation failed" });
    }
  });

  // API: Verify Paystack Transaction
  app.post("/api/paystack/verify", async (req, res) => {
    const { reference } = req.body;
    console.log(`[Verify] Initiating verification for: ${reference}`);
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret) {
      console.error("[Verify] System Error: PAYSTACK_SECRET_KEY is missing");
      return res.status(500).json({ error: "Missing API Key" });
    }

    try {
      const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${secret}` }
      });

      const { data } = response.data;
      if (!data) return res.status(400).json({ error: "No data returned from Paystack" });
      
      if (data.status === "success") {
        const { amount, metadata, reference: ref, customer } = data;
        let userId;
        try {
          const parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
          userId = parsedMetadata?.user_id;
        } catch (e) { console.error("[Verify] Metadata parse error:", e); }

        if (userId) {
          await withFirestore(async (db) => {
            const requestRef = db.collection("depositRequests").doc(`paystack_${ref}`);
            const requestSnap = await requestRef.get();

            if (!requestSnap.exists) {
              const userSnap = await db.collection("users").doc(userId).get();
              const userData = userSnap.data() || {};
              const isFirst = !userData.hasDepositedBefore && !userData.firstDepositBonusClaimed;

              await requestRef.set({
                userId,
                username: userData.displayName || userData.uid || "Unknown User",
                email: customer.email || userData.email || "No Email",
                userEmail: customer.email || userData.email || "No Email",
                amount: Number(amount || 0) / 100,
                reference: ref,
                status: "pending",
                isFirstDeposit: !!isFirst,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                verificationData: { gateway: "Paystack", paidAt: data.paid_at || new Date().toISOString() }
              });

              await db.collection("notifications").add({
                userId,
                title: "Deposit Initiated ⏳",
                message: `Your deposit of ₦${(Number(amount || 0) / 100).toLocaleString()} has been received and is pending admin confirmation.`,
                type: "alert",
                createdAt: FieldValue.serverTimestamp()
              });

              res.json({ success: true, manual: true, message: "Deposit initiated." });
            } else {
              res.json({ success: true, manual: true, message: "Deposit is already pending." });
            }
          });
        } else {
          res.status(400).json({ error: "Transaction missing metadata (userId)" });
        }
      } else {
        res.status(400).json({ error: `Verification failed: ${data.status}` });
      }
    } catch (err: any) {
      console.error("[Verify] System Error:", err.message);
      res.status(500).json({ error: "Verification system error", details: err.message });
    }
  });

  // API: Admin - Get Pending Deposits
  app.get("/api/admin/deposits", async (req, res) => {
    try {
      await withFirestore(async (db) => {
        const snap = await db.collection("depositRequests")
          .where("status", "==", "pending")
          .orderBy("createdAt", "desc")
          .get();
        
        const requests = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        res.json(requests);
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Admin - Approve Deposit
  app.post("/api/admin/deposits/approve", async (req, res) => {
    const { requestId, adminSecret } = req.body;
    if (adminSecret !== "infodailyyield_admin_2024") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      await withFirestore(async (db) => {
        const requestRef = db.collection("depositRequests").doc(requestId);
        const requestSnap = await requestRef.get();

        if (!requestSnap.exists) return res.status(404).json({ error: "Request not found" });
        const requestData = requestSnap.data()!;

        if (requestData.status !== "pending") return res.status(400).json({ error: "Request is not pending" });

        const { userId, amount, reference, isFirstDeposit: reqIsFirst } = requestData;
        const userRef = db.collection("users").doc(userId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) return res.status(404).json({ error: "User not found" });
        const profile = userSnap.data()!;

        const isFirstDeposit = reqIsFirst !== undefined ? reqIsFirst : (!profile.firstDepositBonusClaimed && !profile.hasDepositedBefore);
        const bonusAmount = 3000;
        const totalToCredit = amount + (isFirstDeposit ? bonusAmount : 0);

        const batch = db.batch();
        const updateData: any = {
          balanceNGN: FieldValue.increment(totalToCredit),
          walletBalance: FieldValue.increment(totalToCredit),
          totalDepositedNGN: FieldValue.increment(amount),
          hasDepositedBefore: true,
          referralActive: true,
          updatedAt: FieldValue.serverTimestamp()
        };
        if (isFirstDeposit) updateData.firstDepositBonusClaimed = true;
        batch.update(userRef, updateData);

        batch.update(requestRef, { 
          status: "approved", 
          approvedAt: FieldValue.serverTimestamp() 
        });

        batch.set(db.collection("transactions").doc(`paystack_${reference}`), {
          userId, type: "deposit", amount: amount,
          method: "Paystack", reference, status: "completed",
          createdAt: FieldValue.serverTimestamp(), description: "Vault funding (Approved)"
        });

        if (isFirstDeposit) {
          batch.set(db.collection("transactions").doc(), {
            userId, type: "bonus", amount: bonusAmount,
            status: "completed", createdAt: FieldValue.serverTimestamp(),
            description: "New Account Bonus"
          });
        }

        batch.set(db.collection("notifications").doc(), {
          userId, title: "Funding Successful ✅",
          message: `Your deposit of ₦${amount.toLocaleString()} has been credited. ${isFirstDeposit ? "₦3,000 welcome bonus added." : ""}`,
          type: "payout", createdAt: FieldValue.serverTimestamp()
        });

        await batch.commit();
        res.json({ success: true });
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Admin - Cancel Deposit
  app.post("/api/admin/deposits/cancel", async (req, res) => {
    const { requestId, adminSecret } = req.body;
    if (adminSecret !== "infodailyyield_admin_2024") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      await withFirestore(async (db) => {
        const requestRef = db.collection("depositRequests").doc(requestId);
        const requestSnap = await requestRef.get();

        if (!requestSnap.exists) return res.status(404).json({ error: "Request not found" });
        const requestData = requestSnap.data()!;

        if (requestData.status !== "pending") return res.status(400).json({ error: "Request is not pending" });

        const batch = db.batch();
        batch.update(requestRef, { 
          status: "cancelled", 
          cancelledAt: FieldValue.serverTimestamp() 
        });

        batch.set(db.collection("notifications").doc(), {
          userId: requestData.userId, 
          title: "Deposit Cancelled ❌",
          message: "Deposit cancelled. Contact support if you were charged.",
          type: "payout", 
          createdAt: FieldValue.serverTimestamp()
        });

        await batch.commit();
        res.json({ success: true });
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  // API: Push Subscription
  app.post("/api/push/subscribe", async (req, res) => {
    const { subscription, userId } = req.body;
    if (!subscription || !userId) return res.status(400).json({ error: "Missing subscription or userId" });

    try {
      console.log(`[Push] Attempting to save subscription for user: ${userId}`);
      await withFirestore(async (db) => {
        await db.collection("pushSubscriptions").doc(userId).set({
          subscription,
          userId,
          updatedAt: FieldValue.serverTimestamp()
        });
        console.log(`[Push] Subscription saved successfully for ${userId}`);
        res.status(201).json({ success: true });
      });
    } catch (err: any) {
      console.error("[Push] Subscription Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Helper to send push
  async function sendPush(userId: string, title: string, body: string, url: string = "/") {
    try {
      await withFirestore(async (db) => {
        // First check if user has push enabled in profile
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists || userDoc.data().pushEnabled === false) {
           console.log(`[Push] User ${userId} has push disabled or no profile.`);
           return;
        }

        const subDoc = await db.collection("pushSubscriptions").doc(userId).get();
        if (!subDoc.exists) return;
        
        const { subscription } = subDoc.data();
        const payload = JSON.stringify({
          title,
          body,
          data: { url }
        });

        await webpush.sendNotification(subscription, payload);
        console.log(`[Push] Sent to user ${userId}: ${title}`);
      });
    } catch (err: any) {
      console.error(`[Push] Failed for user ${userId}:`, err.message);
      if (err.statusCode === 404 || err.statusCode === 410) {
        console.log(`[Push] Subscription expired for ${userId}, removing...`);
        await withFirestore(async (db) => {
          await db.collection("pushSubscriptions").doc(userId).delete();
        });
      }
    }
  }

  async function broadcastPush(title: string, body: string, url: string = "/") {
    try {
      await withFirestore(async (db) => {
        const subSnap = await db.collection("pushSubscriptions").get();
        console.log(`[Push Broadcast] Sending to potential ${subSnap.size} subscribers`);
        
        const payload = JSON.stringify({
          title,
          body,
          data: { url }
        });

        const promises = subSnap.docs.map(async (doc) => {
          const { subscription, userId } = doc.data();
          
          // Check if user enabled push
          const userDoc = await db.collection("users").doc(userId).get();
          if (!userDoc.exists || userDoc.data().pushEnabled === false) return;

          return webpush.sendNotification(subscription, payload).catch(async (err) => {
            if (err.statusCode === 404 || err.statusCode === 410) {
               console.log(`[Push] Removing expired sub: ${userId}`);
               await db.collection("pushSubscriptions").doc(userId).delete();
            }
          });
        });

        await Promise.all(promises);
      });
    } catch (err: any) {
      console.error("[Push Broadcast] Failed:", err.message);
    }
  }

  // API: Trigger Notification (Internal/Admin)
  app.post("/api/push/trigger", async (req, res) => {
    const { userId, title, body, url, adminSecret } = req.body;
    if (adminSecret !== "infodailyyield_admin_2024") return res.status(401).json({ error: "Unauthorized" });
    
    await sendPush(userId, title, body, url);
    res.json({ success: true });
  });

  // API: Broadcast Notification
  app.post("/api/push/broadcast", async (req, res) => {
    const { title, body, url, adminSecret } = req.body;
    if (adminSecret !== "infodailyyield_admin_2024") return res.status(401).json({ error: "Unauthorized" });
    
    await broadcastPush(title, body, url);
    res.json({ success: true });
  });

  // Background Task: Check for matured investments and daily reminders
  setInterval(async () => {
    const now = new Date();
    
    try {
      await withFirestore(async (db) => {
        // 1. Matured Investments
        const invSnap = await db.collection("investments")
          .where("status", "==", "active")
          .where("endTime", "<=", now)
          .where("pushNotified", "==", false)
          .limit(10)
          .get();

        for (const doc of invSnap.docs) {
          const inv = doc.data();
          await sendPush(inv.userId, "Capital Matured! 💎", `Your investment has finished. Check your vault for returns!`, "/portfolio");
          await doc.ref.update({ pushNotified: true });
        }

        // 2. Daily Reminders (Check every few hours or once a day)
        if (now.getHours() === 9 && now.getMinutes() < 5) {
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const usersToRemind = await db.collection("users")
             .where("lastCheckIn", "<", yesterday)
             .limit(20)
             .get();

          for (const doc of usersToRemind.docs) {
             await sendPush(doc.id, "Daily Yield Awaits! ⚡", "Don't forget to claim your daily check-in bonus!", "/dashboard");
          }
        }
      });
    } catch (err) {
      console.error("[Background Task Error]:", err);
    }
  }, 1000 * 60 * 5); // Run every 5 minutes

  // API: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite / Static Assets
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite dev server...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware applied.");
    } catch (viteError) {
      console.error("Vite initialization failed:", viteError);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API endpoint not found' });
        res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
    console.error("Fatal server error:", err);
    process.exit(1);
});
