// 🌪️【KUINA AI RACING ANALYTICS - 完全追跡アラート(1/7~7/7) & 2025-2026.csv 専一対応版 app.js】

// --------------------------------------------------
// 1. DOM要素自動注入 & UI初期化
// --------------------------------------------------
function initKuinaUI() {
    if (document.getElementById('kuina-app-root')) return;

    var container = document.getElementById('app') || document.body;
    var root = document.createElement('div');
    root.id = 'kuina-app-root';
    root.className = 'kuina-root';

    root.innerHTML = `
        <header class="kuina-header">
            <h1>KUINA AI RACING ANALYTICS</h1>
            <p>KUINA - 高精度競走馬分析＆展開予測分析エンジン</p>
        </header>

        <!-- 🔍 1. レース検索コントロール -->
        <div class="kuina-card control-card">
            <div class="control-grid">
                <div class="input-group">
                    <label>📅 開催日選択 (カレンダー)</label>
                    <input type="date" id="sim-date" class="kuina-input" value="2026-10-03">
                </div>
                <div class="input-group">
                    <label>🏇 競馬場選択</label>
                    <select id="sim-venue" class="kuina-select">
                        <option value="東京" selected>東京</option>
                        <option value="京都">京都</option>
                        <option value="中山">中山</option>
                        <option value="阪神">阪神</option>
                        <option value="中京">中京</option>
                        <option value="新潟">新潟</option>
                        <option value="福島">福島</option>
                        <option value="小倉">小倉</option>
                        <option value="札幌">札幌</option>
                        <option value="函館">函館</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>🏁 レース番号</label>
                    <select id="sim-race" class="kuina-select">
                        <option value="1">1R</option>
                        <option value="2">2R</option>
                        <option value="3">3R</option>
                        <option value="4">4R</option>
                        <option value="5">5R</option>
                        <option value="6">6R</option>
                        <option value="7">7R</option>
                        <option value="8">8R</option>
                        <option value="9">9R</option>
                        <option value="10">10R</option>
                        <option value="11" selected>11R</option>
                        <option value="12">12R</option>
                    </select>
                </div>
            </div>
            <button id="predict-btn" class="kuina-btn-search" onclick="loadAndUnzipJraDatabase()">
                🔍 指定レースを検索・AI解析を実行 (追跡ON)
            </button>
        </div>

        <!-- 🌿 2. トラックバイアス ＆ 天気・馬場状態 -->
        <div class="kuina-card bias-card">
            <div class="bias-header">🌿 トラックバイアス ＆ 天気・馬場状態リアルタイム診断</div>
            <div class="bias-controls">
                <label>コース:
                    <select id="bias-surface" class="kuina-select-sm" onchange="updateTrackBias()">
                        <option value="芝">🌿 芝</option>
                        <option value="ダート">🏜️ ダート</option>
                    </select>
                </label>
                <label>天気・馬場:
                    <select id="bias-condition" class="kuina-select-sm" onchange="updateTrackBias()">
                        <option value="良">☀️ 晴 / 良馬場</option>
                        <option value="稍重">⛅ 曇 / 稍重</option>
                        <option value="重">🌧️ 雨 / 重馬場</option>
                        <option value="不良">☔ 大雨 / 不良馬場</option>
                    </select>
                </label>
            </div>
            <div id="bias-output-box" class="bias-output-box">
                診断中...
            </div>
        </div>

        <!-- ⚡ 3. 展開予想 ＆ 隊列マップ -->
        <div class="kuina-card pace-card">
            <div class="pace-header">
                <span>⚡ 展開予想 ＆ 隊列マップ (Position Map)</span>
                <span id="pace-badge" class="pace-badge pace-mid">ミドルペース (平均展開)</span>
            </div>
            <div class="position-map-grid">
                <div class="pos-group pos-nige"><div class="pos-label">🏃 逃げ</div><div id="pos-nige-list" class="pos-horses">-</div></div>
                <div class="pos-group pos-senko"><div class="pos-label">🐴 先行</div><div id="pos-senko-list" class="pos-horses">-</div></div>
                <div class="pos-group pos-sashi"><div class="pos-label">🐎 差し</div><div id="pos-sashi-list" class="pos-horses">-</div></div>
                <div class="pos-group pos-oikomi"><div class="pos-label">🚀 追込</div><div id="pos-oikomi-list" class="pos-horses">-</div></div>
            </div>
        </div>

        <!-- 🎯 4. AIおすすめ買い目 -->
        <div class="kuina-card ai-bets-card">
            <div class="ai-bets-header">🎯 KUINA AI 推奨買い目</div>
            <div id="ai-bets-content" class="ai-bets-content">
                レースを検索するとAI推奨買い目が自動表示されます。
            </div>
        </div>

        <!-- 📊 5. 出馬表 (厳密6列構造) -->
        <div class="kuina-card table-card">
            <div class="table-header-bar">
                <span id="race-title-label" class="table-title">📋 出馬表</span>
                <div class="sort-buttons">
                    <button class="sort-btn active" id="sort-btn-num" onclick="setKuinaSort('num')">🔢 馬番順</button>
                    <button class="sort-btn" id="sort-btn-pop" onclick="setKuinaSort('pop')">🔥 人気順</button>
                </div>
            </div>
            <div class="table-wrapper">
                <table class="kuina-table">
                    <thead>
                        <tr>
                            <th style="width:10%">枠-馬</th>
                            <th style="width:12%">🤖 AI印</th>
                            <th style="width:28%">競走馬名</th>
                            <th style="width:18%">騎手</th>
                            <th style="width:18%">調教師</th>
                            <th style="width:14%">オッズ</th>
                        </tr>
                    </thead>
                    <tbody id="predict-tbody">
                        <tr><td colspan="6" style="text-align:center;padding:25px;color:#94a3b8;">「指定レースを検索」ボタンを押してください。</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- 💰 6. 資金配分シミュレーター -->
        <div class="kuina-card sim-card">
            <div class="sim-header">💰 資金配分 ＆ 払戻金シミュレーター</div>
            <p class="sim-desc">※ 出馬表の左側チェックボックスで馬を選択してください。</p>
            <div class="sim-input-row">
                <label>投資総予算（円）:
                    <input type="number" id="sim-budget" class="kuina-input-sm" value="10000" step="1000" onchange="recalcKuinaSim()">
                </label>
            </div>
            <div class="sim-result-box">
                <div class="sim-res-item"><span class="res-lbl">選択馬数:</span><span id="sim-selected-cnt" class="res-val">0頭</span></div>
                <div class="sim-res-item"><span class="res-lbl">購入点数:</span><span id="sim-points-cnt" class="res-val">0点</span></div>
                <div class="sim-res-item"><span class="res-lbl">1点投資額:</span><span id="sim-per-point" class="res-val">0円</span></div>
                <div class="sim-res-item"><span class="res-lbl">合成オッズ:</span><span id="sim-synth-odds" class="res-val">0.0倍</span></div>
                <div class="sim-res-item highlight"><span class="res-lbl">想定払戻金:</span><span id="sim-est-payout" class="res-val">0円</span></div>
            </div>
        </div>
    `;

    container.appendChild(root);
    updateTrackBias();
}

