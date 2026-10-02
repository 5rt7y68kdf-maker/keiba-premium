# -*- coding: utf-8 -*-
import re
import requests
from bs4 import BeautifulSoup
import urllib3
import streamlit as st
import datetime
import pandas as pd
import numpy as np
import time
import json

# SSL Certificate Warnings Supression
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 日本標準時 JST
JST = datetime.timezone(datetime.timedelta(hours=9))

# 全国10競馬場コードマップ (JRA中央競馬)
VENUE_MAP = {
    "札幌": "01", "函館": "02", "福島": "03", "新潟": "04",
    "東京": "05", "中山": "06", "中京": "07", "京都": "08",
    "阪神": "09", "小倉": "10"
}
VENUE_CODE_TO_NAME = {v: k for k, v in VENUE_MAP.items()}

ALL_TICKET_TYPES = ["単勝", "複勝", "枠連", "馬連", "ワイド", "馬単", "3連複", "3連単"]

TOP_JOCKEYS_S = ["ルメール", "川田", "武豊", "坂井", "横山武", "戸崎", "モレイラ", "レーン"]
TOP_JOCKEYS_A = ["松山", "鮫島克", "岩田望", "西村淳", "菅原明", "津村", "田辺", "デムーロ", "丹内"]

def extract_num(val):
    if not val: return 0
    if isinstance(val, int): return val
    m = re.search(r'(\d+)', str(val))
    return int(m.group(1)) if m else 0

def format_odds_str(val):
    if not val or "未確定" in str(val) or "失敗" in str(val):
        return "取得失敗 (未確定)"
    try:
        f_val = float(str(val).replace('倍', '').strip())
        if f_val > 0:
            return f"{f_val:.1f}倍"
    except (ValueError, TypeError):
        pass
    return "取得失敗 (未確定)"

def format_pop_str(val):
    if not val or "未確定" in str(val) or "失敗" in str(val):
        return "未確定"
    try:
        m = re.search(r'(\d+)', str(val))
        if m:
            i_val = int(m.group(1))
            if i_val > 0:
                return f"{i_val}人気"
    except (ValueError, TypeError, AttributeError):
        pass
    return "未確定"

def parse_horse_weight_str(txt):
    if not txt:
        return "未計量 (発走前)", 0
    clean_txt = str(txt).strip().replace(' ', '')
    if not clean_txt or clean_txt in ['--', '計不', '前計不']:
        return "未計量 (発走前)", 0
    clean_txt = re.sub(r'\s+', '', clean_txt)
    m = re.search(r'(\d{3,4})\s*\(([^)]+)\)', clean_txt)
    if m:
        w_val = m.group(1)
        diff_raw = m.group(2).replace('前', '')
        if diff_raw == '0':
            diff_str = '±0'
            diff_val = 0
        elif diff_raw.startswith('+'):
            diff_str = diff_raw
            try: diff_val = int(diff_raw.replace('+', ''))
            except: diff_val = 0
        elif diff_raw.startswith('-'):
            diff_str = diff_raw
            try: diff_val = int(diff_raw)
            except: diff_val = 0
        else:
            diff_str = f"+{diff_raw}"
            try: diff_val = int(diff_raw)
            except: diff_val = 0
        return f"{w_val}kg ({diff_str})", diff_val
    m2 = re.search(r'(\d{3,4})', clean_txt)
    if m2:
        return f"{m2.group(1)}kg", 0
    return "未計量 (発走前)", 0

def fetch_html(url, timeout=7, force_refresh=False):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
    }
    fetch_url = url
    if force_refresh:
        sep = "&" if "?" in url else "?"
        fetch_url = f"{url}{sep}_t={int(time.time()*1000)}"

    try:
        resp = requests.get(fetch_url, headers=headers, timeout=timeout, verify=False)
        if resp.status_code == 200:
            content = resp.content
            meta_cs = None
            m = re.search(rb'charset=[\"\']?([a-zA-Z0-9_-]+)', content[:2000], re.IGNORECASE)
            if m:
                meta_cs = m.group(1).decode('ascii', errors='ignore').lower()
            
            enc_candidates = []
            if meta_cs:
                if 'euc' in meta_cs: enc_candidates.append('euc-jp')
                elif 'utf' in meta_cs: enc_candidates.append('utf-8')
                elif 'shift' in meta_cs or 'sjis' in meta_cs or '932' in meta_cs: enc_candidates.append('cp932')
            
            for enc in ['euc-jp', 'utf-8', 'cp932']:
                if enc not in enc_candidates:
                    enc_candidates.append(enc)
            
            decoded_text = None
            for enc in enc_candidates:
                try:
                    candidate = content.decode(enc)
                    # Check that unicode replacement character is not in candidate
                    if '\ufffd' not in candidate[:3000]:
                        decoded_text = candidate
                        break
                except UnicodeDecodeError:
                    continue
            
            if not decoded_text:
                try:
                    decoded_text = content.decode('euc-jp', errors='replace')
                except Exception:
                    decoded_text = content.decode('utf-8', errors='replace')
                
            return BeautifulSoup(decoded_text, 'html.parser'), None
        return None, f"HTTP Status {resp.status_code}"
    except Exception as e:
        return None, f"通信エラー: {e}"

