/**
 * IndexedDB データベースマネージャー
 * 台データ・店舗データ・履歴の永続化
 */

const DBManager = {
  db: null,
  DB_NAME: 'JugglerAnalyzerDB',
  DB_VERSION: 1,

  /**
   * データベースを初期化
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // 分析記録ストア
        if (!db.objectStoreNames.contains('records')) {
          const recordStore = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
          recordStore.createIndex('date', 'date', { unique: false });
          recordStore.createIndex('storeName', 'storeName', { unique: false });
          recordStore.createIndex('machineName', 'machineName', { unique: false });
        }

        // 店舗ストア
        if (!db.objectStoreNames.contains('stores')) {
          db.createObjectStore('stores', { keyPath: 'name' });
        }

        // 予測精度ストア
        if (!db.objectStoreNames.contains('accuracy')) {
          const accStore = db.createObjectStore('accuracy', { keyPath: 'id', autoIncrement: true });
          accStore.createIndex('date', 'date', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => reject(e.target.error);
    });
  },

  /**
   * 分析記録を保存
   */
  async saveRecord(record) {
    return this._transaction('records', 'readwrite', store => {
      record.createdAt = new Date().toISOString();
      return store.add(record);
    });
  },

  /**
   * 全記録を取得
   */
  async getAllRecords() {
    return this._transaction('records', 'readonly', store => store.getAll());
  },

  /**
   * 店舗別の記録を取得
   */
  async getRecordsByStore(storeName) {
    return this._transaction('records', 'readonly', store => {
      const index = store.index('storeName');
      return index.getAll(storeName);
    });
  },

  /**
   * 店舗を保存
   */
  async saveStore(storeData) {
    return this._transaction('stores', 'readwrite', store => store.put(storeData));
  },

  /**
   * 全店舗を取得
   */
  async getAllStores() {
    return this._transaction('stores', 'readonly', store => store.getAll());
  },

  /**
   * 予測精度を記録
   */
  async saveAccuracy(accuracyData) {
    return this._transaction('accuracy', 'readwrite', store => {
      accuracyData.date = new Date().toISOString();
      return store.add(accuracyData);
    });
  },

  /**
   * 予測精度履歴を取得
   */
  async getAccuracyHistory() {
    return this._transaction('accuracy', 'readonly', store => store.getAll());
  },

  /**
   * 記録を削除
   */
  async deleteRecord(id) {
    return this._transaction('records', 'readwrite', store => store.delete(id));
  },

  /**
   * 全データをJSON形式でエクスポート
   */
  async exportAll() {
    const records = await this.getAllRecords();
    const stores = await this.getAllStores();
    const accuracy = await this.getAccuracyHistory();

    return JSON.stringify({
      version: 1,
      exportDate: new Date().toISOString(),
      records, stores, accuracy
    }, null, 2);
  },

  /**
   * JSONデータをインポート
   */
  async importData(jsonStr) {
    const data = JSON.parse(jsonStr);
    if (!data.version) throw new Error('無効なデータ形式');

    let imported = 0;
    if (data.records) {
      for (const r of data.records) {
        delete r.id; // auto-increment用にIDを削除
        await this.saveRecord(r);
        imported++;
      }
    }
    if (data.stores) {
      for (const s of data.stores) {
        await this.saveStore(s);
        imported++;
      }
    }
    return imported;
  },

  /**
   * トランザクションヘルパー
   */
  _transaction(storeName, mode, callback) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('DB未初期化')); return; }
      const tx = this.db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = callback(store);

      if (request && request.onsuccess !== undefined) {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }
    });
  }
};
