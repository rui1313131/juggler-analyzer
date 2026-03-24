/**
 * メインアプリケーション — UI制御・イベント管理
 */

let currentResult = null;
let currentGraphFeatures = null;
let settingChart = null;
let dayChart = null;
let accuracyChart = null;

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', async () => {
  await DBManager.init();
  GraphAnalyzer.init(); // 非同期でOpenCVロード
  initMachineSelect();
  initTabs();
  initOCR();
  initGraphAnalyzer();
  initEventListeners();
  loadStoreList();
  loadHistory();
  loadAccuracy();
});

// ===== 機種セレクトボックス初期化 =====
function initMachineSelect() {
  const select = document.getElementById('machineName');
  getMachineNames().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

// ===== タブ切替 =====
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

// ===== OCR初期化 =====
function initOCR() {
  const dropzone = document.getElementById('ocrDropzone');
  const fileInput = document.getElementById('ocrFileInput');

  dropzone.addEventListener('click', () => fileInput.click());
  
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) processOCRImage(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) processOCRImage(e.target.files[0]);
  });

  document.addEventListener('ocr-progress', (e) => {
    const bar = document.getElementById('ocrProgressFill');
    bar.style.width = e.detail.progress + '%';
  });
}

// ===== OCR画像処理 =====
async function processOCRImage(file) {
  const progressBar = document.getElementById('ocrProgressBar');
  const resultDiv = document.getElementById('ocrResult');
  const contentDiv = document.getElementById('ocrResultContent');
  
  progressBar.classList.add('visible');
  resultDiv.style.display = 'none';
  
  showToast('info', '🔍 画像を読み取り中...');

  try {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise(r => img.onload = r);

    const data = await OCRModule.recognizeImage(img);
    URL.revokeObjectURL(img.src);

    progressBar.classList.remove('visible');
    resultDiv.style.display = 'block';

    if (data && data.isValid) {
      contentDiv.innerHTML = `
        <div class="grid-3" style="margin-bottom:0.8rem;">
          <div style="text-align:center;">
            <div class="form-label">総回転数</div>
            <div class="num-highlight">${data.totalGames.toLocaleString()}</div>
          </div>
          <div style="text-align:center;">
            <div class="form-label">BIG</div>
            <div class="num-highlight" style="color:var(--color-shu-light)">${data.bigCount}</div>
          </div>
          <div style="text-align:center;">
            <div class="form-label">REG</div>
            <div class="num-highlight" style="color:var(--color-matcha)">${data.regCount}</div>
          </div>
        </div>
        <button class="btn btn-gold" onclick="applyOCRData(${data.totalGames}, ${data.bigCount}, ${data.regCount})" style="width:100%;">
          ✅ このデータを入力欄に反映
        </button>
      `;
      showToast('success', '✅ データ読取完了！');
    } else {
      contentDiv.innerHTML = `
        <div style="color:var(--color-shu-light); text-align:center;">
          <p>⚠️ 数値の自動認識に失敗しました</p>
          <p style="font-size:0.75rem; color:var(--color-text-dim);">読取テキスト: ${data ? data.rawText : 'なし'}</p>
          <p style="font-size:0.75rem; color:var(--color-text-dim);">手動で入力してください</p>
        </div>
      `;
      showToast('error', '⚠️ 自動認識に失敗しました');
    }
  } catch (e) {
    progressBar.classList.remove('visible');
    showToast('error', '❌ OCRエラー: ' + e.message);
  }
}

function applyOCRData(games, big, reg) {
  document.getElementById('totalGames').value = games;
  document.getElementById('bigCount').value = big;
  document.getElementById('regCount').value = reg;
  showToast('success', '✅ データを入力欄に反映しました');
}

// ===== グラフ波形解析初期化 =====
function initGraphAnalyzer() {
  const dropzone = document.getElementById('graphDropzone');
  const fileInput = document.getElementById('graphFileInput');

  dropzone.addEventListener('click', () => fileInput.click());
  
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) processGraphImage(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) processGraphImage(e.target.files[0]);
  });
}

