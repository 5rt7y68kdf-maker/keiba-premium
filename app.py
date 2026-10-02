# -*- coding: utf-8 -*-
import os
import zipfile
from flask import Flask, jsonify, request

app = Flask(__name__)

# グローバルインデックス
RACE_INDEX = {}

def build_race_database_index_with_logs():
    """
    【確認4、5、6】
    サーバー起動時にracedata.zipを解凍し、インデックス作成のどこで
    処理が停止・クラッシュしているかをログに完全実況する関数
    """
    global RACE_INDEX
    RACE_INDEX = {}
    
    zip_path = "racedata.zip"
    print("➔ [段階3-A] [Python] ZIP/インデックス読み込み処理を開始します。", flush=True)
    print(f"📂 [Python] 現在のサーバー内ファイル一覧: {os.listdir('.')}", flush=True)
    
    if not os.path.exists(zip_path):
        print(f"❌ [Python] 致命的エラー: サーバー上に {zip_path} が存在しません。", flush=True)
        return

    print(f"⭕️ [Python] {zip_path} の存在を確認。これよりzipfileによる展開に入ります。", flush=True)
    
    try:
        # 🛑 【確認4】ZIPファイル読み込み開始チェック
        print("➔ [段階3-B] [Python] zipfile.ZipFile を開きます。", flush=True)
        with zipfile.ZipFile(zip_path, 'r') as z:
            
            # 🛑 【確認5】ZIP内のファイル認識チェック
            print("➔ [段階4] [Python] ZIP内部のファイル走査を開始します。", flush=True)
            namelist = z.namelist()
            print(f"📦 [Python] ZIP内に入っているファイル名リスト: {namelist}", flush=True)
            
            target_file = None
            for name in namelist:
                if name.lower().endswith('.txt'):
                    target_file = name
                    break
            
            if not target_file:
                print("❌ [Python] エラー: ZIP内にテキストファイル(.txt)が1つも見つかりません。", flush=True)
                return
                
            print(f"⭕️ [Python] 読み込み対象テキストファイルを認識: {target_file}", flush=True)
            raw_bytes = z.read(target_file)
            print(f"📡 [Python] データの取り込みに成功（バイト数: {len(raw_bytes)} bytes）", flush=True)
            
            # デコード処理
            text_content = raw_bytes.decode('shift_jis', errors='ignore')
            lines = text_content.splitlines()
            print(f"📡 [Python] テキストデータの行分割に成功（総行数: {len(lines)} 行）", flush=True)
            
            # 🛑 【確認6】インデックスの正常作成チェック
            print("➔ [段階5] [Python] メモリへのデータインデックス作成（パース）を開始します。", flush=True)
            success_count = 0
            
            for line in lines:
                line_clean = line.strip()
                if not line_clean: continue
                
                # 汎用区切り（スペース・タブ・カンマ対応）
                import re
                d = re.split(r'[\s,]+', line_clean)
                
                if not d or len(d) < 7: continue
                if "日付" in d or "date" in d or "開催日" in d: continue
                
                try:
                    date_clean = d[0].replace("-", "").replace("/", "").strip()
                    if len(date_clean) == 6: date_clean = "20" + date_clean
                    
                    venue_clean = d[1].strip()
                    race_clean = d[2].upper().replace("R", "").strip() + "R"
                    
                    index_key = f"{date_clean}_{venue_clean}_{race_clean}"
                    
                    horse_data = {
                        "waku": d[3], "num": d[4], "name": d[5], "jockey": d[6], "odds": d[7] if len(d) > 7 else "0.0"
                    }
                    
                    if index_key not in RACE_INDEX:
                        RACE_INDEX[index_key] = []
                    RACE_INDEX[index_key].append(horse_data)
                    success_count += 1
                except Exception:
                    continue
                    
            print(f"🏆 [Python] インデックス構築が完了しました！総レース数: {len(RACE_INDEX)}, 総登録馬数: {success_count}頭", flush=True)
            
    except Exception as e:
        print(f"❌ [Python] ZIP処理中に致命的な例外が発生しました。原因: {str(e)}", flush=True)

# サーバー起動と同時にログ出力しながら自動解凍を走らせる
build_race_database_index_with_logs()


@app.route('/api/predict', methods=['GET'])
def get_prediction():
    # 🛑 【確認3】Flask側の検索ルート呼び出しチェック（フロントからのリクエスト到達チェック）
    print("➔ [段階2-B] [Python] Flask APIがフロントからの通信を検知・受信しました！", flush=True)
    
    cond_date = request.args.get('date', '').strip()
    cond_venue = request.args.get('venue', '').strip()
    cond_race = request.args.get('race', '').upper().replace("R", "").strip() + "R"
    
    search_key = f"{cond_date}_{cond_venue}_{cond_race}"
    print(f"🔍 [Python] インデックス検索を実行します。検索キー: {search_key}", flush=True)
    
    # メモリ内検索
    results = RACE_INDEX.get(search_key, [])
    print(f"➔ [Python] 検索処理終了。インデックスから抽出された馬データ件数: {len(results)}件", flush=True)
    
    return jsonify(results)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
