// 🌪️【KUINA AI RACING ANALYTICS - 完全統合型オールインワン app.js】

var VENUE_MAP = {
    "札幌": "01", "函館": "02", "福島": "03", "新潟": "04",
    "東京": "05", "中山": "06", "中京": "07", "京都": "08",
    "阪神": "09", "小倉": "10",
    "01": "札幌", "02": "函館", "03": "福島", "04": "新潟",
    "05": "東京", "06": "中山", "07": "中京", "08": "京都",
    "09": "阪神", "10": "小倉", 
    "1": "札幌", "2": "函館", "3": "福島", "4": "新潟",
    "5": "東京", "6": "中山", "7": "中京", "8": "京都", "9": "阪神",
    "東": "東京", "中": "中山", "阪": "阪神", "京": "京都", "福": "福島", "新": "新潟", "札": "札幌", "函": "函館", "小": "小倉"
};

var currentHorsesData = [];
var currentSortMode = 'num';
var selectedBetType = 'umaren';
var selectedBetHorses = [];

function resolveVenueInfo(v) {
    if (!v) return { name: "", code: "", short: "" };
    var raw = v.toString().replace(/競馬場/g, "").replace(/\s+/g, "").trim();
    var code = VENUE_MAP[raw] && !isNaN(raw) ? (raw.length === 1 ? "0" + raw : raw) : (VENUE_MAP[raw] || "");
    var name = VENUE_MAP[raw] && isNaN(raw) ? raw : (VENUE_MAP[code] || raw);
    var short = name ? name.substring(0, 1) : "";
    return { name: name, code: code, short: short };
}

function normalizeDate(d) {
    if (!d) return "";
    var nums = d.toString().match(/\d+/g);
    if (!nums) return "";
    var clean = nums.join("");
    if (clean.length === 6) clean = "20" + clean;
    return clean;
}

function normalizeRaceNum(r) {
    if (!r) return 0;
    var m = r.toString().match(/\d+/);
    return m ? parseInt(m, 10) : 0;
}

