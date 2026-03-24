/**
 * OCRモジュール — Tesseract.jsによる画像からのデータ読取
 */

const OCRModule = {
  worker: null,
  isReady: false,
  isLoading: false,

  /**
   * Tesseract.jsワーカーを初期化
   */
  async init() {
    if (this.isReady || this.isLoading) return;
    this.isLoading = true;

    try {
      this.worker = await Tesseract.createWorker('jpn+eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            document.dispatchEvent(new CustomEvent('ocr-progress', { detail: { progress } }));
          }
        }
      });
      this.isReady = true;
    } catch (e) {
      console.error('OCR初期化エラー:', e);
      this.isReady = false;
    }
    this.isLoading = false;
  },

  /**
   * 画像を前処理してOCR精度を向上
   */
  preprocessImage(imageElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 解像度を上げる
    const scale = 2;
    canvas.width = imageElement.naturalWidth * scale;
    canvas.height = imageElement.naturalHeight * scale;
    
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    
    // グレースケール変換 + コントラスト強調
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // グレースケール
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      // コントラスト強調
      const contrast = 1.5;
      const factor = (259 * (contrast * 128 + 255)) / (255 * (259 - contrast * 128));
      const enhanced = factor * (gray - 128) + 128;
      // 二値化（閾値: 128）
      const bw = enhanced > 128 ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = bw;
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  },

  /**
   * 画像から数値データを抽出
   */
  async recognizeImage(imageSource) {
    if (!this.isReady) await this.init();
    if (!this.worker) throw new Error('OCRワーカー未初期化');

    try {
      // 前処理
      let processedImage = imageSource;
      if (imageSource instanceof HTMLImageElement) {
        processedImage = this.preprocessImage(imageSource);
      }

      const result = await this.worker.recognize(processedImage);
      return this.parseJugglerData(result.data.text);
    } catch (e) {
      console.error('OCR認識エラー:', e);
      return null;
    }
  },

  /**
   * OCR結果からジャグラーのデータを解析
   */
  parseJugglerData(text) {
    const data = {
      totalGames: null,
      bigCount: null,
      regCount: null,
      rawText: text
    };

    // 数値パターンの抽出
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const numbers = [];

    lines.forEach(line => {
      // 数値を抽出（全角数字も対応）
      const normalized = line
        .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
        .replace(/[,、，]/g, '');
      
      const matches = normalized.match(/\d+/g);
      if (matches) {
        matches.forEach(m => {
          const num = parseInt(m, 10);
          if (!isNaN(num)) numbers.push(num);
        });
      }
    });

    // パターンマッチによるデータ特定
    // ゲーム数は通常最大値
    if (numbers.length > 0) {
      // BIG/REGのラベル近くの数値を探す
      const bigPatterns = /(?:BIG|ビッグ|ＢＩＧ)[:\s]*(\d+)/i;
      const regPatterns = /(?:REG|レギュラー|ＲＥＧ|RB)[:\s]*(\d+)/i;
      const gamePatterns = /(?:ゲーム|G|回転|総回転)[:\s]*(\d+)/i;

      const fullText = text.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));

      const bigMatch = fullText.match(bigPatterns);
      const regMatch = fullText.match(regPatterns);
      const gameMatch = fullText.match(gamePatterns);

      if (gameMatch) data.totalGames = parseInt(gameMatch[1], 10);
      if (bigMatch) data.bigCount = parseInt(bigMatch[1], 10);
      if (regMatch) data.regCount = parseInt(regMatch[1], 10);

      // ラベルが見つからない場合、数値の大きさで推定
      if (!data.totalGames && !data.bigCount && !data.regCount && numbers.length >= 3) {
        numbers.sort((a, b) => b - a);
        data.totalGames = numbers[0]; // 最大値 = ゲーム数
        // 残りの2つからBIG/REG推定
        const remaining = numbers.slice(1).filter(n => n < data.totalGames / 10);
        if (remaining.length >= 2) {
          data.bigCount = Math.max(remaining[0], remaining[1]);
          data.regCount = Math.min(remaining[0], remaining[1]);
        }
      }
    }

    data.isValid = data.totalGames !== null && data.bigCount !== null && data.regCount !== null;
    return data;
  },

  /**
   * ワーカーを終了
   */
  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isReady = false;
    }
  }
};
