// 🌪️【デバッグ実況機能100%完全維持・ venue正規化超拡張完全版 app.js】

function parseVenueName(v) {
    if (!v) return "";
    var s = v.toString().trim();
    if (s.indexOf("中京") !== -1) return "中京";
    if (s.indexOf("中山") !== -1 || s.indexOf("06") !== -1) return "中山";
    if (s.indexOf("東京") !== -1 || s.indexOf("05") !== -1) return "東京";
    if (s.indexOf("阪神") !== -1 || s.indexOf("09") !== -1) return "阪神";
    if (s.indexOf("京都") !== -1 || s.indexOf("08") !== -1) return "京都";
    if (s.indexOf("新潟") !== -1 || s.indexOf("04") !== -1) return "新潟";
    if (s.indexOf("福島") !== -1 || s.indexOf("03") !== -1) return "福島";
    if (s.indexOf("小倉") !== -1 || s.indexOf("10") !== -1) return "小倉";
    if (s.indexOf("札幌") !== -1 || s.indexOf("01") !== -1) return "札幌";
    if (s.indexOf("函館") !== -1 || s.indexOf("02") !== -1) return "函館";
    
    // 1文字略称・JRA Target回次形式 ("4中9", "4東1", "3京5", "1阪2"等)
    if (s.indexOf("東") !== -1) return "東京";
    if (s.indexOf("中") !== -1) return "中山";
    if (s.indexOf("阪") !== -1) return "阪神";
    if (s.indexOf("京") !== -1) return "京都";
    if (s.indexOf("新") !== -1) return "新潟";
    if (s.indexOf("福") !== -1) return "福島";
    if (s.indexOf("札") !== -1) return "札幌";
    if (s.indexOf("函") !== -1) return "函館";
    if (s.indexOf("小") !== -1) return "小倉";
    return s;
}

function parseRaceNum(r) {
    if (!r) return "";
    var m = r.toString().match(/\d+/);
    return m ? parseInt(m[0], 10) + "R" : "";
}

function parseDateStr(d) {
    if (!d) return "";
    var nums = d.toString().match(/\d+/g);
    if (!nums) return "";
    var clean = nums.join("");
    if (clean.length === 6) clean = "20" + clean;
    return clean;
}

