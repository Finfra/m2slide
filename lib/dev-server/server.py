#!/usr/bin/env python3
"""m2slide dev-server — Issue235 / Issue236

localhost-only static HTTP server for m2slide build artifacts.
Document root = m2slide project root (passed via --root).
Bound to 127.0.0.1 only.

Extra endpoints (Issue236 — curl-friendly raw views, bypass reveal.js JS render):
  GET /_dev/raw?file=<path>&n=<idx>   → N-th top-level <section> of <path> as plain HTML
  GET /_dev/list?file=<path>          → JSON index of all top-level sections (count, titles)
  GET /_dev/                          → help page

These endpoints are dev-only; they are NOT part of build artifacts and do not
affect file:// deployment. The file-deployment rule remains intact.

SSOT: lib/m2slide/_doc_arch/dev-server.md
"""

import argparse
import json
import os
import re
import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs


# ---------- section extraction ----------

_SLIDES_RE = re.compile(r'<div\b[^>]*\bclass="[^"]*\bslides\b[^"]*"[^>]*>', re.IGNORECASE)
_OPEN_RE = re.compile(r'<section\b', re.IGNORECASE)
_CLOSE_RE = re.compile(r'</section\s*>', re.IGNORECASE)


def find_top_section_spans(html: str):
    """Return list of (start, end) spans for top-level <section>...</section>
    inside the first .reveal .slides container.

    Nested <section> (vertical slides) are kept inside the parent span — not split.
    """
    m = _SLIDES_RE.search(html)
    if not m:
        return []
    # find the matching > of the div tag (already consumed by regex)
    scan_start = m.end()
    spans = []
    depth = 0
    section_start = -1
    pos = scan_start
    while pos < len(html):
        om = _OPEN_RE.search(html, pos)
        cm = _CLOSE_RE.search(html, pos)
        if not om and not cm:
            break
        if om and (not cm or om.start() < cm.start()):
            if depth == 0:
                section_start = om.start()
            depth += 1
            # advance past the opening tag (to its >)
            gt = html.find('>', om.end())
            pos = (gt + 1) if gt >= 0 else om.end()
        else:
            depth -= 1
            pos = cm.end()
            if depth == 0 and section_start >= 0:
                spans.append((section_start, cm.end()))
                section_start = -1
            elif depth < 0:
                # we walked out of .slides
                break
    return spans


def extract_section_title(section_html: str) -> str:
    """First h1/h2/h3 text content (tags stripped)."""
    m = re.search(r'<h[1-3][^>]*>(.*?)</h[1-3]>', section_html, re.IGNORECASE | re.DOTALL)
    if not m:
        return ''
    text = re.sub(r'<[^>]+>', '', m.group(1))
    return re.sub(r'\s+', ' ', text).strip()


def wrap_raw_html(file_path: str, n: int, total: int, section_html: str, head_links: str = '') -> str:
    """Wrap a single section into a minimal standalone HTML page."""
    nav = (
        f'<nav style="background:#f0f8fa;padding:8px 16px;font-size:13px;'
        f'border-bottom:1px solid #ccc;margin-bottom:16px">'
        f'file=<code>{file_path}</code> · slide=<b>{n}</b>/<span>{total - 1}</span>'
        f' · <a href="/_dev/list?file={file_path}">list</a>'
        f' · <a href="/{file_path.lstrip("/")}#/{n}">live view</a>'
        f'</nav>'
    )
    return (
        '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
        f'<title>m2slide raw — {file_path}#{n}</title>'
        f'{head_links}'
        '<style>'
        'body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;'
        'max-width:1024px;margin:0 auto;padding:0 24px 60px;line-height:1.6;background:#fafafa;color:#222}'
        'section{background:#fff;padding:24px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.08)}'
        'h1,h2,h3,h4{margin-top:0.8em}'
        'pre{background:#2d2d2d;color:#f8f8f2;padding:12px;border-radius:4px;overflow-x:auto}'
        'code{background:#f3f3f3;padding:2px 6px;border-radius:3px}'
        'img{max-width:100%}'
        'table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px 12px}'
        '@media (prefers-color-scheme: dark){body{background:#1a1a1a;color:#e0e0e0}'
        'section{background:#222}'
        'nav{background:#2a3a3e !important;color:#e0e0e0}'
        'nav a{color:#7dd}'
        'code{background:#2d2d2d;color:#e0e0e0}'
        'td,th{border-color:#444}}'
        '</style></head><body>'
        f'{nav}'
        f'{section_html}'
        '</body></html>'
    )


