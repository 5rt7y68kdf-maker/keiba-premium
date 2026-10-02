// 🌪️【JRA 競馬AI出馬表プロ - 機能拡張1,2,3完全統合版 app.js】
// 1. 表示項目の拡張（性齢・斤量・調教師・人気順・ヘダーサマリー）
// 2. AI推奨印アルゴリズムの強化（◎本命〜△連下に加え、高配当を狙う「☆ 穴馬」・AI判定コメント動的生成）
// 3. UI機能強化（「馬番順」「人気順」「AI注目順」の1タップソート切替 ＆ 1R〜12Rクイック選択ボタン）

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

// 全局状態管理
var currentSortMode = "num"; // 'num' | 'odds' | 'ai'
var rawMatchedHorses = [];
var currentRaceHeaderInfo = { venue: "", raceNum: 11, count: 0, dateStr: "" };

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
// 1. CSV 行パース処理 (提案1: 詳細データ抽出対応)
// --------------------------------------------------
function parseCsvRow(row, defaultWaku) {
    if (!row || row.length < 13) return null;

    var waku = parseInt(row[0], 10) || defaultWaku || 1;
    var num = parseInt(row[2], 10) || 1;
    var name = row[7] ? row[7].trim() : "";
    var sex = row[9] ? row[9].trim() : "";
    var age = row[10] ? row[10].trim() : "";
    var jockey = row[12] ? row[12].trim() : "不明";
    var kinryo = row[13] ? row[13].trim() : "";
    var oddsStr = row[15] ? row[15].trim() : "";
    var affiliation = row[16] ? row[16].trim() : "";
    var trainer = row[17] ? row[17].trim() : "";

    if (!name || name === "競走馬名") return null;

    var odds = parseFloat(oddsStr);
    if (isNaN(odds) || odds <= 0) odds = 0.0;

    return {
        waku: waku,
        num: num,
        name: name,
        sexAge: (sex + age) || "-",
        jockey: jockey,
        kinryo: kinryo ? kinryo + "kg" : "-",
        trainer: (affiliation + " " + trainer).trim() || "-",
        odds: odds,
        finishPos: "未確定"
    };
}

// テキスト行パース処理 (バックアップフォールバック)
function parseTextRow(line, rowIdx) {
    if (!line) return null;
    var tokens = line.split(/[\s,\t|]+/).map(function(t) { return t.trim(); }).filter(Boolean);
    if (tokens.length < 3) return null;

    var lineStr = tokens.join(" ");
    if (lineStr.indexOf("日付") !== -1 || lineStr.indexOf("競走馬名") !== -1) return null;

    var skipWords = ["ダート", "障害", "リステッド", "スプリンターズ", "フェブラリー", "エリザベス", "チャンピオンズ", "ホープフル", "マイル", "カップ", "オープン", "G1", "G2", "G3"];
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

    var odds = 0.0;
    for (var m = tokens.length - 1; m > nameIdx; m--) {
        var tok = tokens[m].replace("倍", "").trim();
        if (/^\d{1,3}\.\d$/.test(tok)) {
            var f = parseFloat(tok);
            if (!isNaN(f) && f > 0) { odds = f; break; }
        }
    }

    return {
        waku: waku,
        num: num,
        name: horseName,
        sexAge: "-",
        jockey: jockey,
        kinryo: "-",
        trainer: "-",
        odds: odds,
        finishPos: "未確定"
    };
}

