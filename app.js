// 🌪️ KUINA AI RACING ANALYTICS - 高精度JRAデータ解析 ＆ 出馬表・資金配分統合モデル

if (typeof document !== 'undefined') {
    var updateHeader = function() {
        var h1El = document.querySelector('h1');
        if (h1El) h1El.innerHTML = '🦅 KUINA AI RACING ANALYTICS';
        var subEl = document.querySelector('.subtitle');
        if (subEl) subEl.innerHTML = '🔥 JRA完全対応 ＆ KUINA AIリアルタイム展開・3連単マルチ資金配分';
        
        // タブナビゲーションが存在する場合は除去（タブ導入前の構成に完全復帰）
        var oldNav = document.getElementById('kuina-tab-nav');
        if (oldNav && oldNav.parentNode) {
            oldNav.parentNode.removeChild(oldNav);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateHeader);
    } else {
        updateHeader();
    }
}

var VENUE_MAPPING = {
    '東京': { name: '東京', code: '05', region: 'kanto' },
    '中山': { name: '中山', code: '06', region: 'kanto' },
    '京都': { name: '京都', code: '08', region: 'kansai' },
    '阪神': { name: '阪神', code: '09', region: 'kansai' },
    '中京': { name: '中京', code: '07', region: 'kansai' },
    '新潟': { name: '新潟', code: '04', region: 'kanto' },
    '福島': { name: '福島', code: '03', region: 'kanto' },
    '小倉': { name: '小倉', code: '10', region: 'kansai' },
    '札幌': { name: '札幌', code: '01', region: 'kanto' },
    '函館': { name: '函館', code: '02', region: 'kanto' }
};

function normalizeVenue(str) {
    if (!str) return '東京';
    var s = str.toString().trim();
    for (var v in VENUE_MAPPING) {
        if (s.indexOf(v) !== -1) return v;
    }
    if (s.indexOf('中京') !== -1) return '中京';
    if (s.indexOf('中山') !== -1 || (s.indexOf('中') !== -1 && s.indexOf('京') === -1)) return '中山';
    if (s.indexOf('東') !== -1) return '東京';
    if (s.indexOf('京') !== -1) return '京都';
    if (s.indexOf('阪') !== -1) return '阪神';
    if (s.indexOf('新') !== -1) return '新潟';
    if (s.indexOf('福') !== -1) return '福島';
    if (s.indexOf('札') !== -1) return '札幌';
    if (s.indexOf('函') !== -1) return '函館';
    if (s.indexOf('小') !== -1) return '小倉';

    return '東京';
}

function normalizeDateStr(str) {
    if (!str) return '';
    var clean = str.toString().replace(/[-/]/g, '').trim();
    if (clean.length === 6) clean = '20' + clean;
    return clean;
}

function parseRaceNum(str) {
    if (!str) return 1;
    var m = str.toString().match(/\d+/);
    return m ? parseInt(m[0], 10) : 1;
}

function getDgBlockNumber(venueName) {
    var vInfo = VENUE_MAPPING[venueName];
    if (vInfo && vInfo.region === 'kansai') {
        return 2;
    }
    return 1;
}

// JRA公式枠割りルールに基づく「枠番」動的計算関数
function getJraWaku(num, total) {
    if (!num || num <= 0) return 1;
    if (!total || total <= 8) return Math.min(8, num);
    if (total <= 16) {
        var singleGates = 16 - total;
        var curr = 1;
        for (var w = 1; w <= 8; w++) {
            var gateSize = (w <= singleGates) ? 1 : 2;
            if (num >= curr && num < curr + gateSize) return w;
            curr += gateSize;
        }
        return Math.min(8, Math.ceil(num / 2));
    } else if (total === 17) {
        if (num <= 14) return Math.ceil(num / 2);
        return 8;
    } else {
        if (num <= 12) return Math.ceil(num / 2);
        if (num <= 15) return 7;
        return 8;
    }
}

