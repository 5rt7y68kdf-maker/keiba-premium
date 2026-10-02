// 🌪️【KUINA AI RACING ANALYTICS - 高精度競走馬分析＆展開予測エンジン app.js】

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
var currentSortMode = "num"; // "num", "odds", "ai"

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

// 天気 & 展開予想ファクターの取得
function getRaceFactors() {
    var weather = findDomValue(["sim-weather", "weather-select", "weather"]) || "晴";
    var pace = findDomValue(["sim-pace", "pace-select", "pace"]) || "ミドルペース";
    return { weather: weather, pace: pace };
}

// --------------------------------------------------
// JRA CSV 高精度解析エンジン
// --------------------------------------------------
function parseCsvRow(rowStr, rowIdx) {
    if (!rowStr) return null;
    var cols = rowStr.split(",").map(function(c) { return c.replace(/^["']|["']$/g, "").trim(); });
    if (cols.length < 8) return null;

    var horseName = "";
    var nameColIdx = -1;
    for (var i = 0; i < cols.length; i++) {
        if (/^[\u30A0-\u30FFー・]{2,9}$/.test(cols[i])) {
            if (!/^(ダート|障害|リステッド|オープン|未勝利|新馬|サラ系|マイル|カップ)$/.test(cols[i])) {
                horseName = cols[i];
                nameColIdx = i;
                break;
            }
        }
    }

    if (!horseName) return null;

    var num = parseInt(cols[0], 10) || parseInt(cols[2], 10) || (rowIdx + 1);
    if (isNaN(num) || num <= 0 || num > 18) num = rowIdx + 1;

    var waku = Math.min(8, Math.max(1, Math.ceil(num / 2)));
    if (!isNaN(parseInt(cols[0], 10)) && parseInt(cols[0], 10) >= 1 && parseInt(cols[0], 10) <= 8) {
        waku = parseInt(cols[0], 10);
    }

    var sex = "牡";
    var age = "3";
    for (var j = 0; j < cols.length; j++) {
        if (/^(牡|牝|セ)$/.test(cols[j])) {
            sex = cols[j];
            if (j + 1 < cols.length && /^\d{1,2}$/.test(cols[j+1])) age = cols[j+1];
            break;
        }
    }

    var jockey = "不明";
    var kinryo = "56";
    for (var k = nameColIdx + 1; k < cols.length; k++) {
        if (/^[\u4E00-\u9FFF\u30A0-\u30FFー]{2,8}$/.test(cols[k]) && !/^(美|栗|外|地|高|重|稍)$/.test(cols[k])) {
            jockey = cols[k];
            if (k + 1 < cols.length && /^\d{2}(\.\d)?$/.test(cols[k+1])) {
                kinryo = cols[k+1];
            }
            break;
        }
    }

    var odds = 0.0;
    for (var m = cols.length - 1; m > nameColIdx; m--) {
        if (/^\d{1,3}\.\d$/.test(cols[m])) {
            var val = parseFloat(cols[m]);
            if (!isNaN(val) && val > 0) { odds = val; break; }
        }
    }

    var stable = "";
    var trainer = "";
    for (var n = 0; n < cols.length; n++) {
        if (/^\(美\)|\(栗\)$/.test(cols[n])) {
            stable = cols[n];
            if (n + 1 < cols.length && /^[\u4E00-\u9FFF]{2,6}$/.test(cols[n+1])) {
                trainer = cols[n+1];
            }
            break;
        }
    }

    return {
        waku: waku,
        num: num,
        name: horseName,
        sex: sex,
        age: age,
        jockey: jockey,
        kinryo: kinryo,
        odds: odds,
        stable: stable,
        trainer: trainer
    };
}

// --------------------------------------------------
// AI 予想ファクター計算 (天気・展開予想対応)
// --------------------------------------------------
function computeAiMarksAndFactors(horses) {
    var factors = getRaceFactors();
    var weather = factors.weather; // 晴, 雨, 稍重, 不良
    var pace = factors.pace;       // ハイペース, ミドルペース, スローペース

    var sorted = horses.slice().sort(function(a, b) {
        return (a.odds > 0 ? a.odds : 999) - (b.odds > 0 ? b.odds : 999);
    });

    for (var i = 0; i < horses.length; i++) {
        var h = horses[i];
        var rank = sorted.indexOf(h);
        h.popRank = rank + 1;

        // 印の基本判定
        if (rank === 0 && h.odds > 0) {
            h.aiMarkStr = "◎ 本命";
            h.aiBadgeClass = "ai-honmei";
            h.aiOrder = 1;
            h.aiComment = "スピード・実績上位";
        } else if (rank === 1 && h.odds > 0) {
            h.aiMarkStr = "○ 対抗";
            h.aiBadgeClass = "ai-taikou";
            h.aiOrder = 2;
            h.aiComment = "安定感◎・好勝負必至";
        } else if (rank === 2 && h.odds > 0) {
            h.aiMarkStr = "▲ 単穴";
            h.aiBadgeClass = "ai-tanana";
            h.aiOrder = 3;
            h.aiComment = "逆転の一撃あり";
        } else if (h.odds >= 12.0 && h.odds <= 60.0) {
            h.aiMarkStr = "☆ 穴馬";
            h.aiBadgeClass = "ai-ana";
            h.aiOrder = 4;
            h.aiComment = (pace === "ハイペース") ? "展開ハマれば一発" : "穴気配十分";
        } else if (rank < 6 && h.odds > 0) {
            h.aiMarkStr = "△ 連下";
            h.aiBadgeClass = "ai-renka";
            h.aiOrder = 5;
            h.aiComment = "連下候補";
        } else {
            h.aiMarkStr = "-";
            h.aiBadgeClass = "ai-none";
            h.aiOrder = 6;
            h.aiComment = "静観";
        }

        // 天気・展開ファクターによるワンポイント分析追加
        if (weather.indexOf("雨") !== -1 || weather.indexOf("重") !== -1) {
            if (h.aiMarkStr !== "-") h.aiComment += " (荒れ馬場好走)";
        }
        if (pace === "ハイペース" && (h.aiMarkStr === "▲ 単穴" || h.aiMarkStr === "☆ 穴馬")) {
            h.aiComment += " [差し展開有利]";
        } else if (pace === "スローペース" && (h.aiMarkStr === "◎ 本命" || h.aiMarkStr === "○ 対抗")) {
            h.aiComment += " [前残り警戒]";
        }
    }
}

// --------------------------------------------------
// レース描画関数 (ご要望の6列構造)
// Col1: 枠-馬
// Col2: 🤖 AI印
// Col3: 競走馬名 (性齢含む)
// Col4: 騎手 (斤量含む)
// Col5: 調教師 (所属含む)
// Col6: 単勝オッズ (人気順含む)
// --------------------------------------------------
function renderRaceTable() {
    var tbody = findDomElement(["predict-tbody", "predict_tbody", "result-tbody", "tbody"]);
    if (!tbody) return;

    // ヘッダーを6列（枠-馬, AI印, 競走馬名, 騎手, 調教師, オッズ）に統一更新
    var tableEl = tbody.closest ? tbody.closest("table") : (tbody.parentElement ? tbody.parentElement : null);
    if (tableEl) {
        var thead = tableEl.querySelector ? tableEl.querySelector("thead") : null;
        if (thead) {
            thead.innerHTML = "<tr>" +
                "<th>枠-馬</th>" +
                "<th>🤖 AI印</th>" +
                "<th>競走馬名</th>" +
                "<th>騎手</th>" +
                "<th>調教師</th>" +
                "<th>オッズ</th>" +
                "</tr>";
        }
    }

    var displayList = currentHorsesData.slice();

    if (currentSortMode === "odds") {
        displayList.sort(function(a, b) {
            return (a.odds > 0 ? a.odds : 999) - (b.odds > 0 ? b.odds : 999);
        });
    } else if (currentSortMode === "ai") {
        displayList.sort(function(a, b) { return a.aiOrder - b.aiOrder; });
    } else {
        displayList.sort(function(a, b) { return a.num - b.num; });
    }

    var html = "";
    for (var i = 0; i < displayList.length; i++) {
        var h = displayList[i];
        var oddsText = (h.odds > 0) ? h.odds.toFixed(1) + "倍" : "未確定";
        var popText = h.popRank ? "(" + h.popRank + "人気)" : "";

        var trainerStr = (h.stable || "") + " " + (h.trainer || "未定");

        html += "<tr>" +
                "<td><span class=\"waku-badge waku-" + h.waku + "\">" + h.waku + "枠" + h.num + "番</span></td>" +
                "<td><span class=\"ai-badge " + h.aiBadgeClass + "\">" + h.aiMarkStr + "</span></td>" +
                "<td><span class=\"horse-name\">" + h.name + "</span><span class=\"sub-info\">(" + h.sex + h.age + ")</span></td>" +
                "<td><span class=\"jockey-name\">" + h.jockey + "</span><br><span class=\"sub-info\">(" + h.kinryo + "kg)</span></td>" +
                "<td><span class=\"sub-info\">" + trainerStr + "</span></td>" +
                "<td><span class=\"odds-val\">" + oddsText + "</span><br><span class=\"pop-rank\">" + popText + "</span></td>" +
                "</tr>";
    }

    tbody.innerHTML = html;

    // タイトル＆サブタイトルの自動ブランド更新
    var h1 = document.querySelector("h1");
    if (h1) h1.innerText = "KUINA AI RACING ANALYTICS";
    var sub = document.querySelector(".subtitle");
    if (sub) sub.innerText = "KUINA - 高精度競走馬分析＆展開予測分析エンジン";
}

// --------------------------------------------------
// ソート切替
// --------------------------------------------------
function setSortMode(mode) {
    currentSortMode = mode;
    var btns = document.querySelectorAll(".sort-btn");
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove("active");
    }
    var activeBtn = document.getElementById("sort-btn-" + mode);
    if (activeBtn) activeBtn.classList.add("active");

    renderRaceTable();
}

// --------------------------------------------------
// KUINA メイン実行関数
// --------------------------------------------------
function loadAndUnzipJraDatabase() {
    var rawDate = findDomValue(["sim-date", "sim_date", "date", "race-date", "race_date"]) || "20261003";
    var rawVenue = findDomValue(["sim-venue", "sim_venue", "venue", "race-venue", "race_venue"]) || "中山";
    var rawRace = findDomValue(["sim-race", "sim_race", "race", "race-num", "race_num"]) || "11";
    var btn = findDomElement(["predict-btn", "predict_btn", "btn-predict", "submit-btn"]);

    var cG = normalizeDate(rawDate);
    var tVenue = resolveVenueInfo(rawVenue);
    var cR = normalizeRaceNum(rawRace);

    if (btn) btn.innerText = "⚡ KUINA AI 分析照合中...";

    var csvFileName = "DG" + cG.substring(2) + ".CSV";

    fetch(csvFileName, { method: "GET", cache: "no-cache" })
        .then(function(res) {
            if (!res.ok) throw new Error("CSV取得失敗: " + csvFileName);
            return res.arrayBuffer();
        })
        .then(function(buffer) {
            var decoder = new TextDecoder("shift_jis");
            var csvText = decoder.decode(buffer);
            var lines = csvText.split("\n");

            var horses = [];
            for (var i = 0; i < lines.length; i++) {
                var row = lines[i].trim();
                if (!row) continue;
                var parsed = parseCsvRow(row, horses.length);
                if (parsed) horses.push(parsed);
            }

            if (horses.length === 0) {
                alert("❌ 【KUINA】対象の出馬表データが見つかりませんでした。");
                if (btn) btn.innerText = "🧠 KUINA AI 予想実行";
                return;
            }

            currentHorsesData = horses;
            computeAiMarksAndFactors(currentHorsesData);
            renderRaceTable();

            if (btn) btn.innerText = "🧠 KUINA AI 予想実行";
        })
        .catch(function(err) {
            alert("❌ KUINA AI 解析停止: " + err.message);
            if (btn) btn.innerText = "🧠 KUINA AI 予想実行";
        });
}

// グローバル公開
if (typeof window !== "undefined") {
    window.loadAndUnzipJraDatabase = loadAndUnzipJraDatabase;
    window.setSortMode = setSortMode;
}
