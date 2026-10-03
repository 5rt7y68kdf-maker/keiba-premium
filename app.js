// 🌪️【KUINA RACING ANALYTICS - 完全復元 ＆ デバッグ実況追跡100%搭載版 app.js】

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

function normalizeVenue(v) {
    if (!v) return "";
    var raw = v.toString().replace(/競馬場/g, "").replace(/\(.*?\)/g, "").trim();
    if (VENUE_MAP[raw]) {
        var code = VENUE_MAP[raw];
        if (!isNaN(raw)) return VENUE_MAP[code] || raw;
        return raw;
    }
    return raw;
}

function normalizeRace(r) {
    if (!r) return "";
    var m = r.toString().match(/\d+/);
    return m ? m[0] + "R" : r.toString().trim();
}

function initUI() {
    if (document.getElementById("sim-date")) return;
    var container = document.querySelector(".container");
    if (!container) {
        container = document.createElement("div");
        container.className = "container";
        document.body.appendChild(container);
    }
    container.innerHTML = '<h1>🌪️ KUINA AI RACING ANALYTICS</h1>' +
        '<div class="subtitle">JRA 全頭精密解析・自動出馬表エンジン</div>' +
        '<div class="selector-box">' +
            '<label style="color:#d4af37; font-weight:bold; font-size:0.9rem; display:block; margin-bottom:5px;">📅 開催日選択</label>' +
            '<input type="date" id="sim-date" class="select-input" value="2026-10-03">' +
            '<label style="color:#d4af37; font-weight:bold; font-size:0.9rem; display:block; margin-bottom:5px;">🏇 競馬場選択</label>' +
            '<select id="sim-venue" class="select-input">' +
                '<option value="東京">東京</option>' +
                '<option value="京都">京都</option>' +
                '<option value="中山">中山</option>' +
                '<option value="阪神">阪神</option>' +
                '<option value="新潟">新潟</option>' +
                '<option value="福島">福島</option>' +
                '<option value="中京">中京</option>' +
                '<option value="小倉">小倉</option>' +
                '<option value="札幌">札幌</option>' +
                '<option value="函館">函館</option>' +
            '</select>' +
            '<label style="color:#d4af37; font-weight:bold; font-size:0.9rem; display:block; margin-bottom:5px;">🏁 レース番号</label>' +
            '<select id="sim-race" class="select-input">' +
                '<option value="11R">11R</option>' +
                '<option value="1R">1R</option><option value="2R">2R</option><option value="3R">3R</option>' +
                '<option value="4R">4R</option><option value="5R">5R</option><option value="6R">6R</option>' +
                '<option value="7R">7R</option><option value="8R">8R</option><option value="9R">9R</option>' +
                '<option value="10R">10R</option><option value="12R">12R</option>' +
            '</select>' +
            '<button id="predict-btn" class="btn-predict" onclick="loadAndUnzipJraDatabase()">🧠 指定レースのデータ検索を実行</button>' +
        '</div>' +
        '<div class="prediction-box">' +
            '<h3 style="color:#d4af37; margin-top:0; font-size:1.1rem;">📊 JRA 出馬表 ＆ AI分析</h3>' +
            '<table>' +
                '<thead>' +
                    '<tr><th>枠-馬</th><th>AI印</th><th>競走馬名</th><th>騎手</th><th>オッズ</th></tr>' +
                '</thead>' +
                '<tbody id="predict-tbody">' +
                    '<tr><td colspan="5" style="text-align:center; color:#888; padding:20px;">条件を選択して検索ボタンを押してください</td></tr>' +
                '</tbody>' +
            '</table>' +
        '</div>';
}

if (typeof window !== "undefined") {
    if (document.readyState === "complete" || document.readyState === "interactive") {
        initUI();
    } else {
        window.addEventListener("DOMContentLoaded", initUI);
    }
}