function loadAndUnzipJraDatabase() {
    // 🟥 【追跡1】ボタン押下チェック
    alert("➔ [1/7] [ボタン押下成功] 正常にプログラムの1行目が作動しました！");

    var elDate = document.getElementById("sim-date") || document.getElementById("date") || document.getElementById("sim_date");
    var elVenue = document.getElementById("sim-venue") || document.getElementById("venue") || document.getElementById("sim_venue");
    var elRace = document.getElementById("sim-race") || document.getElementById("race") || document.getElementById("sim_race");

    var rawDate = elDate ? elDate.value : "";
    if(!rawDate){ alert("❌ 日付を選択してください"); return; }
    
    var cG = parseDateStr(rawDate);
    var rawV = elVenue ? elVenue.value : "";
    var cV = parseVenueName(rawV);
    var rawR = elRace ? elRace.value : "";
    var cR = parseRaceNum(rawR);

    var btn = document.getElementById("predict-btn") || document.getElementById("predict_btn") || document.querySelector(".btn-predict");
    if(btn) btn.innerText = "⚡ 精密デバッグ検証中...";

    // 🛑【デバッグ要件3・4】現在選択されている値と、生成された「検索対象レースID」を表示
    var generated_search_id = "日付:" + cG + " | 競馬場:" + cV + " | レース番号:" + cR;
    alert("📋 [デバッグ表示：画面から入力された検索対象ID]\n" +
          "-----------------------------------------\n" +
          "■ 入力された日付 (cG): " + cG + "\n" +
          "■ 入力された競馬場 (cV): " + cV + "\n" +
          "■ 入力されたレース番号 (cR): " + cR + "\n" +
          "■ プログラムが生成した【検索対象レースID】:\n" +
          "   ➔ 「" + generated_search_id + "」");

    // 🚀 【追跡2】データファイル取得通信（fetch）の開始
    var target_urls = ["racedata.zip", "2025-2026.csv", "DG261003.CSV", "2025-2026.CSV"];
    var current_url_idx = 0;

    function fetchNextUrl() {
        if (current_url_idx >= target_urls.length) {
            alert("❌ 警告: サーバー上にデータファイル (racedata.zip / 2025-2026.csv) が見つかりませんでした。");
            if(btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
            return;
        }

        var target_zip_url = target_urls[current_url_idx];
        alert("➔ [2/7] [API到達成功] これより '" + target_zip_url + "' へ通信(fetch)を開始します。");

        fetch(target_zip_url, { method: "GET", cache: "no-cache" })
            .then(response => {
                alert("➔ [3/7] [検索開始成功] サーバーから電波が戻りました！\n■ ファイル: " + target_zip_url + "\n■ 通信成功フラグ(ok): " + response.ok + "\n■ HTTPステータス: " + response.status);
                if(!response.ok) { 
                    current_url_idx++;
                    fetchNextUrl();
                    return null;
                }
                return response.arrayBuffer();
            })
            .then(async (buffer) => {
                if (!buffer) return;

                alert("➔ [4/7] [データ読み込み開始] 成功！\n解凍・テキスト翻訳処理を開始します。");
                
                var text = "";
                var isZip = false;

                // ZIPファイル判定
                try {
                    if (typeof JSZip !== "undefined") {
                        var zip = await JSZip.loadAsync(buffer);
                        var zipFiles = [];
                        var file = null;
                        zip.forEach(function (relativePath, zipEntry) {
                            if (zipFiles.length < 50) zipFiles.push(relativePath);
                            if (relativePath.toLowerCase().indexOf(".txt") !== -1 || relativePath.toLowerCase().indexOf(".csv") !== -1) {
                                file = zipEntry;
                            }
                        });

                        if (file) {
                            alert("📦 [デバッグ表示：ZIP内のファイル名一覧（最大50件）]\n" +
                                  "-----------------------------------------\n" +
                                  "■ ZIP内総ファイル数: " + Object.keys(zip.files).length + "個\n" +
                                  "■ 検知したファイルリスト:\n" + zipFiles.join("\n"));
                            
                            var textBuffer = await file.async("arraybuffer");
                            var decoder = new TextDecoder("shift_jis");
                            text = decoder.decode(textBuffer);
                            isZip = true;
                        }
                    }
                } catch(e) {
                    isZip = false;
                }

                if (!isZip) {
                    try {
                        var decoder = new TextDecoder("shift_jis");
                        text = decoder.decode(buffer);
                    } catch(e) {
                        var decoder = new TextDecoder("utf-8");
                        text = decoder.decode(buffer);
                    }
                }

                alert("➔ [5/7] [検索実行] 成功！データデコード完了。\nこれより全データのガチ比較を行います。");
                
                var allLines = text.split(/\r?\n/);
                alert("➔ [翻訳成功] デコード処理を通過しました！\nデータ行数: " + allLines.length + "行。\nこれより条件のガチ比較を行います。");
                
                var matched_horses = [];
                var debug_log_count = 0;
                
                for(var i=0; i<allLines.length; i++) {
                    var line = allLines[i].trim();
                    if(!line) continue;
                    
                    var d = [];
                    var line_replaced = line.replace(/\t/g, " ");
                    var raw_split = line_replaced.split(/[ ,\t|]+/);
                    for(var k=0; k<raw_split.length; k++) {
                        var clean_item = raw_split[k].trim();
                        if(clean_item !== "") {
                            d.push(clean_item);
                        }
                    }
                    
                    if(d.length < 4) continue;
                    if(d.indexOf("日付") !== -1 || d.indexOf("date") !== -1) continue;
                    
                    try {
                        var raw_file_date = d[0].toString();
                        var file_date = parseDateStr(raw_file_date);
                        
                        var raw_file_venue = d[1].toString();
                        var file_venue = parseVenueName(raw_file_venue);
                        
                        var raw_file_race = d[2].toString();
                        var file_race = parseRaceNum(raw_file_race);
                        
                        var current_row_extracted_id = "日付:" + file_date + " | 競馬場:" + file_venue + " | レース番号:" + file_race;
                        
                        // 🛑【デバッグ要件5・6】比較直前に両方の値を表示し、不一致時の詳細理由を暴く（最初の3件のみ実況）
                        if (debug_log_count < 3) {
                            debug_log_count++;
                            var is_match_flag = (file_date === cG && file_venue === cV && file_race === cR);
                            alert("🔍 [デバッグ表示：比較直前の値ガチ検証ログ (" + debug_log_count + "/3行目)]\n" +
                                  "-----------------------------------------\n" +
                                  "①【画面から検索しようとしている対象ID】:\n" +
                                  "   ➔ 「" + generated_search_id + "」\n" +
                                  "②【データから抽出したID】:\n" +
                                  "   ➔ 「" + current_row_extracted_id + "」\n\n" +
                                  "■ 判定結果: " + (is_match_flag ? "⭕ 一致！" : "❌ 不一致"));
                        }
                        
                        if(file_date === cG && file_venue === cV && file_race === cR) {
                            var waku_clean = 1, num_clean = 1, name_clean = "", jockey_clean = "不明", odds_clean = 0.0;
                            
                            // 馬名の特定
                            for (var idx = 3; idx < d.length; idx++) {
                                if (/^[\u30A0-\u30FFー・]{2,9}$/.test(d[idx])) {
                                    name_clean = d[idx];
                                    if (idx + 1 < d.length && !/^\d+(\.\d+)?$/.test(d[idx+1])) {
                                        jockey_clean = d[idx+1];
                                    }
                                    break;
                                }
                            }
                            
                            if (!name_clean && d.length >= 6) name_clean = d[5] || d[3];
                            
                            waku_clean = parseInt(d[3], 10) || 1;
                            num_clean = parseInt(d[4], 10) || parseInt(d[3], 10) || 1;
                            
                            for (var idx = d.length - 1; idx >= 3; idx--) {
                                var f = parseFloat(d[idx].replace("倍", ""));
                                if (!isNaN(f) && f > 0 && f < 500) {
                                    odds_clean = f;
                                    break;
                                }
                            }

                            matched_horses.push({
                                waku: waku_clean, num: num_clean, name: name_clean, jockey: jockey_clean, odds: odds_clean
                            });
                        }
                    } catch(e) { continue; }
                }

                // 🟥 【追跡6】検索結果取得チェック
                alert("➔ [6/7] [検索結果取得成功] \nデータベースからのスキャンが完了しました。\n■ 一致した競走馬の数: " + matched_horses.length + "頭");

                if (matched_horses.length === 0) {
                    alert("❌ 【デバッグ停止：データ不一致エラー】\n" +
                          "-----------------------------------------\n" +
                          "■ サーバー内の全 " + allLines.length + " 行を走査しましたが、一致する馬データが0件でした。\n\n" +
                          "■ あなたが最後に検索を試みたID:\n" +
                          "   ➔ 「" + generated_search_id + "」\n\n" +
                          "💡【原因特定の鍵】:\nさきほど画面に3回飛び出してきた『②データから抽出したID』の文字の並びと、画面で選択したIDの違いを確認してください！");
                    if(btn) btn.innerText = "🧠 指定レースのデータ検索を実行"; 
                    return;
                }

                matched_horses.sort((a, b) => a.num - b.num);

                // 🟥 【追跡7】画面へ返却チェック
                alert("➔ [7/7] [画面へ返却成功] 今からテーブルに出馬表を描き出します！");
                
                var html = "";
                for (var j = 0; j < matched_horses.length; j++) {
                    var h = matched_horses[j];
                    var sig = "-";
                    if (parseFloat(h.odds) > 0 && parseFloat(h.odds) <= 3.5) { 
                        sig = "<span style='color:#dc2626;font-weight:bold;'>◎ 本命</span>"; 
                    }
                    var odds_text = h.odds > 0 ? h.odds + "倍" : "未確定";
                    html += "<tr><td>" + h.waku + "枠" + h.num + "番</td><td>" + sig + "</td><td><b>" + h.name + "</b></td><td>" + h.jockey + "</td><td>" + odds_text + "</td></tr>";
                }

                var tbody = document.getElementById("predict-tbody") || document.getElementById("predict_tbody") || document.querySelector("tbody");
                if(tbody) tbody.innerHTML = html;
                
                alert("🏆 [完全大開通達成！！] すべての工程が1ミリのエラーもなく100%完全に通過しました！！JRA全頭出馬表の大出現です！！！");
                if(btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
            })
            .catch(err => {
                alert("❌ 警告: 処理の途中でプログラムがクラッシュして停止しました。\n■ 原因エラー: " + err.message);
                if(btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
            });
    }

    fetchNextUrl();
}
