// 🌪️ KUINA AI RACING ANALYTICS - 高精度JRAデータ解析エンジン & ダッシュボード統合モデル

// KUINA タイトル＆サブタイトル自動適用処理
if (typeof document !== "undefined") {
    var updateHeader = function() {
        var h1El = document.querySelector("h1");
        if (h1El) h1El.innerHTML = "🦅 KUINA AI RACING ANALYTICS";
        var subEl = document.querySelector(".subtitle");
        if (subEl) subEl.innerHTML = "🔥 競馬データベース完全開通 ＆ KUINA AIリアルタイム展開・資金配分";
    };
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", updateHeader);
    } else {
        updateHeader();
    }
}

var VENUE_MAPPING = {
    "東京": { name: "東京", code: "05", venueIdx: 1 },
    "中山": { name: "中山", code: "06", venueIdx: 1 },
    "京都": { name: "京都", code: "08", venueIdx: 2 },
    "阪神": { name: "阪神", code: "09", venueIdx: 2 },
    "中京": { name: "中京", code: "07", venueIdx: 2 },
    "新潟": { name: "新潟", code: "04", venueIdx: 1 },
    "福島": { name: "福島", code: "03", venueIdx: 1 },
    "小倉": { name: "小倉", code: "10", venueIdx: 2 },
    "札幌": { name: "札幌", code: "01", venueIdx: 1 },
    "函館": { name: "函館", code: "02", venueIdx: 1 }
};

function normalizeVenue(str) {
    if (!str) return "東京";
    var s = str.toString();
    for (var v in VENUE_MAPPING) {
        if (s.indexOf(v) !== -1 || s.indexOf(VENUE_MAPPING[v].code) !== -1) {
            return v;
        }
    }
    return "東京";
}

function normalizeDateStr(str) {
    if (!str) return "";
    var clean = str.toString().replace(/[-/]/g, "").trim();
    if (clean.length === 6) clean = "20" + clean;
    return clean;
}

function parseRaceNum(str) {
    if (!str) return 1;
    var m = str.toString().match(/\d+/);
    return m ? parseInt(m[0], 10) : 1;
}

// CSVパース関数
function parseCsvData(csvText, fileName, targetDate, targetVenue, targetRace) {
    var lines = csvText.split(/\r?\n/);
    var horses = [];

    var isDgFile = (fileName.toUpperCase().indexOf("DG") !== -1 || fileName.indexOf("1003") !== -1 || fileName.indexOf("1004") !== -1);

    if (isDgFile) {
        // DG形式 (DG261003.CSV / DG261004.CSV)
        var vInfo = VENUE_MAPPING[targetVenue] || { venueIdx: 1 };
        var calcRaceTarget = (vInfo.venueIdx === 2) ? (targetRace + 12) : targetRace;

        var currentRace = 1;
        var prevNum = 0;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line || line.indexOf("枠番") !== -1) continue;

            var parts = line.split(",").map(function(p) { return p.trim(); });
            if (parts.length >= 8 && /^\d+$/.test(parts[0])) {
                var waku = parseInt(parts[0], 10) || 1;
                var num = parts[2] && /^\d+$/.test(parts[2]) ? parseInt(parts[2], 10) : 1;
                var name = parts[7] || "";

                if (name) {
                    if (num <= prevNum && prevNum > 0) {
                        currentRace++;
                    }
                    prevNum = num;

                    if (currentRace === calcRaceTarget || currentRace === targetRace) {
                        var sex = parts[9] || "牡";
                        var age = parts[10] || "3";
                        var jockey = parts[12] || "未定";
                        var kinryo = parts[13] || "55";
                        var oddsVal = parts[15] ? parseFloat(parts[15].replace("倍","")) : 0.0;
                        if (isNaN(oddsVal)) oddsVal = 0.0;
                        var trainer = parts[17] || "";

                        horses.push({
                            waku: waku,
                            num: num,
                            name: name,
                            sex_age: sex + age,
                            jockey: jockey,
                            kinryo: kinryo,
                            odds: oddsVal,
                            trainer: trainer
                        });
                    }
                }
            }
        }
    } else {
        // 2025-2026.csv 形式
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line || line.indexOf("日付") !== -1 || line.indexOf("date") !== -1) continue;

            var tokens = line.split(/[\s,\t|]+/).filter(Boolean);
            if (tokens.length < 6) continue;

            var lineDate = tokens[0].replace(/[-/]/g, "").trim();
            if (lineDate.length === 6) lineDate = "20" + lineDate;

            if (lineDate !== targetDate) continue;

            var lineVenue = normalizeVenue(tokens[1]);
            if (lineVenue !== targetVenue) continue;

            var lineRace = parseRaceNum(tokens[2]);
            if (lineRace !== targetRace) continue;

            var waku = parseInt(tokens[3], 10) || 1;
            var num = parseInt(tokens[4], 10) || 1;
            var name = tokens[5] || "競走馬";
            var jockey = tokens[6] || "騎手";
            var oddsVal = parseFloat(tokens[7]) || 0.0;
            var trainer = tokens[8] || "";

            horses.push({
                waku: waku,
                num: num,
                name: name,
                sex_age: "牡3",
                jockey: jockey,
                kinryo: "55",
                odds: oddsVal,
                trainer: trainer
            });
        }
    }

    horses.sort(function(a, b) { return a.num - b.num; });
    return horses;
}