function loadAndUnzipJraDatabase() {
    alert("➔ [1/7] [ボタン押下成功] 正常にプログラムの1行目が作動しました！");

    var dateEl = document.getElementById("sim-date");
    var rawDate = dateEl ? dateEl.value : "";
    if(!rawDate){ alert("❌ 日付を選択してください"); return; }

    var cG = rawDate.replace(/-/g, "").replace(/\//g, "").trim();
    var cV = document.getElementById("sim-venue") ? document.getElementById("sim-venue").value : "東京";
    var cR = document.getElementById("sim-race") ? document.getElementById("sim-race").value : "11R";
    var btn = document.getElementById("predict-btn");
    if(btn) btn.innerText = "⚡ 精密デバッグ検証中...";

    var generated_search_id = "日付:" + cG + " | 競馬場:" + cV + " | レース番号:" + cR;
    alert("📋 [デバッグ表示：画面から入力された検索対象ID]\n" +
          "-----------------------------------------\n" +
          "■ 入力された日付 (cG): " + cG + "\n" +
          "■ 入力された競馬場 (cV): " + cV + "\n" +
          "■ 入力されたレース番号 (cR): " + cR + "\n" +
          "■ プログラムが生成した【検索対象レースID】:\n" +
          "   ➔ 「" + generated_search_id + "」");

    var urlsToTry = ["2025-2026.csv", "2025-2026.CSV", "racedata.zip", "racedata.csv", "DG" + cG.substring(2) + ".CSV"];
    
    function tryFetch(index) {
        if (index >= urlsToTry.length) {
            alert("❌ 警告: サーバー上にデータファイルが見つかりません。");
            if(btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
            return;
        }
        var target_url = urlsToTry[index];
        alert("➔ [2/7] [API到達成功] これより同じ部屋にある '" + target_url + "' へ通信(fetch)を開始します。");

        fetch(target_url, { method: "GET", cache: "no-cache" })
            .then(function(response) {
                alert("➔ [3/7] [検索開始成功] サーバーから電波が戻りました！\n■ 通信成功フラグ(ok): " + response.ok + "\n■ HTTPステータス: " + response.status);
                if (!response.ok) {
                    throw new Error("HTTP status " + response.status);
                }
                return response.arrayBuffer();
            })
            .then(async function(buffer) {
                var isZip = target_url.toLowerCase().endsWith(".zip");
                var text = "";
                var fileNameFound = target_url;

                if (isZip) {
                    alert("➔ [4/7] [ZIP読み込み開始] 成功！\nこれより、本物のJSZipライブラリで解凍処理を行います。");
                    var zip = await JSZip.loadAsync(buffer);
                    alert("➔ [解凍成功] ZIPフォルダの開封に成功しました！中身のファイル名を調べます。");
                    
                    var zipFiles = [];
                    var file = null;
                    zip.forEach(function (relativePath, zipEntry) {
                        if (zipFiles.length < 50) zipFiles.push(relativePath);
                        if (relativePath.toLowerCase().indexOf(".txt") !== -1 || relativePath.toLowerCase().indexOf(".csv") !== -1) {
                            file = zipEntry;
                        }
                    });
                    
                    alert("📦 [デバッグ表示：ZIP内のファイル名一覧（最大50件）]\n" +
                          "-----------------------------------------\n" +
                          "■ ZIP内総ファイル数: " + Object.keys(zip.files).length + "個\n" +
                          "■ 検知したファイルリスト:\n" + zipFiles.join("\n"));
                    
                    if(!file) {
                        alert("❌ 警告: ZIPフォルダの中にテキストファイル(.txt / .csv)がありません！");
                        if(btn) btn.innerText = "🧠 指定レースのデータ検索を実行"; return;
                    }
                    fileNameFound = file.name;
                    var textBuffer = await file.async("arraybuffer");
                    var decoder = new TextDecoder("shift_jis");
                    text = decoder.decode(textBuffer);
                } else {
                    alert("➔ [4/7] [CSVデータ読み込み成功] 成功！\nこれより文字コードのデコード処理を行います。");
                    try {
                        var decoder = new TextDecoder("utf-8");
                        text = decoder.decode(buffer);
                        if (text.indexOf("\uFFFD") !== -1) {
                            var sjisDecoder = new TextDecoder("shift_jis");
                            text = sjisDecoder.decode(buffer);
                        }
                    } catch(e) {
                        var sjisDecoder = new TextDecoder("shift_jis");
                        text = sjisDecoder.decode(buffer);
                    }
                }

                alert("➔ [5/7] [検索実行] 成功！テキストファイル '" + fileNameFound + "' を確認。\nこれよりテキストを翻訳・解析します。");

                var allLines = text.split(/\r?\n/);
                alert("➔ [翻訳成功] デコード処理を通過しました！\nデータ行数: " + allLines.length + "行。\nこれより条件のガチ比較を行います。");

                var matched_horses = [];
                var debug_log_count = 0;

                for (var i = 0; i < allLines.length; i++) {
                    var line = allLines[i].trim();
                    if (!line) continue;

                    var d = [];
                    var raw_split = line.split(/[\s,\t]+/);
                    for (var k = 0; k < raw_split.length; k++) {
                        var clean_item = raw_split[k].trim();
                        if (clean_item !== "") d.push(clean_item);
                    }

                    if (d.length < 4) continue;
                    if (d.indexOf("日付") !== -1 || d.indexOf("date") !== -1) continue;

                    try {
                        var raw_file_date = d[0].toString();
                        var file_date = raw_file_date.replace(/-/g, "").replace(/\//g, "").trim();
                        if (file_date.length === 6) file_date = "20" + file_date;

                        var file_venue = d[1] ? d[1].toString().trim() : "";
                        var file_race = d[2] ? d[2].toString().toUpperCase().replace("R", "").trim() + "R" : "";

                        var norm_file_venue = normalizeVenue(file_venue);
                        var norm_target_venue = normalizeVenue(cV);
                        var norm_file_race = normalizeRace(file_race);
                        var norm_target_race = normalizeRace(cR);

                        var current_row_extracted_id = "日付:" + file_date + " | 競馬場:" + file_venue + " | レース番号:" + file_race;

                        if (debug_log_count < 3) {
                            debug_log_count++;
                            var isMatch = (file_date === cG && (norm_file_venue === norm_target_venue || file_venue.indexOf(norm_target_venue) !== -1) && norm_file_race === norm_target_race);
                            alert("🔍 [デバッグ表示：比較直前の値ガチ検証ログ (" + debug_log_count + "/3行目)]\n" +
                                  "-----------------------------------------\n" +
                                  "①【画面から検索しようとしている対象ID】:\n" +
                                  "   ➔ 「" + generated_search_id + "」\n" +
                                  "②【データから抽出したID】:\n" +
                                  "   ➔ 「" + current_row_extracted_id + "」\n\n" +
                                  "■ 判定結果: " + (isMatch ? "⭕ 一致！" : "❌ 不一致"));
                        }

                        var isMatchFinal = (file_date === cG && (norm_file_venue === norm_target_venue || file_venue.indexOf(norm_target_venue) !== -1) && norm_file_race === norm_target_race);

                        if (isMatchFinal) {
                            var waku_clean = parseInt(d[3], 10) || 1;
                            var num_clean = parseInt(d[4], 10) || 1;
                            var name_clean = d[5] ? d[5].toString().trim() : "";
                            var jockey_clean = d[6] ? d[6].toString().trim() : "不明";
                            var odds_clean = d[7] ? parseFloat(d[7].toString().replace("倍", "").trim()) : 0.0;

                            if (name_clean) {
                                matched_horses.push({
                                    waku: waku_clean, num: num_clean, name: name_clean, jockey: jockey_clean, odds: odds_clean
                                });
                            }
                        }
                    } catch(e) { continue; }
                }

                alert("➔ [6/7] [検索結果取得成功] \nデータベースからのスキャンが完了しました。\n■ 一致した競走馬の数: " + matched_horses.length + "頭");

                if (matched_horses.length === 0) {
                    alert("❌ 【デバッグ停止：データ不一致エラー】\n" +
                          "-----------------------------------------\n" +
                          "■ サーバー内の全 " + allLines.length + " 行を走査しましたが、一致する馬データが0件でした。\n\n" +
                          "■ あなたが最後に検索を試みたID:\n" +
                          "   ➔ 「" + generated_search_id + "」\n\n" +
                          "💡【原因特定の鍵】:\nさきほど画面に3回飛び出してきた『②データから抽出したID』の文字の並び（スペースの有無、Rの文字、競馬場名の表記の違いなど）と、画面で選択したIDの違いをそのまま教えてください！");
                    if(btn) btn.innerText = "🧠 指定レースのデータ検索を実行"; return;
                }

                matched_horses.sort(function(a, b) { return a.num - b.num; });

                alert("➔ [7/7] [画面へ返却成功] 今からテーブルに出馬表を描き出します！");

                var html = "";
                for (var j = 0; j < matched_horses.length; j++) {
                    var h = matched_horses[j];
                    var sig = "-";
                    if (parseFloat(h.odds) > 0 && parseFloat(h.odds) <= 3.5) {
                        sig = '<span style="color:#dc2626;font-weight:bold;">◎ 本命</span>';
                    } else if (parseFloat(h.odds) > 3.5 && parseFloat(h.odds) <= 7.0) {
                        sig = '<span style="color:#319795;font-weight:bold;">〇 対抗</span>';
                    }
                    var oddsStr = (h.odds > 0) ? (h.odds + "倍") : "-";
                    html += '<tr><td>' + h.waku + '枠' + h.num + '番</td><td>' + sig + '</td><td><b>' + h.name + '</b></td><td>' + h.jockey + '</td><td>' + oddsStr + '</td></tr>';
                }

                var tbody = document.getElementById("predict-tbody");
                if (tbody) tbody.innerHTML = html;

                alert("🏆 [完全大開通達成！！] すべての工程が1ミリのエラーもなく100%完全に通過しました！！JRA全頭出馬表の大出現です！！！");
                if(btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
            })
            .catch(function(err) {
                tryFetch(index + 1);
            });
    }

    tryFetch(0);
}
