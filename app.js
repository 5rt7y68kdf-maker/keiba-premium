// 🌪️【KUINA RACING ANALYTICS - 完全決定版 app.js】

function resolveVenueName(v) {
    if (!v) return "";
    var raw = v.toString().replace(/競馬場/g, "").replace(/\s+/g, "").trim();
    var map = {
        "札幌": "札幌", "函館": "函館", "福島": "福島", "新潟": "新潟",
        "東京": "東京", "中山": "中山", "中京": "中京", "京都": "京都",
        "阪神": "阪神", "小倉": "小倉",
        "01": "札幌", "02": "函館", "03": "福島", "04": "新潟",
        "05": "東京", "06": "中山", "07": "中京", "08": "京都",
        "09": "阪神", "10": "小倉",
        "札": "札幌", "函": "函館", "福": "福島", "新": "新潟",
        "東": "東京", "中": "中山", "京": "中京", "都": "京都",
        "阪": "阪神", "小": "小倉"
    };
    if (map[raw]) return map[raw];
    for (var k in map) {
        if (raw.indexOf(k) !== -1) return map[k];
    }
    return raw;
}

function getDomValue(idList) {
    for (var i = 0; i < idList.length; i++) {
        var el = document.getElementById(idList[i]);
        if (el && el.value !== undefined && el.value !== "") return el.value;
    }
    return "";
}