// --------------------------------------------------
// 2. AIアルゴリズム判定処理 (提案2: 高度印付け & 穴馬☆検出 & AIコメント)
// --------------------------------------------------
function applyAiAnalysis(horses) {
    if (!horses || horses.length === 0) return;

    // 単勝オッズ順にソート（人気順判定）
    var sortedByOdds = horses.slice().sort(function(a, b) {
        var oA = a.odds > 0 ? a.odds : 9999;
        var oB = b.odds > 0 ? b.odds : 9999;
        return oA - oB;
    });

    for (var i = 0; i < horses.length; i++) {
        var h = horses[i];
        var rank = sortedByOdds.indexOf(h) + 1; // 1人気〜
        h.popularityRank = (h.odds > 0) ? rank : "-";

        if (h.odds > 0) {
            if (rank === 1) {
                h.aiMark = '<span style="color:#dc2626;font-weight:bold;">◎ 本命</span>';
                h.aiNote = '<span style="background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold;">🏆 勝率本命・主力級</span>';
            } else if (rank === 2) {
                h.aiMark = '<span style="color:#2563eb;font-weight:bold;">○ 対抗</span>';
                h.aiNote = '<span style="background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold;">🥈 対抗筆頭・高信頼</span>';
            } else if (rank === 3) {
                h.aiMark = '<span style="color:#d97706;font-weight:bold;">▲ 単穴</span>';
                h.aiNote = '<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold;">🥉 単穴一転・好気配</span>';
            } else if (rank === 4 || rank === 5) {
                h.aiMark = '<span style="color:#059669;font-weight:bold;">△ 連下</span>';
                h.aiNote = '<span style="background:#d1fae5;color:#065f46;padding:2px 6px;border-radius:4px;font-size:11px;">連下押さえ候補</span>';
            } else if (h.odds >= 15.0 && h.odds <= 60.0 && /ルメール|川田|武豊|横山武|坂井|松山|戸崎|岩田|デム/.test(h.jockey)) {
                // 鞍上強力＋オッズ15〜60倍 ＝ 「☆ 穴馬」
                h.aiMark = '<span style="color:#7c3aed;font-weight:bold;">☆ 穴馬</span>';
                h.aiNote = '<span style="background:#ede9fe;color:#5b21b6;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold;">🔥 注目穴馬・高配当狙い</span>';
            } else {
                h.aiMark = "-";
                h.aiNote = "";
            }
        } else {
            h.aiMark = "-";
            h.aiNote = "";
        }
    }
}

// --------------------------------------------------
// 3. 画面描画 & UIコントロール構造 (提案3: ワンタップソート & レース切替UI)
// --------------------------------------------------
function renderRaceTable() {
    var tbody = findDomElement(["predict-tbody", "predict_tbody", "result-tbody", "tbody"]);
    if (!tbody || !rawMatchedHorses || rawMatchedHorses.length === 0) return;

    var displayHorses = rawMatchedHorses.slice();

    // ソート処理
    if (currentSortMode === "odds") {
        displayHorses.sort(function(a, b) {
            var oA = a.odds > 0 ? a.odds : 9999;
            var oB = b.odds > 0 ? b.odds : 9999;
            return oA - oB;
        });
    } else if (currentSortMode === "ai") {
        var markPriority = { "◎ 本命": 1, "○ 対抗": 2, "▲ 単穴": 3, "☆ 穴馬": 4, "△ 連下": 5, "-": 6 };
        displayHorses.sort(function(a, b) {
            var pA = markPriority[a.aiMark.replace(/<[^>]+>/g, "")] || 6;
            var pB = markPriority[b.aiMark.replace(/<[^>]+>/g, "")] || 6;
            if (pA !== pB) return pA - pB;
            return a.num - b.num;
        });
    } else {
        // デフォルト: 馬番順
        displayHorses.sort(function(a, b) { return a.num - b.num; });
    }

    var html = "";
    for (var j = 0; j < displayHorses.length; j++) {
        var h = displayHorses[j];
        var oddsDisp = (h.odds > 0) ? "<b>" + h.odds + "倍</b> <span style=\"color:#6b7280;font-size:12px;\">(" + h.popularityRank + "人気)</span>" : "<span style=\"color:#9ca3af;\">未確定</span>";

        html += "<tr>" +
                "<td style=\"text-align:center;\"><b>" + h.waku + "枠" + h.num + "番</b></td>" +
                "<td style=\"text-align:center;\">" + h.aiMark + "</td>" +
                "<td><b>" + h.name + "</b> <span style=\"color:#6b7280;font-size:12px;\">(" + h.sexAge + ")</span>" + (h.aiNote ? "<br>" + h.aiNote : "") + "</td>" +
                "<td><b>" + h.jockey + "</b> <span style=\"color:#4b5563;font-size:12px;\">(" + h.kinryo + ")</span></td>" +
                "<td><small style=\"color:#6b7280;\">" + h.trainer + "</small></td>" +
                "<td style=\"text-align:right;\">" + oddsDisp + "</td>" +
                "<td style=\"text-align:center;\">" + h.finishPos + "</td>" +
                "</tr>";
    }

    tbody.innerHTML = html;
}

