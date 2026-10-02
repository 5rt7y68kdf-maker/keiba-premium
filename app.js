// 🌪️【JRA CSV出馬表＆ZIP全対応・完全自動レース検索エンジン app.js】

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
// CSV行から競馬場ブロック・馬データを抽出する解析関数
// --------------------------------------------------
function parseCsvContent(text, venueName, raceNum) {
    var lines = text.split(/\r?\n/);
    var rows = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var parts = line.split(",").map(function(p) { return p.replace(/^"|"$/g, "").trim(); });
        if (parts.length >= 8 && parts[7]) {
            rows.push(parts);
        }
    }

    if (rows.length === 0) return null;

    // レースブロックごとの分割 (馬番が1に戻ったタイミングで新規レース)
    var races = [];
    var currentRace = [];
    var prevNum = 999;

    for (var j = 0; j < rows.length; j++) {
        var r = rows[j];
        var num = parseInt(r[2], 10);
        if (isNaN(num)) num = 0;

        if (num <= prevNum && num === 1) {
            if (currentRace.length > 0) races.push(currentRace);
            currentRace = [];
        }
        currentRace.push(r);
        prevNum = num;
    }
    if (currentRace.length > 0) races.push(currentRace);

    if (races.length === 0) return null;

    // 東日本(関東)競馬場 vs 西日本(関西)競馬場の判定
    var kantoVenues = ["東京", "中山", "福島", "新潟", "札幌", "函館"];
    var isKanto = false;
    for (var k = 0; k < kantoVenues.length; k++) {
        if (venueName.indexOf(kantoVenues[k]) !== -1) {
            isKanto = true;
            break;
        }
    }

    var blockIndex = isKanto ? 0 : 1;
    var targetIndex = blockIndex * 12 + (raceNum - 1);

    if (targetIndex >= races.length) {
        targetIndex = raceNum - 1;
    }
    if (targetIndex >= races.length) {
        targetIndex = 0;
    }

    var selectedRace = races[targetIndex];
    var horses = [];

    for (var m = 0; m < selectedRace.length; m++) {
        var row = selectedRace[m];
        var waku = parseInt(row[0], 10) || 1;
        var hNum = parseInt(row[2], 10) || (m + 1);
        var name = row[7];
        var jockey = row[12] || "不明";
        var oddsVal = parseFloat(row[15]);
        if (isNaN(oddsVal)) oddsVal = 0.0;

        horses.push({
            waku: waku,
            num: hNum,
            name: name,
            jockey: jockey,
            odds: oddsVal,
            finishPos: "未確定"
        });
    }

    return horses;
}