// CSVパース関数 (DGファイル ＆ 着順並びの2025-2026.csv 両対応)
function parseCsvData(csvText, fileName, targetDate, targetVenue, targetRace) {
    var lines = csvText.split(/\r?\n/);
    var horses = [];

    var isDgFile = (fileName.toUpperCase().indexOf('DG') !== -1 || fileName.indexOf('1003') !== -1 || fileName.indexOf('1004') !== -1);

    if (isDgFile) {
        var blockNum = getDgBlockNumber(targetVenue);
        var calcRaceTarget = (blockNum - 1) * 12 + targetRace;
        var currentRace = 1;
        var prevNum = 0;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line || line.indexOf('枠番') !== -1) continue;

            var parts = line.split(',').map(function(p) { return p.trim(); });
            if (parts.length >= 8 && /^\d+$/.test(parts[0])) {
                var waku = parseInt(parts[0], 10) || 1;
                var num = parts[2] && /^\d+$/.test(parts[2]) ? parseInt(parts[2], 10) : 1;
                var name = parts[7] || '';

                if (name) {
                    if (num <= prevNum && prevNum > 0) {
                        currentRace++;
                    }
                    prevNum = num;

                    if (currentRace === calcRaceTarget) {
                        var sex = parts[9] || '牡';
                        var age = parts[10] || '3';
                        var jockey = parts[12] || '未定';
                        var kinryo = parts[13] || '55';
                        var oddsVal = parts[15] ? parseFloat(parts[15].replace('倍','')) : 0.0;
                        if (isNaN(oddsVal)) oddsVal = 0.0;
                        var trainer = parts[17] || '';

                        horses.push({
                            rank: 0,
                            waku: waku,
                            num: num,
                            name: name,
                            sex_age: sex + age,
                            jockey: jockey,
                            kinryo: kinryo,
                            odds: oddsVal,
                            trainer: trainer
                        });
                    }
                }
            }
        }
    } else {
        // 2025-2026.csv 形式 (着順順データ ➔ 馬番順出馬表への高精度抽出変換)
        var venueKeywords = ['札幌', '函館', '福島', '新潟', '東京', '中山', '中京', '京都', '阪神', '小倉', 'ダート', '障害', 'リステッド', 'レース'];
        
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line || line.indexOf('日付') !== -1 || line.indexOf('date') !== -1) continue;

            var tokens = line.split(/[\s,\t|]+/).filter(Boolean);
            if (tokens.length < 6) continue;

            var lineDate = tokens[0].replace(/[-/]/g, '').trim();
            if (lineDate.length === 6) lineDate = '20' + lineDate;
            if (lineDate !== targetDate) continue;

            var lineVenue = normalizeVenue(tokens[1]) || normalizeVenue(tokens[3]);
            if (lineVenue !== targetVenue) continue;

            var lineRace = parseRaceNum(tokens[2]);
            if (lineRace !== targetRace) continue;

            // 馬名（カタカナ）の位置をアンカーとして探索
            var nameIdx = -1;
            var horseName = '';
            for (var k = 2; k < tokens.length; k++) {
                var tok = tokens[k];
                if (venueKeywords.indexOf(tok) !== -1) continue;
                if (/^[\u30A0-\u30FFー・]{2,9}$/.test(tok)) {
                    nameIdx = k;
                    horseName = tok;
                    break;
                }
            }

            if (nameIdx === -1 || !horseName) continue;

            var num = (nameIdx >= 1 && /^\d+$/.test(tokens[nameIdx - 1])) ? parseInt(tokens[nameIdx - 1], 10) : 1;
            var rank = (nameIdx >= 2 && /^\d+$/.test(tokens[nameIdx - 2])) ? parseInt(tokens[nameIdx - 2], 10) : 1;

            var sexAge = (nameIdx + 1 < tokens.length) ? tokens[nameIdx + 1] : '牡3';
            var jockey = (nameIdx + 2 < tokens.length) ? tokens[nameIdx + 2] : '未定';
            var kinryo = (nameIdx + 3 < tokens.length) ? tokens[nameIdx + 3] : '55';
            var oddsVal = 0.0;
            if (nameIdx + 4 < tokens.length) {
                oddsVal = parseFloat(tokens[nameIdx + 4].replace('倍', '')) || 0.0;
            }

            var trainerParts = tokens.slice(nameIdx + 5);
            var trainer = trainerParts.join(' ');

            horses.push({
                rank: rank,
                waku: 1, // 後ほど総頭数から計算
                num: num,
                name: horseName,
                sex_age: sexAge,
                jockey: jockey,
                kinryo: kinryo,
                odds: oddsVal,
                trainer: trainer
            });
        }

        // 正確な「枠番」を自動割り当て
        var totalHorses = horses.length;
        for (var h = 0; h < horses.length; h++) {
            horses[h].waku = getJraWaku(horses[h].num, totalHorses);
        }
    }

    // 馬番昇順（1番, 2番, 3番...）の出馬表へソート変換
    horses.sort(function(a, b) { return a.num - b.num; });
    return horses;
}

