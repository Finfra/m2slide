#!/usr/bin/env python3
"""build-align-form.py — pre-form alignment check (slide-tuner Step 4.8).

Shows first 2 slide cards with multiple PDF offset candidates (offset 0/1/2),
lets user choose which offset matches. Result returned via inbox.

Usage:
    build-align-form.py <capture_dir> <out_html> --answer-url URL --sid SID --q1-sig SIG --project-name NAME --project-color COLOR
"""
import argparse
import html
import os
import sys
from pathlib import Path


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("capture_dir")
    p.add_argument("out_html")
    p.add_argument("--answer-url", required=True)
    p.add_argument("--sid", required=True)
    p.add_argument("--q1-sig", required=True)
    p.add_argument("--project-name", default="m2slide")
    p.add_argument("--project-color", default="#d4e8e0")
    p.add_argument("--max-offset", type=int, default=3, help="Max offset to display (PDF p1..pN candidates)")
    args = p.parse_args()

    cap = Path(args.capture_dir).resolve()
    out = Path(args.out_html).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    cap_rel = os.path.relpath(cap, out.parent)

    # 첫 2개 슬라이드 + 첫 (max_offset+2) PDF 페이지를 후보로 보여줌
    offset_choices = list(range(args.max_offset + 1))

    cards = []
    for offset in offset_choices:
        # PDF p(1+offset) ↔ slide c1/s1
        # PDF p(2+offset) ↔ slide c1/s2
        cards.append(f"""    <fieldset class="offset-card" data-offset="{offset}">
      <legend>offset = {offset} (PDF p{1+offset} ↔ 슬라이드 c1/s1)</legend>
      <div class="pair-row">
        <div class="pair">
          <h4>슬라이드 c1/s1</h4>
          <img src="{cap_rel}/slide-c1-s1.png" alt="slide c1/s1">
        </div>
        <div class="pair">
          <h4>PDF p{1+offset:02d}</h4>
          <img src="{cap_rel}/pdf-{1+offset:02d}.png" alt="PDF p{1+offset:02d}">
        </div>
      </div>
      <div class="pair-row">
        <div class="pair">
          <h4>슬라이드 c1/s2</h4>
          <img src="{cap_rel}/slide-c1-s2.png" alt="slide c1/s2">
        </div>
        <div class="pair">
          <h4>PDF p{2+offset:02d}</h4>
          <img src="{cap_rel}/pdf-{2+offset:02d}.png" alt="PDF p{2+offset:02d}">
        </div>
      </div>
      <label class="select-this">
        <input type="radio" name="offset" value="{offset}" {"checked" if offset == 1 else ""}> 이 offset 선택
      </label>
    </fieldset>""")

    style = """
:root { --bg:#ffffff; --fg:#1a1a1a; --muted:#666; --accent:""" + args.project_color + """; --border:#ddd; }
* { box-sizing: border-box; }
html, body { margin:0; padding:0; background:var(--bg); color:var(--fg); font-family:-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif; line-height:1.6; }
header { position:sticky; top:0; z-index:100; background:var(--accent); color:#1a1a1a; padding:0.75rem 1.5rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; box-shadow:0 1px 3px rgba(0,0,0,0.1); }
header h1 { margin:0; font-size:1.05rem; font-weight:600; color:#1a1a1a; }
header .right { display:flex; align-items:center; gap:0.5rem; }
.proj-badge { background:rgba(0,0,0,0.1); padding:0.2rem 0.6rem; border-radius:4px; font-size:0.85rem; color:#1a1a1a; }
header a, header button { color:#1a1a1a; text-decoration:none; background:rgba(0,0,0,0.08); padding:0.25rem 0.7rem; border-radius:4px; font-size:0.85rem; border:1px solid rgba(0,0,0,0.15); cursor:pointer; }
main { max-width:1100px; margin:0 auto; padding:1.5rem; }
.intro { background:#fff8e1; border-left:4px solid #ffa726; padding:0.8rem 1rem; margin-bottom:1.5rem; border-radius:4px; }
.offset-card { border:2px solid var(--border); padding:1rem 1.2rem; margin-bottom:1.5rem; border-radius:6px; background:#fafafa; }
.offset-card legend { background:#fff; padding:0.2rem 0.6rem; border:1px solid var(--border); border-radius:3px; font-weight:600; }
.pair-row { display:flex; gap:1rem; margin:0.5rem 0; }
.pair { flex:1; }
.pair h4 { margin:0 0 0.3rem 0; font-size:0.85rem; color:var(--muted); font-weight:normal; }
.pair img { width:100%; height:auto; max-height:300px; border:1px solid var(--border); border-radius:4px; object-fit:contain; background:#fff; }
.select-this { display:flex; align-items:center; gap:0.4rem; margin-top:0.8rem; font-weight:600; cursor:pointer; }
.btn-row { display:flex; gap:0.6rem; margin:1rem 0; }
.btn-row button { font-size:0.95rem; padding:0.5rem 1.1rem; border:1px solid var(--border); background:#fff; cursor:pointer; border-radius:4px; }
#submit-btn { background:var(--accent); color:#1a1a1a; font-weight:600; border-color:rgba(0,0,0,0.2); }
#status { margin-top:1rem; padding:0.6rem 1rem; }
"""

    js = """
async function submitAlign() {
  const sel = document.querySelector('input[name=offset]:checked');
  if (!sel) { alert('offset을 하나 선택하세요'); return; }
  const payload = [
    { question: '__Q1_SIG__', answers: ['OK'] },
    { question: 'alignment', answers: [sel.value] }
  ];
  const st = document.getElementById('status');
  st.textContent = '전송 중...';
  try {
    const r = await fetch('__ANSWER_URL__', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    const j = await r.json();
    if (r.ok) { st.innerHTML = '<span style="color:#080">✅ offset=' + sel.value + ' 전송 완료. 다음 라운드(본 비교폼) 자동 생성 대기.</span>'; }
    else { st.innerHTML = '<span style="color:#c00">❌ ' + (j.error || r.status) + '</span>'; }
  } catch (e) { st.innerHTML = '<span style="color:#c00">❌ ' + e.message + '</span>'; }
}
document.getElementById('submit-btn').addEventListener('click', submitAlign);
"""

    html_doc = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>m2slide — slide-tuner alignment 검증</title>
