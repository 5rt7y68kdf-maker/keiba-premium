// 🛠️【完全復旧版 app.js (収支結果カット・6列構成)】

// --------------------------------------------------
// 1. JRA 10競馬場コード＆名称 相互変換辞書
// --------------------------------------------------
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

// --------------------------------------------------
// 2. テキスト行精密パースエンジン (parseRowBulletproof)
// --------------------------------------------------
function parseRowBulletproof(line, rowIdx) {
    if (!line) return null;
    var tokens = line.split(/[\s,\t|]+/).map(function(t) { return t.trim(); }).filter(Boolean);
    if (tokens.length < 4) return null;

    // ヘッダー行スキップ
    if (tokens.indexOf("日付") !== -1 || tokens.indexOf("date") !== -1 || tokens.indexOf("枠") !== -1) return null;

    // 1. 日付トークンの検出
    var dateStr = "";
    var dateIdx = -1;
    for (var i = 0; i < tokens.length; i++) {
        if (/^\d{6,12}$/.test(tokens[i]) || /^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/.test(tokens[i])) {
            dateStr = tokens[i];
            dateIdx = i;
            break;
        }
    }

    // 2. 競走馬名の自動特定 (JRA公式規定: 2〜9文字の純カタカナ)
    var nameIdx = -1;
    var horseName = "";
    for (var i = Math.max(0, dateIdx + 1); i < tokens.length; i++) {
        var t = tokens[i];
        if (/^[\u30A0-\u30FFー・]{2,9}$/.test(t)) {
            if (!/^(ダート|障害|リステッド|スプリンターズ|フェブラリー|エリザベス|チャンピオンズ|ホープフル|マイル|カップ)$/.test(t)) {
                nameIdx = i;
                horseName = t;
                break;
            }
        }
    }

    if (!horseName) return null;

    // 3. 騎手名の自動取得
    var jockey = "不明";
    if (nameIdx + 1 < tokens.length) {
        var jCandidate = tokens[nameIdx + 1];
        if (!/^\d+(\.\d+)?$/.test(jCandidate) && jCandidate.length <= 8) {
            jockey = jCandidate;
        }
    }

    // 4. 枠番・馬番の自動判定
    var waku = 1, num = 1;
    var numCandidates = [];
    for (var i = nameIdx - 1; i >= Math.max(0, dateIdx); i--) {
        if (/^\d{1,2}$/.test(tokens[i])) {
            var v = parseInt(tokens[i], 10);
            if (v >= 1 && v <= 18) {
                numCandidates.push(v);
            }
        }
    }

    if (numCandidates.length >= 2) {
        num = numCandidates[0];
        waku = numCandidates[1];
    } else if (numCandidates.length === 1) {
        num = numCandidates[0];
        waku = Math.ceil(num / 2);
    } else {
        num = rowIdx + 1;
        waku = Math.min(8, Math.ceil(num / 2));
    }

    // 5. 単勝オッズの検出 (着差データの混入防止)
    var odds = 0.0;
    for (var i = tokens.length - 1; i > nameIdx; i--) {
        var tok = tokens[i].replace("倍", "").trim();
        if (/^\\([+-]?\d+\\)$/.test(tok)) continue;
        var f = parseFloat(tok);
        if (!isNaN(f) && f > 0) {
            if (f < 1.0 && i > nameIdx + 2) continue; // 末尾の着差・指数データの除外
            odds = f;
            break;
        }
    }

    return {
        dateStr: dateStr,
        waku: waku,
        num: num,
        name: horseName,
        jockey: jockey,
        odds: odds,
        finishPos: rowIdx + 1
    };
}