// 出馬表テーブル描画機能
function renderRaceTable(tbodyEl, horses) {
    if (!tbodyEl) {
        tbodyEl = document.getElementById('predict-tbody') || document.getElementById('tbody');
    }
    if (!tbodyEl) return;

    var sorted = horses.slice().filter(function(h) { return h.odds > 0; });
    sorted.sort(function(a, b) { return a.odds - b.odds; });

    var rankMap = {};
    for (var r = 0; r < sorted.length; r++) {
        rankMap[sorted[r].num] = r + 1;
    }

    var html = '';
    for (var i = 0; i < horses.length; i++) {
        var h = horses[i];
        var rank = (sorted.length > 0) ? (rankMap[h.num] || 99) : (i + 1);
        
        var aiMark = '-';
        if (rank === 1) {
            aiMark = '<span class="badge-win">◎ 本命</span>';
        } else if (rank === 2) {
            aiMark = '<span class="badge-place">〇 対抗</span>';
        } else if (rank === 3) {
            aiMark = '<span style="color:#d4af37;font-weight:bold;">▲ 単穴</span>';
        } else if (rank >= 4 && rank <= 6 && (h.odds <= 30.0 || h.odds === 0)) {
            aiMark = '<span style="color:#a855f7;font-weight:bold;">△ 連下</span>';
        }

        var oddsStr = (h.odds > 0) ? h.odds.toFixed(1) + '倍' : '未確定';
        var rankBadge = (h.rank > 0) ? ' <small style="color:#10b981;font-size:0.75rem;margin-left:4px;">(' + h.rank + '着)</small>' : '';

        html += '<tr>';
        html += '<td style="font-weight:bold;">' + h.waku + '枠' + h.num + '番</td>';
        html += '<td>' + aiMark + '</td>';
        html += '<td><b style="color:#fff;font-size:1.02rem;">' + h.name + '</b>' + rankBadge + '<br><small style="color:#888;">' + h.sex_age + '</small></td>';
        html += '<td>' + h.jockey + '</td>';
        html += '<td>' + h.trainer + '</td>';
        html += '<td style="color:#d4af37;font-weight:bold;font-size:1.05rem;">' + oddsStr + '</td>';
        html += '</tr>';
    }

    tbodyEl.innerHTML = html;
}

