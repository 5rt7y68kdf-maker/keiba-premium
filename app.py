# -*- coding: utf-8 -*-
import os
import zipfile
import sys
from flask import Flask, jsonify, request

app = Flask(__name__)

# インデックス保持用
RACE_INDEX = {}

def build_race_database_index_debug():
    """
    サーバー起動時にracedata.zipの読み込みおよび
    インデックス作成処理のどこで止まるかを完全に追跡する関数
    """
    global RACE_INDEX
    RACE_INDEX = {}
    
    zip_path = "racedata.zip"
    print("➔ [4/7-A] [Python] ZIP/インデックス読み込み処理を開始します。")
    print(f"🔍 [Python] カレントディレクトリ内のファイル一覧: {os.listdir('.')}")
    
    if not os.path.exists(zip_path):
        print(f"❌ [Python] 致命的エラー: {zip_path} がサーバー上に物理的に存在しません。")
        return

    print(f"⭕️ [Python] {zip_path} の存在を確認しました。これより展開を試みます。")
    
    try:
        # 🟥 【デバッグ4】ZIPファイル読み込み開始チェック
        print("➔ [4/7-B] [Python] zipfile.ZipFile を開きます。")
        with zipfile.ZipFile(zip_path, 'r') as z:
            
            # 🟥 【デバッグ5】ZIP内のファイル認識チェック
            print("➔ [5/7-A] [Python] ZIP内部のファイルリストを走査します。")
            file_list = z.namelist()
            print(f"📦 [Python] ZIP内ファイル一覧: {file_list}")
            
            target_txt = None
            for name in file_list:
                if name.lower().endswith('.txt'):
                    target_file = name
                    break
            
            if not target_file:
                print("❌ [Python] エラー: ZIPの中にテキストファイル(.txt)が1つも見つかりません。")
                return
                
            print(f"⭕️ [Python] 解凍対象テキストファイルを特定: {target_file}")
            raw_bytes = z.read(target_file)
            print(f"📡 [Python] ファイルの読み込みに成功しました（バイト数: {len(raw_bytes)} bytes）")
            
            # デコード処理
            text_content = raw_bytes.decode('shift_jis', errors='ignore')
            lines = text_content.splitlines()
            print(f"📡 [Python] テキストデータの行分割に成功（総行数: {len(lines)} 行）")
            
            # インデックス構築
            print("➔ [5/7-B] [Python] メモリへのデータインデックスの構築を開始します。")
            success_count = 0
            for line in lines:
                line_clean = line.strip()
                if not line_clean: continue
                
                # カンマ区切り
                d = [x.strip() for x in line_clean.split(',')]
                if len(d) < 7: continue
                
                try:
                    date_clean = d[0].replace("-", "").replace("/", "").strip()
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
                except Exception as e:
                    continue
                    
            print(f"🏆 [Python] インデックス構築処理が完了しました。正常登録馬数: {success_count}頭, レースキー数: {len(RACE_INDEX)}")
            
    except Exception as e:
        print(f"❌ [Python] ZIP処理中に例外エラーが発生しました。エラー内容: {str(e)}")

# サーバー起動時にログ出力しながら構築を走らせる
build_race_database_index_debug()

@app.route('/api/predict', methods=['GET'])
def get_prediction():
    # 🟥 【デバッグ3】Flask側の検索ルート呼び出しチェック
    print("➔ [3/7] [Python] Flask APIがリクエストを検知しました（到達成功）")
    
    cond_date = request.args.get('date', '').strip()
    cond_venue = request.args.get('venue', '').strip()
    cond_race = request.args.get('race', '').upper().replace("R", "").strip() + "R"
    
    search_key = f"{cond_date}_{cond_venue}_{cond_race}"
    print(f"🔍 [Python] 検索を実行します。生成された検索キー: {search_key}")
    
    results = RACE_INDEX.get(search_key, [])
    print(f"➔ [5/7-C] [Python] 検索完了。メモリから抽出された馬データ件数: {len(results)}")
    
    return jsonify(results)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
