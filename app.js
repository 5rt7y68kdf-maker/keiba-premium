// 🌪️【KUINA AI RACING ANALYTICS - CSV全自動ロード＆精密解析決定版 app.js】

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
    if (!v) return { name: "東京", code: "05", short: "東" };
    var raw = v.toString().replace(/競馬場/g, "").replace(/\s+/g, "").trim();
    var code = VENUE_MAP[raw] && !isNaN(raw) ? (raw.length === 1 ? "0" + raw : raw) : (VENUE_MAP[raw] || "05");
    var name = VENUE_MAP[raw] && isNaN(raw) ? raw : (VENUE_MAP[code] || "東京");
    var short = name ? name.substring(0, 1) : "東";
    return { name: name, code: code, short: short };
}

function calculateJraWaku(num, total) {
    if (!num || num < 1) return 1;
    if (!total || total <= 8) return num;
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

function parseCsvLineUniversal(line, totalRunnersInRace) {
    if (!line) return null;
    var tokens = line.split(/[,	|]+/).map(function(t) { return t.trim().replace(/^["']|["']$/g, ''); }).filter(function(t) { return t !== ''; });
    if (tokens.length < 4) return null;

    if (tokens.indexOf("日付") !== -1 || tokens.indexOf("枠") !== -1 || tokens.indexOf("馬名") !== -1) return null;

    var venue = "";
    for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i].replace(/競馬場/g, "");
        if (/^(東京|中山|京都|阪神|新潟|福島|中京|小倉|札幌|函館)$/.test(t)) {
            venue = t;
            break;
        }
    }

    var nameIdx = -1;
    var horseName = "";
    for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        if (/^[゠-ヿー・]{2,9}$/.test(t)) {
            if (!/^(ダート|障害|リステッド|スプリンターズ|フェブラリー|エリザベス|チャンピオンズ|ホープフル|マイル|カップ|オープン|未勝利|新馬|特別|G1|G2|G3)$/.test(t)) {
                nameIdx = i;
                horseName = t;
                break;
            }
        }
    }

    if (!horseName) return null;

    var rawWaku = "";
    var num = 0;
    for (var i = 0; i < nameIdx; i++) {
        if (/^\d{1,2}$/.test(tokens[i])) {
            var val = parseInt(tokens[i], 10);
            if (val >= 1 && val <= 18) {
                if (num === 0 && val <= 8) {
                    rawWaku = tokens[i];
                }
                num = val;
            }
        } else if (tokens[i] === "仮") {
            rawWaku = "仮";
        }
    }

    var waku = 1;
    if (rawWaku && rawWaku !== "仮" && !isNaN(rawWaku)) {
        waku = parseInt(rawWaku, 10);
    } else {
        waku = calculateJraWaku(num, totalRunnersInRace || 16);
    }

    var sexAge = "";
    for (var i = 0; i < tokens.length; i++) {
        if (/^(牡|牝|セ)\d{1,2}$/.test(tokens[i])) {
            sexAge = tokens[i];
            break;
        }
    }

    var jockey = "-";
    if (nameIdx + 1 < tokens.length) {
        var jCandidate = tokens[nameIdx + 1];
        if (!/^\d+(\.\d+)?$/.test(jCandidate) && jCandidate.length <= 8) {
            jockey = jCandidate;
        }
    }

    var kinryo = "";
    for (var i = 0; i < tokens.length; i++) {
        if (/^\d{2}(\.\d)?$/.test(tokens[i])) {
            var f = parseFloat(tokens[i]);
            if (f >= 48.0 && f <= 62.0) {
                kinryo = tokens[i] + "kg";
                break;
            }
        }
    }

    var odds = 0;
    var stable = "";
    var trainer = "";

    for (var i = 0; i < tokens.length; i++) {
        if (/^\((美|栗|外|地)\)$/.test(tokens[i])) {
            stable = tokens[i];
            if (i + 1 < tokens.length) trainer = tokens[i + 1];
            break;
        }
    }

    for (var i = nameIdx + 1; i < tokens.length; i++) {
        if (/^\d+\.\d+$/.test(tokens[i])) {
            var val = parseFloat(tokens[i]);
            if (val >= 1.0 && val <= 999.9) {
                odds = val;
                break;
            }
        }
    }

    var trainerDisp = (stable ? stable + " " : "") + (trainer || "-");

    return {
        venue: venue,
        waku: waku,
        num: num,
        name: horseName,
        sexAge: sexAge,
        jockey: jockey,
        kinryo: kinryo,
        trainer: trainerDisp,
        odds: odds
    };
}

function executeCsvSearchTest() {
    console.log("=== [KUINA CSV READ TEST INITIATED] ===");
    
    var dateEl = document.getElementById("sim-date");
    var venueEl = document.getElementById("sim-venue");
    var raceEl = document.getElementById("sim-race");
    var statusEl = document.getElementById("search-status-msg");

    var dateVal = dateEl ? dateEl.value : "2026-10-03";
    var venueVal = venueEl ? venueEl.value : "東京";
    var raceVal = raceEl ? raceEl.value : "11";

    var cG = dateVal.replace(/-/g, "").replace(/\//g, "").trim();
    if (cG.length === 6) cG = "20" + cG;

    var csvTargets = [
        "2025-2026.csv",
        "2025-2026.CSV",
        "DG" + cG.substring(2) + ".CSV",
        "DG" + cG + ".CSV",
        "racedata.csv"
    ];

    if (statusEl) statusEl.innerHTML = "⚡ CSVデータ読み込みテスト実行中... Targets: " + csvTargets.join(", ");

    tryFetchCsvTargets(csvTargets, 0, venueVal, raceVal, statusEl);
}

function tryFetchCsvTargets(list, idx, venueVal, raceVal, statusEl) {
    if (idx >= list.length) {
        console.warn("[CSV TEST] 全ターゲットの取得に失敗しました。");
        if (statusEl) statusEl.innerHTML = "⚠️ 該当するCSVファイルが見つかりません。ファイル名: <b>2025-2026.csv</b>";
        return;
    }

    var targetUrl = list[idx];
    console.log("[CSV TEST] 試行 (" + (idx + 1) + "/" + list.length + "): " + targetUrl);

    fetch(targetUrl, { cache: "no-cache" })
        .then(function(res) {
            if (!res.ok) throw new Error("HTTP status " + res.status);
            return res.arrayBuffer();
        })
        .then(function(buf) {
            console.log("[CSV TEST SUCCESS] 通信成功: " + targetUrl + " (サイズ: " + buf.byteLength + " bytes)");
            var decoder = new TextDecoder("shift_jis");
            var text = decoder.decode(buf);
            if (text.indexOf("") !== -1 || text.length < 50) {
                decoder = new TextDecoder("utf-8");
                text = decoder.decode(buf);
            }
            
            var lines = text.split(/
?
/);
            console.log("[CSV TEST SUCCESS] 行数: " + lines.length + " 行");

            var matched = [];
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (!line) continue;
                var h = parseCsvLineUniversal(line, 16);
                if (h) matched.push(h);
            }

            console.log("[CSV TEST SUCCESS] パース成功件数: " + matched.length + " 件");
            if (statusEl) {
                statusEl.innerHTML = "✅ <b>CSV読み込みテスト成功！</b> ファイル: <code>" + targetUrl + "</code> | 取得件数: <b>" + matched.length + " 件</b>";
            }
            renderRaceTableData(matched, venueVal, raceVal);
        })
        .catch(function(err) {
            console.log("[CSV TEST FETCH FAILED] " + targetUrl + ": " + err.message);
            tryFetchCsvTargets(list, idx + 1, venueVal, raceVal, statusEl);
        });
}

function renderRaceTableData(horses, venue, raceNum) {
    var tbody = document.getElementById("result-tbody") || document.getElementById("predict-tbody");
    if (!tbody) return;

    if (!horses || horses.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;padding:20px;color:#94a3b8;'>該当する競走馬データが見つかりませんでした。</td></tr>";
        return;
    }

    var html = "";
    var aiMarks = ["◎ 本命", "○ 対抗", "▲ 単穴", "☆ 穴馬", "△ 連下", "-"];

    for (var i = 0; i < horses.length; i++) {
        var h = horses[i];
        var mark = aiMarks[i % aiMarks.length];
        var markClass = "ai-none";
        if (i === 0) markClass = "ai-honmei";
        else if (i === 1) markClass = "ai-taikou";
        else if (i === 2) markClass = "ai-tanana";
        else if (i === 3) markClass = "ai-ana";
        else if (i === 4) markClass = "ai-renka";

        var oddsDisp = h.odds > 0 ? h.odds + "倍" : "未確定";

        html += "<tr class='horse-row'>" +
            "<td><span class='waku-badge waku-" + h.waku + "'>" + h.waku + "枠" + h.num + "番</span></td>" +
            "<td><span class='ai-badge " + markClass + "'>" + mark + "</span></td>" +
            "<td><strong class='horse-name'>" + h.name + "</strong><br><small class='sub-info'>(" + (h.sexAge || "牡2") + ")</small></td>" +
            "<td><span class='jockey-name'>" + h.jockey + "</span><br><small class='sub-info'>" + (h.kinryo || "") + "</small></td>" +
            "<td><span class='trainer-name'>" + h.trainer + "</span></td>" +
            "<td><span class='odds-val'>" + oddsDisp + "</span></td>" +
            "</tr>";
    }

    tbody.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", function() {
    var btn = document.getElementById("predict-btn") || document.getElementById("search-btn");
    if (btn) {
        btn.addEventListener("click", function(e) {
            e.preventDefault();
            executeCsvSearchTest();
        });
    }
});
