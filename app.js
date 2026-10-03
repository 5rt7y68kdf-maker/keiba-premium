// 🌪️【KUINA AI RACING ANALYTICS - 完全自動・全形式対応型 超精密検索エンジン app.js】

(function() {
    console.log('KUINA AI Racing Analytics Engine Initialized');

    // --------------------------------------------------
    // 1. DOM要素自動検出 & 補正補助ユーティリティ
    // --------------------------------------------------
    function findDomElement(idList) {
        if (typeof document === 'undefined') return null;
        for (var i = 0; i < idList.length; i++) {
            var el = document.getElementById(idList[i]);
            if (el) return el;
            var byName = document.getElementsByName(idList[i]);
            if (byName && byName.length > 0) return byName[0];
            var byClass = document.getElementsByClassName(idList[i]);
            if (byClass && byClass.length > 0) return byClass[0];
        }
        return null;
    }

    function findDomValue(idList) {
        var el = findDomElement(idList);
        return el && el.value !== undefined ? el.value : '';
    }

    // --------------------------------------------------
    // 2. 競馬場マッピング & 日付・レース番号正規化
    // --------------------------------------------------
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

    function resolveVenue(v) {
        if (!v) return { name: '', code: '', short: '' };
        var raw = v.toString().replace(/競馬場/g, '').replace(/\s+/g, '').trim();
        var code = VENUE_MAP[raw] && !isNaN(raw) ? (raw.length === 1 ? '0' + raw : raw) : (VENUE_MAP[raw] || '');
        var name = VENUE_MAP[raw] && isNaN(raw) ? raw : (VENUE_MAP[code] || raw);
        var short = name ? name.substring(0, 1) : '';
        return { name: name, code: code, short: short };
    }

    function normalizeDateStr(d) {
        if (!d) return '';
        var nums = d.toString().match(/\d+/g);
        if (!nums) return '';
        var clean = nums.join('');
        if (clean.length === 6) clean = '20' + clean;
        return clean; // YYYYMMDD
    }

    function normalizeRaceNumVal(r) {
        if (!r) return 0;
        var m = r.toString().match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
    }

    // --------------------------------------------------
    // 3. JRA 枠番自動計算 (馬番と出走頭数から公式枠番を算出)
    // --------------------------------------------------
    function calculateJraWaku(num, total) {
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
    // 4. メイン検索エンジン (ファイル選択 & Fetch & 自動解析)
    // --------------------------------------------------
    window.loadAndUnzipJraDatabase = function() {
        var rawDate = findDomValue(['sim-date', 'sim_date', 'date', 'race-date', 'race_date']);
        var rawVenue = findDomValue(['sim-venue', 'sim_venue', 'venue', 'race-venue', 'race_venue']);
        var rawRace = findDomValue(['sim-race', 'sim_race', 'race', 'race-num', 'race_num']);
        var btn = findDomElement(['predict-btn', 'predict_btn', 'btn-predict', 'submit-btn']);
        var tbody = findDomElement(['predict-tbody', 'predict_tbody', 'result-tbody', 'tbody']);

        if (!rawDate) {
            alert('❌ 日付を選択してください（日付入力フォームが見つかりません）');
            return;
        }

        var targetDate = normalizeDateStr(rawDate); // e.g. 20261003
        var targetVenue = resolveVenue(rawVenue);
        var targetRace = normalizeRaceNumVal(rawRace);

        if (btn) btn.innerText = '⚡ データを検索・解析中...';

        // 1. ローカルファイル選択 (<input type="file">) があるか確認
        var fileInput = findDomElement(['csv-file-input', 'file-input', 'csv_file', 'racedata_file']);
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            var file = fileInput.files[0];
            var reader = new FileReader();
            reader.onload = function(e) {
                processCsvContent(e.target.result, targetDate, targetVenue, targetRace, btn, tbody);
            };
            reader.readAsText(file, 'Shift_JIS');
            return;
        }

        // 2. ファイル未選択の場合は、日付に対応するCSVファイルを自動Fetch (e.g. DG261003.CSV or racedata.txt)
        var yy = targetDate.substring(2, 4);
        var mm = targetDate.substring(4, 6);
        var dd = targetDate.substring(6, 8);
        var possibleUrls = [
            'DG' + yy + mm + dd + '.CSV',
            'DG' + yy + mm + dd + '.csv',
            'racedata.csv',
            'racedata.txt'
        ];

        tryFetchNext(possibleUrls, 0, targetDate, targetVenue, targetRace, btn, tbody);
    };

    function tryFetchNext(urls, idx, targetDate, targetVenue, targetRace, btn, tbody) {
        if (idx >= urls.length) {
            alert('❌ 該当するCSVデータが見つかりませんでした。
1. HTML内に <input type="file" id="csv-file-input"> を設置してファイルを選択するか、
2. サーバー上に "DG' + targetDate.substring(2) + '.CSV" または "racedata.csv" を配置してください。');
            if (btn) btn.innerText = '🧠 指定レースのデータ検索を実行';
            return;
        }

        fetch(urls[idx], { method: 'GET', cache: 'no-cache' })
            .then(function(res) {
                if (!res.ok) throw new Error('404');
                return res.arrayBuffer();
            })
            .then(function(buf) {
                var decoder = new TextDecoder('shift_jis');
                var text = decoder.decode(buf);
                processCsvContent(text, targetDate, targetVenue, targetRace, btn, tbody);
            })
            .catch(function() {
                tryFetchNext(urls, idx + 1, targetDate, targetVenue, targetRace, btn, tbody);
            });
    }

    // --------------------------------------------------
    // 5. CSVテキスト解析 & テーブル・AI分析描画
    // --------------------------------------------------
    function processCsvContent(text, targetDate, targetVenue, targetRace, btn, tbody) {
        var lines = text.split(/
?
/);
        var matchedHorses = [];

        // 全行パース
        var allParsed = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;
            var parts = line.split(',');
            if (parts.length < 10) continue;

            // 馬名特定
            var horseName = '';
            var nameIdx = -1;
            for (var k = 0; k < parts.length; k++) {
                var p = parts[k].trim().replace(/"/g, '');
                if (/^[゠-ヿー・]{2,9}$/.test(p)) {
                    if (!/^(ダート|障害|リステッド|スプリンターズ|フェブラリー|エリザベス|チャンピオンズ|ホープフル|マイル|カップ)$/.test(p)) {
                        horseName = p;
                        nameIdx = k;
                        break;
                    }
                }
            }
            if (!horseName) continue;

            // 馬番
            var num = 1;
            for (var k = nameIdx - 1; k >= 0; k--) {
                var v = parseInt(parts[k].trim(), 10);
                if (!isNaN(v) && v >= 1 && v <= 18) {
                    num = v;
                    break;
                }
            }

            // 枠番
            var rawWaku = parts[0].trim().replace(/"/g, '');
            var waku = parseInt(rawWaku, 10);
            if (isNaN(waku) || waku < 1 || waku > 8) waku = 0;

            // 性齢
            var sexAge = '牡3';
            for (var k = nameIdx; k < Math.min(parts.length, nameIdx + 5); k++) {
                var p = parts[k].trim();
                if (/^(牡|牝|セ)\d{1,2}$/.test(p)) {
                    sexAge = p;
                    break;
                }
            }

            // 騎手
            var jockey = '未定';
            if (nameIdx + 5 < parts.length) {
                var jCandidate = parts[nameIdx + 5].trim();
                if (jCandidate && !/^\d+/.test(jCandidate)) jockey = jCandidate;
            }

            // 斤量
            var kinryo = '56';
            for (var k = nameIdx + 4; k < Math.min(parts.length, nameIdx + 8); k++) {
                var p = parts[k].trim();
                if (/^\d{2}(\.\d)?$/.test(p)) {
                    kinryo = p;
                    break;
                }
            }

            // オッズ
            var odds = 0;
            if (parts.length >= 23) {
                var oVal = parseFloat(parts[15].trim());
                if (!isNaN(oVal) && oVal > 0) odds = oVal;
            }

            // 調教師
            var trainer = '所属未定';
            if (parts.length >= 23) {
                var st = parts[16].trim();
                var tr = parts[17].trim();
                trainer = (st ? st + ' ' : '') + tr;
            } else if (parts.length >= 22) {
                var st = parts[15].trim();
                var tr = parts[16].trim();
                trainer = (st ? st + ' ' : '') + tr;
            }

            // 競馬場検出
            var lineVenue = '';
            for (var k = 0; k < parts.length; k++) {
                var p = parts[k].trim();
                if (/^(東京|中山|京都|阪神|新潟|福島|中京|小倉|札幌|函館)$/.test(p)) {
                    lineVenue = p;
                    break;
                }
            }

            allParsed.push({
                lineIdx: i,
                waku: waku,
                num: num,
                name: horseName,
                sexAge: sexAge,
                jockey: jockey,
                kinryo: kinryo,
                odds: odds,
                trainer: trainer,
                venue: lineVenue
            });
        }

        if (allParsed.length === 0) {
            alert('❌ CSVから有効な馬データを解析できませんでした。フォーマットをご確認ください。');
            if (btn) btn.innerText = '🧠 指定レースのデータ検索を実行';
            return;
        }

        // レース区切りロジック (馬番が1に戻る箇所でレースを分割)
        var races = [];
        var currentRace = [];
        for (var i = 0; i < allParsed.length; i++) {
            var item = allParsed[i];
            if (item.num === 1 && currentRace.length > 0) {
                races.push(currentRace);
                currentRace = [];
            }
            currentRace.push(item);
        }
        if (currentRace.length > 0) races.push(currentRace);

        // 指定された対象レースの選定
        var selectedRaceHorses = null;

        // レース番号でマッチング
        if (targetRace >= 1 && targetRace <= races.length) {
            // 関東/関西の自動振分け（全24レース構成の場合）
            if (races.length === 24) {
                var isKansai = (targetVenue.name === '京都' || targetVenue.name === '阪神' || targetVenue.name === '中京' || targetVenue.name === '小倉');
                var raceIdx = (isKansai ? 12 : 0) + (targetRace - 1);
                if (raceIdx < races.length) selectedRaceHorses = races[raceIdx];
            } else {
                selectedRaceHorses = races[targetRace - 1];
            }
        }

        if (!selectedRaceHorses || selectedRaceHorses.length === 0) {
            selectedRaceHorses = races[0]; // フォールバック: 最初のレースを表示
        }

        // 枠番の自動補正 (waku === 0 の場合)
        var totalRunners = selectedRaceHorses.length;
        for (var j = 0; j < selectedRaceHorses.length; j++) {
            var h = selectedRaceHorses[j];
            if (h.waku === 0) {
                h.waku = calculateJraWaku(h.num, totalRunners);
            }
        }

        // 1番人気〜の順位計算
        var withOdds = selectedRaceHorses.filter(function(x) { return x.odds > 0; });
        withOdds.sort(function(a, b) { return a.odds - b.odds; });
        for (var j = 0; j < selectedRaceHorses.length; j++) {
            var h = selectedRaceHorses[j];
            if (h.odds > 0) {
                var rank = withOdds.findIndex(function(x) { return x.name === h.name; }) + 1;
                h.popRank = rank;
                if (rank === 1) h.aiMark = '<span class="ai-badge ai-honmei">◎ 本命</span>';
                else if (rank === 2) h.aiMark = '<span class="ai-badge ai-taikou">○ 対抗</span>';
                else if (rank === 3) h.aiMark = '<span class="ai-badge ai-tanana">▲ 単穴</span>';
                else if (h.odds >= 15.0 && h.odds <= 60.0 && rank <= 7) h.aiMark = '<span class="ai-badge ai-ana">☆ 穴馬</span>';
                else if (rank <= 5) h.aiMark = '<span class="ai-badge ai-renka">△ 連下</span>';
                else h.aiMark = '<span class="ai-badge ai-none">-</span>';
            } else {
                h.popRank = 0;
                h.aiMark = '<span class="ai-badge ai-none">-</span>';
            }
        }

        // テーブルHTML描画
        var html = '';
        for (var j = 0; j < selectedRaceHorses.length; j++) {
            var h = selectedRaceHorses[j];
            var oddsDisp = h.odds > 0 ? '<b>' + h.odds.toFixed(1) + '倍</b> <small style="color:#94a3b8">(' + h.popRank + '人気)</small>' : '<span style="color:#94a3b8">未確定</span>';
            
            html += '<tr class="horse-row">' +
                '<td><span class="waku-badge waku-' + h.waku + '">' + h.waku + '枠' + h.num + '番</span></td>' +
                '<td>' + h.aiMark + '</td>' +
                '<td><span class="horse-name">' + h.name + '</span><span class="sub-info">(' + h.sexAge + ')</span></td>' +
                '<td><span class="jockey-name">' + h.jockey + '</span><span class="sub-info">(' + h.kinryo + 'kg)</span></td>' +
                '<td><span class="trainer-name">' + h.trainer + '</span></td>' +
                '<td>' + oddsDisp + '</td>' +
                '</tr>';
        }

        if (tbody) tbody.innerHTML = html;
        if (btn) btn.innerText = '🧠 指定レースのデータ検索を実行';

        console.log('Successfully rendered ' + selectedRaceHorses.length + ' horses!');
    }

})();