// テーブルレンダリング機能
function renderRaceTable(tbodyEl, horses) {
    if (!tbodyEl) {
        tbodyEl = document.getElementById("predict-tbody") || document.getElementById("tbody");
    }
    if (!tbodyEl) return;

    var html = "";
    for (var i = 0; i < horses.length; i++) {
        var h = horses[i];
        
        var aiMark = "-";
        if (h.odds > 0 && h.odds <= 3.5) {
            aiMark = "<span class='badge-win'>◎ 本命</span>";
        } else if (h.odds > 3.5 && h.odds <= 7.0) {
            aiMark = "<span class='badge-place'>〇 対抗</span>";
        } else if (h.odds > 7.0 && h.odds <= 12.0) {
            aiMark = "<span style='color:#d4af37;font-weight:bold;'>▲ 単穴</span>";
        } else if (h.odds > 12.0 && h.odds <= 20.0) {
            aiMark = "<span style='color:#a855f7;font-weight:bold;'>△ 連下</span>";
        }

        var oddsStr = (h.odds > 0) ? h.odds.toFixed(1) + "倍" : "未確定";

        html += "<tr>";
        html += "<td style='font-weight:bold;'>" + h.waku + "枠" + h.num + "番</td>";
        html += "<td>" + aiMark + "</td>";
        html += "<td><b style='color:#fff;font-size:1.02rem;'>" + h.name + "</b><br><small style='color:#888;'>" + h.sex_age + "</small></td>";
        html += "<td>" + h.jockey + "</td>";
        html += "<td>" + h.trainer + "</td>";
        html += "<td style='color:#d4af37;font-weight:bold;font-size:1.05rem;'>" + oddsStr + "</td>";
        html += "</tr>";
    }

    tbodyEl.innerHTML = html;
}

// ダッシュボード・コンポーネント更新機能
function updateDashboardComponents(venue, raceNum, horses) {
    renderFundSimulator(horses);
}

// ⑥ 資金配分シミュレーター
function renderFundSimulator(horses) {
    var simCard = document.getElementById("fund-simulator-card");
    if (!simCard) {
        simCard = document.createElement("div");
        simCard.id = "fund-simulator-card";
        simCard.className = "prediction-box";
        var container = document.querySelector(".container") || document.body;
        container.appendChild(simCard);
    }

    var html = "<h3 style='color:#d4af37;margin-top:0;'>💰 ⑥ 資金配分シミュレーター</h3>";
    html += "<div style='display:flex;gap:10px;align-items:center;margin-bottom:12px;'>";
    html += "<label style='color:#aaa;font-size:0.9rem;'>総予算(円): </label>";
    html += "<input type='number' id='total-budget' value='10000' step='1000' onchange='calculateAllocation()' style='width:120px;padding:6px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;text-align:right;'>";
    html += "</div>";

    html += "<div style='max-height:200px;overflow-y:auto;background:#111;padding:8px;border-radius:8px;border:1px solid #333;'>";
    for (var i = 0; i < horses.length; i++) {
        var h = horses[i];
        var checked = (i < 3) ? "checked" : "";
        html += "<div style='display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #222;'>";
        html += "<label><input type='checkbox' class='sim-horse-chk' value='" + h.odds + "' data-num='" + h.num + "' data-name='" + h.name + "' " + checked + " onchange='calculateAllocation()'> " + h.num + "番 " + h.name + "</label>";
        html += "<span style='color:#d4af37;font-weight:bold;'>" + (h.odds > 0 ? h.odds.toFixed(1) + "倍" : "-") + "</span>";
        html += "</div>";
    }
    html += "</div>";

    html += "<div id='sim-result' style='margin-top:12px;padding:10px;background:#221d10;border:1px solid #d4af37;border-radius:8px;font-size:0.9rem;'>";
    html += "計算中...";
    html += "</div>";

    simCard.innerHTML = html;
    calculateAllocation();
}

