javascript
// 🌪️【精密原因特定デバッグ・外部頭脳 app.js 完全ノーカット版】

function loadAndUnzipJraDatabase() {
    // 🛑 【確認1】ボタン押下チェック（デバッグ機能を1文字も無効化せず維持）
    alert("➔ [段階1] [フロント] ボタン押下を検知しました！（クリックイベント発火成功）");

    var rawDate = document.getElementById("sim-date").value;
    if(!rawDate){ alert("❌ 日付を選択してください"); return; }
    
    // ハイフンやスラッシュを消去して「20260503」の形を生成
    var cG = rawDate.replace(/-/g, "").replace(/\//g, "").trim();
    var cV = document.getElementById("sim-venue").value;
    var cR = document.getElementById("sim-race").value;
    var btn = document.getElementById("predict-btn");
    btn.innerText = "⚡ 精密デバッグスキャン中...";

    // 🛑 【指示3・4】選択された値と、プログラムが生成している「検索対象レースID」を直撃で画面表示
    var generated_search_id = "開催年月日:" + cG + " / 競馬場:" + cV + " / レース番号:" + cR;
    alert("📋 [段階1-B:現在フロントで選択されている値のデバッグ表示]\n" +
          "■ 選択された日付（変換後）: " + cG + "\n" +
          "■ 選択された競馬場: " + cV + "\n" +
          "■ 選択されたレース番号: " + cR + "\n\n" +
          "➔ 【プログラムが生成した検索対象レースID】:\n 「 " + generated_search_id + " 」");

    // 🚀 【確認2】ZIPファイルのダウンロード通信（fetch）の開始
    var target_zip_url = "racedata.zip";
    alert("➔ [段階2] [フロント] これより同じフォルダにある '" + target_zip_url + "' への通信(fetch)を開始します。");

    fetch(target_zip_url, { method: "GET", cache: "no-cache" })
        .then(response => {
            alert("➔ [フロント] サーバーからHTTP応答を受信しました。\nHTTPステータスコード: " + response.status);
            if(!response.ok) { 
                alert("❌ 警告: サーバー上に 'racedata.zip' が見つかりません。");
                throw new Error("ZIPファイル取得失敗"); 
            }
            return response.arrayBuffer();
        })
        .then(async (buffer) => {
            alert("➔ [段階4] [ZIP読み込み開始] 成功！\nこれよりJSZipライブラリでフォルダの解凍・開封を執行します。");
            
            var zip = await JSZip.loadAsync(buffer);
            alert("➔ [解凍成功] ZIPフォルダの開封に100%成功しました！");
            
            // 🛑 【指示1・2】ZIP内に存在するファイル名を最大50件まで取得してalert表示
            var zipFiles = [];
            var file = null;
            
            zip.forEach(function (relativePath, zipEntry) {
                if (zipFiles.length < 50) {
                    zipFiles.push(relativePath);
                }
                if (relativePath.toLowerCase().indexOf(".txt") !== -1) {
                    file = zipEntry;
                }
            });
            
            alert("📦 [指示1・2: ZIP内部のファイル名リスト（最大50件）]\n" + 
                  "■ 総ファイル数: " + Object.keys(zip.files).length + "個\n" +
                  "-------------------------------------\n" + 
                  zipFiles.join("\n"));
            
            if(!file) { 
                alert("❌ 警告: ZIPフォルダは正常に開きましたが、その中にテキストファイル(.txt)が1枚も見つかりません！"); 
                btn.innerText = "🧠 指定レースのデータ検索を実行"; return; 
            }
            
            // 🟥 【追跡5】テキスト抽出・デコード
            alert("➔ [段階5] [検索実行] 成功！テキストファイル '" + file.name + "' を確認。\nこれより文字コードをShift-JISから日本語テキストへ翻訳します。");
            
            var textBuffer = await file.async("arraybuffer");
            var decoder = new TextDecoder("shift_jis");
            var text = decoder.decode(textBuffer);
            var allLines = text.split("\n");
            
            alert("➔ [翻訳成功] デコード処理を通過しました！\n生データの総行数: " + allLines.length + "行。これより不一致原因の突き止めに入ります。");
            
            var matched_horses = [];
            var debug_comparison_done = false; // 最初の1件目だけ精密比較を表示するためのフラグ
            
            for(var i=0; i<allLines.length; i++) {
                var line = allLines[i].trim();
                if(!line) continue;
                
                // スペースやタブを安全に1列ずつ配列化する処理
                var d = [];
                var line_replaced = line.replace(/\t/g, " ");
                var raw_split = line_replaced.split(" ");
                for(var k=0; k<raw_split.length; k++) {
                    var clean_item = raw_split[k].trim();
                    if(clean_item !== "") { d.push(clean_item); }
                }
                
                if(d.length < 7) continue;
                if(d.indexOf("日付") !== -1 || d.indexOf("date") !== -1) continue;
                
                try {
                    // テキストファイルから抽出した生データ
                    var file_date_raw = d.toString();
                    var file_date = file_date_raw.replace(/-/g,"").replace(/\//g,"").trim();
                    if(file_date.length === 6) { file_date = "20" + file_date; }
                    
                    var file_venue = d.toString().trim();
                    var file_race = d.toString().toUpperCase().replace("R","").trim() + "R";
                    
                    // 🛑 【指示5・6】比較の直前に両方の値を表示し、不一致時の詳細情報を暴き出す
                    if (!debug_comparison_done) {
                        debug_comparison_done = true; // 連打防止のため最初の1行目データだけでalertを出す
                        
                        var txt_row_id = "開催年月日:" + file_date + " / 競馬場:" + file_venue + " / レース番号:" + file_race;
                        
                        alert("🔍 [指示5・6: テキスト内の生データと検索IDのガチ比較ログ]\n\n" +
                              "① 【あなたが今画面で検索しようとしている対象ID】:\n" +
                              "   ➔ 「 " + generated_search_id + " 」\n\n" +
                              "② 【ZIP内のテキストの1行目に書かれていた実在データ】:\n" +
                              "   ➔ 「 " + txt_row_id + " 」\n\n" +
                              "⚠️ もしここの『文字列』の形（スペースの数や、Rの文字、日付の形式）が1文字でもズレている場合、プログラムは別のレースだと判定して不一致を起こします！");
                    }
                    
                    if(file_date === cG && file_venue === cV && file_race === cR) {
                        var waku_clean = parseInt(d) || 0;
                        var num_clean = parseInt(d) || 0;
                        var name_clean = d.toString().trim();
                        var jockey_clean = d ? d.toString().trim() : "不明";
                        var odds_clean = d ? parseFloat(d.toString().replace("倍","").trim()) : 0.0;

                        matched_horses.push({
                            waku: waku_clean, num: num_clean, name: name_clean, jockey: jockey_clean, odds: odds_clean
                        });
                    }
                } catch(e) { continue; }
            }

            // 🟥 【追跡6】検索結果取得チェック
            alert("➔ [段階6] [検索結果取得成功] スキャン完了。一致した競走馬の数: " + matched_horses.length + "頭");

            if (matched_horses.length === 0) {
                alert("❌ 【デバッグ追跡：ここで停止中】\n" +
                      "ZIPデータは正常に開けましたが、選択された検索ID 「" + cG + "_" + cV + "_" + cR + "」 と、テキスト内の全 " + allLines.length + " 行のデータが1行も一致しませんでした。\n\n" +
                      "💡 【原因特定のためのヒント】:\nさきほど画面に出現した『①検索しようとしている対象ID』と『②テキスト内の実在データ』の文字の並びのズレ（例: 東京がスペース混じり、11Rが11など）を私にそのまま教えてください！");
                btn.innerText = "🧠 指定レースのデータ検索を実行"; return;
            }

            matched_horses.sort((a, b) => a.num - b.num);

            // 🟥 【追跡7】画面へ返却チェック
            alert("➔ [段階7] [画面へ返却成功] 今からテーブルに出馬表を描き出します！");
            
            var html = "";
            for (var j = 0; j < matched_horses.length; j++) {
                var h = matched_horses[j];
                var sig = "-";
                if (parseFloat(h.odds) <= 3.5) { sig = "<span style='color:#dc2626;font-weight:bold;'>◎ 本命</span>"; }
                html += `<tr><td>${h.waku}枠${h.num}番</td><td>${sig}</td><td><b>${h.name}</b></td><td>${h.jockey}</td><td>${h.odds}倍</td></tr>`;
            }

            document.getElementById("predict-tbody").innerHTML = html;
            alert("🏆 [完全大開通達成！！] すべての工程が1ミリのエラーもなく100%完全に通過しました！！JRA全頭出馬表の大出現です！！！");
            btn.innerText = "🧠 指定レースのデータ検索を実行";
        })
        .catch(err => {
            alert("❌ 警告: 処理の途中でプログラムがクラッシュして停止しました。\n■ 原因エラー: " + err.message);
            btn.innerText = "🧠 指定レースのデータ検索を実行";
        });
}
