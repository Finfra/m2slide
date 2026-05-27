#!/usr/bin/env python3
"""build-form.py — generate slide-tuner comparison + feedback form HTML.

Reads pairing.yml + capture dir, builds raw HTML form with N cards
(slide PNG | PDF PNG | OK checkbox | textarea), fetch POST to inbox.

Usage:
    build-form.py <pairing_yml> <capture_dir> <out_html> --answer-url URL --sid SID --q1-sig SIG [--batch N]

Output:
    <out_html> — complete form HTML (sticky header, Hub link, close button, 21 cards)
"""
import argparse
import html
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import quote


def parse_pairing(path: Path) -> dict:
    """Minimal parser for build-pairing.py emitted yaml."""
    data: dict = {"chapters": [], "mapping": []}
    section = None
    current: dict | None = None
    for line in path.read_text().splitlines():
        if not line.strip():
            continue
        if re.match(r"^[a-z_]+:", line):
            key, _, val = line.partition(":")
            val = val.strip()
            if key == "chapters":
                section = "chapters"
            elif key == "mapping":
                section = "mapping"
            else:
                if val.lower() in ("true", "false"):
                    data[key] = val.lower() == "true"
                else:
                    try:
                        data[key] = int(val)
                    except ValueError:
                        data[key] = val.strip("'\"")
        elif line.startswith("  - "):
            current = {}
            data[section].append(current)
            kv = line[4:].split(":", 1)
            if len(kv) == 2:
                current[kv[0].strip()] = kv[1].strip().strip("'\"")
        elif line.startswith("    ") and current is not None:
            kv = line[4:].split(":", 1)
            if len(kv) == 2:
                v = kv[1].strip().strip("'\"")
                try:
                    current[kv[0].strip()] = int(v)
                except ValueError:
                    current[kv[0].strip()] = v
    return data


def render_card(idx: int, m: dict, capture_dir: Path, out_html_dir: Path) -> str:
    """One card per slide. data-question must be unique per card."""
    chap = m.get("chap", "?")
    slide = m.get("slide", "?")
    title = m.get("title", "")
    slide_png = capture_dir / m["capture"]
    pdf_png = capture_dir / m["pdf"]
    # Relative paths from out_html_dir to image files
    slide_rel = os.path.relpath(slide_png, out_html_dir)
    pdf_rel = os.path.relpath(pdf_png, out_html_dir)
    q_id = f"c{chap}/s{slide}"
    title_html = f" — {html.escape(title)}" if title else ""
    return f"""    <fieldset class="q-card" data-question="{q_id}">
      <legend>슬라이드 {q_id}{title_html}</legend>
      <div class="compare">
        <figure><img src="{slide_rel}" alt="현재 슬라이드"><figcaption>현재 슬라이드</figcaption></figure>
        <figure><img src="{pdf_rel}" alt="PDF 원본"><figcaption>PDF 원본</figcaption></figure>
      </div>
      <div class="card-controls">
        <label class="ok-label"><input type="checkbox" class="ok-check"> 정상 (수정 불필요)</label>
        <textarea class="q-textarea" placeholder="문제점 자유 기술... (정상이면 비워두기)"></textarea>
      </div>
    </fieldset>"""