// 🤖 KUINA AI 推奨買い目カード (複数馬券 ＆ 3連単マルチ対応)
function renderAiBetsCard(horses) {
    var card = document.getElementById('ai-bets-recommendation-card');
    if (!card) {
        card = document.createElement('div');
        card.id = 'ai-bets-recommendation-card';
        card.className = 'prediction-box';
        var container = document.querySelector('.container') || document.body;
        container.appendChild(card);
    }

    if (!horses || horses.length === 0) {
        card.style.display = 'none';
        return;
    }
    card.style.display = 'block';

    var valid = horses.filter(function(h) { return h.odds > 0; });
    valid.sort(function(a, b) { return a.odds - b.odds; });
    if (valid.length === 0) valid = horses;

    var honmei = valid[0] || null;
    var taikou = valid[1] || null;
    var tanana = valid[2] || null;
    var renka = valid.slice(3, 6);

    var html = '<h3 style="color:#d4af37;margin-top:0;display:flex;align-items:center;gap:8px;">🤖 KUINA AI 推奨買い目・展開戦略</h3>';
    
    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px;">';
    html += '<div style="background:#111;padding:8px;border-radius:6px;border:1px solid #dc2626;"><span style="color:#dc2626;font-weight:bold;">◎ 本命:</span> ' + (honmei ? '<b>' + honmei.num + '番 ' + honmei.name + '</b> (' + (honmei.odds > 0 ? honmei.odds.toFixed(1) + '倍' : '未確定') + ')' : '-') + '</div>';
    html += '<div style="background:#111;padding:8px;border-radius:6px;border:1px solid #319795;"><span style="color:#319795;font-weight:bold;">〇 対抗:</span> ' + (taikou ? '<b>' + taikou.num + '番 ' + taikou.name + '</b> (' + (taikou.odds > 0 ? taikou.odds.toFixed(1) + '倍' : '未確定') + ')' : '-') + '</div>';
    html += '<div style="background:#111;padding:8px;border-radius:6px;border:1px solid #d4af37;"><span style="color:#d4af37;font-weight:bold;">▲ 単穴:</span> ' + (tanana ? '<b>' + tanana.num + '番 ' + tanana.name + '</b> (' + (tanana.odds > 0 ? tanana.odds.toFixed(1) + '倍' : '未確定') + ')' : '-') + '</div>';
    
    var renkaNames = renka.map(function(r) { return r.num + '番 ' + r.name; }).join(', ');
    html += '<div style="background:#111;padding:8px;border-radius:6px;border:1px solid #a855f7;"><span style="color:#a855f7;font-weight:bold;">△ 連下:</span> ' + (renkaNames || '-') + '</div>';
    html += '</div>';

    html += '<div style="background:#1c160e;padding:12px;border-radius:8px;border:1px solid #d4af37;font-size:0.88rem;">';
    html += '<div style="color:#d4af37;font-weight:bold;margin-bottom:8px;border-bottom:1px solid #333;padding-bottom:4px;">📊 KUINA AI 複数推奨馬券セット</div>';
    
    if (honmei) {
        html += '<div style="margin-bottom:6px;">🔹 <b>単勝 / 複勝</b>: <span style="color:#38bdf8;font-weight:bold;font-size:0.95rem;">' + honmei.num + '番 ' + honmei.name + '</span></div>';
    }
    if (honmei && taikou) {
        html += '<div style="margin-bottom:6px;">🔹 <b>馬連 3頭ボックス</b>: <span style="color:#f59e0b;font-weight:bold;font-size:0.95rem;">' + honmei.num + ' - ' + taikou.num + (tanana ? ' - ' + tanana.num : '') + '</span> (3点)</div>';
    }
    if (honmei) {
        var wideTargets = [taikou, tanana].concat(renka).filter(Boolean).map(function(h) { return h.num; }).join(', ');
        html += '<div style="margin-bottom:6px;">🔹 <b>ワイド 1頭軸流し</b>: <span style="color:#22c55e;font-weight:bold;font-size:0.95rem;">' + honmei.num + ' - [' + (wideTargets || '-') + ']</span></div>';
    }
    if (honmei && taikou && tanana) {
        var trioForm = honmei.num + ' - ' + taikou.num + ' - [' + ([tanana].concat(renka).map(function(r){ return r.num; }).join(', ')) + ']';
        html += '<div style="margin-bottom:6px;">🔹 <b>3連複 フォーメーション</b>: <span style="color:#ec4899;font-weight:bold;font-size:0.95rem;">' + trioForm + '</span></div>';
    }
    if (honmei && taikou && tanana) {
        var aiteNums = [taikou.num, tanana.num].concat(renka.map(function(r){ return r.num; })).join(', ');
        html += '<div>🔥 <b>3連単 軸1頭マルチ</b>: <span style="color:#e11d48;font-weight:bold;font-size:0.95rem;">軸: ' + honmei.num + '番 ➔ 相手: [' + aiteNums + '] (マルチ)</span></div>';
    }

    html += '</div>';

    card.innerHTML = html;
}

