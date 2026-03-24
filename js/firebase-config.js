/**
 * Firebase連携モジュール
 * ユーザーが自身のFirebase構成オブジェクトをここに入力します。
 */

// TODO: Firebaseコンソールから取得した設定値に書き換えてください。
// Firebaseの初期化と共有機能を利用するには、以下の config オブジェクトを埋める必要があります。
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let db = null;

try {
  // 初期化されているかチェック
  if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("🔥 Firebase initialized.");
  } else {
    console.warn("⚠️ Firebase config is missing. Could sync is disabled.");
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

const CloudSync = {
  get isActive() {
    return db !== null;
  },

  /**
   * 匿名データとして分析結果をクラウドへ送信
   */
  async uploadRecord(record) {
    if (!this.isActive) return false;

    try {
      // 個人を特定できない情報のみを抽出
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

  /**
   * クラウドから「みんなのデータ」最新100件を取得
   */
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
