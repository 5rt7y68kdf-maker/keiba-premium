// 🌪️【JRAデータベース超精密検索＆表記揺れ完全自動吸収・開通決定版 app.js】

// --------------------------------------------------
// 1. JRA競馬場コード＆名称マップ (双方向マッピング)
// --------------------------------------------------
var VENUE_CODES = {
    "01": "札幌", "02": "函館", "03": "福島", "04": "新潟",
    "05": "東京", "06": "中山", "07": "中京", "08": "京都",
    "09": "阪神", "10": "小倉",
    "札幌": "01", "函館": "02", "福島": "03", "新潟": "04",
    "東京": "05", "中山": "06", "中京": "07", "京都": "08",
    "阪神": "09", "小倉": "10",
    "東": "05", "中": "06", "阪": "09", "京": "08", "福": "03", "新": "04", "札": "01", "函": "02", "小": "10"
};

function getVenueCode(v) {
    if (!v) return "";
    var clean = v.toString().replace(/競馬場/g, "").replace(/\s+/g, "").trim();
    if (VENUE_CODES[clean]) return VENUE_CODES[clean].length === 2 && !isNaN(clean) ? clean : VENUE_CODES[clean];
    var m = clean.match(/\d+/);
    if (m) {
        var num = parseInt(m[0], 10);
        var code = (num < 10 ? "0" : "") + num;
        if (VENUE_CODES[code]) return code;
    }
    return "";
}

function getVenueName(v) {
    if (!v) return "";
    var clean = v.toString().replace(/競馬場/g, "").replace(/\s+/g, "").trim();
    if (VENUE_CODES[clean] && isNaN(clean)) return clean;
    var code = getVenueCode(clean);
    return VENUE_CODES[code] || clean;
}

function normalizeDate(d) {
    if (!d) return "";
    var nums = d.toString().match(/\d+/g);
    if (!nums) return "";
    var clean = nums.join("");
    if (clean.length === 6) clean = "20" + clean;
    return clean;
}