function loadAndUnzipJraDatabase() {
    // 🟥 【追跡1】ボタン押下チェック
    alert("➔ [1/7] [ボタン押下成功] 正常にプログラムの1行目が作動しました！");

    var rawDate = getDomValue(["sim-date", "sim_date", "date", "race-date"]);
    var rawVenue = getDomValue(["sim-venue", "sim_venue", "venue", "race-venue"]);
    var rawRace = getDomValue(["sim-race", "sim_race", "race", "race-num"]);

    if (!rawDate) {
        alert("❌ 日付を選択してください（日付入力フォームが見つかりません）");
        return;
    }

    var cG = rawDate.replace(/-/g, "").replace(/\//g, "").trim();
    if (cG.length === 6) cG = "20" + cG;

    var cV = resolveVenueName(rawVenue);
    var cR_num = parseInt(rawRace.replace(/[^0-9]/g, ""), 10) || 11;
    var cR = cR_num + "R";

    var btn = document.getElementById("predict-btn") || document.querySelector("button");
    if (btn) btn.innerText = "⚡ 精密デバッグ検証中...";

    var generated_search_id = "日付:" + cG + " | 競馬場:" + cV + " | レース番号:" + cR;
    alert("📋 [デバッグ表示：画面から入力された検索対象ID]\n" +
          "-----------------------------------------\n" +
          "■ 入力された日付 (cG): " + cG + "\n" +
          "■ 入力された競馬場 (cV): " + cV + "\n" +
          "■ 入力されたレース番号 (cR): " + cR + "\n" +
          "■ プログラムが生成した【検索対象レースID】:\n" +
          "   ➔ 「" + generated_search_id + "」");

    // 🚀 【追跡2】CSV取得通信（fetch）の開始
    var target_csv_url = "2025-2026.csv";
    alert("➔ [2/7] [API到達成功] これより同じ部屋にある '" + target_csv_url + "' へ通信(fetch)を開始します。");

    fetch(target_csv_url, { method: "GET", cache: "no-cache" })
        .then(function(response) {
            alert("➔ [3/7] [検索開始成功] サーバーから電波が戻りました！\n■ 通信成功フラグ(ok): " + response.ok + "\n■ HTTPステータス: " + response.status);
            if (!response.ok) {
                alert("❌ 警告: サーバー上に '2025-2026.csv' が見つかりません。");
                throw new Error("CSVファイル取得失敗 (HTTP " + response.status + ")");
            }
            return response.arrayBuffer();
        })
        .then(function(buffer) {
            alert("➔ [4/7] [CSV読み込み開始] 成功！\nこれより、Shift-JIS/UTF-8デコード処理を行います。");

            var decoder = new TextDecoder("shift_jis");
            var text = decoder.decode(buffer);

            if (text.indexOf("日付") === -1 && text.indexOf("枠") === -1) {
                var utfDecoder = new TextDecoder("utf-8");
                text = utfDecoder.decode(buffer);
            }

            var allLines = text.split(/\r?\n/);
            alert("➔ [翻訳成功] デコード処理を通過しました！\nデータ行数: " + allLines.length + "行。\nこれより条件のガチ比較を行います。");

            var matched_horses = [];
            var debug_log_count = 0;

            for (var i = 0; i < allLines.length; i++) {
                var line = allLines[i].trim();
                if (!line) continue;

                var d = line.split(/[\s,\t|]+/).map(function(t) { return t.trim(); }).filter(Boolean);
                if (d.length < 5) continue;
                if (d.indexOf("日付") !== -1 || d.indexOf("date") !== -1) continue;

                try {
                    var raw_file_date = d[0].toString();
                    var file_date = raw_file_date.replace(/-/g, "").replace(/\//g, "").trim();
                    if (file_date.length === 6) file_date = "20" + file_date;

                    var raw_file_venue = d[1] ? d[1].toString().trim() : "";
                    var file_venue = resolveVenueName(raw_file_venue);

                    var raw_file_race = d[2] ? d[2].toString().toUpperCase().replace(/R/g, "").trim() : "";
                    var file_race_num = parseInt(raw_file_race, 10) || 0;
                    var file_race = file_race_num > 0 ? file_race_num + "R" : "";

                    var current_row_extracted_id = "日付:" + file_date + " | 競馬場:" + file_venue + " | レース番号:" + file_race;

                    if (debug_log_count < 3) {
                        debug_log_count++;
                        var isMatch = (file_date === cG && file_venue === cV && (file_race === cR || file_race_num === cR_num));
                        alert("🔍 [デバッグ表示：比較直前の値ガチ検証ログ (" + debug_log_count + "/3行目)]\n" +
                              "-----------------------------------------\n" +
                              "①【画面から検索しようとしている対象ID】:\n" +
                              "   ➔ 「" + generated_search_id + "」\n" +
                              "②【CSV内データから抽出したID】:\n" +
                              "   ➔ 「" + current_row_extracted_id + "」\n\n" +
                              "■ 判定結果: " + (isMatch ? "⭕ 一致！" : "❌ 不一致"));
                    }

                    if (file_date === cG && file_venue === cV && (file_race === cR || file_race_num === cR_num)) {
                        var waku_clean = parseInt(d[3], 10) || 1;
                        var num_clean = parseInt(d[4], 10) || 1;
                        var name_clean = d[5] ? d[5].toString().trim() : "不明";
                        var jockey_clean = d[6] ? d[6].toString().trim() : "不明";
                        var odds_clean = d[7] ? parseFloat(d[7].toString().replace("倍", "").trim()) : 0.0;

                        matched_horses.push({
                            waku: waku_clean,
                            num: num_clean,
                            name: name_clean,
                            jockey: jockey_clean,
                            odds: odds_clean
                        });
                    }
                } catch (e) { continue; }
            }

            alert("➔ [6/7] [検索結果取得成功] \nデータベースからのスキャンが完了しました。\n■ 一致した競走馬の数: " + matched_horses.length + "頭");

            if (matched_horses.length === 0) {
                alert("❌ 【デバッグ停止：データ不一致エラー】\n" +
                      "-----------------------------------------\n" +
                      "■ サーバー内の全 " + allLines.length + " 行を走査しましたが、一致する馬データが0件でした。\n\n" +
                      "■ あなたが最後に検索を試みたID:\n" +
                      "   ➔ 「" + generated_search_id + "」\n\n" +
                      "💡【原因特定の鍵】:\nさきほど画面に3回飛び出してきた『②CSV内データから抽出したID』の文字の並び（スペースの有無、Rの文字、競馬場名の表記の違いなど）と、画面で選択したIDの違いを教えてください！");
                if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
                return;
            }

            matched_horses.sort(function(a, b) { return a.num - b.num; });

            alert("➔ [7/7] [画面へ返却成功] 今からテーブルに出馬表を描き出します！");

            var html = "";
            for (var j = 0; j < matched_horses.length; j++) {
                var h = matched_horses[j];
                var sig = "-";
                if (parseFloat(h.odds) > 0 && parseFloat(h.odds) <= 3.5) {
                    sig = "<span style='color:#dc2626;font-weight:bold;'>◎ 本命</span>";
                }
                var odds_str = h.odds > 0 ? h.odds + "倍" : "未確定";
                html += "<tr><td>" + h.waku + "枠" + h.num + "番</td><td>" + sig + "</td><td><b>" + h.name + "</b></td><td>" + h.jockey + "</td><td>" + odds_str + "</td></tr>";
            }

            var tbody = document.getElementById("predict-tbody") || document.querySelector("tbody");
            if (tbody) tbody.innerHTML = html;

            alert("🏆 [完全大開通達成！！] すべての工程が1ミリのエラーもなく100%完全に通過しました！！JRA全頭出馬表の大出現です！！！");
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        })
        .catch(function(err) {
            alert("❌ 警告: 処理の途中でプログラムがクラッシュして停止しました。\n■ 原因エラー: " + err.message);
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        });
}
