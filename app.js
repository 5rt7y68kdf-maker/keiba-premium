// 🌪️【KUINA RACING ANALYTICS - 完全復元 ＆ デバッグ実況追跡100%搭載版 app.js】

var VENUE_MAP = {
    "札幌": "01", "函館": "02", "福島": "03", "新潟": "04",
    "東京": "05", "中山": "06", "中京": "07", "京都": "08",
    "阪神": "09", "小倉": "10",
    "01": "札幌", "02": "函館", "03": "福島", "04": "新潟",
    "05": "東京", "06": "中山", "07": "中京", "08": "京都",
    "09": "阪神", "10": "小倉",
    "東": "東京", "中": "中山", "阪": "阪神", "京": "京都", "福": "福島", "新": "新潟", "札": "札幌", "函": "函馆", "小": "小倉"
};

function normalizeVenue(v) {
    if (!v) return "";
    var s = v.toString().replace(/競馬場/g, "").trim();
    if (VENUE_MAP[s] && isNaN(s)) return s;
    if (VENUE_MAP[s] && !isNaN(s)) return VENUE_MAP[s];
    return s;
}

function matchVenue(v1, v2) {
    if (!v1 || !v2) return true;
    var n1 = v1.toString().replace(/競馬場/g, "").trim();
    var n2 = v2.toString().replace(/競馬場/g, "").trim();
    if (n1 === n2) return true;
    if (VENUE_MAP[n1] && VENUE_MAP[n1] === n2) return true;
    if (VENUE_MAP[n2] && VENUE_MAP[n2] === n1) return true;
    if (VENUE_MAP[n1] && VENUE_MAP[n2] && VENUE_MAP[n1] === VENUE_MAP[n2]) return true;
    return false;
}

function normalizeRace(r) {
    if (!r) return "";
    var m = r.toString().match(/\d+/);
    return m ? m[0] + "R" : "";
}

function getDomValue(idList, defaultVal) {
    if (typeof document === "undefined") return defaultVal || "";
    for (var i = 0; i < idList.length; i++) {
        var el = document.getElementById(idList[i]);
        if (el && el.value !== undefined && el.value !== "") {
            return el.value;
        }
    }
    return defaultVal || "";
}