// --------------------------------------------------
// 1. UIコンテナの自動挿入 (DOM Injector)
// --------------------------------------------------
function injectKuinaWidgets() {
    if (typeof document === 'undefined') return;

    var container = document.querySelector('.container') || document.body;
    if (!container) return;

    // 1. トラックバイアス & 天気・馬場設定パネル
    if (!document.getElementById('kuina-bias-panel')) {
        var biasDiv = document.createElement('div');
        biasDiv.id = 'kuina-bias-panel';
        biasDiv.className = 'kuina-card-panel';
        biasDiv.innerHTML = `
            <div class="panel-header">🌤️ 天気・馬場設定 & トラックバイアス診断</div>
            <div class="bias-controls">
                <div class="control-group">
                    <label>コース種別:</label>
                    <select id="kuina-track-type" onchange="updateTrackBiasAndPace()">
                        <option value="turf">🌿 芝コース</option>
                        <option value="dirt">🏜️ ダートコース</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>天気・馬場状態:</label>
                    <select id="kuina-track-condition" onchange="updateTrackBiasAndPace()">
                        <option value="good">☀️ 晴 / 良馬場 (パンパンの高速馬場)</option>
                        <option value="yielding">⛅ 曇 / 稍重 (標準〜ややタフ)</option>
                        <option value="soft">🌧️ 小雨 / 重馬場 (タフ・水分含む)</option>
                        <option value="bad">☔ 大雨 / 不良馬場 (荒れ馬場・泥悪化)</option>
                    </select>
                </div>
            </div>
            <div id="kuina-bias-result" class="bias-result-box">
                <span class="bias-tag">【トラックバイアス診断】</span>
                <span id="kuina-bias-text">【芝・良】内枠・先行有利。高速馬場でイン突き狙い目がハマる展開。</span>
            </div>
        `;
        
        var selectorBox = document.querySelector('.selector-box') || container.firstChild;
        if (selectorBox && selectorBox.parentNode) {
            selectorBox.parentNode.insertBefore(biasDiv, selectorBox.nextSibling);
        } else {
            container.appendChild(biasDiv);
        }
    }

    // 2. 展開予想 & 隊列マップパネル
    if (!document.getElementById('kuina-pace-panel')) {
        var paceDiv = document.createElement('div');
        paceDiv.id = 'kuina-pace-panel';
        paceDiv.className = 'kuina-card-panel';
        paceDiv.innerHTML = `
            <div class="panel-header">⚡ 展開予想 & 想定隊列マップ</div>
            <div class="pace-summary">
                <span class="pace-badge" id="kuina-pace-badge">ミドルペース (平均展開)</span>
                <span id="kuina-pace-desc">実力通りの決着になりやすい標準展開です。</span>
            </div>
            <div class="position-map-grid" id="kuina-position-map">
                <div class="pos-col"><div class="pos-title">🏃 逃げ</div><div class="pos-horses" id="pos-escape">-</div></div>
                <div class="pos-col"><div class="pos-title">🐴 先行</div><div class="pos-horses" id="pos-ahead">-</div></div>
                <div class="pos-col"><div class="pos-title">🐎 差し</div><div class="pos-horses" id="pos-insert">-</div></div>
                <div class="pos-col"><div class="pos-title">🚀 追込</div><div class="pos-horses" id="pos-drive">-</div></div>
            </div>
        `;
        var biasPanel = document.getElementById('kuina-bias-panel');
        biasPanel.parentNode.insertBefore(paceDiv, biasPanel.nextSibling);
    }

    // 3. AIおすすめ買い目 & 馬券購入金額シミュレーター
    if (!document.getElementById('kuina-bet-panel')) {
        var betDiv = document.createElement('div');
        betDiv.id = 'kuina-bet-panel';
        betDiv.className = 'kuina-card-panel gold-border';
        betDiv.innerHTML = `
            <div class="panel-header gold-text">🎯 AIおすすめ買い目 & 馬券資金配分シミュレーター</div>
            
            <div id="kuina-ai-recommendation" class="ai-rec-box">
                <div class="rec-title">🤖 KUINA AI推奨買い目</div>
                <div id="kuina-rec-content" class="rec-content">レースデータを読み込むとAIが最適な買い目を算出します</div>
            </div>

            <div class="sim-section">
                <div class="sim-title">💰 馬券シミュレーション（複数選択＆資金配分）</div>
                <div class="sim-controls">
                    <div class="control-group">
                        <label>式別:</label>
                        <select id="kuina-bet-type" onchange="onBetTypeChange()">
                            <option value="tansho">単勝 (1頭選択)</option>
                            <option value="fukusho">複勝 (1頭選択)</option>
                            <option value="umaren" selected>馬連 (2頭以上流し/ボックス)</option>
                            <option value="umatan">馬単 (2頭以上流し/ボックス)</option>
                            <option value="sanrenpuku">3連複 (3頭以上流し/ボックス)</option>
                            <option value="sanrentan">3連単 (3頭以上フォーメーション)</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label>総投資予算 (円):</label>
                        <input type="number" id="kuina-total-budget" value="10000" step="100" min="100" oninput="calculateBetSimulation()">
                    </div>
                </div>

                <div class="sim-horse-selector">
                    <label>対象馬を選択 (複数タップ可能):</label>
                    <div id="kuina-horse-checkboxes" class="horse-check-grid">
                        <span class="placeholder-text">レース検索完了後に馬を選択できます</span>
                    </div>
                </div>

                <div id="kuina-sim-result" class="sim-result-box">
                    <div class="sim-result-summary">
                        <span>購入点数: <b id="sim-points">0</b>点</span>
                        <span>1点予算: <b id="sim-per-point">0</b>円</span>
                        <span>合成オッズ: <b id="sim-combo-odds">0.0</b>倍</span>
                        <span>想定払戻金: <b id="sim-expected-return">0</b>円</span>
                    </div>
                    <div id="sim-breakdown" class="sim-breakdown-list"></div>
                </div>
            </div>
        `;
        var pacePanel = document.getElementById('kuina-pace-panel');
        pacePanel.parentNode.insertBefore(betDiv, pacePanel.nextSibling);
    }
}

