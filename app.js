// 🌪️【JRAデータベース超精密検索＆全表記揺れ自動統合・完全解開通版 app.js】

// --------------------------------------------------
// 1. JRA 10競馬場コード＆名称 相互変換辞書
// --------------------------------------------------
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

// 競馬場入力値（例: "東京", "05", "東", "東京競馬場", "東京(05)"）から名称とコードを両方完全解決
function resolveVenueInfo(v) {
    if (!v) return { name: "", code: "" };
    var raw = v.toString().replace(/競馬場/g, "").replace(/\s+/g, "").trim();
    var code = "";
    var name = "";

    if (VENUE_MAP[raw]) {
        if (/^\d+$/.test(raw)) {
            code = raw.length === 1 ? "0" + raw : raw;
            name = VENUE_MAP[code] || VENUE_MAP[raw];
        } else {
            name = VENUE_MAP[raw] && isNaN(VENUE_MAP[raw]) ? VENUE_MAP[raw] : raw;
            code = VENUE_MAP[name] || VENUE_MAP[raw] || "";
        }
    } else {
        var mName = raw.match(/(札幌|函館|福島|新潟|東京|中山|中京|京都|阪神|小倉|東|中|阪|京|福|新|札|函|小)/);
        if (mName) {
            var extractedName = mName[0];
            name = VENUE_MAP[extractedName] && isNaN(VENUE_MAP[extractedName]) ? VENUE_MAP[extractedName] : extractedName;
            code = VENUE_MAP[name] || "";
        }
        if (!code) {
            var mCode = raw.match(/\d+/);
            if (mCode) {
                var num = parseInt(mCode[0], 10);
                code = (num < 10 ? "0" : "") + num;
                name = VENUE_MAP[code] || "";
            }
        }
    }
    return { name: name, code: code };
}

// 日付の正規化（例: "2026-05-03" / "2026/05/03" / "260503" ➔ "20260503"）
function normalizeDate(d) {
    if (!d) return "";
    var nums = d.toString().match(/\d+/g);
    if (!nums) return "";
    var clean = nums.join("");
    if (clean.length === 6) clean = "20" + clean;
    return clean;
}

// レース番号の正規化（例: "11R" / "第11レース" / "１１" ➔ 11）
function normalizeRaceNum(r) {
    if (!r) return 0;
    var m = r.toString().match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
}

// HTMLエレメント安全取得関数
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
// 2. メインデータ検索・解凍・描画関数
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
          "■ 競馬場名: " + tVenue.name + " [JRAコード: " + tVenue.code + "]\n" +
          "■ レース番号 (cR): " + cR + "R\n" +
          "■ 検索対象識別ID: 「" + generated_search_id + "」");

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

            alert("➔ [デコード成功] データ総行数: " + allLines.length + "行。マルチパターン照合を開始します。");

            var matched_horses = [];

            for (var i = 0; i < allLines.length; i++) {
                var line = allLines[i].trim();
                if (!line) continue;

                var d = line.split(/[\s,\t|]+/).map(function(item){ return item.trim(); }).filter(Boolean);
                if (d.length < 5) continue;
                if (line.indexOf("日付") !== -1 || line.toLowerCase().indexOf("date") !== -1) continue;

                try {
                    var match = false;
                    var waku = 1, num = 1, name = "", jockey = "不明", odds = 0.0;

                    // パターン1: 0列目が12桁レースID (202605030511)
                    if (d[0].length === 12 && /^\d+$/.test(d[0])) {
                        var idStr = d[0];
                        var fDate = idStr.substring(0, 8);
                        var fVenueCode = idStr.substring(8, 10);
                        var fRaceNum = parseInt(idStr.substring(10, 12), 10);

                        if (fDate === cG && fVenueCode === tVenue.code && fRaceNum === cR) {
                            match = true;
                            waku = parseInt(d[1], 10) || 1;
                            num = parseInt(d[2], 10) || 1;
                            name = d[3] || "";
                            jockey = d[4] || "不明";
                            odds = parseFloat((d[5] || "0").replace("倍","").trim()) || 0.0;
                        }
                    }

                    // パターン2: 標準マルチカラム (d[0]=日付, d[1]=競馬場, d[2]=レース番号)
                    if (!match && d.length >= 6) {
                        var fDateB = normalizeDate(d[0]);
                        var fVenueB = resolveVenueInfo(d[1]);
                        var fRaceNumB = normalizeRaceNum(d[2]);

                        if (fDateB === cG && (fVenueB.code === tVenue.code || fVenueB.name === tVenue.name) && fRaceNumB === cR) {
                            match = true;
                            var offset = d.length >= 8 ? 3 : 3;
                            waku = parseInt(d[offset], 10) || 1;
                            num = parseInt(d[offset + 1], 10) || 1;
                            name = d[offset + 2] || "";
                            jockey = d[offset + 3] || "不明";
                            odds = parseFloat((d[offset + 4] || "0").replace("倍","").trim()) || 0.0;
                        }
                    }

                    if (match && name) {
                        matched_horses.push({
                            waku: waku,
                            num: num,
                            name: name,
                            jockey: jockey,
                            odds: isNaN(odds) ? 0.0 : odds
                        });
                    }
                } catch(e) { continue; }
            }

            alert("➔ [6/7] [検索完了] 一致馬数: " + matched_horses.length + "頭");

            if (matched_horses.length === 0) {
                alert("❌ 【照合不一致エラー】\n-----------------------------------------\n" +
                      "■ 該当する馬データが見つかりませんでした。\n" +
                      "■ 検索条件: 「" + generated_search_id + "」\n\n" +
                      "💡 ZIP内のテキストデータの日付・競馬場・レース番号の記載形式をご確認ください。");
                if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行"; 
                return;
            }

            matched_horses.sort(function(a, b) { return a.num - b.num; });

            alert("➔ [7/7] [画面描画] テーブルに出馬表を出力します。");

            var html = "";
            for (var j = 0; j < matched_horses.length; j++) {
                var h = matched_horses[j];
                var sig = "-";
                if (h.odds > 0 && h.odds <= 3.5) { 
                    sig = "<span style=\"color:#dc2626;font-weight:bold;\">◎ 本命</span>"; 
                }
                var odds_disp = (h.odds > 0) ? h.odds + "倍" : "未確定";
                html += "<tr><td>" + h.waku + "枠" + h.num + "番</td><td>" + sig + "</td><td><b>" + h.name + "</b></td><td>" + h.jockey + "</td><td>" + odds_disp + "</td></tr>";
            }

            if (tbody) tbody.innerHTML = html;
            alert("🏆 【完全大開通！！】 出馬表 " + matched_horses.length + "頭の描画が完了しました！");
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        })
        .catch(function(err) {
            alert("❌ 処理クラッシュ停止:\n" + err.message);
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        });
}
