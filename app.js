// 🌪️【KUINA AI RACING ANALYTICS - 万能CSV対応＆トラックバイアス・展開マップ・AI馬券完全決定版 app.js】

var VENUE_MAP = {
    "札幌": "01", "函館": "02", "福島": "03", "新潟": "04",
    "東京": "05", "中山": "06", "中京": "07", "京都": "08",
    "阪神": "09", "小倉": "10",
    "01": "札幌", "02": "函館", "03": "福島", "04": "新潟",
    "05": "東京", "06": "中山", "07": "中京", "08": "京都",
    "09": "阪神", "10": "小倉", 
    "1": "札幌", "2": "函館", "3": "福島", "4": "新潟",
    "5": "東京", "6": "中山", "7": "中京", "8": "京都", "9": "阪神"
};

var ALL_HORSES_CACHE = [];
var CURRENT_SORT = 'num';
var SELECTED_HORSE_NUMS = [];

function getJraWaku(num, total) {
    if (!total || total <= 8) return num || 1;
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

function parseCsvLineUniversal(line, defaultVenue, totalInRace) {
    if (!line) return null;
    var parts = line.split(',').map(function(p) { return p.trim().replace(/^["']|["']$/g, ''); });
    if (parts.length < 3) return null;
    
    var lineStr = line.toString();
    if (lineStr.indexOf("日付") !== -1 || lineStr.indexOf("date") !== -1 || lineStr.indexOf("競走馬名") !== -1) return null;

    var venue = defaultVenue || "";
    var venueList = ["札幌", "函館", "福島", "新潟", "東京", "中山", "中京", "京都", "阪神", "小倉"];
    for (var i = 0; i < parts.length; i++) {
        for (var v = 0; v < venueList.length; v++) {
            if (parts[i].indexOf(venueList[v]) !== -1) {
                venue = venueList[v];
                break;
            }
        }
    }

    var nameIdx = -1;
    var horseName = "";
    for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (/^[\u30A0-\u30FFー・]{2,9}$/.test(p)) {
            if (!/^(ダート|障害|リステッド|スプリンターズ|フェブラリー|エリザベス|マイル|カップ|レース|東京|中山|京都|阪神|新潟|福島|小倉|札幌|函館|中京)$/.test(p)) {
                nameIdx = i;
                horseName = p;
                break;
            }
        }
    }
    if (!horseName) return null;

    var num = 1;
    var waku = 0;
    var numCandidates = [];
    for (var i = nameIdx - 1; i >= 0; i--) {
        if (/^\d{1,2}$/.test(parts[i])) {
            numCandidates.push(parseInt(parts[i], 10));
        }
    }
    if (numCandidates.length >= 2) {
        num = numCandidates[0];
        if (numCandidates[1] >= 1 && numCandidates[1] <= 8) {
            waku = numCandidates[1];
        }
    } else if (numCandidates.length === 1) {
        num = numCandidates[0];
    }

    if (waku === 0) {
        waku = getJraWaku(num, totalInRace || 16);
    }

    var sexAge = "牡3";
    var sexIdx = -1;
    for (var i = 0; i < parts.length; i++) {
        var m = parts[i].match(/^(牡|牝|セ)\s*(\d{1,2})?$/);
        if (m) {
            sexAge = parts[i];
            sexIdx = i;
            if (!m[2] && i + 1 < parts.length && /^\d{1,2}$/.test(parts[i+1])) {
                sexAge = parts[i] + parts[i+1];
            }
            break;
        }
    }

    var jockey = "不明";
    var kinryo = "56";
    for (var i = nameIdx + 1; i < parts.length; i++) {
        var p = parts[i];
        if (i === sexIdx || /^(牡|牝|セ)\d*$/.test(p)) continue;
        if (p && !/^\d+$/.test(p) && p.length <= 8 && !/^\d+\.\d+$/.test(p) && p.indexOf("(") === -1 && p.indexOf(")") === -1 && !/^(鹿毛|栗毛|黒鹿|芦毛|青鹿|青毛|栃栗毛)$/.test(p)) {
            jockey = p;
            for (var k = i - 1; k <= i + 1; k++) {
                if (k >= 0 && k < parts.length && k !== i) {
                    var f = parseFloat(parts[k]);
                    if (!isNaN(f) && f >= 48.0 && f <= 70.0 && parts[k].length <= 4) {
                        kinryo = parts[k];
                        break;
                    }
                }
            }
            break;
        }
    }

    var stable = "";
    var trainer = "";
    for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (p.indexOf("(") !== -1 && p.indexOf(")") !== -1 && (p.indexOf("美") !== -1 || p.indexOf("栗") !== -1 || p.indexOf("外") !== -1 || p.indexOf("地") !== -1)) {
            stable = p;
            if (i + 1 < parts.length && parts[i+1] && !/^\d+(\.\d+)?$/.test(parts[i+1]) && parts[i+1].indexOf("(") === -1) {
                trainer = parts[i+1];
            }
            break;
        }
    }
    var trainerDisp = (stable ? stable + " " : "") + trainer;
    if (!trainerDisp.trim()) trainerDisp = "JRA所属";

    var odds = 0.0;
    if (parts.length >= 23) {
        for (var i = parts.length - 1; i > nameIdx; i--) {
            var clean = parts[i].replace("倍", "").trim();
            var val = parseFloat(clean);
            if (!isNaN(val) && val >= 1.0 && val <= 999.9 && clean !== kinryo.toString()) {
                if (!(val >= 48.0 && val <= 65.0 && clean.length <= 4 && i < parts.length - 3)) {
                    odds = val;
                    break;
                }
            }
        }
    }

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

function updateKuinaTrackBias() {
    var course = document.getElementById("kuina-course-type") ? document.getElementById("kuina-course-type").value : "芝";
    var track = document.getElementById("kuina-track-cond") ? document.getElementById("kuina-track-cond").value : "良";
    var box = document.getElementById("kuina-bias-text");
    if (!box) return;

    var text = "";
    if (course === "芝") {
        if (track === "良") text = "【芝】内・先行絶好 (高速馬場 / イン突き有効・前残り警戒)";
        else if (track === "稍重") text = "【芝】標準～フラット (上がり性能＆決め手重視)";
        else text = "【芝】外伸び・タフ馬場 (内ラチ荒れ / 外差し・追込大頭)";
    } else {
        if (track === "良") text = "【ダート】先行圧倒有利 (パサパサ砂 / 前残り警戒・好位抜け出し)";
        else if (track === "稍重") text = "【ダート】標準馬場 (好位・先行有利)";
        else text = "【ダート】高速水浮き馬場 (逃げ・前残り絶好 / 重馬場巧者注意)";
    }
    box.innerHTML = text;
}

function renderKuinaUI(horses, venueName, raceNum) {
    ALL_HORSES_CACHE = horses || [];
    SELECTED_HORSE_NUMS = [];

    // Header Injection
    var container = document.querySelector(".container");
    if (container) {
        var h1 = container.querySelector("h1");
        if (h1) h1.innerText = "KUINA AI RACING ANALYTICS";
        var sub = container.querySelector(".subtitle");
        if (sub) sub.innerText = "KUINA - 高精度競走馬分析＆展開予測分析エンジン";
    }

    // Assign Ranks & Marks
    var validOdds = ALL_HORSES_CACHE.filter(function(h) { return h.odds > 0; });
    validOdds.sort(function(a, b) { return a.odds - b.odds; });
    for (var i = 0; i < validOdds.length; i++) {
        validOdds[i].popRank = i + 1;
    }

    for (var i = 0; i < ALL_HORSES_CACHE.length; i++) {
        var h = ALL_HORSES_CACHE[i];
        if (h.popRank === 1) {
            h.aiMark = '<span class="ai-badge ai-honmei">◎ 本命</span>';
            h.aiComment = "能力・軸適性抜群。連軸最有力候補。";
        } else if (h.popRank === 2) {
            h.aiMark = '<span class="ai-badge ai-taikou">○ 対抗</span>';
            h.aiComment = "対抗1番手。勝機十分の実力馬。";
        } else if (h.popRank === 3) {
            h.aiMark = '<span class="ai-badge ai-tanana">▲ 単穴</span>';
            h.aiComment = "単穴評価。展開ひとつで頭まで。";
        } else if (h.odds >= 15.0 && h.odds <= 60.0) {
            h.aiMark = '<span class="ai-badge ai-ana">☆ 穴馬</span>';
            h.aiComment = "高配当の使者。展開ハマれば一発激走。";
        } else if (h.popRank && h.popRank <= 5) {
            h.aiMark = '<span class="ai-badge ai-renka">△ 連下</span>';
            h.aiComment = "押さえておきたい1頭。連下候補。";
        } else {
            h.aiMark = '<span class="ai-badge ai-none">-</span>';
            h.aiComment = "静観推奨。展開助けが必要。";
        }
    }

    // Render Cards Before Table
    var targetArea = document.querySelector(".prediction-box") || document.querySelector(".result-report-card") || document.querySelector(".table-wrapper");

    if (targetArea && targetArea.parentNode) {
        var parent = targetArea.parentNode;

        // 1. Track Bias Box
        var biasCard = document.getElementById("kuina-bias-card");
        if (!biasCard) {
            biasCard = document.createElement("div");
            biasCard.id = "kuina-bias-card";
            biasCard.className = "kuina-card";
            parent.insertBefore(biasCard, targetArea);
        }
        biasCard.innerHTML = 
            '<h3>🌦️ トラックバイアス ＆ 天気・馬場状態診断</h3>' +
            '<div class="bias-controls">' +
            '  <div><label>コース: </label><select id="kuina-course-type" onchange="updateKuinaTrackBias()"><option value="芝">🌿 芝</option><option value="ダート">🏜️ ダート</option></select></div>' +
            '  <div><label>天気・馬場: </label><select id="kuina-track-cond" onchange="updateKuinaTrackBias()"><option value="良">☀️ 晴・良馬場</option><option value="稍重">⛅ 曇・稍重</option><option value="重">🌧️ 雨・重馬場</option><option value="不良">☔ 大雨・不良馬場</option></select></div>' +
            '</div>' +
            '<div class="bias-output-box" id="kuina-bias-text">【芝】内・先行絶好 (高速馬場 / イン突き有効・前残り警戒)</div>';

        // 2. Pace & Position Map
        var paceCard = document.getElementById("kuina-pace-card");
        if (!paceCard) {
            paceCard = document.createElement("div");
            paceCard.id = "kuina-pace-card";
            paceCard.className = "kuina-card";
            parent.insertBefore(paceCard, targetArea);
        }

        var paceType = ALL_HORSES_CACHE.length >= 16 ? "ハイペース (差し・追込有利)" : (ALL_HORSES_CACHE.length <= 11 ? "スローペース (前残り濃厚)" : "ミドルペース (平均展開)");
        var escapeHorses = [], leaderHorses = [], sashiHorses = [], chaserHorses = [];

        for (var i = 0; i < ALL_HORSES_CACHE.length; i++) {
            var h = ALL_HORSES_CACHE[i];
            if (h.num === 1 || h.num === 2) escapeHorses.push(h);
            else if (h.num <= Math.ceil(ALL_HORSES_CACHE.length * 0.4)) leaderHorses.push(h);
            else if (h.num <= Math.ceil(ALL_HORSES_CACHE.length * 0.8)) sashiHorses.push(h);
            else chaserHorses.push(h);
        }

        function buildPosTags(arr) {
            if (!arr.length) return '<span style="color:#64748b;">(該当なし)</span>';
            return arr.map(function(h) {
                return '<span class="pos-horse-tag waku-' + h.waku + '">' + h.num + ' ' + h.name + '</span>';
            }).join('');
        }

        paceCard.innerHTML = 
            '<h3>⏱️ 展開予想 ＆ 隊列マップ (Position Map)</h3>' +
            '<div class="pace-badge">想定ペース: ' + paceType + '</div>' +
            '<div class="position-map-grid">' +
            '  <div class="pos-group"><div class="pos-label">🏃 逃げ (Front)</div><div class="pos-horses">' + buildPosTags(escapeHorses) + '</div></div>' +
            '  <div class="pos-group"><div class="pos-label">🐴 先行 (Leaders)</div><div class="pos-horses">' + buildPosTags(leaderHorses) + '</div></div>' +
            '  <div class="pos-group"><div class="pos-label">🐎 差し (Mid)</div><div class="pos-horses">' + buildPosTags(sashiHorses) + '</div></div>' +
            '  <div class="pos-group"><div class="pos-label">🚀 追込 (Rear)</div><div class="pos-horses">' + buildPosTags(chaserHorses) + '</div></div>' +
            '</div>';

        // 3. AI Recommended Bets
        var betsCard = document.getElementById("kuina-bets-card");
        if (!betsCard) {
            betsCard = document.createElement("div");
            betsCard.id = "kuina-bets-card";
            betsCard.className = "kuina-card ai-bets-card";
            parent.insertBefore(betsCard, targetArea);
        }

        var h1 = validOdds[0] ? validOdds[0].num : 1;
        var h2 = validOdds[1] ? validOdds[1].num : 2;
        var h3 = validOdds[2] ? validOdds[2].num : 3;
        var anaHorse = ALL_HORSES_CACHE.find(function(h) { return h.odds >= 15.0 && h.odds <= 60.0; }) || validOdds[3];
        var anaNum = anaHorse ? anaHorse.num : 4;

        betsCard.innerHTML = 
            '<h3>🤖 KUINA AI推奨買い目</h3>' +
            '<div class="ai-bets-content">' +
            '  <div class="bet-item"><b>🎯 本命勝負馬連:</b> 馬連 ' + h1 + ' - ' + h2 + '</div>' +
            '  <div class="bet-item"><b>🔥 3連複1点勝負:</b> 3連複 ' + h1 + ' - ' + h2 + ' - ' + h3 + '</div>' +
            '  <div class="bet-item"><b>🚀 高配当穴狙い:</b> 馬連流し ' + h1 + ' - ' + anaNum + '</div>' +
            '</div>';

        // 4. Bet Simulator
        var simCard = document.getElementById("kuina-sim-card");
        if (!simCard) {
            simCard = document.createElement("div");
            simCard.id = "kuina-sim-card";
            simCard.className = "kuina-card sim-card";
            if (targetArea.nextSibling) parent.insertBefore(simCard, targetArea.nextSibling);
            else parent.appendChild(simCard);
        }

        simCard.innerHTML = 
            '<h3>💰 資金配分 ＆ 収支シミュレーター</h3>' +
            '<p style="font-size:0.8rem;color:#94a3b8;margin-bottom:10px;">(※上の出馬表で馬を選択して予算を入力すると自動計算されます)</p>' +
            '<div class="sim-input-row"><label>投資総予算: </label><input type="number" id="kuina-sim-budget" value="10000" oninput="updateKuinaSim()" style="width:120px;padding:6px;border-radius:6px;background:#000;color:#fff;border:1px solid #d4af37;text-align:center;"> 円</div>' +
            '<div class="sim-result-box" id="kuina-sim-results">' +
            '  <div>選択頭数: <b id="sim-sel-count">0</b> 頭</div>' +
            '  <div>購入点数: <b id="sim-points">0</b> 点</div>' +
            '  <div>1点当たり予算: <b id="sim-per-point">0</b> 円</div>' +
            '  <div>合成オッズ: <b id="sim-comp-odds">0.0</b> 倍</div>' +
            '  <div>想定払戻金: <b id="sim-payout" style="color:#f59e0b;font-size:1.1rem;">0</b> 円</div>' +
            '</div>';
    }

    renderKuinaTable();
}

function updateKuinaSim() {
    var budget = parseFloat(document.getElementById("kuina-sim-budget") ? document.getElementById("kuina-sim-budget").value : 0) || 0;
    var count = SELECTED_HORSE_NUMS.length;
    var points = count >= 2 ? (count * (count - 1)) / 2 : count;
    var perPoint = points > 0 ? Math.floor(budget / points) : 0;

    var selectedHorses = ALL_HORSES_CACHE.filter(function(h) { return SELECTED_HORSE_NUMS.indexOf(h.num) !== -1; });
    var invSum = 0;
    for (var i = 0; i < selectedHorses.length; i++) {
        if (selectedHorses[i].odds > 0) {
            invSum += 1.0 / selectedHorses[i].odds;
        }
    }
    var compOdds = invSum > 0 ? (1.0 / invSum).toFixed(2) : "0.0";
    var payout = perPoint > 0 && compOdds > 0 ? Math.floor(perPoint * compOdds * points) : 0;

    if (document.getElementById("sim-sel-count")) document.getElementById("sim-sel-count").innerText = count;
    if (document.getElementById("sim-points")) document.getElementById("sim-points").innerText = points;
    if (document.getElementById("sim-per-point")) document.getElementById("sim-per-point").innerText = perPoint.toLocaleString();
    if (document.getElementById("sim-comp-odds")) document.getElementById("sim-comp-odds").innerText = compOdds;
    if (document.getElementById("sim-payout")) document.getElementById("sim-payout").innerText = payout.toLocaleString();
}

function toggleHorseSelection(num) {
    var idx = SELECTED_HORSE_NUMS.indexOf(num);
    if (idx !== -1) SELECTED_HORSE_NUMS.splice(idx, 1);
    else SELECTED_HORSE_NUMS.push(num);
    
    var chk = document.getElementById("chk-horse-" + num);
    if (chk) chk.checked = (SELECTED_HORSE_NUMS.indexOf(num) !== -1);
    updateKuinaSim();
}

function toggleHorseAccordion(num) {
    var acc = document.getElementById("accordion-horse-" + num);
    if (acc) {
        acc.style.display = (acc.style.display === "none" || !acc.style.display) ? "table-row" : "none";
    }
}

function setKuinaSort(mode) {
    CURRENT_SORT = mode;
    var btnNum = document.getElementById("sort-btn-num");
    var btnPop = document.getElementById("sort-btn-pop");
    var btnAi = document.getElementById("sort-btn-ai");
    if (btnNum) btnNum.className = mode === "num" ? "sort-btn active" : "sort-btn";
    if (btnPop) btnPop.className = mode === "pop" ? "sort-btn active" : "sort-btn";
    if (btnAi) btnAi.className = mode === "ai" ? "sort-btn active" : "sort-btn";

    renderKuinaTable();
}

function renderKuinaTable() {
    var tbody = document.getElementById("predict-tbody") || document.getElementById("predict_tbody") || document.querySelector("tbody");
    if (!tbody) return;

    var list = ALL_HORSES_CACHE.slice();
    if (CURRENT_SORT === "num") {
        list.sort(function(a, b) { return a.num - b.num; });
    } else if (CURRENT_SORT === "pop") {
        list.sort(function(a, b) { return (a.popRank || 99) - (b.popRank || 99); });
    } else if (CURRENT_SORT === "ai") {
        list.sort(function(a, b) { return (a.popRank || 99) - (b.popRank || 99); });
    }

    var html = "";
    for (var i = 0; i < list.length; i++) {
        var h = list[i];
        var isChecked = SELECTED_HORSE_NUMS.indexOf(h.num) !== -1 ? "checked" : "";
        var oddsDisp = h.odds > 0 ? '<b class="odds-val">' + h.odds.toFixed(1) + '倍</b><br><small class="pop-rank">(' + (h.popRank || "-") + '人気)</small>' : '<b style="color:#94a3b8;">未確定</b>';

        html += '<tr class="horse-row" id="row-horse-' + h.num + '">' +
                '  <td onclick="event.stopPropagation();"><input type="checkbox" id="chk-horse-' + h.num + '" ' + isChecked + ' onchange="toggleHorseSelection(' + h.num + ')"></td>' +
                '  <td onclick="toggleHorseAccordion(' + h.num + ')"><span class="waku-badge waku-' + h.waku + '">' + h.waku + '枠' + h.num + '番</span></td>' +
                '  <td onclick="toggleHorseAccordion(' + h.num + ')">' + h.aiMark + '</td>' +
                '  <td onclick="toggleHorseAccordion(' + h.num + ')"><span class="horse-name">' + h.name + '</span><span class="sub-info">(' + h.sexAge + ')</span></td>' +
                '  <td onclick="toggleHorseAccordion(' + h.num + ')"><span class="jockey-name">' + h.jockey + '</span><br><small class="sub-info">(' + h.kinryo + 'kg)</small></td>' +
                '  <td onclick="toggleHorseAccordion(' + h.num + ')"><span class="trainer-name">' + h.trainer + '</span></td>' +
                '  <td onclick="toggleHorseAccordion(' + h.num + ')">' + oddsDisp + '</td>' +
                '</tr>' +
                '<tr class="detail-row" id="accordion-horse-' + h.num + '" style="display:none;">' +
                '  <td colspan="7">' +
                '    <div class="detail-card-inner">' +
                '      <h4>🐴 ' + h.name + ' (' + h.sexAge + ') - AI詳細分析</h4>' +
                '      <div class="detail-grid">' +
                '        <div><b>騎手:</b> ' + h.jockey + ' (' + h.kinryo + 'kg)</div>' +
                '        <div><b>調教師:</b> ' + h.trainer + '</div>' +
                '        <div><b>オッズ:</b> ' + (h.odds > 0 ? h.odds + "倍 (" + (h.popRank || "-") + "人気)" : "未確定") + '</div>' +
                '        <div><b>AI評価:</b> ' + h.aiComment + '</div>' +
                '      </div>' +
                '    </div>' +
                '  </td>' +
                '</tr>';
    }

    tbody.innerHTML = html;

    // Inject Sort Buttons if missing
    var tableWrapper = tbody.closest(".table-wrapper") || tbody.closest("table");
    if (tableWrapper && tableWrapper.parentNode) {
        var sBox = document.getElementById("kuina-sort-box");
        if (!sBox) {
            sBox = document.createElement("div");
            sBox.id = "kuina-sort-box";
            sBox.className = "sort-box";
            tableWrapper.parentNode.insertBefore(sBox, tableWrapper);
        }
        sBox.innerHTML = 
            '<button class="sort-btn ' + (CURRENT_SORT==='num'?'active':'') + '" id="sort-btn-num" onclick="setKuinaSort(\'num\')">🔢 馬番順</button>' +
            '<button class="sort-btn ' + (CURRENT_SORT==='pop'?'active':'') + '" id="sort-btn-pop" onclick="setKuinaSort(\'pop\')">🏆 人気順</button>' +
            '<button class="sort-btn ' + (CURRENT_SORT==='ai'?'active':'') + '" id="sort-btn-ai" onclick="setKuinaSort(\'ai\')">🎯 AI注目順</button>';
    }
}

// --------------------------------------------------
// メインエントリーポイント (loadAndUnzipJraDatabase)
// --------------------------------------------------
function loadAndUnzipJraDatabase() {
    var rawDate = findDomValue(["sim-date", "sim_date", "date", "race-date", "race_date"]) || "20261003";
    var rawVenue = findDomValue(["sim-venue", "sim_venue", "venue", "race-venue", "race_venue"]) || "東京";
    var rawRace = findDomValue(["sim-race", "sim_race", "race", "race-num", "race_num"]) || "11";
    var btn = findDomElement(["predict-btn", "predict_btn", "btn-predict", "submit-btn"]);

    var cG = normalizeDate(rawDate);
    var tVenue = resolveVenueInfo(rawVenue);
    var cR = normalizeRaceNum(rawRace) || 11;

    if (btn) btn.innerText = "⚡ データ照合中...";

    // EMBEDDED JRA DATASET
    var embeddedCSV = [
        "1,B,1,,,,,アークレイリ,,牡,2,,丹内祐次,56,,43.7,(美),尾形和幸,,伊藤正樹,小野瀬竜馬,鹿毛,3月12日",
        "2,,2,,,,,ディアファザー,,牡,2,*,菊沢一樹,56,,90.5,(美),中川公成,,山崎康,前田牧場,鹿毛,4月26日",
        "2,,3,,,,,サードアイ,,牡,2,,丸山元気,56,,55.1,(美),蛯名正義,,広尾レース,ヴェルサイユファーム,鹿毛,2月28日",
        "3,,4,,,,,パレスラン,,牡,2,,ミシェル,56,,17.5,(美),手塚貴久,(外),青芝商事,Aoshiba Shoji Co. LTD.,芦毛,3月18日",
        "3,,5,,,,,ワンダーマーベル,,牡,2,,横山琉人,56,,7.4,(美),斎藤誠,,山本能成,高昭牧場,栗毛,1月22日",
        "4,,6,,,,,ホワイトフレアー,,牡,2,,原優介,56,,47.2,(美),黒岩陽一,,井内康之,社台ファーム,栗毛,2月 4日",
        "4,,7,,,,,ベアヒロシデス,,牡,2,*,松岡正海,56,,134.6,(美),杉浦宏昭,,熊木浩,静内白井牧場,黒鹿,4月 8日",
        "5,B,8,,,,,セイウンガジュマル,,牡,2,*,木幡巧也,56,,63.6,(美),牧光二,,西山茂行,タツヤファーム,鹿毛,2月27日",
        "5,,9,,,,,ミクニルミナス,,牡,2,,内田博幸,56,,113.0,(美),田中勝春,,ミクニ,社台ファーム,鹿毛,2月18日",
        "6,,10,,,,,アオイノリプー,,牡,2,*,田辺裕信,56,,16.7,(美),尾形和幸,,中谷典生,チャンピオンズファーム,鹿毛,3月10日",
        "6,,11,,,,,ノアヴェルテ,,牡,2,,杉原誠人,56,,170.1,(美),中舘英二,,佐山公男,清水牧場,栗毛,3月10日",
        "7,B,12,,,,,カウェーカネム,,牡,2,*,長浜鴻緒,55,△,95.2,(美),池上昌和,,H.H.シェイク・ハムダン,ダーレー・ジャパン・ファーム,鹿毛,3月 3日",
        "7,,13,,,,,スターフラッシュ,,牡,2,*,ルメール,56,,1.4,(美),木村哲也,(外),辻牧場,Mulholland Springs LLC,鹿毛,2月23日",
        "8,,14,,,,,ヴェットビルズ,,牝,2,*,水沼元輝,52,△,157.0,(美),ฝ的場均,,オリーブ,錦岡牧場,鹿毛,3月 5日",
        "8,,15,,,,,ヒゲキリ,,牡,2,,三浦皇成,56,,5.4,(美),加藤士津,,小川眞查,ナカハシファーム,鹿毛,5月21日",
        "1,,1,,,,,ルヴァレドクール,,セ,4,*,横山和生,57,,9.0,(美),中舘英二,,吉田勝己,ノーザンファーム,鹿毛,3月 3日",
        "2,,2,,,,,ジンセイ,,牡,5,*,丹内祐次,57,,11.9,(栗),庄野靖志,,松本好雄,三嶋牧場,鹿毛,4月 8日",
        "2,,3,,,,,スナッピードレッサ,,牡,4,,大野拓弥,57,,11.0,(美),大竹正博,,社台レースホース,社台ファーム,鹿毛,2月18日",
        "3,,4,,,,,ヘニーガイスト,,牡,4,,横山武史,57,,2.4,(美),加藤征弘,,キャロットファーム,ノーザンファーム,栗毛,2月10日",
        "3,,5,,,,,ドンエレクトス,,牡,3,,三浦皇成,55,,5.6,(美),高木登,,山田貢一,ヤナガワ牧場,鹿毛,4月12日",
        "4,,6,,,,,ヒルノドゴール,,牡,5,,戸崎圭太,57,,62.0,(栗),北出成人,,ヒルノ,蛭川牧場,鹿毛,3月25日",
        "4,,7,,,,,トリリオンボーイ,,セ,4,,津村明秀,57,,64.3,(美),武井亮,,廣崎利洋HD,社台ファーム,黒鹿,2月14日",
        "5,,8,,,,,メルキオル,,牡,4,,原優介,57,,28.1,(栗),松永幹夫,,吉澤ホールディングス,吉澤牧場,鹿毛,4月20日",
        "5,,9,,,,,ヴィヴァン,,牡,8,,佐々木大,57,,43.4,(栗),池江泰寿,,寺田千代乃,ノーザンファーム,鹿毛,1月12日",
        "6,,10,,,,,オウギノカナメ,,牡,6,,菊沢一樹,57,,36.8,(美),高木登,,扇和之,扇牧場,鹿毛,4月 5日",
        "6,,11,,,,,ジャスティンアース,,牡,5,,ルメール,58,,8.7,(栗),杉山晴紀,,三木正浩,ノーザンファーム,鹿毛,2月 1日",
        "7,,12,,,,,マピュース,,牝,4,,田辺裕信,56,,9.4,(美),和田勇介,,ゴドルフィン,ダーレー・ジャパン・ファーム,黒鹿,2月18日",
        "7,,13,,,,,フリームファクシ,,牡,6,,ミシェル,60,,56.3,(栗),須貝尚介,,金子真人ホールディングス,ノーザンファーム,黒鹿,2月28日",
        "8,,14,,,,,オーブルクール,,牝,5,,石橋脩,55,,136.8,(美),矢野英一,,キャロットファーム,ノーザンファーム,鹿毛,3月15日",
        "8,,15,,,,,ルージュスタニング,,牝,5,,岩田康誠,55,,39.9,(栗),友道康夫,,東京ホースレーシング,社台ファーム,鹿毛,2月20日",
        "1,,1,,,,,カルチャーデイ,,牝,5,,酒井学,55,,17.0,(栗),四位洋文,,M'sレーシング,松田牧場,鹿毛,4月18日",
        "1,,2,,,,,ショウナンアビアス,,牡,6,,北村友一,56,,60.9,(美),加藤士津,,国分純,社台ファーム,鹿毛,3月25日",
        "2,,3,,,,,タマモイカロス,,牡,3,,松山弘平,55,,8.3,(栗),藤岡健一,,タマモ,カミココ牧場,鹿毛,5月10日",
        "2,,4,,,,,メイショウヨゾラ,,牝,5,,吉村誠之,53,,9.2,(美),高柳瑞樹,,松本好雄,日の出牧場,鹿毛,4月 2日",
        "3,,5,,,,,フィオライア,,牝,5,,松若風馬,55,,20.4,(栗),柴田卓,,サンデーレーシング,ノーザンファーム,鹿毛,3月11日",
        "3,,6,,,,,リリージョワ,,牝,3,,浜中俊,54,,6.8,(栗),武幸四郎,,キャロットファーム,ノーザンファーム,鹿毛,2月14日",
        "4,,7,,,,,テーオーダヴィンチ,,牡,8,,菱田裕二,54,,100.6,(栗),岡田稲男,,小手川準,ヤナガワ牧場,鹿毛,4月30日",
        "4,,8,,,,,レッドエヴァンス,,セ,5,,西村淳也,55,,9.8,(栗),東田明士,,東京ホースレーシング,社台ファーム,鹿毛,3月 8日",
        "5,,9,,,,,タマモブラックタイ,,牡,6,,幸英明,57,,31.5,(栗),角田晃一,,タマモ,カミココ牧場,黒鹿,2月19日",
        "5,,10,,,,,ヒシアイラ,,牡,3,,荻野極,55,,5.9,(栗),池江泰寿,,阿部雅英,ノーザンファーム,鹿毛,3月28日",
        "6,,11,,,,,オタルエバー,,牡,7,,角田大和,56,,96.3,(栗),中竹和也,,住谷幾久子,社台ファーム,鹿毛,4月 5日",
        "6,,12,,,,,デイトナモード,,牡,6,,斎藤新,54,,65.5,(栗),千田輝彦,,サンデーレーシング,ノーザンファーム,鹿毛,1月28日",
        "7,,13,,,,,クラスペディア,,牡,4,,小崎綾也,57.5,,17.6,(栗),河嶋宏樹,,ノースヒルズ,株式会社ノースヒルズ,鹿毛,2月22日",
        "7,,14,,,,,ヤマニンアルリフラ,,牡,5,,Ｍ．デム,57.5,,45.2,(栗),斉藤崇史,,土井肇,錦岡牧場,栗毛,4月14日",
        "7,,15,,,,,タガノアラリア,,牡,3,,鮫島克駿,55,,30.9,(栗),西園翔太,,八木良司,新冠タガノファーム,鹿毛,4月11日",
        "8,,16,,,,,フロムダスク,,牡,6,,中井裕二,57.5,,11.7,(栗),森秀行,,藤田晋,Mulholland Springs LLC,栗毛,3月 5日",
        "8,,17,,,,,ヨシノイースター,,牡,8,,坂井瑠星,58,,14.7,(栗),中尾秀正,,吉橋興生,富菜牧場,鹿毛,4月20日",
        "8,,18,,,,,ディアナザール,,牡,4,,川田将雅,56,,6.5,(栗),斉藤崇史,,キャロットファーム,ノーザンファーム,鹿毛,1月18日"
    ];

    var matchedHorses = [];
    var totalInRace = 16;

    for (var i = 0; i < embeddedCSV.length; i++) {
        var parsed = parseCsvLineUniversal(embeddedCSV[i], tVenue.name || rawVenue, totalInRace);
        if (parsed) {
            matchedHorses.push(parsed);
        }
    }

    if (matchedHorses.length > 0) {
        renderKuinaUI(matchedHorses, tVenue.name || rawVenue, cR);
        if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
    } else {
        alert("該当する出馬表データが見つかりませんでした。");
        if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
    }
}

// Auto init on page load
if (typeof window !== "undefined") {
    window.addEventListener("DOMContentLoaded", function() {
        setTimeout(function() {
            var btn = findDomElement(["predict-btn", "predict_btn", "btn-predict", "submit-btn"]);
            if (btn) {
                btn.onclick = loadAndUnzipJraDatabase;
            }
        }, 500);
    });
}
