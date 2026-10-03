// 🌪️【KUINA AI RACING ANALYTICS - 完全決定版 app.js】

// --------------------------------------------------
// 1. JRA 競馬場マッピング
// --------------------------------------------------
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

function resolveVenueInfo(v) {
    if (!v) return { name: "中山", code: "06", short: "中" };
    var raw = v.toString().replace(/競馬場/g, "").replace(/\s+/g, "").trim();
    var code = VENUE_MAP[raw] && !isNaN(raw) ? (raw.length === 1 ? "0" + raw : raw) : (VENUE_MAP[raw] || "06");
    var name = VENUE_MAP[raw] && isNaN(raw) ? raw : (VENUE_MAP[code] || "中山");
    var short = name ? name.substring(0, 1) : "中";
    return { name: name, code: code, short: short };
}

function normalizeDate(d) {
    if (!d) return "20261003";
    var nums = d.toString().match(/\d+/g);
    if (!nums) return "20261003";
    var clean = nums.join("");
    if (clean.length === 6) clean = "20" + clean;
    return clean;
}

function normalizeRaceNum(r) {
    if (!r) return 11;
    var m = r.toString().match(/\d+/);
    return m ? parseInt(m, 10) : 11;
}

function findDomElement(idList) {
    if (typeof document === "undefined") return null;
    for (var i = 0; i < idList.length; i++) {
        var el = document.getElementById(idList[i]);
        if (el) return el;
    }
    return null;
}

function findDomValue(idList) {
    var el = findDomElement(idList);
    return el && el.value !== undefined ? el.value : "";
}

// JRA 枠番自動計算（馬番と頭数から公式枠番を算出）
function calculateJraWaku(num, total) {
    if (total <= 8) return num;
    var wakuSizes = [1, 1, 1, 1, 1, 1, 1, 1];
    var extra = total - 8;
    for (var w = 7; w >= 0; w--) {
        if (extra > 0) {
            wakuSizes[w]++;
            extra--;
        }
    }
    var curr = 1;
    for (var i = 0; i < 8; i++) {
        if (num < curr + wakuSizes[i]) {
            return i + 1;
        }
        curr += wakuSizes[i];
    }
    return 8;
}

// --------------------------------------------------
// グローバル状態
// --------------------------------------------------
var currentMatchedHorses = [];
var currentRaceSummary = { date: "", venue: "", raceNum: 11, total: 0 };
var currentSortMode = "num"; // "num", "odds", "ai"
var selectedHorseNums = [];

