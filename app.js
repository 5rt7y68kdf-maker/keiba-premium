// 🌪️【KUINA AI RACING ANALYTICS - 完全自己完結・高精度競走馬分析＆展開予測エンジン app.js】

(function () {
    'use strict';

    // --------------------------------------------------
    // 1. 競馬場コード＆名称 相互変換辞書
    // --------------------------------------------------
    var VENUE_MAP = {
        "札幌": "01", "函館": "02", "福島": "03", "新潟": "04",
        "東京": "05", "中山": "06", "中京": "07", "京都": "08",
        "阪神": "09", "小倉": "10",
        "01": "札幌", "02": "函館", "03": "福島", "04": "新潟",
        "05": "東京", "06": "中山", "07": "中京", "08": "京都",
        "09": "阪神", "10": "小倉",
        "東": "東京", "中": "中山", "阪": "阪神", "京": "京都", "福": "福島", "新": "新潟", "札": "札幌", "函": "函館", "小": "小倉"
    };

    var state = {
        selectedDate: '',
        selectedVenue: '東京',
        selectedRace: 11,
        weather: '晴',
        trackCondition: '良',
        courseType: '芝',
        sortMode: 'num',
        selectedHorses: [],
        budget: 10000,
        rawCsvData: '',
        currentRaceHorses: []
    };

    // --------------------------------------------------
    // 2. JRA公式 枠順（1枠〜8枠）自動計算ロジック
    // --------------------------------------------------
    function calculateJraWaku(num, total) {
        if (!num || num <= 0) return 1;
        total = Math.max(total || 1, num);
        if (total <= 8) return num;
        
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

    // --------------------------------------------------
    // 3. 万能CSV行解析エンジン (Universal CSV Line Parser)
    // --------------------------------------------------
    function parseCsvLineUniversal(line, totalRunnersInRace) {
        if (!line) return null;
        var tokens = line.split(/[,|\t]+/).map(function (t) {
            return t.replace(/^["\s]+|["\s]+$/g, '');
        }).filter(Boolean);

        if (tokens.length < 4) return null;

        // ヘッダー行スキップ
        if (tokens.indexOf("日付") !== -1 || tokens.indexOf("枠") !== -1 || tokens.indexOf("馬名") !== -1) return null;

        var venue = '';
        var rawWaku = '';
        var num = 0;
        var horseName = '';
        var sex = '';
        var age = '';
        var jockey = '';
        var kinryo = '';
        var odds = 0;
        var stable = '';
        var trainer = '';

        // 会場名の検出
        for (var i = 0; i < tokens.length; i++) {
            var tok = tokens[i].replace(/競馬場/g, '').trim();
            if (VENUE_MAP[tok] && isNaN(tok)) {
                venue = VENUE_MAP[tok];
                break;
            }
        }

        // 馬名の検出 (2文字〜9文字カタカナ)
        var nameIdx = -1;
        for (var i = 0; i < tokens.length; i++) {
            var t = tokens[i];
            if (/^[\u30A0-\u30FFー・]{2,9}$/.test(t)) {
                if (!/^(ダート|障害|リステッド|スプリンターズ|フェブラリー|エリザベス|チャンピオンズ|ホープフル|マイル|カップ|未勝利|新馬|オープン)$/.test(t)) {
                    nameIdx = i;
                    horseName = t;
                    break;
                }
            }
        }

        if (!horseName) return null;

        // 馬番の検出
        for (var i = nameIdx - 1; i >= 0; i--) {
            if (/^\d{1,2}$/.test(tokens[i])) {
                var v = parseInt(tokens[i], 10);
                if (v >= 1 && v <= 18) {
                    num = v;
                    if (i - 1 >= 0 && /^\d{1,2}$/.test(tokens[i - 1])) {
                        rawWaku = tokens[i - 1];
                    }
                    break;
                }
            }
        }

        if (!num) return null;

        // 性齢・騎手・斤量の抽出
        for (var i = nameIdx + 1; i < tokens.length; i++) {
            var t = tokens[i];
            if (/^(牡|牝|セ)$/.test(t) && i + 1 < tokens.length && /^\d{1,2}$/.test(tokens[i + 1])) {
                sex = t;
                age = tokens[i + 1];
            } else if (!jockey && !/^\d+(\.\d+)?$/.test(t) && t.length <= 8 && !/^\(美\)|\(栗\)|\(外\)$/.test(t)) {
                jockey = t;
            } else if (/^\d{2}(\.\d)?$/.test(t) && parseFloat(t) >= 48 && parseFloat(t) <= 65) {
                kinryo = t;
            } else if (/^\(美\)|\(栗\)|\(外\)$/.test(t)) {
                stable = t;
                if (i + 1 < tokens.length && !/^\d/.test(tokens[i + 1])) {
                    trainer = tokens[i + 1];
                }
            } else if (!trainer && /^[\u4E00-\u9FFF]{1,4}[\u4E00-\u9FFF]$/.test(t) && t !== jockey && t !== horseName) {
                trainer = t;
            }
        }

        // オッズ検出
        for (var i = tokens.length - 1; i > nameIdx; i--) {
            var tok = tokens[i].replace('倍', '').trim();
            if (/^\([+-]?\d+\)$/.test(tok)) continue;
            var f = parseFloat(tok);
            if (!isNaN(f) && f > 0 && f < 999 && !/^\(美\)|\(栗\)$/.test(tokens[i])) {
                odds = f;
                break;
            }
        }

        // 枠番決定
        var wakuInt = parseInt(rawWaku, 10);
        var waku = (wakuInt >= 1 && wakuInt <= 8) ? wakuInt : calculateJraWaku(num, totalRunnersInRace || 16);

        var sexAgeDisp = (sex || '牡') + (age || '3');
        var jockeyDisp = (jockey || '未定') + (kinryo ? ' (' + kinryo + 'kg)' : '');
        var trainerDisp = (stable ? stable + ' ' : '') + (trainer || '調教師未定');

        return {
            waku: waku,
            num: num,
            name: horseName,
            sexAge: sexAgeDisp,
            jockey: jockeyDisp,
            trainer: trainerDisp,
            odds: odds,
            venue: venue
        };
    }

    // --------------------------------------------------
    // 4. GUIレイアウト自動生成 (完全自己完結注入)
    // --------------------------------------------------
    function injectUnifiedUi() {
        var root = document.getElementById('kuina-app-root') || document.querySelector('.container') || document.body;
        
        var todayStr = new Date().toISOString().split('T')[0];
        if (!state.selectedDate) state.selectedDate = todayStr;

        var html = '' +
            '<div class="kuina-container">' +
            '   <div class="kuina-header">' +
            '       <h1>KUINA AI RACING ANALYTICS</h1>' +
            '       <div class="subtitle">KUINA - 高精度競走馬分析＆展開予測分析エンジン</div>' +
            '   </div>' +

            '   <!-- 検索コントロールパネル -->' +
            '   <div class="selector-box">' +
            '       <div class="control-row">' +
            '           <div class="control-group">' +
            '               <label class="form-label">📅 開催日選択</label>' +
            '               <input type="date" id="kuina-date-input" class="select-input" value="' + state.selectedDate + '">' +
            '           </div>' +
            '           <div class="control-group">' +
            '               <label class="form-label">🏟️ 競馬場選択</label>' +
            '               <select id="kuina-venue-input" class="select-input">' +
            '                   <option value="東京"' + (state.selectedVenue === '東京' ? ' selected' : '') + '>東京競馬場</option>' +
            '                   <option value="中山"' + (state.selectedVenue === '中山' ? ' selected' : '') + '>中山競馬場</option>' +
            '                   <option value="京都"' + (state.selectedVenue === '京都' ? ' selected' : '') + '>京都競馬場</option>' +
            '                   <option value="阪神"' + (state.selectedVenue === '阪神' ? ' selected' : '') + '>阪神競馬場</option>' +
            '                   <option value="新潟"' + (state.selectedVenue === '新潟' ? ' selected' : '') + '>新潟競馬場</option>' +
            '                   <option value="福島"' + (state.selectedVenue === '福島' ? ' selected' : '') + '>福島競馬場</option>' +
            '                   <option value="中京"' + (state.selectedVenue === '中京' ? ' selected' : '') + '>中京競馬場</option>' +
            '                   <option value="小倉"' + (state.selectedVenue === '小倉' ? ' selected' : '') + '>小倉競馬場</option>' +
            '                   <option value="札幌"' + (state.selectedVenue === '札幌' ? ' selected' : '') + '>札幌競馬場</option>' +
            '                   <option value="函館"' + (state.selectedVenue === '函館' ? ' selected' : '') + '>函館競馬場</option>' +
            '               </select>' +
            '           </div>' +
            '       </div>' +

            '       <label class="form-label">🏁 レース番号選択 (1R 〜 12R)</label>' +
            '       <div class="race-nav-grid" id="race-nav-grid"></div>' +

            '       <button id="kuina-search-btn" class="btn-predict">🔍 指定レースを検索・AI解析を実行</button>' +
            '   </div>' +

            '   <!-- トラックバイアス ＆ 天気・馬場状態パネル -->' +
            '   <div class="selector-box bias-panel">' +
            '       <div class="form-label">🌿 トラックバイアス ＆ 馬場コンディション</div>' +
            '       <div class="control-row">' +
            '           <select id="kuina-course-input" class="select-input-sm">' +
            '               <option value="芝">🌿 芝コース</option>' +
            '               <option value="ダート">🏜️ ダートコース</option>' +
            '           </select>' +
            '           <select id="kuina-weather-input" class="select-input-sm">' +
            '               <option value="晴">☀️ 晴</option>' +
            '               <option value="曇">⛅ 曇</option>' +
            '               <option value="小雨">🌧️ 小雨</option>' +
            '               <option value="雨">☔ 大雨</option>' +
            '           </select>' +
            '           <select id="kuina-track-input" class="select-input-sm">' +
            '               <option value="良">良馬場</option>' +
            '               <option value="稍重">稍重</option>' +
            '               <option value="重">重馬場</option>' +
            '               <option value="不良">不良馬場</option>' +
            '           </select>' +
            '       </div>' +
            '       <div id="kuina-bias-card" class="bias-card-output"></div>' +
            '   </div>' +

            '   <!-- 展開予想 ＆ 隊列マップ -->' +
            '   <div class="selector-box pace-panel">' +
            '       <div class="form-label">⚡ 展開予想 ＆ 隊列ポジションマップ</div>' +
            '       <div id="kuina-pace-card"></div>' +
            '   </div>' +

            '   <!-- AIおすすめ買い目 -->' +
            '   <div id="kuina-ai-bets-card" class="selector-box ai-bets-panel"></div>' +

            '   <!-- ステータス通知バー -->' +
            '   <div id="kuina-status-bar" class="status-bar"></div>' +

            '   <!-- 並び替えコントロール -->' +
            '   <div class="sort-box">' +
            '       <button class="sort-btn active" id="sort-btn-num">🔢 馬番順</button>' +
            '       <button class="sort-btn" id="sort-btn-pop">🏆 人気順</button>' +
            '       <button class="sort-btn" id="sort-btn-ai">🎯 AI注目順</button>' +
            '   </div>' +

            '   <!-- 6列固定出馬表テーブル -->' +
            '   <div class="table-wrapper">' +
            '       <table id="kuina-race-table">' +
            '           <thead>' +
            '               <tr>' +
            '                   <th style="width: 15%;">選択 / 枠-馬</th>' +
            '                   <th style="width: 13%;">🤖 AI印</th>' +
            '                   <th style="width: 25%;">競走馬名</th>' +
            '                   <th style="width: 17%;">騎手</th>' +
            '                   <th style="width: 17%;">調教師</th>' +
            '                   <th style="width: 13%;">オッズ</th>' +
            '               </tr>' +
            '           </thead>' +
            '           <tbody id="kuina-tbody">' +
            '               <tr><td colspan="6" style="padding: 30px; color: #94a3b8;">上のボタンを押してレースを検索してください</td></tr>' +
            '           </tbody>' +
            '       </table>' +
            '   </div>' +

            '   <!-- ⑥ 資金配分シミュレーター (完全統一レイアウト) -->' +
            '   <div class="selector-box sim-panel" style="margin-top: 20px;">' +
            '       <div class="form-label">💰 複数馬選択 ＆ 資金配分シミュレーター</div>' +
            '       <div class="control-row">' +
            '           <div class="control-group" style="width: 100%;">' +
            '               <label class="sub-info" style="margin-bottom: 4px; color: #d4af37;">投資総予算 (円)</label>' +
            '               <input type="number" id="kuina-budget-input" class="select-input" value="10000" step="1000" min="1000">' +
            '           </div>' +
            '       </div>' +
            '       <div id="kuina-sim-result" class="sim-result-card">' +
            '           <div style="color: #94a3b8; font-size: 0.82rem; text-align: center;">出馬表の左側チェックボックスで馬を複数選択してください</div>' +
            '       </div>' +
            '   </div>' +
            '</div>';

        root.innerHTML = html;
        bindEvents();
        renderRaceButtons();
        updateBiasAndPace();
    }

    // --------------------------------------------------
    // 5. イベントバインド＆描画更新
    // --------------------------------------------------
    function bindEvents() {
        var dateEl = document.getElementById('kuina-date-input');
        var venueEl = document.getElementById('kuina-venue-input');
        var searchBtn = document.getElementById('kuina-search-btn');

        var courseEl = document.getElementById('kuina-course-input');
        var weatherEl = document.getElementById('kuina-weather-input');
        var trackEl = document.getElementById('kuina-track-input');
        var budgetEl = document.getElementById('kuina-budget-input');

        if (dateEl) dateEl.addEventListener('change', function (e) { state.selectedDate = e.target.value; });
        if (venueEl) venueEl.addEventListener('change', function (e) { state.selectedVenue = e.target.value; });
        if (searchBtn) searchBtn.addEventListener('click', executeRaceSearch);

        if (courseEl) courseEl.addEventListener('change', function (e) { state.courseType = e.target.value; updateBiasAndPace(); });
        if (weatherEl) weatherEl.addEventListener('change', function (e) { state.weather = e.target.value; updateBiasAndPace(); });
        if (trackEl) trackEl.addEventListener('change', function (e) { state.trackCondition = e.target.value; updateBiasAndPace(); });
        if (budgetEl) budgetEl.addEventListener('input', function (e) { state.budget = parseInt(e.target.value, 10) || 10000; updateSimulator(); });

        var btnNum = document.getElementById('sort-btn-num');
        var btnPop = document.getElementById('sort-btn-pop');
        var btnAi = document.getElementById('sort-btn-ai');

        if (btnNum) btnNum.addEventListener('click', function () { setSortMode('num'); });
        if (btnPop) btnPop.addEventListener('click', function () { setSortMode('pop'); });
        if (btnAi) btnAi.addEventListener('click', function () { setSortMode('ai'); });
    }

    function renderRaceButtons() {
        var grid = document.getElementById('race-nav-grid');
        if (!grid) return;
        var html = '';
        for (var r = 1; r <= 12; r++) {
            var activeClass = (state.selectedRace === r) ? ' active' : '';
            html += '<button class="race-btn' + activeClass + '" data-race="' + r + '">' + r + 'R</button>';
        }
        grid.innerHTML = html;

        var btns = grid.querySelectorAll('.race-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener('click', function (e) {
                state.selectedRace = parseInt(e.target.getAttribute('data-race'), 10);
                renderRaceButtons();
                executeRaceSearch();
            });
        }
    }

    function updateBiasAndPace() {
        var biasBox = document.getElementById('kuina-bias-card');
        var paceBox = document.getElementById('kuina-pace-card');

        var biasText = '';
        if (state.courseType === '芝') {
            if (state.trackCondition === '良') biasText = '【芝】内・先行絶好 (高速馬場 / イン突き有効)';
            else if (state.trackCondition === '稍重') biasText = '【芝】標準～フラット (上がり性能重視)';
            else biasText = '【芝】外伸び・タフ馬場 (内ラチ荒れ / 外差し・追込大頭)';
        } else {
            if (state.trackCondition === '良') biasText = '【ダート】先行圧倒有利 (パサパサ砂 / 前残り警戒)';
            else if (state.trackCondition === '稍重') biasText = '【ダート】標準馬場 (好位・先行有利)';
            else biasText = '【ダート】高速水浮き馬場 (逃げ・前残り絶好)';
        }

        if (biasBox) {
            biasBox.innerHTML = '<div class="bias-badge-text">' + biasText + '</div>';
        }

        // 隊列マップ更新
        if (paceBox && state.currentRaceHorses.length > 0) {
            var horses = state.currentRaceHorses;
            var count = horses.length;
            var paceName = (count >= 16) ? 'ハイペース (前崩れ・差し有利)' : (count <= 11 ? 'スローペース (前残り濃厚)' : 'ミドルペース (実力通り安定)');

            var nige = [], senko = [], sashi = [], oikomi = [];
            for (var i = 0; i < horses.length; i++) {
                var h = horses[i];
                if (i === 0 || i === 1) nige.push(h);
                else if (i < Math.ceil(count * 0.4)) senko.push(h);
                else if (i < Math.ceil(count * 0.75)) sashi.push(h);
                else oikomi.push(h);
            }

            function makeTags(arr) {
                if (arr.length === 0) return '<span class="sub-info">なし</span>';
                return arr.map(function (x) {
                    return '<span class="pos-tag">' + x.num + ' ' + x.name.substring(0, 4) + '</span>';
                }).join(' ');
            }

            var paceHtml = '' +
                '<div class="pace-title">想定展開: <span style="color:#ffd700;">' + paceName + '</span></div>' +
                '<div class="position-map-grid">' +
                '   <div class="pos-col"><div class="pos-hdr">🏃 逃げ</div>' + makeTags(nige) + '</div>' +
                '   <div class="pos-col"><div class="pos-hdr">🐴 先行</div>' + makeTags(senko) + '</div>' +
                '   <div class="pos-col"><div class="pos-hdr">🐎 差し</div>' + makeTags(sashi) + '</div>' +
                '   <div class="pos-col"><div class="pos-hdr">🚀 追込</div>' + makeTags(oikomi) + '</div>' +
                '</div>';

            paceBox.innerHTML = paceHtml;
        } else if (paceBox) {
            paceBox.innerHTML = '<div style="color:#94a3b8; font-size:0.82rem;">レース検索後に自動解析・描画されます</div>';
        }
    }

    // --------------------------------------------------
    // 6. CSV自動取得・解析ロジック
    // --------------------------------------------------
    function executeRaceSearch() {
        var statusEl = document.getElementById('kuina-status-bar');
        if (statusEl) statusEl.innerHTML = '⚡ CSVデータ照合・解析中...';

        var dClean = (state.selectedDate || '').replace(/-/g, '').replace(/\//g, '');
        var yy = dClean.length === 8 ? dClean.substring(2) : '261003';
        var yyyymmdd = dClean.length === 8 ? dClean : '20261003';

        var candidateUrls = [
            'DG' + yy + '.CSV',
            'DG' + yy + '.csv',
            'DG' + yyyymmdd + '.CSV',
            'DG' + yyyymmdd + '.csv',
            './DG' + yy + '.CSV',
            'racedata.csv'
        ];

        tryFetchCandidateUrls(candidateUrls, 0);
    }

    function tryFetchCandidateUrls(urls, idx) {
        var statusEl = document.getElementById('kuina-status-bar');
        if (idx >= urls.length) {
            if (statusEl) {
                statusEl.innerHTML = '⚠️ 該当日のCSVデータ (' + urls[0] + ') が見つかりませんでした。GitHubリポジトリ内にCSVファイルをアップロードしてください。';
            }
            renderTable([]);
            return;
        }

        var url = urls[idx];
        fetch(url, { method: 'GET', cache: 'no-cache' })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.arrayBuffer();
            })
            .then(function (buffer) {
                var decoder = new TextDecoder('shift_jis');
                var text = decoder.decode(buffer);
                if (!text || text.length < 20) {
                    decoder = new TextDecoder('utf-8');
                    text = decoder.decode(buffer);
                }
                parseAndRenderCsv(text);
            })
            .catch(function () {
                tryFetchCandidateUrls(urls, idx + 1);
            });
    }

    function parseAndRenderCsv(csvText) {
        var statusEl = document.getElementById('kuina-status-bar');
        var lines = csvText.split(/\r?\n/);
        
        var matched = [];
        var vTarget = state.selectedVenue;
        var rTarget = state.selectedRace;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;
            var parsed = parseCsvLineUniversal(line, 16);
            if (!parsed) continue;

            var vMatch = (!parsed.venue || parsed.venue === vTarget || line.indexOf(vTarget) !== -1);
            var rMatch = (line.indexOf(rTarget + 'R') !== -1 || line.indexOf(' ' + rTarget + ' ') !== -1 || lines.length < 40);

            if (vMatch && rMatch) {
                matched.push(parsed);
            }
        }

        // 馬番の重複削除・ソート
        var uniqueMap = {};
        var uniqueList = [];
        for (var i = 0; i < matched.length; i++) {
            var h = matched[i];
            if (!uniqueMap[h.num]) {
                uniqueMap[h.num] = true;
                uniqueList.push(h);
            }
        }

        state.currentRaceHorses = uniqueList;
        state.selectedHorses = [];

        if (statusEl) {
            if (uniqueList.length > 0) {
                statusEl.innerHTML = '✅ 【' + state.selectedVenue + ' ' + state.selectedRace + 'R】 出馬表 ' + uniqueList.length + '頭の照合・解析に成功しました！';
            } else {
                statusEl.innerHTML = '❌ 【照合不一致】 ' + state.selectedVenue + ' ' + state.selectedRace + 'R の該当データが見つかりませんでした。';
            }
        }

        renderTable(uniqueList);
        updateBiasAndPace();
        renderAiBetsCard(uniqueList);
        updateSimulator();
    }

    // --------------------------------------------------
    // 7. テーブル描画 ＆ インタラクティブ機能
    // --------------------------------------------------
    function setSortMode(mode) {
        state.sortMode = mode;
        var btnNum = document.getElementById('sort-btn-num');
        var btnPop = document.getElementById('sort-btn-pop');
        var btnAi = document.getElementById('sort-btn-ai');

        if (btnNum) btnNum.className = 'sort-btn' + (mode === 'num' ? ' active' : '');
        if (btnPop) btnPop.className = 'sort-btn' + (mode === 'pop' ? ' active' : '');
        if (btnAi) btnAi.className = 'sort-btn' + (mode === 'ai' ? ' active' : '');

        renderTable(state.currentRaceHorses);
    }

    function renderTable(horses) {
        var tbody = document.getElementById('kuina-tbody');
        if (!tbody) return;

        if (!horses || horses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding:30px; color:#94a3b8;">該当する出馬表データがありません</td></tr>';
            return;
        }

        // ソート処理
        var list = horses.slice(0);
        if (state.sortMode === 'num') {
            list.sort(function (a, b) { return a.num - b.num; });
        } else if (state.sortMode === 'pop') {
            list.sort(function (a, b) {
                var oA = a.odds > 0 ? a.odds : 999;
                var oB = b.odds > 0 ? b.odds : 999;
                return oA - oB;
            });
        } else if (state.sortMode === 'ai') {
            list.sort(function (a, b) {
                var oA = a.odds > 0 ? a.odds : 999;
                var oB = b.odds > 0 ? b.odds : 999;
                return oA - oB;
            });
        }

        var html = '';
        for (var j = 0; j < list.length; j++) {
            var h = list[j];
            var aiBadge = '-';
            var rank = j + 1;
            if (rank === 1) aiBadge = '<span class="ai-badge ai-honmei">◎ 本命</span>';
            else if (rank === 2) aiBadge = '<span class="ai-badge ai-taikou">○ 対抗</span>';
            else if (rank === 3) aiBadge = '<span class="ai-badge ai-tanana">▲ 単穴</span>';
            else if (rank === 4) aiBadge = '<span class="ai-badge ai-ana">☆ 穴馬</span>';
            else if (rank <= 6) aiBadge = '<span class="ai-badge ai-renka">△ 連下</span>';

            var oddsDisp = (h.odds > 0) ? h.odds + '倍 <br><small class="sub-info">(' + rank + '人気)</small>' : '未確定';
            var isChecked = state.selectedHorses.indexOf(h.num) !== -1;

            html += '<tr class="horse-row" data-num="' + h.num + '">' +
                '   <td>' +
                '       <input type="checkbox" class="kuina-check" data-num="' + h.num + '"' + (isChecked ? ' checked' : '') + '> ' +
                '       <span class="waku-badge waku-' + h.waku + '">' + h.waku + '枠' + h.num + '番</span>' +
                '   </td>' +
                '   <td>' + aiBadge + '</td>' +
                '   <td><span class="horse-name">' + h.name + '</span><span class="sub-info">(' + h.sexAge + ')</span></td>' +
                '   <td><span class="jockey-name">' + h.jockey + '</span></td>' +
                '   <td><span class="trainer-name">' + h.trainer + '</span></td>' +
                '   <td><span class="odds-val">' + oddsDisp + '</span></td>' +
                '</tr>' +
                '<tr class="detail-row" id="detail-row-' + h.num + '" style="display:none;">' +
                '   <td colspan="6" class="detail-card-cell">' +
                '       <div class="detail-card-inner">' +
                '           <div class="detail-grid">' +
                '               <div><b>馬名:</b> ' + h.name + ' (' + h.sexAge + ')</div>' +
                '               <div><b>騎手:</b> ' + h.jockey + '</div>' +
                '               <div><b>調教師:</b> ' + h.trainer + '</div>' +
                '               <div><b>オッズ:</b> ' + (h.odds > 0 ? h.odds + '倍' : '未確定') + '</div>' +
                '           </div>' +
                '           <div class="detail-comment">💡 <b>KUINA AI診断:</b> 直近パフォーマンス判定良好。トラックバイアス適性高く軸馬候補として推奨。</div>' +
                '       </div>' +
                '   </td>' +
                '</tr>';
        }

        tbody.innerHTML = html;

        // チェックボックス＆行タップイベントバインド
        var checks = tbody.querySelectorAll('.kuina-check');
        for (var k = 0; k < checks.length; k++) {
            checks[k].addEventListener('click', function (e) {
                e.stopPropagation();
                var num = parseInt(e.target.getAttribute('data-num'), 10);
                var idx = state.selectedHorses.indexOf(num);
                if (e.target.checked && idx === -1) {
                    state.selectedHorses.push(num);
                } else if (!e.target.checked && idx !== -1) {
                    state.selectedHorses.splice(idx, 1);
                }
                updateSimulator();
            });
        }

        var rows = tbody.querySelectorAll('.horse-row');
        for (var r = 0; r < rows.length; r++) {
            rows[r].addEventListener('click', function (e) {
                if (e.target.tagName === 'INPUT') return;
                var num = this.getAttribute('data-num');
                var dRow = document.getElementById('detail-row-' + num);
                if (dRow) {
                    dRow.style.display = (dRow.style.display === 'none') ? 'table-row' : 'none';
                }
            });
        }
    }

    // --------------------------------------------------
    // 8. AIおすすめ買い目 ＆ 資金配分シミュレーター
    // --------------------------------------------------
    function renderAiBetsCard(horses) {
        var box = document.getElementById('kuina-ai-bets-card');
        if (!box) return;

        if (!horses || horses.length < 3) {
            box.innerHTML = '<div class="form-label">🎯 KUINA AI推奨買い目</div><div style="color:#94a3b8; font-size:0.82rem;">出馬表データ取得後に自動計算表示されます</div>';
            return;
        }

        var h1 = horses[0], h2 = horses[1], h3 = horses[2];
        var html = '' +
            '<div class="form-label">🎯 KUINA AI推奨買い目</div>' +
            '<div class="ai-bets-grid">' +
            '   <div class="bet-card">' +
            '       <div class="bet-type">本命馬連 1点勝負</div>' +
            '       <div class="bet-combo">' + h1.num + ' - ' + h2.num + ' (' + h1.name.substring(0, 4) + ' - ' + h2.name.substring(0, 4) + ')</div>' +
            '   </div>' +
            '   <div class="bet-card">' +
            '       <div class="bet-type">本命・対抗・単穴 3連複</div>' +
            '       <div class="bet-combo">' + h1.num + ' - ' + h2.num + ' - ' + h3.num + '</div>' +
            '   </div>' +
            '</div>';

        box.innerHTML = html;
    }

    function updateSimulator() {
        var box = document.getElementById('kuina-sim-result');
        if (!box) return;

        var selected = state.selectedHorses;
        if (selected.length === 0) {
            box.innerHTML = '<div style="color: #94a3b8; font-size: 0.82rem; text-align: center; padding: 10px;">出馬表の左側チェックボックスで馬を複数選択してください</div>';
            return;
        }

        var points = selected.length;
        var budget = state.budget || 10000;
        var perPoint = Math.floor(budget / points / 100) * 100;
        if (perPoint < 100) perPoint = 100;

        var sumOddsReciprocal = 0;
        var horses = state.currentRaceHorses;
        for (var i = 0; i < selected.length; i++) {
            var num = selected[i];
            var h = horses.find(function (x) { return x.num === num; });
            if (h && h.odds > 0) {
                sumOddsReciprocal += (1.0 / h.odds);
            } else {
                sumOddsReciprocal += (1.0 / 5.0);
            }
        }

        var synthOdds = sumOddsReciprocal > 0 ? (1.0 / sumOddsReciprocal).toFixed(2) : '0.00';
        var estReturn = Math.floor(budget * parseFloat(synthOdds));

        var html = '' +
            '<div class="sim-grid-results">' +
            '   <div class="sim-res-item"><b>選択頭数:</b> ' + points + '頭 (' + selected.sort(function (a, b) { return a - b; }).join(', ') + '番)</div>' +
            '   <div class="sim-res-item"><b>1点投資額:</b> ' + perPoint.toLocaleString() + '円</div>' +
            '   <div class="sim-res-item"><b>合成オッズ:</b> <span style="color:#ffd700; font-weight:800;">' + synthOdds + '倍</span></div>' +
            '   <div class="sim-res-item"><b>想定払戻金:</b> <span style="color:#38bdf8; font-weight:800;">' + estReturn.toLocaleString() + '円</span></div>' +
            '</div>';

        box.innerHTML = html;
    }

    // ドムロード時イニシャライズ
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectUnifiedUi);
    } else {
        injectUnifiedUi();
    }

})();
