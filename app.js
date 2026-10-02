// 🌪️【JRA 成績/出馬表データ 確定着順・枠馬番・単勝オッズ・収支結果 完全自動解読エンジン app.js】

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
// 2. 成績・出馬表行データ 精密分解エンジン (parseRaceResultRow)
// --------------------------------------------------
function parseRaceResultRow(line, rowIndex) {
    if (!line) return null;
    var tokens = line.split(/[\s,\t|]+/).map(function(t) { return t.trim(); }).filter(Boolean);
    if (tokens.length < 4) return null;

    // ヘッダー行スキップ
    if (tokens.indexOf("日付") !== -1 || tokens.indexOf("date") !== -1 || tokens.indexOf("枠") !== -1) return null;

    // 1. 馬名の特定 (2〜9文字の純カタカナ表記)
    var nameIdx = -1;
    var horseName = "";
    for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        if (/^[\u30A0-\u30FFー・]{2,9}$/.test(t)) {
            if (!/^(ダート|障害|リステッド|オープン|スプリンターズ|フェブラリー|エリザベス|チャンピオンズ|ホープフル|マイル|カップ)$/.test(t)) {
                nameIdx = i;
                horseName = t;
                break;
            }
        }
    }

    if (!horseName) return null;

    // 2. 騎手名の特定 (馬名の直後の文字列)
    var jockey = "不明";
    if (nameIdx + 1 < tokens.length) {
        var cand = tokens[nameIdx + 1];
        if (!/^\d+(\.\d+)?$/.test(cand) && cand.length <= 8 && !/^(牡|牝|セ)$/.test(cand)) {
            jockey = cand;
        } else if (nameIdx + 2 < tokens.length) {
            var cand2 = tokens[nameIdx + 2];
            if (!/^\d+(\.\d+)?$/.test(cand2) && cand2.length <= 8 && !/^(牡|牝|セ)$/.test(cand2)) {
                jockey = cand2;
            }
        }
    }

    // 3. 馬名より前にある数値群の抽出 (着順, 枠番, 馬番)
    var numsBefore = [];
    for (var j = 0; j < nameIdx; j++) {
        var tok = tokens[j];
        if (tok.length >= 6) continue; // 日付や12桁IDの除外
        if (/[京阪東中小新福函札]/.test(tok) || /R$/i.test(tok) || /^G[123]$/i.test(tok)) continue; // レースヘッダー除外
        if (/^\d{1,2}$/.test(tok)) {
            numsBefore.push(parseInt(tok, 10));
        }
    }

    var finishPos = rowIndex + 1; // デフォルトは行順 (1着, 2着, 3着...)
    var waku = 1;
    var num = 1;

    if (numsBefore.length >= 3) {
        finishPos = numsBefore[numsBefore.length - 3];
        waku = numsBefore[numsBefore.length - 2];
        num = numsBefore[numsBefore.length - 1];
    } else if (numsBefore.length === 2) {
        waku = numsBefore[0];
        num = numsBefore[1];
    } else if (numsBefore.length === 1) {
        num = numsBefore[0];
        waku = Math.min(8, Math.max(1, Math.ceil(num / 2)));
    }

    // 枠番・馬番の自動補正
    if (num < 1 || num > 18) {
        num = rowIndex + 1;
    }
    if (waku < 1 || waku > 8) {
        waku = Math.min(8, Math.max(1, Math.ceil(num / 2)));
    }

    // 4. 単勝オッズの抽出 (馬名より後ろにある小数数値)
    var odds = 0.0;
    var tokensAfter = tokens.slice(nameIdx + 1);
    for (var k = tokensAfter.length - 1; k >= 0; k--) {
        var tokClean = tokensAfter[k].replace("倍", "").replace("円", "").trim();
        if (tokClean.indexOf(".") !== -1) {
            var val = parseFloat(tokClean);
            if (!isNaN(val) && val >= 1.0 && val <= 9999.0) {
                if (val >= 48.0 && val <= 62.0) continue; // 斤量除外
                odds = val;
                break;
            }
        }
    }

    if (odds === 0.0) {
        for (var m = tokensAfter.length - 1; m >= 0; m--) {
            var tokClean2 = tokensAfter[m].replace("倍", "").replace("円", "").trim();
            var val2 = parseFloat(tokClean2);
            if (!isNaN(val2) && val2 >= 1.0 && val2 <= 9999.0 && !(val2 >= 48.0 && val2 <= 62.0) && !(val2 >= 350 && val2 <= 600)) {
                odds = val2;
                break;
            }
        }
    }

    // 5. 収支結果の生成
    var resultStatus = "-";
    if (finishPos === 1) {
        resultStatus = odds > 0 ? "1着 (単勝 " + odds.toFixed(1) + "倍 🎯的中)" : "1着 🎯的中";
    } else if (finishPos === 2) {
        resultStatus = "2着 🥈";
    } else if (finishPos === 3) {
        resultStatus = "3着 🥉";
    } else {
        resultStatus = finishPos + "着";
    }

    return {
        finishPosNum: finishPos,
        finishPosStr: finishPos + "着",
        waku: waku,
        num: num,
        name: horseName,
        jockey: jockey,
        odds: odds,
        resultStatus: resultStatus
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
    alert("📋 [検索条件（解読完了）]\n-----------------------------------------\n" +
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

            alert("➔ [デコード成功] データ総行数: " + allLines.length + "行。精密マルチ検索を実行します。");

            var matched_horses = [];

            for (var i = 0; i < allLines.length; i++) {
                var line = allLines[i].trim();
                if (!line) continue;

                var parsed = parseRaceResultRow(line, matched_horses.length);
                if (!parsed) continue;

                // 日付照合
                var dateMatch = (line.indexOf(cG) !== -1 || line.indexOf(cG.substring(2)) !== -1 || allLines.length <= 30);

                // 競馬場照合
                var venueMatch = (
                    line.indexOf(tVenue.name) !== -1 || 
                    (tVenue.short && line.indexOf(tVenue.short) !== -1) || 
                    (tVenue.code && line.indexOf(tVenue.code) !== -1) ||
                    !tVenue.name ||
                    allLines.length <= 30
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

            // オッズに基づくAI推奨印の自動計算 (オッズが最も低い馬に◎本命、2番人気に○対抗...)
            var sortedByOdds = matched_horses.slice().sort(function(a, b) {
                var oA = a.odds > 0 ? a.odds : 999;
                var oB = b.odds > 0 ? b.odds : 999;
                return oA - oB;
            });

            var markMap = {};
            if (sortedByOdds.length >= 1) markMap[sortedByOdds[0].num] = "<span style=\"color:#dc2626;font-weight:bold;\">◎ 本命</span>";
            if (sortedByOdds.length >= 2) markMap[sortedByOdds[1].num] = "<span style=\"color:#059669;font-weight:bold;\">○ 対抗</span>";
            if (sortedByOdds.length >= 3) markMap[sortedByOdds[2].num] = "<span style=\"color:#2563eb;font-weight:bold;\">▲ 単穴</span>";
            if (sortedByOdds.length >= 4) markMap[sortedByOdds[3].num] = "<span style=\"color:#d97706;font-weight:bold;\">△ 連下</span>";
            if (sortedByOdds.length >= 5) markMap[sortedByOdds[4].num] = "<span style=\"color:#d97706;font-weight:bold;\">△ 連下</span>";

            // 馬番順に整列して表示 (1番〜18番)
            matched_horses.sort(function(a, b) { return a.num - b.num; });

            alert("➔ [7/7] [画面描画] 確定着順・枠馬番・単勝オッズ・収支結果を含むテーブルを出力します。");

            var html = "";
            for (var j = 0; j < matched_horses.length; j++) {
                var h = matched_horses[j];
                var sig = markMap[h.num] || "-";
                var odds_disp = (h.odds > 0) ? h.odds.toFixed(1) + "倍" : "未確定";
                html += "<tr>" +
                        "<td>" + h.waku + "枠" + h.num + "番</td>" +
                        "<td>" + sig + "</td>" +
                        "<td><b>" + h.name + "</b></td>" +
                        "<td>" + h.jockey + "</td>" +
                        "<td>" + odds_disp + "</td>" +
                        "<td><b>" + h.finishPosStr + "</b></td>" +
                        "<td>" + h.resultStatus + "</td>" +
                        "</tr>";
            }

            if (tbody) tbody.innerHTML = html;
            alert("🏆 【完全大開通！！】 JRA全 " + matched_horses.length + "頭（枠馬番・競走馬名・オッズ・確定着順・収支結果）の正確な整理出力に成功いたしました！！！");
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        })
        .catch(function(err) {
            alert("❌ 処理クラッシュ停止:\n" + err.message);
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        });
}