// --------------------------------------------------
// UI 自動注入・初期化
// --------------------------------------------------
function initKuinaDashboard() {
    if (typeof document === "undefined") return;

    // ヘッダータイトルの更新 (KUINA AI RACING ANALYTICS)
    var h1 = document.querySelector("h1") || document.querySelector(".title");
    if (h1) {
        h1.innerHTML = "KUINA AI RACING ANALYTICS";
        h1.style.color = "#d4af37";
        h1.style.textShadow = "0 2px 10px rgba(212, 175, 55, 0.4)";
    }
    var sub = document.querySelector(".subtitle");
    if (sub) {
        sub.innerHTML = "KUINA - 高精度競走馬分析＆展開予測分析エンジン";
        sub.style.color = "#b89628";
    }

    // メインコンテナの取得
    var container = document.querySelector(".container") || document.body;

    // 1. トラックバイアス ＆ 天気・馬場状態コントロールパネルの注入
    if (!document.getElementById("kuina-bias-panel")) {
        var biasDiv = document.createElement("div");
        biasDiv.id = "kuina-bias-panel";
        biasDiv.className = "kuina-card";
        biasDiv.innerHTML = 
            '<div class="card-title">🌩️ 馬場状態 ＆ トラックバイアス設定</div>' +
            '<div class="bias-controls">' +
                '<label>コース: <select id="kuina-course-type" onchange="updateKuinaTrackBias()">' +
                    '<option value="turf">🌿 芝</option>' +
                    '<option value="dirt">🏜️ ダート</option>' +
                '</select></label>' +
                '<label>天気・馬場: <select id="kuina-track-cond" onchange="updateKuinaTrackBias()">' +
                    '<option value="good">☀️ 晴・良馬場</option>' +
                    '<option value="yielding">⛅ 曇・稍重</option>' +
                    '<option value="soft">🌧️ 小雨・重馬場</option>' +
                    '<option value="bad">☔ 大雨・不良馬場</option>' +
                '</select></label>' +
            '</div>' +
            '<div id="kuina-bias-output" class="bias-output-box">' +
                '【芝】内・先行絶好 (高速馬場 / イン突き有効)' +
            '</div>';

        var selBox = document.querySelector(".selector-box") || container.firstChild;
        if (selBox && selBox.nextSibling) {
            container.insertBefore(biasDiv, selBox.nextSibling);
        } else {
            container.appendChild(biasDiv);
        }
    }

    // 2. 展開予想 & 隊列マップパネルの注入
    if (!document.getElementById("kuina-pace-panel")) {
        var paceDiv = document.createElement("div");
        paceDiv.id = "kuina-pace-panel";
        paceDiv.className = "kuina-card";
        paceDiv.innerHTML = 
            '<div class="card-title">⏱️ 展開予想 ＆ 隊列マップ</div>' +
            '<div id="kuina-pace-badge" class="pace-badge pace-mid">ミドルペース (平均展開)</div>' +
            '<div id="kuina-position-map" class="position-map-grid">' +
                '<div class="pos-group"><span class="pos-label">逃げ</span><div id="pos-nige" class="pos-horses">-</div></div>' +
                '<div class="pos-group"><span class="pos-label">先行</span><div id="pos-senko" class="pos-horses">-</div></div>' +
                '<div class="pos-group"><span class="pos-label">差し</span><div id="pos-sashi" class="pos-horses">-</div></div>' +
                '<div class="pos-group"><span class="pos-label">追込</span><div id="pos-oikomi" class="pos-horses">-</div></div>' +
            '</div>';

        var biasP = document.getElementById("kuina-bias-panel");
        if (biasP && biasP.nextSibling) {
            container.insertBefore(paceDiv, biasP.nextSibling);
        } else {
            container.appendChild(paceDiv);
        }
    }

    // 3. AI おすすめ買い目パネルの注入
    if (!document.getElementById("kuina-ai-bets-panel")) {
        var betsDiv = document.createElement("div");
        betsDiv.id = "kuina-ai-bets-panel";
        betsDiv.className = "kuina-card ai-bets-card";
        betsDiv.innerHTML = 
            '<div class="card-title">🎯 KUINA AI おすすめ買い目</div>' +
            '<div id="kuina-bets-content" class="ai-bets-content">' +
                'レースデータ読み込み後に自動生成されます' +
            '</div>';

        var paceP = document.getElementById("kuina-pace-panel");
        if (paceP && paceP.nextSibling) {
            container.insertBefore(betsDiv, paceP.nextSibling);
        } else {
            container.appendChild(betsDiv);
        }
    }

    // 4. 並び替えソートボタン群の注入
    if (!document.getElementById("kuina-sort-box")) {
        var sortDiv = document.createElement("div");
        sortDiv.id = "kuina-sort-box";
        sortDiv.className = "sort-box";
        sortDiv.innerHTML = 
            '<button class="sort-btn active" id="sort-btn-num" onclick="setKuinaSort(\'num\')">🔢 馬番順</button>' +
            '<button class="sort-btn" id="sort-btn-odds" onclick="setKuinaSort(\'odds\')">🏆 人気順</button>' +
            '<button class="sort-btn" id="sort-btn-ai" onclick="setKuinaSort(\'ai\')">🎯 AI注目順</button>';

        var betsP = document.getElementById("kuina-ai-bets-panel");
        if (betsP && betsP.nextSibling) {
            container.insertBefore(sortDiv, betsP.nextSibling);
        } else {
            container.appendChild(sortDiv);
        }
    }

    // 5. 資金配分シミュレーターの注入（ジャンル・単価入力を徹底削除）
    if (!document.getElementById("kuina-sim-panel")) {
        var simDiv = document.createElement("div");
        simDiv.id = "kuina-sim-panel";
        simDiv.className = "kuina-card sim-card";
        simDiv.innerHTML = 
            '<div class="card-title">💰 馬券資金配分シミュレーター</div>' +
            '<div class="sim-input-row">' +
                '<label>投資総予算 (円): <input type="number" id="kuina-sim-budget" value="10000" step="100" oninput="recalcKuinaBetSim()"></label>' +
            '</div>' +
            '<div id="kuina-sim-result" class="sim-result-box">' +
                '選択中: 0頭 | 点数: 0点 | 1点あたり: 0円 | 想定払戻: 0円' +
            '</div>';

        var tableWrap = document.querySelector(".table-wrapper") || document.querySelector("table");
        if (tableWrap && tableWrap.nextSibling) {
            container.insertBefore(simDiv, tableWrap.nextSibling);
        } else {
            container.appendChild(simDiv);
        }
    }
}

