// 🌪️【JRA出馬表 & AI予想 高コントラスト・ラグジュアリーデザイン対応 (詳細オンオフ・枠分け選択表示機能搭載) app.js】

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

var currentMatchedHorses = [];
var currentSortMode = "num"; // "num", "odds", "ai"
var showDetailMode = false;  // false: シンプル, true: 全詳細表示
var selectedHorseIndex = -1;

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
// CSV 行位置パーサー
// --------------------------------------------------
function parseCsvRow(row) {
    if (!row || row.length < 13) return null;
    var waku_raw = (row[0] || "").trim();
    var num_raw = (row[2] || "").trim();
    var name = (row[7] || "").trim();
    if (!name || name === "馬名" || name === "仮") return null;

    var sex = (row[9] || "").trim();
    var age = (row[10] || "").trim();
    var jockey = (row[12] || "").trim();
    var kinryo = (row[13] || "").trim();

    var odds = 0.0;
    var stable = "";
    var trainer = "";

    for (var idx = 14; idx < Math.min(21, row.length); idx++) {
        var val = (row[idx] || "").trim();
        var f = parseFloat(val);
        if (!isNaN(f) && f > 0 && odds === 0.0) {
            odds = f;
        } else if (val.indexOf("美") !== -1 || val.indexOf("栗") !== -1 || val.indexOf("外") !== -1) {
            stable = val;
        } else if (val && !trainer && !/^\d+$/.test(val) && val.length <= 10) {
            trainer = val;
        }
    }

    var num = parseInt(num_raw, 10) || 1;
    var waku = parseInt(waku_raw, 10) || Math.min(8, Math.ceil((num + 1) / 2));
    if (waku < 1 || waku > 8) waku = Math.min(8, Math.ceil((num + 1) / 2));

    return {
        waku: waku,
        num: num,
        name: name,
        sex: sex,
        age: age,
        jockey: jockey,
        kinryo: kinryo,
        odds: odds,
        stable: stable,
        trainer: trainer,
        finishPos: "未確定"
    };
}

// --------------------------------------------------
// テキスト行パーサー (フォールバック用)
// --------------------------------------------------
function parseTextRow(line, rowIdx) {
    if (!line) return null;
    var tokens = line.split(/[\s,\t|]+/).map(function(t) { return t.trim(); }).filter(Boolean);
    if (tokens.length < 3) return null;

    var lineStr = tokens.join(" ");
    if (lineStr.indexOf("日付") !== -1 || lineStr.indexOf("競走馬名") !== -1) return null;

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
            if (v >= 1 && v <= 18) numsBefore.push(v);
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
        if (/^\d{1,3}\.\d$/.test(tok)) {
            var f = parseFloat(tok);
            if (!isNaN(f) && f > 0) { odds = f; break; }
        }
    }

    var finishPos = "未確定";
    var mChak = lineStr.match(/(\d{1,2})着/);
    if (mChak) finishPos = mChak[1] + "着";

    return {
        waku: waku,
        num: num,
        name: horseName,
        sex: "牡",
        age: "3",
        jockey: jockey,
        kinryo: "56",
        odds: odds,
        stable: "(美)",
        trainer: "JRA厩舎",
        finishPos: finishPos
    };
}