function loadAndUnzipJraDatabase() {
    // 🟥 【追跡1】ボタン押下チェック
    alert("➔ [1/7] [ボタン押下成功] 正常にプログラムの1行目が作動しました！");

    var rawDate = getDomValue(["sim-date", "date", "race-date"], "");
    if (!rawDate) { alert("❌ 日付を選択してください"); return; }

    var cG = rawDate.replace(/-/g, "").replace(/\//g, "").trim();
    if (cG.length === 6) cG = "20" + cG;

    var cV = getDomValue(["sim-venue", "venue"], "東京");
    var cR_raw = getDomValue(["sim-race", "race"], "1R");
    var cR = normalizeRace(cR_raw);

    var btn = document.getElementById("predict-btn");
    if (btn) btn.innerText = "⚡ 精密デバッグ検証中...";

    // 🛑【デバッグ表示】入力された検索対象レースID
    var generated_search_id = "日付:" + cG + " | 競馬場:" + cV + " | レース番号:" + cR;
    alert("📋 [デバッグ表示：画面から入力された検索対象ID]\n" +
          "-----------------------------------------\n" +
          "■ 入力された日付 (cG): " + cG + "\n" +
          "■ 入力された競馬場 (cV): " + cV + "\n" +
          "■ 入力されたレース番号 (cR): " + cR + "\n" +
          "■ プログラムが生成した【検索対象レースID】:\n" +
          "   ➔ 「" + generated_search_id + "」");

    // 🚀 【追跡2】CSV取得通信（fetch）の開始
    var target_csv_urls = ["2025-2026.csv", "2025-2026.CSV", "racedata.csv", "DG" + cG.substring(2) + ".CSV"];
    alert("➔ [2/7] [API到達成功] これより最優先ファイル '" + target_csv_urls[0] + "' へ通信(fetch)を開始します。");

    tryFetchCsvList(target_csv_urls, 0, function(err, response, successUrl) {
        if (err || !response) {
            alert("❌ 警告: サーバー上に CSVファイル ('2025-2026.csv') が見つかりません。");
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
            return;
        }

        // 🟥 【追跡3】通信応答チェック
        alert("➔ [3/7] [検索開始成功] サーバーから電波が戻りました！\n■ 対象ファイル: " + successUrl + "\n■ 通信成功(ok): " + response.ok + "\n■ HTTPステータス: " + response.status);

        response.arrayBuffer().then(function(buffer) {
            // 🟥 【追跡4】データ読み込みチェック
            alert("➔ [4/7] [データ読込開始] 成功！\n取得サイズ: " + buffer.byteLength + " bytes。これよりデコード（Shift-JIS / UTF-8）を行います。");

            var decoderShiftJis = new TextDecoder("shift_jis");
            var text = decoderShiftJis.decode(buffer);
            if (text.indexOf("\uFFFD") !== -1 && text.indexOf("202") === -1) {
                var decoderUtf8 = new TextDecoder("utf-8");
                text = decoderUtf8.decode(buffer);
            }

            var allLines = text.replace(/\r/g, "").split("\n");
            alert("➔ [解読成功] デコード処理を通過しました！\nデータ行数: " + allLines.length + "行。\nこれより条件のガチ比較を行います。");

            // 🟥 【追跡5】検索実行（比較・フィルタリング）
            alert("➔ [5/7] [検索実行] 成功！これより画面入力条件とCSVデータをマッチングします。");

            var matched_horses = [];
            var debug_log_count = 0;

            for (var i = 0; i < allLines.length; i++) {
                var line = allLines[i].trim();
                if (!line) continue;

                var parsed = parseCsvRow(line);
                if (!parsed) continue;

                var file_date = parsed.file_date;
                var file_venue = parsed.file_venue;
                var file_race = normalizeRace(parsed.file_race);

                if (!file_date) file_date = cG;
                if (!file_venue) file_venue = cV;

                var current_row_extracted_id = "日付:" + file_date + " | 競馬場:" + file_venue + " | レース番号:" + file_race;

                // 🛑【デバッグログ】最初の3件の比較検証
                if (debug_log_count < 3) {
                    debug_log_count++;
                    var isDateMatch = (!file_date || file_date === cG);
                    var isVenueMatch = matchVenue(file_venue, cV);
                    var isRaceMatch = (!file_race || normalizeRace(file_race) === cR);
                    var isMatch = isDateMatch && isVenueMatch && isRaceMatch;

                    alert("🔍 [デバッグ表示：比較直前の値ガチ検証ログ (" + debug_log_count + "/3行目)]\n" +
                          "-----------------------------------------\n" +
                          "①【画面から検索しようとしている対象ID】:\n" +
                          "   ➔ 「" + generated_search_id + "」\n" +
                          "②【CSVテキストから抽出したID】:\n" +
                          "   ➔ 「" + current_row_extracted_id + "」\n\n" +
                          "■ 判定結果: " + (isMatch ? "⭕ 一致！" : "❌ 不一致"));
                }

                var isDateMatch = (!file_date || file_date === cG);
                var isVenueMatch = matchVenue(file_venue, cV);
                var isRaceMatch = (!file_race || normalizeRace(file_race) === cR);

                if (isDateMatch && isVenueMatch && isRaceMatch && parsed.name) {
                    matched_horses.push(parsed);
                }
            }

            // 🟥 【追跡6】検索結果取得チェック
            alert("➔ [6/7] [検索結果取得成功] \nデータベースからのスキャンが完了しました。\n■ 一致した競走馬の数: " + matched_horses.length + "頭");

            if (matched_horses.length === 0) {
                alert("❌ 【デバッグ停止：データ不一致エラー】\n" +
                      "-----------------------------------------\n" +
                      "■ CSV内の全 " + allLines.length + " 行を走査しましたが、一致する馬データが0件でした。\n\n" +
                      "■ あなたが最後に検索を試みたID:\n" +
                      "   ➔ 「" + generated_search_id + "」\n\n" +
                      "💡 日付・競馬場・レース番号の条件をご確認ください。");
                if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
                return;
            }

            matched_horses.sort(function(a, b) { return a.num - b.num; });

            // 🟥 【追跡7】画面へ返却チェック
            alert("➔ [7/7] [画面へ返却成功] 今からテーブルに出馬表を描き出します！");

            var html = "";
            for (var j = 0; j < matched_horses.length; j++) {
                var h = matched_horses[j];
                var sig = "-";
                if (h.odds > 0 && h.odds <= 3.5) {
                    sig = "<span class='badge-win'>◎ 本命</span>";
                } else if (h.odds > 3.5 && h.odds <= 7.0) {
                    sig = "<span class='badge-place'>〇 対抗</span>";
                }
                var oddsStr = (h.odds > 0) ? h.odds.toFixed(1) + "倍" : "未確定";
                html += "<tr>" +
                        "<td>" + h.waku + "枠" + h.num + "番</td>" +
                        "<td>" + sig + "</td>" +
                        "<td><b>" + h.name + "</b></td>" +
                        "<td>" + h.jockey + "</td>" +
                        "<td>" + (h.trainer || "-") + "</td>" +
                        "<td>" + oddsStr + "</td>" +
                        "</tr>";
            }

            var tbody = document.getElementById("predict-tbody");
            if (tbody) {
                tbody.innerHTML = html;
            } else {
                var container = document.querySelector(".container") || document.body;
                var tableDiv = document.getElementById("kuina-table-wrap");
                if (!tableDiv) {
                    tableDiv = document.createElement("div");
                    tableDiv.id = "kuina-table-wrap";
                    tableDiv.className = "prediction-box";
                    container.appendChild(tableDiv);
                }
                tableDiv.innerHTML = "<h3>🐎 " + cV + " " + cR + " 出馬表 (全" + matched_horses.length + "頭)</h3>" +
                    "<table><thead><tr><th>枠-馬</th><th>AI印</th><th>馬名</th><th>騎手</th><th>調教師</th><th>オッズ</th></tr></thead>" +
                    "<tbody>" + html + "</tbody></table>";
            }

            alert("🏆 [完全大開通達成！！] すべての工程が1ミリのエラーもなく100%完全に通過しました！！JRA全頭出馬表の大出現です！！！");
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        }).catch(function(err) {
            alert("❌ 警告: 処理の途中でプログラムがクラッシュして停止しました。\n■ 原因エラー: " + err.message);
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        });
    });
}

function tryFetchCsvList(urls, idx, callback) {
    if (idx >= urls.length) {
        callback(new Error("No CSV files found"), null, null);
        return;
    }
    var url = urls[idx];
    fetch(url, { method: "GET", cache: "no-cache" })
        .then(function(res) {
            if (res.ok) {
                callback(null, res, url);
            } else {
                tryFetchCsvList(urls, idx + 1, callback);
            }
        })
        .catch(function() {
            tryFetchCsvList(urls, idx + 1, callback);
        });
}

function parseCsvRow(line) {
    if (!line || !line.trim()) return null;
    var raw = line.trim();
    var tokens = raw.includes(",")
        ? raw.split(",").map(function(t) { return t.trim(); })
        : raw.split(/\s+/).map(function(t) { return t.trim(); });

    tokens = tokens.filter(function(t) { return t !== ""; });
    if (tokens.length < 4) return null;
    if (tokens.indexOf("日付") !== -1 || tokens.indexOf("枠") !== -1 || tokens.indexOf("馬名") !== -1) return null;

    var file_date = "", file_venue = "", file_race = "";
    var waku = 1, num = 1, name = "", sex_age = "", jockey = "", kinryo = "", odds = 0.0, trainer = "";

    if (/^\d{6,8}$/.test(tokens[0]) || /^\d{4}[/-]\d{2}[/-]\d{2}$/.test(tokens[0])) {
        file_date = tokens[0].replace(/[-/]/g, "");
        if (file_date.length === 6) file_date = "20" + file_date;
        file_venue = tokens[1] || "";
        file_race = tokens[2] || "";
        waku = parseInt(tokens[3], 10) || 1;
        num = parseInt(tokens[4], 10) || 1;
        name = tokens[5] || "";

        if (tokens.length >= 8) {
            sex_age = tokens[6] || "";
            jockey = tokens[7] || "";
            if (tokens.length >= 10) {
                kinryo = tokens[8] || "";
                odds = parseFloat(tokens[9]) || 0.0;
                if (tokens[10] && tokens[11]) {
                    trainer = tokens[10] + " " + tokens[11];
                } else if (tokens[10]) {
                    trainer = tokens[10];
                }
            }
        }
    } else {
        waku = parseInt(tokens[0], 10) || 1;
        num = parseInt(tokens[2], 10) || parseInt(tokens[1], 10) || 1;
        for (var i = 0; i < tokens.length; i++) {
            if (/^[ァ-ヶー・]{2,9}$/.test(tokens[i])) {
                name = tokens[i];
                if (i + 1 < tokens.length && !/^\d+/.test(tokens[i+1])) jockey = tokens[i+1];
                break;
            }
        }
        for (var i = 0; i < tokens.length; i++) {
            if (/^\d+\.\d+$/.test(tokens[i])) odds = parseFloat(tokens[i]);
            if (/\(美\)|\(栗\)/.test(tokens[i])) trainer = tokens[i] + " " + (tokens[i+1] || "");
        }
    }

    if (!name) return null;
    return {
        file_date: file_date,
        file_venue: file_venue,
        file_race: file_race,
        waku: waku,
        num: num,
        name: name,
        sex_age: sex_age,
        jockey: jockey,
        kinryo: kinryo,
        odds: odds,
        trainer: trainer
    };
}

if (typeof window !== "undefined") {
    window.addEventListener("DOMContentLoaded", function() {
        var btn = document.getElementById("predict-btn");
        if (btn) {
            btn.onclick = loadAndUnzipJraDatabase;
        }
    });
}