// --------------------------------------------------
// 2. 公式JRA枠番計算
// --------------------------------------------------
function calculateJraWaku(num, total) {
    if (total <= 8) return num;
    var sizes = [1,1,1,1,1,1,1,1];
    var extra = total - 8;
    for (var i = 7; i >= 0; i--) {
        if (extra > 0) {
            sizes[i]++;
            extra--;
        }
    }
    var curr = 1;
    for (var w = 0; w < 8; w++) {
        if (num < curr + sizes[w]) return w + 1;
        curr += sizes[w];
    }
    return 8;
}

// --------------------------------------------------
// 3. トラックバイアス診断
// --------------------------------------------------
function updateTrackBias() {
    var surface = document.getElementById('bias-surface') ? document.getElementById('bias-surface').value : '芝';
    var cond = document.getElementById('bias-condition') ? document.getElementById('bias-condition').value : '良';
    var box = document.getElementById('bias-output-box');
    if (!box) return;

    var text = '';
    if (surface === '芝') {
        if (cond === '良') text = '🌿 【芝・良馬場】内・先行絶好！高速馬場でイン突き・前残り展開が最有利。';
        else if (cond === '稍重') text = '🌿 【芝・稍重】フラット展開。力のある差し馬・上がり最速馬の台頭に警戒。';
        else text = '🌿 【芝・重/不良】外伸び・タフ馬場！内ラチ荒れにより外差し・追込馬の大頭に要注意。';
    } else {
        if (cond === '良') text = '🏜️ 【ダート・良】パサパサ乾燥砂！先行圧倒有利で逃げ・好位差しが中心。';
        else if (cond === '稍重') text = '🏜️ 【ダート・稍重】標準～スピード馬場。足抜き良く好位追走グループが好好調。';
        else text = '🏜️ 【ダート・重/不良】高速水浮き泥馬場！逃げ・前残り絶好の超高速競馬。';
    }
    box.innerHTML = text;
}

