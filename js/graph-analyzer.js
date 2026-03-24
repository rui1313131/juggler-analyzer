/**
 * グラフ波形解析エンジン
 * スランプグラフの画像から差枚数推移（波形）の特徴を抽出
 */

const GraphAnalyzer = {
  isReady: false,
  cvLoaded: false,

  /**
   * 初期化: OpenCV.jsのロードを待機
   */
  async init() {
    return new Promise((resolve) => {
      if (this.cvLoaded) return resolve();
      
      // OpenCV.jsの非同期読み込みチェック
      const checkCv = setInterval(() => {
        if (typeof cv !== 'undefined' && cv.matFromArray) {
          clearInterval(checkCv);
          this.cvLoaded = true;
          this.isReady = true;
          resolve();
        }
      }, 500);

      // フォールバック（OpenCVがない場合は簡易Canvasベースに切り替え）
      setTimeout(() => {
        if (!this.cvLoaded) {
          clearInterval(checkCv);
          console.warn("OpenCV.js is not loaded. Using fallback basic canvas extraction.");
          this.isReady = true;
          resolve();
        }
      }, 10000);
    });
  },

  /**
   * 画像から波形データを抽出
   */
  async analyzeGraphImage(imageElement, colorThreshold = { r: 200, g: 0, b: 0 }) {
    if (!this.isReady) await this.init();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    ctx.drawImage(imageElement, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let points = [];

    if (this.cvLoaded) {
      points = this._extractPointsWithOpenCV(canvas);
    } else {
      points = this._extractPointsBasic(imageData, colorThreshold);
    }

    if (points.length < 10) {
      throw new Error("グラフの波形を十分に検出できませんでした。色が薄いか、ノイズの多い画像の可能性があります。");
    }

    // デジタル波形（100段階の正規化配列配列）へ変換
    const normalizedWaveform = this._normalizeWaveform(points, canvas.width, canvas.height);
    
    // 波形特徴の分析
    const features = this._analyzeFeatures(normalizedWaveform);

    return {
      waveform: normalizedWaveform,
      features: features,
      previewCanvas: canvas // デバッグ/プレビュー表示用
    };
  },

  /**
   * 簡易Canvas APIベースの色抽出
   * 指定色に最も近いピクセルを各X座標で探す
   */
  _extractPointsBasic(imageData, targetColor) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const points = [];

    // 各X座標（横軸=時間軸）ごとに、最も色が濃い（対象色に近い）Y座標を見つける
    for (let x = 0; x < width; x += 5) { // 5px間隔でサンプリング
      let bestY = -1;
      let minDiff = 1000;

      for (let y = 0; y < height; y++) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // 赤色抽出の例 (スランプグラフの多くは赤や黄色の線)
        // 背景と線のコントラストで判別する簡易ロジック
        const rDiff = Math.abs(r - targetColor.r);
        const gDiff = Math.abs(g - targetColor.g);
        const bDiff = Math.abs(b - targetColor.b);
        const totalDiff = rDiff + gDiff + bDiff;

        // 色が近く、かつ色が明るい（白い背景との区別）
        if (totalDiff < minDiff && (r > 100 || g > 100)) {
          minDiff = totalDiff;
          bestY = y;
        }
      }

      if (bestY !== -1 && minDiff < 400) {
        points.push({ x, y: bestY });
      }
    }

    return points;
  },

  /**
   * OpenCV.jsを用いたより高度な輪郭抽出
   * ※実装予定のスタブ。実際のOpenCV処理は複雑なため将来的拡張用
   */
  _extractPointsWithOpenCV(canvas) {
    // 現在は基本処理へフォールバック
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return this._extractPointsBasic(imageData, {r: 255, g: 0, b: 0});
  },

  /**
   * 抽出したピクセル座標を、0〜100の相対的な差枚グラフに正規化する
   */
  _normalizeWaveform(points, imgWidth, imgHeight) {
    if (points.length === 0) return [];

    // ノイズ除去（極端に飛んでいる点を弾くスムージング処理）
    const smoothed = [];
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i-1].y;
      const curr = points[i].y;
      const next = points[i+1].y;
      // スパイクノイズ除去
      if (Math.abs(curr - prev) > imgHeight * 0.1 && Math.abs(curr - next) > imgHeight * 0.1) {
        smoothed.push({ x: points[i].x, y: (prev + next) / 2 });
      } else {
        smoothed.push(points[i]);
      }
    }

    const startX = smoothed[0].x;
    const endX = smoothed[smoothed.length - 1].x;
    const widthRange = endX - startX;

    // Y座標は画像上は下がプラスなので反転させる (-y)
    let minY = Infinity;
    let maxY = -Infinity;
    smoothed.forEach(p => {
      const invertedY = -p.y;
      if (invertedY < minY) minY = invertedY;
      if (invertedY > maxY) maxY = invertedY;
    });
    
    const heightRange = maxY - minY;

    // X軸を100等分、Y軸を-100〜100（初期値を0想定）にスケーリング
    // 最初の点が原点(差枚0)と仮定する
    const initialY = -smoothed[0].y;
    
    return smoothed.map(p => {
      const normX = ((p.x - startX) / widthRange) * 100;
      // 初期位置からの相対的な高さ
      const relativeY = (-p.y) - initialY;
      
      return {
        progress: Math.round(normX),
        value: relativeY // 単位は差枚ではなく、相対的な比率（波の形）
      };
    });
  },

  /**
   * 正規化された波形から「波の荒さ・安定度・トレンド」を計算
   */
  _analyzeFeatures(waveform) {
    if (waveform.length < 5) return null;

    let maxVal = -Infinity;
    let minVal = Infinity;
    const finalVal = waveform[waveform.length - 1].value;
    
    let totalFluctuation = 0; // 上下の波の激しさ（荒さ）
    let maxDrawdown = 0; // 最大ハマり幅
    let currentPeak = waveform[0].value;

    for (let i = 0; i < waveform.length; i++) {
        const val = waveform[i].value;
        if (val > maxVal) maxVal = val;
        if (val < minVal) minVal = val;
        
        if (i > 0) {
            totalFluctuation += Math.abs(val - waveform[i-1].value);
        }

        if (val > currentPeak) {
            currentPeak = val;
        } else {
            const drawdown = currentPeak - val;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
    }

    // 全体の上昇幅（最終値 - 初期値）
    const overallTrend = finalVal;
    
    // 安定度スコア = トレンド / (総変動量 + 1)
    // 高設定のアイムジャグラーなどは、ギザギザしながらも総変動量に対するトレンドの割合が高い
    const stabilityScore = overallTrend > 0 ? (overallTrend / totalFluctuation) : 0;

    // 波形の分類
    let type = "もみ合い型";
    let typeConfig = { label: "もみ合い", color: "blue" };

    if (overallTrend > 0 && stabilityScore > 0.3) {
      type = "安定上昇型"; // 設定6に多い
      typeConfig = { label: "高設定挙動（安定）", color: "red" };
    } else if (overallTrend > 0 && maxDrawdown > (maxVal * 0.5)) {
      type = "一撃波乱型"; // 低設定の誤爆、あるいは中間設定
      typeConfig = { label: "波乱・一撃", color: "yellow" };
    } else if (overallTrend < 0 && minVal === finalVal) {
      type = "右肩下がり";
      typeConfig = { label: "低設定挙動（吸い込み）", color: "gray" };
    } else if (overallTrend < 0 && finalVal > minVal) {
      type = "マイナスからの反発";
      typeConfig = { label: "中間設定・リカバリ", color: "orange" };
    }

    return {
      trend: overallTrend,
      maxVal,
      minVal,
      maxDrawdown,
      stabilityScore,
      fluctuation: totalFluctuation,
      type: typeConfig
    };
  }
};