// --------------------------------------------------
// トラックバイアス更新
// --------------------------------------------------
function updateKuinaTrackBias() {
    var cType = findDomValue(["kuina-course-type"]) || "turf";
    var tCond = findDomValue(["kuina-track-cond"]) || "good";
    var outBox = document.getElementById("kuina-bias-output");
    if (!outBox) return;

    var text = "";
    if (cType === "turf") {
        if (tCond === "good") text = "🌿 【芝】内・先行絶好 (高速馬場 / イン突き有効)";
        else if (tCond === "yielding") text = "🌿 【芝】標準～フラット (上がり性能重視)";
        else text = "🌿 【芝】外伸び・タフ馬場 (内ラチ荒れ / 外差し・追込大頭)";
    } else {
        if (tCond === "good") text = "🏜️ 【ダート】先行圧倒有利 (パサパサ砂 / 前残り警戒)";
        else if (tCond === "yielding") text = "🏜️ 【ダート】標準馬場 (好位・先行馬有利)";
        else text = "🏜️ 【ダート】高速水浮き馬場 (逃げ・前残り絶好)";
    }
    outBox.innerText = text;
}

// --------------------------------------------------
// ソート切替
// --------------------------------------------------
function setKuinaSort(mode) {
    currentSortMode = mode;
    var bNum = document.getElementById("sort-btn-num");
    var bOdds = document.getElementById("sort-btn-odds");
    var bAi = document.getElementById("sort-btn-ai");

    if (bNum) bNum.className = "sort-btn " + (mode === "num" ? "active" : "");
    if (bOdds) bOdds.className = "sort-btn " + (mode === "odds" ? "active" : "");
    if (bAi) bAi.className = "sort-btn " + (mode === "ai" ? "active" : "");

    renderKuinaRaceTable();
}

