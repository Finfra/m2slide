#!/usr/bin/env python3
"""free-image/fetch.py — 저작권 프리(CC) 이미지 다운로드 + 출처 기록.

Openverse API(키 불요, CC 라이선스 aggregator)로 주제 검색 → 이미지 N장 다운로드
→ 대상 폴더 저장 + CREDITS.md 에 출처·라이선스 기록(CC-BY/BY-SA 저작자 표시 의무 충족).

Usage:
  python3 fetch.py --query "ramen noodles" --out <dir> --count 3 --prefix ramen
  python3 fetch.py -q "boiling pot" -o ./img -n 2 -p pot --license cc0,by,by-sa

옵션:
  --query,   -q  검색어 (필수)
  --out,     -o  저장 폴더 (필수, 없으면 생성)
  --count,   -n  다운로드 장수 (기본 3)
  --prefix,  -p  파일명 prefix (기본 = query 첫 단어)
  --license      허용 라이선스 CSV (기본 cc0,by,by-sa — 상업·수정 허용 위주)
  --orientation  tall|wide|square (기본 무관)
  --min-width    최소 가로 픽셀 (기본 800)

종료 코드: 0=성공(1장 이상), 3=0장(검색 결과 없음/전부 실패), 2=인자 오류
"""
import argparse
import json
import os
import sys
import urllib.parse
import urllib.request

API = "https://api.openverse.org/v1/images/"
UA = "m2slide-free-image/1.0 (https://github.com/Finfra/m2slide)"


def http_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    if len(data) < 1024:  # too small = likely error page
        raise ValueError("payload too small (%d bytes)" % len(data))
    with open(path, "wb") as f:
        f.write(data)
    return len(data)


def ext_of(url, default=".jpg"):
    path = urllib.parse.urlparse(url).path
    e = os.path.splitext(path)[1].lower()
    return e if e in (".jpg", ".jpeg", ".png", ".webp", ".gif") else default


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--query", "-q", required=True)
    ap.add_argument("--out", "-o", required=True)
    ap.add_argument("--count", "-n", type=int, default=3)
    ap.add_argument("--prefix", "-p", default=None)
    ap.add_argument("--license", default="cc0,by,by-sa")
    ap.add_argument("--orientation", default=None, choices=[None, "tall", "wide", "square"])
    ap.add_argument("--min-width", type=int, default=800)
    args = ap.parse_args()

    prefix = args.prefix or args.query.split()[0].lower()
    os.makedirs(args.out, exist_ok=True)

    params = {
        "q": args.query,
        "license": args.license,
        "page_size": max(args.count * 5, 20),  # over-fetch for failure tolerance
        "mature": "false",
    }
    if args.orientation:
        params["aspect_ratio"] = {"tall": "tall", "wide": "wide", "square": "square"}[args.orientation]
    url = API + "?" + urllib.parse.urlencode(params)

    try:
        data = http_json(url)
    except Exception as e:
        print("❌ API 요청 실패: %s" % e, file=sys.stderr)
        sys.exit(3)

    results = data.get("results", [])
    if not results:
        print("❌ '%s' 검색 결과 없음" % args.query, file=sys.stderr)
        sys.exit(3)

    credits_path = os.path.join(args.out, "CREDITS.md")
    saved = []
    idx = 0
    for r in results:
        if len(saved) >= args.count:
            break
        img_url = r.get("url")
        if not img_url:
            continue
        w = r.get("width") or 0
        if w and w < args.min_width:
            continue
        idx += 1
        fname = "%s_%02d%s" % (prefix, idx, ext_of(img_url))
        fpath = os.path.join(args.out, fname)
        try:
            size = download(img_url, fpath)
        except Exception as e:
            print("  ⚠️ skip %s (%s)" % (img_url[:60], e), file=sys.stderr)
            idx -= 1
            continue
        saved.append({
            "file": fname,
            "title": r.get("title") or "(untitled)",
            "creator": r.get("creator") or "unknown",
            "license": "%s %s" % ((r.get("license") or "").upper(), r.get("license_version") or ""),
            "license_url": r.get("license_url") or "",
            "source": r.get("foreign_landing_url") or img_url,
            "attribution": r.get("attribution") or "",
        })
        print("  ✅ %s  (%.0f KB)  [%s]" % (fname, size / 1024, saved[-1]["license"].strip()))

    if not saved:
        print("❌ 다운로드 성공 0장 (전부 실패 또는 필터 제외)", file=sys.stderr)
        sys.exit(3)

    # CREDITS.md append (있으면 이어붙임)
    header_needed = not os.path.exists(credits_path)
    with open(credits_path, "a", encoding="utf-8") as f:
        if header_needed:
            f.write("# 이미지 출처 (CREDITS)\n\n")
            f.write("Openverse(https://openverse.org)로 수집한 CC 라이선스 이미지. ")
            f.write("CC-BY/BY-SA 는 저작자 표시 의무가 있으므로 발표·배포 시 아래 출처를 유지할 것.\n\n")
        f.write("## '%s' (%s)\n\n" % (args.query, prefix))
        for s in saved:
            f.write("* **%s** — %s\n" % (s["file"], s["title"]))
            f.write("    - 저작자: %s\n" % s["creator"])
            f.write("    - 라이선스: %s <%s>\n" % (s["license"].strip(), s["license_url"]))
            f.write("    - 출처: %s\n" % s["source"])
        f.write("\n")

    print("\n✅ %d장 저장 → %s" % (len(saved), args.out))
    print("📝 출처 기록 → %s" % credits_path)
    sys.exit(0)


if __name__ == "__main__":
    main()
