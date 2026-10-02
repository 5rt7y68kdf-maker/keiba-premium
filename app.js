// 🛠️【表記揺れ吸収・データ不一致防止版 app.js】

// --------------------------------------------------
// 1. 表記揺れ吸収ヘルパー関数
// --------------------------------------------------
function normalizeDate(d) {
    if (!d) return "";
    var clean = d.toString().replace(/\D/g, "").trim(); // 数字以外を全除去
    if (clean.length === 6) clean = "20" + clean;        // 260503 → 20260503
    return clean;
}

function normalizeVenue(v) {
    if (!v) return "";
    // 「競馬場」の文字や空白を除去して統一
    return v.toString().replace(/競馬場/g, "").replace(/\s+/g, "").trim();
}

function normalizeRaceNum(r) {
    if (!r) return 0;
    var m = r.toString().match(/\d+/); // 「11R」「第11レース」「11」から数値だけ抽出
    return m ? parseInt(m[0], 10) : 0;
}

// --------------------------------------------------
// 2. メインデータ検索・描画関数
// --------------------------------------------------
function loadAndUnzipJraDatabase() {
    alert("➔ [1/7] [ボタン押下成功] 正常にプログラムが作動しました！");

    var rawDate = document.getElementById("sim-date").value;
    if(!rawDate){ alert("❌ 日付を選択してください"); return; }
    
    // 入力値の正規化処理
    var cG = normalizeDate(rawDate);
    var cV = normalizeVenue(document.getElementById("sim-venue").value);
    var cR = normalizeRaceNum(document.getElementById("sim-race").value);
    var btn = document.getElementById("predict-btn");
    btn.innerText = "⚡ データ照合中...";

    var generated_search_id = "日付:" + cG + " | 競馬場:" + cV + " | レース:" + cR + "R";
    alert("📋 [検索条件]\n----------------\n" +
          "■ 日付: " + cG + "\n" +
          "■ 競馬場: " + cV + "\n" +
          "■ レース: " + cR + "R");

    var target_zip_url = "racedata.zip";

    fetch(target_zip_url, { method: "GET", cache: "no-cache" })
        .then(response => {
            if(!response.ok) { 
                alert("❌ 警告: サーバー上に 'racedata.zip' が見つかりません。");
                throw new Error("ZIPファイル取得失敗"); 
            }
            return response.arrayBuffer();
        })
        .then(async (buffer) => {
            var zip = await JSZip.loadAsync(buffer);
            var file = null;
            
            // ZIP内のテキストファイルを自動検出
            zip.forEach(function (relativePath, zipEntry) {
                if (relativePath.toLowerCase().indexOf(".txt") !== -1 && !file) {
                    file = zipEntry;
                }
            });
            
            if(!file) { 
                alert("❌ 警告: ZIPフォルダの中にテキストファイル(.txt)がありません！"); 
                btn.innerText = "🧠 指定レースのデータ検索を実行"; return; 
            }
            
            var textBuffer = await file.async("arraybuffer");
            var decoder = new TextDecoder("shift_jis");
            var text = decoder.decode(textBuffer);
            var allLines = text.split("\n");
            
            var matched_horses = [];
            
            for(var i = 0; i < allLines.length; i++) {
                var line = allLines[i].trim();
                if(!line) continue;
                
                // スペース・タブ・カンマ・パイプ区切りに対応
                var d = line.split(/[\s,\t|]+/).map(item => item.trim()).filter(Boolean);
                
                if(d.length < 5) continue; // 最低必要な項目数チェック
                if(d.indexOf("日付") !== -1 || d.indexOf("date") !== -1) continue; // ヘッダー行スキップ
                
                try {
                    // テキスト側データの正規化
                    var file_date = normalizeDate(d[0]);
                    var file_venue = normalizeVenue(d[1]);
                    var file_race = normalizeRaceNum(d[2]);
                    
                    // 正規化後の値で厳密照合
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
                                odds: odds_clean
                            });
                        }
                    }
                } catch(e) { continue; }
            }

            if (matched_horses.length === 0) {
                alert("❌ 【データ不一致エラー】\n" +
                      "-----------------------------------------\n" +
                      "■ 照合できる競走馬データが見つかりませんでした。\n" +
                      "■ 検索試行ID: 「" + generated_search_id + "」\n\n" +
                      "💡 ZIP内のテキストデータの日付・競馬場名表記をご確認ください。");
                btn.innerText = "🧠 指定レースのデータ検索を実行"; return;
            }

            // 馬番順に整列
            matched_horses.sort((a, b) => a.num - b.num);
            
            // テーブル描画
            var html = "";
            for (var j = 0; j < matched_horses.length; j++) {
                var h = matched_horses[j];
                var sig = "-";
                if (parseFloat(h.odds) > 0 && parseFloat(h.odds) <= 3.5) { 
                    sig = "<span style='color:#dc2626;font-weight:bold;'>◎ 本命</span>"; 
                }
                var odds_disp = (h.odds > 0) ? h.odds + "倍" : "未確定";
                html += `<tr><td>${h.waku}枠${h.num}番</td><td>${sig}</td><td><b>${h.name}</b></td><td>${h.jockey}</td><td>${odds_disp}</td></tr>`;
            }

            document.getElementById("predict-tbody").innerHTML = html;
            alert("🏆 【大開通】 " + matched_horses.length + "頭の出馬表データ描画に成功しました！");
            btn.innerText = "🧠 指定レースのデータ検索を実行";
        })
        .catch(err => {
            alert("❌ エラーが発生しました: " + err.message);
            btn.innerText = "🧠 指定レースのデータ検索を実行";
        });
}
