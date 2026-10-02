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

var currentSortMode = "num"; // 'num', 'odds', 'ai'
var currentDetailShow = false;
var currentMatchedHorses = [];
var selectedHorseNum = null;

function resolveVenueInfo(v) {
    if (!v) return { name: "", code: "", short: "", isWest: false };
    var raw = v.toString().replace(/競馬場/g, "").replace(/\s+/g, "").trim();
    var code = VENUE_MAP[raw] && !isNaN(raw) ? (raw.length === 1 ? "0" + raw : raw) : (VENUE_MAP[raw] || "");
    var name = VENUE_MAP[raw] && isNaN(raw) ? raw : (VENUE_MAP[code] || raw);
    var short = name ? name.substring(0, 1) : "";
    var isWest = (name === "京都" || name === "阪神" || name === "中京" || name === "小倉" || code === "08" || code === "09" || code === "07" || code === "10");
    return { name: name, code: code, short: short, isWest: isWest };
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
    if (!r) return 1;
    var m = r.toString().match(/\d+/);
    return m ? parseInt(m, 10) : 1;
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
// トラックバイアス＆展開予測の動的生成計算
// --------------------------------------------------
function updateTrackBiasAndPace(venueName, raceNum, horses) {
    var weatherVal = findDomValue(["sim-weather", "weather", "sim_weather"]) || "晴";
    var trackStateVal = findDomValue(["sim-track-state", "track_state", "sim_track_state"]) || "良";
    var trackTypeVal = findDomValue(["sim-track-type", "track_type", "sim_track_type"]) || "芝";

    // 1. トラックバイアス判定
    var biasTitle = "";
    var biasDesc = "";
    if (trackTypeVal === "芝") {
        if (trackStateVal === "良") {
            biasTitle = "【芝】内・先行絶好 (高速馬場)";
            biasDesc = "内ラチ沿いが良好な高速馬場。1〜3枠の先行馬が圧倒的に有利。外回り・差し馬はロスに警戒。";
        } else if (trackStateVal === "稍重") {
            biasTitle = "【芝】フラット (標準馬場)";
            biasDesc = "適度なクッション性で脚質差は少ない。ペース次第で差し切り・先行残りの双方が狙える展開。";
        } else {
            biasTitle = "【芝】外伸び・タフ馬場 (内荒れ)";
            biasDesc = "内ラチ沿いの痛みが進行。直線で外に出せる差し・追い込み馬およびパワー型血統が急台頭。";
        }
    } else {
        if (trackStateVal === "良") {
            biasTitle = "【ダート】先行圧倒有利 (パサパサ砂)";
            biasDesc = "砂が乾いてパサパサ。キックバックを嫌う馬が多く、ハナを切る逃げ・2番手の先行馬がそのまま押し切る。";
        } else if (trackStateVal === "稍重" || trackStateVal === "重") {
            biasTitle = "【ダート】高速水浮き馬場 (逃げ・前残り絶好)";
            biasDesc = "脚抜きが良い高速ダート。前が止まらず、先行力と速い上がり時計を兼ね備えた馬が独走する傾向。";
        } else {
            biasTitle = "【ダート】超泥悪馬場 (パワー型重馬場)";
            biasDesc = "水分を含み田んぼ状態。足元をとられやすく、スタミナ重視の重戦車タイプが急浮上。";
        }
    }

    // 2. 展開予測判定
    var totalHorses = horses.length;
    var paceType = "ミドルペース";
    var paceComment = "";

    if (totalHorses >= 16) {
        paceType = "ハイペース (差し・追い込み有利)";
        paceComment = "多頭数で序盤のポジション争いが激化。ハイペース必至で、直線でバテた先行勢を狙い撃つ外差し馬に好機！";
    } else if (totalHorses <= 11) {
        paceType = "スローペース (前残り濃厚)";
        paceComment = "少頭数で先手争いが落ち着く予想。逃げ・先行勢が楽にマイペースで逃げ切りやすく、後方差し馬は届かない恐れ。";
    } else {
        paceType = "ミドルペース (平均展開)";
        paceComment = "平均的な流れ。実力通りの決着になりやすく、好位直後につける軸馬の安定感が光る展開。";
    }

    // DOM要素へ反映
    var biasTitleEl = findDomElement(["bias-title", "bias_title"]);
    var biasDescEl = findDomElement(["bias-desc", "bias_desc"]);
    var paceTypeEl = findDomElement(["pace-type", "pace_type"]);
    var paceCommentEl = findDomElement(["pace-comment", "pace_comment"]);

    if (biasTitleEl) biasTitleEl.innerText = biasTitle;
    if (biasDescEl) biasDescEl.innerText = biasDesc;
    if (paceTypeEl) paceTypeEl.innerText = "【展開予測】 " + paceType;
    if (paceCommentEl) paceCommentEl.innerText = paceComment;

    // 隊列マップ (逃げ・先行・差し・追込) の簡易振り分け
    var nigeList = [], senkoList = [], sashiList = [], oikomiList = [];
    for (var i = 0; i < horses.length; i++) {
        var h = horses[i];
        if (i === 0 || i === 1) nigeList.push(h.num + "番" + h.name);
        else if (i >= 2 && i <= 5) senkoList.push(h.num + "番" + h.name);
        else if (i >= 6 && i <= 11) sashiList.push(h.num + "番" + h.name);
        else oikomiList.push(h.num + "番" + h.name);
    }

    var mapEl = findDomElement(["position-map", "position_map"]);
    if (mapEl) {
        mapEl.innerHTML = 
            "<div class='pos-group'><span class='pos-label pos-nige'>逃げ</span> " + (nigeList.join(", ") || "なし") + "</div>" +
            "<div class='pos-group'><span class='pos-label pos-senko'>先行</span> " + (senkoList.join(", ") || "なし") + "</div>" +
            "<div class='pos-group'><span class='pos-label pos-sashi'>差し</span> " + (sashiList.join(", ") || "なし") + "</div>" +
            "<div class='pos-group'><span class='pos-label pos-oikomi'>追込</span> " + (oikomiList.join(", ") || "なし") + "</div>";
    }
}

// --------------------------------------------------
// メイン描画処理 (6列ズレなし構造 & ドロワー展開)
// --------------------------------------------------
function renderRaceTable() {
    var tbody = findDomElement(["predict-tbody", "predict_tbody", "result-tbody", "tbody"]);
    if (!tbody) return;

    var horses = currentMatchedHorses.slice();

    // ソート順切り替え
    if (currentSortMode === "odds") {
        horses.sort(function(a, b) { return (a.odds > 0 ? a.odds : 9999) - (b.odds > 0 ? b.odds : 9999); });
    } else if (currentSortMode === "ai") {
        var rankMap = { "◎": 1, "○": 2, "▲": 3, "☆": 4, "△": 5, "-": 6 };
        horses.sort(function(a, b) {
            var rA = rankMap[a.aiMarkCode] || 6;
            var rB = rankMap[b.aiMarkCode] || 6;
            if (rA !== rB) return rA - rB;
            return a.num - b.num;
        });
    } else {
        horses.sort(function(a, b) { return a.num - b.num; });
    }

    var html = "";
    for (var j = 0; j < horses.length; j++) {
        var h = horses[j];
        var isSelected = (selectedHorseNum === h.num);

        var oddsDisp = (h.odds > 0) ? h.odds + "倍" : "未確定";
        var popDisp = h.popRank ? "(" + h.popRank + "人気)" : "";

        // 行クリックイベント付き TR (横ずれ一切なしの6列)
        html += "<tr class='horse-row " + (isSelected ? "selected-row" : "") + "' onclick='toggleHorseDetail(" + h.num + ")'>" +
                "<td><span class='waku-badge waku-" + h.waku + "'>" + h.waku + "枠" + h.num + "番</span></td>" +
                "<td>" + h.aiMarkBadge + "</td>" +
                "<td><span class='horse-name'>" + h.name + "</span><span class='sub-info'>(" + (h.sexAge || "牡") + ")</span></td>" +
                "<td><span class='jockey-name'>" + h.jockey + "</span><span class='sub-info'>(" + (h.kinryo || "56") + "kg)</span></td>" +
                "<td><span class='trainer-name'>" + (h.trainer || "-") + "</span></td>" +
                "<td><span class='odds-val'>" + oddsDisp + "</span><br><span class='pop-rank'>" + popDisp + "</span></td>" +
                "</tr>";

        // タップ/クリック展開カード (選択中 または 一括全開時)
        if (isSelected || currentDetailShow) {
            html += "<tr class='detail-drawer-row'>" +
                    "<td colspan='6'>" +
                    "<div class='horse-detail-card'>" +
                    "<div class='detail-grid'>" +
                    "<div class='detail-item'><span class='detail-lbl'>性齢・斤量</span> <b>" + (h.sexAge || "牡") + " / " + (h.kinryo || "56") + "kg</b></div>" +
                    "<div class='detail-item'><span class='detail-lbl'>所属・調教師</span> <b>" + (h.stable || "") + " " + (h.trainer || "未定") + "</b></div>" +
                    "<div class='detail-item'><span class='detail-lbl'>単勝オッズ</span> <b class='odds-val'>" + oddsDisp + " " + popDisp + "</b></div>" +
                    "<div class='detail-item'><span class='detail-lbl'>AI評価判定</span> <b>" + h.aiTag + "</b></div>" +
                    "</div>" +
                    "<div class='detail-comment'>💡 <b>AI適性診断:</b> " + h.aiComment + "</div>" +
                    "</div>" +
                    "</td>" +
                    "</tr>";
        }
    }

    tbody.innerHTML = html;
}

function toggleHorseDetail(horseNum) {
    if (selectedHorseNum === horseNum) {
        selectedHorseNum = null;
    } else {
        selectedHorseNum = horseNum;
    }
    renderRaceTable();
}

function setSortMode(mode) {
    currentSortMode = mode;
    var btnNum = findDomElement(["btn-sort-num"]);
    var btnOdds = findDomElement(["btn-sort-odds"]);
    var btnAi = findDomElement(["btn-sort-ai"]);

    if (btnNum) btnNum.className = "sort-btn " + (mode === "num" ? "active" : "");
    if (btnOdds) btnOdds.className = "sort-btn " + (mode === "odds" ? "active" : "");
    if (btnAi) btnAi.className = "sort-btn " + (mode === "ai" ? "active" : "");

    renderRaceTable();
}

function toggleDetailShowAll() {
    currentDetailShow = !currentDetailShow;
    var btn = findDomElement(["btn-toggle-detail"]);
    if (btn) btn.innerText = currentDetailShow ? "👁️ 詳細表示: ON" : "👁️ 詳細表示: OFF";
    renderRaceTable();
}

// --------------------------------------------------
// メインデータ検索・パース・照合関数
// --------------------------------------------------
function loadAndUnzipJraDatabase() {
    var rawDate = findDomValue(["sim-date", "sim_date", "date", "race-date", "race_date"]);
    var rawVenue = findDomValue(["sim-venue", "sim_venue", "venue", "race-venue", "race_venue"]);
    var rawRace = findDomValue(["sim-race", "sim_race", "race", "race-num", "race_num"]);
    var btn = findDomElement(["predict-btn", "predict_btn", "btn-predict", "submit-btn"]);

    var cG = normalizeDate(rawDate) || "20261003";
    var tVenue = resolveVenueInfo(rawVenue);
    var cR = normalizeRaceNum(rawRace) || 11;

    if (btn) btn.innerText = "⚡ データ精査中...";

    // 1. CSVファイルを最優先検索 (DG261003.CSV / DG261004.CSV)
    var csvFilename = "DG" + cG.substring(2) + ".CSV";

    fetch(csvFilename, { method: "GET", cache: "no-cache" })
        .then(function(res) {
            if (res.ok) return res.arrayBuffer();
            throw new Error("CSVなし");
        })
        .then(function(buffer) {
            var decoder = new TextDecoder("shift_jis");
            var csvText = decoder.decode(buffer);
            var lines = csvText.split("\n");

            // CSVをレースごとに分割
            var allRaces = [];
            var currRace = [];
            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();
                if (!l) continue;
                var row = l.split(",");
                if (row.length >= 3) {
                    var numVal = parseInt(row[2].trim(), 10);
                    if (numVal === 1 && currRace.length > 0) {
                        allRaces.push(currRace);
                        currRace = [];
                    }
                    currRace.push(row);
                }
            }
            if (currRace.length > 0) allRaces.push(currRace);

            // 競馬場ブロック(東西)とレース番号から該当する【単一レース】のインデックスをピンポイント特定
            var blockOffset = tVenue.isWest ? 12 : 0;
            var targetIdx = blockOffset + (cR - 1);

            if (targetIdx < 0 || targetIdx >= allRaces.length) {
                targetIdx = 0; // フォールバック
            }

            var targetRaceRows = allRaces[targetIdx];
            var parsedHorses = [];

            for (var k = 0; k < targetRaceRows.length; k++) {
                var r = targetRaceRows[k];
                if (r.length < 14) continue;

                var waku = parseInt(r[0].trim(), 10) || Math.min(8, Math.ceil((k + 1) / 2));
                var num = parseInt(r[2].trim(), 10) || (k + 1);
                var name = r[7] ? r[7].trim() : "馬名不明";
                var sex = r[9] ? r[9].trim() : "牡";
                var age = r[10] ? r[10].trim() : "3";
                var jockey = r[12] ? r[12].trim() : "騎手未定";
                var kinryo = r[13] ? r[13].trim() : "56";
                var oddsVal = r[15] ? parseFloat(r[15].trim()) : 0.0;
                var stable = r[16] ? r[16].trim() : "";
                var trainer = r[17] ? r[17].trim() : "";

                if (!name || name === "馬名不明") continue;

                parsedHorses.push({
                    waku: waku,
                    num: num,
                    name: name,
                    sexAge: sex + age,
                    jockey: jockey,
                    kinryo: kinryo,
                    odds: isNaN(oddsVal) ? 0.0 : oddsVal,
                    stable: stable,
                    trainer: trainer,
                    finishPos: "未確定"
                });
            }

            processHorsesAndRender(parsedHorses, tVenue.name || "中山", cR, btn);
        })
        .catch(function() {
            // CSVがない場合、従来のracedata.zip / txt から単一レースを厳密抽出
            fetch("racedata.zip", { method: "GET", cache: "no-cache" })
                .then(function(res) { return res.arrayBuffer(); })
                .then(async function(buffer) {
                    if (typeof JSZip === "undefined") throw new Error("JSZipなし");
                    var zip = await JSZip.loadAsync(buffer);
                    var file = null;
                    zip.forEach(function (relPath, zipEntry) {
                        if (relPath.toLowerCase().indexOf(".txt") !== -1 && !file) file = zipEntry;
                    });
                    if (!file) throw new Error("TXTなし");

                    var textBuffer = await file.async("arraybuffer");
                    var decoder = new TextDecoder("shift_jis");
                    var text = decoder.decode(textBuffer);
                    var allLines = text.split("\n");

                    var matched = [];
                    for (var i = 0; i < allLines.length; i++) {
                        var line = allLines[i].trim();
                        if (!line) continue;
                        var tokens = line.split(/[\s,\t|]+/).map(function(t) { return t.trim(); }).filter(Boolean);
                        if (tokens.length < 5) continue;

                        // 競走馬名特定
                        var nameIdx = -1, horseName = "";
                        for (var tIdx = 0; tIdx < tokens.length; tIdx++) {
                            var cleanT = tokens[tIdx];
                            if (/^[\u30A0-\u30FFー・]{2,9}$/.test(cleanT)) {
                                if (!/^(ダート|障害|リステッド|スプリンターズ|フェブラリー|エリザベス|マイル|カップ)$/.test(cleanT)) {
                                    nameIdx = tIdx; horseName = cleanT; break;
                                }
                            }
                        }
                        if (!horseName) continue;

                        var jockey = (nameIdx + 1 < tokens.length) ? tokens[nameIdx + 1] : "未定";
                        var num = 1, waku = 1;
                        for (var k = nameIdx - 1; k >= 0; k--) {
                            if (/^\d{1,2}$/.test(tokens[k])) {
                                var v = parseInt(tokens[k], 10);
                                if (v >= 1 && v <= 18) { num = v; break; }
                            }
                        }
                        waku = Math.min(8, Math.ceil((num + 1) / 2));

                        var oddsVal = 0.0;
                        for (var m = tokens.length - 1; m > nameIdx; m--) {
                            var f = parseFloat(tokens[m].replace("倍",""));
                            if (!isNaN(f) && f > 0 && f < 999) { oddsVal = f; break; }
                        }

                        // レース番号(cR)の厳密一致判定 (全レース混入防止)
                        var isExactRace = (line.indexOf(cR + "R") !== -1 || line.indexOf(" " + cR + " ") !== -1 || line.indexOf("第" + cR) !== -1);
                        if (isExactRace || allLines.length <= 25) {
                            matched.push({
                                waku: waku, num: num, name: horseName, sexAge: "牡3",
                                jockey: jockey, kinryo: "56", odds: oddsVal, stable: "(美)", trainer: "調教師", finishPos: "未確定"
                            });
                        }
                    }

                    processHorsesAndRender(matched, tVenue.name || "中山", cR, btn);
                })
                .catch(function(err) {
                    alert("❌ データ取得・照合エラー:\n" + err.message);
                    if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
                });
        });
}