// --------------------------------------------------
// 3. メインデータ検索・解凍・描画関数
// --------------------------------------------------
function loadAndUnzipJraDatabase() {
    alert("➔ [1/7] [ボタン押下成功] 正常にプログラムが作動しました！");

    var rawDate = findDomValue(["sim-date", "sim_date", "date", "race-date", "race_date"]);
    var rawVenue = findDomValue(["sim-venue", "sim_venue", "venue", "race-venue", "race_venue"]);
    var rawRace = findDomValue(["sim-race", "sim_race", "race", "race-num", "race_num"]);
    var btn = findDomElement(["predict-btn", "predict_btn", "btn-predict", "submit-btn"]);
    var tbody = findDomElement(["predict-tbody", "predict_tbody", "result-tbody", "tbody"]);

    if (!rawDate) {
        alert("❌ 日付を選択してください（日付入力フォームが見つかりません）");
        return;
    }

    var cG = normalizeDate(rawDate);
    var tVenue = resolveVenueInfo(rawVenue);
    var cR = normalizeRaceNum(rawRace);

    if (btn) btn.innerText = "⚡ データ照合中...";

    var generated_search_id = "日付:" + cG + " | 競馬場:" + (tVenue.name || rawVenue) + "(" + (tVenue.code || "不明") + ") | レース:" + cR + "R";

    var target_zip_url = "racedata.zip";

    fetch(target_zip_url, { method: "GET", cache: "no-cache" })
        .then(function(response) {
            if (!response.ok) {
                alert("❌ 警告: サーバー上に 'racedata.zip' が見つかりません。");
                throw new Error("ZIPファイル取得失敗");
            }
            return response.arrayBuffer();
        })
        .then(async function(buffer) {
            if (typeof JSZip === "undefined") {
                alert("❌ エラー: JSZipライブラリが読み込まれていません。");
                if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
                return;
            }

            var zip = await JSZip.loadAsync(buffer);
            var file = null;

            zip.forEach(function (relativePath, zipEntry) {
                if (relativePath.toLowerCase().indexOf(".txt") !== -1 && !file) {
                    file = zipEntry;
                }
            });

            if (!file) {
                alert("❌ 警告: ZIPフォルダの中にテキストファイル(.txt)が見つかりません。");
                if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行"; 
                return;
            }

            var textBuffer = await file.async("arraybuffer");
            var decoder = new TextDecoder("shift_jis");
            var text = decoder.decode(textBuffer);
            var allLines = text.split("\n");

            var matched_horses = [];
            var validRowCounter = 0;

            for (var i = 0; i < allLines.length; i++) {
                var line = allLines[i].trim();
                if (!line) continue;

                var parsed = parseRowBulletproof(line, validRowCounter);
                if (!parsed) continue;

                // 日付・会場・レース番号の照合
                var lineDate = parsed.dateStr ? (parsed.dateStr.length === 6 ? "20" + parsed.dateStr : parsed.dateStr) : "";
                var dateMatch = (!lineDate || lineDate === cG || lineDate.substring(0, 8) === cG || lineDate === cG.substring(2));

                var venueMatch = (
                    line.indexOf(tVenue.name) !== -1 || 
                    (tVenue.short && line.indexOf(tVenue.short) !== -1) || 
                    (tVenue.code && line.indexOf(tVenue.code) !== -1) ||
                    !tVenue.name
                );

                var raceMatch = (
                    line.indexOf(cR + "R") !== -1 || 
                    line.indexOf(" " + cR + " ") !== -1 || 
                    line.indexOf("第" + cR) !== -1 ||
                    (cR === 11 && (line.indexOf("G1") !== -1 || line.indexOf("G2") !== -1 || line.indexOf("G3") !== -1)) ||
                    allLines.length <= 30
                );

                if (dateMatch && venueMatch && raceMatch) {
                    matched_horses.push(parsed);
                    validRowCounter++;
                }
            }

            if (matched_horses.length === 0) {
                alert("❌ 【照合不一致エラー】 該当する馬データが見つかりませんでした。");
                if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行"; 
                return;
            }

            // 馬番順にソートして並べ替え
            matched_horses.sort(function(a, b) { return a.num - b.num; });

            // 画面描画 (6列構成)
            var html = "";
            for (var j = 0; j < matched_horses.length; j++) {
                var h = matched_horses[j];
                var sig = "-";
                if (h.odds > 0 && h.odds <= 3.5) { 
                    sig = "<span style=\"color:#dc2626;font-weight:bold;\">◎ 本命</span>"; 
                }
                var odds_disp = (h.odds > 0) ? h.odds + "倍" : "未確定";
                var finish_disp = h.finishPos ? h.finishPos + "着" : "未確定";

                // 6列セル (枠-馬 / AI推奨印 / 競走馬名 / 騎手 / オッズ / 確定着順)
                html += "<tr>" +
                        "<td>" + h.waku + "枠" + h.num + "番</td>" +
                        "<td>" + sig + "</td>" +
                        "<td><b>" + h.name + "</b></td>" +
                        "<td>" + h.jockey + "</td>" +
                        "<td>" + odds_disp + "</td>" +
                        "<td>" + finish_disp + "</td>" +
                        "</tr>";
            }

            if (tbody) tbody.innerHTML = html;
            alert("🏆 【完全復旧完了】 出馬表 " + matched_horses.length + "頭の表示に成功しました！");
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        })
        .catch(function(err) {
            alert("❌ 処理クラッシュ停止:\n" + err.message);
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        });
}