// --------------------------------------------------
// 2. トラックバイアス & 展開予想の連動更新
// --------------------------------------------------
function updateTrackBiasAndPace() {
    var tTypeEl = document.getElementById('kuina-track-type');
    var tCondEl = document.getElementById('kuina-track-condition');
    if (!tTypeEl || !tCondEl) return;

    var trackType = tTypeEl.value; // turf / dirt
    var trackCond = tCondEl.value; // good / yielding / soft / bad

    var biasText = "";
    if (trackType === 'turf') {
        if (trackCond === 'good') biasText = "【芝・良】高速馬場。内枠＆先行馬が圧倒有利。直線イン突きがハマる展開。";
        else if (trackCond === 'yielding') biasText = "【芝・稍重】ややタフな時計。差し馬が届く標準的な差し・追い込み展開。";
        else if (trackCond === 'soft') biasText = "【芝・重】時計が掛かるタフ馬場。パワー型の内・外差し馬に警戒。";
        else biasText = "【芝・不良】水が浮く荒れ馬場。内ラチ荒れにつき、外差し・外伸び馬が突っ込む高配当波乱傾向！";
    } else {
        if (trackCond === 'good') biasText = "【ダート・良】パサパサの乾燥砂。キックバックを嫌う先行馬圧倒有利！前残り警戒。";
        else if (trackCond === 'yielding') biasText = "【ダート・稍重】締まった砂で時計スピード向上。逃げ・先行重視。";
        else if (trackCond === 'soft') biasText = "【ダート・重】高速水浮き馬場。前に行った馬がそのまま止まらない高速レース！";
        else biasText = "【ダート・不良】超高速泥馬場。逃げ・1番手追走馬がそのまま押し切る展開。";
    }

    var biasTextEl = document.getElementById('kuina-bias-text');
    if (biasTextEl) biasTextEl.innerText = biasText;

    // 展開＆隊列の更新
    if (currentHorsesData && currentHorsesData.length > 0) {
        updatePaceAndPositions(currentHorsesData, trackType, trackCond);
    }
}

function updatePaceAndPositions(horses, trackType, trackCond) {
    var total = horses.length;
    var paceBadge = document.getElementById('kuina-pace-badge');
    var paceDesc = document.getElementById('kuina-pace-desc');

    if (total >= 16) {
        if (paceBadge) { paceBadge.innerText = "⚡ ハイペース (前崩れ・差し有利)"; paceBadge.className = "pace-badge pace-high"; }
        if (paceDesc) paceDesc.innerText = "多頭数でハナ争いが激化。先行勢がバテて差し・追込馬の強襲に注目！";
    } else if (total <= 11) {
        if (paceBadge) { paceBadge.innerText = "🐢 スローペース (前残り濃厚)"; paceBadge.className = "pace-badge pace-slow"; }
        if (paceDesc) paceDesc.innerText = "少頭数でペースが落ち着く展開。逃げ・先行馬が楽に押し切りやすい！";
    } else {
        if (paceBadge) { paceBadge.innerText = "⚖️ ミドルペース (平均展開)"; paceBadge.className = "pace-badge pace-mid"; }
        if (paceDesc) paceDesc.innerText = "平均ペースでの推移。実力通りの軸馬が安定して力を発揮します。";
    }

    // 脚質の振り分け (馬番やオッズ等から擬似分類)
    var esc = [], ahead = [], ins = [], drive = [];
    for (var i = 0; i < horses.length; i++) {
        var h = horses[i];
        var num = h.num;
        var tag = `<b>${num}. ${h.name}</b>`;
        if (i === 0 || num === 1 || num === 7) esc.push(tag);
        else if (i % 3 === 1) ahead.push(tag);
        else if (i % 3 === 2) ins.push(tag);
        else drive.push(tag);
    }

    var elEsc = document.getElementById('pos-escape'); if (elEsc) elEsc.innerHTML = esc.join("<br>") || "-";
    var elAhead = document.getElementById('pos-ahead'); if (elAhead) elAhead.innerHTML = ahead.join("<br>") || "-";
    var elIns = document.getElementById('pos-insert'); if (elIns) elIns.innerHTML = ins.join("<br>") || "-";
    var elDrive = document.getElementById('pos-drive'); if (elDrive) elDrive.innerHTML = drive.join("<br>") || "-";
}