// 💰 資金配分シミュレーター (複数馬券＆3連単マルチ対応)
function renderFundSimulator(horses) {
    var simCard = document.getElementById('fund-simulator-card');
    if (!simCard) {
        simCard = document.createElement('div');
        simCard.id = 'fund-simulator-card';
        simCard.className = 'prediction-box';
        var container = document.querySelector('.container') || document.body;
        container.appendChild(simCard);
    }

    var html = '<h3 style="color:#d4af37;margin-top:0;">💰 資金配分シミュレーター (複数馬券＆3連単マルチ)</h3>';
    
    html += '<div style="background:#111;padding:10px;border-radius:8px;border:1px solid #333;margin-bottom:12px;text-align:left;">';
    html += '<div style="color:#aaa;font-size:0.85rem;margin-bottom:6px;font-weight:bold;">【対象馬券種を選択 (複数選択可)】:</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:12px;font-size:0.88rem;">';
    html += '<label><input type="checkbox" class="sim-type-chk" value="tansho" checked onchange="calculateAllocation()"> 単勝</label>';
    html += '<label><input type="checkbox" class="sim-type-chk" value="fukusho" onchange="calculateAllocation()"> 複勝</label>';
    html += '<label><input type="checkbox" class="sim-type-chk" value="umaren" checked onchange="calculateAllocation()"> 馬連ボックス</label>';
    html += '<label><input type="checkbox" class="sim-type-chk" value="wide" checked onchange="calculateAllocation()"> ワイドボックス</label>';
    html += '<label><input type="checkbox" class="sim-type-chk" value="sanrenpuku" onchange="calculateAllocation()"> 3連複ボックス</label>';
    html += '<label><input type="checkbox" class="sim-type-chk" value="sanrentan_multi" checked onchange="calculateAllocation()"> <span style="color:#f43f5e;font-weight:bold;">🔥 3連単マルチ</span></label>';
    html += '</div></div>';

    html += '<div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;">';
    html += '<label style="color:#aaa;font-size:0.85rem;">総投資予算(円): </label>';
    html += '<input type="number" id="total-budget" value="10000" step="1000" onchange="calculateAllocation()" style="width:110px;padding:6px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;text-align:right;font-weight:bold;">';
    html += '</div>';

    html += '<div style="max-height:200px;overflow-y:auto;background:#111;padding:8px;border-radius:8px;border:1px solid #333;text-align:left;">';
    html += '<div style="color:#aaa;font-size:0.8rem;margin-bottom:4px;">【対象馬を選択】:</div>';
    for (var i = 0; i < horses.length; i++) {
        var h = horses[i];
        var checked = (i < 3) ? 'checked' : '';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #222;">';
        html += '<label><input type="checkbox" class="sim-horse-chk" value="' + h.odds + '" data-num="' + h.num + '" data-name="' + h.name + '" ' + checked + ' onchange="calculateAllocation()"> ' + h.num + '番 ' + h.name + '</label>';
        html += '<span style="color:#d4af37;font-weight:bold;">' + (h.odds > 0 ? h.odds.toFixed(1) + '倍' : '-') + '</span>';
        html += '</div>';
    }
    html += '</div>';

    html += '<div id="sim-result" style="margin-top:12px;padding:10px;background:#221d10;border:1px solid #d4af37;border-radius:8px;font-size:0.9rem;">';
    html += '計算中...';
    html += '</div>';

    simCard.innerHTML = html;
    calculateAllocation();
}