# ---------- HTTP handler ----------

class DevHandler(SimpleHTTPRequestHandler):
    """Static serve + /_dev/{raw,list,help} endpoints (Issue236)."""

    def log_message(self, format, *args):
        try:
            code = int(args[1]) if len(args) > 1 else 0
            if code >= 400:
                sys.stderr.write("%s - - [%s] %s\n" % (
                    self.address_string(), self.log_date_time_string(), format % args))
        except (ValueError, IndexError):
            pass

    def do_GET(self):
        if self.path.startswith('/_dev/raw'):
            return self._serve_raw()
        if self.path.startswith('/_dev/list'):
            return self._serve_list()
        if self.path == '/_dev/' or self.path == '/_dev':
            return self._serve_help()
        return super().do_GET()

    # --- helpers ---

    def _resolve_file(self, q):
        f = (q.get('file', [None])[0] or '').strip()
        if not f:
            self.send_error(400, 'query "file=<relative path>" required')
            return None
        # security: prevent directory traversal
        root = os.getcwd()
        full = os.path.normpath(os.path.join(root, f.lstrip('/')))
        if not full.startswith(root + os.sep) and full != root:
            self.send_error(403, 'forbidden: path escapes document root')
            return None
        if not os.path.isfile(full):
            self.send_error(404, f'not found: {f}')
            return None
        if not full.endswith('.html'):
            self.send_error(400, 'only .html files supported')
            return None
        return full, f

    def _read_file(self, full):
        with open(full, 'r', encoding='utf-8') as fh:
            return fh.read()

    def _write_html(self, body: str, status: int = 200):
        data = body.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _write_json(self, obj, status: int = 200):
        data = json.dumps(obj, ensure_ascii=False, indent=2).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    # --- endpoints ---

    def _serve_raw(self):
        q = parse_qs(urlparse(self.path).query)
        resolved = self._resolve_file(q)
        if resolved is None:
            return
        full, rel = resolved
        try:
            n = int(q.get('n', ['0'])[0])
        except ValueError:
            self.send_error(400, '"n" must be an integer')
            return
        html = self._read_file(full)
        spans = find_top_section_spans(html)
        if not spans:
            self.send_error(404, f'no <section> found inside .slides for {rel}')
            return
        if n < 0 or n >= len(spans):
            self.send_error(404, f'slide index {n} out of range (0..{len(spans) - 1})')
            return
        s, e = spans[n]
        section_html = html[s:e]
        # carry over <link rel="stylesheet"> from original head for design fidelity
        head_links = '\n'.join(re.findall(
            r'<link\s+rel="stylesheet"[^>]+>', html, flags=re.IGNORECASE))
        self._write_html(wrap_raw_html(rel, n, len(spans), section_html, head_links))

    def _serve_list(self):
        q = parse_qs(urlparse(self.path).query)
        resolved = self._resolve_file(q)
        if resolved is None:
            return
        full, rel = resolved
        html = self._read_file(full)
        spans = find_top_section_spans(html)
        sections = []
        for i, (s, e) in enumerate(spans):
            sec = html[s:e]
            sections.append({
                'n': i,
                'title': extract_section_title(sec),
                'bytes': e - s,
                'raw_url': f'/_dev/raw?file={rel}&n={i}',
                'live_url': f'/{rel.lstrip("/")}#/{i}',
            })
        # Content-negotiation by Accept header — HTML default, JSON if asked
        accept = self.headers.get('Accept', '')
        if 'application/json' in accept or q.get('format', [''])[0] == 'json':
            return self._write_json({
                'file': rel,
                'count': len(spans),
                'sections': sections,
            })
        # HTML index
        rows = '\n'.join(
            f'<tr><td>{s["n"]}</td><td><a href="{s["raw_url"]}">{s["title"] or "(no title)"}</a></td>'
            f'<td><a href="{s["live_url"]}">live</a></td><td>{s["bytes"]}</td></tr>'
            for s in sections
        )
        body = (
            '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
            f'<title>m2slide raw list — {rel}</title>'
            '<style>body{font-family:sans-serif;max-width:900px;margin:0 auto;padding:24px;line-height:1.5}'
            'table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 10px;text-align:left}'
            'th{background:#f0f8fa}'
            '</style></head><body>'
            f'<h1>raw section list</h1><p>file: <code>{rel}</code> · count: {len(spans)}</p>'
            '<table><thead><tr><th>n</th><th>title (→ raw)</th><th>live</th><th>bytes</th></tr></thead>'
            f'<tbody>{rows}</tbody></table>'
            '</body></html>'
        )
        self._write_html(body)

    def _serve_help(self):
        body = (
            '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
            '<title>m2slide dev-server — /_dev/</title>'
            '<style>body{font-family:sans-serif;max-width:820px;margin:0 auto;padding:24px;line-height:1.6}'
            'code{background:#f3f3f3;padding:2px 6px;border-radius:3px}</style></head><body>'
            '<h1>m2slide dev-server — /_dev/ endpoints (Issue236)</h1>'
            '<p>curl-friendly slide content views, bypassing reveal.js JS render.</p>'
            '<h2>/_dev/raw?file=&lt;path&gt;&n=&lt;idx&gt;</h2>'
            '<p>N-th top-level <code>&lt;section&gt;</code> of the .html file as plain HTML.</p>'
            '<pre>curl \'http://127.0.0.1:9877/_dev/raw?file=Projects/m2SlideStyle1_single/slide/index.html&n=10\'</pre>'
            '<h2>/_dev/list?file=&lt;path&gt;[&format=json]</h2>'
            '<p>Index of all top-level sections (titles + bytes + raw URLs). HTML default, JSON with <code>format=json</code> or <code>Accept: application/json</code>.</p>'
            '<pre>curl \'http://127.0.0.1:9877/_dev/list?file=Projects/m2SlideStyle1_single/slide/index.html&format=json\'</pre>'
            '<h2>file path</h2>'
            '<p>Relative to the m2slide project root. Path traversal is blocked. Only <code>.html</code> supported.</p>'
            '</body></html>'
        )
        self._write_html(body)


# ---------- entry point ----------

def main():
    parser = argparse.ArgumentParser(description="m2slide dev-server")
    parser.add_argument("--root", required=True, help="document root (m2slide project root)")
    parser.add_argument("--port", type=int, default=9877, help="port (default 9877)")
    parser.add_argument("--bind", default="127.0.0.1", help="bind address (default 127.0.0.1)")
    args = parser.parse_args()

    root = os.path.abspath(args.root)
    if not os.path.isdir(root):
        sys.stderr.write("ERROR: root does not exist: %s\n" % root)
        sys.exit(1)

    os.chdir(root)
    server = ThreadingHTTPServer((args.bind, args.port), DevHandler)
    sys.stderr.write("m2slide dev-server listening on http://%s:%d/ root=%s\n" % (
        args.bind, args.port, root))
    sys.stderr.write("  /_dev/        — help\n")
    sys.stderr.write("  /_dev/list?file=PATH         — section index\n")
    sys.stderr.write("  /_dev/raw?file=PATH&n=N      — single section (curl-friendly)\n")
    sys.stderr.flush()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        sys.stderr.write("\nshutting down\n")
        server.shutdown()


if __name__ == "__main__":
    main()