// UI拡張エリアの埋め込み (ワンタップ切替コントロール)
function injectUiControls(currentRaceNum) {
    var container = findDomElement(["ui-controls-area", "predict-controls", "race-controls"]);
    if (!container) {
        var tbody = findDomElement(["predict-tbody", "predict_tbody", "result-tbody", "tbody"]);
        if (tbody && tbody.parentElement) {
            var parent = tbody.parentElement;
            container = document.createElement("div");
            container.id = "ui-controls-area";
            container.style.cssText = "margin: 12px 0; padding: 14px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);";
            parent.parentElement.insertBefore(container, parent);
        }
    }

    if (!container) return;

    var btnStyle = "padding:6px 14px; margin-right:6px; margin-bottom:6px; border:1px solid #cbd5e1; background:#ffffff; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; color:#334155; transition:all 0.15s ease;";
    var activeBtnStyle = "padding:6px 14px; margin-right:6px; margin-bottom:6px; border:1px solid #2563eb; background:#2563eb; color:#ffffff; border-radius:6px; cursor:pointer; font-size:13px; font-weight:700; box-shadow: 0 2px 4px rgba(37,99,235,0.25);";

    var html = '<div style="margin-bottom:8px; font-size:14px; font-weight:bold; color:#1e293b; display:flex; align-items:center; gap:8px;">';
    html += '<span>📊 レースサマリー:</span> <span style="color:#2563eb;">' + (currentRaceHeaderInfo.venue || "") + " " + currentRaceNum + 'R</span> <span style="color:#64748b; font-size:13px; font-weight:normal;">(' + rawMatchedHorses.length + '頭立)</span>';
    html += '</div>';

    html += '<div style="margin-bottom:10px; display:flex; flex-wrap:wrap; align-items:center; gap:6px;">';
    html += '<span style="font-size:13px; font-weight:bold; color:#475569; margin-right:4px;">🔀 並び替え:</span> ';
    html += '<button id="sort-btn-num" style="' + (currentSortMode === "num" ? activeBtnStyle : btnStyle) + '">🔢 馬番順</button>';
    html += '<button id="sort-btn-odds" style="' + (currentSortMode === "odds" ? activeBtnStyle : btnStyle) + '">🏆 人気順</button>';
    html += '<button id="sort-btn-ai" style="' + (currentSortMode === "ai" ? activeBtnStyle : btnStyle) + '">🎯 AI注目順</button>';
    html += '</div>';

    html += '<div style="display:flex; flex-wrap:wrap; align-items:center; gap:4px;">';
    html += '<span style="font-size:13px; font-weight:bold; color:#475569; margin-right:4px;">🏇 レース切替:</span> ';
    for (var r = 1; r <= 12; r++) {
        var isCur = (r === currentRaceNum);
        html += '<button class="race-quick-btn" data-race="' + r + '" style="' + (isCur ? activeBtnStyle : btnStyle) + '">' + r + 'R</button>';
    }
    html += '</div>';

    container.innerHTML = html;

    // ソートボタンイベントのバインド
    var bNum = document.getElementById("sort-btn-num");
    var bOdds = document.getElementById("sort-btn-odds");
    var bAi = document.getElementById("sort-btn-ai");

    if (bNum) bNum.onclick = function() { currentSortMode = "num"; injectUiControls(currentRaceNum); renderRaceTable(); };
    if (bOdds) bOdds.onclick = function() { currentSortMode = "odds"; injectUiControls(currentRaceNum); renderRaceTable(); };
    if (bAi) bAi.onclick = function() { currentSortMode = "ai"; injectUiControls(currentRaceNum); renderRaceTable(); };

    // レース選択クイックボタンのバインド
    var qBtns = container.getElementsByClassName("race-quick-btn");
    for (var k = 0; k < qBtns.length; k++) {
        qBtns[k].onclick = function() {
            var selectedR = parseInt(this.getAttribute("data-race"), 10);
            var raceInput = findDomElement(["sim-race", "sim_race", "race", "race-num", "race_num"]);
            if (raceInput) raceInput.value = selectedR;
            loadAndUnzipJraDatabase();
        };
    }
}

