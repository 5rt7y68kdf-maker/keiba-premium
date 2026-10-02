// 🛠️【無反応防止・安全エレメントチェック・表記揺れ吸収版 app.js】

function normalizeDate(d) {
    if (!d) return "";
    var clean = d.toString().replace(/\D/g, "").trim();
    if (clean.length === 6) clean = "20" + clean;
    return clean;
}

function normalizeVenue(v) {
    if (!v) return "";
    return v.toString().replace(/競馬場/g, "").replace(/\s+/g, "").trim();
}

function normalizeRaceNum(r) {
    if (!r) return 0;
    var m = r.toString().match(/\d+/);
    return m ? parseInt(m, 10) : 0;
}

function loadAndUnzipJraDatabase() {
    alert("➔ [1/7] [ボタン押下成功] 正常にプログラムが作動しました！");

    // 安全なエレメント取得チェック
    var elDate = document.getElementById("sim-date");
    var elVenue = document.getElementById("sim-venue");
    var elRace = document.getElementById("sim-race");
    var btn = document.getElementById("predict-btn");
    var tbody = document.getElementById("predict-tbody");

    if (!elDate || !elVenue || !elRace) {
        alert("❌ エラー: HTML上に 'sim-date', 'sim-venue', 'sim-race' のいずれかのIDが存在しません。");
        return;
    }

    var rawDate = elDate.value;
    if(!rawDate){ alert("❌ 日付を選択してください"); return; }
    
    var cG = normalizeDate(rawDate);
    var cV = normalizeVenue(elVenue.value);
    var cR = normalizeRaceNum(elRace.value);
    
    if (btn) btn.innerText = "⚡ データ照合中...";

    var generated_search_id = "日付:" + cG + " | 競馬場:" + cV + " | レース番号:" + cR + "R";
    alert("📋 [検索条件]\n-----------------------------------------\n" +
          "■ 日付 (cG): " + cG + "\n" +
          "■ 競馬場 (cV): " + cV + "\n" +
          "■ レース番号 (cR): " + cR + "R\n" +
          "■ 検索ID: 「" + generated_search_id + "」");

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
            alert("➔ [4/7] [ZIP読み込み成功] 解凍処理を行います。");
            
            if (typeof JSZip === "undefined") {
                alert("❌ エラー: JSZipライブラリが読み込まれていません。HTMLにJSZipの<script>タグを追加してください。");
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
            
            if(!file) { 
                alert("❌ 警告: ZIP内にテキストファイル(.txt)が見つかりません。"); 
                if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行"; 
                return; 
            }
            
            alert("➔ [5/7] [デコード開始] ファイル '" + file.name + "' を解読します。");
            var textBuffer = await file.async("arraybuffer");
            var decoder = new TextDecoder("shift_jis");
            var text = decoder.decode(textBuffer);
            var allLines = text.split("\n");
            
            var matched_horses = [];
            
            for(var i = 0; i < allLines.length; i++) {
                var line = allLines[i].trim();
                if(!line) continue;
                
                var d = line.split(/[\s,\t|]+/).map(function(item){ return item.trim(); }).filter(Boolean);
                if(d.length < 5) continue;
                if(line.indexOf("日付") !== -1 || line.toLowerCase().indexOf("date") !== -1) continue;
                
                try {
                    // 配列要素（d[0], d[1], d[2]...）を正確に抽出
                    var file_date = normalizeDate(d[0]);
                    var file_venue = normalizeVenue(d[1]);
                    var file_race = normalizeRaceNum(d[2]);
                    
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

            alert("➔ [6/7] [照合完了] 一致馬数: " + matched_horses.length + "頭");

            if (matched_horses.length === 0) {
                alert("❌ 【データ不一致エラー】\n-----------------------------------------\n" +
                      "■ 該当する馬データが見つかりませんでした。\n" +
                      "■ 検索試行ID: 「" + generated_search_id + "」");
                if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行"; 
                return;
            }

            matched_horses.sort((a, b) => a.num - b.num);

            alert("➔ [7/7] [画面描画] テーブルに出力します。");
            
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

            if (tbody) tbody.innerHTML = html;
            alert("🏆 【完全大開通！！】 出馬表 " + matched_horses.length + "頭の描画が完了しました！");
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        })
        .catch(err => {
            alert("❌ クラッシュ停止:\n" + err.message);
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        });
}