function normalizeRaceNum(r) {
    if (!r) return 0;
    var m = r.toString().match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
}

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
// 2. メインデータ検索・解凍・描画エンジン
// --------------------------------------------------
function loadAndUnzipJraDatabase() {
    alert("➔ [1/7] [ボタン押下成功] 正常にプログラムが作動しました！");

    var rawDate = findDomValue(["sim-date", "sim_date", "date", "race-date", "race_date"]);
    var rawVenue = findDomValue(["sim-venue", "sim_venue", "venue", "race-venue", "race_venue"]);
    var rawRace = findDomValue(["sim-race", "sim_race", "race", "race-num", "race_num"]);
    var btn = findDomElement(["predict-btn", "predict_btn", "btn-predict", "submit-btn"]);
    var tbody = findDomElement(["predict-tbody", "predict_tbody", "result-tbody", "tbody"]);

    if (!rawDate) {
        alert("❌ 日付が選択されていません。日付入力フォームをご確認ください。");
        return;
    }

    var cG = normalizeDate(rawDate);
    var cV_Name = getVenueName(rawVenue);
    var cV_Code = getVenueCode(rawVenue);
    var cR = normalizeRaceNum(rawRace);

    if (btn) btn.innerText = "⚡ データ照合中...";

    var generated_search_id = "日付:" + cG + " | 競馬場:" + (cV_Name || rawVenue) + "(" + cV_Code + ") | レース:" + cR + "R";
    alert("📋 [検索対象パラメータ]\n-----------------------------------------\n" +
          "■ 日付 (cG): " + cG + "\n" +
          "■ 競馬場: " + cV_Name + " [コード: " + cV_Code + "]\n" +
          "■ レース番号 (cR): " + cR + "R\n" +
          "■ 生成検索ID: 「" + generated_search_id + "」");

    var target_zip_url = "racedata.zip";
    alert("➔ [2/7] [API到達成功] これより '" + target_zip_url + "' へ通信(fetch)を開始します。");

    fetch(target_zip_url, { method: "GET", cache: "no-cache" })
        .then(function(response) {
            alert("➔ [3/7] [通信応答成功] HTTPステータス: " + response.status);
            if (!response.ok) {
                alert("❌ 警告: サーバー上に 'racedata.zip' が見つかりません。ファイル名と配置場所をご確認ください。");
                throw new Error("ZIPファイル取得失敗 (HTTP " + response.status + ")");
            }
            return response.arrayBuffer();
        })
        .then(async function(buffer) {
            alert("➔ [4/7] [ZIP読み込み成功] JSZipで解凍を行います。");

            if (typeof JSZip === "undefined") {
                alert("❌ エラー: JSZipライブラリが読み込まれていません。HTMLに <script src=\".../jszip.min.js\"></script> を追加してください。");
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

            alert("📦 [ZIP内ファイル検知]\n■ 総ファイル数: " + Object.keys(zip.files).length + "個\n■ 対象ファイル: " + (file ? file.name : "なし"));

            if (!file) {
                alert("❌ 警告: ZIPフォルダ内にテキストファイル(.txt)が存在しません！");
                if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
                return;
            }

            alert("➔ [5/7] [デコード開始] ファイル '" + file.name + "' をShift-JIS解読します。");
            var textBuffer = await file.async("arraybuffer");
            var decoder = new TextDecoder("shift_jis");
            var text = decoder.decode(textBuffer);
            var allLines = text.split("\n");

            alert("➔ [デコード成功] 総行数: " + allLines.length + "行。マルチ照合エンジンを起動します。");

            var matched_horses = [];

            for (var i = 0; i < allLines.length; i++) {
                var line = allLines[i].trim();
                if (!line) continue;

                var d = line.split(/[\s,\t|]+/).map(function(item) { return item.trim(); }).filter(Boolean);
                if (d.length < 5) continue;
                if (line.indexOf("日付") !== -1 || line.toLowerCase().indexOf("date") !== -1) continue;

                try {
                    var match = false;
                    var offset = 3;

                    // 照合ロジック 1: 列別正規化マッチング (d[0]=日付, d[1]=競馬場, d[2]=レース)
                    var fileDate = normalizeDate(d[0]);
                    var fileVenueName = getVenueName(d[1]);
                    var fileVenueCode = getVenueCode(d[1]);
                    var fileRaceNum = normalizeRaceNum(d[2]);

                    if (fileDate === cG && (fileVenueName === cV_Name || fileVenueCode === cV_Code) && fileRaceNum === cR) {
                        match = true;
                        offset = 3;
                    }

                    // 照合ロジック 2: 12桁 JRA レースID直判定 (d[0]=12桁ID)
                    if (!match && d[0] && d[0].length === 12 && /^\d+$/.test(d[0])) {
                        var idStr = d[0];
                        var idDate8 = idStr.substring(0, 8);
                        var idVenueCode2 = idStr.substring(8, 10);
                        var idRaceNum2 = parseInt(idStr.substring(10, 12), 10);

                        var idYear = idStr.substring(0, 4);
                        var idVenueCode1 = idStr.substring(4, 6);
                        var idRaceNum1 = parseInt(idStr.substring(10, 12), 10);

                        if (idDate8 === cG && idVenueCode2 === cV_Code && idRaceNum2 === cR) {
                            match = true;
                            offset = 1;
                        } else if (idYear === cG.substring(0, 4) && idVenueCode1 === cV_Code && idRaceNum1 === cR) {
                            match = true;
                            offset = 1;
                        }
                    }

                    if (match) {
                        var waku_clean = parseInt(d[offset], 10) || 0;
                        var num_clean = parseInt(d[offset + 1], 10) || 0;
                        var name_clean = d[offset + 2] ? d[offset + 2].toString().trim() : "";
                        var jockey_clean = d[offset + 3] ? d[offset + 3].toString().trim() : "不明";
                        var odds_raw = d[offset + 4] ? d[offset + 4].toString().replace("倍", "").trim() : "0.0";
                        var odds_clean = parseFloat(odds_raw) || 0.0;

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
                } catch (e) { continue; }
            }

            alert("➔ [6/7] [照合完了] 一致競走馬: " + matched_horses.length + "頭検出！");

            if (matched_horses.length === 0) {
                alert("❌ 【照合不一致エラー】\n-----------------------------------------\n" +
                      "■ 該当レースの馬データが見つかりませんでした。\n" +
                      "■ 検索条件: 「" + generated_search_id + "」\n\n" +
                      "💡 テキスト内の日付（例: 20260503）・競馬場（例: 東京/05）・レース番号（例: 11R/11）をご確認ください。");
                if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
                return;
            }

            matched_horses.sort(function(a, b) { return a.num - b.num; });

            alert("➔ [7/7] [出馬表描画] テーブルへ " + matched_horses.length + "頭を出力します。");

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
            alert("🏆 【完全大開通！！】 JRA全頭出馬表 (" + matched_horses.length + "頭) の大出現です！！！");
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        })
        .catch(function(err) {
            alert("❌ 処理停止クラッシュ:\n" + err.message);
            if (btn) btn.innerText = "🧠 指定レースのデータ検索を実行";
        });
}
