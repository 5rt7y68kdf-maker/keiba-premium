# -*- coding: utf-8 -*-
import os
import zipfile
import io
from flask import Flask, jsonify, request

app = Flask(__name__)

# 🌟高速検索用グローバルインデックス（メモリ上に保持）
RACE_INDEX = {}

def build_race_database_index():
    """
    racedata.zipを一瞬で解凍し、大文字小文字の壁や区切り文字のズレを
    すべて吸収しながら「日付_競馬場_レース」の無敵インデックスを自動作成する関数
    """
    global RACE_INDEX
    RACE_INDEX = {} # 初期化
    
    zip_path = "racedata.zip"
    if not os.path.exists(zip_path):
        print(f"⚠️ {zip_path} が見つかりません。データ空っぽで起動します。")
        return

    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            target_file_name = None
            for name in z.namelist():
                if name.lower().endswith('.txt'):
                    target_file_name = name
                    break
            
            if not target_file_name:
                print("⚠️ ZIP内に入っているテキストファイルが見つかりません。")
                return
                
            raw_data = z.read(target_file_name)
            encodings = ["cp932", "utf-8-sig", "utf-8", "shift_jis"]
            text_content = None
            
            for enc in encodings:
                try:
                    text_content = raw_data.decode(enc)
                    break
                except UnicodeDecodeError:
                    continue
            
            if not text_content:
                print("❌ データの文字コードをデコードできませんでした。")
                return

            lines = text_content.splitlines()
            print(f"📡 1万8,781頭の大元データをスキャン中...（全 {len(lines)} 行）")

            for line in lines:
                line_clean = line.strip()
                if not line_clean: continue
                
                if ',' in line_clean:
                    d = [x.strip() for x in line_clean.split(',')]
                elif '\t' in line_clean:
                    d = [x.strip() for x in line_clean.split('\t')]
                else:
                    d = [x.strip() for x in line_clean.split() if x.strip()]
                
                if not d or "日付" in d or "date" in d or "開催日" in d: continue
                if len(d) < 8: continue
                
                try:
                    date_raw = d[0].replace("-", "").replace("/", "").strip()
                    date_clean = "20" + date_raw if len(date_raw) == 6 else date_raw
                    venue_clean = d[1].strip()
                    race_clean = d[2].upper().replace("R", "").strip() + "R"
                    
                    index_key = f"{date_clean}_{venue_clean}_{race_clean}"
                    
                    waku_clean = int(d[3])
                    num_clean = int(d[4])
                    name_clean = d[5].strip()
                    jockey_clean = d[6].strip()
                    odds_clean = float(d[7].replace("倍", "").strip())
                    
                    fuku_clean = float(d[8].replace("倍", "").strip()) if len(d) > 8 and d[8] else 0.0
                    order_clean = 99
                    if len(d) > 9 and d[9]:
                        order_raw = d[9].replace("着", "").replace("確定", "").strip()
                        if order_raw.isdigit(): order_clean = int(order_raw)
                    
                    tan_pay_calc = int(odds_clean * 100) if order_clean == 1 else 0
                    fuku_pay_calc = int(fuku_clean * 100) if order_clean <= 3 else 0

                    horse_data = {
                        "waku": waku_clean, "num": num_clean, "name": name_clean, "jockey": jockey_clean,
                        "odds": odds_clean, "fuku_min": fuku_clean, "order": order_clean,
                        "tan_pay": tan_pay_calc, "fuku_pay": fuku_pay_calc
                    }
                    
                    if index_key not in RACE_INDEX:
                        RACE_INDEX[index_key] = []
                    RACE_INDEX[index_key].append(horse_data)
                    
                except Exception as e:
                    continue

        print(f"🏆 インデックス構築が完了しました！総レース数: {len(RACE_INDEX)}")
    except Exception as e:
        print(f"❌ ZIPファイルの展開中に致命的なエラーが発生しました: {str(e)}")

# サーバー起動時に、1万8,781頭のZIPインデックスをバックグラウンドで全自動作成！
build_race_database_index()

@app.route('/', methods=['GET'])
def index_page():
    html_file = "index.html"
    if os.path.exists(html_file):
        with open(html_file, "r", encoding="utf-8") as f:
            return f.read()
    return "❌ index.html が見つかりません。リポジトリのルートに配置してください。"

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
