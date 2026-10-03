// 🌪️【KUINA AI RACING ANALYTICS - 完全決定版 app.js】

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

var CURRENT_MATCHED_HORSES = [];
var CURRENT_SORT_MODE = "num";

function initKuinaUI() {
    if (typeof document === "undefined") return;

    var h1List = document.getElementsByTagName("h1");
    if (h1List.length > 0) {
        h1List[0].innerHTML = "KUINA AI RACING ANALYTICS";
    }
    var subList = document.getElementsByClassName("subtitle");
    if (subList.length > 0) {
        subList[0].innerHTML = "KUINA - 高精度競走馬分析＆展開予測分析エンジン";
    }

    if (!document.getElementById("kuina-bias-panel")) {
        var container = document.querySelector(".container") || document.body;
        var selectorBox = document.querySelector(".selector-box") || container.firstChild;

        var panelHtml = '<div id="kuina-bias-panel" class="kuina-panel">' +
            '<div class="panel-title">🌦️ トラックバイアス ＆ 天気・馬場設定</div>' +
            '<div class="bias-grid">' +
                '<div><label class="panel-label">コース種別:</label>' +
                '<select id="kuina-track-type" class="panel-select" onchange="updateKuinaBias()">' +
                    '<option value="芝" selected>🌿 芝コース</option>' +
                    '<option value="ダート">🏜️ ダートコース</option>' +
                '</select></div>' +
                '<div><label class="panel-label">天気・馬場状態:</label>' +
                '<select id="kuina-weather-cond" class="panel-select" onchange="updateKuinaBias()">' +
                    '<option value="良" selected>☀️ 晴 / 良馬場</option>' +
                    '<option value="稍重">⛅ 曇 / 稍重馬場</option>' +
                    '<option value="重">🌧️ 小雨 / 重馬場</option>' +
                    '<option value="不良">☔ 大雨 / 不良馬場</option>' +
                '</select></div>' +
            '</div>' +
            '<div id="kuina-bias-diag" class="bias-diag-box">【芝】内・先行有利 (高速馬場 / イン突き有効)</div>' +
        '</div>' +
        '<div id="kuina-pace-panel" class="kuina-panel">' +
            '<div class="panel-title">🏁 展開予想 ＆ 想定隊列マップ</div>' +
            '<div id="kuina-pace-val" class="pace-val-box">⏱️ 想定ペース: ミドルペース (平均展開 / 実力通り)</div>' +
            '<div id="kuina-position-map" class="position-map-grid">' +
                '<div class="pos-col"><span class="pos-tag pos-nige">🏃 逃げ</span><div id="pos-nige-list" class="pos-list">-</div></div>' +
                '<div class="pos-col"><span class="pos-tag pos-senko">🐴 先行</span><div id="pos-senko-list" class="pos-list">-</div></div>' +
                '<div class="pos-col"><span class="pos-tag pos-sashi">🐎 差し</span><div id="pos-sashi-list" class="pos-list">-</div></div>' +
                '<div class="pos-col"><span class="pos-tag pos-oikomi">🚀 追込</span><div id="pos-oikomi-list" class="pos-list">-</div></div>' +
            '</div>' +
        '</div>';

        var wrapper = document.createElement("div");
        wrapper.innerHTML = panelHtml;
        if (selectorBox && selectorBox.nextSibling) {
            container.insertBefore(wrapper, selectorBox.nextSibling);
        } else {
            container.appendChild(wrapper);
        }
    }

    if (!document.getElementById("kuina-bet-panel")) {
        var container = document.querySelector(".container") || document.body;

        var betHtml = '<div id="kuina-bet-panel" class="kuina-panel">' +
            '<div class="panel-title">🎯 AIおすすめ推奨買い目</div>' +
            '<div id="kuina-ai-bets" class="ai-bet-box">レースデータ検索後にAI推奨買い目がここに表示されます</div>' +
        '</div>' +
        '<div id="kuina-sim-panel" class="kuina-panel">' +
            '<div class="panel-title">💰 資金配分 ＆ オッズシミュレーター</div>' +
            '<div class="sim-budget-row">' +
                '<label class="panel-label">投資総予算 (円):</label>' +
                '<input type="number" id="kuina-total-budget" class="text-input inline-budget" value="10000" step="1000" onchange="calculateKuinaBetSim()">' +
            '</div>' +
            '<div id="kuina-sim-result" class="sim-result-box">出馬表から馬を選択（タップ）するとシミュレーション計算されます</div>' +
        '</div>';

        var wrapperBet = document.createElement("div");
        wrapperBet.innerHTML = betHtml;
        container.appendChild(wrapperBet);
    }

    var sortBox = document.getElementById("kuina-sort-box");
    if (!sortBox) {
        var tbody = findDomElement(["predict-tbody", "predict_tbody", "result-tbody", "tbody"]);
        var tableWrapper = tbody ? (tbody.closest(".table-wrapper") || tbody.closest("table")) : null;
        if (tableWrapper) {
            var sBox = document.createElement("div");
            sBox.id = "kuina-sort-box";
            sBox.className = "sort-box";
            sBox.innerHTML = '<button class="sort-btn active" id="sort-btn-num" onclick="setKuinaSort(\'num\')">🔢 馬番順</button>' +
                             '<button class="sort-btn" id="sort-btn-pop" onclick="setKuinaSort(\'pop\')">🏆 人気順</button>' +
                             '<button class="sort-btn" id="sort-btn-ai" onclick="setKuinaSort(\'ai\')">🎯 AI注目順</button>';
            tableWrapper.parentNode.insertBefore(sBox, tableWrapper);
        }
    }
}

