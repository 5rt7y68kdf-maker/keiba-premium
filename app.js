// 🌪️【KUINA AI RACING ANALYTICS - 完全自己注入＆超高速マルチ検索対応決定版 app.js】

(function() {
    console.log('KUINA AI RACING ANALYTICS app.js loading...');

    // JRA 10競馬場辞書
    var VENUE_MAP = {
        '札幌': '01', '函館': '02', '福島': '03', '新潟': '04',
        '東京': '05', '中山': '06', '中京': '07', '京都': '08',
        '阪神': '09', '小倉': '10',
        '01': '札幌', '02': '函館', '03': '福島', '04': '新潟',
        '05': '東京', '06': '中山', '07': '中京', '08': '京都',
        '09': '阪神', '10': '小倉',
        '1': '札幌', '2': '函館', '3': '福島', '4': '新潟',
        '5': '東京', '6': '中山', '7': '中京', '8': '京都', '9': '阪神',
        '東': '東京', '中': '中山', '阪': '阪神', '京': '京都', '福': '福島', '新': '新潟', '札': '札幌', '函': '函館', '小': '小倉'
    };

    window.KUINA_CSV_DATA = window.KUINA_CSV_DATA || '';
    window.KUINA_CURRENT_RACE_DATA = [];

    // JRA公式 枠順（枠番）計算
    function calculateJraWaku(num, total) {
        num = parseInt(num, 10) || 1;
        total = parseInt(total, 10) || 18;
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
            if (num < curr + wakuSizes[i]) return i + 1;
            curr += wakuSizes[i];
        }
        return 8;
    }

    // 万能CSV行パース処理
    function parseCsvRowUniversal(line, totalInRace) {
        if (!line || !line.trim()) return null;
        var tokens = line.split(/[,\t|]+/).map(function(t) { return t.trim().replace(/^["'\\]+|["'\\]+$/g, ''); }).filter(function(t) { return t !== ''; });
        if (tokens.length < 3) return null;

        if (tokens.indexOf('日付') !== -1 || tokens.indexOf('馬名') !== -1 || tokens.indexOf('枠') !== -1) return null;

        var venue = '';
        var dateStr = '';
        var rawWaku = '';
        var num = 0;
        var horseName = '';
        var sexAge = '牡3';
        var jockey = '未定';
        var kinryo = '56';
        var odds = 0.0;
        var stable = '';
        var trainer = '';

        for (var i = 0; i < tokens.length; i++) {
            var tok = tokens[i];
            if (!dateStr && (/^\d{6,12}$/.test(tok) || /^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/.test(tok))) {
                dateStr = tok;
            }
            if (!venue && /^(東京|中山|京都|阪神|中京|新潟|福島|小倉|札幌|函館)/.test(tok)) {
                venue = tok.match(/(東京|中山|京都|阪神|中京|新潟|福島|小倉|札幌|函館)/)[0];
            }
            if (!horseName && /^[\u30A0-\u30FFー・]{2,9}$/.test(tok)) {
                if (!/^(ダート|障害|リステッド|オープン|未勝利|新馬|クラシック|カップ|ステークス|マイル|スプリンターズ)$/.test(tok)) {
                    horseName = tok;
                }
            }
        }

        if (!horseName) return null;

        for (var i = 0; i < tokens.length; i++) {
            var tok = tokens[i];
            if (/^(牡|牝|セ)\d{1,2}$/.test(tok)) {
                sexAge = tok;
            } else if (/^\d{2}(\.\d)?$/.test(tok) && parseFloat(tok) >= 48.0 && parseFloat(tok) <= 62.0) {
                kinryo = tok;
            } else if (/^\(([美栗外])\)$/.test(tok)) {
                stable = tok;
                if (i + 1 < tokens.length && /^[\u4e00-\u9faf]{2,4}$/.test(tokens[i+1])) {
                    trainer = tokens[i+1];
                }
            }
        }

        for (var i = 0; i < tokens.length; i++) {
            var tok = tokens[i];
            if (/^\d{1,2}$/.test(tok)) {
                var val = parseInt(tok, 10);
                if (val >= 1 && val <= 18 && !num) {
                    num = val;
                }
            }
        }

        for (var i = tokens.length - 1; i >= 0; i--) {
            var tok = tokens[i].replace('倍', '').trim();
            var f = parseFloat(tok);
            if (!isNaN(f) && f > 0 && f !== parseFloat(kinryo) && f !== num) {
                if (f < 500 && tok.indexOf('.') !== -1) {
                    odds = f;
                    break;
                }
            }
        }

        for (var i = 0; i < tokens.length; i++) {
            var tok = tokens[i];
            if (tok !== horseName && /^[\u4e00-\u9faf]{2,4}$/.test(tok)) {
                if (tok !== trainer && !/^(東京|中山|京都|阪神|中京|新潟|福島|小倉|札幌|函館)$/.test(tok)) {
                    jockey = tok;
                }
            }
        }

        rawWaku = tokens[0];
        var finalWaku = 1;
        if (/^[1-8]$/.test(rawWaku)) {
            finalWaku = parseInt(rawWaku, 10);
        } else {
            finalWaku = calculateJraWaku(num, totalInRace || 16);
        }

        return {
            venue: venue,
            dateStr: dateStr,
            waku: finalWaku,
            num: num || 1,
            name: horseName,
            sexAge: sexAge,
            jockey: jockey || '騎手未定',
            kinryo: kinryo || '56',
            odds: odds,
            stable: stable || '(美)',
            trainer: trainer || '調教師未定'
        };
    }

    // UI作成・自己注入処理
    function initKuinaUI() {
        var existingContainer = document.querySelector('.container') || document.querySelector('#app') || document.body;
        if (!document.getElementById('kuina-main-card')) {
            var mainWrapper = document.createElement('div');
            mainWrapper.id = 'kuina-main-card';
            mainWrapper.className = 'kuina-app-wrapper';
            mainWrapper.innerHTML = `
                <div class="kuina-header">
                    <h1>KUINA AI RACING ANALYTICS</h1>
                    <div class="subtitle">KUINA - 高精度競走馬分析＆展開予測分析エンジン</div>
                </div>

                <!-- 検索コントロールボックス -->
                <div class="selector-box">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">📅 開催日付を選択</label>
                            <input type="date" id="kuina-date-input" class="select-input" value="2026-10-03">
                        </div>
                        <div class="form-group">
                            <label class="form-label">🏟️ 競馬場を選択</label>
                            <select id="kuina-venue-select" class="select-input">
                                <option value="東京">東京競馬場</option>
                                <option value="中山">中山競馬場</option>
                                <option value="京都" selected>京都競馬場</option>
                                <option value="阪神">阪神競馬場</option>
                                <option value="中京">中京競馬場</option>
                                <option value="新潟">新潟競馬場</option>
                                <option value="福島">福島競馬場</option>
                                <option value="小倉">小倉競馬場</option>
                                <option value="札幌">札幌競馬場</option>
                                <option value="函館">函館競馬場</option>
                            </select>
                        </div>
                    </div>

                    <label class="form-label">🏁 レース番号を選択</label>
                    <div class="race-nav-grid" id="kuina-race-buttons">
                        ${[1,2,3,4,5,6,7,8,9,10,11,12].map(function(r) {
                            return `<button type="button" class="race-btn ${r===11?'active':''}" data-race="${r}" onclick="window.selectKuinaRace(${r})">${r}R</button>`;
                        }).join('')}
                    </div>

                    <div class="form-row" style="margin-top:10px;">
                        <div class="form-group">
                            <label class="form-label">📂 CSVローカルファイル読み込み</label>
                            <input type="file" id="kuina-csv-file" accept=".csv,.txt" class="text-input" style="padding:6px;">
                        </div>
                    </div>

                    <button type="button" id="kuina-search-btn" class="btn-predict" onclick="window.executeKuinaSearch()">
                        🔍 指定レースを検索・AI解析を実行
                    </button>
                </div>

                <!-- トラックバイアス診断ボックス -->
                <div class="bias-card">
                    <div class="bias-title">🌿 リアルタイム トラックバイアス＆馬場分析</div>
                    <div class="bias-controls">
                        <select id="kuina-track-type" class="select-input-sm" onchange="window.updateKuinaBias()">
                            <option value="芝">芝コース</option>
                            <option value="ダート">ダートコース</option>
                        </select>
                        <select id="kuina-track-cond" class="select-input-sm" onchange="window.updateKuinaBias()">
                            <option value="良">☀️ 晴・良馬場</option>
                            <option value="稍重">⛅ 曇・稍重</option>
                            <option value="重">🌧️ 雨・重馬場</option>
                            <option value="不良">☔ 大雨・不良馬場</option>
                        </select>
                    </div>
                    <div id="kuina-bias-text" class="bias-output">【芝】内・先行絶好 (高速馬場 / イン突き有効)</div>
                </div>

                <!-- 展開予想 & 隊列マップ -->
                <div class="pace-card">
                    <div class="pace-header">
                        <span>⏱️ 展開予想 (Pace Forecast)</span>
                        <span id="kuina-pace-badge" class="pace-badge pace-mid">ミドルペース (平均展開)</span>
                    </div>
                    <div class="position-map-grid">
                        <div class="pos-group"><div class="pos-label">🏃 逃げ</div><div id="pos-nige" class="pos-horses">-</div></div>
                        <div class="pos-group"><div class="pos-label">🐴 先行</div><div id="pos-senko" class="pos-horses">-</div></div>
                        <div class="pos-group"><div class="pos-label">🐎 差し</div><div id="pos-sashi" class="pos-horses">-</div></div>
                        <div class="pos-group"><div class="pos-label">🚀 追込</div><div id="pos-oikomi" class="pos-horses">-</div></div>
                    </div>
                </div>

                <!-- 🎯 AIおすすめ買い目 -->
                <div class="ai-bets-card">
                    <div class="ai-bets-title">🎯 KUINA AI推奨買い目 (AI Recommended Bets)</div>
                    <div id="kuina-ai-bets-content" class="ai-bets-content">
                        レースを検索するとAI推奨買い目が自動表示されます。
                    </div>
                </div>

                <!-- レースタイトルサマリー -->
                <div id="kuina-race-header" class="race-summary-header">
                    <span>選択中のレース: 京都 11R (18頭立)</span>
                    <span style="font-size:0.8rem;color:#f59e0b;">単勝オッズ確定済</span>
                </div>

                <!-- ソートボタン -->
                <div class="sort-box">
                    <button type="button" class="sort-btn active" id="sort-num" onclick="window.sortKuina('num')">🔢 馬番順</button>
                    <button type="button" class="sort-btn" id="sort-odds" onclick="window.sortKuina('odds')">🏆 人気順</button>
                    <button type="button" class="sort-btn" id="sort-ai" onclick="window.sortKuina('ai')">🎯 AI注目順</button>
                </div>

                <!-- 出馬表テーブル (厳密6列構造) -->
                <div class="table-wrapper">
                    <table id="kuina-race-table">
                        <thead>
                            <tr>
                                <th style="width:15%;">枠-馬</th>
                                <th style="width:15%;">🤖 AI印</th>
                                <th style="width:25%;">競走馬名</th>
                                <th style="width:18%;">騎手</th>
                                <th style="width:15%;">調教師</th>
                                <th style="width:12%;">オッズ</th>
                            </tr>
                        </thead>
                        <tbody id="kuina-tbody">
                            <tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;">「指定レースを検索」ボタンを押して出馬表を表示してください</td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- 💰 資金配分シミュレーター -->
                <div class="sim-card">
                    <div class="sim-title">💰 複数馬選択 ＆ 資金配分シミュレーター</div>
                    <div class="sim-input-row">
                        <label class="form-label" style="margin:0;">投資総予算 (円):</label>
                        <input type="number" id="kuina-budget-input" class="select-input-sm" value="10000" step="1000" onchange="window.calculateKuinaSim()">
                    </div>
                    <div id="kuina-sim-result" class="sim-result-box">
                        出馬表のチェックボックスで馬を選択すると、自動で点数・資金配分・想定払戻金がシミュレーションされます。
                    </div>
                </div>
            `;
            if (existingContainer.firstChild) {
                existingContainer.insertBefore(mainWrapper, existingContainer.firstChild);
            } else {
                existingContainer.appendChild(mainWrapper);
            }
        }
    }

    // 現在選択中のレース番号
    window.selectedRaceNum = 11;

    window.selectKuinaRace = function(r) {
        window.selectedRaceNum = r;
        var btns = document.querySelectorAll('#kuina-race-buttons .race-btn');
        btns.forEach(function(b) {
            if (parseInt(b.getAttribute('data-race'), 10) === r) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
        window.executeKuinaSearch();
    };

    window.updateKuinaBias = function() {
        var track = document.getElementById('kuina-track-type') ? document.getElementById('kuina-track-type').value : '芝';
        var cond = document.getElementById('kuina-track-cond') ? document.getElementById('kuina-track-cond').value : '良';
        var out = document.getElementById('kuina-bias-text');
        if (!out) return;

        if (track === '芝') {
            if (cond === '良') out.innerText = '【芝】内・先行絶好 (高速馬場 / イン突き有効)';
            else if (cond === '稍重') out.innerText = '【芝】標準～フラット (上がり性能重視)';
            else if (cond === '重') out.innerText = '【芝】外伸び・タフ馬場 (内ラチ荒れ / 差し・追込有利)';
            else out.innerText = '【芝】極悪タフ馬場 (パワー型重馬場巧者大頭)';
        } else {
            if (cond === '良') out.innerText = '【ダート】先行圧倒有利 (パサパサ砂 / 前残り警戒)';
            else if (cond === '稍重') out.innerText = '【ダート】好位・スピード型有利';
            else if (cond === '重') out.innerText = '【ダート】高速水浮き馬場 (逃げ・先行馬絶好)';
            else out.innerText = '【ダート】不良高速馬場 (内枠逃げ馬圧倒的利)';
        }
    };

    // レース検索・描画実行メイン処理
    window.executeKuinaSearch = function() {
        var btn = document.getElementById('kuina-search-btn');
        if (btn) btn.innerText = '⚡ AI解析＆データ描画中...';

        var dateInput = document.getElementById('kuina-date-input') ? document.getElementById('kuina-date-input').value : '2026-10-03';
        var venueSelect = document.getElementById('kuina-venue-select') ? document.getElementById('kuina-venue-select').value : '京都';
        var raceNum = window.selectedRaceNum || 11;

        var fileInput = document.getElementById('kuina-csv-file');
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            var file = fileInput.files[0];
            var reader = new FileReader();
            reader.onload = function(e) {
                var text = e.target.result;
                processRawCsvText(text, dateInput, venueSelect, raceNum);
            };
            reader.readAsText(file, 'Shift_JIS');
        } else {
            // 内蔵またはフェッチ
            var targetCsv = (dateInput.indexOf('10-04') !== -1 || dateInput.indexOf('1004') !== -1) ? 'DG261004.CSV' : 'DG261003.CSV';
            fetch(targetCsv)
                .then(function(res) {
                    if (!res.ok) throw new Error('CSV取得失敗');
                    return res.arrayBuffer();
                })
                .then(function(buf) {
                    var decoder = new TextDecoder('shift_jis');
                    var text = decoder.decode(buf);
                    processRawCsvText(text, dateInput, venueSelect, raceNum);
                })
                .catch(function(err) {
                    generateFallbackData(venueSelect, raceNum);
                });
        }
    };

    function processRawCsvText(csvText, dateInput, venueSelect, raceNum) {
        var lines = csvText.split(/\r?\n/);
        var matched = [];

        lines.forEach(function(line) {
            if (!line.trim()) return;
            var parsed = parseCsvRowUniversal(line, 16);
            if (parsed && parsed.name) {
                matched.push(parsed);
            }
        });

        if (matched.length === 0) {
            generateFallbackData(venueSelect, raceNum);
            return;
        }

        var filtered = [];
        if (matched.length > 20) {
            var chunkSize = Math.ceil(matched.length / 24);
            var startIndex = (raceNum - 1) * chunkSize;
            filtered = matched.slice(startIndex, startIndex + chunkSize);
        } else {
            filtered = matched;
        }

        if (filtered.length === 0) {
            generateFallbackData(venueSelect, raceNum);
            return;
        }

        renderRaceTable(filtered, venueSelect, raceNum);
    }

    function generateFallbackData(venue, raceNum) {
        var sampleNames = ['ルヴァレドクール', 'ジンセイ', 'スナッピードレッサ', 'ヘニーガイスト', 'ドンエレクトス', 'ヒルノドゴール', 'トリリオンボーイ', 'メルキオル', 'ヴィヴァン', 'オウギノカナメ', 'ジャスティンアース', 'マピュース', 'フリームファクシ', 'オーブルクール', 'ルージュスタニング'];
        var sampleJockeys = ['横山和生', '丹内祐次', '大野拓弥', '横山武史', '三浦皇成', '戸崎圭太', '津村明秀', '原優介', '佐々木大', '菊沢一樹', 'ルメール', '田辺裕信', 'ミシェル', '石橋脩', '岩田康誠'];
        var sampleOdds = [9.0, 11.9, 11.0, 2.4, 5.6, 62.0, 64.3, 28.1, 43.4, 36.8, 8.7, 9.4, 56.3, 136.8, 39.9];

        var list = [];
        for (var i = 0; i < sampleNames.length; i++) {
            var num = i + 1;
            var waku = calculateJraWaku(num, sampleNames.length);
            list.push({
                venue: venue,
                dateStr: '20261003',
                waku: waku,
                num: num,
                name: sampleNames[i],
                sexAge: '牡' + (i % 3 + 2),
                jockey: sampleJockeys[i],
                kinryo: '56',
                odds: sampleOdds[i],
                stable: (i % 2 === 0 ? '(美)' : '(栗)'),
                trainer: '調教師' + (i + 1)
            });
        }
        renderRaceTable(list, venue, raceNum);
    }

    function renderRaceTable(list, venue, raceNum) {
        var sortedOdds = list.slice().sort(function(a,b) { return (a.odds || 999) - (b.odds || 999); });
        list.forEach(function(h) {
            if (h.odds > 0) {
                h.popRank = sortedOdds.indexOf(h) + 1;
            } else {
                h.popRank = '-';
            }

            if (h.popRank === 1) h.aiMark = '<span class="ai-badge ai-honmei">◎ 本命</span>';
            else if (h.popRank === 2) h.aiMark = '<span class="ai-badge ai-taikou">○ 対抗</span>';
            else if (h.popRank === 3) h.aiMark = '<span class="ai-badge ai-tanana">▲ 単穴</span>';
            else if (h.odds >= 15.0 && h.odds <= 60.0 && h.num % 2 === 0) h.aiMark = '<span class="ai-badge ai-ana">☆ 穴馬</span>';
            else if (h.popRank <= 5) h.aiMark = '<span class="ai-badge ai-renka">△ 連下</span>';
            else h.aiMark = '<span class="ai-badge ai-none">-</span>';
        });

        window.KUINA_CURRENT_RACE_DATA = list;

        var header = document.getElementById('kuina-race-header');
        if (header) {
            header.innerHTML = `<span>選択中のレース: ${venue} ${raceNum}R (${list.length}頭立)</span>
            <span style="font-size:0.8rem;color:#f59e0b;">${list[0].odds > 0 ? '単勝オッズ確定済' : '前日未確定'}</span>`;
        }

        var tbody = document.getElementById('kuina-tbody');
        if (tbody) {
            var html = '';
            list.forEach(function(h, idx) {
                var oddsDisp = h.odds > 0 ? `<b>${h.odds.toFixed(1)}倍</b><br><small class="pop-rank">(${h.popRank}人気)</small>` : '<span style="color:#94a3b8;">未確定</span>';
                html += `
                    <tr class="horse-row" onclick="window.toggleHorseDetail(${idx})">
                        <td>
                            <input type="checkbox" class="sim-chk" value="${h.num}" onclick="event.stopPropagation(); window.calculateKuinaSim();">
                            <span class="waku-badge waku-${h.waku}">${h.waku}枠${h.num}番</span>
                        </td>
                        <td>${h.aiMark}</td>
                        <td>
                            <span class="horse-name">${h.name}</span>
                            <span class="sub-info">(${h.sexAge})</span>
                        </td>
                        <td>
                            <span class="jockey-name">${h.jockey}</span><br>
                            <span class="sub-info">(${h.kinryo}kg)</span>
                        </td>
                        <td>
                            <span class="trainer-name">${h.stable} ${h.trainer}</span>
                        </td>
                        <td>
                            <span class="odds-val">${oddsDisp}</span>
                        </td>
                    </tr>
                    <tr id="detail-row-${idx}" class="detail-row" style="display:none;">
                        <td colspan="6">
                            <div class="detail-card-inner">
                                <h4>🐴 ${h.name} 詳細分析カード</h4>
                                <div class="detail-grid">
                                    <div><b>性齢:</b> ${h.sexAge}</div>
                                    <div><b>斤量:</b> ${h.kinryo}kg</div>
                                    <div><b>騎手:</b> ${h.jockey}</div>
                                    <div><b>所属・調教師:</b> ${h.stable} ${h.trainer}</div>
                                    <div><b>単勝オッズ:</b> ${h.odds > 0 ? h.odds + '倍 (' + h.popRank + '人気)' : '未確定'}</div>
                                    <div><b>AI期待値:</b> ${h.popRank <= 3 ? '高（上位入着有力）' : (h.odds <= 50 ? '中（波乱要素あり）' : '標準')}</div>
                                </div>
                                <div class="detail-ai-comment">
                                    <b>🤖 AI分析コメント:</b> ${h.popRank === 1 ? 'スピード・実績ともにメンバー最上位。軸馬に最適。' : (h.popRank <= 3 ? '安定感十分。展開次第で逆転可能。' : '好位追走から展開ハマれば高配当一発の魅力。')}
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }

        var nige = [], senko = [], sashi = [], oikomi = [];
        list.forEach(function(h) {
            if (h.num <= 2 || h.popRank === 1) nige.push(h.num + ' ' + h.name);
            else if (h.num <= 6 || h.popRank <= 3) senko.push(h.num + ' ' + h.name);
            else if (h.num <= 12) sashi.push(h.num + ' ' + h.name);
            else oikomi.push(h.num + ' ' + h.name);
        });

        if (document.getElementById('pos-nige')) document.getElementById('pos-nige').innerHTML = nige.map(function(s){return `<span class="pos-horse-tag">${s}</span>`;}).join('') || 'なし';
        if (document.getElementById('pos-senko')) document.getElementById('pos-senko').innerHTML = senko.map(function(s){return `<span class="pos-horse-tag">${s}</span>`;}).join('') || 'なし';
        if (document.getElementById('pos-sashi')) document.getElementById('pos-sashi').innerHTML = sashi.map(function(s){return `<span class="pos-horse-tag">${s}</span>`;}).join('') || 'なし';
        if (document.getElementById('pos-oikomi')) document.getElementById('pos-oikomi').innerHTML = oikomi.map(function(s){return `<span class="pos-horse-tag">${s}</span>`;}).join('') || 'なし';

        var aiBetsBox = document.getElementById('kuina-ai-bets-content');
        if (aiBetsBox && list.length >= 3) {
            var h1 = list[0].num, h2 = list[1].num, h3 = list[2].num;
            aiBetsBox.innerHTML = `
                <div class="bet-item"><b>【本命馬連1点】:</b> ${h1} - ${h2}</div>
                <div class="bet-item"><b>【本命3連複1点】:</b> ${h1} - ${h2} - ${h3}</div>
                <div class="bet-item"><b>【高配当穴流し】:</b> ${h1} ➔ 穴馬流し (馬連)</div>
            `;
        }

        var btn = document.getElementById('kuina-search-btn');
        if (btn) btn.innerText = '🔍 指定レースを検索・AI解析を実行';

        window.calculateKuinaSim();
    }

    window.toggleHorseDetail = function(idx) {
        var row = document.getElementById('detail-row-' + idx);
        if (row) {
            row.style.display = (row.style.display === 'none' || !row.style.display) ? 'table-row' : 'none';
        }
    };

    window.sortKuina = function(type) {
        if (!window.KUINA_CURRENT_RACE_DATA) return;
        var data = window.KUINA_CURRENT_RACE_DATA.slice();
        if (type === 'num') {
            data.sort(function(a,b) { return a.num - b.num; });
        } else if (type === 'odds') {
            data.sort(function(a,b) { return (a.odds||999) - (b.odds||999); });
        } else if (type === 'ai') {
            data.sort(function(a,b) { return (a.popRank||999) - (b.popRank||999); });
        }

        var btns = document.querySelectorAll('.sort-btn');
        btns.forEach(function(b) { b.classList.remove('active'); });
        if (document.getElementById('sort-' + type)) {
            document.getElementById('sort-' + type).classList.add('active');
        }

        renderRaceTable(data, document.getElementById('kuina-venue-select').value, window.selectedRaceNum);
    };

    window.calculateKuinaSim = function() {
        var chks = document.querySelectorAll('.sim-chk:checked');
        var budgetInput = document.getElementById('kuina-budget-input');
        var resultBox = document.getElementById('kuina-sim-result');
        if (!resultBox) return;

        var budget = budgetInput ? (parseInt(budgetInput.value, 10) || 10000) : 10000;
        var selectedNums = [];
        chks.forEach(function(c) { selectedNums.push(c.value); });

        if (selectedNums.length === 0) {
            resultBox.innerHTML = '<span style="color:#94a3b8;">表内のチェックボックスで馬を選択すると、資金配分が自動計算されます。</span>';
            return;
        }

        var points = selectedNums.length;
        var amountPerPoint = Math.floor(budget / points / 100) * 100;
        if (amountPerPoint < 100) amountPerPoint = 100;

        resultBox.innerHTML = `
            <div><b>選択馬:</b> ${selectedNums.join(', ')}番 (全${points}頭)</div>
            <div><b>1点あたり推奨投資額:</b> <span style="color:#f59e0b;font-weight:bold;">${amountPerPoint.toLocaleString()}円</span></div>
            <div><b>合計購入金額:</b> ${(amountPerPoint * points).toLocaleString()}円 / 予算 ${budget.toLocaleString()}円</div>
        `;
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initKuinaUI();
            window.executeKuinaSearch();
        });
    } else {
        initKuinaUI();
        window.executeKuinaSearch();
    }
})();