function calculateAllocation() {
    var budgetEl = document.getElementById('total-budget');
    var totalBudget = budgetEl ? (parseInt(budgetEl.value, 10) || 10000) : 10000;

    var typeChks = document.querySelectorAll('.sim-type-chk');
    var selectedTypes = [];
    typeChks.forEach(function(c) {
        if (c.checked) selectedTypes.push(c.value);
    });

    var chks = document.querySelectorAll('.sim-horse-chk');
    var selectedHorses = [];

    chks.forEach(function(chk) {
        if (chk.checked) {
            var odds = parseFloat(chk.value) || 0;
            if (odds > 0) {
                var num = chk.getAttribute('data-num');
                var name = chk.getAttribute('data-name');
                selectedHorses.push({ num: num, name: name, odds: odds });
            }
        }
    });

    var resEl = document.getElementById('sim-result');
    if (!resEl) return;

    if (selectedHorses.length === 0 || selectedTypes.length === 0) {
        resEl.innerHTML = '<span style="color:#888;">対象の馬および馬券種を選択してください</span>';
        return;
    }

    var combinations = [];

    selectedTypes.forEach(function(type) {
        if (type === 'tansho') {
            selectedHorses.forEach(function(s) {
                combinations.push({ label: '単勝 ' + s.num + '番 ' + s.name, odds: s.odds });
            });
        } else if (type === 'fukusho') {
            selectedHorses.forEach(function(s) {
                var estFukusho = Math.max(1.1, (s.odds * 0.35 + 0.8));
                combinations.push({ label: '複勝 ' + s.num + '番 ' + s.name, odds: estFukusho });
            });
        } else if (type === 'umaren' || type === 'wide') {
            if (selectedHorses.length >= 2) {
                for (var i = 0; i < selectedHorses.length; i++) {
                    for (var j = i + 1; j < selectedHorses.length; j++) {
                        var h1 = selectedHorses[i];
                        var h2 = selectedHorses[j];
                        var estOdds = (type === 'umaren') ? (h1.odds * h2.odds * 0.18 + 2.0) : (h1.odds * h2.odds * 0.08 + 1.5);
                        var labelName = (type === 'umaren' ? '馬連 ' : 'ワイド ') + h1.num + ' - ' + h2.num + ' (' + h1.name + ' / ' + h2.name + ')';
                        combinations.push({ label: labelName, odds: estOdds });
                    }
                }
            }
        } else if (type === 'sanrenpuku') {
            if (selectedHorses.length >= 3) {
                for (var i = 0; i < selectedHorses.length; i++) {
                    for (var j = i + 1; j < selectedHorses.length; j++) {
                        for (var k = j + 1; k < selectedHorses.length; k++) {
                            var h1 = selectedHorses[i];
                            var h2 = selectedHorses[j];
                            var h3 = selectedHorses[k];
                            var estOdds = h1.odds * h2.odds * h3.odds * 0.05 + 5.0;
                            var labelName = '3連複 ' + h1.num + ' - ' + h2.num + ' - ' + h3.num;
                            combinations.push({ label: labelName, odds: estOdds });
                        }
                    }
                }
            }
        } else if (type === 'sanrentan_multi') {
            if (selectedHorses.length >= 3) {
                for (var i = 0; i < selectedHorses.length; i++) {
                    for (var j = i + 1; j < selectedHorses.length; j++) {
                        for (var k = j + 1; k < selectedHorses.length; k++) {
                            var h1 = selectedHorses[i];
                            var h2 = selectedHorses[j];
                            var h3 = selectedHorses[k];
                            var rawBaseOdds = h1.odds * h2.odds * h3.odds * 0.12 + 12.0;
                            var effectiveOdds = Math.max(2.0, rawBaseOdds / 6.0);
                            var labelName = '🔥 3連単マルチ ' + h1.num + ' - ' + h2.num + ' - ' + h3.num + ' (6通り)';
                            combinations.push({ label: labelName, odds: effectiveOdds });
                        }
                    }
                }
            }
        }
    });

    if (combinations.length === 0) {
        resEl.innerHTML = '<span style="color:#f87171;">選択した馬券種に必要な馬の頭数をチェックしてください (馬連/ワイドは2頭以上, 3連複/3連単マルチは3頭以上)</span>';
        return;
    }

    var invOddsSum = 0;
    combinations.forEach(function(c) {
        invOddsSum += (1.0 / c.odds);
    });

    if (invOddsSum === 0) return;

    var synthOdds = (1.0 / invOddsSum).toFixed(2);
    var expReturn = Math.floor(totalBudget * synthOdds);

    var resHtml = '<b>総買い目組み合わせ: <span style="color:#d4af37;">' + combinations.length + '件</span> | 合成オッズ: <span style="color:#d4af37;font-size:1.1rem;">' + synthOdds + '倍</span></b>';
    resHtml += '<br>想定的中時総払戻: <span style="color:#22c55e;font-weight:bold;font-size:1.05rem;">' + expReturn.toLocaleString() + '円</span><br><br>';
    resHtml += '<table style="width:100%;font-size:0.8rem;"><tr><th>点数/組合せ</th><th>推定オッズ</th><th>推奨購入額</th><th>想定的中払戻</th></tr>';

    combinations.forEach(function(c) {
        var bet = Math.round((totalBudget * (1.0 / c.odds) / invOddsSum) / 100) * 100;
        if (bet < 100) bet = 100;
        var payout = Math.floor(bet * c.odds);
        resHtml += '<tr><td style="text-align:left;">' + c.label + '</td><td>' + c.odds.toFixed(1) + '倍</td><td><b>' + bet.toLocaleString() + '円</b></td><td>' + payout.toLocaleString() + '円</td></tr>';
    });
    resHtml += '</table>';

    resEl.innerHTML = resHtml;
}