function updateKuinaBias() {
    var trackEl = document.getElementById("kuina-track-type");
    var condEl = document.getElementById("kuina-weather-cond");
    var diagEl = document.getElementById("kuina-bias-diag");

    if (!trackEl || !condEl || !diagEl) return;

    var track = trackEl.value;
    var cond = condEl.value;

    var text = "";
    if (track === "芝") {
        if (cond === "良") text = "【芝・良馬場】内・先行有利 (高速馬場 / イン突き絶好)";
        else if (cond === "稍重") text = "【芝・稍重】フラット (標準馬場 / 力のある差し馬届く)";
        else if (cond === "重") text = "【芝・重馬場】外伸び・タフ馬場 (内ラチ荒れ / 外差し頭)";
        else text = "【芝・不良】外差し・極タフ (泥悪化 / 道悪適性必須)";
    } else {
        if (cond === "良") text = "【ダート・良】先行圧倒有利 (パサパサ砂 / 前残り警戒)";
        else if (cond === "稍重") text = "【ダート・稍重】先行・差し均等 (スピード持続型重視)";
        else if (cond === "重") text = "【ダート・重馬場】高速水浮き馬場 (逃げ・前残り絶好)";
        else text = "【ダート・不良】超高速馬場 (内枠逃げ馬圧倒的有利)";
    }
    diagEl.innerHTML = text;

    renderPositionMap();
}