// --------------------------------------------------
// 万能 TXT データ解析関数 (バックアップ用)
// --------------------------------------------------
function parseUniversalRaceRow(line, rowIdx) {
    if (!line) return null;
    var tokens = line.split(/[\s,\t|]+/).map(function(t) { return t.trim(); }).filter(Boolean);
    if (tokens.length < 3) return null;

    var lineStr = tokens.join(" ");
    if (lineStr.indexOf("日付") !== -1 || lineStr.toLowerCase().indexOf("date") !== -1 || lineStr.indexOf("競走馬名") !== -1) {
        return null;
    }

    var skipWords = ["ダート", "障害", "リステッド", "スプリンターズ", "フェブラリー", "エリザベス", "チャンピオンズ", "ホープフル", "マイル", "カップ", "レース", "サラ系", "未勝利", "新馬", "1勝クラス", "2勝クラス", "3勝クラス", "オープン", "G1", "G2", "G3"];
    var nameIdx = -1;
    var horseName = "";

    for (var i = 0; i < tokens.length; i++) {
        var cleanT = tokens[i].replace(/\(.*?\)/g, "").trim();
        if (/^[\u30A0-\u30FFー・]{2,9}$/.test(cleanT) && skipWords.indexOf(cleanT) === -1) {
            nameIdx = i;
            horseName = cleanT;
            break;
        }
    }

    if (!horseName) return null;

    var jockey = "不明";
    if (nameIdx + 1 < tokens.length) {
        var jCand = tokens[nameIdx + 1];
        if (!/^\d+(\.\d+)?$/.test(jCand) && jCand.length <= 8 && !/^(牡|牝|セ|牡\d|牝\d|セ\d)$/.test(jCand)) {
            jockey = jCand;
        }
    }

    var numsBefore = [];
    for (var k = nameIdx - 1; k >= 0; k--) {
        if (/^\d{1,2}$/.test(tokens[k])) {
            var v = parseInt(tokens[k], 10);
            if (v >= 1 && v <= 18) {
                numsBefore.push(v);
            }
        }
    }

    var num = 1, waku = 1;
    if (numsBefore.length >= 2) {
        num = numsBefore[0];
        waku = numsBefore[1];
    } else if (numsBefore.length === 1) {
        num = numsBefore[0];
        waku = Math.min(8, Math.ceil((num + 1) / 2));
    } else {
        num = rowIdx + 1;
        waku = Math.min(8, Math.ceil((num + 1) / 2));
    }

    if (waku < 1 || waku > 8) waku = Math.min(8, Math.ceil((num + 1) / 2));

    var odds = 0.0;
    for (var m = tokens.length - 1; m > nameIdx; m--) {
        var rawTok = tokens[m];
        if (rawTok.indexOf("着") !== -1) continue;
        var tok = rawTok.replace("倍", "").replace("円", "").trim();
        if (/^\([+-]?\d+\)$/.test(tok)) continue;
        if (/^\d{1,3}\.\d$/.test(tok)) {
            var f = parseFloat(tok);
            if (!isNaN(f) && f > 0) { odds = f; break; }
        }
    }

    var finishPos = "未確定";
    var mChak = lineStr.match(/(\d{1,2})着/);
    if (mChak) {
        finishPos = mChak[1] + "着";
    }

    return { waku: waku, num: num, name: horseName, jockey: jockey, odds: odds, finishPos: finishPos };
}