// --------------------------------------------------
// AI印・人気・スコア計算
// --------------------------------------------------
function computeAiMarksAndRank(horses) {
    var sortedByOdds = horses.slice().sort(function(a, b) {
        return (a.odds > 0 ? a.odds : 9999) - (b.odds > 0 ? b.odds : 9999);
    });

    for (var k = 0; k < horses.length; k++) {
        var h = horses[k];
        var rank = sortedByOdds.indexOf(h);
        h.popRank = (h.odds > 0) ? (rank + 1) : 99;

        if (rank === 0 && h.odds > 0) {
            h.aiMark = "◎ 本命";
            h.aiClass = "badge-honmei";
            h.aiComment = "🏆 単勝1番人気・軸信頼度の高い最有望馬";
            h.aiScore = 95;
        } else if (rank === 1 && h.odds > 0) {
            h.aiMark = "○ 対抗";
            h.aiClass = "badge-taikou";
            h.aiComment = "⚔️ 逆転対抗筆頭・上位争い濃厚な有力馬";
            h.aiScore = 88;
        } else if (rank === 2 && h.odds > 0) {
            h.aiMark = "▲ 単穴";
            h.aiClass = "badge-tanana";
            h.aiComment = "🎯 展開ひとつで突き抜け警戒の一発馬";
            h.aiScore = 82;
        } else if (h.odds >= 15.0 && h.odds <= 60.0 && rank < 8) {
            h.aiMark = "☆ 穴馬";
            h.aiClass = "badge-ana";
            h.aiComment = "🔥 爆発的な高配当が見込める注目穴馬！";
            h.aiScore = 78;
        } else if (rank <= 5 && h.odds > 0) {
            h.aiMark = "△ 連下";
            h.aiClass = "badge-renka";
            h.aiComment = "☘️ 連下候補・ヒモ穴として警戒が必要な一頭";
            h.aiScore = 72;
        } else {
            h.aiMark = "-";
            h.aiClass = "badge-none";
            h.aiComment = "静観・展開の助けが必要な伏兵馬";
            h.aiScore = 50;
        }
    }
}

// --------------------------------------------------
// ソート切替
// --------------------------------------------------
function setSortMode(mode) {
    currentSortMode = mode;
    var btnNum = findDomElement(["btn-sort-num"]);
    var btnOdds = findDomElement(["btn-sort-odds"]);
    var btnAi = findDomElement(["btn-sort-ai"]);

    if (btnNum) btnNum.className = (mode === "num") ? "sort-btn active" : "sort-btn";
    if (btnOdds) btnOdds.className = (mode === "odds") ? "sort-btn active" : "sort-btn";
    if (btnAi) btnAi.className = (mode === "ai") ? "sort-btn active" : "sort-btn";

    renderHorseTable();
}

// --------------------------------------------------
// 詳細表示切り替え (ON/OFF)
// --------------------------------------------------
function toggleDetailMode() {
    showDetailMode = !showDetailMode;
    var btnToggle = findDomElement(["btn-toggle-detail"]);
    if (btnToggle) {
        btnToggle.innerText = showDetailMode ? "👁️ 詳細表示: ON" : "👁️ 詳細表示: OFF";
        btnToggle.className = showDetailMode ? "toggle-detail-btn active" : "toggle-detail-btn";
    }
    renderHorseTable();
}

// --------------------------------------------------
// 馬行タップ・クリック選択
// --------------------------------------------------
function selectHorseRow(index) {
    if (selectedHorseIndex === index) {
        selectedHorseIndex = -1;
    } else {
        selectedHorseIndex = index;
    }
    renderHorseTable();
}

