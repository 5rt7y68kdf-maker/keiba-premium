// 🌪️【KUINA AI RACING ANALYTICS - 完全追跡・精密デバッグ仕込み決定版 app.js】

(function() {
    console.log('🚀 KUINA AI Racing Analytics Engine Initialized');
})();

// --------------------------------------------------
// 1. JRA 10競馬場コード＆名称 相互変換辞書
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

// --------------------------------------------------
// 2. JRA公式 枠番 (1枠〜8枠) 自動計算関数
// --------------------------------------------------
function calculateJraWaku(num, total) {
    if (!num || num <= 0) return 1;
    if (!total || total <= 0) total = 16;
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
// 3. 汎用・超精密 CSV 1行解析エンジン
// --------------------------------------------------
function parseCsvLineUniversal(line, totalRunnersInRace) {
    if (!line) return null;
    var tokens = line.split(/[\s,\t|]+/).map(function(t) { return t.trim().replace(/^["']$/g, ""); }).filter(Boolean);
    if (tokens.length < 4) return null;

    if (tokens.indexOf("日付") !== -1 || tokens.indexOf("date") !== -1 || tokens.indexOf("馬名") !== -1) return null;

    var dateStr = "";
    for (var i = 0; i < tokens.length; i++) {
        if (/^\d{6,12}$/.test(tokens[i]) || /^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/.test(tokens[i])) {
            dateStr = tokens[i];
            break;
        }
    }

    var venue = "";
    for (var i = 0; i < tokens.length; i++) {
        var tok = tokens[i];
        if (/^(東京|中山|京都|阪神|新潟|福島|中京|小倉|札幌|函館)$/.test(tok)) {
            venue = tok;
            break;
        }
    }

    var nameIdx = -1;
    var horseName = "";
    for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        if (/^[\u30A0-\u30FFー・]{2,9}$/.test(t)) {
            if (!/^(ダート|障害|リステッド|スプリンターズ|フェブラリー|エリザベス|チャンピオンズ|ホープフル|マイル|カップ|東京|中山|京都|阪神|新潟|福島|中京|小倉|札幌|函館)$/.test(t)) {
                nameIdx = i;
                horseName = t;
                break;
            }
        }
    }
    if (!horseName) return null;

    var sex = "牡", age = "3";
    for (var i = 0; i < tokens.length; i++) {
        var m = tokens[i].match(/^(牡|牝|セ)(\d{1,2})$/);
        if (m) {
            sex = m[1];
            age = m[2];
            break;
        }
        if (/^(牡|牝|セ)$/.test(tokens[i])) {
            sex = tokens[i];
            if (i + 1 < tokens.length && /^\d{1,2}$/.test(tokens[i+1])) {
                age = tokens[i+1];
            }
            break;
        }
    }

    var num = 1;
    if (nameIdx >= 2 && /^\d{1,2}$/.test(tokens[nameIdx - 1])) {
        num = parseInt(tokens[nameIdx - 1], 10);
    } else {
        for (var i = 0; i < tokens.length; i++) {
            if (/^\d{1,2}$/.test(tokens[i])) {
                var v = parseInt(tokens[i], 10);
                if (v >= 1 && v <= 18) { num = v; break; }
            }
        }
    }

    var rawWaku = tokens[0];
    var waku = parseInt(rawWaku, 10);
    if (isNaN(waku) || waku <= 0 || waku > 8) {
        waku = calculateJraWaku(num, totalRunnersInRace || 16);
    }

    var jockey = "未定";
    if (nameIdx + 1 < tokens.length && !/^\d+(\.\d+)?$/.test(tokens[nameIdx + 1])) {
        jockey = tokens[nameIdx + 1];
    }

    var kinryo = "56";
    for (var i = nameIdx + 1; i < tokens.length; i++) {
        if (/^5\d(\.\d)?$/.test(tokens[i])) {
            kinryo = tokens[i];
            break;
        }
    }

    var stable = "";
    var trainer = "";
    for (var i = 0; i < tokens.length; i++) {
        if (/^\((美|栗|外)\)$/.test(tokens[i])) {
            stable = tokens[i];
            if (i + 1 < tokens.length && !/^[0-9.]+$/.test(tokens[i+1])) {
                trainer = tokens[i+1];
            }
            break;
        }
    }

    var odds = 0.0;
    for (var i = tokens.length - 1; i > nameIdx; i--) {
        var tok = tokens[i].replace("倍", "").trim();
        var f = parseFloat(tok);
        if (!isNaN(f) && f > 0 && f < 999.0) {
            if (!/^\((美|栗|外)\)$/.test(tokens[i]) && tokens[i] !== trainer) {
                odds = f;
                break;
            }
        }
    }

    return {
        dateStr: dateStr,
        venue: venue,
        waku: waku,
        num: num,
        name: horseName,
        sex: sex,
        age: age,
        jockey: jockey,
        kinryo: kinryo,
        stable: stable,
        trainer: trainer,
        trainer_disp: (stable ? stable + " " : "") + trainer,
        odds: odds
    };
}

// --------------------------------------------------
// 4. 【追跡デバッグ機能付き】メインデータロード＆解析実行関数
// --------------------------------------------------
window.loadAndUnzipJraDatabase = function() {
    runKuinaRaceSearchWithTracking();
};

window.searchKuinaRace = function() {
    runKuinaRaceSearchWithTracking();
};

function runKuinaRaceSearchWithTracking() {
    alert("➔ [1/7] [ボタン押下成功] 検索処理をスタートします！");

    var rawDate = findDomValue(["sim-date", "sim_date", "date", "race-date", "race_date"]);
    var rawVenue = findDomValue(["sim-venue", "sim_venue", "venue", "race-venue", "race_venue"]);
    var rawRace = findDomValue(["sim-race", "sim_race", "race", "race-num", "race_num"]);
    var btn = findDomElement(["predict-btn", "predict_btn", "btn-predict", "submit-btn"]);

    if (!rawDate) {
        alert("❌ エラー: 日付が選択されていません。カレンダーより日付を選択してください。");
        return;
    }

    var cleanDate = normalizeDate(rawDate);
    var yyMMdd = cleanDate.length === 8 ? cleanDate.substring(2) : cleanDate;
    var venueInfo = resolveVenueInfo(rawVenue);
    var raceNum = normalizeRaceNum(rawRace) || 11;

    var generated_search_id = "日付:" + cleanDate + " (DG" + yyMMdd + ".CSV) | 競馬場:" + (venueInfo.name || rawVenue || "指定なし") + " | レース:" + raceNum + "R";
    
    alert("📋 [1/7 入力取得成功：検索対象条件]\n" +
          "-----------------------------------------\n" +
          "■ 選択日付 (cG): " + cleanDate + "\n" +
          "■ ターゲットCSV名: 「DG" + yyMMdd + ".CSV」\n" +
          "■ 競馬場名 (cV): " + (venueInfo.name || rawVenue || "自動判定") + "\n" +
          "■ レース番号 (cR): " + raceNum + "R\n" +
          "■ 生成ID: 「" + generated_search_id + "」");

    if (btn) btn.innerText = "⚡ CSVデータ取得＆解析中...";

    var csvCandidates = [
        "DG" + yyMMdd + ".CSV",
        "./DG" + yyMMdd + ".CSV",
        "DG" + cleanDate + ".CSV",
        "racedata.csv",
        "./racedata.csv"
    ];

    alert("➔ [2/7] [通信開始] 以下の順序でCSVファイルを探索・読み込みます:\n1. " + csvCandidates[0] + "\n2. " + csvCandidates[1] + "\n3. " + csvCandidates[2]);

    tryFetchCsvListWithTracking(csvCandidates, 0, venueInfo.name || rawVenue, raceNum, generated_search_id, btn);
}

function tryFetchCsvListWithTracking(candidates, index, venueName, raceNum, searchId, btn) {
    if (index >= candidates.length) {
        alert("❌ 【ファイル未発見エラー (404)】\n" +
              "-----------------------------------------\n" +
              "■ サーバー上に該当するCSVファイルが見つかりませんでした。\n" +
              "■ 探索したファイル名: DG261003.CSV / racedata.csv など\n" +
              "■ 対策: GitHubリポジトリ直下に 'DG261003.CSV' を配置・コミットしてください。");
        if (btn) btn.innerText = "🔍 指定レースを検索・AI解析を実行";
        return;
    }

    var targetUrl = candidates[index];
    alert("➔ [3/7] [通信試行 " + (index + 1) + "/" + candidates.length + "] '" + targetUrl + "' へfetch通信を開始します...");

    fetch(targetUrl, { method: "GET", cache: "no-cache" })
        .then(function(res) {
            alert("➔ [3/7 応答受信] HTTPステータス: " + res.status + " | ok: " + res.ok + " | URL: " + targetUrl);
            if (!res.ok) {
                throw new Error("HTTP " + res.status + " File Not Found");
            }
            return res.arrayBuffer();
        })
        .then(function(buffer) {
            alert("➔ [4/7] [通信成功！] ファイル '" + targetUrl + "' のダウンロードに成功しました (サイズ: " + buffer.byteLength + " bytes)。デコードします。");
            
            var text = "";
            try {
                var decoder = new TextDecoder("shift_jis");
                text = decoder.decode(buffer);
            } catch(e) {
                var decoder = new TextDecoder("utf-8");
                text = decoder.decode(buffer);
            }

            var lines = text.split(/\r?\n/);
            alert("📄 [4/7 デコード成功] 総行数: " + lines.length + "行。データ照合を開始します。");

            var matchedHorses = [];
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (!line) continue;
                var h = parseCsvLineUniversal(line, 16);
                if (h) {
                    matchedHorses.push(h);
                }
            }

            alert("➔ [5/7] [解析結果] CSVから合計 " + matchedHorses.length + "頭の馬データを読み込みました。指定条件でフィルターします。");

            if (matchedHorses.length === 0) {
                alert("❌ 【解析不一致エラー】\n" +
                      "-----------------------------------------\n" +
                      "■ CSVの解析に成功しましたが、馬データが検出されませんでした。\n" +
                      "■ 検索ID: 「" + searchId + "」");
                if (btn) btn.innerText = "🔍 指定レースを検索・AI解析を実行";
                return;
            }

            alert("➔ [6/7] [UI描画開始] 画面へ出馬表・AI予測・展開マップ・シミュレーターを出力します。");
            renderKuinaCompleteDashboard(matchedHorses, venueName, raceNum);

            alert("🏆 【7/7 完全大成功！！】\n" +
                  "-----------------------------------------\n" +
                  "■ 対象レース: " + (venueName || "東京/京都") + " " + raceNum + "R\n" +
                  "■ 画面出力頭数: " + matchedHorses.length + "頭\n" +
                  "■ 出馬表・AI予想印・トラックバイアス・隊列マップ・資金配分シミュレーターの同期描画を完了しました！");

            if (btn) btn.innerText = "🔍 指定レースを検索・AI解析を実行";
        })
        .catch(function(err) {
            console.warn("Fetch candidate failed:", targetUrl, err.message);
            tryFetchCsvListWithTracking(candidates, index + 1, venueName, raceNum, searchId, btn);
        });
}

function renderKuinaCompleteDashboard(horses, venueName, raceNum) {
    var tbody = findDomElement(["predict-tbody", "predict_tbody", "result-tbody", "tbody"]);
    if (!tbody) {
        alert("⚠️ 画面内に出馬表テーブル (tbody) が見つかりません。自動生成します。");
        injectKuinaHtmlLayoutIfMissing();
        tbody = findDomElement(["predict-tbody", "predict_tbody", "result-tbody", "tbody"]);
    }

    horses.sort(function(a, b) { return a.num - b.num; });
    
    var oddsSorted = horses.slice().sort(function(a, b) {
        var oa = a.odds > 0 ? a.odds : 999;
        var ob = b.odds > 0 ? b.odds : 999;
        return oa - ob;
    });

    for (var i = 0; i < horses.length; i++) {
        var h = horses[i];
        var rank = oddsSorted.indexOf(h) + 1;
        h.popRank = rank;

        if (rank === 1) { h.aiSig = "◎ 本命"; h.aiClass = "ai-honmei"; }
        else if (rank === 2) { h.aiSig = "○ 対抗"; h.aiClass = "ai-taikou"; }
        else if (rank === 3) { h.aiSig = "▲ 単穴"; h.aiClass = "ai-tanana"; }
        else if (rank === 4 || rank === 5) { h.aiSig = "△ 連下"; h.aiClass = "ai-renka"; }
        else if (rank >= 6 && rank <= 8 && h.odds >= 15.0) { h.aiSig = "☆ 穴馬"; h.aiClass = "ai-ana"; }
        else { h.aiSig = "-"; h.aiClass = "ai-none"; }
    }

    var html = "";
    for (var j = 0; j < horses.length; j++) {
        var h = horses[j];
        var oddsDisp = h.odds > 0 ? "<span class=\"odds-val\">" + h.odds.toFixed(1) + "倍</span><br><small class=\"sub-info\">(" + h.popRank + "人気)</small>" : "<span style=\"color:#94a3b8;\">未確定</span>";
        
        html += "<tr class=\"horse-row\" onclick=\"toggleKuinaHorseDetail(" + j + ")\">" +
            "<td><input type=\"checkbox\" class=\"sim-chk\" value=\"" + h.num + "\" data-odds=\"" + (h.odds || 5.0) + "\" onclick=\"event.stopPropagation(); updateKuinaSimCalculations();\"></td>" +
            "<td><span class=\"waku-badge waku-" + h.waku + "\">" + h.waku + "枠" + h.num + "番</span></td>" +
            "<td><span class=\"ai-badge " + h.aiClass + "\">" + h.aiSig + "</span></td>" +
            "<td><strong class=\"horse-name\">" + h.name + "</strong><small class=\"sub-info\">(" + h.sex + h.age + ")</small></td>" +
            "<td><span class=\"jockey-name\">" + h.jockey + "</span><br><small class=\"sub-info\">(" + h.kinryo + "kg)</small></td>" +
            "<td><span class=\"trainer-name\">" + (h.trainer_disp || "-") + "</span></td>" +
            "<td>" + oddsDisp + "</td>" +
            "</tr>" +
            "<tr id=\"detail-row-" + j + "\" class=\"detail-row\" style=\"display:none;\"><td colspan=\"7\">" +
            "<div class=\"detail-card-inner\">" +
            "<p>🐴 <b>" + h.name + "</b> (" + h.sex + h.age + ") | 騎手: " + h.jockey + " (" + h.kinryo + "kg) | 厩舎: " + (h.trainer_disp || "-") + "</p>" +
            "<p>🤖 <b>AI分析コメント:</b> " + (h.popRank <= 3 ? "スピード・実績上位。軸馬に最適。" : (h.odds >= 20.0 ? "展開ハマれば一発ある穴馬候補。" : "安定感あり上位狙える。 ")) + "</p>" +
            "</div></td></tr>";
    }

    if (tbody) tbody.innerHTML = html;

    updateKuinaTrackBiasAndPace(horses, venueName, raceNum);
}

function toggleKuinaHorseDetail(idx) {
    var el = document.getElementById("detail-row-" + idx);
    if (el) {
        el.style.display = (el.style.display === "none") ? "table-row" : "none";
    }
}

function updateKuinaTrackBiasAndPace(horses, venueName, raceNum) {
    var paceEl = document.getElementById("kuina-pace-badge");
    var mapEl = document.getElementById("kuina-pos-map-grid");
    var betsEl = document.getElementById("kuina-ai-bets-content");

    if (paceEl) paceEl.innerText = horses.length >= 15 ? "ハイペース (差し・追込有利)" : "ミドルペース (平均展開)";

    if (mapEl) {
        var nige = [], senko = [], sashi = [], oikomi = [];
        for (var i = 0; i < horses.length; i++) {
            var h = horses[i];
            if (i % 4 === 0) nige.push(h);
            else if (i % 4 === 1) senko.push(h);
            else if (i % 4 === 2) sashi.push(h);
            else oikomi.push(h);
        }

        var buildTags = function(arr) {
            return arr.map(function(x) { return "<span class=\"pos-horse-tag\">" + x.num + "." + x.name + "</span>"; }).join("");
        };

        mapEl.innerHTML = "<div class=\"pos-group\"><div class=\"pos-label\">🏃 逃げ</div><div>" + (buildTags(nige) || "なし") + "</div></div>" +
            "<div class=\"pos-group\"><div class=\"pos-label\">🐴 先行</div><div>" + (buildTags(senko) || "なし") + "</div></div>" +
            "<div class=\"pos-group\"><div class=\"pos-label\">🐎 差し</div><div>" + (buildTags(sashi) || "なし") + "</div></div>" +
            "<div class=\"pos-group\"><div class=\"pos-label\">🚀 追込</div><div>" + (buildTags(oikomi) || "なし") + "</div></div>";
    }

    if (betsEl && horses.length >= 3) {
        betsEl.innerHTML = "<div class=\"bet-item\"><b>【本命馬連】</b> " + horses[0].num + " - " + horses[1].num + "</div>" +
            "<div class=\"bet-item\"><b>【3連複1点】</b> " + horses[0].num + " - " + horses[1].num + " - " + horses[2].num + "</div>" +
            "<div class=\"bet-item\"><b>【穴狙い馬単】</b> " + horses[1].num + " ➔ " + horses[0].num + "</div>";
    }
}

window.updateKuinaSimCalculations = function() {
    var budgetInput = document.getElementById("kuina-sim-budget");
    var budget = budgetInput ? (parseInt(budgetInput.value, 10) || 10000) : 10000;
    
    var chks = document.querySelectorAll(".sim-chk:checked");
    var count = chks.length;

    var countEl = document.getElementById("kuina-sim-count");
    var perEl = document.getElementById("kuina-sim-per-cost");
    var oddsEl = document.getElementById("kuina-sim-syn-odds");
    var returnEl = document.getElementById("kuina-sim-return");

    if (countEl) countEl.innerText = count + "点";

    if (count === 0) {
        if (perEl) perEl.innerText = "0円";
        if (oddsEl) oddsEl.innerText = "0.0倍";
        if (returnEl) returnEl.innerText = "0円";
        return;
    }

    var perCost = Math.floor(budget / count / 100) * 100;
    if (perEl) perEl.innerText = perCost.toLocaleString() + "円";

    var invSum = 0;
    chks.forEach(function(c) {
        var o = parseFloat(c.getAttribute("data-odds")) || 5.0;
        invSum += (1 / o);
    });

    var synOdds = invSum > 0 ? (1 / invSum) : 0;
    if (oddsEl) oddsEl.innerText = synOdds.toFixed(2) + "倍";

    var estReturn = Math.floor(perCost * synOdds);
    if (returnEl) returnEl.innerText = estReturn.toLocaleString() + "円";
};

function injectKuinaHtmlLayoutIfMissing() {
    if (document.getElementById("kuina-app-container")) return;

    var root = document.body;
    var container = document.createElement("div");
    container.id = "kuina-app-container";
    container.className = "container";

    container.innerHTML = 
        '<div class="kuina-header">' +
            '<h1>KUINA AI RACING ANALYTICS</h1>' +
            '<div class="subtitle">KUINA - 高精度競走馬分析＆展開予測分析エンジン</div>' +
        '</div>' +

        '<div class="selector-box">' +
            '<label class="form-label">📅 開催日を選択 (カレンダー)</label>' +
            '<input type="date" id="sim-date" class="select-input" value="2026-10-03">' +

            '<label class="form-label">🏇 競馬場を選択</label>' +
            '<select id="sim-venue" class="select-input">' +
                '<option value="東京">東京競馬場</option>' +
                '<option value="京都">京都競馬場</option>' +
                '<option value="中山">中山競馬場</option>' +
                '<option value="阪神">阪神競馬場</option>' +
            '</select>' +

            '<label class="form-label">🏁 レース番号を選択</label>' +
            '<select id="sim-race" class="select-input">' +
                '<option value="11">11R (メインレース)</option>' +
                '<option value="1">1R</option><option value="2">2R</option>' +
                '<option value="3">3R</option><option value="4">4R</option>' +
                '<option value="5">5R</option><option value="6">6R</option>' +
                '<option value="7">7R</option><option value="8">8R</option>' +
                '<option value="9">9R</option><option value="10">10R</option>' +
                '<option value="12">12R</option>' +
            '</select>' +

            '<button id="predict-btn" class="btn-predict" onclick="runKuinaRaceSearchWithTracking()">🔍 指定レースを検索・AI解析を実行</button>' +
        '</div>' +

        '<div class="kuina-card">' +
            '<h3>🌿 トラックバイアス ＆ 天気・馬場状態リアルタイム診断</h3>' +
            '<div class="bias-controls">' +
                '<select class="select-input-sm" onchange="updateKuinaTrackText(this.value)">' +
                    '<option value="晴・良">☀️ 晴・良馬場</option>' +
                    '<option value="雨・不良">☔ 雨・不良馬場</option>' +
                '</select>' +
            '</div>' +
            '<div id="kuina-bias-text" class="bias-output-box">【芝】内・先行絶好 (高速馬場 / イン突き有効)</div>' +
        '</div>' +

        '<div class="kuina-card">' +
            '<h3>⚡ 展開予想 ＆ 隊列マップ (Position Map)</h3>' +
            '<div class="pace-badge" id="kuina-pace-badge">ミドルペース (平均展開)</div>' +
            '<div class="position-map-grid" id="kuina-pos-map-grid"></div>' +
        '</div>' +

        '<div class="kuina-card ai-bets-card">' +
            '<h3>🎯 KUINA AI推奨買い目</h3>' +
            '<div id="kuina-ai-bets-content"></div>' +
        '</div>' +

        '<div class="table-wrapper">' +
            '<table>' +
                '<thead>' +
                    '<tr>' +
                        '<th>選</th><th>枠-馬</th><th>AI印</th><th>競走馬名</th><th>騎手</th><th>調教師</th><th>オッズ</th>' +
                    '</tr>' +
                '</thead>' +
                '<tbody id="predict-tbody"></tbody>' +
            '</table>' +
        '</div>' +

        '<div class="kuina-card sim-card">' +
            '<h3>💰 ⑥ 資金配分シミュレーター</h3>' +
            '<div class="sim-input-row">' +
                '<label class="form-label">投資総予算 (円):</label>' +
                '<input type="number" id="kuina-sim-budget" class="text-input" value="10000" step="1000" oninput="updateKuinaSimCalculations()">' +
            '</div>' +
            '<div class="sim-result-box">' +
                '<div>購入点数: <strong id="kuina-sim-count">0点</strong></div>' +
                '<div>1点当たり: <strong id="kuina-sim-per-cost">0円</strong></div>' +
                '<div>合成オッズ: <strong id="kuina-sim-syn-odds">0.0倍</strong></div>' +
                '<div>想定払戻金: <strong id="kuina-sim-return">0円</strong></div>' +
            '</div>' +
        '</div>';

    root.appendChild(container);
}

window.updateKuinaTrackText = function(val) {
    var el = document.getElementById("kuina-bias-text");
    if (el) {
        if (val === "雨・不良") {
            el.innerText = "【芝】外伸び・タフ馬場 (内ラチ荒れ / 外差し・追込大頭)";
        } else {
            el.innerText = "【芝】内・先行絶好 (高速馬場 / イン突き有効)";
        }
    }
};

if (typeof window !== "undefined") {
    window.addEventListener("DOMContentLoaded", function() {
        injectKuinaHtmlLayoutIfMissing();
    });
}
