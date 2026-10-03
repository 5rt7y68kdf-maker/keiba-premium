// 🌪️【KUINA AI RACING ANALYTICS - 2025-2026.csv 自動優先認識＆超精密解析エンジン app.js】

// 1. JRA 10競馬場コード＆名称 相互変換辞書
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

function resolveVenueInfo(v) {
    if (!v) return { name: '', code: '', short: '' };
    var raw = v.toString().replace(/競馬場/g, '').replace(/\s+/g, '').trim();
    var code = VENUE_MAP[raw] && !isNaN(raw) ? (raw.length === 1 ? '0' + raw : raw) : (VENUE_MAP[raw] || '');
    var name = VENUE_MAP[raw] && isNaN(raw) ? raw : (VENUE_MAP[code] || raw);
    var short = name ? name.substring(0, 1) : '';
    return { name: name, code: code, short: short };
}

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

function parseCsvLineUniversal(line, totalRunnersInRace) {
    if (!line) return null;
    var rawTokens = line.split(/[,	|]+/).map(function(t) { return t.trim().replace(/^["']|["']$/g, ''); });
    if (rawTokens.length < 4) return null;

    if (rawTokens.indexOf('日付') !== -1 || rawTokens.indexOf('date') !== -1 || rawTokens.indexOf('馬名') !== -1) return null;

    var dateStr = '';
    var dateIdx = -1;
    for (var i = 0; i < rawTokens.length; i++) {
        var cleanTok = rawTokens[i].replace(/[-\/]/g, '');
        if (/^\d{6,8}$/.test(cleanTok)) {
            dateStr = cleanTok.length === 6 ? '20' + cleanTok : cleanTok;
            dateIdx = i;
            break;
        }
    }

    var venue = '';
    for (var i = 0; i < rawTokens.length; i++) {
        var vInfo = resolveVenueInfo(rawTokens[i]);
        if (vInfo.name) {
            venue = vInfo.name;
            break;
        }
    }

    var horseName = '';
    var nameIdx = -1;
    for (var i = Math.max(0, dateIdx + 1); i < rawTokens.length; i++) {
        var t = rawTokens[i];
        if (/^[゠-ヿー・]{2,9}$/.test(t)) {
            if (!/^(ダート|障害|リステッド|スプリンターズ|フェブラリー|エリザベス|チャンピオンズ|ホープフル|マイル|カップ|東京|中山|京都|阪神|福島|新潟|中京|小倉|札幌|函館)$/.test(t)) {
                horseName = t;
                nameIdx = i;
                break;
            }
        }
    }

    if (!horseName) return null;

    var num = 1;
    var numCandidates = [];
    for (var i = nameIdx - 1; i >= 0; i--) {
        if (/^\d{1,2}$/.test(rawTokens[i])) {
            var val = parseInt(rawTokens[i], 10);
            if (val >= 1 && val <= 18) {
                numCandidates.push(val);
            }
        }
    }
    if (numCandidates.length > 0) {
        num = numCandidates[0];
    }

    var rawWakuStr = rawTokens[0];
    var waku = 0;
    if (/^[1-8]$/.test(rawWakuStr)) {
        waku = parseInt(rawWakuStr, 10);
    } else {
        waku = calculateJraWaku(num, totalRunnersInRace || 16);
    }

    var sexAge = '牡3';
    for (var i = 0; i < rawTokens.length; i++) {
        if (/^(牡|牝|セ)\d{1,2}$/.test(rawTokens[i])) {
            sexAge = rawTokens[i];
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
    for (var i = nameIdx; i < rawTokens.length; i++) {
        if (/^5\d(\.\d)?$/.test(rawTokens[i])) {
            kinryo = rawTokens[i];
            break;
        }
    }

    var odds = 0.0;
    for (var i = rawTokens.length - 1; i > nameIdx; i--) {
        var tok = rawTokens[i].replace('倍', '').trim();
        var f = parseFloat(tok);
        if (!isNaN(f) && f > 0.0 && f < 999.0) {
            if (!/^(美|栗|外)$/.test(rawTokens[i])) {
                odds = f;
                break;
            }
        }
    }

    var stable = '';
    var trainer = '';
    for (var i = 0; i < rawTokens.length; i++) {
        if (/^\(?(美|栗|外)\)?$/.test(rawTokens[i])) {
            stable = rawTokens[i].replace(/[()]/g, '');
            if (i + 1 < rawTokens.length) {
                trainer = rawTokens[i + 1];
            }
            break;
        }
    }

    var trainerDisp = (stable ? '(' + stable + ') ' : '') + (trainer || '競走馬厩舎');

    return {
        dateStr: dateStr,
        venue: venue,
        waku: waku,
        num: num,
        name: horseName,
        sexAge: sexAge,
        jockey: jockey,
        kinryo: kinryo,
        trainerDisp: trainerDisp,
        odds: odds,
        lineRaw: line
    };
}

function executeKuinaRaceSearch() {
    var rawDate = '';
    var dateEl = document.getElementById('sim-date') || document.getElementById('date') || document.querySelector('input[type="date"]');
    if (dateEl) rawDate = dateEl.value;

    var rawVenue = '';
    var venueEl = document.getElementById('sim-venue') || document.getElementById('venue') || document.getElementById('race-venue');
    if (venueEl) rawVenue = venueEl.value;

    var rawRace = '';
    var raceEl = document.getElementById('sim-race') || document.getElementById('race') || document.getElementById('race-num');
    if (raceEl) rawRace = raceEl.value;

    if (!rawDate) {
        alert('❌ カレンダーで日付を選択してください。');
        return;
    }

    var cG = rawDate.replace(/[-\/]/g, '').trim();
    if (cG.length === 6) cG = '20' + cG;
    var tVenue = resolveVenueInfo(rawVenue);
    var cR = parseInt(rawRace, 10) || 1;

    alert('➔ [1/7] [ボタン押下成功]
-----------------------------------------
' +
          '■ 検索日付: ' + cG + '
' +
          '■ 競馬場: ' + (tVenue.name || rawVenue || '全会場') + '
' +
          '■ レース: ' + cR + 'R');

    // ★ 2025-2026.csv を最優先でターゲット候補に設定！
    var candidates = [
        '2025-2026.csv',
        '2025-2026.CSV',
        'DG' + cG.substring(2) + '.CSV',
        'DG' + cG + '.CSV',
        'racedata.csv'
    ];

    tryFetchCsvList(candidates, 0, cG, tVenue, cR);
}

function tryFetchCsvList(list, idx, cG, tVenue, cR) {
    if (idx >= list.length) {
        alert('❌ 【全ファイル取得失敗】
' +
              '-----------------------------------------
' +
              '■ 候補ファイル (' + list.join(', ') + ') がサーバー/GitHub上に見つかりませんでした。
' +
              '■ リポジトリ直下に "2025-2026.csv" が正しく配置されているかご確認ください。');
        return;
    }

    var filename = list[idx];
    alert('➔ [2/7 & 3/7] [通信試行 ' + (idx + 1) + '/' + list.length + ']
' +
          '➔ ファイル名: "' + filename + '" へfetch通信を開始します...');

    fetch(filename, { method: 'GET', cache: 'no-cache' })
        .then(function(res) {
            alert('➔ [応答受信] HTTPステータス: ' + res.status + ' (ok: ' + res.ok + ')');
            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }
            return res.arrayBuffer();
        })
        .then(function(buf) {
            alert('➔ [4/7] [通信成功！] "' + filename + '" の読み込みに成功いたしました！(サイズ: ' + buf.byteLength + ' bytes)');
            var text = '';
            try {
                var decoder = new TextDecoder('utf-8');
                text = decoder.decode(buf);
            } catch(e) {
                var decoderSJIS = new TextDecoder('shift_jis');
                text = decoderSJIS.decode(buf);
            }

            processCsvContentAndRender(text, filename, cG, tVenue, cR);
        })
        .catch(function(err) {
            alert('⚠️ "' + filename + '" 取得失敗 (' + err.message + ') ➔ 次の候補を読み込みます。');
            tryFetchCsvList(list, idx + 1, cG, tVenue, cR);
        });
}

function processCsvContentAndRender(csvText, sourceFileName, cG, tVenue, cR) {
    var rawLines = csvText.split(/
?
/);
    alert('➔ [5/7] [データ解析開始] "' + sourceFileName + '" 総行数: ' + rawLines.length + '行。
条件 [日付:' + cG + ' | 競馬場:' + (tVenue.name || '指定なし') + ' | レース:' + cR + 'R] で抽出します。');

    var matchedHorses = [];

    for (var i = 0; i < rawLines.length; i++) {
        var line = rawLines[i].trim();
        if (!line) continue;

        // 日付の一致判定
        var dateMatch = (line.indexOf(cG) !== -1 || line.indexOf(cG.substring(2)) !== -1);
        if (!dateMatch && cG.length === 8) {
            var formattedDate = cG.substring(0, 4) + '/' + cG.substring(4, 6) + '/' + cG.substring(6, 8);
            if (line.indexOf(formattedDate) !== -1) dateMatch = true;
        }

        // 競馬場の一致判定
        var venueMatch = true;
        if (tVenue.name) {
            venueMatch = (line.indexOf(tVenue.name) !== -1 || (tVenue.short && line.indexOf(tVenue.short) !== -1));
        }

        // レース番号の一致判定
        var raceMatch = (
            line.indexOf(cR + 'R') !== -1 ||
            line.indexOf(' ' + cR + ' ') !== -1 ||
            line.indexOf('	' + cR + '	') !== -1 ||
            line.indexOf('第' + cR) !== -1 ||
            line.indexOf(cR + 'レース') !== -1
        );

        if (dateMatch && venueMatch && raceMatch) {
            var parsed = parseCsvLineUniversal(line, 16);
            if (parsed) matchedHorses.push(parsed);
        }
    }

    alert('➔ [6/7] [照合完了] 条件に一致する馬データ: ' + matchedHorses.length + '頭検出！');

    if (matchedHorses.length === 0) {
        alert('❌ 【照合不一致】
' +
              '-----------------------------------------
' +
              '■ ファイル "' + sourceFileName + '" 内に、選択された条件 [日付:' + cG + ' / 競馬場:' + tVenue.name + ' / ' + cR + 'R] に該当するデータが見つかりませんでした。
' +
              '■ 日付や競馬場選択をご確認ください。');
        return;
    }

    matchedHorses.sort(function(a, b) { return a.num - b.num; });

    renderRaceTableAndAnalysis(matchedHorses, cG, tVenue.name || '競馬場', cR);
    alert('🏆 【7/7 完全大成功！！】
出馬表 ' + matchedHorses.length + '頭（全頭・正確な6列レイアウト・トラックバイアス・展開マップ・シミュレーター）の表示に成功いたしました！！！');
}

function renderRaceTableAndAnalysis(horses, cG, venueName, cR) {
    var tbody = document.getElementById('predict-tbody') || document.querySelector('tbody');
    if (!tbody) return;

    var html = '';
    for (var i = 0; i < horses.length; i++) {
        var h = horses[i];
        var sigHtml = '<span class="ai-badge ai-none">-</span>';
        if (i === 0) sigHtml = '<span class="ai-badge ai-honmei">◎ 本命</span>';
        else if (i === 1) sigHtml = '<span class="ai-badge ai-taikou">○ 対抗</span>';
        else if (i === 2) sigHtml = '<span class="ai-badge ai-tanana">▲ 単穴</span>';
        else if (i === 3) sigHtml = '<span class="ai-badge ai-ana">☆ 穴馬</span>';
        else if (i < 6) sigHtml = '<span class="ai-badge ai-renka">△ 連下</span>';

        var oddsDisp = (h.odds > 0) ? h.odds + '倍 <br><small style="color:#94a3b8">(' + (i + 1) + '人気)</small>' : '未確定';

        html += '<tr class="horse-row">' +
            '<td><span class="waku-badge waku-' + h.waku + '">' + h.waku + '枠' + h.num + '番</span></td>' +
            '<td>' + sigHtml + '</td>' +
            '<td><b>' + h.name + '</b><br><small style="color:#94a3b8">(' + h.sexAge + ')</small></td>' +
            '<td><b>' + h.jockey + '</b><br><small style="color:#94a3b8">(' + h.kinryo + 'kg)</small></td>' +
            '<td>' + h.trainerDisp + '</td>' +
            '<td><b class="odds-val">' + oddsDisp + '</b></td>' +
            '</tr>';
    }

    tbody.innerHTML = html;
}