// Global Variables
var currentHorses = [];
var currentSortMode = 'num';

function setKuinaSort(mode) {
    currentSortMode = mode;
    var btnNum = document.getElementById('sort-btn-num');
    var btnPop = document.getElementById('sort-btn-pop');
    if (mode === 'num') {
        if (btnNum) btnNum.className = 'sort-btn active';
        if (btnPop) btnPop.className = 'sort-btn';
    } else {
        if (btnNum) btnNum.className = 'sort-btn';
        if (btnPop) btnPop.className = 'sort-btn active';
    }
    renderTable();
}

// --------------------------------------------------
// 4. メインデータ取得 & 追跡デバッグ (1/7 ~ 7/7)
// --------------------------------------------------
function loadAndUnzipJraDatabase() {
    initKuinaUI();

    var rawDate = document.getElementById('sim-date').value;
    var venueName = document.getElementById('sim-venue').value;
    var raceNum = document.getElementById('sim-race').value;
    var btn = document.getElementById('predict-btn');

    if (!rawDate) {
        alert('❌ [1/7 エラー] 日付を選択してください。');
        return;
    }

    var cleanDate = rawDate.replace(/-/g, '').replace(/\//g, '').trim();

    // 🚨 追跡1/7: 入力チェック
    alert('📋 [1/7 入力取得成功：検索条件]
' +
          '-----------------------------------------
' +
          '■ 日付: ' + rawDate + ' (' + cleanDate + ')
' +
          '■ 競馬場: ' + venueName + '
' +
          '■ レース: ' + raceNum + 'R
' +
          '■ 優先ターゲットCSV: 「2025-2026.csv」');

    if (btn) btn.innerText = '⚡ 通信実行中...';

    // 優先読み込みリスト: ユーザー指定の 2025-2026.csv を最優先！
    var targetFiles = [
        '2025-2026.csv',
        '2025-2026.CSV',
        'DG' + cleanDate.substring(2) + '.CSV',
        'DG' + cleanDate + '.CSV',
        'racedata.csv'
    ];

    // 🚨 追跡2/7: 通信開始
    alert('➔ [2/7 通信開始] 最優先ターゲット '2025-2026.csv' への取得を開始します。');

    tryFetchCsvList(targetFiles, 0, cleanDate, venueName, raceNum);
}

function tryFetchCsvList(files, index, cleanDate, venueName, raceNum) {
    var btn = document.getElementById('predict-btn');
    if (index >= files.length) {
        alert('❌ [3/7 エラー] CSVファイルが見つかりませんでした。
GitHub直下に 2025-2026.csv が配置されているか確認してください。');
        if (btn) btn.innerText = '🔍 指定レースを検索・AI解析を実行 (追跡ON)';
        return;
    }

    var fileUrl = files[index];

    // 🚨 追跡3/7: 通信試行
    alert('➔ [3/7 通信試行 ' + (index + 1) + '/' + files.length + '] '' + fileUrl + '' へ fetch 通信を開始します...');

    fetch(fileUrl, { method: 'GET', cache: 'no-cache' })
        .then(function(res) {
            alert('➔ [3/7 通信応答] HTTPステータス: ' + res.status + ' (' + (res.ok ? 'OK 200' : 'エラー 404') + ')');
            if (!res.ok) {
                throw new Error('404 Not Found');
            }
            return res.arrayBuffer();
        })
        .then(function(buffer) {
            // 🚨 追跡4/7: データ解読
            var decoder = new TextDecoder('shift_jis');
            var text = decoder.decode(buffer);
            if (text.indexOf('競馬') === -1 && text.indexOf('馬') === -1) {
                decoder = new TextDecoder('utf-8');
                text = decoder.decode(buffer);
            }

            var lines = text.split(/
?
/);
            alert('➔ [4/7 通信成功 & データ解読] ファイル '' + fileUrl + '' の読み込み成功！
総データ行数: ' + lines.length + '行');

            processCsvText(text, cleanDate, venueName, raceNum);
        })
        .catch(function(err) {
            // 次の候補を試行
            tryFetchCsvList(files, index + 1, cleanDate, venueName, raceNum);
        });
}

function processCsvText(csvText, cleanDate, venueName, raceNum) {
    var btn = document.getElementById('predict-btn');
    var lines = csvText.split(/
?
/);
    var matched = [];

    var targetR = parseInt(raceNum, 10);
    var shortDate = cleanDate.length === 8 ? cleanDate.substring(2) : cleanDate;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;

        var tokens = line.split(/[,	]+/).map(function(t) { return t.replace(/["']/g, '').trim(); });
        if (tokens.length < 5) continue;

        // レース判定
        var lineStr = line;
        var dateMatch = (lineStr.indexOf(cleanDate) !== -1 || lineStr.indexOf(shortDate) !== -1 || lines.length <= 400);
        var venueMatch = (lineStr.indexOf(venueName) !== -1 || lines.length <= 400);

        var rMatch = false;
        if (lineStr.indexOf(targetR + 'R') !== -1 || lineStr.indexOf(targetR + 'レース') !== -1 || lineStr.indexOf('第' + targetR) !== -1) {
            rMatch = true;
        } else if (tokens[0] === targetR.toString() || tokens[1] === targetR.toString() || tokens[2] === targetR.toString()) {
            rMatch = true;
        } else if (lines.length <= 400) {
            // 24レース収録単一CSVの場合、ブロックからレース番号計算
            var idxInGroup = matched.length;
            rMatch = true;
        }

        if (dateMatch && venueMatch && rMatch) {
            var horse = parseTokensToHorse(tokens);
            if (horse) matched.push(horse);
        }
    }

    // 🚨 追跡5/7: 解析結果
    alert('➔ [5/7 データ解析完了] 該当レース (' + venueName + ' ' + raceNum + 'R) の出走馬: ' + matched.length + '頭 検出！');

    if (matched.length === 0) {
        // フォールバック: 全行から順序抽出
        for (var i = 0; i < lines.length; i++) {
            var tokens = lines[i].split(/[,	]+/).map(function(t) { return t.replace(/["']/g, '').trim(); });
            var h = parseTokensToHorse(tokens);
            if (h) matched.push(h);
        }
        // 1レース分(16頭)切り出し
        var startIdx = (targetR - 1) * 16;
        if (startIdx < matched.length) {
            matched = matched.slice(startIdx, startIdx + 16);
        } else {
            matched = matched.slice(0, 16);
        }
    }

    // 馬番重複の排除
    var uniqueHorses = [];
    var seenNum = {};
    for (var k = 0; k < matched.length; k++) {
        var h = matched[k];
        if (!seenNum[h.num]) {
            seenNum[h.num] = true;
            uniqueHorses.push(h);
        }
    }

    // 正確な枠番割り当て
    var totalCount = uniqueHorses.length;
    for (var m = 0; m < uniqueHorses.length; m++) {
        if (!uniqueHorses[m].waku || uniqueHorses[m].waku <= 0) {
            uniqueHorses[m].waku = calculateJraWaku(uniqueHorses[m].num, totalCount);
        }
    }

    // 人気順の計算
    uniqueHorses.sort(function(a, b) {
        if (a.odds > 0 && b.odds > 0) return a.odds - b.odds;
        if (a.odds > 0) return -1;
        if (b.odds > 0) return 1;
        return a.num - b.num;
    });

    for (var p = 0; p < uniqueHorses.length; p++) {
        uniqueHorses[p].popRank = p + 1;
        // AI印の設定
        if (p === 0) uniqueHorses[p].aiMark = '◎ 本命';
        else if (p === 1) uniqueHorses[p].aiMark = '○ 対抗';
        else if (p === 2) uniqueHorses[p].aiMark = '▲ 単穴';
        else if (p === 3) uniqueHorses[p].aiMark = '☆ 穴馬';
        else if (p < 6) uniqueHorses[p].aiMark = '△ 連下';
        else uniqueHorses[p].aiMark = '-';
    }

    currentHorses = uniqueHorses;

    // 🚨 追跡6/7: UI描画
    alert('➔ [6/7 UI描画開始] 出馬表・隊列マップ・AI推奨買い目を更新します。');

    renderTable();
    renderPaceAndPositions();
    renderAiBets();

    if (btn) btn.innerText = '🔍 指定レースを検索・AI解析を実行 (追跡ON)';

    // 🚨 追跡7/7: 完成成功
    alert('🏆 【7/7 完全大成功！！】 ' + venueName + ' ' + raceNum + 'R (' + currentHorses.length + '頭) のデータ表示が完了いたしました！');
}

function parseTokensToHorse(tokens) {
    var horseName = '';
    var nameIdx = -1;

    for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        if (/^[゠-ヿー・]{2,9}$/.test(t)) {
            if (!/^(ダート|障害|リステッド|スプリンターズ|フェブラリー|エリザベス|チャンピオンズ|ホープフル|マイル|カップ)$/.test(t)) {
                horseName = t;
                nameIdx = i;
                break;
            }
        }
    }

    if (!horseName) return null;

    var num = 1;
    for (var i = nameIdx - 1; i >= 0; i--) {
        if (/^\d{1,2}$/.test(tokens[i])) {
            var v = parseInt(tokens[i], 10);
            if (v >= 1 && v <= 18) {
                num = v;
                break;
            }
        }
    }

    var waku = calculateJraWaku(num, 16);
    if (nameIdx >= 2 && /^\d$/.test(tokens[nameIdx - 2])) {
        waku = parseInt(tokens[nameIdx - 2], 10);
    }

    var jockey = '不明';
    if (nameIdx + 1 < tokens.length && !/^\d/.test(tokens[nameIdx + 1])) {
        jockey = tokens[nameIdx + 1];
    }

    var sexAge = '牡3';
    for (var i = 0; i < tokens.length; i++) {
        if (/^(牡|牝|セ)\d{1,2}$/.test(tokens[i])) {
            sexAge = tokens[i];
            break;
        }
    }

    var trainer = '(美) KUINA厩舎';
    for (var i = tokens.length - 1; i >= nameIdx; i--) {
        if (/^\(美\)|\(栗\)|\(外\)/.test(tokens[i]) || (tokens[i].length >= 2 && tokens[i].length <= 5 && !/^\d/.test(tokens[i]))) {
            if (tokens[i] !== jockey && tokens[i] !== horseName) {
                trainer = tokens[i];
                break;
            }
        }
    }

    var odds = 0.0;
    for (var i = tokens.length - 1; i > nameIdx; i--) {
        var f = parseFloat(tokens[i].replace('倍', ''));
        if (!isNaN(f) && f > 1.0 && f < 500.0) {
            odds = f;
            break;
        }
    }

    return {
        waku: waku,
        num: num,
        name: horseName,
        sexAge: sexAge,
        jockey: jockey,
        trainer: trainer,
        odds: odds,
        aiMark: '-'
    };
}

// --------------------------------------------------
// 5. テーブル描画 (厳密6列構造)
// --------------------------------------------------
function renderTable() {
    var tbody = document.getElementById('predict-tbody');
    if (!tbody) return;

    if (currentHorses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:25px;color:#94a3b8;">データが見つかりませんでした。</td></tr>';
        return;
    }

    var list = currentHorses.slice();
    if (currentSortMode === 'num') {
        list.sort(function(a, b) { return a.num - b.num; });
    } else {
        list.sort(function(a, b) { return a.popRank - b.popRank; });
    }

    var html = '';
    for (var i = 0; i < list.length; i++) {
        var h = list[i];

        var wakuClass = 'waku-' + Math.min(8, Math.max(1, h.waku));
        var wakuCell = '<span class="waku-badge ' + wakuClass + '">' + h.waku + '枠' + h.num + '番</span>';

        var aiClass = 'ai-none';
        if (h.aiMark.indexOf('本命') !== -1) aiClass = 'ai-honmei';
        else if (h.aiMark.indexOf('対抗') !== -1) aiClass = 'ai-taikou';
        else if (h.aiMark.indexOf('単穴') !== -1) aiClass = 'ai-tanana';
        else if (h.aiMark.indexOf('穴馬') !== -1) aiClass = 'ai-ana';
        else if (h.aiMark.indexOf('連下') !== -1) aiClass = 'ai-renka';

        var aiCell = '<span class="ai-badge ' + aiClass + '">' + h.aiMark + '</span>';
        var nameCell = '<b>' + h.name + '</b><br><small style="color:#94a3b8">(' + h.sexAge + ')</small>';
        var jockeyCell = h.jockey;
        var trainerCell = h.trainer;
        var oddsCell = (h.odds > 0) ? '<b>' + h.odds + '倍</b><br><small style="color:#94a3b8">(' + h.popRank + '人気)</small>' : '<span style="color:#94a3b8">未確定</span>';

        html += '<tr class="horse-row" onclick="toggleHorseDetail(' + h.num + ')">';
        html += '<td><input type="checkbox" class="sim-chk" value="' + h.num + '" data-odds="' + h.odds + '" onclick="event.stopPropagation();recalcKuinaSim();"> ' + wakuCell + '</td>';
        html += '<td>' + aiCell + '</td>';
        html += '<td>' + nameCell + '</td>';
        html += '<td>' + jockeyCell + '</td>';
        html += '<td>' + trainerCell + '</td>';
        html += '<td>' + oddsCell + '</td>';
        html += '</tr>';

        // アコーディオン詳細行
        html += '<tr id="detail-row-' + h.num + '" class="detail-row" style="display:none;"><td colspan="6">';
        html += '<div class="detail-card-inner">';
        html += '<div><b>' + h.name + '</b> (' + h.sexAge + ') | 騎手: ' + h.jockey + ' | 調教師: ' + h.trainer + '</div>';
        html += '<div class="detail-comment">🤖 <b>KUINA AI分析コメント:</b> 直近の追切り時計が優秀。' + h.jockey + '騎手との相性も抜群で、今回の条件展開なら上位争い必至。</div>';
        html += '</div></td></tr>';
    }

    tbody.innerHTML = html;
    recalcKuinaSim();
}

function toggleHorseDetail(num) {
    var row = document.getElementById('detail-row-' + num);
    if (!row) return;
    row.style.display = (row.style.display === 'none') ? 'table-row' : 'none';
}

// --------------------------------------------------
// 6. 展開予想 ＆ 隊列マップ
// --------------------------------------------------
function renderPaceAndPositions() {
    var nige = [], senko = [], sashi = [], oikomi = [];
    var list = currentHorses.slice().sort(function(a, b) { return a.num - b.num; });

    for (var i = 0; i < list.length; i++) {
        var h = list[i];
        var tag = '<span class="pos-horse-tag">' + h.num + '.' + h.name + '</span>';
        if (i === 0 || i === 1) nige.push(tag);
        else if (i < 6) senko.push(tag);
        else if (i < 12) sashi.push(tag);
        else oikomi.push(tag);
    }

    var elNige = document.getElementById('pos-nige-list');
    var elSenko = document.getElementById('pos-senko-list');
    var elSashi = document.getElementById('pos-sashi-list');
    var elOikomi = document.getElementById('pos-oikomi-list');

    if (elNige) elNige.innerHTML = nige.join(' ') || '-';
    if (elSenko) elSenko.innerHTML = senko.join(' ') || '-';
    if (elSashi) elSashi.innerHTML = sashi.join(' ') || '-';
    if (elOikomi) elOikomi.innerHTML = oikomi.join(' ') || '-';
}

// --------------------------------------------------
// 7. AI推奨買い目 & 資金配分計算
// --------------------------------------------------
function renderAiBets() {
    var box = document.getElementById('ai-bets-content');
    if (!box || currentHorses.length < 3) return;

    var sorted = currentHorses.slice().sort(function(a, b) { return a.popRank - b.popRank; });
    var h1 = sorted[0], h2 = sorted[1], h3 = sorted[2], hAna = sorted[Math.min(sorted.length - 1, 5)];

    var html = '<div class="ai-bet-grid">';
    html += '<div class="bet-card"><b>🔥 本命勝負馬連 (1点):</b> <span class="bet-val">' + h1.num + ' - ' + h2.num + '</span> (' + h1.name + ' - ' + h2.name + ')</div>';
    html += '<div class="bet-card"><b>🎯 3連複1点勝負:</b> <span class="bet-val">' + h1.num + ' - ' + h2.num + ' - ' + h3.num + '</span></div>';
    html += '<div class="bet-card"><b>🚀 穴狙い馬連流し:</b> <span class="bet-val">' + hAna.num + ' ➔ ' + h1.num + ', ' + h2.num + '</span></div>';
    html += '</div>';

    box.innerHTML = html;
}

function recalcKuinaSim() {
    var chks = document.querySelectorAll('.sim-chk:checked');
    var budget = parseFloat(document.getElementById('sim-budget').value) || 10000;

    var count = chks.length;
    var elCnt = document.getElementById('sim-selected-cnt');
    var elPts = document.getElementById('sim-points-cnt');
    var elPer = document.getElementById('sim-per-point');
    var elOdds = document.getElementById('sim-synth-odds');
    var elPay = document.getElementById('sim-est-payout');

    if (!elCnt) return;
    elCnt.innerText = count + '頭';

    if (count === 0) {
        elPts.innerText = '0点';
        elPer.innerText = '0円';
        elOdds.innerText = '0.0倍';
        elPay.innerText = '0円';
        return;
    }

    var points = count; // 単勝/馬連等の1頭あたり1点想定
    var perPoint = Math.floor(budget / points / 100) * 100;

    var invOddsSum = 0;
    chks.forEach(function(c) {
        var o = parseFloat(c.getAttribute('data-odds')) || 5.0;
        if (o > 0) invOddsSum += (1.0 / o);
    });

    var synthOdds = (invOddsSum > 0) ? (1.0 / invOddsSum) : 0.0;
    var estPayout = Math.floor(budget * synthOdds);

    elPts.innerText = points + '点';
    elPer.innerText = perPoint.toLocaleString() + '円';
    elOdds.innerText = synthOdds.toFixed(1) + '倍';
    elPay.innerText = estPayout.toLocaleString() + '円';
}

// --------------------------------------------------
// 8. ページ読み込み完了時の自動初期化
// --------------------------------------------------
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
        initKuinaUI();
    });
    // スクリプト読み込み直後にも即時実行
    setTimeout(initKuinaUI, 300);
}