def generate_comprehensive_jra_calendar():
    cal = {}
    def add_day(y, m, d, venue_tuples):
        cal[(y, m, d)] = [{'venue': v[0], 'v_code': v[1], 'kai': v[2], 'nichi': v[3]} for v in venue_tuples]
        
    add_day(2026, 1, 5, [('中山', '06', 1, 1), ('京都', '08', 1, 1)])
    add_day(2026, 1, 10, [('中山', '06', 1, 2), ('京都', '08', 1, 2)])
    add_day(2026, 1, 11, [('中山', '06', 1, 3), ('京都', '08', 1, 3)])
    add_day(2026, 9, 26, [('中山', '06', 4, 8), ('中京', '07', 5, 8), ('阪神', '09', 4, 8)])
    add_day(2026, 9, 27, [('中山', '06', 4, 9), ('中京', '07', 5, 9), ('阪神', '09', 4, 9)])
    add_day(2026, 10, 3, [('東京', '05', 4, 1), ('京都', '08', 4, 1), ('新潟', '04', 4, 1)])
    add_day(2026, 10, 4, [('東京', '05', 4, 2), ('京都', '08', 4, 2), ('新潟', '04', 4, 2)])
    add_day(2026, 10, 10, [('東京', '05', 4, 3), ('京都', '08', 4, 3), ('新潟', '04', 4, 3)])
    add_day(2026, 10, 11, [('東京', '05', 4, 4), ('京都', '08', 4, 4), ('新潟', '04', 4, 4)])
    return cal

JRA_2026_CALENDAR = generate_comprehensive_jra_calendar()