def build_form_html(
    pairing: dict,
    capture_dir: Path,
    out_html: Path,
    answer_url: str,
    sid: str,
    q1_sig: str,
    project_name: str,
    project_color: str,
) -> str:
    out_html_dir = out_html.parent
    cards = [render_card(i, m, capture_dir, out_html_dir) for i, m in enumerate(pairing["mapping"])]

    # Hidden dummy card carrying q1_sig (for inbox grep)
    hidden_dummy = f"""    <fieldset class="q-card" data-question="{html.escape(q1_sig)}" style="display:none;">
      <input type="radio" name="dummy" value="OK" checked>
    </fieldset>"""

    style = """
:root { --bg:#ffffff; --fg:#1a1a1a; --muted:#666; --accent:""" + project_color + """; --border:#ddd; --card-bg:#fafafa; }
* { box-sizing: border-box; }
html, body { margin:0; padding:0; background:var(--bg); color:var(--fg); font-family:-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; line-height:1.6; }
header { position:sticky; top:0; z-index:100; background:var(--accent); color:#1a1a1a; padding:0.75rem 1.5rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; box-shadow:0 1px 3px rgba(0,0,0,0.1); }
header h1 { margin:0; font-size:1.05rem; font-weight:600; color:#1a1a1a; }
header .right { display:flex; align-items:center; gap:0.5rem; }
.proj-badge { background:rgba(0,0,0,0.1); color:#1a1a1a; padding:0.2rem 0.6rem; border-radius:4px; font-size:0.85rem; }
header a, header button { color:#1a1a1a; text-decoration:none; background:rgba(0,0,0,0.08); padding:0.25rem 0.7rem; border-radius:4px; font-size:0.85rem; border:1px solid rgba(0,0,0,0.15); cursor:pointer; }
header a:hover, header button:hover { background:rgba(0,0,0,0.18); }
main { max-width:1200px; margin:0 auto; padding:1.5rem; }
.intro { background:#fff8e1; border-left:4px solid #ffa726; padding:0.8rem 1rem; margin-bottom:1.5rem; border-radius:4px; }
.btn-row { display:flex; gap:0.6rem; margin:1rem 0; align-items:center; }
.btn-row button { font-size:0.9rem; padding:0.4rem 0.9rem; border:1px solid var(--border); background:#fff; cursor:pointer; border-radius:4px; }
.btn-row button:hover { background:#f0f0f0; }
#submit-btn { background:var(--accent); color:#1a1a1a; font-weight:600; border-color:rgba(0,0,0,0.2); }
.q-card { border:1px solid var(--border); background:var(--card-bg); padding:1rem 1.2rem; margin-bottom:1.2rem; border-radius:6px; }
.q-card legend { background:#fff; padding:0.2rem 0.6rem; border:1px solid var(--border); border-radius:3px; font-weight:600; color:#1a1a1a; }
.compare { display:flex; gap:1rem; margin:0.8rem 0; align-items:flex-start; }
.compare figure { flex:1; margin:0; }
.compare img { width:100%; height:auto; border:1px solid var(--border); border-radius:4px; object-fit:contain; max-height:480px; background:#fff; }
.compare figcaption { font-size:0.82rem; color:var(--muted); text-align:center; margin-top:0.3rem; }
.card-controls { display:flex; flex-direction:column; gap:0.5rem; margin-top:0.6rem; }
.ok-label { display:flex; align-items:center; gap:0.4rem; font-size:0.95rem; }
.q-textarea { width:100%; min-height:3em; padding:0.5rem 0.7rem; border:1px solid var(--border); border-radius:4px; font-family:inherit; font-size:0.93rem; resize:vertical; box-sizing:border-box; }
#status { margin-top:1rem; padding:0.6rem 1rem; border-radius:4px; }
"""

    js = """
// slide-tuner form submit — hidden dummy card carries q1_sig for inbox grep matching
document.querySelectorAll('.q-card').forEach(card => {
  const ok = card.querySelector('.ok-check');
  const ta = card.querySelector('.q-textarea');
  if (ok && ta) {
    ok.addEventListener('change', () => { ta.disabled = ok.checked; if (ok.checked) ta.value = ''; });
  }
});

document.getElementById('check-all').addEventListener('click', () => {
  document.querySelectorAll('.ok-check').forEach(c => {
    c.checked = true;
    const ta = c.closest('.q-card').querySelector('.q-textarea');
    if (ta) { ta.disabled = true; ta.value = ''; }
  });
});

function collectAnswers() {
  return Array.from(document.querySelectorAll('.q-card')).map(card => {
    const dummyRadio = card.querySelector('input[type=radio]:checked');
    if (dummyRadio) {
      return { question: card.dataset.question, answers: [dummyRadio.value] };
    }
    const ok = card.querySelector('.ok-check');
    const ta = card.querySelector('.q-textarea');
    const state = ok && ok.checked ? '정상' : '수정';
    const feedback = ta && !ta.disabled ? ta.value.trim() : '';
    return { question: card.dataset.question, answers: [state, feedback] };
  });
}

async function submitAnswers() {
  const payload = collectAnswers();
  const st = document.getElementById('status');
  st.textContent = '전송 중...';
  try {
    const r = await fetch('__ANSWER_URL__', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (r.ok) {
      st.innerHTML = '<span style="color:#080;">✅ 전송 완료. Claude 회수 대기 중. 창 닫아도 됩니다.</span>';
    } else {
      st.innerHTML = '<span style="color:#c00;">❌ ' + (j.error || r.status) + '</span>';
    }
  } catch (e) {
    st.innerHTML = '<span style="color:#c00;">❌ 전송 실패: ' + e.message + '</span>';
  }
}

document.getElementById('submit-btn').addEventListener('click', submitAnswers);
"""

    html_doc = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>m2slide — slide-tuner 비교폼 ({project_name})</title>
<style>{style}</style>
</head>
<body>
<header>
  <h1>slide-tuner 비교폼 — {html.escape(project_name)}</h1>
  <div class="right">
    <span class="proj-badge">📁 m2slide</span>
    <a href="http://127.0.0.1:9876/hub" target="_blank">🗂 Hub</a>
    <button onclick="window.close()">닫기 ✕</button>
  </div>
</header>
<main>
  <div class="intro">
    각 슬라이드의 현재 상태(좌)와 PDF 원본(우)을 비교한 뒤, 정상이면 체크박스만 누르고, 수정이 필요하면 의견을 자유 텍스트로 작성하세요. 전체 정상이면 상단 "전체 정상" 버튼을 누르세요. 마지막에 "전송"을 누르면 Claude가 폼 데이터를 회수합니다.
  </div>
  <div class="btn-row">
    <button type="button" id="check-all">전체 정상으로 일괄 체크</button>
    <span style="color:var(--muted); font-size:0.85rem;">{len(pairing["mapping"])}개 슬라이드</span>
  </div>
  <form id="qa-form" onsubmit="event.preventDefault();">
{hidden_dummy}

""" + "\n\n".join(cards) + f"""

    <div class="btn-row">
      <button type="button" id="submit-btn">전송</button>
      <button type="button" onclick="window.close()">닫기 ✕</button>
    </div>
    <div id="status"></div>
  </form>
</main>
<script>
{js.replace('__ANSWER_URL__', answer_url)}
</script>
</body>
</html>
"""
    out_html.write_text(html_doc)
    return html_doc


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("pairing_yml")
    p.add_argument("capture_dir")
    p.add_argument("out_html")
    p.add_argument("--answer-url", required=True)
    p.add_argument("--sid", required=True)
    p.add_argument("--q1-sig", required=True)
    p.add_argument("--project-name", default="m2slide")
    p.add_argument("--project-color", default="hsl(191,60%,45%)")
    args = p.parse_args()

    pairing = parse_pairing(Path(args.pairing_yml))
    cap = Path(args.capture_dir).resolve()
    out = Path(args.out_html).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)

    build_form_html(
        pairing=pairing,
        capture_dir=cap,
        out_html=out,
        answer_url=args.answer_url,
        sid=args.sid,
        q1_sig=args.q1_sig,
        project_name=args.project_name,
        project_color=args.project_color,
    )

    print(f"form → {out}")
    print(f"  cards={len(pairing['mapping'])}  sid={args.sid}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