// --------------------------------------------------
// 3. AIおすすめ買い目 ＆ 馬券シミュレータ
// --------------------------------------------------
function generateAiRecommendation(horses) {
    if (!horses || horses.length < 3) return;

    var sorted = horses.slice().sort(function(a, b) {
        return (a.odds > 0 ? a.odds : 999) - (b.odds > 0 ? b.odds : 999);
    });

    var honmei = sorted[0];
    var taikou = sorted[1];
    var tanana = sorted[2];
    var ana = sorted.length > 5 ? sorted[4] : sorted[3];

    var html = `
        <div class="rec-row"><b>🎯 本命勝負馬連:</b> ${honmei.num} - ${taikou.num} (${honmei.name} - ${taikou.name})</div>
        <div class="rec-row"><b>🔥 本命-対抗-単穴 3連複1点:</b> ${honmei.num} - ${taikou.num} - ${tanana.num}</div>
        <div class="rec-row"><b>🌟 高配当穴流し (馬連流し):</b> 軸: ${honmei.num} ➔ 相手: ${taikou.num}, ${tanana.num}, ${ana.num}</div>
    `;

    var recEl = document.getElementById('kuina-rec-content');
    if (recEl) recEl.innerHTML = html;

    // チェックボックスの更新
    renderHorseCheckboxes(horses);
}

function renderHorseCheckboxes(horses) {
    var box = document.getElementById('kuina-horse-checkboxes');
    if (!box) return;

    var html = "";
    for (var i = 0; i < horses.length; i++) {
        var h = horses[i];
        var checked = (i < 3) ? "checked" : "";
        html += `
            <label class="horse-chk-item">
                <input type="checkbox" value="${h.num}" data-odds="${h.odds}" ${checked} onchange="calculateBetSimulation()">
                <span>${h.num}.${h.name} (${h.odds > 0 ? h.odds + '倍' : '未確定'})</span>
            </label>
        `;
    }
    box.innerHTML = html;
    calculateBetSimulation();
}

function onBetTypeChange() {
    calculateBetSimulation();
}

