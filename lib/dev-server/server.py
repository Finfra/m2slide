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
from urllib.parse import urlparse, parse_qs, unquote


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


def render_raw_nav(file_path: str, n: int, total: int, mode: str = 'raw') -> str:
    """Render top-fixed nav bar for raw view (1-base n, matches live #/n)."""
    prev_n = max(1, n - 1)
    next_n = min(total, n + 1)
    other_mode = 'text' if mode == 'raw' else 'raw'
    other_label = 'plain text' if mode == 'raw' else 'design'
    return (
        f'<nav class="raw-nav" id="raw-nav">'
        f'<code>{file_path}</code> · '
        f'slide <b>{n}</b>/{total} '
        f' · <a href="/_dev/{mode}?file={file_path}&n={prev_n}">← prev</a>'
        f' · <a href="/_dev/{mode}?file={file_path}&n={next_n}">next →</a>'
        f' · <a href="/_dev/list?file={file_path}">list</a>'
        f' · <a href="/{file_path.lstrip("/")}#/{n}">live</a>'
        f' · <a href="/_dev/{other_mode}?file={file_path}&n={n}">{other_label}</a>'
        f'</nav>'
    )


def inject_raw_design_view(html: str, n: int, total: int, file_path: str) -> str:
    """Modify the original build HTML to serve as a 'raw design view':
       - inject nav bar (sticky top)
       - inject script: disable reveal.js transitions + jump to slide n-1 (0-base internal)
       - keep reveal.js, theme CSS, all scripts intact → full design fidelity
    """
    nav = render_raw_nav(file_path, n, total, mode='raw')
    extra_css = (
        '<style id="raw-design-css">'
        '.raw-nav{position:fixed;top:0;left:0;right:0;background:#f0f8fa;'
        'padding:8px 16px;font-size:13px;border-bottom:1px solid #ccc;z-index:99999;'
        'font-family:-apple-system,BlinkMacSystemFont,sans-serif;line-height:1.6;color:#222}'
        '.raw-nav a{color:#0a6;text-decoration:none;margin:0 4px}'
        '.raw-nav a:hover{text-decoration:underline}'
        '.raw-nav code{background:#fff;padding:1px 4px;border-radius:3px;font-size:11px}'
        '@media (prefers-color-scheme:dark){'
        '.raw-nav{background:#2a3a3e;color:#e0e0e0;border-bottom-color:#444}'
        '.raw-nav a{color:#7dd}.raw-nav code{background:#1a1a1a}}'
        '</style>'
    )
    # init script: wait for Reveal.ready, disable transitions only, jump to slide(n-1)
    # m2slide hashOneBasedIndex — Reveal.slide() is 0-base internally, so pass n-1
    # Use Reveal.on('ready', ...) so reveal.js full init (layout calc, CSS apply) completes first
    init_script = (
        '<script id="raw-design-init">'
        '(function(){'
        'function disableTransitions(){'
        'try{Reveal.configure({transition:"none",backgroundTransition:"none",autoSlide:0});}catch(e){}'
        f'try{{Reveal.slide({n - 1}, 0);}}catch(e){{}}'
        '}'
        'function hook(){'
        'if(window.Reveal&&typeof Reveal.on==="function"){'
        'if(Reveal.isReady&&Reveal.isReady()){disableTransitions();}'
        'else{Reveal.on("ready",disableTransitions);}'
        'return;}'
        'setTimeout(hook,30);'
        '}'
        'if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",hook);}'
        'else{hook();}'
        '})();'
        '</script>'
    )
    # inject extra_css just before </head>
    head_close = re.search(r'</head\s*>', html, re.IGNORECASE)
    if head_close:
        html = html[:head_close.start()] + extra_css + html[head_close.start():]
    # inject nav + init_script just before </body>
    body_close = re.search(r'</body\s*>', html, re.IGNORECASE)
    if body_close:
        html = html[:body_close.start()] + nav + init_script + html[body_close.start():]
    else:
        html = html + nav + init_script
    return html