def determine_target_race_id_from_params(date_str, venue_name, race_num):
    clean_date = re.sub(r'\D', '', str(date_str))
    if len(clean_date) < 8:
        return [f"2026060409{race_num:02d}"], None

    year_val = int(clean_date[:4])
    m_val = int(clean_date[4:6])
    d_val = int(clean_date[6:8])
    v_code = VENUE_MAP.get(venue_name, "06")
    r_str = f"{race_num:02d}"

    candidates = []
    
    # Priority 1: Calendar Exact Match
    if (year_val, m_val, d_val) in JRA_2026_CALENDAR:
        for item in JRA_2026_CALENDAR[(year_val, m_val, d_val)]:
            if item['venue'] == venue_name:
                exact_id = f"{year_val:04d}{v_code}{item['kai']:02d}{item['nichi']:02d}{r_str}"
                candidates.append(exact_id)

    # Priority 2: Estimated Kai/Nichi by Month
    estimated_kai = max(1, min(5, (m_val + 1) // 2))
    try:
        d_obj = datetime.date(year_val, m_val, d_val)
        day_nichi = ((d_obj.day - 1) % 12) + 1
    except Exception:
        day_nichi = 8

    primary_est = f"{year_val:04d}{v_code}{estimated_kai:02d}{day_nichi:02d}{r_str}"
    if primary_est not in candidates:
        candidates.append(primary_est)

    # Priority 3: Candidate Scanning Loop (kai: 1..5, nichi: 1..12)
    for k in range(1, 6):
        for n in range(1, 13):
            cand_id = f"{year_val:04d}{v_code}{k:02d}{n:02d}{r_str}"
            if cand_id not in candidates:
                candidates.append(cand_id)

    return candidates, None

def parse_jra_official_shutuba(soup):
    for noisy in soup.select('#Header, #Header_Nav, #SideBar, .SideBox, .PickupRace, #Footer'):
        noisy.decompose()

    area = soup.select_one('div.shutuba_area') or soup.select_one('table.shutuba') or soup.select_one('table[class*="shutuba"]') or soup.select_one('table[class*="race"]') or soup

    rows = area.find_all('tr')
    data_list = []
    seen_horses = set()

    for idx, r in enumerate(rows, start=1):
        tds = r.find_all(['td', 'th'])
        if len(tds) < 3: continue

        horse_name = None
        horse_a = r.select_one('a[href*="horse"]') or r.select_one('.horse_name a') or r.select_one('span.horse_name')
        if horse_a:
            horse_name = horse_a.text.strip()
        else:
            for td in tds:
                txt = td.text.strip()
                if len(txt) >= 2 and not txt.isdigit() and not any(k in txt for k in ['馬名', '競走馬', '枠番', '馬番', '騎手', '性齢', '斤量', 'タイム']):
                    if re.search(r'[\u30A0-\u30FF]{2,}', txt):
                        horse_name = txt
                        break

        if not horse_name or horse_name in ['馬名', '競走馬', '馬 名'] or horse_name in seen_horses:
            continue

        jockey_name = "未定義"
        j_a = r.select_one('a[href*="jockey"]') or r.select_one('.jockey') or r.select_one('td.jockey')
        if j_a:
            jockey_name = j_a.text.strip()
        else:
            for td in tds:
                txt = td.text.strip()
                if any(j in txt for j in TOP_JOCKEYS_S + TOP_JOCKEYS_A):
                    jockey_name = txt
                    break

        umaban = None
        for td in tds:
            cls_s = " ".join([str(c).lower() for c in td.get('class', [])])
            txt = td.text.strip()
            if 'umaban' in cls_s or 'num' in cls_s or 'uma' in cls_s:
                m = re.search(r'(\d+)', txt)
                if m and 1 <= int(m.group(1)) <= 18:
                    umaban = int(m.group(1))
                    break

        if umaban is None:
            for td in tds[:2]:
                txt = td.text.strip()
                if txt.isdigit() and 1 <= int(txt) <= 18:
                    umaban = int(txt)
                    break

        if umaban is None:
            umaban = len(data_list) + 1

        hw_str = "未計量 (発走前)"
        hw_diff = 0
        for td in tds:
            txt = td.text.strip()
            if re.search(r'\d{3,4}\s*\(', txt):
                hw_str, hw_diff = parse_horse_weight_str(txt)
                break

        seen_horses.add(horse_name)

        data_list.append({
            "印": "・",
            "馬番": umaban,
            "馬名": horse_name,
            "騎手": jockey_name,
            "単勝オッズ": "取得失敗 (未確定)",
            "人気": "未確定",
            "馬体重": hw_str,
            "体重増減": hw_diff
        })

    data_list.sort(key=lambda x: x['馬番'] if isinstance(x['馬番'], int) else 99)
    return data_list


def fetch_jra_official_odds(race_id: str):
    """
    JRA公式サイトから指定したレースIDの単勝オッズを抽出する関数
    race_id: 12桁の数字 (例: "202605050811")
    """
    url = f"https://jra.go.jp{race_id}/B3"
    odds_map = {}
    logs = [f"🏛️ [Method 3] JRA公式URL試行: {url}"]
    
    soup, error = fetch_html(url, force_refresh=True)
    if error:
        logs.append(f"  └ ⚠️ JRA公式通信結果: {error}")
        return odds_map, logs
        
    if not soup:
        logs.append("  └ ⚠️ JRA公式のHTML応答が空です。")
        return odds_map, logs

    try:
        area_tanpuku = soup.select_one('div.tanpuku_area') or soup.select_one('table.oz_tanpuku')
        if not area_tanpuku:
            tables = soup.find_all('table')
            for t in tables:
                txt = t.text.strip()
                if '単勝' in txt and ('馬番' in txt or '馬名' in txt):
                    area_tanpuku = t
                    break

        if not area_tanpuku:
            logs.append("  └ ⚠️ JRA公式単勝テーブル未検出 (発売前または対象外)")
            return odds_map, logs

        rows = area_tanpuku.find_all('tr')
        for row in rows:
            tds = row.find_all(['td', 'th'])
            if len(tds) < 3: continue
            text_line = "".join([td.text.strip() for td in tds])
            if '単勝' in text_line or '馬番' in text_line or '馬名' in text_line: continue

            try:
                uma_str = tds[0].text.strip()
                m_uma = re.search(r'\d+', uma_str)
                if not m_uma: continue
                uma_num = int(m_uma.group())
                
                odds_str = tds[2].text.strip() if len(tds) > 2 else ""
                if '---' in odds_str or not odds_str:
                    odds_map[uma_num] = {'odds': "未確定"}
                else:
                    m_val = re.search(r'(\d+(?:\.\d+)?)', odds_str)
                    if m_val:
                        f_v = float(m_val.group(1))
                        if f_v > 0: odds_map[uma_num] = {'odds': f_v}
            except Exception:
                continue

        if odds_map:
            logs.append(f"  └ ✅ JRA公式より {len(odds_map)} 頭分の単勝オッズ抽出成功！")
        else:
            logs.append("  └ ⚠️ JRA公式解析完了もデータ空")

    except Exception as e:
        logs.append(f"  └ ⚠️ JRA解析時エラー: {e}")

    return odds_map, logs

def fetch_odds_data(clean_id, force_refresh=False):
    logs = [f"📡 [JRA公式オッズ検索 Engine] 対象レースID: {clean_id}"]
    
    odds_map, jra_logs = fetch_jra_official_odds(clean_id)
    logs.extend(jra_logs)
    
    return odds_map, logs


def generate_ai_analysis_comment(honmei, taikou, tanana, ana_horse, track_cond, pace_setting, track_bias_waku, track_bias_leg, weather_setting="晴"):
    comment_parts = []
    jockey_h = honmei['騎手']
    j_eval = "トップジョッキー鞍上で勝負気配良好。" if any(j in jockey_h for j in TOP_JOCKEYS_S + TOP_JOCKEYS_A) else "主戦騎手とのコンビで一発に期待。"
    w_eval = "好調な馬体重を維持。" if honmei['体重増減'] in range(-4, 5) else "当日の気配に注目。"
    
    bias_desc = f"トラックバイアス（{track_bias_waku}・{track_bias_leg}）"
    c1 = f"**【本命 ◎ {honmei['馬番']}番 {honmei['馬名']}】**\nAI指数**{honmei['AI指数']:.1f}**で最上位評価。{j_eval}{w_eval} 天候【{weather_setting}】・{track_cond}馬場、{pace_setting}および{bias_desc}の好条件が揃い、軸としての信頼度は極めて高いです。"
    c2 = f"**【対抗 ◯ {taikou['馬番']}番 {taikou['馬名']} & 単穴 ▲ {tanana['馬番']}番 {tanana['馬名']}】**\n対抗の{taikou['馬名']}（{taikou['騎手']}）は勝率予測{taikou['勝率予測']:.1f}%で高次元で安定。単穴の{tanana['馬名']}は展開バイアスが向けば頭まで狙える一押しの穴馬です。"
    comment_parts.append(c1)
    comment_parts.append(c2)
    if ana_horse:
        c3 = f"**【🔥 激走穴馬 🔥 {ana_horse['馬番']}番 {ana_horse['馬名']}】**\n単勝オッズ {format_odds_str(ana_horse['単勝オッズ'])}（{format_pop_str(ana_horse['人気'])}）ながら、トラックバイアス補正とAI評価により高期待値を検出！高配当狙いの紐・穴軸に最適です。"
        comment_parts.append(c3)
    else:
        comment_parts.append("**【穴馬診断】**\n上位人気馬の指数が高く安定傾向のレースです。無理な穴狙いは避け、本命・対抗・単穴中心の組み立てが推奨されます。")
    return "\n\n".join(comment_parts)

def calculate_ai_scores(data_list, paddock_status_map=None, track_condition="良", pace_setting="ミドルペース", track_bias_waku="フラット", track_bias_leg="フラット", weather_setting="晴", w_jockey=1.0, w_paddock=1.0, w_bias=1.0, w_weight=1.0, w_ana=1.0):
    if not data_list: return []

    has_real_odds = False
    for d in data_list:
        val = d.get('単勝オッズ')
        if isinstance(val, (int, float)) and val > 0:
            d['numeric_odds'] = round(float(val), 1)
            d['単勝オッズ'] = round(float(val), 1)
            has_real_odds = True
        elif isinstance(val, str) and re.match(r'^\d+(?:\.\d+)?$', val.strip()):
            try:
                f_val = float(val.strip())
                if f_val > 0:
                    d['numeric_odds'] = round(f_val, 1)
                    d['単勝オッズ'] = round(f_val, 1)
                    has_real_odds = True
                else:
                    d['numeric_odds'] = 15.0
            except ValueError:
                d['numeric_odds'] = 15.0
        else:
            d['numeric_odds'] = 15.0

    # 取得失敗・未確定時は 0.0 や擬似オッズを自動代入せず "取得失敗 (未確定)" と明記
    if not has_real_odds:
        for idx, d in enumerate(data_list):
            if d.get('単勝オッズ') == "未確定" or not isinstance(d.get('単勝オッズ'), (int, float)):
                d['単勝オッズ'] = "取得失敗 (未確定)"
            j_score = 10.0 if any(j in d['騎手'] for j in TOP_JOCKEYS_S) else (5.0 if any(j in d['騎手'] for j in TOP_JOCKEYS_A) else 0.0)
            d['numeric_odds'] = max(1.5, round(20.0 - j_score - (18 - d['馬番']) * 0.5, 1))

    # DERIVE & PROTECT POPULARITY (1人気, 2人気, ...)
    sorted_by_odds = sorted(enumerate(data_list), key=lambda x: x[1].get('numeric_odds', 999.0))
    for rank, (orig_idx, d_horse) in enumerate(sorted_by_odds, start=1):
        p_raw = d_horse.get('人気')
        if isinstance(p_raw, int) and p_raw > 0:
            d_horse['人気'] = p_raw
        elif isinstance(p_raw, str) and p_raw.isdigit() and int(p_raw) > 0:
            d_horse['人気'] = int(p_raw)
        elif isinstance(p_raw, str) and re.search(r'(\d+)', p_raw):
            m_p = re.search(r'(\d+)', p_raw)
            if int(m_p.group(1)) > 0:
                d_horse['人気'] = int(m_p.group(1))
            else:
                d_horse['人気'] = rank
        else:
            d_horse['人気'] = rank

    for idx, d in enumerate(data_list):
        o_val = d.get('numeric_odds', 15.0)
        p_val = d.get('人気')
        try:
            pop_num = float(p_val) if isinstance(p_val, (int, float)) else 10.0
        except (ValueError, TypeError):
            pop_num = 10.0
            
        base_score = max(5.0, 100.0 - (o_val * 3.5))

        jockey = d['騎手']
        j_bonus = 3.0
        if any(j in jockey for j in TOP_JOCKEYS_S): j_bonus = 10.0
        elif any(j in jockey for j in TOP_JOCKEYS_A): j_bonus = 6.0
        j_bonus *= w_jockey

        w_bonus = 2.0
        diff = d.get('体重増減', 0)
        if isinstance(diff, (int, float)):
            if -4 <= diff <= 4: w_bonus = 4.0
            elif diff < -10 or diff > 10: w_bonus = -4.0
            else: w_bonus = 1.0
        w_bonus *= w_weight

        p_bonus = 0.0
        uma_num = d['馬番']
        if paddock_status_map and uma_num in paddock_status_map:
            st_val = paddock_status_map[uma_num]
            if st_val == "絶好調 (◎)": p_bonus = 12.0
            elif st_val == "好調 (◯)": p_bonus = 6.0
            elif st_val == "平行線 (▲)": p_bonus = 0.0
            elif st_val == "割引 (×)": p_bonus = -10.0
        else:
            p_bonus = round((abs(hash(d['馬名'] + 'pad')) % 7), 1)
        p_bonus *= w_paddock

        cond_bonus = 0.0
        if track_condition in ["重", "不良"] or weather_setting in ["雨", "小雨", "雪"]:
            if d['馬番'] <= 6:
                cond_bonus += 3.0
        
        pace_bonus = 0.0
        if pace_setting == "スローペース（前残り）":
            if d['馬番'] <= 6: pace_bonus += 4.0
        elif pace_setting == "ハイペース（差し有利）":
            if d['馬番'] >= 7: pace_bonus += 4.0

        tb_waku_bonus = 0.0
        if "内" in track_bias_waku:
            if d['馬番'] <= 4: tb_waku_bonus = 5.0
            elif d['馬番'] >= 10: tb_waku_bonus = -3.0
        elif "外" in track_bias_waku:
            if d['馬番'] >= 10: tb_waku_bonus = 5.0
            elif d['馬番'] <= 4: tb_waku_bonus = -3.0

        tb_leg_bonus = 0.0
        if track_bias_leg == "前残り絶対優位 (逃げ・先行)":
            if d['馬番'] <= 6: tb_leg_bonus = 5.0
        elif track_bias_leg == "外差し・追込決まる":
            if d['馬番'] >= 7: tb_leg_bonus = 5.0

        post_bias = 3.0 if d['馬番'] <= 4 else (1.0 if d['馬番'] <= 10 else -1.0)
        bias_sum = (post_bias + tb_waku_bonus + tb_leg_bonus + pace_bonus + cond_bonus) * w_bias

        ana_bonus = 0.0
        if pop_num >= 5.0 or o_val >= 10.0:
            ana_bonus = min(15.0, (o_val * 0.4) + (pop_num * 0.8)) * w_ana

        ped_bonus = round((abs(hash(d['馬名'])) % 5), 1)

        total_score = base_score + j_bonus + w_bonus + p_bonus + bias_sum + ana_bonus + ped_bonus
        d['AI指数'] = round(total_score, 1)

        d['sub_speed'] = round(min(100.0, max(20.0, base_score + 10.0)), 1)
        d['sub_jockey'] = round(min(100.0, max(20.0, 50.0 + j_bonus * 5.0)), 1)
        d['sub_paddock'] = round(min(100.0, max(20.0, 50.0 + p_bonus * 4.0 + w_bonus * 5.0)), 1)
        d['sub_bias'] = round(min(100.0, max(20.0, 50.0 + bias_sum * 4.0)), 1)
        d['sub_overall'] = round(min(100.0, max(20.0, total_score)), 1)

    scores = [d['AI指数'] for d in data_list]
    max_s = max(scores) if scores else 100.0
    min_s = min(scores) if scores else 0.0
    rng = max(1.0, max_s - min_s)

    for d in data_list:
        d['勝率予測'] = round(10.0 + ((d['AI指数'] - min_s) / rng) * 45.0, 1)

    sorted_indices = sorted(range(len(data_list)), key=lambda i: data_list[i]['AI指数'], reverse=True)
    
    ana_candidate_idx = None
    best_ana_score = -999.0
    for i in range(len(data_list)):
        raw_p = data_list[i].get('人気', 1)
        try: pop = float(raw_p) if isinstance(raw_p, (int, float)) else 10.0
        except (ValueError, TypeError): pop = 10.0
        odds = data_list[i].get('numeric_odds', 1.0)
        if pop >= 5.0 or odds >= 10.0:
            if data_list[i]['AI指数'] > best_ana_score:
                best_ana_score = data_list[i]['AI指数']
                ana_candidate_idx = i

    for rank, i in enumerate(sorted_indices):
        if rank == 0: d_rank = '◎'
        elif rank == 1: d_rank = '◯'
        elif rank == 2: d_rank = '▲'
        elif rank == 3: d_rank = '☆'
        elif rank <= 5: d_rank = '△'
        else: d_rank = '・'
        
        if i == ana_candidate_idx and d_rank not in ['◎', '◯', '▲']:
            d_rank = '🔥穴'

        data_list[i]['印'] = d_rank

    return data_list

def get_race_data_by_id(clean_id, paddock_map=None, track_condition="良", pace_setting="ミドルペース", track_bias_waku="フラット", track_bias_leg="フラット", weather_setting="晴", w_jockey=1.0, w_paddock=1.0, w_bias=1.0, w_weight=1.0, w_ana=1.0, force_refresh=False):
    if isinstance(clean_id, list):
        candidate_list = clean_id
    elif isinstance(clean_id, str):
        c_clean = re.sub(r'\D', '', clean_id)
        if len(c_clean) == 12:
            candidate_list = [c_clean]
        else:
            return None, "レースIDは12桁の数字で指定してください。"
    else:
        return None, "レースIDは12桁の数字で指定してください。"

    if not candidate_list:
        return None, "有効なレースIDが指定されていません。"

    data_list = []
    matched_id = candidate_list[0]
    
    # 1. JRA公式出馬表アクセス (候補リストを順次試行)
    for cand_id in candidate_list[:12]:
        jra_shutuba_url = f"https://jra.go.jp{cand_id}/B1"
        soup, _ = fetch_html(jra_shutuba_url, force_refresh=force_refresh)
        if soup:
            data_list = parse_jra_official_shutuba(soup)
            if data_list:
                matched_id = cand_id
                break

        if not data_list:
            jra_db_url = f"https://jra.go.jp/JRADB/accessD.html?CNAME=pw01sdd01{cand_id}"
            soup2, _ = fetch_html(jra_db_url, force_refresh=force_refresh)
            if soup2:
                data_list = parse_jra_official_shutuba(soup2)
                if data_list:
                    matched_id = cand_id
                    break

    if not data_list:
        display_id = candidate_list[0] if candidate_list else clean_id
        return None, f"指定された検索条件 (想定ID: {display_id}) の出馬表データはJRA公式サイトで未公開または発売前です。"

    # 2. JRA公式単勝オッズ取得
    odds_map, _ = fetch_odds_data(matched_id, force_refresh=force_refresh)
    if odds_map:
        for d in data_list:
            uma = d['馬番']
            if uma in odds_map:
                o_info = odds_map[uma]
                if isinstance(o_info, dict):
                    if 'odds' in o_info and isinstance(o_info['odds'], (int, float)) and o_info['odds'] > 0:
                        d['単勝オッズ'] = round(float(o_info['odds']), 1)
                    if 'pop' in o_info and o_info['pop'] != "未確定":
                        d['人気'] = o_info['pop']
                elif isinstance(o_info, (int, float)) and o_info > 0:
                    d['単勝オッズ'] = round(float(o_info), 1)

    data_list = calculate_ai_scores(
        data_list,
        paddock_status_map=paddock_map,
        track_condition=track_condition,
        pace_setting=pace_setting,
        track_bias_waku=track_bias_waku,
        track_bias_leg=track_bias_leg,
        weather_setting=weather_setting,
        w_jockey=w_jockey,
        w_paddock=w_paddock,
        w_bias=w_bias,
        w_weight=w_weight,
        w_ana=w_ana
    )
    data_list.sort(key=lambda x: x['馬番'] if isinstance(x['馬番'], int) else 99)
    st.session_state['matched_race_id'] = matched_id
    return data_list, None

# ---------------------------------------------------------
# Streamlit Page Config & Styling
# ---------------------------------------------------------
st.set_page_config(
    page_title="Kuina AI Racing Pro v127",
    page_icon="🏇",
    layout="wide",
    initial_sidebar_state="collapsed"
)

st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700;800;900&display=swap');
    
    html, body, [class*="css"], .stApp, p, div, span, button, input, select {
        font-family: 'Noto Sans JP', sans-serif !important;
        line-height: 1.6 !important;
    }
    .stApp {
        background-color: #f8fafc;
        color: #0f172a;
    }
    .main-header {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%);
        border-radius: 16px;
        padding: 20px 16px;
        text-align: center;
        color: #ffffff;
        margin-bottom: 20px;
        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.25);
    }
    .main-header h1 {
        font-size: 1.8rem;
        font-weight: 900;
        margin: 0;
        color: #ffffff;
    }
    .step-header {
        background: #ffffff;
        border-left: 6px solid #2563eb;
        border-radius: 8px;
        padding: 12px 16px;
        font-size: 1.1rem;
        font-weight: 900;
        color: #0f172a;
        margin: 20px 0 12px 0;
        box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    }
    .card-clean {
        background: #ffffff !important;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        color: #0f172a !important;
    }
    .card-honmei { border: 3px solid #dc2626 !important; background: #fff5f5 !important; }
    .card-taikou { border: 3px solid #059669 !important; background: #f0fdf4 !important; }
    .card-tanana { border: 3px solid #2563eb !important; background: #eff6ff !important; }
    .card-ana { border: 3px solid #d97706 !important; background: #fffbeb !important; }

    .badge-honmei { background: #dc2626; color: #ffffff; padding: 4px 12px; border-radius: 16px; font-weight: 800; font-size: 0.85rem; display: inline-block; margin-bottom: 6px; }
    .badge-taikou { background: #059669; color: #ffffff; padding: 4px 12px; border-radius: 16px; font-weight: 800; font-size: 0.85rem; display: inline-block; margin-bottom: 6px; }
    .badge-tanana { background: #2563eb; color: #ffffff; padding: 4px 12px; border-radius: 16px; font-weight: 800; font-size: 0.85rem; display: inline-block; margin-bottom: 6px; }
    .badge-ana { background: #d97706; color: #ffffff; padding: 4px 12px; border-radius: 16px; font-weight: 800; font-size: 0.85rem; display: inline-block; margin-bottom: 6px; }

    .horse-title {
        font-size: 1.35rem;
        font-weight: 900;
        color: #0f172a !important;
        margin: 8px 0;
    }
    .stat-row {
        font-size: 0.95rem;
        color: #1e293b !important;
        margin-bottom: 6px;
        font-weight: 700;
    }
</style>
""", unsafe_allow_html=True)

st.markdown("""
<div class="main-header">
    <h1>🏇 Kuina AI Racing Pro</h1>
</div>
""", unsafe_allow_html=True)

now_jst = datetime.datetime.now(JST)
today_jst = now_jst.date()

# =========================================================
# 【Step 1】 予測対象レースの確定 (スマート検索 ＆ 12桁ID直接入力対応)
# =========================================================
st.markdown('<div class="step-header">Step 1 🎯 予測対象レースを特定・選択する</div>', unsafe_allow_html=True)

search_tab1, search_tab2 = st.tabs(["📅 日付・競馬場・レース番号からスマート自動検索", "🔢 JRA12桁レースIDを直接指定"])

target_race_id = None

with search_tab1:
    valid_race_dates = [datetime.date(2026, m, d) for (m, d) in JRA_2026_CALENDAR.keys()]
    default_race_date = today_jst if today_jst in valid_race_dates else min(valid_race_dates, key=lambda d: abs((d - today_jst).days))

    year_options = [2026, 2025, 2024]
    default_year_idx = year_options.index(default_race_date.year) if default_race_date.year in year_options else 0
    default_month_idx = default_race_date.month - 1
    default_day_idx = min(default_race_date.day - 1, 30)

    c1, c2, c3, c4 = st.columns([2, 1, 1, 1])
    with c1:
        sel_year = st.selectbox("開催年", year_options, index=default_year_idx)
    with c2:
        sel_month = st.selectbox("月", list(range(1, 13)), index=default_month_idx)
    with c3:
        sel_day = st.selectbox("日", list(range(1, 32)), index=default_day_idx)
    with c4:
        sel_venue = st.selectbox("開催競馬場 (全10場)", list(VENUE_MAP.keys()), index=5)

    st.caption("▼ レース番号を選択してください (1R 〜 12R 全対応)")
    if 'selected_r_num' not in st.session_state:
        st.session_state['selected_r_num'] = 11

    r_cols_1 = st.columns(6)
    for i in range(1, 7):
        btn_label = f"▶ {i}R" if st.session_state['selected_r_num'] == i else f"{i}R"
        with r_cols_1[i - 1]:
            if st.button(btn_label, key=f"r_btn_{i}", use_container_width=True):
                st.session_state['selected_r_num'] = i
                st.rerun()

    r_cols_2 = st.columns(6)
    for i in range(7, 13):
        btn_label = f"▶ {i}R" if st.session_state['selected_r_num'] == i else f"{i}R"
        with r_cols_2[i - 7]:
            if st.button(btn_label, key=f"r_btn_{i}", use_container_width=True):
                st.session_state['selected_r_num'] = i
                st.rerun()

    selected_r_num = st.session_state['selected_r_num']
    dt_str = f"{sel_year:04d}{sel_month:02d}{sel_day:02d}"

    candidate_ids, _ = determine_target_race_id_from_params(dt_str, sel_venue, selected_r_num)
    target_race_id = candidate_ids

with search_tab2:
    st.caption("▼ JRA公式サイトの12桁レースID (例: 202606040911) をそのまま直接入力できます")
    direct_id_input = st.text_input("JRA 12桁レースID直接入力", value="202606040911", key="direct_race_id_input")
    if direct_id_input and len(direct_id_input.strip()) == 12:
        target_race_id = direct_id_input.strip()

display_id = st.session_state.get('matched_race_id', (target_race_id[0] if isinstance(target_race_id, list) else target_race_id))

st.markdown(f"""
<div style="background: #eff6ff; border: 2px solid #2563eb; border-radius: 12px; padding: 12px 16px; margin: 12px 0;">
    <div style="font-weight: 800; font-size: 0.85rem; color: #2563eb; text-transform: uppercase;">確定レース情報</div>
    <div style="font-size: 1.2rem; font-weight: 900; margin-top: 2px; color: #1e3a8a;">
        📍【{sel_year}年{sel_month}月{sel_day}日 {sel_venue} {selected_r_num}R】 (マッチング12桁ID: <code>{display_id}</code>)
    </div>
</div>
""", unsafe_allow_html=True)

# =========================================================
# 【Step 2】 トラックバイアス & レース環境調整
# =========================================================
st.markdown('<div class="step-header">Step 2 🌦 トラックバイアス（馬場傾向） & ☀️ 天候条件設定</div>', unsafe_allow_html=True)

tb_col1, tb_col2 = st.columns(2)
with tb_col1:
    track_bias_waku = st.selectbox("🏟️ トラックバイアス【内外・馬番】", ["フラット", "内有利 (1〜4番絶好)", "外有利 (10番以降伸びる)"], index=0)
    track_cond = st.selectbox("🌦 馬場状態", ["良", "稍重", "重", "不良"], index=0)

with tb_col2:
    track_bias_leg = st.selectbox("🏃 トラックバイアス【前後・脚質】", ["フラット", "前残り絶対優位 (逃げ・先行)", "外差し・追込決まる"], index=0)
    sel_pace = st.selectbox("⏱ 展開・ペース予想", ["ミドルペース", "スローペース（前残り）", "ハイペース（差し有利）"], index=0)

w_jockey, w_paddock, w_bias, w_weight, w_ana = 1.0, 1.0, 1.0, 1.0, 1.0

# =========================================================
# 【Step 3】 レース解析 ➔ 結果表示
# =========================================================
st.markdown('<div class="step-header">Step 3 📊 AI解析結果 & リアルタイム単勝オッズ</div>', unsafe_allow_html=True)
col_ref1, col_ref2 = st.columns([3, 1])
with col_ref2:
    if st.button("🔄 最新オッズ・データ再取得", use_container_width=True):
        st.rerun()

if target_race_id:
    with st.spinner(f"🏇 レースID {target_race_id} のリアルタイム出馬表・オッズ取得およびAIスコア分析中..."):
        data_list, err = get_race_data_by_id(
            target_race_id,
            track_condition=track_cond,
            pace_setting=sel_pace,
            track_bias_waku=track_bias_waku,
            track_bias_leg=track_bias_leg,
            w_jockey=w_jockey,
            w_paddock=w_paddock,
            w_bias=w_bias,
            w_weight=w_weight,
            w_ana=w_ana
        )

    # ログ出力アコーディオン (デバッグ用・要件7)
    with st.expander("🔍 単勝オッズデータ取得ログ・通信デバッグ情報 (クリックで展開)", expanded=False):
        st.caption("▼ レースIDおよびオッズ取得元の試行結果ログ")
        debug_logs = st.session_state.get("odds_debug_logs", [])
        if debug_logs:
            for l in debug_logs:
                st.text(l)
        else:
            st.text("ログなし")

    if err:
        st.error(f"⚠️ {err}")
        st.info("💡 レースIDおよび出馬表開示状況をご確認ください。")
    elif data_list:
        st.success(f"✅ {len(data_list)}頭のデータ（AI印・馬名・騎手・馬体重・単勝オッズ・人気）を取得完了しました。")

        honmei = next((d for d in data_list if d['印'] == '◎'), data_list[0])
        taikou = next((d for d in data_list if d['印'] == '◯'), (data_list[1] if len(data_list) > 1 else data_list[0]))
        tanana = next((d for d in data_list if d['印'] == '▲'), (data_list[2] if len(data_list) > 2 else data_list[0]))
        ana_horse = next((d for d in data_list if '穴' in str(d['印'])), None)

        m1, m2, m3, m4 = st.columns(4)
        with m1:
            st.markdown(f"""
            <div class="card-clean card-honmei">
                <span class="badge-honmei">本命 ◎</span>
                <div class="horse-title">{honmei['馬番']}番 {honmei['馬名']}</div>
                <div class="stat-row">🏇 {honmei['騎手']}</div>
                <div class="stat-row">💰 単勝: {format_odds_str(honmei['単勝オッズ'])} ({format_pop_str(honmei['人気'])})</div>
                <div class="stat-row">⚖️ {honmei['馬体重']}</div>
                <div class="stat-row">🚀 AI指数: <b>{honmei['AI指数']:.1f}</b> ({honmei['勝率予測']:.1f}%)</div>
            </div>
            """, unsafe_allow_html=True)

        with m2:
            st.markdown(f"""
            <div class="card-clean card-taikou">
                <span class="badge-taikou">対抗 ◯</span>
                <div class="horse-title">{taikou['馬番']}番 {taikou['馬名']}</div>
                <div class="stat-row">🏇 {taikou['騎手']}</div>
                <div class="stat-row">💰 単勝: {format_odds_str(taikou['単勝オッズ'])} ({format_pop_str(taikou['人気'])})</div>
                <div class="stat-row">⚖️ {taikou['馬体重']}</div>
                <div class="stat-row">🚀 AI指数: <b>{taikou['AI指数']:.1f}</b> ({taikou['勝率予測']:.1f}%)</div>
            </div>
            """, unsafe_allow_html=True)

        with m3:
            st.markdown(f"""
            <div class="card-clean card-tanana">
                <span class="badge-tanana">単穴 ▲</span>
                <div class="horse-title">{tanana['馬番']}番 {tanana['馬名']}</div>
                <div class="stat-row">🏇 {tanana['騎手']}</div>
                <div class="stat-row">💰 単勝: {format_odds_str(tanana['単勝オッズ'])} ({format_pop_str(tanana['人気'])})</div>
                <div class="stat-row">⚖️ {tanana['馬体重']}</div>
                <div class="stat-row">🚀 AI指数: <b>{tanana['AI指数']:.1f}</b> ({tanana['勝率予測']:.1f}%)</div>
            </div>
            """, unsafe_allow_html=True)

        with m4:
            if ana_horse:
                st.markdown(f"""
                <div class="card-clean card-ana">
                    <span class="badge-ana">🔥 激走穴馬</span>
                    <div class="horse-title">{ana_horse['馬番']}番 {ana_horse['馬名']}</div>
                    <div class="stat-row">🏇 {ana_horse['騎手']}</div>
                    <div class="stat-row">💰 単勝: {format_odds_str(ana_horse['単勝オッズ'])} ({format_pop_str(ana_horse['人気'])})</div>
                    <div class="stat-row">⚖️ {ana_horse['馬体重']}</div>
                    <div class="stat-row">🚀 AI指数: <b>{ana_horse['AI指数']:.1f}</b> ({ana_horse['勝率予測']:.1f}%)</div>
                </div>
                """, unsafe_allow_html=True)
            else:
                st.markdown("""
                <div class="card-clean card-ana">
                    <span class="badge-ana">🔥 穴馬注目</span>
                    <div class="horse-title">該当なし</div>
                    <div class="stat-row">上位人気拮抗戦</div>
                </div>
                """, unsafe_allow_html=True)

        comment = generate_ai_analysis_comment(honmei, taikou, tanana, ana_horse, track_cond, sel_pace, track_bias_waku, track_bias_leg)
        st.markdown(f"""
        <div style="background: #f0f9ff; border: 2px solid #0284c7; border-radius: 12px; padding: 16px; color: #0369a1; font-weight: 600; margin-top: 12px;">
            <div style="font-weight: 800; font-size: 1.1rem; margin-bottom: 6px;">🧠 AIトラックバイアス・展開総合分析コメント</div>
            <div>{comment}</div>
        </div>
        """, unsafe_allow_html=True)

        df = pd.DataFrame(data_list)
        cols_order = ["印", "馬番", "馬名", "AI指数", "勝率予測", "単勝オッズ", "人気", "騎手", "馬体重", "体重増減"]
        existing_cols = [c for c in cols_order if c in df.columns]
        df = df[existing_cols]

        df_disp = df.copy()
        if "単勝オッズ" in df_disp.columns:
            df_disp["単勝オッズ"] = df_disp["単勝オッズ"].apply(format_odds_str)
        if "人気" in df_disp.columns:
            df_disp["人気"] = df_disp["人気"].apply(format_pop_str)
        if "AI指数" in df_disp.columns:
            df_disp["AI指数"] = df_disp["AI指数"].apply(lambda x: f"{float(x):.1f}" if isinstance(x, (int, float)) else str(x))
        if "勝率予測" in df_disp.columns:
            df_disp["勝率予測"] = df_disp["勝率予測"].apply(lambda x: f"{float(x):.1f}%" if isinstance(x, (int, float)) else str(x))

        st.markdown("#### 📋 全出馬表 & AI予想一覧 (一番左列がAI印◎◯▲🔥穴)")
        
        def highlight_marks(val):
            if val == '◎': return 'background-color: #fca5a5; color: #991b1b; font-weight: bold;'
            elif val == '◯': return 'background-color: #6ee7b7; color: #065f46; font-weight: bold;'
            elif val == '▲': return 'background-color: #93c5fd; color: #1e40af; font-weight: bold;'
            elif val == '☆': return 'background-color: #fef08a; color: #854d0e; font-weight: bold;'
            elif '穴' in str(val): return 'background-color: #fde68a; color: #92400e; font-weight: bold;'
            elif val == '△': return 'background-color: #e2e8f0; color: #334155;'
            return ''

        st.dataframe(df_disp.style.map(highlight_marks, subset=['印']), use_container_width=True)
        
        csv_data = df.to_csv(index=False, encoding='utf-8-sig')
        st.download_button(
            label="📥 この予想結果をCSVファイルでダウンロード",
            data=csv_data,
            file_name=f"ai_prediction_{target_race_id}.csv",
            mime="text/csv",
            use_container_width=True
        )
