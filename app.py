# -*- coding: utf-8 -*-
import os
import zipfile
import io
from flask import Flask, jsonify, request

app = Flask(__name__)

# 🌟高速検索用グローバルインデックス（メモリ上に保持）
RACE_INDEX = {}

def build_race_database_index_from_zip():
    """
    Renderの裏側でracedata.zipを強制全自動解凍し、
    オーナーの本物データ（スペース区切り・5番目馬名・6番目騎手）に完全適合させる関数
    """
    global RACE_INDEX
    RACE_INDEX = {} # 初期化
    
    zip_path = "racedata.zip"
    if not os.path.exists(zip_path):
        print(f"⚠️ {zip_path} が見つかりません。")
        return

    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            target_file = None
            for name in z.namelist():
                if name.lower().endswith('.txt'):
                    target_file = name
                    break
            
            if not target_file:
                print("❌ ZIPの中にテキストファイル(.txt)が見つかりません。")
                return
                
            raw_bytes = z.read(target_file)
            # 日本語Shift-JISの文字化けを完全防御
            try:
                text_content = raw_bytes.decode('cp932', errors='ignore')
            except Exception:
                text_content = raw_bytes.decode('shift_jis', errors='ignore')

            lines = text_content.splitlines()
            print(f"📡 Pythonエンジンが {target_file} の全頭スキャンを開始しました。（全 {len(lines)} 行）")

            for line in lines:
                line_clean = line.strip()
                if not line_clean: continue
                
                # 🌟【重要】スペースやタブの連続を完璧に分解する
                d = line_clean.split()
                if not d or len(d) < 7: continue
                if "日付" in d or "date" in d: continue
                
                try:
                    # 日付の変形処理（ハイフン除去・8桁純化）
                    date_raw = d[0].replace("-", "").replace("/", "").strip()
                    date_clean = "20" + date_raw if len(date_raw) == 6 else date_raw
                    venue_clean = d[1].strip()
                    race_clean = d[2].upper().replace("R", "").strip() + "R"
                    
                    # 検索の超高速鍵（インデックスキー）を作成
                    index_key = f"{date_clean}_{venue_clean}_{race_clean}"
                    
                    # 🌟オーナーから送ってもらった本物のデータ列に100%適合！
                    waku_clean = int(d[3]) if d[3].isdigit() else 0
                    num_clean = int(d[4]) if d[4].isdigit() else 0
                    name_clean = d[5].strip()    # 👈5番目が本物の競走馬名！
                    jockey_clean = d[6].strip()  # 👈6番目が本物の騎手名！
                    odds_clean = float(d[7].replace("倍", "").strip()) if len(d) > 7 else 0.0
                    
                    order_clean = 99
                    if len(d) > 8:
                        order_raw = d[8].replace("着", "").replace("確定", "").strip()
                        if order_raw.isdigit(): order_clean = int(order_raw)
                    
                    tan_pay_calc = int(odds_clean * 100) if order_clean == 1 else 0
                    fuku_pay_calc = int((odds_clean * 0.3) * 100) if order_clean <= 3 else 0

                    horse_data = {
                        "waku": waku_clean, "num": num_clean, "name": name_clean, "jockey": jockey_clean,
                        "odds": odds_clean, "order": order_clean, "tan_pay": tan_pay_calc, "fuku_pay": fuku_pay_calc
                    }
                    
                    if index_key not in RACE_INDEX:
                        RACE_INDEX[index_key] = []
                    RACE_INDEX[index_key].append(horse_data)
                    
                except Exception:
                    continue

        print(f"🏆 Python側のZIP強制自動解凍インデックスが完成しました！総レース数: {len(RACE_INDEX)}")
    except Exception as e:
        print(f"❌ ZIP解凍中にエラーが発生しました: {str(e)}")

# サーバー起動と同時に、Pythonがracedata.zipを一撃で全自動強制解凍！！！
build_race_database_index_from_zip()

@app.route('/', methods=['GET'])
def index_page():
    if os.path.exists("index.html"):
        with open("index.html", "r", encoding="utf-8") as f:
            return f.read()
    return "❌ index.html が見つかりません。"

@app.route('/api/predict', methods=['GET'])
def get_prediction():
    cond_date = request.args.get('date', '').replace('-', '').replace('/', '').strip()
    cond_venue = request.args.get('venue', '').strip()
    cond_race = request.args.get('race', '').upper().replace("R", "").strip() + "R"
    
    search_key = f"{cond_date}_{cond_venue}_{cond_race}"
    results = RACE_INDEX.get(search_key, [])
    results.sort(key=lambda x: x['num'])
    
    response = jsonify(results)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