<style>{style}</style>
</head>
<body>
<header>
  <h1>PDF↔슬라이드 정렬 검증 — {html.escape(args.project_name)}</h1>
  <div class="right">
    <span class="proj-badge">📁 m2slide</span>
    <a href="http://127.0.0.1:9876/hub" target="_blank">🗂 Hub</a>
    <button onclick="window.close()">닫기 ✕</button>
  </div>
</header>
<main>
  <div class="intro">
    <strong>본 폼 발동 전 사전 검증</strong>: PDF에 전체 책 표지·챕터 표지 등 추가 페이지가 있어 슬라이드 인덱스와 PDF 페이지가 어긋날 수 있습니다. 아래 후보(offset 0~{args.max_offset}) 중 슬라이드 c1/s1·c1/s2와 PDF가 정확히 일치하는 offset을 선택하세요. offset 확정 후 본 21장 비교폼이 재생성됩니다.
  </div>

  <form id="qa-form" onsubmit="event.preventDefault();">
{chr(10).join(cards)}

    <div class="btn-row">
      <button type="button" id="submit-btn">offset 확정 + 본 폼 재생성 요청</button>
      <button type="button" onclick="window.close()">닫기 ✕</button>
    </div>
    <div id="status"></div>
  </form>
</main>
<script>
{js.replace('__ANSWER_URL__', args.answer_url).replace('__Q1_SIG__', args.q1_sig)}
</script>
</body>
</html>
"""
    out.write_text(html_doc)
    print(f"align form → {out}")
    print(f"  offset candidates: 0..{args.max_offset}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