// ===== グラフ画像処理 =====
async function processGraphImage(file) {
  showToast('info', '〽️ グラフ波形を解析中...');
  
  try {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise(r => img.onload = r);

    // 画像から波形解析
    // 対象色（赤っぽい線をデフォルトで探す）
    const result = await GraphAnalyzer.analyzeGraphImage(img, {r: 200, g: 50, b: 50});
    URL.revokeObjectURL(img.src);

    currentGraphFeatures = result.features;
    document.getElementById('graphResult').style.display = 'block';

    // プレビュー描画（Canvasのサイズを調整して元の画像を縮小表示、その上に抽出線を重ねる）
    const canvas = document.getElementById('graphPreviewCanvas');
    const ctx = canvas.getContext('2d');
    
    // 表示用サイズ調整
    const displayWidth = canvas.parentElement.clientWidth;
    const ratio = displayWidth / result.previewCanvas.width;
    canvas.width = displayWidth;
    canvas.height = result.previewCanvas.height * ratio;
    
    ctx.drawImage(result.previewCanvas, 0, 0, canvas.width, canvas.height);

    // 抽出した波形を上に描画
    if (result.waveform && result.waveform.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#f1c40f'; // 金色でハイライト
      ctx.lineWidth = 3;
      
      const wRange = result.waveform[result.waveform.length-1].progress; // max100
      
      // Y軸の復元描画（簡略化: 中央を0として上下に振るパースで描画）
      let maxV = -Infinity; let minV = Infinity;
      result.waveform.forEach(w => {
        if(w.value > maxV) maxV = w.value;
        if(w.value < minV) minV = w.value;
      });
      const vRange = maxV - minV || 1;
      
      result.waveform.forEach((w, i) => {
        const x = (w.progress / 100) * canvas.width;
        // Yは画像の中央付近を基準に相対的に (雑なプレビュー用)
        const y = canvas.height - ((w.value - minV) / vRange * canvas.height * 0.8 + canvas.height * 0.1);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // 特徴量テキストの表示
    const f = result.features;
    document.getElementById('graphFeaturesContent').innerHTML = `
      <div style="margin-bottom:0.8rem;">
        <span class="badge" style="background:${f.type.color}; color:#fff;">${f.type.label}</span>
      </div>
      <table class="stat-table" style="font-size:0.75rem;">
        <tr><th>安定度スコア</th><td>${f.stabilityScore.toFixed(2)}</td></tr>
        <tr><th>最大ハマり幅</th><td>${f.maxDrawdown.toFixed(0)}</td></tr>
        <tr><th>波の激しさ</th><td>${f.fluctuation.toFixed(0)}</td></tr>
      </table>
      <div style="margin-top:0.5rem; color:var(--color-kin);">
        ✅ この波形特徴を分析の材料として記録しました！
      </div>
    `;

    showToast('success', '✅ グラフの解析が完了しました');
  } catch (e) {
    console.error('グラフ解析エラー:', e);
    showToast('error', '⚠️ グラフ解析失敗: ' + e.message);
  }
}

function clearGraphData() {
  currentGraphFeatures = null;
  document.getElementById('graphResult').style.display = 'none';
  document.getElementById('graphFileInput').value = '';
  showToast('info', '🗑️ グラフデータをクリアしました');
}

// ===== イベントリスナー =====
function initEventListeners() {
  // 分析ボタン
  document.getElementById('btnAnalyze').addEventListener('click', runAnalysis);
  
  // 保存ボタン
  document.getElementById('btnSaveRecord').addEventListener('click', saveCurrentResult);
  
  // エクスポート
  document.getElementById('btnExport').addEventListener('click', exportData);
  
  // インポート
  document.getElementById('btnImport').addEventListener('click', () => {
    document.getElementById('importModal').classList.add('active');
  });
  document.getElementById('btnCancelImport').addEventListener('click', () => {
    document.getElementById('importModal').classList.remove('active');
  });
  document.getElementById('btnDoImport').addEventListener('click', importData);

  // 店舗セレクト
  document.getElementById('storeSelect').addEventListener('change', (e) => {
    renderStoreAnalysis(e.target.value);
  });
}

// ===== 分析実行 =====
function runAnalysis() {
  const machineName = document.getElementById('machineName').value;
  const totalGames = parseInt(document.getElementById('totalGames').value) || 0;
  const bigCount = parseInt(document.getElementById('bigCount').value) || 0;
  const regCount = parseInt(document.getElementById('regCount').value) || 0;
  const grapeCount = parseInt(document.getElementById('grapeCount').value) || null;
  const storeName = document.getElementById('storeName').value;
  const machineNumber = document.getElementById('machineNumber').value;
  const remainingGames = parseInt(document.getElementById('remainingGames').value) || 3000;

  // バリデーション
  if (!machineName) { showToast('error', '⚠️ 機種を選択してください'); return; }
  if (totalGames <= 0) { showToast('error', '⚠️ 総回転数を入力してください'); return; }
  if (bigCount < 0 || regCount < 0) { showToast('error', '⚠️ ボーナス回数を正しく入力してください'); return; }

  // 店舗データから事前確率を生成
  let priors = null;
  if (storeName) {
    DBManager.getRecordsByStore(storeName).then(storeRecords => {
      if (storeRecords && storeRecords.length > 0) {
        const dayOfWeek = new Date().getDay();
        priors = StoreAnalyzer.generatePriors(storeRecords, dayOfWeek, machineNumber);
      }
      executeAnalysis(machineName, totalGames, bigCount, regCount, grapeCount, remainingGames, storeName, machineNumber, priors, currentGraphFeatures);
    }).catch(() => {
      executeAnalysis(machineName, totalGames, bigCount, regCount, grapeCount, remainingGames, storeName, machineNumber, null, currentGraphFeatures);
    });
  } else {
    executeAnalysis(machineName, totalGames, bigCount, regCount, grapeCount, remainingGames, storeName, machineNumber, null, currentGraphFeatures);
  }
}

function executeAnalysis(machineName, totalGames, bigCount, regCount, grapeCount, remainingGames, storeName, machineNumber, priors, graphFeatures) {
  // 設定推定 (グラフ特徴量も渡す)
  const settingResult = AnalysisEngine.estimateSettings(machineName, totalGames, bigCount, regCount, grapeCount, priors, graphFeatures);
  if (!settingResult) { showToast('error', '⚠️ 分析エラー'); return; }

  // 期待値計算
  const evResult = AnalysisEngine.calcExpectedValue(machineName, settingResult.probabilities, remainingGames);

  // 次のボーナス予測
  const nextBonus = AnalysisEngine.predictNextBonus(machineName, settingResult.bestSetting);

  // ボーナス偏差
  const deviation = AnalysisEngine.calcDeviation(machineName, settingResult.bestSetting, totalGames, bigCount, regCount);

  currentResult = {
    machineName, totalGames, bigCount, regCount, grapeCount,
    storeName, machineNumber, remainingGames,
    settingResult, evResult, nextBonus, deviation,
    date: new Date().toISOString(),
    estimatedSetting: settingResult.bestSetting
  };

  renderResult(currentResult);

  // 結果タブへ切替
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-tab="result"]').classList.add('active');
  document.getElementById('panel-result').classList.add('active');

  showToast('success', '✅ 分析完了！');
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(tabId).style.display = 'block';
  
  // dataset.tabが無い場合にフォールバック判定
  let currentBtn;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if ((btn.dataset.tab && tabId === 'tab-' + btn.dataset.tab) || 
        (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabId))) {
      currentBtn = btn;
    }
  });
  if (currentBtn) currentBtn.classList.add('active');

  // 表示時に特定の再描画が必要なタブ
  if (tabId === 'tab-history') {
    loadHistory();
  } else if (tabId === 'tab-accuracy') {
    loadAccuracy();
  } else if (tabId === 'tab-cloud') {
    loadCloudData();
  }
}