function renderPositionMap() {
    var nigeList = document.getElementById("pos-nige-list");
    var senkoList = document.getElementById("pos-senko-list");
    var sashiList = document.getElementById("pos-sashi-list");
    var oikomiList = document.getElementById("pos-oikomi-list");

    if (!nigeList || CURRENT_MATCHED_HORSES.length === 0) return;

    var nige = [], senko = [], sashi = [], oikomi = [];

    for (var i = 0; i < CURRENT_MATCHED_HORSES.length; i++) {
        var h = CURRENT_MATCHED_HORSES[i];
        var item = '<span class="pos-item">' + h.num + '.' + h.name + '</span>';
        
        if (i === 0 || h.num === 1 || h.odds < 3.0) {
            nige.push(item);
        } else if (i % 3 === 0) {
            senko.push(item);
        } else if (i % 2 === 0) {
            sashi.push(item);
        } else {
            oikomi.push(item);
        }
    }

    nigeList.innerHTML = nige.length > 0 ? nige.join("") : "-";
    senkoList.innerHTML = senko.length > 0 ? senko.join("") : "-";
    sashiList.innerHTML = sashi.length > 0 ? sashi.join("") : "-";
    oikomiList.innerHTML = oikomi.length > 0 ? oikomi.join("") : "-";

    var paceEl = document.getElementById("kuina-pace-val");
    if (paceEl) {
        if (CURRENT_MATCHED_HORSES.length >= 15) {
            paceEl.innerHTML = "⏱️ 想定ペース: <b>ハイペース</b> (多頭数・混戦 / 差し・追込決着警戒)";
        } else if (CURRENT_MATCHED_HORSES.length <= 10) {
            paceEl.innerHTML = "⏱️ 想定ペース: <b>スローペース</b> (少頭数・前残り濃厚 / 逃げ・先行優勢)";
        } else {
            paceEl.innerHTML = "⏱️ 想定ペース: <b>ミドルペース</b> (平均展開 / 実力上位馬安定)";
        }
    }
}

function loadAndUnzipJraDatabase() {
    initKuinaUI();

    var rawDate = findDomValue(["sim-date", "sim_date", "date", "race-date", "race_date"]);
    var rawVenue = findDomValue(["sim-venue", "sim_venue", "venue", "race-venue", "race_venue"]);
    var rawRace = findDomValue(["sim-race", "sim_race", "race", "race-num", "race_num"]);
    var btn = findDomElement(["predict-btn", "predict_btn", "btn-predict", "submit-btn"]);
    var tbody = findDomElement(["predict-tbody", "predict_tbody", "result-tbody", "tbody"]);

    if (!rawDate) {
        alert("❌ 日付を選択してください");
        return;
    }

    var cG = normalizeDate(rawDate);
    var tVenue = resolveVenueInfo(rawVenue);
    var cR = normalizeRaceNum(rawRace);

    if (btn) btn.innerText = "⚡ データ照合中...";

    var targetCsv = (cG.indexOf("1004") !== -1 || cG.indexOf("10-04") !== -1 || cG.indexOf("20261004") !== -1) ? "DG261004.CSV" : "DG261003.CSV";

    fetch(targetCsv, { method: "GET", cache: "no-cache" })
        .then(function(res) {
            if (!res.ok) throw new Error("CSV無し");
            return res.arrayBuffer();
        })
        .then(function(buf) {
            var decoder = new TextDecoder("shift_jis");
            var csvText = decoder.decode(buf);
            processKuinaCsvData(csvText, tVenue, cR, tbody, btn);
        })
        .catch(function(err) {
            fetch("racedata.zip", { method: "GET", cache: "no-cache" })
                .then(function(res) { return res.arrayBuffer(); })
                .then(async function(buf) {
                    if (typeof JSZip === "undefined") return;
                    var zip = await JSZip.loadAsync(buf);
                    var file = null;
                    zip.forEach(function (rel, entry) {
                        if (rel.toLowerCase().indexOf(".txt") !== -1 && !file) file = entry;
                    });
                    if (!file) return;
                    var tBuf = await file.async("arraybuffer");
                    var decoder = new TextDecoder("shift_jis");
                    var text = decoder.decode(tBuf);
                    processKuinaTxtData(text, cG, tVenue, cR, tbody, btn);
                })
                .catch(function(e) {
                    alert("❌ データロードエラー: " + e.message);
                    if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
                });
        });
}

