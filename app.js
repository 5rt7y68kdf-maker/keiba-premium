// 🌪️【JRAデータベース 超精密自動解析＆列ズレ100%解封アプリ app.js】

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
// 2. 行トークン精密解析エンジン (列ズレ・Target/JRA全フォーマット完全対応)
// --------------------------------------------------
function parseJraRowTokens(tokens) {
    if (!tokens || tokens.length < 4) return null;

    // ヘッダー行をスキップ
    if (tokens.indexOf("日付") !== -1 || tokens.indexOf("date") !== -1) return null;

    var dateStr = "";
    var dateIdx = -1;

    // Step 1: 日付トークンの検出 (8桁, 6桁, 12桁ID)
    for (var i = 0; i < tokens.length; i++) {
        if (/^\d{6}$/.test(tokens[i]) || /^\d{8}$/.test(tokens[i]) || /^\d{12}$/.test(tokens[i])) {
            dateIdx = i;
            dateStr = tokens[i];
            break;
        }
    }

    // Step 2: 枠番・馬番トークンの精密自動識別
    // (純数字 1-8 [枠番] と 1-18 [馬番] が連続する箇所を最優先検出)
    var wakuIdx = -1, numIdx = -1;
    var waku = 1, num = 1;

    for (var i = Math.max(0, dateIdx + 1); i < tokens.length - 1; i++) {
        var t1 = tokens[i];
        var t2 = tokens[i+1];
        if (/^\d{1,2}$/.test(t1) && /^\d{1,2}$/.test(t2)) {
            var v1 = parseInt(t1, 10);
            var v2 = parseInt(t2, 10);
            if (v1 >= 1 && v1 <= 8 && v2 >= 1 && v2 <= 18) {
                wakuIdx = i;
                numIdx = i + 1;
                waku = v1;
                num = v2;
                break;
            }
        }
    }

    // 馬番以降のトークン群から [性別, 年齢, 斤量, 馬体重] を排除して [馬名, 騎手, オッズ] を抽出
    var horseTokens = (numIdx !== -1) ? tokens.slice(numIdx + 1) : tokens.slice(dateIdx + 1);

    var strTokens = [];
    var oddsCandidates = [];

    for (var k = 0; k < horseTokens.length; k++) {
        var t = horseTokens[k];

        // 性別の除外
        if (/^(牡|牝|セ)$/.test(t)) continue;

        // 年齢の除外 (2〜15)
        if (/^\d{1,2}$/.test(t) && parseInt(t, 10) <= 15) continue;

        // 斤量の除外 (48.0〜62.0)
        if (/^\d{2}\.\d$/.test(t) && parseFloat(t) >= 48.0 && parseFloat(t) <= 62.0) continue;

        // 馬体重・体重増減の除外 (350〜1200, (+2), (-4) など)
        if (/^\d{3,4}$/.test(t) && parseFloat(t) >= 350 && parseFloat(t) <= 1200) continue;
        if (/^\\([+-]?\d+\\)$/.test(t)) continue;

        // オッズ候補の抽出
        var fOdds = parseFloat(t.replace("倍", ""));
        if (!isNaN(fOdds) && fOdds > 0 && fOdds < 9999 && (t.indexOf(".") !== -1 || t.indexOf("倍") !== -1 || fOdds > 1.0)) {
            oddsCandidates.push(fOdds);
            continue;
        }

        // 日本語文字列 ➔ 馬名・騎手
        if (/^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF66-\uFF9FA-Za-z0-9ー・]+$/.test(t)) {
            strTokens.push(t);
        }
    }

    var name = strTokens.length >= 1 ? strTokens[0] : "";
    var jockey = strTokens.length >= 2 ? strTokens[1] : "不明";
    var odds = oddsCandidates.length >= 1 ? oddsCandidates[oddsCandidates.length - 1] : 0.0;

    if (!name) return null;

    return {
        dateStr: dateStr,
        waku: waku,
        num: num,
        name: name,
        jockey: jockey,
        odds: odds
    };
}

// --------------------------------------------------
// 3. メインデータ検索・解凍・描画エンジン
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
    alert("📋 [検索条件（精密解析）]\n-----------------------------------------\n" +
          "■ 日付 (cG): " + cG + "\n" +
          "■ 競馬場名: " + tVenue.name + " [コード: " + tVenue.code + " / 略称: " + tVenue.short + "]\n" +
          "■ レース番号 (cR): " + cR + "R\n" +
          "■ 検索対象ID: 「" + generated_search_id + "」");

    var target_zip_url = "racedata.zip";
    alert("➔ [2/7] [API到達成功] ' " + target_zip_url + " ' へ通信(fetch)を開始します。");

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
            alert("➔ [4/7] [ZIP読み込み成功] JSZipで解凍を行います。");

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

                var tokens = line.split(/[\s,\t|]+/).map(function(item){ return item.trim(); }).filter(Boolean);
                if (tokens.length < 4) continue;

                var parsed = parseJraRowTokens(tokens);
                if (!parsed) continue;

                // 日付照合 (8桁/6桁/12桁IDの完全一致)
                var lineDate = normalizeDate(parsed.dateStr || tokens[0]);
                var dateMatch = (lineDate === cG || lineDate === cG.substring(2) || (cG.length === 8 && lineDate.substring(0, 8) === cG));

                // 競馬場照合 ("京都", "08", "京")
                var venueMatch = (
                    line.indexOf(tVenue.name) !== -1 || 
                    (tVenue.short && line.indexOf(tVenue.short) !== -1) || 
                    (tVenue.code && line.indexOf(tVenue.code) !== -1)
                );

                // レース番号照合 ("11R", "11", レース名G1など)
                var raceMatch = (
                    line.indexOf(cR + "R") !== -1 || 
                    line.indexOf(" " + cR + " ") !== -1 || 
                    line.indexOf("第" + cR) !== -1 ||
                    line.indexOf(cR + "レース") !== -1 ||
                    (cR === 11 && (line.indexOf("G1") !== -1 || line.indexOf("G2") !== -1 || line.indexOf("G3") !== -1))
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

            // 馬番順にソート
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
            alert("🏆 【完全大開通！！】 JRA全頭出馬表 (" + matched_horses.length + "頭) の正確な描画に成功いたしました！！！");
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        })
        .catch(function(err) {
            alert("❌ 処理クラッシュ停止:\n" + err.message);
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        });
}