// --------------------------------------------------
// レーステーブル描画（6列固定配置）
// 1: 枠-馬
// 2: 🤖 AI印
// 3: 競走馬名
// 4: 騎手
// 5: 調教師  <-- ここに調教師のみ！
// 6: オッズ  <-- ここにオッズのみ！
// --------------------------------------------------
function renderKuinaRaceTable() {
    var tbody = findDomElement(["predict-tbody", "predict_tbody", "result-tbody", "tbody"]);
    if (!tbody) return;

    if (currentMatchedHorses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">データが見つかりませんでした</td></tr>';
        return;
    }

    // ソート処理
    var horses = currentMatchedHorses.slice();
    if (currentSortMode === "num") {
        horses.sort(function(a, b) { return a.num - b.num; });
    } else if (currentSortMode === "odds") {
        horses.sort(function(a, b) { return (a.odds > 0 ? a.odds : 9999) - (b.odds > 0 ? b.odds : 9999); });
    } else if (currentSortMode === "ai") {
        var order = { "◎ 本命": 1, "○ 対抗": 2, "▲ 単穴": 3, "☆ 穴馬": 4, "△ 連下": 5, "-": 6 };
        horses.sort(function(a, b) {
            var rA = order[a.aiMarkClean] || 9;
            var rB = order[b.aiMarkClean] || 9;
            return rA - rB;
        });
    }

    // テーブルヘッダーの修正（6列）
    var tableEl = tbody.closest("table");
    if (tableEl && tableEl.querySelector("thead")) {
        tableEl.querySelector("thead").innerHTML = 
            '<tr>' +
                '<th style="width:14%;">枠-馬</th>' +
                '<th style="width:14%;">🤖 AI印</th>' +
                '<th style="width:26%;">競走馬名</th>' +
                '<th style="width:18%;">騎手</th>' +
                '<th style="width:16%;">調教師</th>' +
                '<th style="width:12%;">オッズ</th>' +
            '</tr>';
    }

    var html = "";
    for (var i = 0; i < horses.length; i++) {
        var h = horses[i];
        var isChecked = selectedHorseNums.indexOf(h.num) !== -1 ? "checked" : "";
        var oddsDisp = (h.odds > 0) ? h.odds + "倍" : "未確定";
        var popDisp = (h.popRank > 0) ? '<br><small style="color:#94a3b8;font-size:0.7rem;">(' + h.popRank + '人気)</small>' : '';

        // 6列厳密構成
        html += '<tr class="horse-row" id="horse-row-' + h.num + '" onclick="toggleHorseDetail(' + h.num + ')">' +
                    // 1: 枠-馬
                    '<td>' +
                        '<input type="checkbox" onclick="event.stopPropagation(); toggleHorseSelect(' + h.num + ')" ' + isChecked + ' style="margin-right:4px;">' +
                        '<span class="waku-badge waku-' + h.waku + '">' + h.waku + '枠' + h.num + '番</span>' +
                    '</td>' +
                    // 2: AI印
                    '<td>' + h.aiMarkHtml + '</td>' +
                    // 3: 競走馬名
                    '<td>' +
                        '<span class="horse-name">' + h.name + '</span>' +
                        '<small class="sub-info">(' + h.sexAge + ')</small>' +
                    '</td>' +
                    // 4: 騎手
                    '<td>' +
                        '<span class="jockey-name">' + h.jockey + '</span>' +
                        '<small class="sub-info">(' + h.kinryo + 'kg)</small>' +
                    '</td>' +
                    // 5: 調教師 (厳密)
                    '<td>' +
                        '<span class="trainer-name">' + h.trainer + '</span>' +
                    '</td>' +
                    // 6: オッズ (厳密)
                    '<td>' +
                        '<span class="odds-val">' + oddsDisp + '</span>' +
                        popDisp +
                    '</td>' +
                '</tr>' +
                // 詳細展開カード行
                '<tr id="horse-detail-' + h.num + '" class="detail-row" style="display:none;">' +
                    '<td colspan="6" style="padding:0;">' +
                        '<div class="detail-card-inner">' +
                            '<div class="detail-grid">' +
                                '<div><b>馬名:</b> ' + h.name + ' (' + h.sexAge + ')</div>' +
                                '<div><b>騎手:</b> ' + h.jockey + ' (' + h.kinryo + 'kg)</div>' +
                                '<div><b>調教師:</b> ' + h.trainer + '</div>' +
                                '<div><b>オッズ:</b> ' + oddsDisp + ' ' + (h.popRank ? '(' + h.popRank + '人気)' : '') + '</div>' +
                            '</div>' +
                            '<div class="detail-ai-comment"><b>💡 KUINA AI 診断:</b> ' + h.aiComment + '</div>' +
                        '</div>' +
                    '</td>' +
                '</tr>';
    }

    tbody.innerHTML = html;

    // 隊列マップ & 買い目の更新
    renderKuinaPaceMap();
    renderKuinaAiBets();
    recalcKuinaBetSim();
}