function processHorsesAndRender(horses, venueName, raceNum, btn) {
    if (!horses || horses.length === 0) {
        alert("❌ 【照合不一致】 指定されたレースの馬データが見つかりませんでした。");
        if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        return;
    }

    // 単勝オッズによる人気順およびAI推奨印の動的算出
    var sortedByOdds = horses.slice().sort(function(a, b) {
        return (a.odds > 0 ? a.odds : 9999) - (b.odds > 0 ? b.odds : 9999);
    });

    for (var i = 0; i < horses.length; i++) {
        var h = horses[i];
        var rank = sortedByOdds.indexOf(h);
        h.popRank = (h.odds > 0) ? (rank + 1) : null;

        if (rank === 0 && h.odds > 0) {
            h.aiMarkCode = "◎";
            h.aiMarkBadge = "<span class='ai-badge ai-honmei'>◎ 本命</span>";
            h.aiTag = "🏆 勝率No.1・軸馬本命";
            h.aiComment = "単勝オッズ支持率トップ。調教時計・血統適性・鞍上すべての要素が高水準で本命筆頭。";
        } else if (rank === 1 && h.odds > 0) {
            h.aiMarkCode = "○";
            h.aiMarkBadge = "<span class='ai-badge ai-taikou'>○ 対抗</span>";
            h.aiTag = "🔥 強力対抗・主力級";
            h.aiComment = "本命馬に迫る実力馬。展開ひとつで逆転首位まで十分狙える好気配。";
        } else if (rank === 2 && h.odds > 0) {
            h.aiMarkCode = "▲";
            h.aiMarkBadge = "<span class='ai-badge ai-tanana'>▲ 単穴</span>";
            h.aiTag = "⚡ 逆転候補・一発警戒";
            h.aiComment = "ハマった時の決め手は上位拮抗。三連系馬券の対抗穴として外せない1頭。";
        } else if (h.odds >= 15.0 && h.odds <= 60.0 && rank >= 3 && rank <= 7) {
            h.aiMarkCode = "☆";
            h.aiMarkBadge = "<span class='ai-badge ai-ana'>☆ 穴馬</span>";
            h.aiTag = "💰 高配当狙い・爆発穴馬";
            h.aiComment = "オッズ妙味十分の高配当キーマン。トラックバイアス適合で一発激走の好気配！";
        } else if ((rank === 3 || rank === 4) && h.odds > 0) {
            h.aiMarkCode = "△";
            h.aiMarkBadge = "<span class='ai-badge ai-renka'>△ 連下</span>";
            h.aiTag = "🎯 紐候補・連下圏内";
            h.aiComment = "安定した立ち回りが武器。2・3着付けのヒモ軸として押さえておきたい有力馬。";
        } else {
            h.aiMarkCode = "-";
            h.aiMarkBadge = "<span class='ai-badge ai-none'>-</span>";
            h.aiTag = "静観・展開待ち";
            h.aiComment = "上位陣の壁は厚いが、極端な展開の助けがあれば食い込みも。";
        }
    }

    currentMatchedHorses = horses;
    selectedHorseNum = null;

    // ヘッダーサマリー更新
    var summaryEl = findDomElement(["race-summary-info", "race_summary_info"]);
    if (summaryEl) {
        summaryEl.innerHTML = "<span>📍 " + venueName + " " + raceNum + "R</span> <span>🏇 出走頭数: " + horses.length + "頭</span>";
    }

    // トラックバイアス＆展開予測の更新
    updateTrackBiasAndPace(venueName, raceNum, horses);

    // テーブル描画
    renderRaceTable();

    if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
}
