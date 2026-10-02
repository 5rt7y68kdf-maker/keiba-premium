// 🛠️【表記揺れ完全自動吸収・データ照合修正版 app.js】

// --------------------------------------------------
// 1. 表記揺れ自動補正（正規化）ヘルパー関数
// --------------------------------------------------

// 日付の正規化（例: "2026-05-03" / "2026/05/03" / "260503" ➔ "20260503"）
function normalizeDate(d) {
    if (!d) return "";
    var clean = d.toString().replace(/\D/g, "").trim();
    if (clean.length === 6) clean = "20" + clean;
    return clean;
}

// 競馬場名の正規化（例: "東京競馬場" / " 東京 " ➔ "東京"）
function normalizeVenue(v) {
    if (!v) return "";
    return v.toString().replace(/競馬場/g, "").replace(/\s+/g, "").trim();
}

// レース番号の正規化（例: "11R" / "第11レース" / "１１" ➔ 11）
function normalizeRaceNum(r) {
    if (!r) return 0;
    var m = r.toString().match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
}

// --------------------------------------------------
// 2. メイン照合・描画関数
// --------------------------------------------------
function loadAndUnzipJraDatabase() {
    alert("➔ [1/7] [ボタン押下成功] 正常にプログラムが作動しました！");

    var rawDate = document.getElementById("sim-date").value;
    if(!rawDate){ alert("❌ 日付を選択してください"); return; }
    
    // 入力値の正規化（表記揺れ吸収）
    var cG = normalizeDate(rawDate);
    var cV = normalizeVenue(document.getElementById("sim-venue").value);
    var cR = normalizeRaceNum(document.getElementById("sim-race").value);
    var btn = document.getElementById("predict-btn");
    btn.innerText = "⚡ データ照合中...";

    var generated_search_id = "日付:" + cG + " | 競馬場:" + cV + " | レース番号:" + cR + "R";
    alert("📋 [検索条件（正規化後）]\n-----------------------------------------\n" +
          "■ 日付 (cG): " + cG + "\n" +
          "■ 競馬場 (cV): " + cV + "\n" +
          "■ レース番号 (cR): " + cR + "R\n" +
          "■ 照合用検索ID: 「" + generated_search_id + "」");

    var target_zip_url = "racedata.zip";
    alert("➔ [2/7] [API到達成功] ' " + target_zip_url + " ' へ通信を開始します。");

    fetch(target_zip_url, { method: "GET", cache: "no-cache" })
        .then(response => {
            alert("➔ [3/7] [通信応答成功] HTTPステータス: " + response.status);
            if(!response.ok) { 
                alert("❌ 警告: サーバー上に 'racedata.zip' が見つかりません。");
                throw new Error("ZIPファイル取得失敗"); 
            }
            return response.arrayBuffer();
        })
        .then(async (buffer) => {
            alert("➔ [4/7] [ZIP読み込み成功] 内部テキストファイルを解凍します。");
            
            var zip = await JSZip.loadAsync(buffer);
            var zipFiles = [];
            var file = null;
            
            zip.forEach(function (relativePath, zipEntry) {
                if (zipFiles.length < 50) zipFiles.push(relativePath);
                if (relativePath.toLowerCase().indexOf(".txt") !== -1 && !file) {
                    file = zipEntry;
                }
            });
            
            alert("📦 [ZIP内ファイル検知]\n■ 総ファイル数: " + Object.keys(zip.files).length + "個\n■ 対象ファイル: " + (file ? file.name : "なし"));
            
            if(!file) { 
                alert("❌ 警告: ZIP内にテキストファイル(.txt)が見つかりません。"); 
                btn.innerText = "🧠 指定レースのデータ検索を実行"; return; 
            }
            
            alert("➔ [5/7] [テキストデコード開始] Shift-JIS ➔ 日本語変換を実行します。");
            var textBuffer = await file.async("arraybuffer");
            var decoder = new TextDecoder("shift_jis");
            var text = decoder.decode(textBuffer);
            var allLines = text.split("\n");
            
            alert("➔ [デコード成功] データ総行数: " + allLines.length + "行。照合を開始します。");
            
            var matched_horses = [];
            
            for(var i = 0; i < allLines.length; i++) {
                var line = allLines[i].trim();
                if(!line) continue;
                
                // スペース、タブ、カンマ、パイプ等での多重分解に対応
                var d = line.split(/[\s,\t|]+/).map(function(item){ return item.trim(); }).filter(Boolean);
                
                if(d.length < 5) continue; // 最低必要項目数の確保
                if(line.indexOf("日付") !== -1 || line.toLowerCase().indexOf("date") !== -1) continue; // ヘッダー除去
                
                try {
                    // テキスト側データの正規化抽出
                    var file_date = normalizeDate(d[0]);
                    var file_venue = normalizeVenue(d[1]);
                    var file_race = normalizeRaceNum(d[2]);
                    
                    // 正規化後の統一フォーマット同士で照合判定
                    if(file_date === cG && file_venue === cV && file_race === cR) {
                        var waku_clean = parseInt(d[3], 10) || 0;
                        var num_clean = parseInt(d[4], 10) || 0;
                        var name_clean = d[5] ? d[5].toString().trim() : "";
                        var jockey_clean = d[6] ? d[6].toString().trim() : "不明";
                        var odds_clean = d[7] ? parseFloat(d[7].toString().replace("倍","").trim()) : 0.0;

                        if (name_clean) {
                            matched_horses.push({
                                waku: waku_clean, 
                                num: num_clean, 
                                name: name_clean, 
                                jockey: jockey_clean, 
                                odds: isNaN(odds_clean) ? 0.0 : odds_clean
                            });
                        }
                    }
                } catch(e) { continue; }
            }

            alert("➔ [6/7] [検索結果完了] 一致馬数: " + matched_horses.length + "頭");

            if (matched_horses.length === 0) {
                alert("❌ 【データ不一致エラー】\n-----------------------------------------\n" +
                      "■ 照合可能な馬データが見つかりませんでした。\n" +
                      "■ 検索試行ID: 「" + generated_search_id + "」\n\n" +
                      "💡 ZIP内のテキストデータで指定日・指定競馬場・レースのデータが存在するかご確認ください。");
                btn.innerText = "🧠 指定レースのデータ検索を実行"; return;
            }

            // 馬番順にソート
            matched_horses.sort((a, b) => a.num - b.num);

            alert("➔ [7/7] [画面へ描画開始] テーブルに出馬表を出力します。");
            
            var html = "";
            for (var j = 0; j < matched_horses.length; j++) {
                var h = matched_horses[j];
                var sig = "-";
                if (h.odds > 0 && h.odds <= 3.5) { 
                    sig = "<span style='color:#dc2626;font-weight:bold;'>◎ 本命</span>"; 
                }
                var odds_disp = (h.odds > 0) ? h.odds + "倍" : "未確定";
                html += `<tr><td>${h.waku}枠${h.num}番</td><td>${sig}</td><td><b>${h.name}</b></td><td>${h.jockey}</td><td>${odds_disp}</td></tr>`;
            }

            document.getElementById("predict-tbody").innerHTML = html;
            alert("🏆 【完全大開通！！】 出馬表 " + matched_horses.length + "頭の描画が完了しました！");
            btn.innerText = "🧠 指定レースのデータ検索を実行";
        })
        .catch(err => {
            alert("❌ 処理クラッシュ停止:\n" + err.message);
            btn.innerText = "🧠 指定レースのデータ検索を実行";
        });
}