// --------------------------------------------------
// メインデータ照合・描画処理
// --------------------------------------------------
function loadAndUnzipJraDatabase() {
    alert("➔ [1/7] [ボタン押下成功] 正常にプログラムが作動しました！");

    var rawDate = findDomValue(["sim-date", "sim_date", "date", "race-date", "race_date"]);
    var rawVenue = findDomValue(["sim-venue", "sim_venue", "venue", "race-venue", "race_venue"]);
    var rawRace = findDomValue(["sim-race", "sim_race", "race", "race-num", "race_num"]);
    var btn = findDomElement(["predict-btn", "predict_btn", "btn-predict", "submit-btn"]);
    var tbody = findDomElement(["predict-tbody", "predict_tbody", "result-tbody", "tbody"]);

    if (!rawDate) { alert("❌ 日付を選択してください"); return; }

    var cG = normalizeDate(rawDate);
    var tVenue = resolveVenueInfo(rawVenue);
    var cR = normalizeRaceNum(rawRace);

    if (btn) btn.innerText = "⚡ CSV / データ照合中...";

    var date6 = cG.length === 8 ? cG.substring(2) : cG;
    var possibleCsvUrls = [
        "DG" + date6 + ".CSV",
        "DG" + date6 + ".csv",
        "DG" + cG + ".CSV",
        "DG" + cG + ".csv"
    ];

    function renderHorses(matched_horses) {
        if (!matched_horses || matched_horses.length === 0) return;

        // 人気順(オッズ順)によるAI推奨印の動的計算
        var sortedByOdds = matched_horses.slice().sort(function(a, b) {
            return (a.odds > 0 ? a.odds : 9999) - (b.odds > 0 ? b.odds : 9999);
        });

        for (var k = 0; k < matched_horses.length; k++) {
            var hObj = matched_horses[k];
            var rank = sortedByOdds.indexOf(hObj);

            if (rank === 0 && hObj.odds > 0) hObj.aiMark = "<span style=\"color:#dc2626;font-weight:bold;\">◎ 本命</span>";
            else if (rank === 1 && hObj.odds > 0) hObj.aiMark = "<span style=\"color:#2563eb;font-weight:bold;\">○ 対抗</span>";
            else if (rank === 2 && hObj.odds > 0) hObj.aiMark = "<span style=\"color:#d97706;font-weight:bold;\">▲ 単穴</span>";
            else if ((rank === 3 || rank === 4) && hObj.odds > 0) hObj.aiMark = "<span style=\"color:#059669;\">△ 連下</span>";
            else hObj.aiMark = "-";
        }

        matched_horses.sort(function(a, b) { return a.num - b.num; });

        var html = "";
        for (var j = 0; j < matched_horses.length; j++) {
            var h = matched_horses[j];
            var odds_disp = (h.odds > 0) ? h.odds + "倍" : "未確定";

            html += "<tr>" +
                    "<td>" + h.waku + "枠" + h.num + "番</td>" +
                    "<td>" + h.aiMark + "</td>" +
                    "<td><b>" + h.name + "</b></td>" +
                    "<td>" + h.jockey + "</td>" +
                    "<td>" + odds_disp + "</td>" +
                    "<td>" + h.finishPos + "</td>" +
                    "</tr>";
        }

        if (tbody) tbody.innerHTML = html;
        alert("🏆 【データ検索成功】 出馬表 " + matched_horses.length + "頭の表示に成功しました！");
        if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
    }

    // CSVからの優先取得試行
    function tryFetchCsv(idx) {
        if (idx >= possibleCsvUrls.length) {
            fallbackToZip();
            return;
        }

        var csvUrl = possibleCsvUrls[idx];
        fetch(csvUrl, { method: "GET", cache: "no-cache" })
            .then(function(res) {
                if (!res.ok) {
                    tryFetchCsv(idx + 1);
                    return null;
                }
                return res.arrayBuffer();
            })
            .then(function(buffer) {
                if (!buffer) return;
                var decoder = new TextDecoder("shift_jis");
                var text = decoder.decode(buffer);
                var horses = parseCsvContent(text, tVenue.name || rawVenue, cR || 11);

                if (horses && horses.length > 0) {
                    renderHorses(horses);
                } else {
                    tryFetchCsv(idx + 1);
                }
            })
            .catch(function() {
                tryFetchCsv(idx + 1);
            });
    }

    // ZIP / TXT データベースへのフォールバック処理
    function fallbackToZip() {
        var target_zip_url = "racedata.zip";
        fetch(target_zip_url, { method: "GET", cache: "no-cache" })
            .then(function(response) {
                if (!response.ok) throw new Error("ZIPファイル取得失敗");
                return response.arrayBuffer();
            })
            .then(async function(buffer) {
                if (typeof JSZip === "undefined") return;
                var zip = await JSZip.loadAsync(buffer);
                var file = null;

                zip.forEach(function (relativePath, zipEntry) {
                    if (relativePath.toLowerCase().indexOf(".txt") !== -1 && !file) file = zipEntry;
                });

                if (!file) return;

                var textBuffer = await file.async("arraybuffer");
                var decoder = new TextDecoder("shift_jis");
                var text = decoder.decode(textBuffer);
                var allLines = text.split("\n");

                var matched_horses = [];
                var validRowCounter = 0;

                for (var i = 0; i < allLines.length; i++) {
                    var line = allLines[i].trim();
                    if (!line) continue;

                    var parsed = parseUniversalRaceRow(line, validRowCounter);
                    if (!parsed) continue;

                    var dateMatch = (!cG || line.indexOf(cG) !== -1 || line.indexOf(cG.substring(2)) !== -1);
                    var venueMatch = (!tVenue.name || line.indexOf(tVenue.name) !== -1 || (tVenue.short && line.indexOf(tVenue.short) !== -1) || (tVenue.code && line.indexOf(tVenue.code) !== -1));
                    var raceMatch = (!cR || line.indexOf(cR + "R") !== -1 || line.indexOf(" " + cR + " ") !== -1 || line.indexOf("第" + cR) !== -1 || (cR === 11 && (line.indexOf("G1") !== -1 || line.indexOf("G2") !== -1 || line.indexOf("G3") !== -1)) || allLines.length <= 30);

                    if (dateMatch && venueMatch && raceMatch) {
                        matched_horses.push(parsed);
                        validRowCounter++;
                    }
                }

                if (matched_horses.length > 0) {
                    renderHorses(matched_horses);
                } else {
                    alert("❌ 該当する馬データが見つかりませんでした。");
                    if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
                }
            })
            .catch(function(err) {
                alert("❌ 処理クラッシュ停止:\n" + err.message);
                if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
            });
    }

    tryFetchCsv(0);
}