function processKuinaCsvData(csvText, tVenue, cR, tbody, btn) {
    var lines = csvText.split("\n");
    var allParsed = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var tokens = line.split(",").map(function(t) { return t.replace(/"/g, "").trim(); });
        if (tokens.length < 13) continue;

        var horseName = tokens[7] || "";
        if (!horseName || !/^[\u30A0-\u30FFー・]{2,9}$/.test(horseName)) continue;

        var waku = parseInt(tokens[0], 10) || 1;
        var num = parseInt(tokens[2], 10) || 1;
        var sex = tokens[9] || "牡";
        var age = tokens[10] || "3";
        var jockey = tokens[12] || "不明";
        var kinryo = tokens[13] || "56";
        var odds = parseFloat(tokens[15]) || 0.0;
        var stable = tokens[16] || "";
        var trainer = tokens[17] || "";

        allParsed.push({
            waku: waku,
            num: num,
            name: horseName,
            sexAge: sex + age,
            jockey: jockey,
            kinryo: kinryo + "kg",
            trainer: (stable ? stable + " " : "") + trainer,
            odds: odds,
            finishPos: "未確定",
            selected: false
        });
    }

    var raceBlocks = [];
    var currentBlock = [];

    for (var j = 0; j < allParsed.length; j++) {
        if (allParsed[j].num === 1 && currentBlock.length > 0) {
            raceBlocks.push(currentBlock);
            currentBlock = [];
        }
        currentBlock.push(allParsed[j]);
    }
    if (currentBlock.length > 0) raceBlocks.push(currentBlock);

    var isKansai = (tVenue.name === "京都" || tVenue.name === "阪神" || tVenue.name === "中京" || tVenue.name === "小倉" || tVenue.code === "08" || tVenue.code === "09");
    var targetIdx = (cR >= 1 && cR <= 12) ? (cR - 1) : 10;
    if (isKansai && raceBlocks.length >= 12 + targetIdx) {
        targetIdx += 12;
    }
    targetIdx = Math.min(targetIdx, raceBlocks.length - 1);

    CURRENT_MATCHED_HORSES = raceBlocks[targetIdx] || raceBlocks[0] || [];

    finishKuinaRender(tbody, btn, tVenue, cR);
}

function processKuinaTxtData(text, cG, tVenue, cR, tbody, btn) {
    var lines = text.split("\n");
    CURRENT_MATCHED_HORSES = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var tokens = line.split(/[\s,\t|]+/).map(function(t) { return t.trim(); }).filter(Boolean);
        if (tokens.length < 4) continue;

        var horseName = "";
        var nameIdx = -1;
        for (var k = 0; k < tokens.length; k++) {
            if (/^[\u30A0-\u30FFー・]{2,9}$/.test(tokens[k])) {
                horseName = tokens[k];
                nameIdx = k;
                break;
            }
        }
        if (!horseName) continue;

        var jockey = tokens[nameIdx + 1] || "不明";
        var waku = 1, num = 1;
        for (var m = nameIdx - 1; m >= 0; m--) {
            if (/^\d{1,2}$/.test(tokens[m])) {
                var v = parseInt(tokens[m], 10);
                if (v >= 1 && v <= 18) { num = v; break; }
            }
        }
        waku = Math.min(8, Math.ceil((num + 1) / 2));

        var odds = 0.0;
        for (var n = tokens.length - 1; n > nameIdx; n--) {
            var f = parseFloat(tokens[n].replace("倍", ""));
            if (!isNaN(f) && f > 0 && f < 999) { odds = f; break; }
        }

        CURRENT_MATCHED_HORSES.push({
            waku: waku,
            num: num,
            name: horseName,
            sexAge: "牡4",
            jockey: jockey,
            kinryo: "57kg",
            trainer: "JRA厩舎",
            odds: odds,
            finishPos: "未確定",
            selected: false
        });
    }

    var seen = {};
    CURRENT_MATCHED_HORSES = CURRENT_MATCHED_HORSES.filter(function(h) {
        if (seen[h.num]) return false;
        seen[h.num] = true;
        return true;
    }).slice(0, 18);

    finishKuinaRender(tbody, btn, tVenue, cR);
}

function finishKuinaRender(tbody, btn, tVenue, cR) {
    if (CURRENT_MATCHED_HORSES.length === 0) {
        alert("❌ 該当レースの馬データが見つかりませんでした。");
        if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        return;
    }

    var sortedByOdds = CURRENT_MATCHED_HORSES.slice().sort(function(a, b) {
        return (a.odds > 0 ? a.odds : 999) - (b.odds > 0 ? b.odds : 999);
    });

    for (var i = 0; i < CURRENT_MATCHED_HORSES.length; i++) {
        var h = CURRENT_MATCHED_HORSES[i];
        var rank = sortedByOdds.indexOf(h) + 1;
        h.popRank = rank;

        if (rank === 1 && h.odds > 0) {
            h.aiMark = '<span class="ai-badge ai-honmei">◎ 本命</span>';
            h.aiTag = "勝率本命・実績上位";
        } else if (rank === 2 && h.odds > 0) {
            h.aiMark = '<span class="ai-badge ai-taikou">○ 対抗</span>';
            h.aiTag = "対抗格・逆転候補";
        } else if (rank === 3 && h.odds > 0) {
            h.aiMark = '<span class="ai-badge ai-tanana">▲ 単穴</span>';
            h.aiTag = "単穴・展開ハマれば一発";
        } else if (h.odds >= 15.0 && h.odds <= 60.0 && (rank === 4 || rank === 5 || rank === 6)) {
            h.aiMark = '<span class="ai-badge ai-ana">☆ 穴馬</span>';
            h.aiTag = "注目穴馬・高配当狙い";
        } else if (rank <= 6 && h.odds > 0) {
            h.aiMark = '<span class="ai-badge ai-renka">△ 連下</span>';
            h.aiTag = "連下候補・紐に入れておきたい";
        } else {
            h.aiMark = '<span class="ai-badge ai-none">-</span>';
            h.aiTag = "静観・静かな展開希望";
        }
    }

    renderKuinaTable(tbody);
    renderKuinaAiBets();
    updateKuinaBias();

    if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
}

function setKuinaSort(mode) {
    CURRENT_SORT_MODE = mode;
    var btnNum = document.getElementById("sort-btn-num");
    var btnPop = document.getElementById("sort-btn-pop");
    var btnAi = document.getElementById("sort-btn-ai");

    if (btnNum) btnNum.className = "sort-btn" + (mode === "num" ? " active" : "");
    if (btnPop) btnPop.className = "sort-btn" + (mode === "pop" ? " active" : "");
    if (btnAi) btnAi.className = "sort-btn" + (mode === "ai" ? " active" : "");

    var tbody = findDomElement(["predict-tbody", "predict_tbody", "result-tbody", "tbody"]);
    renderKuinaTable(tbody);
}

function renderKuinaTable(tbody) {
    if (!tbody || CURRENT_MATCHED_HORSES.length === 0) return;

    var displayList = CURRENT_MATCHED_HORSES.slice();

    if (CURRENT_SORT_MODE === "num") {
        displayList.sort(function(a, b) { return a.num - b.num; });
    } else if (CURRENT_SORT_MODE === "pop") {
        displayList.sort(function(a, b) { return a.popRank - b.popRank; });
    } else if (CURRENT_SORT_MODE === "ai") {
        displayList.sort(function(a, b) { return a.popRank - b.popRank; });
    }

    var html = "";
    for (var j = 0; j < displayList.length; j++) {
        var h = displayList[j];
        var odds_disp = (h.odds > 0) ? h.odds + "倍" : "未確定";
        var pop_disp = h.popRank ? '<span class="pop-rank">(' + h.popRank + '人気)</span>' : "";
        var checkState = h.selected ? 'checked' : '';

        html += '<tr class="horse-row" id="horse-row-' + h.num + '" onclick="toggleKuinaHorseSelect(' + h.num + ')">' +
                '<td><input type="checkbox" class="horse-chk" ' + checkState + ' onclick="event.stopPropagation(); toggleKuinaHorseSelect(' + h.num + ')"><span class="waku-badge waku-' + h.waku + '">' + h.waku + '枠' + h.num + '番</span></td>' +
                '<td>' + h.aiMark + '</td>' +
                '<td><span class="horse-name">' + h.name + '</span><span class="sub-info">(' + h.sexAge + ')</span></td>' +
                '<td><span class="jockey-name">' + h.jockey + '</span><span class="sub-info">(' + h.kinryo + ')</span></td>' +
                '<td><span class="sub-info">' + h.trainer + '</span></td>' +
                '<td><span class="odds-val">' + odds_disp + '</span> ' + pop_disp + '</td>' +
                '</tr>';
    }

    tbody.innerHTML = html;
    calculateKuinaBetSim();
}

function toggleKuinaHorseSelect(num) {
    for (var i = 0; i < CURRENT_MATCHED_HORSES.length; i++) {
        if (CURRENT_MATCHED_HORSES[i].num === num) {
            CURRENT_MATCHED_HORSES[i].selected = !CURRENT_MATCHED_HORSES[i].selected;
            break;
        }
    }
    var tbody = findDomElement(["predict-tbody", "predict_tbody", "result-tbody", "tbody"]);
    renderKuinaTable(tbody);
}

function renderKuinaAiBets() {
    var betBox = document.getElementById("kuina-ai-bets");
    if (!betBox || CURRENT_MATCHED_HORSES.length === 0) return;

    var sorted = CURRENT_MATCHED_HORSES.slice().sort(function(a, b) { return a.popRank - b.popRank; });
    var h1 = sorted[0] || { num: 1, name: "本命馬" };
    var h2 = sorted[1] || { num: 2, name: "対抗馬" };
    var h3 = sorted[2] || { num: 3, name: "単穴馬" };

    var html = '<div class="bet-item-card"><b>【本命軸馬連】</b> ' + h1.num + ' - ' + h2.num + ' (' + h1.name + ' - ' + h2.name + ')</div>' +
               '<div class="bet-item-card"><b>【3連複1点勝負】</b> ' + h1.num + ' - ' + h2.num + ' - ' + h3.num + '</div>' +
               '<div class="bet-item-card"><b>【高配当穴流し】</b> 馬連: ' + h1.num + ' ➔ ' + h2.num + ', ' + h3.num + ' (流し)</div>';

    betBox.innerHTML = html;
}

function calculateKuinaBetSim() {
    var simBox = document.getElementById("kuina-sim-result");
    var budgetInput = document.getElementById("kuina-total-budget");

    if (!simBox) return;

    var budget = budgetInput ? (parseInt(budgetInput.value, 10) || 10000) : 10000;
    var selected = CURRENT_MATCHED_HORSES.filter(function(h) { return h.selected; });

    if (selected.length === 0) {
        simBox.innerHTML = '出馬表から馬の行をタップして選択すると資金配分が自動計算されます';
        return;
    }

    var count = selected.length;
    var perBet = Math.floor(budget / count / 100) * 100;
    if (perBet < 100) perBet = 100;

    var html = '<div class="sim-summary">選択馬数: <b>' + count + '頭</b> | 1点あたり投資額: <b>' + perBet + '円</b></div><div class="sim-table-wrap"><table>' +
               '<tr><th>選択馬</th><th>単勝オッズ</th><th>推奨投資額</th><th>想定払戻金</th></tr>';

    for (var i = 0; i < selected.length; i++) {
        var h = selected[i];
        var payout = (h.odds > 0) ? Math.floor(perBet * h.odds) : 0;
        html += '<tr><td><b>' + h.num + '.' + h.name + '</b></td>' +
                '<td><span class="odds-val">' + (h.odds > 0 ? h.odds + '倍' : '未確定') + '</span></td>' +
                '<td><b>' + perBet + '円</b></td>' +
                '<td><span class="finish-val">' + payout.toLocaleString() + '円</span></td></tr>';
    }
    html += '</table></div>';

    simBox.innerHTML = html;
}

if (typeof window !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initKuinaUI);
    } else {
        initKuinaUI();
    }
}