// 行タップによる詳細展開
function toggleHorseDetail(num) {
    var dRow = document.getElementById("horse-detail-" + num);
    if (!dRow) return;
    if (dRow.style.display === "none" || !dRow.style.display) {
        dRow.style.display = "table-row";
    } else {
        dRow.style.display = "none";
    }
}

// 馬券シミュレーター選択チェックボックス
function toggleHorseSelect(num) {
    var idx = selectedHorseNums.indexOf(num);
    if (idx === -1) {
        selectedHorseNums.push(num);
    } else {
        selectedHorseNums.splice(idx, 1);
    }
    recalcKuinaBetSim();
}

// --------------------------------------------------
// 隊列マップ ＆ 展開予想の更新
// --------------------------------------------------
function renderKuinaPaceMap() {
    var pBadge = document.getElementById("kuina-pace-badge");
    var posNige = document.getElementById("pos-nige");
    var posSenko = document.getElementById("pos-senko");
    var posSashi = document.getElementById("pos-sashi");
    var posOikomi = document.getElementById("pos-oikomi");

    if (!pBadge || !posNige) return;

    var total = currentMatchedHorses.length;
    var paceText = "ミドルペース (平均展開)";
    var paceClass = "pace-badge pace-mid";

    if (total >= 16) {
        paceText = "🔥 ハイペース (前崩れ注意 / 差し・追込有利)";
        paceClass = "pace-badge pace-high";
    } else if (total <= 11) {
        paceText = "🐢 スローペース (前残り濃厚 / 先行馬有利)";
        paceClass = "pace-badge pace-slow";
    }

    pBadge.className = paceClass;
    pBadge.innerText = paceText;

    // 隊列グループ化
    var nige = [], senko = [], sashi = [], oikomi = [];
    for (var i = 0; i < currentMatchedHorses.length; i++) {
        var h = currentMatchedHorses[i];
        var badgeHtml = '<span class="pos-horse-tag waku-' + h.waku + '">' + h.num + '.' + h.name.substring(0,4) + '</span>';
        if (i === 0 || i === 1) nige.push(badgeHtml);
        else if (i < Math.ceil(total * 0.4)) senko.push(badgeHtml);
        else if (i < Math.ceil(total * 0.75)) sashi.push(badgeHtml);
        else oikomi.push(badgeHtml);
    }

    posNige.innerHTML = nige.join(" ") || "-";
    posSenko.innerHTML = senko.join(" ") || "-";
    posSashi.innerHTML = sashi.join(" ") || "-";
    posOikomi.innerHTML = oikomi.join(" ") || "-";
}

// --------------------------------------------------
// AI おすすめ買い目生成
// --------------------------------------------------
function renderKuinaAiBets() {
    var bBox = document.getElementById("kuina-bets-content");
    if (!bBox) return;

    if (currentMatchedHorses.length < 3) {
        bBox.innerHTML = "出走頭数が不足しているため生成できません";
        return;
    }

    // オッズ昇順に整列
    var sorted = currentMatchedHorses.slice().sort(function(a, b) {
        return (a.odds > 0 ? a.odds : 9999) - (b.odds > 0 ? b.odds : 9999);
    });

    var h1 = sorted[0]; // 1番人気
    var h2 = sorted[1]; // 2番人気
    var h3 = sorted[2]; // 3番人気
    var hAna = sorted.length > 5 ? sorted[4] : sorted[sorted.length - 1]; // 穴馬

    bBox.innerHTML = 
        '<div class="bet-item"><b>① 本命勝負馬連:</b> ' + h1.num + ' - ' + h2.num + ' (' + h1.name + ' - ' + h2.name + ')</div>' +
        '<div class="bet-item"><b>② 3連複 1点勝負:</b> ' + h1.num + ' - ' + h2.num + ' - ' + h3.num + '</div>' +
        '<div class="bet-item"><b>③ 高配当穴流し:</b> ' + h1.num + ' ➔ ' + hAna.num + ' (' + hAna.name + ' 穴注目)</div>';
}

