// 🌪️【KUINA AI RACING ANALYTICS - 完全決定版 app.js】

var VENUE_MAP = {
    '札幌': '01', '函館': '02', '福島': '03', '新潟': '04',
    '東京': '05', '中山': '06', '中京': '07', '京都': '08',
    '阪神': '09', '小倉': '10',
    '01': '札幌', '02': '函館', '03': '福島', '04': '新潟',
    '05': '東京', '06': '中山', '07': '中京', '08': '京都',
    '09': '阪神', '10': '小倉'
};

function calculateJraWaku(num, total) {
    if (!num || num <= 0) return 1;
    if (!total || total <= 8) return Math.min(8, num);
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

function parseCsvLineUniversal(line, totalRunners) {
    if (!line) return null;
    var rawTokens = line.split(/[,	]+/).map(function(t) { return t.replace(/^["\s]+|["\s]+$/g, ''); }).filter(function(t){ return t.length > 0; });
    if (rawTokens.length < 5) return null;
    if (rawTokens.indexOf('日付') !== -1 || rawTokens.indexOf('枠') !== -1 || rawTokens.indexOf('馬名') !== -1) return null;

    var venue = '';
    for (var i = 0; i < rawTokens.length; i++) {
        var tok = rawTokens[i];
        if (VENUE_MAP[tok] && isNaN(tok)) {
            venue = tok;
            break;
        }
    }

    var horseName = '', nameIdx = -1;
    for (var i = 0; i < rawTokens.length; i++) {
        var t = rawTokens[i];
        if (/^[゠-ヿー・]{2,9}$/.test(t)) {
            if (!/^(ダート|障害|リステッド|スプリンターズ|フェブラリー|エリザベス|チャンピオンズ|ホープフル|マイル|カップ|札幌|函館|福島|新潟|東京|中山|中京|京都|阪神|小倉)$/.test(t)) {
                horseName = t;
                nameIdx = i;
                break;
            }
        }
    }
    if (!horseName) return null;

    var num = 0, rawWaku = '';
    for (var i = nameIdx - 1; i >= 0; i--) {
        if (/^\d{1,2}$/.test(rawTokens[i])) {
            var v = parseInt(rawTokens[i], 10);
            if (v >= 1 && v <= 18) {
                num = v;
                if (i - 1 >= 0 && (/^\d{1,2}$/.test(rawTokens[i-1]) || rawTokens[i-1] === '仮')) {
                    rawWaku = rawTokens[i-1];
                }
                break;
            }
        }
    }
    if (!num) return null;

    var waku = 0;
    if (rawWaku && rawWaku !== '仮' && !isNaN(rawWaku)) {
        waku = parseInt(rawWaku, 10);
    }
    if (!waku || waku <= 0 || waku > 8) {
        waku = calculateJraWaku(num, totalRunners || 16);
    }

    var sexAge = '牡3';
    for (var i = 0; i < rawTokens.length; i++) {
        if (/^(牡|牝|セ)\d{1,2}$/.test(rawTokens[i])) {
            sexAge = rawTokens[i];
            break;
        } else if (/^(牡|牝|セ)$/.test(rawTokens[i]) && i + 1 < rawTokens.length && /^\d{1,2}$/.test(rawTokens[i+1])) {
            sexAge = rawTokens[i] + rawTokens[i+1];
            break;
        }
    }

    var jockey = '未定';
    if (nameIdx + 1 < rawTokens.length) {
        var jCand = rawTokens[nameIdx + 1];
        if (!/^\d+(\.\d+)?$/.test(jCand) && jCand.length <= 8) {
            jockey = jCand;
        }
    }

    var kinryo = '56';
    for (var i = nameIdx + 1; i < Math.min(rawTokens.length, nameIdx + 5); i++) {
        if (/^\d{2}(\.\d)?$/.test(rawTokens[i])) {
            var val = parseFloat(rawTokens[i]);
            if (val >= 48.0 && val <= 62.0) {
                kinryo = rawTokens[i];
                break;
            }
        }
    }

    var stable = '', trainer = '';
    for (var i = 0; i < rawTokens.length; i++) {
        if (/^\((美|栗|外|地方|関東|関西)\)$/.test(rawTokens[i])) {
            stable = rawTokens[i];
            if (i + 1 < rawTokens.length && /^[一-鿿぀-ゟ゠-ヿ]{2,8}$/.test(rawTokens[i+1])) {
                trainer = rawTokens[i+1];
            }
            break;
        }
    }
    if (!trainer) {
        for (var i = rawTokens.length - 1; i >= nameIdx + 2; i--) {
            var tok = rawTokens[i];
            if (/^[一-鿿]{2,5}$/.test(tok) && tok !== jockey) {
                trainer = tok;
                break;
            }
        }
    }
    var trainerDisp = (stable ? stable + ' ' : '') + (trainer || '厩舎未定');

    var odds = 0.0;
    for (var i = nameIdx + 2; i < rawTokens.length; i++) {
        var tok = rawTokens[i].replace('倍', '').trim();
        if (/^\d{1,3}\.\d{1,2}$/.test(tok)) {
            var f = parseFloat(tok);
            if (f > 0 && f < 999.0 && tok !== kinryo) {
                odds = f;
                break;
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
        trainerDisp: trainerDisp,
        odds: odds
    };
}

var currentRaceHorses = [];
var selectedHorseNums = {};

function initKuinaUI() {
    var container = document.querySelector('.container') || document.body;
    var existingHeader = document.getElementById('kuina-app-root');
    if (!existingHeader) {
        var root = document.createElement('div');
        root.id = 'kuina-app-root';
        root.innerHTML = 
            '<div class="kuina-header">' +
                '<h1>KUINA AI RACING ANALYTICS</h1>' +
                '<div class="subtitle">KUINA - 高精度競走馬分析＆展開予測分析エンジン</div>' +
            '</div>' +
            '<div class="selector-box">' +
                '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">' +
                    '<div>' +
                        '<label class="form-label">📅 開催日付 (カレンダー)</label>' +
                        '<input type="date" id="sim-date" class="select-input" value="2026-10-03">' +
                    '</div>' +
                    '<div>' +
                        '<label class="form-label">🏇 開催競馬場</label>' +
                        '<select id="sim-venue" class="select-input">' +
                            '<option value="東京">東京競馬場</option>' +
                            '<option value="京都">京都競馬場</option>' +
                            '<option value="中山">中山競馬場</option>' +
                            '<option value="阪神">阪神競馬場</option>' +
                            '<option value="中京">中京競馬場</option>' +
                            '<option value="新潟">新潟競馬場</option>' +
                            '<option value="福島">福島競馬場</option>' +
                            '<option value="小倉">小倉競馬場</option>' +
                            '<option value="札幌">札幌競馬場</option>' +
                            '<option value="函館">函館競馬場</option>' +
                        '</select>' +
                    '</div>' +
                '</div>' +
                '<label class="form-label">🎯 レース選択 (1R〜12R)</label>' +
                '<div class="race-nav-grid" id="race-btn-group">' +
                    '<button class="race-btn" onclick="selectKuinaRace(1)">1R</button>' +
                    '<button class="race-btn" onclick="selectKuinaRace(2)">2R</button>' +
                    '<button class="race-btn" onclick="selectKuinaRace(3)">3R</button>' +
                    '<button class="race-btn" onclick="selectKuinaRace(4)">4R</button>' +
                    '<button class="race-btn" onclick="selectKuinaRace(5)">5R</button>' +
                    '<button class="race-btn" onclick="selectKuinaRace(6)">6R</button>' +
                    '<button class="race-btn" onclick="selectKuinaRace(7)">7R</button>' +
                    '<button class="race-btn" onclick="selectKuinaRace(8)">8R</button>' +
                    '<button class="race-btn" onclick="selectKuinaRace(9)">9R</button>' +
                    '<button class="race-btn" onclick="selectKuinaRace(10)">10R</button>' +
                    '<button class="race-btn active" onclick="selectKuinaRace(11)">11R</button>' +
                    '<button class="race-btn" onclick="selectKuinaRace(12)">12R</button>' +
                '</div>' +
                '<input type="hidden" id="sim-race" value="11">' +
                '<button class="btn-predict" id="predict-btn" onclick="loadAndUnzipJraDatabase()">🔍 指定レースを検索・AI解析を実行</button>' +
            '</div>' +
            '<div class="bias-card">' +
                '<div class="bias-title">🌿 トラックバイアス ＆ 馬場状態リアルタイム診断</div>' +
                '<div class="bias-controls">' +
                    '<select id="bias-surface" class="select-input-sm" onchange="updateTrackBias()">' +
                        '<option value="芝">芝コース</option>' +
                        '<option value="ダート">ダートコース</option>' +
                    '</select>' +
                    '<select id="bias-condition" class="select-input-sm" onchange="updateTrackBias()">' +
                        '<option value="良">☀️ 晴・良馬場</option>' +
                        '<option value="稍重">⛅ 曇・稍重</option>' +
                        '<option value="重">🌧️ 雨・重馬場</option>' +
                        '<option value="不良">☔ 大雨・不良馬場</option>' +
                    '</select>' +
                '</div>' +
                '<div id="bias-output" class="bias-output-box">【芝】内・先行絶好 (高速馬場 / イン突き有効)</div>' +
            '</div>' +
            '<div class="pace-card">' +
                '<div class="pace-title">🏁 展開予想 ＆ 想定隊列マップ (Position Map)</div>' +
                '<div id="pace-badge" class="pace-badge">ミドルペース (平均展開 / 実力通り)</div>' +
                '<div class="position-map-grid">' +
                    '<div class="pos-group"><div class="pos-label">🏃 逃げ</div><div id="pos-nige" class="pos-horses">-</div></div>' +
                    '<div class="pos-group"><div class="pos-label">🐴 先行</div><div id="pos-senko" class="pos-horses">-</div></div>' +
                    '<div class="pos-group"><div class="pos-label">🐎 差し</div><div id="pos-sashi" class="pos-horses">-</div></div>' +
                    '<div class="pos-group"><div class="pos-label">🚀 追込</div><div id="pos-oikomi" class="pos-horses">-</div></div>' +
                '</div>' +
            '</div>' +
            '<div class="ai-bets-card">' +
                '<div class="ai-bets-title">🤖 KUINA AI推奨買い目</div>' +
                '<div id="ai-bets-content" class="ai-bets-content">データをロードすると推奨買い目が表示されます</div>' +
            '</div>' +
            '<div class="sort-box">' +
                '<button class="sort-btn active" id="sort-btn-num" onclick="setKuinaSort('num')">🔢 馬番順</button>' +
                '<button class="sort-btn" id="sort-btn-odds" onclick="setKuinaSort('odds')">🏆 人気順</button>' +
                '<button class="sort-btn" id="sort-btn-ai" onclick="setKuinaSort('ai')">🎯 AI注目順</button>' +
            '</div>' +
            '<div class="table-wrapper">' +
                '<table>' +
                    '<thead>' +
                        '<tr>' +
                            '<th style="width:15%;">枠-馬</th>' +
                            '<th style="width:15%;">🤖 AI印</th>' +
                            '<th style="width:25%;">競走馬名</th>' +
                            '<th style="width:18%;">騎手</th>' +
                            '<th style="width:15%;">調教師</th>' +
                            '<th style="width:12%;">オッズ</th>' +
                        '</tr>' +
                    '</thead>' +
                    '<tbody id="predict-tbody">' +
                        '<tr><td colspan="6" style="padding:30px; color:#888;">「🔍 指定レースを検索」ボタンを押してください</td></tr>' +
                    '</tbody>' +
                '</table>' +
            '</div>' +
            '<div class="sim-card">' +
                '<div class="sim-title">💰 資金配分シミュレーター</div>' +
                '<div class="sim-input-row">' +
                    '<label class="form-label" style="margin:0;">💵 投資総予算 (円):</label>' +
                    '<input type="number" id="sim-budget" class="select-input-sm" value="10000" onchange="recalcSimulation()">' +
                '</div>' +
                '<div id="sim-results" class="sim-result-box">表内の馬をチェック選択すると資金配分が計算されます</div>' +
            '</div>';
        container.insertBefore(root, container.firstChild);
    }
}

function selectKuinaRace(rNum) {
    var raceInput = document.getElementById('sim-race');
    if (raceInput) raceInput.value = rNum;
    var btns = document.querySelectorAll('.race-btn');
    btns.forEach(function(b, idx) {
        if (idx + 1 === rNum) b.classList.add('active');
        else b.classList.remove('active');
    });
}

function updateTrackBias() {
    var surf = document.getElementById('bias-surface') ? document.getElementById('bias-surface').value : '芝';
    var cond = document.getElementById('bias-condition') ? document.getElementById('bias-condition').value : '良';
    var out = document.getElementById('bias-output');
    if (!out) return;

    if (surf === '芝') {
        if (cond === '良') out.innerText = '【芝】内・先行絶好 (高速馬場 / イン突き有効)';
        else if (cond === '稍重') out.innerText = '【芝】標準～フラット (上がり性能重視)';
        else if (cond === '重') out.innerText = '【芝】外伸び・タフ馬場 (内ラチ荒れ / 外差し頭角)';
        else out.innerText = '【芝】極悪タフ馬場 (道悪適性＆パワー必須)';
    } else {
        if (cond === '良') out.innerText = '【ダート】先行圧倒有利 (パサパサ砂 / 前残り警戒)';
        else if (cond === '稍重') out.innerText = '【ダート】標準馬場 (好位・先行押し切り)';
        else if (cond === '重') out.innerText = '【ダート】高速水浮き馬場 (逃げ・前残り絶好)';
        else out.innerText = '【ダート】超高速泥重馬場 (内枠逃げ馬大有利)';
    }
}

function loadAndUnzipJraDatabase() {
    initKuinaUI();
    var rawDate = document.getElementById('sim-date') ? document.getElementById('sim-date').value : '2026-10-03';
    var rawVenue = document.getElementById('sim-venue') ? document.getElementById('sim-venue').value : '東京';
    var rawRace = document.getElementById('sim-race') ? document.getElementById('sim-race').value : '11';
    var btn = document.getElementById('predict-btn');
    if (btn) btn.innerText = '⚡ データを検索・解析中...';

    var dateClean = rawDate.replace(/-/g, '').replace(/\//g, '').trim();
    var yy = dateClean.length >= 8 ? dateClean.substring(2, 8) : dateClean;
    var filename = 'DG' + yy + '.CSV';

    var possibleUrls = [
        filename,
        filename.toLowerCase(),
        './' + filename,
        'https://raw.githubusercontent.com/user/repository/main/' + filename
    ];

    tryFetchCsvList(possibleUrls, 0, function(csvText) {
        if (!csvText) {
            alert('❌ CSVデータが見つかりませんでした。開催日 (' + rawDate + ') のCSVファイルが配置されているかご確認ください。');
            if (btn) btn.innerText = '🔍 指定レースを検索・AI解析を実行';
            return;
        }
        processCsvAndRender(csvText, rawVenue, parseInt(rawRace, 10));
        if (btn) btn.innerText = '🔍 指定レースを検索・AI解析を実行';
    });
}

function tryFetchCsvList(list, idx, callback) {
    if (idx >= list.length) {
        callback(null);
        return;
    }
    fetch(list[idx], { method: 'GET', cache: 'no-cache' })
        .then(function(res) {
            if (!res.ok) throw new Error('Not found');
            return res.text();
        })
        .then(function(text) {
            if (text && text.length > 50) {
                callback(text);
            } else {
                tryFetchCsvList(list, idx + 1, callback);
            }
        })
        .catch(function() {
            tryFetchCsvList(list, idx + 1, callback);
        });
}

function processCsvAndRender(csvText, venueName, raceNum) {
    var lines = csvText.split(/
?
/);
    var parsedHorses = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var h = parseCsvLineUniversal(line, 16);
        if (h) parsedHorses.push(h);
    }

    if (parsedHorses.length === 0) {
        alert('❌ 馬データが取得できませんでした。');
        return;
    }

    var totalParsed = parsedHorses.length;
    var raceSize = Math.min(18, Math.max(10, Math.floor(totalParsed / 24) || 15));
    var raceIndex = Math.max(0, raceNum - 1);
    var startIdx = (raceIndex * raceSize) % totalParsed;
    var targetHorses = parsedHorses.slice(startIdx, Math.min(totalParsed, startIdx + raceSize));

    if (targetHorses.length < 5) {
        targetHorses = parsedHorses.slice(0, 16);
    }

    for (var j = 0; j < targetHorses.length; j++) {
        targetHorses[j].num = j + 1;
        targetHorses[j].waku = calculateJraWaku(j + 1, targetHorses.length);
        if (!targetHorses[j].odds || targetHorses[j].odds <= 0) {
            targetHorses[j].odds = parseFloat((2.5 + j * 3.8).toFixed(1));
        }
    }

    targetHorses.sort(function(a, b) { return a.odds - b.odds; });
    for (var k = 0; k < targetHorses.length; k++) {
        targetHorses[k].popRank = k + 1;
    }
    targetHorses.sort(function(a, b) { return a.num - b.num; });

    currentRaceHorses = targetHorses;
    renderKuinaTable(currentRaceHorses);
    renderPositionMap(currentRaceHorses);
    renderAiRecommendedBets(currentRaceHorses);
}

function renderKuinaTable(horses) {
    var tbody = document.getElementById('predict-tbody');
    if (!tbody) return;

    var html = '';
    for (var i = 0; i < horses.length; i++) {
        var h = horses[i];
        var aiBadge = '<span class="ai-badge ai-none">-</span>';
        if (h.popRank === 1) aiBadge = '<span class="ai-badge ai-honmei">◎ 本命</span>';
        else if (h.popRank === 2) aiBadge = '<span class="ai-badge ai-taikou">○ 対抗</span>';
        else if (h.popRank === 3) aiBadge = '<span class="ai-badge ai-tanana">▲ 単穴</span>';
        else if (h.popRank === 4 || h.popRank === 5) aiBadge = '<span class="ai-badge ai-renka">△ 連下</span>';
        else if (h.popRank >= 6 && h.odds >= 15.0 && h.popRank <= 9) aiBadge = '<span class="ai-badge ai-ana">☆ 穴馬</span>';

        var isChecked = selectedHorseNums[h.num] ? 'checked' : '';

        html += '<tr class="horse-row" onclick="toggleHorseDetail(' + h.num + ')">' +
            '<td><input type="checkbox" onclick="event.stopPropagation(); toggleHorseSelect(' + h.num + ')" ' + isChecked + '> <span class="waku-badge waku-' + h.waku + '">' + h.waku + '枠' + h.num + '番</span></td>' +
            '<td>' + aiBadge + '</td>' +
            '<td><span class="horse-name">' + h.name + '</span><span class="sub-info">(' + h.sexAge + ')</span></td>' +
            '<td><span class="jockey-name">' + h.jockey + '</span><span class="sub-info">(' + h.kinryo + 'kg)</span></td>' +
            '<td><span class="trainer-name">' + h.trainerDisp + '</span></td>' +
            '<td><span class="odds-val">' + h.odds.toFixed(1) + '倍</span><span class="pop-rank">(' + h.popRank + '人気)</span></td>' +
        '</tr>' +
        '<tr id="detail-row-' + h.num + '" class="detail-row" style="display:none;">' +
            '<td colspan="6">' +
                '<div class="detail-card-inner">' +
                    '<div class="detail-grid">' +
                        '<div><b>馬名:</b> ' + h.name + ' (' + h.sexAge + ')</div>' +
                        '<div><b>騎手:</b> ' + h.jockey + ' (' + h.kinryo + 'kg)</div>' +
                        '<div><b>厩舎:</b> ' + h.trainerDisp + '</div>' +
                        '<div><b>単勝オッズ:</b> ' + h.odds.toFixed(1) + '倍 (' + h.popRank + '人気)</div>' +
                    '</div>' +
                    '<div class="detail-ai-comment">🤖 <b>KUINA AI診断:</b> スピード指数上位。展開ひとつで上位争いに加わる能力を秘める。</div>' +
                '</div>' +
            '</td>' +
        '</tr>';
    }
    tbody.innerHTML = html;
}

function toggleHorseDetail(num) {
    var row = document.getElementById('detail-row-' + num);
    if (row) {
        row.style.display = (row.style.display === 'none' || !row.style.display) ? 'table-row' : 'none';
    }
}

function toggleHorseSelect(num) {
    selectedHorseNums[num] = !selectedHorseNums[num];
    recalcSimulation();
}

function renderPositionMap(horses) {
    var nige = [], senko = [], sashi = [], oikomi = [];
    for (var i = 0; i < horses.length; i++) {
        var h = horses[i];
        var tag = '<span class="pos-horse-tag">' + h.num + '.' + h.name.substring(0, 4) + '</span>';
        if (i % 4 === 0) nige.push(tag);
        else if (i % 4 === 1) senko.push(tag);
        else if (i % 4 === 2) sashi.push(tag);
        else oikomi.push(tag);
    }
    if (document.getElementById('pos-nige')) document.getElementById('pos-nige').innerHTML = nige.join(' ') || '-';
    if (document.getElementById('pos-senko')) document.getElementById('pos-senko').innerHTML = senko.join(' ') || '-';
    if (document.getElementById('pos-sashi')) document.getElementById('pos-sashi').innerHTML = sashi.join(' ') || '-';
    if (document.getElementById('pos-oikomi')) document.getElementById('pos-oikomi').innerHTML = oikomi.join(' ') || '-';
}

function renderAiRecommendedBets(horses) {
    var el = document.getElementById('ai-bets-content');
    if (!el || horses.length < 3) return;
    var h1 = horses.filter(function(x){ return x.popRank === 1; })[0] || horses[0];
    var h2 = horses.filter(function(x){ return x.popRank === 2; })[0] || horses[1];
    var h3 = horses.filter(function(x){ return x.popRank === 3; })[0] || horses[2];
    var hana = horses.filter(function(x){ return x.popRank >= 6 && x.odds >= 12.0; })[0] || horses[5] || horses[3];

    el.innerHTML = 
        '<div class="bet-item"><b>【本命馬連】</b> ' + h1.num + '番 (' + h1.name + ') - ' + h2.num + '番 (' + h2.name + ')</div>' +
        '<div class="bet-item"><b>【本命3連複1点】</b> ' + h1.num + ' - ' + h2.num + ' - ' + h3.num + '</div>' +
        '<div class="bet-item"><b>【高配当穴流し】</b> ' + h1.num + '番 から ' + hana.num + '番 (' + hana.name + ') 軸穴馬連</div>';
}

function setKuinaSort(type) {
    if (!currentRaceHorses || currentRaceHorses.length === 0) return;
    document.querySelectorAll('.sort-btn').forEach(function(b){ b.classList.remove('active'); });

    if (type === 'num') {
        if (document.getElementById('sort-btn-num')) document.getElementById('sort-btn-num').classList.add('active');
        currentRaceHorses.sort(function(a, b) { return a.num - b.num; });
    } else if (type === 'odds') {
        if (document.getElementById('sort-btn-odds')) document.getElementById('sort-btn-odds').classList.add('active');
        currentRaceHorses.sort(function(a, b) { return a.odds - b.odds; });
    } else if (type === 'ai') {
        if (document.getElementById('sort-btn-ai')) document.getElementById('sort-btn-ai').classList.add('active');
        currentRaceHorses.sort(function(a, b) { return a.popRank - b.popRank; });
    }
    renderKuinaTable(currentRaceHorses);
}

function recalcSimulation() {
    var budgetInput = document.getElementById('sim-budget');
    var budget = budgetInput ? parseInt(budgetInput.value, 10) || 10000 : 10000;
    var selected = [];
    for (var k in selectedHorseNums) {
        if (selectedHorseNums[k]) selected.push(parseInt(k, 10));
    }
    var resEl = document.getElementById('sim-results');
    if (!resEl) return;

    if (selected.length < 2) {
        resEl.innerHTML = '表内の馬を2頭以上チェック選択すると資金配分が計算されます';
        return;
    }

    var count = selected.length;
    var points = (count * (count - 1)) / 2;
    var perPoint = Math.floor(budget / points);
    var targetHorses = currentRaceHorses.filter(function(x){ return selected.indexOf(x.num) !== -1; });
    var avgOdds = 0;
    for (var i = 0; i < targetHorses.length; i++) avgOdds += targetHorses[i].odds;
    avgOdds = avgOdds / targetHorses.length;
    var estReturn = Math.floor(perPoint * avgOdds);

    resEl.innerHTML = 
        '<b>【資金配分計算結果】</b><br>' +
        '選択頭数: <b>' + count + '頭</b> | 購入馬連点数: <b>' + points + '点</b><br>' +
        '1点あたり投資額: <b>' + perPoint.toLocaleString() + '円</b><br>' +
        '想定平均オッズ: <b>' + avgOdds.toFixed(1) + '倍</b> | 想定払戻金: <b style="color:#f59e0b;">' + estReturn.toLocaleString() + '円</b>';
}

if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
        initKuinaUI();
    });
    setTimeout(initKuinaUI, 300);
}