// --------------------------------------------------
// テーブルレンダリング (枠分け & 詳細選択表示完全対応)
// --------------------------------------------------
function renderHorseTable() {
    var tbody = findDomElement(["predict-tbody", "predict_tbody", "result-tbody", "tbody"]);
    if (!tbody) return;

    var list = currentMatchedHorses.slice();

    if (currentSortMode === "num") {
        list.sort(function(a, b) { return a.num - b.num; });
    } else if (currentSortMode === "odds") {
        list.sort(function(a, b) { return (a.odds > 0 ? a.odds : 9999) - (b.odds > 0 ? b.odds : 9999); });
    } else if (currentSortMode === "ai") {
        list.sort(function(a, b) { return b.aiScore - a.aiScore; });
    }

    var html = "";

    for (var j = 0; j < list.length; j++) {
        var h = list[j];
        var isSelected = (selectedHorseIndex === j);
        var rowClass = isSelected ? "horse-row selected-row" : "horse-row";

        var oddsDisp = (h.odds > 0) ? h.odds.toFixed(1) + "倍" : "未確定";
        var popDisp = (h.popRank <= 18) ? '<span class="pop-rank">(' + h.popRank + '人気)</span>' : '';

        // 性齢・斤量・調教師サブ表示
        var sexAgeStr = (h.sex || "") + (h.age || "");
        var subHorseInfo = (showDetailMode || isSelected) && sexAgeStr ? '<div class="sub-cell-info"><span class="badge-sub-info">' + sexAgeStr + '</span></div>' : '';
        var subJockeyInfo = (showDetailMode || isSelected) && h.kinryo ? '<div class="sub-cell-info"><span class="badge-sub-info">' + h.kinryo + 'kg</span></div>' : '';
        var subTrainerInfo = (showDetailMode || isSelected) && (h.trainer || h.stable) ? '<div class="sub-cell-info"><span class="badge-sub-trainer">' + (h.stable || '') + ' ' + (h.trainer || '') + '</span></div>' : '';

        html += '<tr class="' + rowClass + '" onclick="selectHorseRow(' + j + ')">' +
                '<td class="cell-waku-num">' +
                    '<span class="waku-badge waku-' + h.waku + '">' + h.waku + '枠</span>' +
                    '<b class="num-text">' + h.num + '番</b>' +
                '</td>' +
                '<td class="cell-ai"><span class="ai-badge ' + h.aiClass + '">' + h.aiMark + '</span></td>' +
                '<td class="cell-horse">' +
                    '<div class="horse-name-text">' + h.name + '</div>' +
                    subHorseInfo +
                '</td>' +
                '<td class="cell-jockey">' +
                    '<div class="jockey-name-text">' + h.jockey + '</div>' +
                    subJockeyInfo +
                    subTrainerInfo +
                '</td>' +
                '<td class="cell-odds">' +
                    '<div class="odds-value">' + oddsDisp + '</div>' +
                    popDisp +
                '</td>' +
                '<td class="cell-finish"><span class="finish-text">' + h.finishPos + '</span></td>' +
                '</tr>';

        // 選択時に展開する「🐴 詳細分析カード (枠分け拡張ドロワー)」
        if (isSelected) {
            html += '<tr class="detail-drawer-row">' +
                    '<td colspan="6" class="detail-drawer-cell">' +
                        '<div class="selected-detail-card">' +
                            '<div class="card-header">' +
                                '<span class="card-title">🐴 【馬詳細・AI分析】 ' + h.waku + '枠' + h.num + '番 <b>' + h.name + '</b></span>' +
                                '<span class="card-badge ' + h.aiClass + '">' + h.aiMark + '</span>' +
                            '</div>' +
                            '<div class="card-grid">' +
                                '<div class="grid-box"><span class="lbl">性齢 / 斤量</span><span class="val">' + sexAgeStr + ' / ' + h.kinryo + 'kg</span></div>' +
                                '<div class="grid-box"><span class="lbl">騎手</span><span class="val">' + h.jockey + '</span></div>' +
                                '<div class="grid-box"><span class="lbl">厩舎 / 調教師</span><span class="val">' + (h.stable || '') + ' ' + (h.trainer || '未登録') + '</span></div>' +
                                '<div class="grid-box"><span class="lbl">単勝オッズ / 人気</span><span class="val gold-txt">' + oddsDisp + ' (' + h.popRank + '番人気)</span></div>' +
                            '</div>' +
                            '<div class="card-footer-ai">' +
                                '<span class="ai-lbl">🤖 AI診断:</span> ' + h.aiComment +
                            '</div>' +
                        '</div>' +
                    '</td>' +
                    '</tr>';
        }
    }

    tbody.innerHTML = html;
}

