/**
 * Firebase連携モジュール
 * (CUI自動セットアップにより自動生成されました)
 */

const firebaseConfig = {
  "projectId": "juggler-analyzer-9zxzwx",
  "appId": "1:499528007974:web:b0fd78482e9a7042a8c1e7",
  "storageBucket": "juggler-analyzer-9zxzwx.firebasestorage.app",
  "apiKey": "AIzaSyAYHqmcJdgQPmViYZ3RahIEvTahWRKVNLY",
  "authDomain": "juggler-analyzer-9zxzwx.firebaseapp.com",
  "messagingSenderId": "499528007974",
  "projectNumber": "499528007974",
  "version": "2"
};

let db = null;

try {
  if (firebaseConfig.apiKey) {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("🔥 Firebase initialized automatically.");
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

const CloudSync = {
  get isActive() {
    return db !== null;
  },

  async uploadRecord(record) {
    if (!this.isActive) return false;
    try {
      const publicData = {
        machineName: record.machineName,
        totalGames: record.totalGames,
        bestSetting: record.result.bestSetting,
        confidenceLevel: record.result.confidence.level,
        highSettingProb: record.result.highSettingProb,
        expectedValue: record.result.expectedValue,
        storeName: record.storeName || "不明",
        machineNumber: record.machineNumber || "不明",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection("public_records").add(publicData);
      return true;
    } catch (e) {
      console.error("Cloud upload failed:", e);
      return false;
    }
  },

  async getPublicRecords() {
    if (!this.isActive) return [];
    try {
      const snapshot = await db.collection("public_records")
        .orderBy("timestamp", "desc")
        .limit(100)
        .get();
      const records = [];
      snapshot.forEach(doc => {
        records.push(doc.data());
      });
      return records;
    } catch (e) {
      console.error("Failed to fetch public records:", e);
      return [];
    }
  }
};