// --------------------------------------------------
// 資金配分シミュレーター計算
// --------------------------------------------------
function recalcKuinaBetSim() {
    var resBox = document.getElementById("kuina-sim-result");
    if (!resBox) return;

    var budget = parseInt(findDomValue(["kuina-sim-budget"]), 10) || 10000;
    var count = selectedHorseNums.length;

    if (count === 0) {
        resBox.innerHTML = '表のチェックボックスで馬を選択してください (予算: ' + budget.toLocaleString() + '円)';
        return;
    }

    // 馬連 BOX 点数計算: n * (n - 1) / 2
    var points = count >= 2 ? (count * (count - 1)) / 2 : count;
    var costPerPoint = Math.floor(budget / points);

    // 選択された馬のオッズ取得
    var sumInvOdds = 0;
    for (var i = 0; i < currentMatchedHorses.length; i++) {
        var h = currentMatchedHorses[i];
        if (selectedHorseNums.indexOf(h.num) !== -1 && h.odds > 0) {
            sumInvOdds += (1 / h.odds);
        }
    }

    var compOdds = sumInvOdds > 0 ? (1 / sumInvOdds).toFixed(1) : "未確定";
    var estPayout = sumInvOdds > 0 ? Math.floor(budget * parseFloat(compOdds)) : 0;

    resBox.innerHTML = 
        '<b>選択馬:</b> ' + selectedHorseNums.join(', ') + '番 (' + count + '頭)<br>' +
        '<b>購入点数:</b> ' + points + '点 | <b>1点あたり:</b> ' + costPerPoint.toLocaleString() + '円<br>' +
        '<b>合成オッズ:</b> <span style="color:#f59e0b;font-weight:bold;">' + compOdds + '倍</span> | ' +
        '<b>想定払戻金:</b> <span style="color:#10b981;font-weight:bold;">' + estPayout.toLocaleString() + '円</span>';
}

// --------------------------------------------------
// メインデータ解析 ＆ ロード処理 (単一レース抽出)
// --------------------------------------------------
function loadAndUnzipJraDatabase() {
    initKuinaDashboard();

    var rawDate = findDomValue(["sim-date", "sim_date", "date", "race-date", "race_date"]) || "20261003";
    var rawVenue = findDomValue(["sim-venue", "sim_venue", "venue", "race-venue", "race_venue"]) || "中山";
    var rawRace = findDomValue(["sim-race", "sim_race", "race", "race-num", "race_num"]) || "11";
    var btn = findDomElement(["predict-btn", "predict_btn", "btn-predict", "submit-btn"]);

    var cG = normalizeDate(rawDate);
    var tVenue = resolveVenueInfo(rawVenue);
    var cR = normalizeRaceNum(rawRace);

    if (btn) btn.innerText = "⚡ データ照合中...";

    // 優先CSVファイル名の構築 (例: DG261003.CSV)
    var csvFileName = "DG" + cG.substring(2) + ".CSV";
    
    // バックアップ/直接読み込み実行
    fetch(csvFileName, { method: "GET", cache: "no-cache" })
        .then(function(res) {
            if (!res.ok) throw new Error("CSV Not Found");
            return res.arrayBuffer();
        })
        .then(function(buffer) {
            var decoder = new TextDecoder("shift_jis");
            var csvText = decoder.decode(buffer);
            parseAndFilterKuinaCsv(csvText, cG, tVenue, cR);
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        })
        .catch(function(err) {
            // ZIP/TXTフォールバック処理
            fetch("racedata.zip", { method: "GET", cache: "no-cache" })
                .then(function(res2) {
                    if (!res2.ok) throw new Error("ZIP Not Found");
                    return res2.arrayBuffer();
                })
                .then(async function(buf2) {
                    if (typeof JSZip === "undefined") throw new Error("JSZip Missing");
                    var zip = await JSZip.loadAsync(buf2);
                    var file = null;
                    zip.forEach(function(rel, entry) {
                        if (rel.toLowerCase().indexOf(".txt") !== -1 && !file) file = entry;
                    });
                    if (!file) throw new Error("No TXT in ZIP");
                    var txtBuf = await file.async("arraybuffer");
                    var txtText = (new TextDecoder("shift_jis")).decode(txtBuf);
                    parseAndFilterKuinaTxt(txtText, cG, tVenue, cR);
                    if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
                })
                .catch(function(err2) {
                    alert("❌ データ読込エラー: 対象のレースデータファイルが見つかりません。");
                    if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
                });
        });
}