function calculateBetSimulation() {
    var typeEl = document.getElementById('kuina-bet-type');
    var budgetEl = document.getElementById('kuina-total-budget');
    if (!typeEl || !budgetEl) return;

    var bType = typeEl.value;
    var budget = parseInt(budgetEl.value, 10) || 10000;

    var chks = document.querySelectorAll('#kuina-horse-checkboxes input[type="checkbox"]:checked');
    var selected = [];
    chks.forEach(function(c) {
        selected.push({
            num: parseInt(c.value, 10),
            odds: parseFloat(c.getAttribute('data-odds')) || 10.0
        });
    });

    var pts = 0;
    var combinations = [];

    if (bType === 'tansho' || bType === 'fukusho') {
        pts = selected.length;
        for (var i = 0; i < selected.length; i++) {
            combinations.push({ name: selected[i].num + "番", odds: selected[i].odds });
        }
    } else if (bType === 'umaren' || bType === 'umatan') {
        if (selected.length >= 2) {
            for (var i = 0; i < selected.length; i++) {
                for (var j = i + 1; j < selected.length; j++) {
                    var combOdds = (selected[i].odds * selected[j].odds * 0.25).toFixed(1);
                    if (combOdds < 2.0) combOdds = 2.0;
                    combinations.push({ name: selected[i].num + " - " + selected[j].num, odds: parseFloat(combOdds) });
                }
            }
            pts = combinations.length;
        }
    } else if (bType === 'sanrenpuku' || bType === 'sanrentan') {
        if (selected.length >= 3) {
            for (var i = 0; i < selected.length; i++) {
                for (var j = i + 1; j < selected.length; j++) {
                    for (var k = j + 1; k < selected.length; k++) {
                        var combOdds = (selected[i].odds * selected[j].odds * selected[k].odds * 0.1).toFixed(1);
                        if (combOdds < 5.0) combOdds = 5.0;
                        combinations.push({ name: selected[i].num + " - " + selected[j].num + " - " + selected[k].num, odds: parseFloat(combOdds) });
                    }
                }
            }
            pts = combinations.length;
        }
    }

    var perPoint = pts > 0 ? Math.floor(budget / pts / 100) * 100 : 0;
    if (perPoint < 100 && pts > 0) perPoint = 100;

    var totalCost = perPoint * pts;

    // 均等オッズ/合成オッズ計算
    var invOddsSum = 0;
    for (var m = 0; m < combinations.length; m++) {
        if (combinations[m].odds > 0) invOddsSum += (1.0 / combinations[m].odds);
    }
    var comboOdds = invOddsSum > 0 ? (1.0 / invOddsSum).toFixed(1) : 0.0;
    var expectedReturn = Math.floor(totalCost * comboOdds);

    // UI更新
    var pEl = document.getElementById('sim-points'); if (pEl) pEl.innerText = pts;
    var ppEl = document.getElementById('sim-per-point'); if (ppEl) ppEl.innerText = perPoint.toLocaleString();
    var coEl = document.getElementById('sim-combo-odds'); if (coEl) coEl.innerText = comboOdds;
    var erEl = document.getElementById('sim-expected-return'); if (erEl) erEl.innerText = expectedReturn.toLocaleString();

    var bdList = document.getElementById('sim-breakdown');
    if (bdList) {
        if (combinations.length === 0) {
            bdList.innerHTML = '<span class="placeholder-text">対象の馬を必要数選択してください</span>';
        } else {
            var bdHtml = "";
            for (var n = 0; n < combinations.length; n++) {
                var item = combinations[n];
                var estPay = Math.floor(perPoint * item.odds);
                bdHtml += `
                    <div class="sim-item-row">
                        <span>🎯 買い目: <b>${item.name}</b></span>
                        <span>オッズ: <b>${item.odds}倍</b></span>
                        <span>配分: <b>${perPoint.toLocaleString()}円</b> (払戻金: ${estPay.toLocaleString()}円)</span>
                    </div>
                `;
            }
            bdList.innerHTML = bdHtml;
        }
    }
}

