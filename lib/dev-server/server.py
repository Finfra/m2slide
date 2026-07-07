#!/usr/bin/env python3
"""m2slide dev-server — Issue235 / Issue236

localhost-only static HTTP server for m2slide build artifacts.
Document root = m2slide project root (passed via --root).
Bound to 127.0.0.1 only.

Short URL routing (Issue236.5~12 · Issue248):
  GET /p/<project>/s/<chap>/<slide>            → solo design view (single section)
  GET /p/<project>/s/<chap>/<slide>?mode=nav   → deck design view (full deck + navigation)
  GET /p/<project>/s/<chap>/<slide>?mode=text  → plain text section (curl-friendly)
  GET /p/<project>                             → slide list overview
  GET /p/<project>/s/cover                     → index.html proxy (markmap)
  GET /p/<project>/s/<chap>/toc                → chap N first slide

Issue248 — bare semantic flip:
  - Default (bare) = solo: single <section> only, full theme/CSS/JS preserved
  - ?mode=nav = legacy deck behavior (Issue236 default before Issue248)
  - ?mode=text = curl-friendly plain text (unchanged)
  - Hash #/N is not transmitted to server (browser-strip) → mode must be query

This server is dev-only; it is NOT part of build artifacts and does not affect
file:// deployment. The file-deployment rule remains intact.

SSOT: lib/m2slide/_doc_arch/dev-server.md
"""

import argparse
import datetime
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


_PATH_PROJECT_RE = re.compile(
    r'^Projects/([^/]+)/slide/(.+)\.html$', re.IGNORECASE)


def to_short_url(file_path: str, n=None, mode: str = '') -> str:
    """Convert Projects/<P>/slide/<X>.html [+ n] to /p/<P>[/<X>]/s/<n>[?mode=text].

    Returns shortened URL when path matches build-artifact convention, else falls
    back to long path with #/N hash.
    Default (bare) = browser design view. ?mode=text = curl-friendly text section.
    """
    m = _PATH_PROJECT_RE.match(file_path.lstrip('/'))
    if not m:
        long = '/' + file_path.lstrip('/')
        return long if n is None else f'{long}#/{n}'
    project, stem = m.group(1), m.group(2)
    chapter_seg = '' if stem == 'index' else f'/{stem}'
    # design view is default — only text needs ?mode=text
    suffix = '?mode=text' if mode == 'text' else ''
    if n is None:
        # list/overview link — chapter dropped (always project root)
        return f'/p/{project}'
    return f'/p/{project}{chapter_seg}/s/{n}{suffix}'


def render_raw_nav_with_urls(file_path: str, n: int, total: int,
                              prev_url: str, next_url: str,
                              list_url: str, live_url: str) -> str:
    """Render top-fixed nav bar with pre-computed short URLs."""
    return (
        f'<nav class="raw-nav" id="raw-nav">'
        f'<code>{file_path}</code> · '
        f'slide <b>{n}</b>/{total} '
        f' · <a href="{prev_url}">← prev</a>'
        f' · <a href="{next_url}">next →</a>'
        f' · <a href="{list_url}">list</a>'
        f' · <a href="{live_url}">live</a>'
        f'</nav>'
    )


def render_raw_nav(file_path: str, n: int, total: int, mode: str = 'text') -> str:
    """Legacy fallback for callers without chap_idx context — uses to_short_url."""
    prev_n = max(1, n - 1)
    next_n = min(total, n + 1)
    return render_raw_nav_with_urls(
        file_path, n, total,
        prev_url=to_short_url(file_path, prev_n, 'text'),
        next_url=to_short_url(file_path, next_n, 'text'),
        list_url=to_short_url(file_path),
        live_url=to_short_url(file_path, n),
    )


