// 🌪️【デバッグ実況機能100%完全維持・外部頭脳 app.js 復元版】

function loadAndUnzipJraDatabase() {
    // 🟥 【追跡1】ボタン押下チェック ➔ 1文字も消さずに100%完全に維持！
    alert("➔ [1/7] [ボタン押下成功] 正常にプログラムの1行目が作動しました！");

    var rawDate = document.getElementById("sim-date").value;
    if(!rawDate){ alert("❌ 日付を選択してください"); return; }
    var cG = rawDate.replace(/-/g, "").replace(/\//g, "").trim();
    
    var cV = document.getElementById("sim-venue").value;
    if(!cV){ alert("❌ 競馬場を選択してください"); return; }
    
    var cR = document.getElementById("sim-race").value;
    if(!cR){ alert("❌ レース番号を選択してください"); return; }
    
    var cM = parseInt(document.getElementById("sim-money").value) || 0;
    if(cM <= 0){ alert("❌ 投資金額を半角数字で入力してください"); return; }
    
    var cB = document.getElementById("sim-bias").value;
    var cT = document.getElementById("sim-ticket").value;
    var btn = document.getElementById("predict-btn");
    btn.innerText = "⚡ デバッグ検証中...";

    // 🚀 【追跡2】API到達（ZIPファイルダウンロード通信）の開始 ➔ 100%完全に維持！
    var target_zip_url = "racedata.zip";
    alert("➔ [2/7] [API到達成功] これより同じサーバー内の '" + target_zip_url + "' へ通信(fetch)を開始します。");

    fetch(target_zip_url, { method: "GET", cache: "no-cache" })
        .then(response => {
            // 🟥 【追跡3】通信応答チェック ➔ 100%完全に維持！
            alert("➔ [3/7] [検索開始成功] サーバーから電波が戻りました！\n■ 通信成功フラグ(ok): " + response.ok + "\n■ HTTPステータス: " + response.status);
            if(!response.ok) { 
                alert("❌ 警告: サーバー上に 'racedata.zip' が見つかりません。");
                throw new Error("ZIPファイル取得失敗"); 
            }
            return response.arrayBuffer();
        })
        .then(async (buffer) => {
            // 🟥 【追跡4】ZIP読み込み開始チェック ➔ 100%完全に維持！
            alert("➔ [4/7] [ZIP読み込み開始] 成功！\nこれより、本物のJSZipライブラリで解凍処理を行います。");
            
            var zip = await JSZip.loadAsync(buffer);
            alert("➔ [解凍成功] ZIPフォルダの開封に成功しました！中身のファイル名を調べます。");
            
            var file = null;
            var zipFiles = [];
            zip.forEach(function (relativePath, zipEntry) {
                zipFiles.push(relativePath);
                if (relativePath.toLowerCase().indexOf(".txt") !== -1) {
                    file = zipEntry;
                }
            });
            
            alert("📦 [ZIP内ファイル確認] 発見されたファイル名:\n" + zipFiles.join("\n"));
            
            if(!file) { 
                alert("❌ 警告: ZIPフォルダの中にテキストファイル(.txt)がありません！"); 
                btn.innerText = "🧠 指定レースのデータ検索を実行"; return; 
            }
            // 🟥 【追跡5】検索実行（テキスト抽出・デコード）チェック ➔ 完全に維持！
            alert("➔ [5/7] [検索実行] 成功！テキストファイル '" + file.name + "' を確認。\nこれよりShift-JIS文字コードを日本語テキストへ翻訳します。");
            
            var textBuffer = await file.async("arraybuffer");
            var decoder = new TextDecoder("shift_jis");
            var text = decoder.decode(textBuffer);
            
            var allLines = text.split("\n");
            
            alert("➔ [翻訳成功] デコード処理を通過しました！\nデータ行数: " + allLines.length + "行。\nこれより条件に一致する馬をスキャンします。");
            
            var matched_horses = [];
            for(var i=0; i<allLines.length; i++) {
                var line = allLines[i].trim();
                if(!line) continue;
                
                // タブやスペースをバグを起こさず安全に切り分ける、静的サイト最強の文字列分割処理
                var d = [];
                var line_replaced = line.replace(/\t/g, " ");
                var raw_split = line_replaced.split(" ");
                for(var k=0; k<raw_split.length; k++) {
                    var clean_item = raw_split[k].trim();
                    if(clean_item !== "") {
                        d.push(clean_item);
                    }
                }
                
                if(d.length < 7) continue;
                
                try {
                    var date_string = d[0].toString();
                    var file_date = date_string.replace(/-/g,"").replace(/\//g,"").trim();
                    if(file_date.length === 6) { file_date = "20" + file_date; }
                    
                    var file_venue = d[1].toString().trim();
                    var file_race = d[2].toString().toUpperCase().replace("R","").trim() + "R";
                    
                    if(file_date === cG && file_venue === cV && file_race === cR) {
                        // オーナーの引っこ抜いてくれた本物テキストの列配置に完全100%適合！
                        var waku_clean = parseInt(d[3]) || 0;
                        var num_clean = parseInt(d[4]) || 0;
                        var name_clean = d[5].toString().trim();   // 5番目が馬名
                        var jockey_clean = d[6] ? d[6].toString().trim() : "不明"; // 6番目が騎手
                        var odds_clean = d[7] ? parseFloat(d[7].toString().replace("倍","").trim()) : 0.0; // 7番目がオッズ

                        var order_clean = 99;
                        if(d.length > 8 && d[8] !== "") {
                            var order_raw = d[8].toString().replace("着","").replace("確定","").trim();
                            if(!isNaN(order_raw) && order_raw !== "") order_clean = parseInt(order_raw);
                        }
                        
                        var tan_pay_calc = (order_clean === 1) ? Math.floor(odds_clean * 100) : 0;
                        var fuku_pay_calc = (order_clean <= 3) ? Math.floor((odds_clean * 0.3) * 100) : 0;

                        matched_horses.push({
                            waku: waku_clean, num: num_clean, name: name_clean, jockey: jockey_clean, odds: odds_clean, order: order_clean, tan_pay: tan_pay_calc, fuku_pay: fuku_pay_calc
                        });
                    }
                } catch(e) { continue; }
            }

            // 🟥 【追跡6】検索結果取得チェック ➔ 完全に維持！
            alert("➔ [6/7] [検索結果取得成功] \nデータベースからのスキャンが完了しました。\n■ 一致した競走馬の数: " + matched_horses.length + "頭");

            if (matched_horses.length === 0) {
                alert("⚠️ 警告: ZIPデータは正常に開きましたが、選択された開催日のデータが一致しませんでした。\n【検証用例】カレンダーから 2026-05-03 ➔ 東京 ➔ 11R（NHKマイルC）でお試しください。");
                btn.innerText = "🧠 指定レースのデータ検索を実行"; return;
            }

            matched_horses.sort((a, b) => a.num - b.num);

            // 🟥 【追跡7】画面へ返却チェック ➔ 完全に維持！
            alert("➔ [7/7] [画面へ返却成功] 今からテーブルに出馬表を描き出します！");
            
            var html = ""; var total_bets = 0; var t_ret = 0;
            for (var j = 0; j < matched_horses.length; j++) {
                var h = matched_horses[j]; total_bets++;
                var sig = "-";
                if (h.order === 1 || h.odds <= 3.5) { sig = "<span style='color:#dc2626;font-weight:bold;'>◎ 本命</span>"; }
                else if (cB === "内枠有利" && h.waku <= 3 && h.order <= 3) { sig = "<span style='color:#d4af37;font-weight:bold;'>🔥 激アツ内穴</span>"; }
                else if (cB === "外伸び有利" && h.waku >= 6 && h.order <= 3) { sig = "<span style='color:#319795;font-weight:bold;'>⚡ 激アツ外穴</span>"; }
                else if (h.order <= 3) { sig = "<span style='color:#ecc94b;'>⭐ 穴馬</span>"; }
                
                var od = h.order === 1 ? "<span class='badge-win'>1着</span>" : (h.order <= 3 ? "<span class='badge-place'>" + h.order + "着</span>" : h.order + "着");
                var pr = "-";
                
                if (cT === "1" && h.order === 1) { 
                    pr = "<span style='color:#dc2626;font-weight:bold;'>+" + (Math.floor(cM * (h.tan_pay / 100))).toLocaleString() + "円</span>"; 
                    t_ret += Math.floor(cM * (h.tan_pay / 100)); 
                } else if (cT === "2" && h.order <= 3) { 
                    pr = "<span style='color:#319795;font-weight:bold;'>+" + (Math.floor(cM * (h.fuku_pay / 100))).toLocaleString() + "円</span>"; 
                    t_ret += Math.floor(cM * (h.fuku_pay / 100)); 
                } else if (cT === "3" && h.order <= 3) {
                    var spec = h.tan_pay + h.fuku_pay;
                    pr = "<span style='color:#e53e3e;font-weight:bold;'>回収 +" + (Math.floor(cM * (spec / 100))).toLocaleString() + "円</span>";
                    t_ret += Math.floor(cM * (spec / 100));
                }
                
                html += `<tr><td>${h.waku}枠${h.num}番</td><td>${sig}</td><td><b>${h.name}</b></td><td>${h.jockey}</td><td>${h.odds}倍</td><td>${od}</td><td>${pr}</td></tr>`;
            }

            var t_inv = total_bets * cM; var pure = t_ret - t_inv;
            document.getElementById("res-invest").innerText = t_inv.toLocaleString() + "円";
            document.getElementById("res-return").innerText = t_ret.toLocaleString() + "円";
            document.getElementById("res-pure").innerText = (pure >= 0 ? "+" : "") + pure.toLocaleString() + "円";
            document.getElementById("res-pure").style.color = pure >= 0 ? "#dc2626" : "#4a5568";
            
            document.getElementById("predict-tbody").innerHTML = html;
            document.getElementById("report-card").style.display = "block";
            
            alert("🏆 [完全大開通達成！！] すべての工程が1ミリのエラーもなく100%完全に通過しました！！JRA全頭出馬表の大出現です！！！");
            btn.innerText = "🧠 指定レースのデータ検索を実行";
        })
        .catch(err => {
            alert("❌ 警告: 処理の途中でプログラムがクラッシュして停止しました。\n■ 原因エラー: " + err.message);
            btn.innerText = "🧠 指定レースのデータ検索を実行";
        });
}
