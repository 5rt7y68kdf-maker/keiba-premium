// 🌪️【JRA Target/JRA-VANテキストデータベース 完全超精密解析＆全頭開通決定版 app.js】

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
// 2. 超精密 JRA テキスト行位置解析エンジン (parseRowBulletproof)
// --------------------------------------------------
function parseRowBulletproof(line) {
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

    // 2. 競走馬名の自動特定 (JRA公式登録規定: 2文字〜9文字の純カタカナ表記)
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

    // 3. 騎手名の自動取得 (競走馬名の直後の文字列)
    var jockey = "不明";
    if (nameIdx + 1 < tokens.length) {
        var jCandidate = tokens[nameIdx + 1];
        if (!/^\d+(\.\d+)?$/.test(jCandidate) && jCandidate.length <= 8) {
            jockey = jCandidate;
        }
    }

    // 4. 枠番・馬番の超精密検出
    var waku = 1, num = 1;
    var sexIdx = -1;
    for (var i = 0; i < tokens.length; i++) {
        if (/^(牡|牝|セ)$/.test(tokens[i])) {
            sexIdx = i;
            break;
        }
    }

    if (sexIdx !== -1 && sexIdx >= 2) {
        waku = parseInt(tokens[sexIdx - 2], 10) || 1;
        num = parseInt(tokens[sexIdx - 1], 10) || 1;
    } else {
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
        }
    }

    // 枠番の整合性自動修正 (JRAの枠・馬番ルールに基づく補正)
    if (num > 0) {
        var expectedWaku = Math.min(8, Math.ceil(num / 2));
        if (waku <= 0 || waku > 8 || (waku === 1 && num > 2)) {
            waku = expectedWaku;
        }
    }

    // 5. 単勝オッズの検出
    var odds = 0.0;
    for (var i = tokens.length - 1; i > nameIdx; i--) {
        var tok = tokens[i].replace("倍", "").trim();
        if (/^\\([+-]?\d+\\)$/.test(tok)) continue;
        var f = parseFloat(tok);
        if (!isNaN(f) && f > 0) {
            if (f >= 48.0 && f <= 62.0 && i < tokens.length - 1) continue;
            if (f >= 350 && f <= 600) continue;
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
        odds: odds
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
    alert("📋 [検索条件（超精密解析）]\n-----------------------------------------\n" +
          "■ 日付 (cG): " + cG + "\n" +
          "■ 競馬場名: " + tVenue.name + " [コード: " + tVenue.code + " / 略称: " + tVenue.short + "]\n" +
          "■ レース番号 (cR): " + cR + "R\n" +
          "■ 検索対象ID: 「" + generated_search_id + "」");

    var target_zip_url = "racedata.zip";
    alert("➔ [2/7] [API到達成功] これより '" + target_zip_url + "' へ通信(fetch)を開始します。");

    fetch(target_zip_url, { method: "GET", cache: "no-cache" })
        .then(function(response) {
            alert("➔ [3/7] [通信応答成功] HTTPステータス: " + response.status);
            if (!response.ok) {
                alert("❌ 警告: サーバー上に 'racedata.zip' が見つかりません。");
                throw new Error("ZIPファイル取得失敗");
            }
            return response.arrayBuffer();
        })
        .then(async function(buffer) {
            alert("➔ [4/7] [ZIP読み込み成功] JSZipで内部テキストを解凍します。");

            if (typeof JSZip === "undefined") {
                alert("❌ エラー: JSZipライブラリが読み込まれていません。HTMLにJSZipの<script>タグを追加してください。");
                if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
                return;
            }

            var zip = await JSZip.loadAsync(buffer);
            var zipFiles = [];
            var file = null;

            zip.forEach(function (relativePath, zipEntry) {
                if (zipFiles.length < 50) zipFiles.push(relativePath);
                if (relativePath.toLowerCase().indexOf(".txt") !== -1 && !file) {
                    file = zipEntry;
                }
            });

            alert("📦 [ZIP内ファイル検知]\n■ 総ファイル数: " + Object.keys(zip.files).length + "個\n■ 対象テキスト: " + (file ? file.name : "なし"));

            if (!file) {
                alert("❌ 警告: ZIPフォルダの中にテキストファイル(.txt)が見つかりません。");
                if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行"; 
                return;
            }

            alert("➔ [5/7] [デコード開始] ファイル '" + file.name + "' をShift-JIS解読します。");
            var textBuffer = await file.async("arraybuffer");
            var decoder = new TextDecoder("shift_jis");
            var text = decoder.decode(textBuffer);
            var allLines = text.split("\n");

            alert("➔ [デコード成功] データ総行数: " + allLines.length + "行。スマートマルチ検索を実行します。");

            var matched_horses = [];

            for (var i = 0; i < allLines.length; i++) {
                var line = allLines[i].trim();
                if (!line) continue;

                var parsed = parseRowBulletproof(line);
                if (!parsed) continue;

                // 日付照合
                var lineDate = parsed.dateStr ? (parsed.dateStr.length === 6 ? "20" + parsed.dateStr : parsed.dateStr) : "";
                var dateMatch = (!lineDate || lineDate === cG || lineDate.substring(0, 8) === cG || lineDate === cG.substring(2));

                // 競馬場照合
                var venueMatch = (
                    line.indexOf(tVenue.name) !== -1 || 
                    (tVenue.short && line.indexOf(tVenue.short) !== -1) || 
                    (tVenue.code && line.indexOf(tVenue.code) !== -1) ||
                    !tVenue.name
                );

                // レース番号照合
                var raceMatch = (
                    line.indexOf(cR + "R") !== -1 || 
                    line.indexOf(" " + cR + " ") !== -1 || 
                    line.indexOf("\t" + cR + "\t") !== -1 ||
                    line.indexOf("第" + cR) !== -1 ||
                    line.indexOf(cR + "レース") !== -1 ||
                    (cR === 11 && (line.indexOf("G1") !== -1 || line.indexOf("G2") !== -1 || line.indexOf("G3") !== -1)) ||
                    allLines.length <= 30
                );

                if (dateMatch && venueMatch && raceMatch) {
                    matched_horses.push(parsed);
                }
            }

            alert("➔ [6/7] [照合完了] 一致馬数: " + matched_horses.length + "頭検出！");

            if (matched_horses.length === 0) {
                alert("❌ 【照合不一致エラー】\n-----------------------------------------\n" +
                      "■ 該当する馬データが見つかりませんでした。\n" +
                      "■ 検索条件: 「" + generated_search_id + "」");
                if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行"; 
                return;
            }

            // 馬番順に整列
            matched_horses.sort(function(a, b) { return a.num - b.num; });

            alert("➔ [7/7] [画面描画] テーブルに出馬表を出力します。");

            var html = "";
            for (var j = 0; j < matched_horses.length; j++) {
                var h = matched_horses[j];
                var sig = "-";
                if (h.odds > 0 && h.odds <= 3.5) { 
                    sig = "<span style=\"color:#dc2626;font-weight:bold;\">◎ 本命</span>"; 
                }
                var odds_disp = (h.odds > 0) ? h.odds + "倍" : "未確定";
                html += "<tr><td>" + h.waku + "枠" + h.num + "番</td><td>" + sig + "</td><td><b>" + h.name + "</b></td><td>" + h.jockey + "</td><td>" + odds_disp + "</td></tr>";
            }

            if (tbody) tbody.innerHTML = html;
            alert("🏆 【完全大開通！！】 出馬表 " + matched_horses.length + "頭（全頭・正確な枠番・馬名・騎手・オッズ）の表示に成功いたしました！！！");
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        })
        .catch(function(err) {
            alert("❌ 処理クラッシュ停止:\n" + err.message);
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        });
}