// 資金配分リアルタイム計算
function calculateAllocation() {
    var budgetEl = document.getElementById("total-budget");
    var totalBudget = budgetEl ? (parseInt(budgetEl.value, 10) || 10000) : 10000;

    var chks = document.querySelectorAll(".sim-horse-chk");
    var selected = [];
    var invOddsSum = 0;

    chks.forEach(function(chk) {
        if (chk.checked) {
            var odds = parseFloat(chk.value) || 0;
            if (odds > 0) {
                var num = chk.getAttribute("data-num");
                var name = chk.getAttribute("data-name");
                selected.push({ num: num, name: name, odds: odds });
                invOddsSum += (1.0 / odds);
            }
        }
    });

    var resEl = document.getElementById("sim-result");
    if (!resEl) return;

    if (selected.length === 0 || invOddsSum === 0) {
        resEl.innerHTML = "<span style='color:#888;'>対象の馬を選択してください</span>";
        return;
    }

    var synthOdds = (1.0 / invOddsSum).toFixed(2);
    var expReturn = Math.floor(totalBudget * synthOdds);

    var resHtml = "<b>合成オッズ: <span style='color:#d4af37;font-size:1.1rem;'>" + synthOdds + "倍</span></b>";
    resHtml += " | 想定払戻: <span style='color:#22c55e;font-weight:bold;'>" + expReturn.toLocaleString() + "円</span><br><br>";
    resHtml += "<table style='width:100%;font-size:0.8rem;'><tr><th>馬番/馬名</th><th>オッズ</th><th>推奨購入額</th><th>想定的中時払戻</th></tr>";

    selected.forEach(function(s) {
        var bet = Math.round((totalBudget * (1.0 / s.odds) / invOddsSum) / 100) * 100;
        var payout = Math.floor(bet * s.odds);
        resHtml += "<tr><td>" + s.num + "番 " + s.name + "</td><td>" + s.odds.toFixed(1) + "倍</td><td><b>" + bet.toLocaleString() + "円</b></td><td>" + payout.toLocaleString() + "円</td></tr>";
    });
    resHtml += "</table>";

    resEl.innerHTML = resHtml;
}

// エラー通知バナー
function showErrorNotice(msg) {
    var banner = document.getElementById("error-banner");
    if (!banner) {
        banner = document.createElement("div");
        banner.id = "error-banner";
        banner.style.cssText = "background:#7f1d1d;color:#fca5a5;padding:12px;border-radius:8px;margin-top:15px;border:1px solid #ef4444;text-align:center;font-weight:bold;font-size:0.9rem;";
        var container = document.querySelector(".container") || document.body;
        container.appendChild(banner);
    }
    banner.innerText = "⚠️ " + msg;
    banner.style.display = "block";
}

// メイン実行関数
async function loadAndUnzipJraDatabase() {
    var banner = document.getElementById("error-banner");
    if (banner) banner.style.display = "none";

    var dateEl = document.getElementById("sim-date") || document.getElementById("date");
    var venueEl = document.getElementById("sim-venue") || document.getElementById("venue");
    var raceEl = document.getElementById("sim-race") || document.getElementById("race");
    var btnEl = document.getElementById("predict-btn") || document.getElementById("btn-predict");
    var tbodyEl = document.getElementById("predict-tbody") || document.getElementById("tbody");

    var rawDate = dateEl ? dateEl.value : "2026-10-03";
    var rawVenue = venueEl ? venueEl.value : "東京";
    var rawRace = raceEl ? raceEl.value : "11";

    var cG = normalizeDateStr(rawDate);
    var cV = normalizeVenue(rawVenue);
    var cR = parseRaceNum(rawRace);

    if (btnEl) btnEl.innerText = "⚡ データ照合中...";

    var targetFile = "2025-2026.csv";
    if (cG === "20261003") {
        targetFile = "DG261003.CSV";
    } else if (cG === "20261004") {
        targetFile = "DG261004.CSV";
    }

    try {
        var response = await fetch(targetFile, { method: "GET", cache: "no-cache" });
        if (!response.ok) {
            var altName = (targetFile === "DG261003.CSV") ? "DG261003.csv" : (targetFile === "DG261004.CSV" ? "DG261004.csv" : "2025-2026.csv");
            response = await fetch(altName, { method: "GET", cache: "no-cache" });
        }

        // 過去日付フォールバック
        if (!response.ok && targetFile !== "2025-2026.csv") {
            response = await fetch("2025-2026.csv", { method: "GET", cache: "no-cache" });
            targetFile = "2025-2026.csv";
        }

        if (!response.ok) {
            if (btnEl) btnEl.innerText = "🧠 指定レースのデータ検索を実行";
            showErrorNotice("対象ファイル (" + targetFile + ") の読み込みに失敗しました。ファイルがサーバー上に正しく配置されているかご確認ください。");
            return;
        }

        var buffer = await response.arrayBuffer();
        var decoder = new TextDecoder("shift_jis");
        var csvText = decoder.decode(buffer);

        var horses = parseCsvData(csvText, targetFile, cG, cV, cR);

        if (!horses || horses.length === 0) {
            if (btnEl) btnEl.innerText = "🧠 指定レースのデータ検索を実行";
            showErrorNotice("選択条件 (日付: " + cG + " / 競馬場: " + cV + " / " + cR + "R) に合致する出走馬データが見つかりませんでした。");
            return;
        }

        renderRaceTable(tbodyEl, horses);
        updateDashboardComponents(cV, cR, horses);

        if (btnEl) btnEl.innerText = "🧠 指定レースのデータ検索を実行";
    } catch (err) {
        console.error("データ処理エラー:", err);
        if (btnEl) btnEl.innerText = "🧠 指定レースのデータ検索を実行";
        showErrorNotice("処理実行エラー: " + err.message);
    }
}