function showErrorNotice(msg) {
    var banner = document.getElementById('error-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'error-banner';
        banner.style.cssText = 'background:#7f1d1d;color:#fca5a5;padding:12px;border-radius:8px;margin-top:15px;border:1px solid #ef4444;text-align:center;font-weight:bold;font-size:0.9rem;';
        var container = document.querySelector('.container') || document.body;
        container.appendChild(banner);
    }
    banner.innerText = '⚠️ ' + msg;
    banner.style.display = 'block';
}

async function loadAndUnzipJraDatabase() {
    var banner = document.getElementById('error-banner');
    if (banner) banner.style.display = 'none';

    var dateEl = document.getElementById('sim-date') || document.getElementById('date') || document.querySelector('input[type="date"]') || document.querySelector('input[name="date"]');
    var venueEl = document.getElementById('sim-venue') || document.getElementById('venue') || document.querySelector('select[name="venue"]');
    var raceEl = document.getElementById('sim-race') || document.getElementById('race') || document.querySelector('select[name="race"]');
    var btnEl = document.getElementById('predict-btn') || document.getElementById('btn-predict') || document.querySelector('.btn-predict');
    var tbodyEl = document.getElementById('predict-tbody') || document.getElementById('tbody') || document.querySelector('tbody');

    var rawDate = dateEl ? dateEl.value : '2026-10-03';
    var rawVenue = venueEl ? venueEl.value : '東京';
    var rawRace = raceEl ? raceEl.value : '11';

    var cG = normalizeDateStr(rawDate);
    var cV = normalizeVenue(rawVenue);
    var cR = parseRaceNum(rawRace);

    if (btnEl) btnEl.innerText = '⚡ データ照合中...';

    var targetFile = '2025-2026.csv';
    if (cG === '20261003') {
        targetFile = 'DG261003.CSV';
    } else if (cG === '20261004') {
        targetFile = 'DG261004.CSV';
    }

    try {
        var response = await fetch(targetFile, { method: 'GET', cache: 'no-cache' });
        if (!response.ok) {
            var altName = (targetFile === 'DG261003.CSV') ? 'DG261003.csv' : (targetFile === 'DG261004.CSV' ? 'DG261004.csv' : '2025-2026.csv');
            response = await fetch(altName, { method: 'GET', cache: 'no-cache' });
        }

        if (!response.ok && targetFile !== '2025-2026.csv') {
            response = await fetch('2025-2026.csv', { method: 'GET', cache: 'no-cache' });
            targetFile = '2025-2026.csv';
        }

        if (!response.ok) {
            if (btnEl) btnEl.innerText = '🧠 指定レースのデータ検索を実行';
            showErrorNotice('対象ファイル (' + targetFile + ') の読み込みに失敗しました。ファイルがサーバー上に正しく配置されているかご確認ください。');
            return;
        }

        var buffer = await response.arrayBuffer();
        var decoder = new TextDecoder('shift_jis');
        var csvText = decoder.decode(buffer);

        var horses = parseCsvData(csvText, targetFile, cG, cV, cR);

        if (!horses || horses.length === 0) {
            if (btnEl) btnEl.innerText = '🧠 指定レースのデータ検索を実行';
            showErrorNotice('選択条件 (日付: ' + cG + ' / 競馬場: ' + cV + ' / ' + cR + 'R) に合致する出走馬データが見つかりませんでした。');
            return;
        }

        renderRaceTable(tbodyEl, horses);
        renderAiBetsCard(horses);
        renderFundSimulator(horses);

        if (btnEl) btnEl.innerText = '🧠 指定レースのデータ検索を実行';
    } catch (err) {
        console.error('データ処理エラー:', err);
        if (btnEl) btnEl.innerText = '🧠 指定レースのデータ検索を実行';
        showErrorNotice('処理実行エラー: ' + err.message);
    }
}