// ===== 結果レンダリング =====
function renderResult(result) {
  document.getElementById('resultEmpty').style.display = 'none';
  document.getElementById('resultContent').style.display = 'block';

  renderSettingBars(result.settingResult);
  renderConfidence(result.settingResult.confidence);
  renderEV(result.evResult);
  renderBonusStats(result);
  renderNextBonus(result.nextBonus);
  renderSettingChart(result.settingResult);
}

function renderSettingBars(result) {
  const container = document.getElementById('settingBars');
  container.innerHTML = result.probabilities.map(p => `
    <div class="setting-bar-container">
      <div class="setting-bar-label">
        <span class="setting-num">設定${p.setting}</span>
        <span>${p.percentage}%</span>
      </div>
      <div class="setting-bar">
        <div class="setting-bar-fill s${p.setting}" style="width: ${p.percentage}%">
          ${parseFloat(p.percentage) > 8 ? p.percentage + '%' : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function renderConfidence(confidence) {
  const container = document.getElementById('confidenceMeter');
  const circumference = 2 * Math.PI * 22;
  const offset = circumference - (confidence.score / 100) * circumference;
  
  let strokeColor = '#2a9d8f';
  if (confidence.score >= 75) strokeColor = '#e63946';
  else if (confidence.score >= 50) strokeColor = '#f4a261';
  else if (confidence.score >= 30) strokeColor = '#e9c46a';

  container.innerHTML = `
    <div class="confidence-ring">
      <svg viewBox="0 0 50 50">
        <circle class="bg-circle" cx="25" cy="25" r="22"/>
        <circle class="progress-circle" cx="25" cy="25" r="22"
          stroke="${strokeColor}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"/>
      </svg>
      <div class="confidence-value" style="color:${strokeColor}">${confidence.score}%</div>
    </div>
    <div class="confidence-info">
      <div class="confidence-level" style="color:${strokeColor}">信頼度: ${confidence.level}</div>
      <div class="confidence-desc">${confidence.description}</div>
    </div>
  `;
}

function renderEV(ev) {
  const container = document.getElementById('evDisplay');
  const isPositive = ev.expectedProfit >= 0;
  const sign = isPositive ? '+' : '';
  
  container.innerHTML = `
    <div class="ev-amount ${isPositive ? 'ev-positive' : 'ev-negative'}">
      ${sign}${ev.expectedProfit.toLocaleString()}<span class="num-unit">円</span>
    </div>
    <div class="ev-label">残り${ev.remainingGames.toLocaleString()}G の期待収支</div>
    <div class="ev-sub">${sign}${ev.profitPerHour.toLocaleString()}円/時</div>
    <div style="margin-top:0.8rem;">
      <span class="badge ${getBadgeClass(ev.riskLevel.level)}">
        ${ev.riskLevel.icon} ${ev.riskLevel.level}
      </span>
    </div>
    <div style="margin-top:0.5rem; font-size:0.8rem; color:var(--color-text-dim);">
      加重平均機械割: ${ev.weightedMechRate}%
    </div>
  `;
}

function getBadgeClass(level) {
  const map = { '狙い目': 'badge-hot', '期待可': 'badge-warm', 'ボーダー': 'badge-neutral', '微マイナス': 'badge-cool', '回避推奨': 'badge-cold' };
  return map[level] || 'badge-neutral';
}

function renderBonusStats(result) {
  const container = document.getElementById('bonusStats');
  const d = result.deviation;
  
  container.innerHTML = `
    <table class="stat-table">
      <tr><th>項目</th><th>実績</th><th>確率</th></tr>
      <tr>
        <td style="color:var(--color-shu-light)">BIG</td>
        <td>${result.bigCount}回</td>
        <td>1/${d.bigRatio}</td>
      </tr>
      <tr>
        <td style="color:var(--color-matcha)">REG</td>
        <td>${result.regCount}回</td>
        <td>1/${d.regRatio}</td>
      </tr>
      <tr>
        <td style="color:var(--color-kin)">合算</td>
        <td>${result.bigCount + result.regCount}回</td>
        <td>1/${d.combinedRatio}</td>
      </tr>
    </table>
  `;
}

function renderNextBonus(nextBonus) {
  if (!nextBonus) return;
  const container = document.getElementById('nextBonusPredict');
  
  container.innerHTML = `
    <div style="text-align:center; margin-bottom:0.8rem;">
      <div class="form-label">平均ボーナス間隔</div>
      <div class="num-highlight" style="color:var(--color-kin)">${nextBonus.expectedGames}<span class="num-unit">G</span></div>
    </div>
    <div class="section-title">ゲーム数別当選確率</div>
    <div class="prob-table">
      ${nextBonus.probTable.map(pt => `
        <div class="prob-cell">
          <div class="games">${pt.games}G以内</div>
          <div class="prob">${pt.probability}%</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSettingChart(result) {
  const ctx = document.getElementById('settingChart').getContext('2d');
  
  if (settingChart) settingChart.destroy();

  const colors = ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#c0392b'];
  
  settingChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: result.probabilities.map(p => `設定${p.setting}`),
      datasets: [{
        label: '推定確率 (%)',
        data: result.probabilities.map(p => parseFloat(p.percentage)),
        backgroundColor: colors.map(c => c + '99'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: '#a8a5a0', callback: v => v + '%' },
          grid: { color: 'rgba(212,160,23,0.08)' }
        },
        x: {
          ticks: { color: '#a8a5a0' },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(26,26,46,0.95)',
          borderColor: 'rgba(212,160,23,0.3)',
          borderWidth: 1,
          titleColor: '#d4a017',
          bodyColor: '#f5f0e8',
          callbacks: { label: ctx => ctx.parsed.y.toFixed(1) + '%' }
        }
      }
    }
  });
}

// ===== データ保存 =====
async function saveCurrentResult() {
  if (!currentResult) return;
  
  try {
    await DBManager.saveRecord(currentResult);
    showToast('success', '💾 分析結果を保存しました');
    loadHistory();
    loadStoreList();
  } catch (e) {
    showToast('error', '❌ 保存エラー: ' + e.message);
  }
}

// ===== 履歴読込 =====
async function loadHistory() {
  try {
    const records = await DBManager.getAllRecords();
    const emptyEl = document.getElementById('historyEmpty');
    const contentEl = document.getElementById('historyContent');
    const tbody = document.getElementById('historyBody');

    if (!records || records.length === 0) {
      emptyEl.style.display = 'block';
      contentEl.style.display = 'none';
      return;
    }

    emptyEl.style.display = 'none';
    contentEl.style.display = 'block';

    // 新しい順に並べる
    const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = sorted.map(r => {
      const d = new Date(r.date);
      const dateStr = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
      const evStr = r.evResult ? (r.evResult.expectedProfit >= 0 ? '+' : '') + r.evResult.expectedProfit.toLocaleString() + '円' : '---';
      const evClass = r.evResult && r.evResult.expectedProfit >= 0 ? 'ev-positive' : 'ev-negative';
      
      return `
        <tr>
          <td class="history-date">${dateStr}</td>
          <td>${r.storeName || '---'}</td>
          <td>${r.machineName}</td>
          <td>${r.machineNumber || '---'}</td>
          <td>${r.totalGames.toLocaleString()}</td>
          <td style="color:var(--color-shu-light)">${r.bigCount}</td>
          <td style="color:var(--color-matcha)">${r.regCount}</td>
          <td><span class="badge badge-warm">設定${r.estimatedSetting}</span></td>
          <td class="${evClass}">${evStr}</td>
          <td><button class="btn-icon" onclick="deleteRecord(${r.id})" title="削除">🗑️</button></td>
        </tr>
      `;
    }).join('');

    // 店舗分析も更新
    updateStoreAnalysis(records);
  } catch (e) {
    console.error('履歴読込エラー:', e);
  }
}

async function deleteRecord(id) {
  try {
    await DBManager.deleteRecord(id);
    showToast('info', '🗑️ 記録を削除しました');
    loadHistory();
  } catch (e) {
    showToast('error', '❌ 削除エラー');
  }
}

// ===== 店舗分析 =====
async function loadStoreList() {
  try {
    const records = await DBManager.getAllRecords();
    const storeNames = [...new Set(records.map(r => r.storeName).filter(Boolean))];
    
    // 入力欄のdatalist
    const datalist = document.getElementById('storeList');
    datalist.innerHTML = storeNames.map(s => `<option value="${s}">`).join('');

    // 店舗セレクト
    const select = document.getElementById('storeSelect');
    const current = select.value;
    select.innerHTML = '<option value="">すべての店舗</option>' +
      storeNames.map(s => `<option value="${s}">${s}</option>`).join('');
    select.value = current;
  } catch (e) {
    console.error('店舗リスト読込エラー:', e);
  }
}

function updateStoreAnalysis(records) {
  const emptyEl = document.getElementById('storeEmpty');
  const contentEl = document.getElementById('storeContent');

  if (!records || records.length === 0) {
    emptyEl.style.display = 'block';
    contentEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  contentEl.style.display = 'block';

  renderStoreAnalysis('');
}

async function renderStoreAnalysis(storeName) {
  try {
    let records;
    if (storeName) {
      records = await DBManager.getRecordsByStore(storeName);
    } else {
      records = await DBManager.getAllRecords();
    }
    if (!records || records.length === 0) return;

    const analysis = StoreAnalyzer.analyzeStorePattern(records);
    if (!analysis) return;

    // 曜日チャート
    renderDayChart(analysis.byDayOfWeek);

    // 台番号ランキング
    renderMachineRanking(analysis.byMachineNumber);

    // おすすめ
    renderRecommendations(analysis.recommendations);

    // 傾向サマリー
    renderTrendSummary(analysis.overallTrend);
  } catch (e) {
    console.error('店舗分析エラー:', e);
  }
}

function renderDayChart(dayData) {
  const ctx = document.getElementById('dayChart').getContext('2d');
  if (dayChart) dayChart.destroy();

  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const rates = days.map(d => parseFloat(dayData[d].highSettingRate));

  dayChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days.map(d => d + '曜'),
      datasets: [{
        label: '高設定率 (%)',
        data: rates,
        backgroundColor: days.map((_, i) => {
          const r = rates[i];
          if (r >= 40) return 'rgba(192,57,43,0.7)';
          if (r >= 25) return 'rgba(244,162,97,0.7)';
          return 'rgba(42,157,143,0.5)';
        }),
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#a8a5a0', callback: v => v + '%' },
          grid: { color: 'rgba(212,160,23,0.08)' }
        },
        x: { ticks: { color: '#a8a5a0' }, grid: { display: false } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderMachineRanking(machines) {
  const container = document.getElementById('machineRanking');
  if (!machines || machines.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:1rem;"><p>台番号データがありません</p></div>';
    return;
  }

  container.innerHTML = `
    <table class="stat-table">
      <tr><th>台番号</th><th>分析回数</th><th>高設定率</th><th>平均設定</th></tr>
      ${machines.slice(0, 10).map(m => `
        <tr>
          <td>${m.machineNumber}</td>
          <td>${m.count}回</td>
          <td><span class="badge ${parseFloat(m.highSettingRate) >= 40 ? 'badge-hot' : parseFloat(m.highSettingRate) >= 20 ? 'badge-warm' : 'badge-cool'}">${m.highSettingRate}%</span></td>
          <td>${m.avgSetting}</td>
        </tr>
      `).join('')}
    </table>
  `;
}

function renderRecommendations(recs) {
  const container = document.getElementById('recommendations');
  if (!recs || recs.length === 0) {
    container.innerHTML = '<div style="color:var(--color-text-dim);font-size:0.85rem;">データを蓄積すると、おすすめ情報が表示されます</div>';
    return;
  }

  container.innerHTML = recs.map(r => `
    <div class="recommendation">
      <div class="rec-icon">${r.icon}</div>
      <div class="rec-text">${r.text}</div>
    </div>
  `).join('');
}

function renderTrendSummary(trend) {
  const container = document.getElementById('trendSummary');
  const trendIcon = trend.trend === '上昇傾向' ? '📈' : trend.trend === '下降傾向' ? '📉' : '➡️';
  
  container.innerHTML = `
    <div class="grid-3">
      <div style="text-align:center;">
        <div class="form-label">傾向</div>
        <div style="font-size:1.5rem;">${trendIcon}</div>
        <div style="font-size:0.9rem; font-weight:700;">${trend.trend}</div>
      </div>
      <div style="text-align:center;">
        <div class="form-label">直近の高設定率</div>
        <div class="num-highlight" style="color:var(--color-shu-light)">${trend.recentHighRate}<span class="num-unit">%</span></div>
      </div>
      <div style="text-align:center;">
        <div class="form-label">全体の高設定率</div>
        <div class="num-highlight" style="color:var(--color-kin)">${trend.overallHighRate}<span class="num-unit">%</span></div>
      </div>
    </div>
  `;
}

// ===== 的中率 =====
async function loadAccuracy() {
  try {
    const records = await DBManager.getAllRecords();
    if (!records || records.length === 0) return;

    const statsContainer = document.getElementById('accuracyStats');
    const cumulContainer = document.getElementById('cumulativeStats');

    // 簡易的中率: 設定4以上推定 かつ 実際のBIG/REG比率が良い場合を「的中」
    let totalPredictions = records.length;
    let highSettingPreds = records.filter(r => r.estimatedSetting >= 4).length;
    let positiveResults = records.filter(r => r.evResult && r.evResult.expectedProfit > 0).length;

    cumulContainer.innerHTML = `
      <div style="text-align:center;">
        <div class="form-label">総分析回数</div>
        <div class="num-highlight" style="color:var(--color-kin)">${totalPredictions}</div>
      </div>
      <div style="text-align:center;">
        <div class="form-label">高設定推定</div>
        <div class="num-highlight" style="color:var(--color-shu-light)">${highSettingPreds}</div>
      </div>
      <div style="text-align:center;">
        <div class="form-label">プラス期待</div>
        <div class="num-highlight" style="color:var(--color-matcha)">${positiveResults}</div>
      </div>
      <div style="text-align:center;">
        <div class="form-label">高設定率</div>
        <div class="num-highlight" style="color:var(--color-fuji)">${totalPredictions > 0 ? ((highSettingPreds/totalPredictions)*100).toFixed(1) : '0'}<span class="num-unit">%</span></div>
      </div>
    `;

    // 精度チャート
    renderAccuracyChart(records);
  } catch (e) {
    console.error('的中率読込エラー:', e);
  }
}

// ===== クラウド同期データ（みんなのデータ）表示 =====
async function loadCloudData() {
  const container = document.getElementById('cloudListContainer');
  const warning = document.getElementById('cloudDataWarning');
  const summaryArea = document.getElementById('cloudSummaryArea');
  
  if (typeof CloudSync === 'undefined' || !CloudSync.isActive) {
    warning.style.display = 'block';
    summaryArea.style.display = 'none';
    container.innerHTML = '';
    return;
  }
  
  warning.style.display = 'none';
  summaryArea.style.display = 'grid';
  container.innerHTML = '<div style="text-align:center; padding:2rem;">データを読込中...</div>';

  const records = await CloudSync.getPublicRecords();
  
  if (!records || records.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:2rem;">まだ共有データがありません。</div>';
    document.getElementById('cloudTotalRecords').innerText = '0件';
    document.getElementById('cloudHighSettingRatio').innerText = '--%';
    return;
  }

  document.getElementById('cloudTotalRecords').innerText = `${records.length}件`;
  
  let highSettingCount = 0;
  let html = '';
  
  records.forEach(r => {
    if (r.bestSetting >= 5) highSettingCount++;
    
    // 時刻のフォーマット
    let timeStr = "不明";
    if (r.timestamp && r.timestamp.toDate) {
      const d = r.timestamp.toDate();
      timeStr = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
    }

    const isHigh = r.bestSetting >= 5;
    const badgeColor = isHigh ? 'var(--color-primary)' : (r.bestSetting >= 3 ? 'var(--color-secondary)' : '#666');

    html += `
      <div class="card" style="margin-bottom:10px; padding:1rem; border-left: 4px solid ${badgeColor};">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-weight:bold; font-size:1.1rem;">
            ${r.machineName} <span style="font-size:0.8rem; color:var(--color-text-dim);">@${r.storeName} (${r.machineNumber}番台)</span>
          </div>
          <div style="font-size:0.8rem; color:var(--color-text-dim);">${timeStr}</div>
        </div>
        <div class="grid-2" style="margin-top:0.5rem; gap:10px;">
          <div>
            <div style="font-size:0.8rem; color:var(--color-text-dim);">推測設定</div>
            <div style="font-size:1.3rem; color:${badgeColor}; font-weight:bold;">
              設定${r.bestSetting} <span style="font-size:0.8rem;">(高設定期待度 ${r.highSettingProb}%)</span>
            </div>
          </div>
          <div>
            <div style="font-size:0.8rem; color:var(--color-text-dim);">回転数 / 信頼度</div>
            <div style="font-size:1.1rem;">${r.totalGames}G / ${r.confidenceLevel}</div>
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  const highRatio = ((highSettingCount / records.length) * 100).toFixed(1);
  document.getElementById('cloudHighSettingRatio').innerText = `${highRatio}%`;
}

function renderAccuracyChart(records) {
  const ctx = document.getElementById('accuracyChart').getContext('2d');
  if (accuracyChart) accuracyChart.destroy();

  const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // 直近30件の推定設定の推移
  const recent = sorted.slice(-30);
  
  accuracyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: recent.map((_, i) => `#${i + 1}`),
      datasets: [{
        label: '推定設定',
        data: recent.map(r => r.estimatedSetting),
        borderColor: '#d4a017',
        backgroundColor: 'rgba(212,160,23,0.1)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: recent.map(r => r.estimatedSetting >= 4 ? '#e63946' : '#2a9d8f'),
        pointRadius: 5,
        pointBorderWidth: 2,
        pointBorderColor: '#1a1a2e'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 1, max: 6,
          ticks: { stepSize: 1, color: '#a8a5a0', callback: v => '設定' + v },
          grid: { color: 'rgba(212,160,23,0.08)' }
        },
        x: {
          ticks: { color: '#a8a5a0' },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(26,26,46,0.95)',
          borderColor: 'rgba(212,160,23,0.3)',
          borderWidth: 1
        }
      }
    }
  });
}

// ===== エクスポート/インポート =====
async function exportData() {
  try {
    const json = await DBManager.exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `juggler_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', '📥 データをエクスポートしました');
  } catch (e) {
    showToast('error', '❌ エクスポートエラー');
  }
}

async function importData() {
  const textarea = document.getElementById('importData');
  const json = textarea.value.trim();
  if (!json) { showToast('error', '⚠️ データを入力してください'); return; }

  try {
    const count = await DBManager.importData(json);
    document.getElementById('importModal').classList.remove('active');
    textarea.value = '';
    showToast('success', `📤 ${count}件のデータをインポートしました`);
    loadHistory();
    loadStoreList();
    loadAccuracy();
  } catch (e) {
    showToast('error', '❌ インポートエラー: ' + e.message);
  }
}

// ===== トースト通知 =====
function showToast(type, message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