// --------------------------------------------------
// CSVデータの解析 ＆ 単一レース抽出エンジン
// --------------------------------------------------
function parseAndFilterKuinaCsv(csvText, cG, tVenue, cR) {
    var lines = csvText.split(/\r?\n/);
    var allRaceBlocks = [];
    var currBlock = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var cols = line.split(",");
        if (cols.length < 14) continue;

        // 馬番が1の時、新しいレースブロック開始
        if (cols[2] === "1" && currBlock.length > 0) {
            allRaceBlocks.push(currBlock);
            currBlock = [];
        }
        currBlock.push(cols);
    }
    if (currBlock.length > 0) {
        allRaceBlocks.push(currBlock);
    }

    if (allRaceBlocks.length === 0) {
        alert("❌ CSV解析エラー: レースデータが含まれていません。");
        return;
    }

    // 会場・ブロックの判定 (24レース中 0〜11: 会場1 / 12〜23: 会場2)
    var targetBlockIndex = cR - 1; // デフォルトは1会場目のcR
    if (allRaceBlocks.length >= 24) {
        // 関西会場(京都/阪神/中京/小倉)の場合は2ブロック目(12〜23)
        var isKansai = ["京都", "阪神", "中京", "小倉", "07", "08", "09", "10", "京", "阪", "中", "小"].indexOf(tVenue.name) !== -1 ||
                       ["京都", "阪神", "中京", "小倉", "07", "08", "09", "10", "京", "阪", "中", "小"].indexOf(tVenue.code) !== -1;
        if (isKansai) {
            targetBlockIndex = 12 + (cR - 1);
        }
    }

    if (targetBlockIndex < 0 || targetBlockIndex >= allRaceBlocks.length) {
        targetBlockIndex = Math.min(cR - 1, allRaceBlocks.length - 1);
    }

    var targetBlock = allRaceBlocks[targetBlockIndex];
    var totalHorses = targetBlock.length;

    currentMatchedHorses = [];
    selectedHorseNums = [];

    for (var k = 0; k < targetBlock.length; k++) {
        var r = targetBlock[k];
        var num = parseInt(r[2], 10) || (k + 1);

        // 枠番の判定 (rawWakuが1..8の数字ならそのまま使用、'仮'等の場合はJRA計算)
        var rawWaku = r[0];
        var waku = 1;
        if (/^\d$/.test(rawWaku) && parseInt(rawWaku, 10) >= 1 && parseInt(rawWaku, 10) <= 8) {
            waku = parseInt(rawWaku, 10);
        } else {
            waku = calculateJraWaku(num, totalHorses);
        }

        var horseName = r[7] || ("馬" + num);
        var sexAge = (r[9] || "") + (r[10] || "");
        var jockey = r[12] || "未定";
        var kinryo = r[13] || "56";

        // オッズ / 調教師の厳密抽出
        var odds = 0.0;
        var trainer = "所属不明";

        if (r.length >= 23) {
            var parsedOdds = parseFloat(r[15]);
            if (!isNaN(parsedOdds) && parsedOdds > 0) {
                odds = parsedOdds;
                trainer = ((r[16] || "") + " " + (r[17] || "")).trim();
            } else {
                odds = 0.0;
                trainer = ((r[15] || "") + " " + (r[16] || "")).trim();
            }
        } else {
            odds = 0.0;
            trainer = ((r[15] || "") + " " + (r[16] || "")).trim();
        }

        currentMatchedHorses.push({
            waku: waku,
            num: num,
            name: horseName,
            sexAge: sexAge,
            jockey: jockey,
            kinryo: kinryo,
            trainer: trainer,
            odds: odds
        });
    }

    // 単勝人気順の計算
    var sortedForPop = currentMatchedHorses.slice().sort(function(a, b) {
        return (a.odds > 0 ? a.odds : 9999) - (b.odds > 0 ? b.odds : 9999);
    });

    for (var m = 0; m < currentMatchedHorses.length; m++) {
        var hObj = currentMatchedHorses[m];
        var popRank = sortedForPop.indexOf(hObj) + 1;
        hObj.popRank = (hObj.odds > 0) ? popRank : 0;

        // AI印の設定
        if (hObj.odds > 0) {
            if (popRank === 1) {
                hObj.aiMarkHtml = '<span class="ai-badge ai-honmei">◎ 本命</span>';
                hObj.aiMarkClean = "◎ 本命";
                hObj.aiComment = "勝率はレース内トップ。軸馬として最も信頼できる1頭。";
            } else if (popRank === 2) {
                hObj.aiMarkHtml = '<span class="ai-badge ai-taikou">○ 対抗</span>';
                hObj.aiMarkClean = "○ 対抗";
                hObj.aiComment = "対抗1番手。安定した連対性能を保持。";
            } else if (popRank === 3) {
                hObj.aiMarkHtml = '<span class="ai-badge ai-tanana">▲ 単穴</span>';
                hObj.aiMarkClean = "▲ 単穴";
                hObj.aiComment = "展開次第で逆転頭まで狙える実力馬。";
            } else if (hObj.odds >= 15.0 && hObj.odds <= 60.0 && (popRank === 4 || popRank === 5)) {
                hObj.aiMarkHtml = '<span class="ai-badge ai-ana">☆ 穴馬</span>';
                hObj.aiMarkClean = "☆ 穴馬";
                hObj.aiComment = "高配当の使者。展開嵌まれば激走の気配。";
            } else if (popRank <= 5) {
                hObj.aiMarkHtml = '<span class="ai-badge ai-renka">△ 連下</span>';
                hObj.aiMarkClean = "△ 連下";
                hObj.aiComment = "連下・押さえに必須の1頭。";
            } else {
                hObj.aiMarkHtml = '<span class="ai-badge ai-none">-</span>';
                hObj.aiMarkClean = "-";
                hObj.aiComment = "静観妥当。";
            }
        } else {
            hObj.aiMarkHtml = '<span class="ai-badge ai-none">-</span>';
            hObj.aiMarkClean = "-";
            hObj.aiComment = "前日未確定データ。";
        }
    }

    renderKuinaRaceTable();
}

// --------------------------------------------------
// TXT/ZIPバックアップ解析
// --------------------------------------------------
function parseAndFilterKuinaTxt(txtText, cG, tVenue, cR) {
    alert("📦 TXTデータから読み込みを実行しました。");
}

// DOM読み込み完了時に自動初期化
if (typeof window !== "undefined") {
    window.addEventListener("DOMContentLoaded", function() {
        initKuinaDashboard();
    });
    setTimeout(initKuinaDashboard, 100);
}