def wrap_text_html(file_path: str, n: int, total: int, section_html: str,
                   head_links: str = '', nav_html: str = None) -> str:
    """Wrap a single section as plain-text-style HTML (no reveal.js, no theme layout).

    For curl + grep — keep theme stylesheets so colors/fonts stay similar but
    bypass reveal.js coordinate system entirely. nav_html may be precomputed
    (with chap_idx-aware URLs) by the caller; otherwise falls back to legacy.
    """
    nav = nav_html if nav_html is not None else render_raw_nav(file_path, n, total, mode='text')
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
    """Short-form `/p/<P>/...` routing + build-artifact proxy (Issue236)."""

    def log_message(self, format, *args):
        try:
            code = int(args[1]) if len(args) > 1 else 0
            if code >= 400:
                sys.stderr.write("%s - - [%s] %s\n" % (
                    self.address_string(), self.log_date_time_string(), format % args))
        except Exception:
            try:
                sys.stderr.write("log_message error\n")
            except Exception:
                pass

    # Direct slide form: /Projects/.../X.html/<N>
    _DIRECT_SLIDE_RE = re.compile(r'^(.+?\.html)/(\d+)/?$', re.IGNORECASE)
    # Legacy build-artifact .html access — caught and redirected to short /p/ form
    _LEGACY_BUILD_HTML_RE = re.compile(
        r'^/Projects/([^/]+)/slide/(.+)\.html$', re.IGNORECASE)
    # Legacy build-artifact directory access (no .html, trailing slash etc.)
    #   /Projects                     → /p/
    #   /Projects/<P>                 → /p/<P>
    #   /Projects/<P>/slide           → /p/<P>
    #   /Projects/<P>/slide/          → /p/<P>
    _LEGACY_BUILD_DIR_RE = re.compile(
        r'^/Projects(?:/([^/]+)(?:/slide/?)?)?/?$', re.IGNORECASE)
    # Short form (zsh-friendly, curl-only):
    #   /p/<project>/s/<chap>/<slide>      → design view (proxy). chap, slide both 1-base
    #   /p/<project>/s/<slide>             → chap=1 (single mode index.html) shorthand
    #   /p/<project>/<chapter_name>/s/<n>  → design view, chapter named (legacy)
    #   /p/<project>                       → HTML overview page
    #   /p/<project>/<chapter_name>        → proxy build artifact (no legacy URL)
    #   /p/<project>/slide/<path>          → static asset (CSS/JS/img) from build dir
    # ?mode=text → curl-friendly text section (bare = design view default)
    _SHORT_SLIDE_CHAP_RE = re.compile(r'^/p/([^/]+)/s/(\d+)/(\d+)/?$')
    _SHORT_SLIDE_RE = re.compile(r'^/p/([^/]+)(?:/([^/]+))?/s/(\d+)/?$')
    # Static asset routing — /p/<P>/s/<asset> or legacy /p/<P>/slide/<asset>
    # SLIDE_RE (digits only) matches first so /p/<P>/s/3 → text section, not asset
    _STATIC_ASSET_RE = re.compile(r'^/p/([^/]+)/(?:s|slide)/(.+)$')
    _SHORT_ENTRY_RE = re.compile(r'^/p/([^/]+)(?:/([^/]+))?/?$')
    _SHORT_COVER_RE = re.compile(r'^/p/([^/]+)/s/cover/?$')
    _SHORT_TOC_RE = re.compile(r'^/p/([^/]+)/s/(\d+)/toc/?$')
    _SHORT_COVER_C_RE = re.compile(r'^/p/([^/]+)/s/c/?$')
    _SHORT_AGENDA_A_RE = re.compile(r'^/p/([^/]+)/s/a/?$')
    _SHORT_TOC_T_RE = re.compile(r'^/p/([^/]+)/s/t/?$')
    # Issue248 follow-up — `/n/` path = deck nav mode (replaces `?mode=nav` query)
    # slide token = digits OR reveal.js section id (kebab-case with letters/digits/dashes)
    _SHORT_NAV_CHAP_RE = re.compile(r'^/p/([^/]+)/n/(\d+)/([A-Za-z0-9][\w-]*)/?$')
    _SHORT_NAV_CHAPONLY_RE = re.compile(r'^/p/([^/]+)/n/(\d+)/?$')
    _SHORT_NAV_C_RE = re.compile(r'^/p/([^/]+)/n/c/?$')
    _SHORT_NAV_A_RE = re.compile(r'^/p/([^/]+)/n/a/?$')
    _SHORT_NAV_T_RE = re.compile(r'^/p/([^/]+)/n/t/?$')

    def do_GET(self):
        # Direct slide form: /<build path>/X.html/<n>  → plain text section
        # All other routing via /p/<project>/... short form (Issue236.5~12).
        path_only = self.path.split('?', 1)[0].split('#', 1)[0]
        # Root landing page
        if path_only in ('/', '/index.html'):
            return self._serve_root()
        # Project list
        if path_only in ('/p', '/p/'):
            return self._serve_project_list()
        # Short form: /p/<project>/s/<chap>/<slide>  (both 1-base index, chapter mode unified)
        m = self._SHORT_SLIDE_CHAP_RE.match(path_only)
        if m:
            project, chap_str, slide_str = m.group(1), m.group(2), m.group(3)
            try:
                chap_idx, slide_idx = int(chap_str), int(slide_str)
            except ValueError:
                return super().do_GET()
            return self._serve_short_slide_indexed(project, chap_idx, slide_idx)
        # Short form: /p/<project>[/<chapter_name>]/s/<n>
        m = self._SHORT_SLIDE_RE.match(path_only)
        if m:
            project, chapter, n_str = m.group(1), m.group(2), m.group(3)
            try:
                n = int(n_str)
            except ValueError:
                return super().do_GET()
            return self._serve_short_slide(project, chapter, n)
        # Named routes (Issue240+): /s/c (cover) /s/a (agenda) /s/t (toc) — fallback chain
        m = self._SHORT_COVER_C_RE.match(path_only)
        if m:
            return self._serve_short_c(m.group(1))
        m = self._SHORT_AGENDA_A_RE.match(path_only)
        if m:
            return self._serve_short_a(m.group(1))
        m = self._SHORT_TOC_T_RE.match(path_only)
        if m:
            return self._serve_short_t(m.group(1))
        # Issue248 follow-up — /n/ path = deck navigation mode (replaces ?mode=nav)
        m = self._SHORT_NAV_CHAP_RE.match(path_only)
        if m:
            project, chap_str, slide_token = m.group(1), m.group(2), m.group(3)
            try:
                chap_idx = int(chap_str)
            except ValueError:
                return super().do_GET()
            # slide_token may be int (1-base index) or str (reveal.js section id)
            try:
                slide_value = int(slide_token)
            except ValueError:
                slide_value = slide_token
            return self._serve_short_nav_indexed(project, chap_idx, slide_value)
        m = self._SHORT_NAV_CHAPONLY_RE.match(path_only)
        if m:
            project, chap_str = m.group(1), m.group(2)
            try:
                chap_idx = int(chap_str)
            except ValueError:
                return super().do_GET()
            return self._serve_short_nav_indexed(project, chap_idx, 1)
        m = self._SHORT_NAV_C_RE.match(path_only)
        if m:
            return self._serve_nav_c(m.group(1))
        m = self._SHORT_NAV_A_RE.match(path_only)
        if m:
            return self._serve_nav_a(m.group(1))
        m = self._SHORT_NAV_T_RE.match(path_only)
        if m:
            return self._serve_nav_t(m.group(1))
        # Legacy named routes (Issue239) — 302 to new short form for compatibility:
        # /p/<P>/s/cover → /s/c · /p/<P>/s/<chap>/toc → /s/t (chap 무시)
        m = self._SHORT_COVER_RE.match(path_only)
        if m:
            return self._redirect_302(f'/p/{m.group(1)}/s/c')
        m = self._SHORT_TOC_RE.match(path_only)
        if m:
            return self._redirect_302(f'/p/{m.group(1)}/s/t')
        # Static assets: /p/<project>/slide/<path>  (CSS/JS/img from build dir)
        m = self._STATIC_ASSET_RE.match(path_only)
        if m:
            return self._serve_slide_static(m.group(1), m.group(2))
        # Short form: /p/<project>[/<chapter>]  (entry redirect)
        m = self._SHORT_ENTRY_RE.match(path_only)
        if m:
            project, chapter = m.group(1), m.group(2)
            return self._serve_short_entry(project, chapter)
        # Direct slide form: /<build path>/X.html/<n>
        m = self._DIRECT_SLIDE_RE.match(path_only)
        if m:
            file_path = m.group(1).lstrip('/')
            try:
                n = int(m.group(2))
            except ValueError:
                return super().do_GET()
            return self._serve_direct_slide(file_path, n)
        # Legacy build-artifact .html — block with 404 (Issue236.11)
        m = self._LEGACY_BUILD_HTML_RE.match(path_only)
        if m:
            return self._redirect_legacy_html(m.group(1), m.group(2))
        # Any remaining /Projects/... path (static assets, dirs) — block with 404
        if path_only.lower().startswith('/projects/'):
            return self._reject_legacy_dir(None)
        # Legacy build-artifact directory (no .html) — block with 404
        m = self._LEGACY_BUILD_DIR_RE.match(path_only)
        if m:
            return self._reject_legacy_dir(m.group(1))
        return super().do_GET()

    def _reject_legacy_dir(self, project):
        """404 for legacy /Projects[/<P>[/slide[/]]] access (Issue236.11)."""
        if project:
            suggested = f'/p/{project}'
        else:
            suggested = '/p/'
        body = (
            f'<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
            f'<title>404 — legacy URL blocked</title>'
            f'<style>body{{font-family:sans-serif;max-width:720px;margin:40px auto;padding:0 16px;line-height:1.6}}'
            f'code{{background:#f3f3f3;padding:2px 6px;border-radius:3px}}</style></head><body>'
            f'<h1>404 — legacy URL blocked</h1>'
            f'<p>Direct access to <code>/Projects/...</code> directory paths is blocked on dev-server.</p>'
            f'<p>Use: <a href="{suggested}"><code>{suggested}</code></a></p>'
            f'</body></html>'
        ).encode('utf-8')
        self.send_response(404)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _redirect_legacy_html(self, project: str, stem: str):
        """Reject legacy /Projects/<P>/slide/<X>.html access with 404 (Issue236.11).

        Earlier (Issue236.9) this 302-redirected to /p/<P>[/<stem>] for backward
        compat. Policy tightened — caller must use the short /p/ form directly.
        Suggested URL printed in response body for user discovery.
        """
        suggested = f'/p/{project}' if stem == 'index' else f'/p/{project}/{stem}'
        body = (
            f'<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
            f'<title>404 — legacy URL blocked</title>'
            f'<style>body{{font-family:sans-serif;max-width:720px;margin:40px auto;padding:0 16px;line-height:1.6}}'
            f'code{{background:#f3f3f3;padding:2px 6px;border-radius:3px}}</style></head><body>'
            f'<h1>404 — legacy URL blocked</h1>'
            f'<p>Direct access to <code>/Projects/&lt;P&gt;/slide/&lt;X&gt;.html</code> '
            f'is no longer supported on dev-server (Issue236.11).</p>'
            f'<p>Use the short form: <a href="{suggested}"><code>{suggested}</code></a></p>'
            f'<p>For a specific slide: <code>/p/&lt;P&gt;/s/&lt;chap&gt;/&lt;n&gt;</code> '
            f'(design view, default) or <code>?mode=text</code> (curl text).</p>'
            f'</body></html>'
        ).encode('utf-8')
        self.send_response(404)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _short_file_rel(self, project: str, chapter):
        """Build relative path for /p/<project>[/<chapter>] form."""
        base = f'Projects/{project}/slide'
        stem = chapter if chapter else 'index'
        return f'{base}/{stem}.html'

    def _resolve_chapter_index(self, project: str, chap_idx: int):
        """Map 1-base chapter index to a .html file stem.

        Logic:
          - Single mode (only index.html as deck, agenda.html may also exist):
              chap_idx=1 → 'index'
          - Chapter mode (numbered chapter files like 01-…, 02-…):
              chap_idx=N → N-th file in sorted order, excluding agenda.html and index.html
        Returns chapter stem (without .html) or None.
        """
        slide_dir = os.path.join(os.getcwd(), 'Projects', project, 'slide')
        if not os.path.isdir(slide_dir):
            return None
        files = sorted(
            f for f in os.listdir(slide_dir)
            if f.endswith('.html') and not f.startswith('.')
        )
        # exclude agenda.html (m2slide navigation page, not a deck)
        deck_files = [f for f in files if f != 'agenda.html']
        if not deck_files:
            return None
        # Chapter mode detection: more than one deck file → chapter mode
        chapter_files = [f for f in deck_files if f != 'index.html']
        if chapter_files:
            # chapter mode — index.html is redirect/cover, real chapters are numbered
            if 1 <= chap_idx <= len(chapter_files):
                return chapter_files[chap_idx - 1][:-len('.html')]
            return None
        # single mode — only index.html
        if chap_idx == 1 and 'index.html' in deck_files:
            return 'index'
        return None

    def _serve_short_slide_indexed(self, project: str, chap_idx: int, slide_idx: int):
        """Handle /p/<project>/s/<chap_idx>/<slide_idx> (both 1-base)."""
        stem = self._resolve_chapter_index(project, chap_idx)
        if stem is None:
            self.send_error(404, f'chapter {chap_idx} not found in {project}')
            return
        chapter = None if stem == 'index' else stem
        return self._serve_short_slide(project, chapter, slide_idx)

    def _stem_to_chapter_index(self, project: str, stem: str):
        """Inverse of _resolve_chapter_index. Returns 1-base chap index or None."""
        slide_dir = os.path.join(os.getcwd(), 'Projects', project, 'slide')
        if not os.path.isdir(slide_dir):
            return None
        files = sorted(
            f for f in os.listdir(slide_dir)
            if f.endswith('.html') and not f.startswith('.')
        )
        deck_files = [f for f in files if f != 'agenda.html']
        chapter_files = [f for f in deck_files if f != 'index.html']
        if chapter_files:
            target = f'{stem}.html'
            if target in chapter_files:
                return chapter_files.index(target) + 1
            return None
        if stem == 'index' and 'index.html' in deck_files:
            return 1
        return None

    def _file_path_to_short_indexed(self, file_path: str, slide_idx=None, mode: str = ''):
        """Convert Projects/<P>/slide/<X>.html [+ slide] to /p/<P>/s/<chap>/<slide>[?mode=text].

        Returns None if file_path not a build artifact under Projects/<P>/slide/.
        Falls back to long form for unknown paths.
        Default (bare) = browser design view. ?mode=text = curl-friendly text section.
        """
        m = _PATH_PROJECT_RE.match(file_path.lstrip('/'))
        if not m:
            return None
        project, stem = m.group(1), m.group(2)
        chap_idx = self._stem_to_chapter_index(project, stem)
        if chap_idx is None:
            return None
        suffix = '?mode=text' if mode == 'text' else ''
        if slide_idx is None:
            return f'/p/{project}'
        return f'/p/{project}/s/{chap_idx}/{slide_idx}{suffix}'

    def _serve_short_slide(self, project: str, chapter, n: int):
        """Handle /p/<project>[/<chapter>]/s/<n>.

        Issue248 — `/s/` path = solo design view (single section, no deck nav).
        Deck navigation moved to `/n/` path (see `_serve_short_nav_indexed`).

        * bare URL: solo design view (single section, full theme)
        * ?mode=text: plain text section (curl-friendly)
        * Legacy ?mode=nav / ?mode=raw → 302 to `/p/<P>/n/<chap>/<n>` (path-based)

        Issue240: chapter 모드에서 chapter=None 으로 `/p/<P>/s/<N>` 가 들어오면
        N=chap_idx 로 해석하여 chap N 의 첫 슬라이드로 위임 (index.html cover 진입 회피).
        Single 모드는 기존 동작 (slide N of index.html).
        """
        if chapter is None:
            chap1_stem = self._resolve_chapter_index(project, 1)
            if chap1_stem is not None and chap1_stem != 'index':
                # chapter mode → n is chap_idx
                return self._serve_short_slide_indexed(project, n, 1)
        file_rel = self._short_file_rel(project, chapter)
        q = parse_qs(urlparse(self.path).query)
        mode = q.get('mode', [''])[0]
        if mode == 'text':
            # text section (curl-friendly, no reveal.js)
            resolved = self._resolve_file_path(file_rel)
            if resolved is None:
                return
            full, rel = resolved
            html = self._read_file(full)
            spans = find_top_section_spans(html)
            if not spans:
                self.send_error(404, f'no <section> found in {rel}')
                return
            total = len(spans)
            if n < 1 or n > total:
                self.send_error(404, f'slide {n} out of range (1..{total})')
                return
            s, e = spans[n - 1]
            section_html = html[s:e]
            head_links = '\n'.join(re.findall(
                r'<link\s+rel="stylesheet"[^>]+>', html, flags=re.IGNORECASE))
            nav_html = self._render_indexed_nav(rel, n, total)
            self._write_html(wrap_text_html(rel, n, total, section_html, head_links, nav_html))
            return
        if mode in ('nav', 'raw'):
            # Legacy compat: redirect to new /n/ path form (Issue248 follow-up).
            # Need chap_idx for /n/<chap>/<n> form.
            chap_idx = None
            if chapter is None:
                # /p/<P>/s/<N> shorthand → N already became chap in upper if-branch.
                # If we reach here, single mode with chapter=None — chap_idx=1.
                chap_idx = 1
            else:
                chap_idx = self._stem_to_chapter_index(project, chapter)
            if chap_idx is None:
                self.send_error(404, f'chapter not found for {chapter}')
                return
            return self._redirect_302(f'/p/{project}/n/{chap_idx}/{n}')
        # Issue248 default (bare): solo design view — single section, full theme/JS preserved
        return self._serve_solo_slide(file_rel, n)

    # Issue248: solo design view — replace <div class="slides">…</div> body with
    # only the N-th top-level section. theme CSS, reveal.js, component dispatchers
    # (KaTeX · chart · model3d · p5 · d3 · react) preserved unchanged.
    _SLIDES_OPEN_RE = re.compile(
        r'<div\b[^>]*\bclass="[^"]*\bslides\b[^"]*"[^>]*>', re.IGNORECASE)

    def _serve_solo_slide(self, file_rel: str, n: int):
        """Issue248 — bare default. Single section design view.

        Reads build artifact, finds top-level <section> spans, keeps only the
        N-th section as the body of `.reveal .slides`, drops the rest.
        Theme stylesheets, reveal.js, component CDNs all preserved → full visual
        fidelity for a single slide.

        Cross-page nav rewriting + relative asset rewriting still applied so the
        single-slide response renders correctly under file:// → dev-server proxy
        boundary.
        """
        resolved = self._resolve_file_path(file_rel)
        if resolved is None:
            return
        full, rel = resolved
        try:
            with open(full, 'r', encoding='utf-8') as f:
                content = f.read()
        except (OSError, UnicodeDecodeError) as e:
            self.send_error(500, f'cannot read {rel}: {e}')
            return
        spans = find_top_section_spans(content)
        if not spans:
            self.send_error(404, f'no <section> found in {rel}')
            return
        total = len(spans)
        if n < 1 or n > total:
            self.send_error(
                404, f'slide {n} out of range (1..{total}) in {rel}')
            return
        # Locate <div class="slides"> opening tag and its matching </div>.
        slides_open = self._SLIDES_OPEN_RE.search(content)
        if not slides_open:
            self.send_error(500, f'.reveal .slides container not found in {rel}')
            return
        # Walk forward to balance <div>…</div>. Section span(start,end) lies
        # inside this container; we replace the inner body with single section.
        body_start = slides_open.end()
        slides_end = self._find_matching_div_close(content, body_start)
        if slides_end < 0:
            self.send_error(500, f'unbalanced .slides container in {rel}')
            return
        s, e = spans[n - 1]
        section_html = content[s:e]
        new_content = (
            content[:body_start] + section_html + content[slides_end:]
        )
        # Extract project name for nav/asset rewriting (same as proxy path).
        m = _PATH_PROJECT_RE.match(rel.lstrip('/'))
        project = m.group(1) if m else None
        if project:
            new_content = self._rewrite_relative_assets(new_content, project)
            new_content = self._rewrite_nav_strings(new_content, project)
        data = new_content.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    @staticmethod
    def _find_matching_div_close(html: str, pos: int) -> int:
        """Return offset of matching </div> close for the <div> opened just
        before pos. Returns -1 on imbalance.
        """
        depth = 1
        open_re = re.compile(r'<div\b', re.IGNORECASE)
        close_re = re.compile(r'</div\s*>', re.IGNORECASE)
        while pos < len(html):
            om = open_re.search(html, pos)
            cm = close_re.search(html, pos)
            if not cm:
                return -1
            if om and om.start() < cm.start():
                depth += 1
                gt = html.find('>', om.end())
                pos = (gt + 1) if gt >= 0 else om.end()
            else:
                depth -= 1
                if depth == 0:
                    return cm.start()
                pos = cm.end()
        return -1

    def _render_indexed_nav(self, file_path: str, n: int, total: int):
        """Build nav bar with chap_idx-aware URLs (/p/<P>/s/<chap>/<slide>)."""
        prev_n = max(1, n - 1)
        next_n = min(total, n + 1)
        prev = self._file_path_to_short_indexed(file_path, prev_n, 'text')
        nxt = self._file_path_to_short_indexed(file_path, next_n, 'text')
        lst = self._file_path_to_short_indexed(file_path)
        live = self._file_path_to_short_indexed(file_path, n)
        # fallback to legacy form for non-build-artifact paths
        if prev is None:
            return render_raw_nav(file_path, n, total, mode='text')
        return render_raw_nav_with_urls(file_path, n, total, prev, nxt, lst, live)

    def _serve_short_entry(self, project: str, chapter):
        """Handle /p/<project>[/<chapter>].

        * chapter present  → proxy build artifact content (Issue236.9 — was 302)
        * chapter absent   → HTML overview page (project slide list)
        Note: /p/<P>/s/ with no further path (chapter='s') falls through to _short_file_rel
        which resolves to s.html (not found → 404). Use /p/<P>/s/cover or /p/<P>/s/<n>/toc
        named routes instead. Issue239.
        """
        if chapter is not None:
            file_rel = self._short_file_rel(project, chapter)
            return self._proxy_build_artifact(file_rel)
        return self._serve_project_overview(project)

    def _serve_cover_entry(self, project: str):
        """Handle /p/<project>/s/cover → proxy index.html (cover deck). Issue239."""
        file_rel = self._short_file_rel(project, None)  # index.html
        return self._proxy_build_artifact(file_rel)

    def _serve_chapter_toc(self, project: str, chap_idx: int):
        """Handle /p/<project>/s/<chap>/toc → chapter HTML at TOC slide. Issue239."""
        stem = self._resolve_chapter_index(project, chap_idx)
        if stem is None:
            self.send_error(404, f'chapter {chap_idx} not found in {project}')
            return
        chapter = None if stem == 'index' else stem
        file_rel = self._short_file_rel(project, chapter)
        return self._proxy_build_artifact(file_rel, slide_n=1)

    def _serve_short_c(self, project: str):
        """/p/<P>/s/c — legacy deck cover entry → 302 /p/<P>/n/c (Issue248 follow-up).
        Entry routes (c/a/t) are always deck navigation by nature, so they now
        live under the /n/ path. /s/c → /n/c preserves URL convention.
        """
        return self._redirect_302(f'/p/{project}/n/c')

    def _serve_short_a(self, project: str):
        """/p/<P>/s/a — legacy deck agenda entry → 302 /p/<P>/n/a."""
        return self._redirect_302(f'/p/{project}/n/a')

    # ---- Issue248 follow-up: /n/ deck navigation handlers ----

    def _serve_short_nav_indexed(self, project: str, chap_idx: int, slide):
        """Handle /p/<project>/n/<chap_idx>/<slide_token>.

        slide may be int (1-base section index) or str (reveal.js section id).
        Always serves full deck proxy with hash inject for the requested slide.
        """
        stem = self._resolve_chapter_index(project, chap_idx)
        if stem is None:
            self.send_error(404, f'chapter {chap_idx} not found in {project}')
            return
        chapter = None if stem == 'index' else stem
        file_rel = self._short_file_rel(project, chapter)
        return self._proxy_build_artifact(file_rel, slide_n=slide)

    def _serve_nav_c(self, project: str):
        """/p/<P>/n/c — cover/deck entry.

        index.html is always the deck (single mode = full deck whose #/1 is the
        cover slide; chapter mode = markmap cover). Serve it directly so a
        carried slide fragment (#/N) is honored client-side. Previously this
        redirected to /n/a when cover_enabled was unset (_cover_active False),
        which bounced single-mode deck deep-links (index.html#/N → /n/c#/N)
        onto the standalone, non-reveal agenda.html and dropped the slide hash
        — the single-mode analog of the chapter-mode bug fixed in Issue239.
        Fall back to the agenda chain only if index.html is genuinely absent.
        """
        index_abs = os.path.join(os.getcwd(), 'Projects', project,
                                 'slide', 'index.html')
        if not os.path.isfile(index_abs):
            return self._redirect_302(self._with_query(f'/p/{project}/n/a'))
        file_rel = self._short_file_rel(project, None)  # index.html
        return self._proxy_build_artifact(file_rel)

    def _serve_nav_a(self, project: str):
        """/p/<P>/n/a — agenda (deck). Fallback: not active → 302 /n/t."""
        if not self._agenda_active(project):
            return self._redirect_302(self._with_query(f'/p/{project}/n/t'))
        file_rel = f'Projects/{project}/slide/agenda.html'
        return self._proxy_build_artifact(file_rel)

    def _serve_nav_t(self, project: str):
        """/p/<P>/n/t — toc (deck). Fallback: not active → 302 /n/1/1."""
        if not self._toc_active(project):
            return self._redirect_302(f'/p/{project}/n/1/1')
        return self._serve_short_nav_indexed(project, 1, 2)

    def _with_query(self, location: str) -> str:
        """Append current request's query string to a redirect location.
        Used by entry-route fallback chain (/s/c → /s/a → /s/t → /s/1/1) so
        ?mode=nav from the original URL propagates through all hops.
        """
        q = urlparse(self.path).query
        if not q:
            return location
        sep = '&' if '?' in location else '?'
        return f'{location}{sep}{q}'

    def _serve_short_t(self, project: str):
        """/p/<P>/s/t — legacy deck toc entry → 302 /p/<P>/n/t."""
        return self._redirect_302(f'/p/{project}/n/t')

    def _redirect_302(self, location: str):
        """Generic 302 redirect helper."""
        self.send_response(302)
        self.send_header('Location', location)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def _proxy_build_artifact(self, file_rel: str, slide_n=None):
        """Serve build artifact content as 200 response with rewritten navigation.

        Issue236.14 — strict legacy URL elimination:
          - base href still injected (so img/css/js relative paths work)
          - cross-page navigation strings (agenda.html, index.html, <chapter>.html
            inside quotes) rewritten to short /p/<P>[/<stem>] form
          - prevents legacy /Projects/<P>/slide/<X>.html URLs from appearing in
            the address bar after m2slide internal navigation

        slide_n (optional): if provided, injects a script to navigate to
        `#/<slide_n>` when the browser has not already set a hash. Accepts:
          - int  → `#/N` (1-base reveal.js hashOneBasedIndex)
          - str  → `#/<id>` for reveal.js section id (Issue248 named hash,
                   e.g. "toc-placeholder")
          - None or int=1 → skip inject (reveal.js default = first slide;
                   avoids redundant `#/1` in URL bar on first-slide entry)
        """
        resolved = self._resolve_file_path(file_rel)
        if resolved is None:
            return
        full, rel = resolved
        try:
            with open(full, 'r', encoding='utf-8') as f:
                content = f.read()
        except (OSError, UnicodeDecodeError) as e:
            self.send_error(500, f'cannot read {rel}: {e}')
            return
        # Extract project name from rel (Projects/<P>/slide/<X>.html)
        m = _PATH_PROJECT_RE.match(rel.lstrip('/'))
        project = m.group(1) if m else None
        # Issue240: <base href> 제거 — History API pushState/replaceState 가 base URL 기준으로
        # 해석되어 reveal.js 의 hash 갱신 시 `/p/<P>/s/<chap>/<slide>` path segment 가 소실되는
        # 버그(`/p/<P>/s/#/N` 로 redirect)를 일으킴. 대신 상대 asset 경로(href/src) 를 절대
        # `/p/<P>/s/<rel>` 로 직접 rewrite.
        if project:
            content = self._rewrite_relative_assets(content, project)
        # Rewrite m2slide cross-page navigation: 'X.html?...' / "X.html?..." → '/p/<P>[/<stem>]?...'
        if project:
            content = self._rewrite_nav_strings(content, project)
        # Optional: navigate to slide N when hash not preset by client.
        # Skip inject for slide_n=1 — reveal.js default entry is first slide,
        # avoids redundant `#/1` in URL bar on first-slide entry.
        # Inject into <head> BEFORE Reveal.js scripts/initialize so hash is set
        # at Reveal init time. Body-end inject was racing Reveal init and lost
        # (Reveal navigated to slide 1, id-based hash `#/toc-placeholder` won).
        # slide_n may be int (slide index) OR str (reveal.js section id).
        # Skip inject for None and int=1 (reveal.js default first slide).
        do_inject = slide_n is not None and not (
            isinstance(slide_n, int) and slide_n <= 1
        )
        if do_inject:
            # JS-safe escape of slide_n token (digits or kebab id).
            hash_token = json.dumps(str(slide_n))[1:-1]
            nav_script = (
                f'<script>(function(){{'
                f'if(!window.location.hash){{'
                f'try{{history.replaceState(null,"",location.pathname+location.search+"#/{hash_token}");}}catch(e){{'
                f'window.location.hash="#/{hash_token}";'
                f'}}'
                f'}}'
                f'}})();</script>'
            )
            # Inject right after opening <head> tag (highest priority — before any script/style)
            new_content, n_inj = re.subn(
                r'(<head\b[^>]*>)', r'\1' + nav_script, content, count=1, flags=re.IGNORECASE)
            content = new_content if n_inj else nav_script + content
        # Issue242: cross-page cue query(?fwd=1·?back=1·?last=1) URL bar 정리.
        # m2slide JS 가 Reveal.on('ready') 에서 location.search 읽어 애니메이션·점프 처리.
        # 그 후 본 inject 가 replaceState 로 query 만 제거 → URL `/s/<chap>#/N` 깔끔.
        # 등록 순서: m2slide JS 가 본 inject 보다 먼저 (build artifact 본문) → ready
        # 콜백 fire 도 동일 순서. setTimeout 50ms 안전 마진.
        clean_script = (
            '<script>(function(){'
            'function clean(){'
            'var s=location.search;'
            'if(s&&/(fwd|back|last)=1/.test(s)){'
            'try{history.replaceState(null,"",location.pathname+location.hash);}catch(e){}'
            '}'
            '}'
            'function arm(){'
            # Reveal already ready → run clean immediately (already-fired event miss)
            'if(typeof Reveal!=="undefined"&&Reveal.isReady&&Reveal.isReady()){setTimeout(clean,50);return true;}'
            # Not ready yet → register listener
            'if(typeof Reveal!=="undefined"&&Reveal.on){Reveal.on("ready",function(){setTimeout(clean,50);});return true;}'
            'return false;'
            '}'
            'if(!arm()){document.addEventListener("DOMContentLoaded",function(){'
            'var n=0;var iv=setInterval(function(){if(arm()||++n>50){clearInterval(iv);'
            'if(n>50)setTimeout(clean,2000);}},100);});}'
            # Failsafe — 1.5s 후 무조건 clean (Reveal ready 못 잡았어도)
            'setTimeout(clean,1500);'
            '})();</script>'
        )
        new_content, n_clean = re.subn(
            r'(</body\s*>)', clean_script + r'\1', content, count=1, flags=re.IGNORECASE)
        content = new_content if n_clean else content + clean_script
        data = content.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        # Disable cache so iterative dev (build → reload) always sees fresh
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    # Pattern A — X.html in quotes (JS string literal, HTML href/src attr direct).
    # stem char class allows dots — sub-chapter numbering (01.1, 05.2, ...) puts a
    # dot inside the file stem (01.1-fpm-vs-plain-claude.html). Excluding `.` made
    # the regex silently skip sub-chapter nav links (NEXT_CHAPTER JS literal etc.),
    # leaving the relative `.html` URL unrewritten → 404 under /n/ deck nav.
    _NAV_HTML_RE = re.compile(
        r"""(['"])(?!/|https?:|file:|data:)([\w][\w.-]*?)\.html(\?[^'"#]*)?(#[^'"]*)?(\1)""",
        re.IGNORECASE,
    )
    # Pattern B — meta refresh: <meta http-equiv="refresh" content="0; url=agenda.html">
    # url= sits inside a quoted attribute, not at the quote boundary.
    _META_REFRESH_RE = re.compile(
        r"""(\burl\s*=\s*)([\w][\w.-]*?)\.html(\?[^"'\s>]*)?(#[^"'\s>]*)?""",
        re.IGNORECASE,
    )
    # Pattern C — JSON-escaped quotes (Issue242). m2slide 빌드 산출물의 _tocData 등에
    # `\"01-markdown.html\"` 형태로 들어간 chapter href. Pattern A 는 escaped quote
    # 처리 안 함. \" 또는 &quot; HTML-entity 형 모두 매칭.
    _NAV_HTML_ESCAPED_RE = re.compile(
        r"""(\\"|&quot;)(?!/|https?:|file:|data:)([\w][\w.-]*?)\.html(\?[^"'#\\&]*)?(#[^"'\\&]*)?(\1)""",
        re.IGNORECASE,
    )
    # Issue242 follow-up — chapter-nav JS 변수(PREV_CHAPTER 등)는 런타임에
    #   `VAR + '?last=1&back=1'` 처럼 쿼리를 **뒤에** 붙인다. 일반 nav rewrite 가
    #   여기에 `#/1` 을 주입하면 최종 URL 이 `.../n/N/1#/1?last=1&back=1` 가 되어
    #   (1) 항상 첫 슬라이드(toc-placeholder)로 가고
    #   (2) 쿼리가 hash 뒤로 밀려 location.search 가 비어 ?last/?back/?fwd 핸들러가
    #       모두 무력화된다(이전 챕터 마지막 슬라이드 진입 실패).
    #   → 이 변수들은 hash 주입 없이 bare short-path 로만 rewrite 한다.
    #   빈 값(`var PREV_CHAPTER = ''`)은 `.html` 부재로 매칭되지 않아 그대로 보존.
    _NAV_CHAPTER_VAR_RE = re.compile(
        r"""(\bvar\s+(?:PREV_CHAPTER|NEXT_CHAPTER|PREV_SIBLING_CHAPTER|NEXT_SIBLING_CHAPTER|LAST_CHAPTER|COVER_LAST_CHAPTER|AGENDA_LAST_CHAPTER)\s*=\s*)(['"])(?!/|https?:|file:|data:)([\w][\w.-]*?)\.html(\2)""",
        re.IGNORECASE,
    )

    # Issue240 — relative href/src 를 /p/<P>/s/<rel> 절대 경로로 rewrite.
    # 매칭: href="img/x.png" / src='css/y.css' 등. 제외: 절대(/, https:, http:, file:, data:, #),
    # *.html (nav rewrite 대상), 빈 값. 매칭 후 그대로 절대 prefix 부착.
    _REL_ASSET_RE = re.compile(
        r"""(\b(?:href|src)\s*=\s*)(['"])(?!/|https?:|file:|data:|#|\s*\2)([^'"]+?)(\2)""",
        re.IGNORECASE,
    )

    def _rewrite_relative_assets(self, content: str, project: str) -> str:
        """Rewrite relative href/src attrs to absolute /p/<P>/s/<rel>.
        Skip *.html (handled by _rewrite_nav_strings) and absolute/external URLs.
        Skip <script>...</script> blocks — JS regex literals like /href="([^"]+)"/
        would otherwise be corrupted (Issue241).
        """
        prefix = f'/p/{project}/s/'

        def repl(m):
            attr, q1, val, q2 = m.group(1), m.group(2), m.group(3), m.group(4)
            # skip if val ends with .html (with optional query/fragment) — nav rewrite handles
            stripped = val.split('?', 1)[0].split('#', 1)[0]
            if stripped.lower().endswith('.html'):
                return m.group(0)
            return f'{attr}{q1}{prefix}{val}{q2}'

        # Split by <script>...</script>; rewrite only outside script blocks.
        # re.split with a capture group returns alternating non-match/match/...
        # so even indices (0, 2, 4, ...) are outside scripts.
        parts = re.split(r'(<script\b[^>]*>.*?</script\s*>)', content,
                         flags=re.IGNORECASE | re.DOTALL)
        for i in range(0, len(parts), 2):
            parts[i] = self._REL_ASSET_RE.sub(repl, parts[i])
        return ''.join(parts)

    def _stem_to_short_path(self, project: str, stem: str) -> str:
        # Issue248 follow-up: cross-page navigation rewrites target /n/ form
        # (deck navigation) so internal m2slide clicks stay in nav mode.
        # /s/ path is now solo design view only.
        s = stem.lower()
        if s == 'index':
            return f'/p/{project}/n/c'
        if s == 'agenda':
            return f'/p/{project}/n/a'
        chap_idx = self._stem_to_chapter_index(project, stem)
        if chap_idx is not None:
            return f'/p/{project}/n/{chap_idx}/1'
        return f'/p/{project}/{stem}'

    def _rewrite_nav_strings(self, content: str, project: str) -> str:
        """Rewrite agenda.html / index.html / <chapter>.html navigation to short
        /p/<P>[/<stem>] form. Covers:
          - JS string literals: 'agenda.html?back=1'
          - HTML attrs: <a href="agenda.html">, <link href="agenda.html">
          - meta refresh: <meta http-equiv="refresh" content="0; url=agenda.html">
        """
        # Issue242 follow-up: chapter-nav 변수는 hash 주입 없이 먼저 rewrite (위 regex 주석 참조).
        # 일반 패턴보다 앞서 실행해 `.html` 을 제거 → 이후 _NAV_HTML_RE 가 재매칭하지 않음
        # (rewrite 결과가 `/p/...` 로 시작 → negative lookahead 로 제외).
        def repl_chapter_var(m):
            var_kw, q1, stem, q2 = m.group(1), m.group(2), m.group(3), m.group(4)
            new = self._stem_to_short_path(project, stem)
            return f'{var_kw}{q1}{new}{q2}'
        content = self._NAV_CHAPTER_VAR_RE.sub(repl_chapter_var, content)

        def repl_quoted(m):
            q1, stem, qry, frag, q2 = (
                m.group(1), m.group(2), m.group(3) or '', m.group(4) or '', m.group(5)
            )
            new = self._stem_to_short_path(project, stem)
            # Issue242: cross-page nav URL에 hash 없으면 #/1 자동 주입.
            # reveal.js 가 default slide #/1 진입하지만 URL bar 에 명시 표기되어
            # share·reload·history 추적 일관성 확보. ?fwd=1 같은 cue 는 hash 앞에 유지.
            # agenda(/n/a)는 reveal.js 없는 메타 페이지 — hash #/N 은 "deck #/N 로
            # redirect" 신호라 default #/1 주입 시 cover↔agenda 무한 루프 발생.
            # 따라서 agenda 대상에는 hash 자동 주입 skip.
            if not frag and not new.endswith('/n/a'):
                frag = '#/1'
            return f'{q1}{new}{qry}{frag}{q2}'
        content = self._NAV_HTML_RE.sub(repl_quoted, content)

        def repl_meta(m):
            prefix, stem, qry, frag = (
                m.group(1), m.group(2), m.group(3) or '', m.group(4) or ''
            )
            new = self._stem_to_short_path(project, stem)
            # agenda(/n/a)는 reveal.js 없는 메타 페이지 — hash #/N 은 "deck #/N 로
            # redirect" 신호라 default #/1 주입 시 cover↔agenda 무한 루프 발생.
            # 따라서 agenda 대상에는 hash 자동 주입 skip.
            if not frag and not new.endswith('/n/a'):
                frag = '#/1'
            return f'{prefix}{new}{qry}{frag}'
        content = self._META_REFRESH_RE.sub(repl_meta, content)

        # Pattern C — JSON escaped quotes (Issue242)
        def repl_escaped(m):
            q1, stem, qry, frag, q2 = (
                m.group(1), m.group(2), m.group(3) or '', m.group(4) or '', m.group(5)
            )
            new = self._stem_to_short_path(project, stem)
            # agenda(/n/a)는 reveal.js 없는 메타 페이지 — hash #/N 은 "deck #/N 로
            # redirect" 신호라 default #/1 주입 시 cover↔agenda 무한 루프 발생.
            # 따라서 agenda 대상에는 hash 자동 주입 skip.
            if not frag and not new.endswith('/n/a'):
                frag = '#/1'
            return f'{q1}{new}{qry}{frag}{q2}'
        content = self._NAV_HTML_ESCAPED_RE.sub(repl_escaped, content)
        return content

    # ----- HTML landing pages -----

    def _list_projects(self):
        """Return sorted project directory names (excluding hidden/_/z_/zip/README)."""
        projects_root = os.path.join(os.getcwd(), 'Projects')
        if not os.path.isdir(projects_root):
            return []
        out = []
        for name in sorted(os.listdir(projects_root)):
            if name.startswith('.') or name.startswith('_') or name.startswith('z_'):
                continue
            full = os.path.join(projects_root, name)
            if not os.path.isdir(full):
                continue
            out.append(name)
        return out

    def _list_slide_files(self, project: str):
        """List .html files in Projects/<project>/slide/ (excluding hidden)."""
        slide_dir = os.path.join(os.getcwd(), 'Projects', project, 'slide')
        if not os.path.isdir(slide_dir):
            return []
        out = []
        for name in sorted(os.listdir(slide_dir)):
            if not name.endswith('.html') or name.startswith('.'):
                continue
            out.append(name)
        return out

    def _common_styles(self):
        return (
            '<style>'
            ':root{color-scheme:light dark}'
            'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;'
            'max-width:1100px;margin:0 auto;padding:24px;line-height:1.6;background:#fafafa;color:#1a1a1a}'
            'header{background:hsl(191,60%,45%);color:#fff;padding:16px 24px;margin:-24px -24px 24px;'
            'border-radius:0 0 6px 6px;display:flex;justify-content:space-between;align-items:center}'
            'header h1{margin:0;font-size:20px;font-weight:500}'
            'header a{color:#fff;text-decoration:none;margin-left:16px}'
            'header a:hover{text-decoration:underline}'
            'h2{border-bottom:2px solid hsl(191,60%,45%);padding-bottom:4px;margin-top:32px}'
            'h3{color:hsl(191,50%,35%);margin-top:24px}'
            'a{color:hsl(191,60%,40%);text-decoration:none}'
            'a:hover{text-decoration:underline}'
            '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin:16px 0}'
            '.card{background:#fff;border:1px solid #ddd;border-radius:6px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,0.06)}'
            '.card h3{margin:0 0 8px;font-size:16px}.card h3 a{color:inherit;text-decoration:none;font-weight:bold}.card h3 a:hover{text-decoration:underline}'
            '.card .meta{color:#666;font-size:13px;margin:4px 0}'
            '.card .links{margin-top:10px;display:flex;flex-wrap:wrap;gap:8px}'
            '.card .links a{font-size:12px;background:#f0f8fa;padding:4px 8px;border-radius:3px}'
            'table{border-collapse:collapse;width:100%}'
            'td,th{border:1px solid #ddd;padding:6px 12px;text-align:left;vertical-align:top}'
            'th{background:#f0f8fa}'
            # Issue248 — solo preview iframe (per-slide thumbnail in overview).
            # iframe renders at native 1920x1080, scaled down 0.25 → 480x270 visible.
            # Negative margins absorb the post-scale layout box so siblings flow tightly.
            '.slide-preview{display:block;width:1920px;height:1080px;border:0;'
            'background:#fff;transform-origin:top left;transform:scale(0.25);'
            'margin:0 -1440px -810px 0;pointer-events:none}'
            '.preview-cell{width:480px;height:270px;overflow:hidden;border:1px solid #ccc;'
            'border-radius:4px;background:#fff}'
            'code{background:#f3f3f3;padding:2px 6px;border-radius:3px;font-size:0.9em}'
            'pre{background:#2d2d2d;color:#f8f8f2;padding:12px;border-radius:4px;overflow-x:auto}'
            # Issue261 — overview feedback UI (bytes badge + opinion cell + bulk bar)
            '.title-cell{min-width:200px}'
            '.bytes-badge{display:block;text-align:right;color:#999;font-size:11px;margin-top:4px}'
            '.feedback-cell{min-width:220px}'
            '.fb-text{width:100%;box-sizing:border-box;font:inherit;font-size:13px;'
            'padding:4px 6px;border:1px solid #ccc;border-radius:4px;'
            'background:#fff;color:inherit;resize:vertical}'
            '.fb-actions{display:flex;align-items:center;gap:8px;margin-top:4px;font-size:12px}'
            '.fb-actions .fb-send{cursor:pointer;padding:2px 10px;border:1px solid #aaa;'
            'border-radius:4px;background:#f0f8fa}'
            '.fb-actions .fb-send:hover{background:#dceef2}'
            '.fb-status{color:#0a6;font-size:12px}'
            '.fb-bulk-bar{position:sticky;bottom:0;margin-top:24px;padding:10px 16px;'
            'background:#f0f8fa;border:1px solid #cde;border-radius:6px;'
            'display:flex;align-items:center;gap:12px;font-size:14px}'
            '.fb-bulk-bar button{cursor:pointer;padding:4px 14px;border:1px solid #aaa;'
            'border-radius:4px;background:#fff}'
            '.fb-bulk-bar button:hover{background:#dceef2}'
            # Issue264 — copy-paste command box (top summary + bulk bar)
            '.fb-cmd-box{display:inline-flex;align-items:center;gap:8px;'
            'margin-left:16px;padding:4px 10px;border:1px solid #cde;'
            'border-radius:6px;background:#f0f8fa;font-size:13px}'
            '.fb-cmd-box code{background:#fff;border:1px solid #ddd;'
            'padding:2px 8px;border-radius:4px;font-size:12px;white-space:nowrap}'
            '.fb-cmd-copy{cursor:pointer;padding:2px 8px;border:1px solid #aaa;'
            'border-radius:4px;background:#fff;font-size:12px}'
            '.fb-cmd-copy:hover{background:#dceef2}'
            '.fb-pending{color:#c60;font-size:12px;white-space:nowrap}'
            '.fb-pending b{font-size:13px}'
            '@media (prefers-color-scheme:dark){body{background:#1a1a1a;color:#e0e0e0}'
            '.card{background:#222;border-color:#444}.card .links a{background:#2a3a3e}'
            'th{background:#2a3a3e}td,th{border-color:#444}code{background:#2d2d2d;color:#e0e0e0}'
            '.fb-text{background:#222;border-color:#555}'
            '.fb-actions .fb-send{background:#2a3a3e;border-color:#555}'
            '.fb-bulk-bar{background:#2a3a3e;border-color:#444}'
            '.fb-bulk-bar button{background:#222;border-color:#555}'
            '.fb-cmd-box{background:#2a3a3e;border-color:#444}'
            '.fb-cmd-box code{background:#222;border-color:#555}'
            '.fb-cmd-copy{background:#222;border-color:#555}}'
            '</style>'
        )

    def _common_header(self, title: str, show_projects_link: bool = True):
        links = ['<a href="/">🏠 home</a>']
        if show_projects_link:
            links.append('<a href="/p/">📂 projects</a>')
        else:
            links.append('<a href="https://finfra.github.io/m2slide/" target="_blank">🌐 finfra.github.io/m2slide</a>')
        return f'<header><h1>{title}</h1><div>' + ' · '.join(links) + '</div></header>'

    def _serve_root(self):
        """GET / — landing page with server info + main navigation."""
        projects = self._list_projects()
        if 'm2Slide' in projects:
            sample = 'm2Slide'
        else:
            sample = projects[0] if projects else 'm2Slide_single_mode'
        body = (
            '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
            '<title>m2slide dev-server</title>'
            + self._common_styles() +
            '</head><body>'
            + self._common_header('m2slide dev-server') +
            '<p>로컬 개발용 HTTP 서버 (port 9877). 슬라이드 컨텐츠 빠른 확인 + '
            'curl·Playwright 헤드리스 검증용 endpoint 제공.</p>'
            '<h2>주요 진입</h2>'
            '<div class="grid">'
            '<div class="card"><h3><a href="/p/">📂 프로젝트 목록</a></h3>'
            '<div class="meta">슬라이드 프로젝트 진입</div>'
            '<div class="links"><a href="/p/">/p/</a></div></div>'
            f'<div class="card"><h3><a href="/p/{sample}">🔍 sample 슬라이드 목록</a></h3>'
            f'<div class="meta">{sample} 슬라이드 인덱스</div>'
            f'<div class="links"><a href="/p/{sample}">/p/{sample}</a></div></div>'
            f'<div class="card"><h3><a href="/p/{sample}/s/c" target="_blank" rel="noopener">🎬 sample 진입</a></h3>'
            f'<div class="meta">{sample} cover (없으면 agenda·toc·첫슬라이드 fallback)</div>'
            f'<div class="links"><a href="/p/{sample}/s/c" target="_blank" rel="noopener">/p/{sample}/s/c</a></div></div>'
            '</div>'
            '<h2>주소 체계 (legacy /Projects/... 차단됨 → 404)</h2>'
            '<table><thead><tr><th>URL</th><th>응답</th></tr></thead><tbody>'
            '<tr><td><code>/p/</code></td><td>프로젝트 목록 페이지</td></tr>'
            '<tr><td><code>/p/&lt;P&gt;</code></td><td>프로젝트 슬라이드 목록 (overview)</td></tr>'
            '<tr><td><code>/p/&lt;P&gt;/s/c</code></td><td>cover (없으면 /s/a → /s/t → /s/1/1 fallback)</td></tr>'
            '<tr><td><code>/p/&lt;P&gt;/s/a</code></td><td>agenda (없으면 /s/t → /s/1/1 fallback)</td></tr>'
            '<tr><td><code>/p/&lt;P&gt;/s/t</code></td><td>toc (없으면 /s/1/1 fallback)</td></tr>'
            '<tr><td><code>/p/&lt;P&gt;/s/&lt;chap&gt;/&lt;n&gt;</code></td><td>디자인 view (브라우저, 기본)</td></tr>'
            '<tr><td><code>/p/&lt;P&gt;/s/&lt;chap&gt;/&lt;n&gt;?mode=text</code></td><td>N번째 슬라이드 text (curl 친화)</td></tr>'
            '<tr><td><code>/p/&lt;P&gt;/s/&lt;n&gt;</code></td><td>chap=1 자동 (single mode shorthand)</td></tr>'
            '</tbody></table>'
            '</body></html>'
        )
        self._write_html(body)

    @staticmethod
    def _esc_html(s: str) -> str:
        return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

    def _read_projects_md_active_rows(self):
        """Parse the '# 활성 프로젝트' markdown table from Projects.md (read-only reflection).

        Projects.md is the personal/local index (gitignored); this just mirrors its
        active-project table onto the dev-server /p/ page. No edit capability — SSOT
        for editing remains Projects.md + `./m2slide.sh --sync-projects`.
        """
        md_path = os.path.join(os.getcwd(), 'Projects.md')
        if not os.path.isfile(md_path):
            return []
        with open(md_path, 'r', encoding='utf-8') as f:
            lines = f.read().split('\n')
        header = '# 활성 프로젝트'
        hidx = next((i for i, l in enumerate(lines) if l.strip() == header), None)
        if hidx is None:
            return []
        i = hidx + 1
        while i < len(lines) and lines[i].strip() == '':
            i += 1
        if i >= len(lines) or not lines[i].strip().startswith('|'):
            return []
        i += 1  # header row
        if i < len(lines) and '-' in lines[i] and re.match(r'^\s*\|?[\s:|-]+\|?\s*$', lines[i]):
            i += 1  # separator row
        rows = []
        while i < len(lines) and lines[i].strip().startswith('|'):
            cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
            if len(cells) >= 7:
                rows.append({
                    'category': cells[0], 'name': cells[1], 'version': cells[2],
                    'desc': cells[3], 'manual': cells[4], 'publishing': cells[5], 'work': cells[6],
                })
            i += 1
        return rows

    _CATEGORY_EMOJI = {
        'pr': '📢', 'info': 'ℹ️', 'lec': '🎓', 'm2': '🧩', 'test': '🧪',
    }
    _PUBLISH_AFFIRM_RE = re.compile(r'^(o|y|yes|true|1|✓|v|ok)$', re.IGNORECASE)

    @classmethod
    def _manual_check_badge(cls, v: str) -> str:
        v = (v or '').strip()
        if not v:
            return '⬜ 미검증'
        if v in ('n/a', 'N/A'):
            return '➖ 해당없음'
        if cls._PUBLISH_AFFIRM_RE.match(v):
            return '✅ 검증됨'
        return f'🚧 {v}'  # ex) "개발필요"

    @classmethod
    def _publishing_badge(cls, v: str) -> str:
        return '🌐 공개' if cls._PUBLISH_AFFIRM_RE.match((v or '').strip()) else '🔒 비공개'

    def _serve_project_list(self):
        """GET /p/ — project directory listing."""
        projects = self._list_projects()
        meta_by_name = {r['name']: r for r in self._read_projects_md_active_rows()}
        cards = []
        for p in projects:
            files = self._list_slide_files(p)
            entry = 'index.html' if 'index.html' in files else (files[0] if files else None)
            meta = meta_by_name.get(p)
            cat_emoji = self._CATEGORY_EMOJI.get((meta['category'] if meta else '').strip().lower(), '📁')
            title_html = f'{cat_emoji} {self._esc_html(p)}'
            meta_line = ''
            if meta:
                manual_badge = self._manual_check_badge(meta['manual'])
                pub_badge = self._publishing_badge(meta['publishing'])
                bits = []
                if meta['version']:
                    bits.append(f'🏷️ v{self._esc_html(meta["version"])}')
                if meta['desc']:
                    bits.append(f'📝 {self._esc_html(meta["desc"])}')
                bits.append(manual_badge)
                bits.append(pub_badge)
                meta_line = f'<div class="meta">{" · ".join(bits)}</div>'
                if meta['work']:
                    meta_line += f'<div class="meta">📌 {self._esc_html(meta["work"])}</div>'
            if not entry:
                cards.append(
                    f'<div class="card"><h3>{title_html}</h3>'
                    + meta_line +
                    '<div class="meta">⚠️ 빌드 산출물 없음 (slide/ 비어있음)</div>'
                    f'<div class="links"><a href="/p/{p}">목록 보기</a></div></div>'
                )
                continue
            # Use chap_idx-aware short URL form (/p/<P>/s/<chap>/<slide>?mode=raw)
            deck_files = [f for f in files if f != 'agenda.html']
            chapter_files = [f for f in deck_files if f != 'index.html']
            if chapter_files:
                build_label = f'{len(chapter_files)} chapter (chapter mode)'
            else:
                build_label = '1 deck (single mode)'
            # Issue248 follow-up: /n/ path = deck navigation entry
            # (fallback chain /n/c → /n/a → /n/t → /n/1/1 propagates _with_query).
            first_link = f'/p/{p}/n/c'
            cards.append(
                f'<div class="card"><h3><a href="{first_link}" target="_blank" rel="noopener">{title_html}</a></h3>'
                + meta_line +
                f'<div class="meta">{build_label} · 진입: <code>{entry}</code></div>'
                '<div class="links">'
                f'<a href="/p/{p}" target="_blank" rel="noopener">📋 슬라이드 목록</a>'
                f'<a href="{first_link}" target="_blank" rel="noopener">🎬 진입 (cover/agenda/toc/첫슬라이드 fallback)</a>'
                '</div></div>'
            )
        body = (
            '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
            '<title>m2slide — projects</title>'
            + self._common_styles() +
            '</head><body>'
            + self._common_header('📂 프로젝트 목록', show_projects_link=False) +
            f'<p>총 <b>{len(projects)}</b>개 프로젝트. '
            '(🏷️버전 · 📝설명 · ✅/🚧/⬜/➖ Manual Check · 🌐공개/🔒비공개 — '
            f'<code>Projects.md</code> 반영, 읽기 전용)</p>'
            '<div class="grid">' + '\n'.join(cards) + '</div>'
            '</body></html>'
        )
        self._write_html(body)

    def _build_chapter_index_map(self, project: str, files: list) -> dict:
        """Build stem→1-base-chap-index map in one directory scan (O(n) vs O(n²))."""
        deck_files = [f for f in files if f != 'agenda.html']
        chapter_files = [f for f in deck_files if f != 'index.html']
        if chapter_files:
            return {f[:-len('.html')]: i + 1 for i, f in enumerate(chapter_files)}
        if 'index.html' in deck_files:
            return {'index': 1}
        return {}

    def _serve_slide_static(self, project: str, asset_path: str):
        """Serve static build assets (CSS/JS/img/fonts) from Projects/<P>/slide/<path>.

        Mapped from /p/<P>/slide/<path> so the base href can be /p/<P>/slide/
        instead of /Projects/<P>/slide/ — eliminates legacy paths from HTML output.
        HTML files are blocked here; they must go through _proxy_build_artifact.
        """
        if asset_path.lower().endswith('.html'):
            self.send_error(403, 'HTML files not served from /p/<P>/slide/; use /p/<P>/<chap>')
            return
        safe = os.path.normpath(asset_path)
        if safe.startswith('..'):
            self.send_error(403, 'forbidden: path traversal')
            return
        slide_root = os.path.join(os.getcwd(), 'Projects', project, 'slide')
        full = os.path.join(slide_root, safe)
        if not full.startswith(slide_root + os.sep):
            self.send_error(403, 'forbidden: path escapes slide dir')
            return
        if not os.path.isfile(full):
            self.send_error(404, f'static asset not found: {asset_path}')
            return
        import mimetypes
        mime, _ = mimetypes.guess_type(full)
        if mime is None:
            mime = 'application/octet-stream'
        with open(full, 'rb') as fh:
            data = fh.read()
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    def _serve_project_overview(self, project: str):
        """GET /p/<project> — slide list (all .html files + sections)."""
        files = self._list_slide_files(project)
        if not files:
            project_dir = os.path.join(os.getcwd(), 'Projects', project)
            if not os.path.isdir(project_dir):
                self.send_error(404, f'project not found: {project}')
                return
            self.send_error(404, f'no slides built — run ./m2slide.sh {project} first')
            return
        # Precompute chapter index map once (avoids O(n²) directory scans)
        chap_map = self._build_chapter_index_map(project, files)
        deck_files = [f for f in files if f != 'agenda.html']
        chapter_files = [f for f in deck_files if f != 'index.html']
        is_chapter_mode = bool(chapter_files)
        mode_label = f'{len(chapter_files)} chapters' if is_chapter_mode else 'single mode'
        total_slides = 0
        sections_html_blocks = []
        for f in files:
            stem = f[:-len('.html')]
            full = os.path.join(os.getcwd(), 'Projects', project, 'slide', f)
            try:
                with open(full, 'r', encoding='utf-8') as fh:
                    html = fh.read()
                spans = find_top_section_spans(html)
            except (OSError, UnicodeDecodeError):
                spans = []
            count = len(spans)
            chap_idx = chap_map.get(stem)
            if chap_idx is None:
                section = (
                    f'<h3>{stem} '
                    f'<small style="color:#888">(non-deck · {count} sections)</small></h3>'
                )
                sections_html_blocks.append(section)
                continue
            total_slides += count
            rows = []
            for i, (s, e) in enumerate(spans):
                sec_html = html[s:e]
                title = extract_section_title(sec_html) or '(no title)'
                one = i + 1
                solo_url = f'/p/{project}/s/{chap_idx}/{one}'
                nav_url = f'/p/{project}/n/{chap_idx}/{one}'
                text_url = f'{solo_url}?mode=text'
                # Issue248 follow-up: title link → /n/ path (deck navigation).
                # Preview cell iframe → /s/ path (solo design view per slide).
                # Issue261: bytes → title-cell badge; 4th column = feedback input.
                rows.append(
                    f'<tr><td>{one}</td>'
                    f'<td class="title-cell">'
                    f'<a href="{nav_url}" target="_blank" rel="noopener">{title}</a><br>'
                    f'<small><a href="{solo_url}" target="_blank" rel="noopener">solo</a> · '
                    f'<a href="{text_url}" target="_blank" rel="noopener">text</a></small>'
                    f'<small class="bytes-badge">{e - s} bytes</small></td>'
                    f'<td class="preview-cell">'
                    f'<iframe class="slide-preview" loading="lazy" src="{solo_url}" '
                    f'title="slide {one} preview"></iframe>'
                    f'</td>'
                    f'<td class="feedback-cell" data-chap="{chap_idx}" data-slide="{one}">'
                    f'<textarea class="fb-text" rows="2" placeholder="의견..."></textarea>'
                    f'<div class="fb-actions">'
                    f'<label class="fb-policy-label">'
                    f'<input type="checkbox" class="fb-policy"> policy</label>'
                    f'<button type="button" class="fb-send">전송</button>'
                    f'<span class="fb-status"></span>'
                    f'</div></td></tr>'
                )
            chapter_entry = f'/p/{project}/n/{chap_idx}/1'
            section = (
                f'<h3>chap {chap_idx} — {stem} '
                f'<small style="color:#888">({count} slides · '
                f'<a href="{chapter_entry}" target="_blank" rel="noopener">open deck</a>)</small></h3>'
                '<table><thead><tr><th>n</th>'
                '<th>title (→ deck nav)</th>'
                '<th>preview (solo)</th>'
                '<th>의견</th></tr></thead>'
                f'<tbody>{"".join(rows) or "<tr><td colspan=4>no sections</td></tr>"}</tbody></table>'
            )
            sections_html_blocks.append(section)
        summary = f'<b>{total_slides}</b> slides · {mode_label}'
        # Issue264 — copy-paste command box (manual feedback processor entry).
        # Shown twice: next to top summary + inside bottom bulk bar.
        pending = self._pending_feedback_count(project)
        cmd_box = (
            '<span class="fb-cmd-box">'
            f'<code class="fb-cmd">/feedback-process {project}</code>'
            '<button type="button" class="fb-cmd-copy" '
            'title="커맨드 복사 — m2slide 폴더의 Claude Code 세션에 붙여넣기">'
            '📋 복사</button>'
            '<span class="fb-pending">미처리 <b class="fb-pending-n">'
            f'{pending}</b>건</span>'
            '</span>'
        )
        body = (
            '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
            f'<title>m2slide — {project}</title>'
            + self._common_styles() +
            '</head><body>'
            + self._common_header(f'📋 {project}') +
            f'<p>{summary}{cmd_box}</p>'
            + '\n'.join(sections_html_blocks) +
            '<div class="fb-bulk-bar">'
            '<label><input type="checkbox" id="fb-policy-all"> policy 일괄 적용</label>'
            '<button type="button" id="fb-send-all">전체 전송</button>'
            '<span id="fb-bulk-status"></span>'
            + cmd_box + '</div>'
            + self._feedback_script(project) +
            '</body></html>'
        )
        self._write_html(body)

    _BUILD_ARTIFACT_RE = re.compile(
        r'^Projects/[^/]+/slide/.+\.html$', re.IGNORECASE)

    def _serve_direct_slide(self, file_path: str, n: int):
        """Handle /<build path>/X.html/<n> — plain text section (curl-friendly).

        ?mode=raw → 302 redirect to short live URL (design view).
        """
        if not self._BUILD_ARTIFACT_RE.match(file_path.lstrip('/')):
            self.send_error(404, f'not a build artifact path: {file_path}')
            return
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
        # mode=raw query → redirect to short live URL (no legacy /Projects/ form)
        q = parse_qs(urlparse(self.path).query)
        if q.get('mode', [''])[0] == 'raw':
            target = to_short_url(rel, n, 'raw')
            self.send_response(302)
            self.send_header('Location', target)
            self.send_header('Content-Length', '0')
            self.end_headers()
            return
        s, e = spans[n - 1]
        section_html = html[s:e]
        head_links = '\n'.join(re.findall(
            r'<link\s+rel="stylesheet"[^>]+>', html, flags=re.IGNORECASE))
        nav_html = self._render_indexed_nav(rel, n, total)
        self._write_html(wrap_text_html(rel, n, total, section_html, head_links, nav_html))

    # --- helpers ---

    # ---- activation predicates (Issue240+) ----

    def _project_config(self, project: str) -> dict:
        """Read Projects/<P>/_config.yml as flat dict (top-level scalars only).
        Sufficient for cover_enabled / toc_placeholder lookups. Returns {}
        if missing or unparseable.
        """
        cfg_path = os.path.join(os.getcwd(), 'Projects', project, '_config.yml')
        if not os.path.isfile(cfg_path):
            return {}
        out = {}
        try:
            with open(cfg_path, 'r', encoding='utf-8') as fh:
                for line in fh:
                    line = line.split('#', 1)[0].rstrip()
                    if not line or line.startswith(' ') or line.startswith('\t'):
                        continue
                    if ':' not in line:
                        continue
                    k, _, v = line.partition(':')
                    out[k.strip()] = v.strip()
        except OSError:
            pass
        return out

    def _is_chapter_mode(self, project: str) -> bool:
        files = self._list_slide_files(project)
        deck_files = [f for f in files if f != 'agenda.html']
        chapter_files = [f for f in deck_files if f != 'index.html']
        return bool(chapter_files)

    def _cover_active(self, project: str) -> bool:
        """Chapter mode → always true (index.html = markmap entry).
        Single mode → _config.yml cover_enabled: true 일 때만 true.
        """
        if self._is_chapter_mode(project):
            return True
        cfg = self._project_config(project)
        return cfg.get('cover_enabled', '').lower() == 'true'

    def _agenda_active(self, project: str) -> bool:
        agenda = os.path.join(os.getcwd(), 'Projects', project, 'slide', 'agenda.html')
        return os.path.isfile(agenda)

    def _toc_active(self, project: str) -> bool:
        """toc_placeholder default true; 명시적 false 만 비활성."""
        cfg = self._project_config(project)
        return cfg.get('toc_placeholder', 'true').lower() != 'false'

    def _resolve_file_path(self, f):
        """Validate file path (relative to document root). Returns (full, rel) or None."""
        if not f:
            self.send_error(400, 'file path required')
            return None
        f = unquote(f)
        # security: prevent directory traversal
        root = os.getcwd()
        full = os.path.normpath(os.path.join(root, f.lstrip('/')))
        if not full.startswith(root + os.sep):
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

    # ---- feedback POST (Issue261 — _doc_arch/dev-server-feedback.md) ----

    _FEEDBACK_POST_RE = re.compile(r'^/p/([^/]+)/feedback/?$')
    _FEEDBACK_MAX_BODY = 256 * 1024  # 256KB

    def do_POST(self):
        path_only = self.path.split('?', 1)[0].split('#', 1)[0]
        m = self._FEEDBACK_POST_RE.match(path_only)
        if m:
            return self._handle_feedback_post(m.group(1))
        self.send_error(404, f'no POST route: {path_only}')

    def _pending_feedback_count(self, project: str) -> int:
        """Issue264 — count unprocessed feedback lines in dev-feedback.jsonl.
        /feedback-process moves handled lines to dev-feedback.done.jsonl, so
        the inbox line count == pending count. 0 if file missing/unreadable.
        """
        path = os.path.join(
            os.getcwd(), 'Projects', project,
            '_pipeline', 'feedback', 'dev-feedback.jsonl')
        try:
            with open(path, 'r', encoding='utf-8') as fh:
                return sum(1 for line in fh if line.strip())
        except OSError:
            return 0

    def _handle_feedback_post(self, project: str):
        """POST /p/<P>/feedback — append opinions to _pipeline/feedback jsonl;
        policy=true items additionally go to _pipeline/policy/_dev-feedback.yml
        pending inbox (classification into stage ymls is a later processor's job).
        """
        if '/' in project or os.sep in project or project.startswith('.'):
            self.send_error(404, f'project not found: {project}')
            return
        project_dir = os.path.join(os.getcwd(), 'Projects', project)
        if not os.path.isdir(project_dir):
            self.send_error(404, f'project not found: {project}')
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            self.send_error(400, 'invalid Content-Length')
            return
        if length <= 0:
            self.send_error(400, 'empty body')
            return
        if length > self._FEEDBACK_MAX_BODY:
            self.send_error(413, 'body too large (max 256KB)')
            return
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            self.send_error(400, 'invalid JSON body')
            return
        items = payload.get('items') if isinstance(payload, dict) else None
        if not isinstance(items, list) or not items:
            self.send_error(400, 'items[] required')
            return
        ts = datetime.datetime.now().astimezone().isoformat(timespec='seconds')
        records = []
        for it in items:
            if not isinstance(it, dict):
                continue
            opinion = str(it.get('opinion') or '').strip()
            if not opinion:
                continue  # empty opinion → skip (row not filled)
            try:
                chap = int(it.get('chap'))
                slide = int(it.get('slide'))
            except (TypeError, ValueError):
                self.send_error(400, 'chap/slide must be integers')
                return
            records.append({
                'ts': ts, 'chap': chap, 'slide': slide,
                'title': str(it.get('title') or '').strip(),
                'opinion': opinion,
                'policy': bool(it.get('policy', False)),
            })
        if not records:
            self._write_json({'status': 'ok', 'saved': 0, 'policy_saved': 0})
            return
        fb_dir = os.path.join(project_dir, '_pipeline', 'feedback')
        os.makedirs(fb_dir, exist_ok=True)
        with open(os.path.join(fb_dir, 'dev-feedback.jsonl'), 'a', encoding='utf-8') as fh:
            for rec in records:
                fh.write(json.dumps(rec, ensure_ascii=False) + '\n')
        policy_recs = [r for r in records if r['policy']]
        if policy_recs:
            pol_dir = os.path.join(project_dir, '_pipeline', 'policy')
            os.makedirs(pol_dir, exist_ok=True)
            pol_path = os.path.join(pol_dir, '_dev-feedback.yml')
            new_file = not os.path.isfile(pol_path)
            with open(pol_path, 'a', encoding='utf-8') as fh:
                if new_file:
                    fh.write('# dev-server feedback policy inbox — pending 분류 전\n')
                    fh.write('# SSOT: _doc_arch/dev-server-feedback.md\n')
                    fh.write('pending:\n')
                for r in policy_recs:
                    # JSON string literals are valid YAML scalars (safe quoting)
                    fh.write(f"  - ts: {r['ts']}\n")
                    fh.write(f"    chap: {r['chap']}\n")
                    fh.write(f"    slide: {r['slide']}\n")
                    fh.write(f"    title: {json.dumps(r['title'], ensure_ascii=False)}\n")
                    fh.write(f"    opinion: {json.dumps(r['opinion'], ensure_ascii=False)}\n")
                    fh.write('    stage: null\n')
        self._write_json({
            'status': 'ok', 'saved': len(records), 'policy_saved': len(policy_recs)})

    def _feedback_script(self, project: str) -> str:
        """Inline JS for overview feedback cells + bulk bar (Issue261)."""
        return (
            '<script>(function(){'
            f'var EP="/p/{project}/feedback";'
            'function itemOf(cell){'
            'var ta=cell.querySelector(".fb-text");'
            'var op=(ta.value||"").trim();'
            'if(!op)return null;'
            'var row=cell.closest("tr");'
            'var a=row?row.querySelector("td:nth-child(2) a"):null;'
            'return{chap:parseInt(cell.dataset.chap,10),'
            'slide:parseInt(cell.dataset.slide,10),'
            'title:a?a.textContent.trim():"",opinion:op,'
            'policy:cell.querySelector(".fb-policy").checked};}'
            'function post(items,onDone){'
            'fetch(EP,{method:"POST",'
            'headers:{"Content-Type":"application/json"},'
            'body:JSON.stringify({items:items})})'
            '.then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);'
            'return r.json();})'
            '.then(function(j){onDone(null,j);})'
            '.catch(function(e){onDone(e);});}'
            'document.querySelectorAll(".feedback-cell .fb-send")'
            '.forEach(function(btn){'
            'btn.addEventListener("click",function(){'
            'var cell=btn.closest(".feedback-cell");'
            'var ta=cell.querySelector(".fb-text");'
            'var st=cell.querySelector(".fb-status");'
            'var it=itemOf(cell);'
            'if(!it){ta.style.borderColor="#c33";ta.focus();return;}'
            'ta.style.borderColor="";st.textContent="...";'
            'post([it],function(err,j){'
            'if(!err)bump(j.saved);'
            'st.textContent=err?("\\u2717 "+err.message):'
            '("\\u2713 \\uc804\\uc1a1\\ub428"+(j.policy_saved?" (policy)":""));});});});'
            'var allBtn=document.getElementById("fb-send-all");'
            'if(allBtn)allBtn.addEventListener("click",function(){'
            'var forceAll=document.getElementById("fb-policy-all").checked;'
            'var items=[];'
            'document.querySelectorAll(".feedback-cell").forEach(function(cell){'
            'var it=itemOf(cell);'
            'if(it){if(forceAll)it.policy=true;items.push(it);}});'
            'var st=document.getElementById("fb-bulk-status");'
            'if(!items.length){st.textContent="\\uc804\\uc1a1\\ud560 \\uc758\\uacac \\uc5c6\\uc74c";return;}'
            'st.textContent="...";'
            'post(items,function(err,j){'
            'if(!err)bump(j.saved);'
            'st.textContent=err?("\\u2717 "+err.message):'
            '("\\u2713 "+j.saved+"\\uac74 \\uc800\\uc7a5, policy "+j.policy_saved+"\\uac74");});});'
            # Issue264 — command copy buttons + pending counter live bump
            'function bump(n){document.querySelectorAll(".fb-pending-n")'
            '.forEach(function(el){el.textContent='
            'String(parseInt(el.textContent,10)+n);});}'
            'window.__fbBump=bump;'
            'document.querySelectorAll(".fb-cmd-copy").forEach(function(btn){'
            'btn.addEventListener("click",function(){'
            'var code=btn.parentNode.querySelector(".fb-cmd");'
            'var txt=code?code.textContent:"";'
            'function done(){var o=btn.textContent;btn.textContent="\\u2713 \\ubcf5\\uc0ac\\ub428";'
            'setTimeout(function(){btn.textContent=o;},1200);}'
            'function fb(){var ta=document.createElement("textarea");'
            'ta.value=txt;ta.style.position="fixed";ta.style.opacity="0";'
            'document.body.appendChild(ta);ta.focus();ta.select();'
            'try{document.execCommand("copy");done();}catch(e){window.prompt("\\ubcf5\\uc0ac",txt);}'
            'document.body.removeChild(ta);}'
            'if(navigator.clipboard&&window.isSecureContext){'
            'navigator.clipboard.writeText(txt).then(done).catch(fb);}else{fb();}});});'
            '})();</script>'
        )

    def _write_json(self, obj, status: int = 200):
        data = json.dumps(obj, ensure_ascii=False, indent=2).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

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
    sys.stderr.write("  /p/<P>                        — slide list overview\n")
    sys.stderr.write("  /p/<P>/s/<chap>/<n>           — design view (proxy)\n")
    sys.stderr.write("  /p/<P>/s/<chap>/<n>?mode=text — plain text section\n")
    sys.stderr.flush()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        sys.stderr.write("\nshutting down\n")
        server.shutdown()


if __name__ == "__main__":
    main()