// --------------------------------------------------
// メイン検索実行
// --------------------------------------------------
function loadAndUnzipJraDatabase() {
    var rawDate = findDomValue(["sim-date", "sim_date", "date", "race-date", "race_date"]);
    var rawVenue = findDomValue(["sim-venue", "sim_venue", "venue", "race-venue", "race_venue"]);
    var rawRace = findDomValue(["sim-race", "sim_race", "race", "race-num", "race_num"]);
    var btn = findDomElement(["predict-btn", "predict_btn", "btn-predict", "submit-btn"]);

    if (!rawDate) { alert("❌ 日付を選択してください"); return; }

    var cG = normalizeDate(rawDate);
    var tVenue = resolveVenueInfo(rawVenue);
    var cR = normalizeRaceNum(rawRace);

    if (btn) btn.innerText = "⚡ データ解析中...";

    var csvName = "DG" + cG.substring(2) + ".CSV";

    fetch(csvName, { method: "GET", cache: "no-cache" })
        .then(function(res) {
            if (res.ok) return res.text();
            throw new Error("CSVなし");
        })
        .then(function(csvText) {
            parseAndRenderCsvData(csvText, tVenue, cR);
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        })
        .catch(function() {
            fetch("racedata.zip", { method: "GET", cache: "no-cache" })
                .then(function(res2) {
                    if (!res2.ok) throw new Error("ZIPなし");
                    return res2.arrayBuffer();
                })
                .then(async function(buffer) {
                    if (typeof JSZip === "undefined") return;
                    var zip = await JSZip.loadAsync(buffer);
                    var file = null;
                    zip.forEach(function(relPath, entry) {
                        if (relPath.toLowerCase().indexOf(".txt") !== -1 && !file) file = entry;
                    });
                    if (!file) return;
                    var textBuffer = await file.async("arraybuffer");
                    var decoder = new TextDecoder("shift_jis");
                    var text = decoder.decode(textBuffer);
                    parseAndRenderTextData(text, cG, tVenue, cR);
                    if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
                })
                .catch(function(err) {
                    alert("❌ データ読み込み失敗: " + err.message);
                    if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
                });
        });
}

function parseAndRenderCsvData(csvText, tVenue, cR) {
    var lines = csvText.split("\n");
    var parsedHorses = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var cols = line.split(",").map(function(c) { return c.replace(/^"/, "").replace(/"$/, "").trim(); });
        var h = parseCsvRow(cols);
        if (h) parsedHorses.push(h);
    }

    if (parsedHorses.length === 0) {
        alert("❌ CSV内の該当レースデータが見つかりませんでした。");
        return;
    }

    var raceBlocks = [];
    var currentBlock = [];
    for (var k = 0; k < parsedHorses.length; k++) {
        var hObj = parsedHorses[k];
        if (k > 0 && hObj.num === 1 && currentBlock.length > 0) {
            raceBlocks.push(currentBlock);
            currentBlock = [];
        }
        currentBlock.push(hObj);
    }
    if (currentBlock.length > 0) raceBlocks.push(currentBlock);

    var targetBlockIndex = 0;
    if (cR >= 1 && cR <= 12) {
        if (tVenue.name === "京都" || tVenue.name === "阪神" || tVenue.name === "中京" || tVenue.name === "小倉") {
            targetBlockIndex = Math.min(raceBlocks.length - 1, (cR - 1) + 12);
        } else {
            targetBlockIndex = Math.min(raceBlocks.length - 1, cR - 1);
        }
    }

    currentMatchedHorses = raceBlocks[targetBlockIndex] || parsedHorses;
    computeAiMarksAndRank(currentMatchedHorses);
    selectedHorseIndex = -1;
    renderHorseTable();
}

function parseAndRenderTextData(textText, cG, tVenue, cR) {
    var lines = textText.split("\n");
    var matched = [];
    var validCounter = 0;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var h = parseTextRow(line, validCounter);
        if (!h) continue;

        var dateMatch = (!cG || line.indexOf(cG) !== -1 || line.indexOf(cG.substring(2)) !== -1);
        var venueMatch = (!tVenue.name || line.indexOf(tVenue.name) !== -1 || (tVenue.short && line.indexOf(tVenue.short) !== -1));
        var raceMatch = (!cR || line.indexOf(cR + "R") !== -1 || line.indexOf("第" + cR) !== -1 || lines.length <= 30);

        if (dateMatch && venueMatch && raceMatch) {
            matched.push(h);
            validCounter++;
        }
    }

    currentMatchedHorses = matched;
    computeAiMarksAndRank(currentMatchedHorses);
    selectedHorseIndex = -1;
    renderHorseTable();
}