// --------------------------------------------------
// メイン処理 (CSV・ZIP 統括読み込み)
// --------------------------------------------------
function loadAndUnzipJraDatabase() {
    var rawDate = findDomValue(["sim-date", "sim_date", "date", "race-date", "race_date"]);
    var rawVenue = findDomValue(["sim-venue", "sim_venue", "venue", "race-venue", "race_venue"]);
    var rawRace = findDomValue(["sim-race", "sim_race", "race", "race-num", "race_num"]);
    var btn = findDomElement(["predict-btn", "predict_btn", "btn-predict", "submit-btn"]);

    if (!rawDate) {
        alert("❌ 日付を選択してください");
        return;
    }

    var cG = normalizeDate(rawDate);
    var tVenue = resolveVenueInfo(rawVenue);
    var cR = normalizeRaceNum(rawRace) || 11;

    if (btn) btn.innerText = "⚡ データ自動解析中...";

    currentRaceHeaderInfo = { venue: tVenue.name || rawVenue, raceNum: cR, count: 0, dateStr: cG };

    var csvName = "DG" + cG.substring(2) + ".CSV";

    fetch(csvName, { method: "GET", cache: "no-cache" })
        .then(function(res) {
            if (!res.ok) throw new Error("CSVなし");
            return res.arrayBuffer();
        })
        .then(function(buffer) {
            var decoder = new TextDecoder("shift_jis");
            var text = decoder.decode(buffer);
            processCsvContent(text, tVenue, cR, btn);
        })
        .catch(function() {
            var targetZip = "racedata.zip";
            fetch(targetZip, { method: "GET", cache: "no-cache" })
                .then(function(res) {
                    if (!res.ok) throw new Error("ZIP取得失敗");
                    return res.arrayBuffer();
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
                    processTextContent(text, cG, tVenue, cR, btn);
                })
                .catch(function(err) {
                    alert("❌ 読み込み失敗: " + err.message);
                    if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
                });
        });
}

function processCsvContent(text, tVenue, cR, btn) {
    var lines = text.split(/\r?\n/);
    var allRows = [];

    for (var i = 0; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        var parts = lines[i].split(",").map(function(s) { return s.replace(/^"|"$/g, "").trim(); });
        allRows.push(parts);
    }

    var blockIndex = (tVenue.name === "中山" || tVenue.name === "東京" || tVenue.name === "福島" || tVenue.name === "新潟" || tVenue.name === "札幌" || tVenue.name === "函館") ? 0 : 1;
    
    var raceMap = {};
    var currentRace = 1;
    var prevNum = 0;

    for (var j = 0; j < allRows.length; j++) {
        var row = allRows[j];
        if (row.length < 13) continue;

        var num = parseInt(row[2], 10) || 0;
        var waku = parseInt(row[0], 10) || 1;

        if (num === 1 && prevNum > 1) {
            currentRace++;
        }

        if (!raceMap[currentRace]) raceMap[currentRace] = [];
        var parsed = parseCsvRow(row, waku);
        if (parsed) raceMap[currentRace].push(parsed);

        prevNum = num;
    }

    var targetRaceKey = (blockIndex === 1 && raceMap[cR + 12]) ? (cR + 12) : cR;
    rawMatchedHorses = raceMap[targetRaceKey] || raceMap[cR] || [];

    if (rawMatchedHorses.length === 0) {
        alert("❌ 対象レースの馬データが見つかりませんでした。");
        if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        return;
    }

    applyAiAnalysis(rawMatchedHorses);
    injectUiControls(cR);
    renderRaceTable();

    if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
}

function processTextContent(text, cG, tVenue, cR, btn) {
    var lines = text.split(/\r?\n/);
    rawMatchedHorses = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;

        var parsed = parseTextRow(line, rawMatchedHorses.length);
        if (!parsed) continue;

        var dateMatch = (!cG || line.indexOf(cG) !== -1 || line.indexOf(cG.substring(2)) !== -1);
        var venueMatch = (!tVenue.name || line.indexOf(tVenue.name) !== -1 || (tVenue.short && line.indexOf(tVenue.short) !== -1));
        var raceMatch = (!cR || line.indexOf(cR + "R") !== -1 || line.indexOf(" " + cR + " ") !== -1 || lines.length <= 30);

        if (dateMatch && venueMatch && raceMatch) {
            rawMatchedHorses.push(parsed);
        }
    }

    if (rawMatchedHorses.length === 0) {
        alert("❌ データが見つかりませんでした。");
        if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        return;
    }

    applyAiAnalysis(rawMatchedHorses);
    injectUiControls(cR);
    renderRaceTable();

    if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
}