// --------------------------------------------------
// 4. データ読み込み ＆ 表描画
// --------------------------------------------------
function parseJraCsvRaceData(csvText, targetRaceNum) {
    var lines = csvText.split(/\r?\n/);
    var allHorses = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var cols = line.split(',');
        if (cols.length < 13) continue;

        var horseName = cols[7] ? cols[7].replace(/"/g, '').trim() : "";
        if (!horseName || !/^[\u30A0-\u30FFー・]{2,9}$/.test(horseName)) continue;

        var waku = parseInt(cols[0], 10) || 1;
        var num = parseInt(cols[2], 10) || 1;
        var sex = cols[9] ? cols[9].replace(/"/g, '').trim() : "牡";
        var age = cols[10] ? cols[10].replace(/"/g, '').trim() : "3";
        var jockey = cols[12] ? cols[12].replace(/"/g, '').trim() : "不明";
        var kinryo = cols[13] ? cols[13].replace(/"/g, '').trim() : "56";
        var odds = parseFloat(cols[15]) || 0.0;
        var stable = cols[16] ? cols[16].replace(/"/g, '').trim() : "(美)";
        var trainer = cols[17] ? cols[17].replace(/"/g, '').trim() : "調教師";

        allHorses.push({
            waku: waku, num: num, name: horseName, sex: sex, age: age,
            jockey: jockey, kinryo: kinryo, odds: odds, stable: stable, trainer: trainer
        });
    }

    var raceBlocks = [];
    var currentBlock = [];
    for (var j = 0; j < allHorses.length; j++) {
        var h = allHorses[j];
        if (h.num === 1 && currentBlock.length > 0) {
            raceBlocks.push(currentBlock);
            currentBlock = [];
        }
        currentBlock.push(h);
    }
    if (currentBlock.length > 0) raceBlocks.push(currentBlock);

    var targetBlockIndex = 0;
    if (targetRaceNum >= 1 && targetRaceNum <= 12) {
        if (raceBlocks.length >= 24) targetBlockIndex = targetRaceNum - 1;
        else if (raceBlocks.length >= targetRaceNum) targetBlockIndex = targetRaceNum - 1;
    }

    return raceBlocks[targetBlockIndex] || [];
}

function loadAndUnzipJraDatabase() {
    injectKuinaWidgets();

    var rawDate = findDomValue(["sim-date", "sim_date", "date", "race-date", "race_date"]);
    var rawVenue = findDomValue(["sim-venue", "sim_venue", "venue", "race-venue", "race_venue"]);
    var rawRace = findDomValue(["sim-race", "sim_race", "race", "race-num", "race_num"]);
    var btn = findDomElement(["predict-btn", "predict_btn", "btn-predict", "submit-btn"]);
    var tbody = findDomElement(["predict-tbody", "predict_tbody", "result-tbody", "tbody"]);

    var cG = normalizeDate(rawDate) || "20261003";
    var tVenue = resolveVenueInfo(rawVenue);
    var cR = normalizeRaceNum(rawRace) || 11;

    if (btn) btn.innerText = "⚡ KUINA AI 分析中...";

    var csvFileName = "DG" + cG.substring(2) + ".CSV";

    fetch(csvFileName, { method: "GET", cache: "no-cache" })
        .then(function(res) {
            if (!res.ok) throw new Error("CSV取得失敗: " + csvFileName);
            return res.arrayBuffer();
        })
        .then(function(buffer) {
            var decoder = new TextDecoder("shift_jis");
            var text = decoder.decode(buffer);

            var horses = parseJraCsvRaceData(text, cR);
            if (!horses || horses.length === 0) {
                alert("❌ 該当レースのデータが見つかりませんでした");
                if (btn) btn.innerText = "🧠 レースデータを解析・可視化";
                return;
            }

            currentHorsesData = horses;

            // AI印の算出
            var sortedByOdds = horses.slice().sort(function(a, b) {
                return (a.odds > 0 ? a.odds : 999) - (b.odds > 0 ? b.odds : 999);
            });

            for (var k = 0; k < horses.length; k++) {
                var hObj = horses[k];
                var rank = sortedByOdds.indexOf(hObj);
                hObj.popRank = rank + 1;

                if (rank === 0) { hObj.aiMark = "◎ 本命"; hObj.aiClass = "ai-honmei"; }
                else if (rank === 1) { hObj.aiMark = "○ 対抗"; hObj.aiClass = "ai-taikou"; }
                else if (rank === 2) { hObj.aiMark = "▲ 単穴"; hObj.aiClass = "ai-tanana"; }
                else if (hObj.odds >= 15.0 && hObj.odds <= 60.0 && rank < 7) { hObj.aiMark = "☆ 穴馬"; hObj.aiClass = "ai-ana"; }
                else if (rank === 3 || rank === 4) { hObj.aiMark = "△ 連下"; hObj.aiClass = "ai-renka"; }
                else { hObj.aiMark = "-"; hObj.aiClass = "ai-none"; }
            }

            renderHorsesTable(horses, tbody);
            updateTrackBiasAndPace();
            generateAiRecommendation(horses);

            if (btn) btn.innerText = "🧠 レースデータを解析・可視化";
        })
        .catch(function(err) {
            alert("❌ データ読込エラー: " + err.message);
            if (btn) btn.innerText = "🧠 レースデータを解析・可視化";
        });
}

function renderHorsesTable(horses, tbody) {
    if (!tbody) tbody = findDomElement(["predict-tbody", "predict_tbody", "result-tbody", "tbody"]);
    if (!tbody) return;

    var list = horses.slice();
    if (currentSortMode === 'odds') {
        list.sort(function(a, b) { return (a.odds > 0 ? a.odds : 999) - (b.odds > 0 ? b.odds : 999); });
    } else if (currentSortMode === 'ai') {
        var markOrder = { '◎ 本命': 1, '○ 対抗': 2, '▲ 単穴': 3, '☆ 穴馬': 4, '△ 連下': 5, '-': 9 };
        list.sort(function(a, b) { return (markOrder[a.aiMark] || 9) - (markOrder[b.aiMark] || 9); });
    } else {
        list.sort(function(a, b) { return a.num - b.num; });
    }

    var html = "";
    for (var j = 0; j < list.length; j++) {
        var h = list[j];
        var oddsDisp = h.odds > 0 ? h.odds + "倍" : "未確定";
        var popDisp = h.popRank ? "(" + h.popRank + "人気)" : "";

        html += `
            <tr onclick="toggleHorseDetail(${h.num})" style="cursor:pointer;">
                <td><span class="waku-badge waku-${h.waku}">${h.waku}枠${h.num}番</span></td>
                <td><span class="ai-badge ${h.aiClass}">${h.aiMark}</span></td>
                <td><span class="horse-name">${h.name}</span><span class="sub-info">(${h.sex}${h.age})</span></td>
                <td><span class="jockey-name">${h.jockey}</span><span class="sub-info">(${h.kinryo}kg)</span></td>
                <td><span class="sub-info">${h.stable} ${h.trainer}</span></td>
                <td><span class="odds-val">${oddsDisp}</span><br><span class="pop-rank">${popDisp}</span></td>
            </tr>
            <tr id="detail-row-${h.num}" class="detail-drawer-row" style="display:none;">
                <td colspan="6">
                    <div class="drawer-card">
                        <div class="drawer-title">🐴 ${h.num}番 ${h.name} 詳細分析カード</div>
                        <div class="drawer-grid">
                            <div>性齢・斤量: <b>${h.sex}${h.age} / ${h.kinryo}kg</b></div>
                            <div>騎手・厩舎: <b>${h.jockey} (${h.stable}${h.trainer})</b></div>
                            <div>単勝オッズ: <b>${oddsDisp} ${popDisp}</b></div>
                            <div>AI判定: <b>${h.aiMark}</b></div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
}

function toggleHorseDetail(num) {
    var row = document.getElementById("detail-row-" + num);
    if (!row) return;
    row.style.display = (row.style.display === "none" || !row.style.display) ? "table-row" : "none";
}

function setSortMode(mode) {
    currentSortMode = mode;
    if (currentHorsesData && currentHorsesData.length > 0) {
        renderHorsesTable(currentHorsesData);
    }
}

// ページロード時に自動初期化注入
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
        injectKuinaWidgets();
    });
    // 即時実行
    setTimeout(injectKuinaWidgets, 300);
}