def wrap_text_html(file_path: str, n: int, total: int, section_html: str,
                   head_links: str = '') -> str:
    """Wrap a single section as plain-text-style HTML (no reveal.js, no theme layout).

    For curl + grep — keep theme stylesheets so colors/fonts stay similar but
    bypass reveal.js coordinate system entirely.
    """
    nav = render_raw_nav(file_path, n, total, mode='text')
    return (
        '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
        f'<title>m2slide text — {file_path}#{n}</title>'
        f'{head_links}'
        '<style>'
        'body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;'
        'max-width:1024px;margin:0 auto;padding:50px 24px 60px;line-height:1.6;background:#fafafa;color:#222}'
        '.text-section{background:#fff;padding:24px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.08)}'
        '.text-section h1,.text-section h2,.text-section h3{margin-top:0.8em}'
        'pre{background:#2d2d2d;color:#f8f8f2;padding:12px;border-radius:4px;overflow-x:auto}'
        'code{background:#f3f3f3;padding:2px 6px;border-radius:3px}'
        'img{max-width:100%}'
        '.raw-nav{position:fixed;top:0;left:0;right:0;background:#f0f8fa;padding:8px 16px;'
        'font-size:13px;border-bottom:1px solid #ccc;z-index:99999;line-height:1.6}'
        '.raw-nav a{color:#0a6;text-decoration:none;margin:0 4px}'
        '.raw-nav a:hover{text-decoration:underline}'
        '@media (prefers-color-scheme: dark){body{background:#1a1a1a;color:#e0e0e0}'
        '.text-section{background:#222}'
        '.raw-nav{background:#2a3a3e;color:#e0e0e0}.raw-nav a{color:#7dd}'
        'code{background:#2d2d2d;color:#e0e0e0}}'
        '</style></head><body>'
        f'{nav}'
        f'<div class="text-section">{section_html}</div>'
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

    # /Projects/.../X.html/<N>  →  text section (zsh-friendly direct URL)
    # Trailing slash optional.  HTTP fragment (#/N) cannot reach the server,
    # so this path-segment form is the curl-friendly equivalent.
    _DIRECT_SLIDE_RE = re.compile(r'^(.+?\.html)/(\d+)/?$', re.IGNORECASE)

    def do_GET(self):
        # Path-segment form (zsh-friendly — no ? or # in URL):
        #   /_dev/raw/<n>/<file path...>     → 302 to live URL with #/N
        #   /_dev/text/<n>/<file path...>    → plain text section
        #   /_dev/list/<file path...>        → section index
        #   /<build path>/X.html/<n>         → plain text section (direct curl form)
        # Query form (legacy, also supported):
        #   /_dev/raw?file=<path>&n=<n>
        #   /_dev/text?file=<path>&n=<n>
        #   /_dev/list?file=<path>[&format=json]
        if self.path.startswith('/_dev/raw'):
            return self._serve_raw()
        if self.path.startswith('/_dev/text'):
            return self._serve_text()
        if self.path.startswith('/_dev/list'):
            return self._serve_list()
        if self.path == '/_dev/' or self.path == '/_dev':
            return self._serve_help()
        # Direct slide form: /<build path>/X.html/<n> (no query, no hash)
        path_only = self.path.split('?', 1)[0].split('#', 1)[0]
        m = self._DIRECT_SLIDE_RE.match(path_only)
        if m:
            file_path = m.group(1).lstrip('/')
            try:
                n = int(m.group(2))
            except ValueError:
                return super().do_GET()
            return self._serve_direct_slide(file_path, n)
        return super().do_GET()

    def _serve_direct_slide(self, file_path: str, n: int):
        """Handle /<build path>/X.html/<n> — equivalent to /_dev/text/<n>/<path>.

        Content-negotiation: ?mode=raw or Accept: text/html with X-Direct-Mode
        could redirect to live; default is text (curl-friendly).
        """
        resolved = self._resolve_file_path(file_path)
        if resolved is None:
            return
        full, rel = resolved
        html = self._read_file(full)
        spans = find_top_section_spans(html)
        if not spans:
            self.send_error(404, f'no <section> found inside .slides for {rel}')
            return
        total = len(spans)
        if n < 1 or n > total:
            self.send_error(404, f'slide {n} out of range (1..{total})')
            return
        # mode=raw query → redirect to live URL with #/N (browser design view)
        q = parse_qs(urlparse(self.path).query)
        if q.get('mode', [''])[0] == 'raw':
            target = '/' + rel.lstrip('/') + '#/' + str(n)
            self.send_response(302)
            self.send_header('Location', target)
            self.send_header('Content-Length', '0')
            self.end_headers()
            return
        s, e = spans[n - 1]
        section_html = html[s:e]
        head_links = '\n'.join(re.findall(
            r'<link\s+rel="stylesheet"[^>]+>', html, flags=re.IGNORECASE))
        self._write_html(wrap_text_html(rel, n, total, section_html, head_links))

    # --- path parsing helpers ---

    @staticmethod
    def _parse_path_segments(path: str, prefix: str, expect_n: bool):
        """Parse /_dev/<endpoint>/<n>/<file...> form. Returns (n, file) or None.

        n optional (only required when expect_n=True). file may contain slashes.
        """
        if not path.startswith(prefix):
            return None
        rest = path[len(prefix):]
        # strip query string and hash if any
        rest = rest.split('?', 1)[0].split('#', 1)[0]
        if not rest:
            return None
        parts = rest.lstrip('/').split('/', 1) if expect_n else ['', rest.lstrip('/')]
        if expect_n:
            if len(parts) < 2:
                return None
            try:
                n = int(parts[0])
            except ValueError:
                return None
            file_path = parts[1]
        else:
            n = None
            file_path = parts[1] if len(parts) > 1 else parts[0]
        if not file_path:
            return None
        return (n, file_path)

    # --- helpers ---

    def _resolve_file_path(self, f):
        """Validate file path (relative to document root). Returns (full, rel) or None."""
        if not f:
            self.send_error(400, 'file path required')
            return None
        f = unquote(f)
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

    def _resolve_request(self, prefix: str, expect_n: bool):
        """Try path-segment form first, then fall back to query form.

        Returns (full, rel, n) or None (with error already sent).
        """
        # path-segment: /_dev/<endpoint>/<n?>/<file...>
        seg = self._parse_path_segments(self.path, prefix + '/', expect_n)
        if seg is not None:
            n, f = seg
            resolved = self._resolve_file_path(f)
            if resolved is None:
                return None
            return (resolved[0], resolved[1], n)
        # query form: /_dev/<endpoint>?file=...&n=...
        q = parse_qs(urlparse(self.path).query)
        f = (q.get('file', [None])[0] or '').strip()
        if not f:
            self.send_error(400, 'either path /_dev/<n>/<file> or query ?file=<path> required')
            return None
        resolved = self._resolve_file_path(f)
        if resolved is None:
            return None
        n = None
        if expect_n:
            try:
                n = int(q.get('n', ['1'])[0])
            except ValueError:
                self.send_error(400, '"n" must be an integer (1-base)')
                return None
        return (resolved[0], resolved[1], n)

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
        """Design-fidelity view: 302 redirect to live URL with #/N hash.

        URL forms (both supported):
          path-segment (zsh-friendly): /_dev/raw/<n>/<file path>
          query (legacy):              /_dev/raw?file=<path>&n=<n>
        """
        resolved = self._resolve_request('/_dev/raw', expect_n=True)
        if resolved is None:
            return
        full, rel, n = resolved
        html = self._read_file(full)
        spans = find_top_section_spans(html)
        if not spans:
            self.send_error(404, f'no <section> found inside .slides for {rel}')
            return
        total = len(spans)
        if n is None:
            n = 1
        if n < 1 or n > total:
            self.send_error(404, f'slide {n} out of range (1..{total})')
            return
        target = '/' + rel.lstrip('/') + '#/' + str(n)
        self.send_response(302)
        self.send_header('Location', target)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def _serve_text(self):
        """Plain-text view: only the N-th <section>, no reveal.js, no animation.

        URL forms:
          /_dev/text/<n>/<file path>          (zsh-friendly)
          /_dev/text?file=<path>&n=<n>        (legacy)
        """
        resolved = self._resolve_request('/_dev/text', expect_n=True)
        if resolved is None:
            return
        full, rel, n = resolved
        html = self._read_file(full)
        spans = find_top_section_spans(html)
        if not spans:
            self.send_error(404, f'no <section> found inside .slides for {rel}')
            return
        total = len(spans)
        if n is None:
            n = 1
        if n < 1 or n > total:
            self.send_error(404, f'slide {n} out of range (1..{total})')
            return
        s, e = spans[n - 1]
        section_html = html[s:e]
        head_links = '\n'.join(re.findall(
            r'<link\s+rel="stylesheet"[^>]+>', html, flags=re.IGNORECASE))
        self._write_html(wrap_text_html(rel, n, total, section_html, head_links))

    def _serve_list(self):
        """Section index.

        URL forms:
          /_dev/list/<file path>              (zsh-friendly)
          /_dev/list?file=<path>[&format=json] (legacy)
        Query/Accept header controls JSON vs HTML output.
        """
        resolved = self._resolve_request('/_dev/list', expect_n=False)
        if resolved is None:
            return
        full, rel, _ = resolved
        q = parse_qs(urlparse(self.path).query)
        html = self._read_file(full)
        spans = find_top_section_spans(html)
        sections = []
        for i, (s, e) in enumerate(spans):
            sec = html[s:e]
            one = i + 1  # 1-base to match m2slide hashOneBasedIndex
            sections.append({
                'n': one,
                'title': extract_section_title(sec),
                'bytes': e - s,
                'raw_url': f'/_dev/raw/{one}/{rel}',
                'text_url': f'/_dev/text/{one}/{rel}',
                'live_url': f'/{rel.lstrip("/")}#/{one}',
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
            f'<tr><td>{s["n"]}</td>'
            f'<td><a href="{s["raw_url"]}">{s["title"] or "(no title)"}</a></td>'
            f'<td><a href="{s["text_url"]}">text</a></td>'
            f'<td><a href="{s["live_url"]}">live</a></td>'
            f'<td>{s["bytes"]}</td></tr>'
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
            '<table><thead><tr><th>n</th><th>title (→ raw design)</th><th>text</th><th>live</th><th>bytes</th></tr></thead>'
            f'<tbody>{rows}</tbody></table>'
            '</body></html>'
        )
        self._write_html(body)

    def _serve_help(self):
        body = (
            '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
            '<title>m2slide dev-server — /_dev/</title>'
            '<style>body{font-family:sans-serif;max-width:820px;margin:0 auto;padding:24px;line-height:1.6}'
            'code{background:#f3f3f3;padding:2px 6px;border-radius:3px}'
            'pre{background:#2d2d2d;color:#f8f8f2;padding:12px;border-radius:4px;overflow-x:auto}</style></head><body>'
            '<h1>m2slide dev-server — /_dev/ endpoints (Issue236)</h1>'
            '<p>Three view modes for slide content. All <code>n</code> indices are <b>1-base</b> '
            '(matches m2slide hashOneBasedIndex — same number as live URL <code>#/N</code>).</p>'
            '<p><b>URL forms</b> — path-segment (zsh-friendly, no quoting needed) or query (legacy).</p>'
            '<h2>/_dev/raw — design view (302 redirect to live)</h2>'
            '<p>m2slide build artifact loaded with hash <code>#/N</code>. Full design fidelity.</p>'
            '<pre># path-segment (recommended)\n'
            'curl -L http://127.0.0.1:9877/_dev/raw/15/Projects/m2SlideStyle1_single/slide/index.html\n\n'
            '# query (legacy — needs quoting in shells)\n'
            'curl \'http://127.0.0.1:9877/_dev/raw?file=Projects/m2SlideStyle1_single/slide/index.html&n=15\'</pre>'
            '<h2>/_dev/text — plain HTML (curl + grep)</h2>'
            '<p>Only the N-th <code>&lt;section&gt;</code> as plain HTML. No reveal.js, no transition. Curl friendly.</p>'
            '<pre>curl http://127.0.0.1:9877/_dev/text/15/Projects/m2SlideStyle1_single/slide/index.html</pre>'
            '<h2>/_dev/list — section index</h2>'
            '<p>All sections (title + bytes + URLs). HTML default, JSON via <code>?format=json</code> or '
            '<code>Accept: application/json</code>.</p>'
            '<pre># HTML\n'
            'curl http://127.0.0.1:9877/_dev/list/Projects/m2SlideStyle1_single/slide/index.html\n\n'
            '# JSON\n'
            'curl -H "Accept: application/json" http://127.0.0.1:9877/_dev/list/Projects/m2SlideStyle1_single/slide/index.html</pre>'
            '<h2>file path</h2>'
            '<p>Relative to the m2slide project root. Path traversal blocked. <code>.html</code> only.</p>'
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
