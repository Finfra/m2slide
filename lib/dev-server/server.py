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
import subprocess
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
    # Config editor (config GUI, Issue275): GET returns current values, POST writes _config.yml
    _CONFIG_RE = re.compile(r'^/p/([^/]+)/config/?$')
    # Open settings file (Issue275): POST opens Projects/<P>/_config.yml in VSCode
    _OPEN_CONFIG_RE = re.compile(r'^/p/([^/]+)/open-config/?$')

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
        # Deck list (Projects_deck/decks, Issue281): /pd/
        if path_only in ('/pd', '/pd/'):
            return self._serve_deck_list()
        # Config editor JSON (config GUI, Issue275): GET /p/<P>/config
        m = self._CONFIG_RE.match(path_only)
        if m:
            return self._serve_config_get(m.group(1))
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

    # Issue270 — <script src="rel"> 외부 스크립트 태그의 src 를 rewrite.
    # _rewrite_relative_assets 의 script-block skip 이 <script src="./vendor/x">
    # opening 태그까지 통째로 건너뛰어 vendor 자산이 404 나던 문제 해결.
    # [^>]*? 로 opening 태그 내부(첫 '>' 이전)의 src 만 매칭 → JS body 미접촉.
    _SCRIPT_SRC_RE = re.compile(
        r"""(<script\b[^>]*?\bsrc\s*=\s*)(['"])(?!/|https?:|file:|data:|#|\s*\2)([^'"]+?)(\2)""",
        re.IGNORECASE,
    )

    # Issue270 — inline <style> 내 CSS url() / @import url() 상대 참조 rewrite.
    # @font-face src url('./vendor/...'), @import url('./vendor/fonts/x.css') 등이
    # proxy base(/p/<P>/n|s/...) 기준으로 404 나던 문제 해결. 절대/외부/data: 제외.
    _CSS_URL_RE = re.compile(
        r"""(url\(\s*)(['"]?)(?!/|https?:|file:|data:|#)([^)'"]+?)(\2\s*\))""",
        re.IGNORECASE,
    )

    def _rewrite_relative_assets(self, content: str, project: str) -> str:
        """Rewrite relative href/src attrs to absolute /p/<P>/s/<rel>.
        Skip *.html (handled by _rewrite_nav_strings) and absolute/external URLs.
        Skip <script>...</script> blocks — JS regex literals like /href="([^"]+)"/
        would otherwise be corrupted (Issue241). 단, <script src="rel"> opening 태그의
        src 는 별도 pass 로 rewrite (Issue270 — vendor 자산 상대참조 지원).
        """
        prefix = f'/p/{project}/s/'

        def repl(m):
            attr, q1, val, q2 = m.group(1), m.group(2), m.group(3), m.group(4)
            # skip if val ends with .html (with optional query/fragment) — nav rewrite handles
            stripped = val.split('?', 1)[0].split('#', 1)[0]
            if stripped.lower().endswith('.html'):
                return m.group(0)
            # Issue270 — leading './' 제거 (없으면 /p/<P>/s/./vendor/... 로 깨짐)
            if val.startswith('./'):
                val = val[2:]
            return f'{attr}{q1}{prefix}{val}{q2}'

        # Issue270 — <script src="rel"> opening 태그 src 먼저 rewrite (split skip 대상이므로).
        content = self._SCRIPT_SRC_RE.sub(repl, content)

        # Split by <script>...</script>; rewrite only outside script blocks.
        # re.split with a capture group returns alternating non-match/match/...
        # so even indices (0, 2, 4, ...) are outside scripts.
        parts = re.split(r'(<script\b[^>]*>.*?</script\s*>)', content,
                         flags=re.IGNORECASE | re.DOTALL)
        for i in range(0, len(parts), 2):
            parts[i] = self._REL_ASSET_RE.sub(repl, parts[i])
        content = ''.join(parts)

        # Issue270 — inline <style> 블록 내 CSS url()/@import 상대 참조 rewrite.
        def css_repl(m):
            pre, q, val, post = m.group(1), m.group(2), m.group(3), m.group(4)
            if val.startswith('./'):
                val = val[2:]
            return f'{pre}{q}{prefix}{val}{post}'

        style_parts = re.split(r'(<style\b[^>]*>.*?</style\s*>)', content,
                               flags=re.IGNORECASE | re.DOTALL)
        for i in range(1, len(style_parts), 2):  # 홀수 index = <style> 블록
            style_parts[i] = self._CSS_URL_RE.sub(css_repl, style_parts[i])
        return ''.join(style_parts)

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
            '.proj-section{margin:28px 0}'
            '.section-header{margin:24px 0 8px}'
            '.section-header .section-title{border-bottom:2px solid hsl(191,60%,45%);'
            'padding-bottom:4px;margin:0;font-size:18px}'
            '.section-header .section-count{color:#999;font-size:14px;font-weight:normal}'
            '.section-header .section-desc{color:#666;font-size:13px;margin:4px 0 0}'
            '.card{position:relative;background:#fff;border:1px solid #ddd;border-radius:6px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,0.06)}'
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
            # config GUI (Issue275) — per-project _config.yml editor (gear button + modal)
            '.cfg-gear{position:absolute;top:8px;right:8px;border:1px solid #ddd;'
            'background:#fff;border-radius:6px;cursor:pointer;font-size:14px;'
            'line-height:1;padding:3px 7px;opacity:0.75}'
            '.cfg-gear:hover{opacity:1;background:#f0f8fa;border-color:hsl(191,60%,55%)}'
            '.cfg-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);'
            'display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}'
            '.cfg-overlay[hidden]{display:none}'
            '.cfg-modal{background:#fff;color:#1a1a1a;border-radius:10px;max-width:620px;'
            'width:100%;max-height:85vh;display:flex;flex-direction:column;'
            'box-shadow:0 8px 40px rgba(0,0,0,0.3)}'
            '.cfg-modal-head{display:flex;justify-content:space-between;align-items:center;'
            'padding:14px 18px;border-bottom:1px solid #eee;font-size:16px}'
            '.cfg-modal-head .cfg-head-right{display:flex;align-items:center;gap:10px}'
            '.cfg-lang{display:inline-flex;border:1px solid #ccc;border-radius:6px;overflow:hidden}'
            '.cfg-lang-btn{border:none;background:#fff;color:#555;padding:2px 9px;cursor:pointer;'
            'font-size:12px;font-weight:600}'
            '.cfg-lang-btn.active{background:hsl(191,60%,45%);color:#fff}'
            '.cfg-tabs{display:flex;flex-wrap:wrap;gap:2px;padding:0 12px;border-bottom:1px solid #eee}'
            '.cfg-tab{border:none;background:none;padding:8px 10px;cursor:pointer;font-size:13px;'
            'color:#666;border-bottom:2px solid transparent;margin-bottom:-1px}'
            '.cfg-tab:hover{color:#1a1a1a}'
            '.cfg-tab.active{color:hsl(191,55%,33%);border-bottom-color:hsl(191,60%,45%);font-weight:600}'
            '.cfg-panel.hidden{display:none}'
            '.cfg-panel{display:flex;flex-direction:column;gap:9px}'
            '.cfg-lab .cfg-set{font-size:11px;white-space:nowrap;margin-left:3px;opacity:0.8}'
            '.cfg-combo{position:relative;flex:1 1 auto;min-width:0;display:flex}'
            '.cfg-row input.cfg-combo-input{flex:1 1 auto;min-width:0;padding:5px 8px;'
            'border:1px solid #ccc;border-right:none;border-radius:5px 0 0 5px;'
            'font:inherit;background:#fff;color:#1a1a1a}'
            '.cfg-combo-toggle{border:1px solid #ccc;background:#eef4f5;'
            'border-radius:0 5px 5px 0;cursor:pointer;padding:0 9px;font-size:12px;'
            'color:#456;display:flex;align-items:center}'
            '.cfg-combo-toggle:hover{background:#dceef2}'
            '.cfg-combo-list{position:absolute;top:calc(100% + 2px);left:0;right:0;margin:0;'
            'padding:3px;list-style:none;background:#fff;border:1px solid #b9c6ca;'
            'border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,0.16);max-height:190px;'
            'overflow-y:auto;z-index:30}'
            '.cfg-combo-list.hidden{display:none}'
            '.cfg-combo-list li{padding:5px 9px;border-radius:4px;cursor:pointer;font-size:13px}'
            '.cfg-combo-list li:hover{background:#eaf4f7}'
            '.cfg-combo-list li.cur{font-weight:600;color:hsl(191,55%,33%)}'
            '.cfg-combo-list li.cur::after{content:" ✓";color:hsl(191,55%,40%)}'
            '.cfg-multi{flex:1 1 auto;min-width:0;display:flex;flex-wrap:wrap;gap:12px;align-items:center}'
            '.cfg-multi-item{display:inline-flex;align-items:center;gap:4px;font-size:13px;cursor:pointer}'
            '.cfg-x{border:none;background:none;font-size:18px;cursor:pointer;color:#888}'
            '.cfg-x:hover{color:#c33}'
            '.cfg-body{padding:14px 18px;overflow-y:auto;display:flex;flex-direction:column;gap:10px}'
            # two-column: label left-aligned in fixed-width gutter, control left-aligned; uniform row height
            '.cfg-row{display:flex;justify-content:flex-start;align-items:center;gap:14px;'
            'font-size:14px;min-height:34px}'
            '.cfg-row>.cfg-lab{flex:0 0 44%;color:#555;display:flex;justify-content:flex-start;'
            'align-items:center;gap:3px;text-align:left;line-height:1.25}'
            '.cfg-row input[type=text],.cfg-row input[type=number],.cfg-row select{'
            'flex:1 1 auto;width:auto;min-width:0;padding:5px 8px;'
            'border:1px solid #ccc;border-radius:5px;font:inherit;background:#fff;color:#1a1a1a}'
            '.cfg-bool{cursor:pointer}'
            '.cfg-bool>.cfg-lab{color:#1a1a1a}'
            '.cfg-switch{position:relative;display:inline-block;width:30px;height:16px;flex:0 0 auto}'
            '.cfg-switch input{opacity:0;width:0;height:0;position:absolute;margin:0}'
            '.cfg-slider{position:absolute;inset:0;background:#c8ccd0;border-radius:16px;'
            'transition:background .15s}'
            '.cfg-slider::before{content:"";position:absolute;height:12px;width:12px;left:2px;top:2px;'
            'background:#fff;border-radius:50%;transition:transform .15s;box-shadow:0 1px 2px rgba(0,0,0,0.35)}'
            '.cfg-switch input:checked + .cfg-slider{background:hsl(191,60%,45%)}'
            '.cfg-switch input:checked + .cfg-slider::before{transform:translateX(14px)}'
            '.cfg-switch input:focus-visible + .cfg-slider{outline:2px solid hsl(191,60%,55%);outline-offset:2px}'
            '.cfg-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;'
            'padding:12px 18px;border-top:1px solid #eee}'
            '.cfg-status{font-size:13px;color:#0a6;flex:1 1 auto;min-width:0}'
            '.cfg-save{cursor:pointer;padding:7px 16px;border:1px solid hsl(191,60%,35%);'
            'background:hsl(191,60%,45%);color:#fff;border-radius:6px;font-weight:600}'
            '.cfg-save:hover{background:hsl(191,60%,38%)}'
            '.cfg-save:disabled{opacity:0.6;cursor:wait}'
            '.cfg-openfile{cursor:pointer;padding:7px 12px;border:1px solid #ccc;'
            'background:#f2f4f6;color:#1a1a1a;border-radius:6px;font-size:13px;white-space:nowrap;flex:0 0 auto}'
            '.cfg-openfile:hover{background:#e6e9ec}'
            '@media (prefers-color-scheme:dark){body{background:#1a1a1a;color:#e0e0e0}'
            '.card{background:#222;border-color:#444}.card .links a{background:#2a3a3e}'
            'th{background:#2a3a3e}td,th{border-color:#444}code{background:#2d2d2d;color:#e0e0e0}'
            '.fb-text{background:#222;border-color:#555}'
            '.fb-actions .fb-send{background:#2a3a3e;border-color:#555}'
            '.fb-bulk-bar{background:#2a3a3e;border-color:#444}'
            '.fb-bulk-bar button{background:#222;border-color:#555}'
            '.fb-cmd-box{background:#2a3a3e;border-color:#444}'
            '.fb-cmd-box code{background:#222;border-color:#555}'
            '.fb-cmd-copy{background:#222;border-color:#555}'
            '.cfg-gear{background:#222;border-color:#444}'
            '.cfg-modal{background:#222;color:#e0e0e0}'
            '.cfg-modal-head,.cfg-foot{border-color:#444}'
            '.cfg-openfile{background:#2a2a2d;color:#e0e0e0;border-color:#555}'
            '.cfg-openfile:hover{background:#33383b}'
            '.cfg-row>span{color:#aaa}.cfg-bool>span{color:#e0e0e0}'
            '.cfg-slider{background:#555}'
            '.cfg-row input,.cfg-row select{background:#2a2a2a;color:#e0e0e0;border-color:#555}'
            '.cfg-lang{border-color:#555}.cfg-lang-btn{background:#2a2a2d;color:#aaa}'
            '.cfg-tabs{border-color:#444}.cfg-tab:hover{color:#e0e0e0}'
            '.cfg-lab .cfg-set{opacity:0.85}'
            '.cfg-row input.cfg-combo-input{background:#2a2a2a;color:#e0e0e0;border-color:#555}'
            '.cfg-combo-toggle{background:#333;border-color:#555;color:#bbb}'
            '.cfg-combo-toggle:hover{background:#3a4145}'
            '.cfg-combo-list{background:#222;border-color:#555}'
            '.cfg-combo-list li:hover{background:#33383b}}'
            '</style>'
        )

    def _common_header(self, title: str, show_projects_link: bool = True):
        links = ['<a href="/">🏠 home</a>']
        if show_projects_link:
            links.append('<a href="/p/">📂 projects</a>')
        else:
            links.append('<a href="https://finfra.github.io/m2slide/" target="_blank">🌐 finfra.github.io/m2slide</a>')
        if os.path.isdir(os.path.join(os.getcwd(), 'Projects_deck', 'decks')):
            links.append('<a href="/pd/">🃏 decks</a>')
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

    # Ordered category sections mirroring docs/index.html classification
    # (key, emoji, section title, section description). Empty buckets skipped.
    _CATEGORY_SECTIONS = [
        ('m2',    '🧩', 'm2Slide',   '마크다운 → 프레젠테이션 도구: 소개·기능·예제'),
        ('lec',   '🎓', '강연 자료', 'AI·LLM 강의용 프레젠테이션'),
        ('pr',    '📢', '프레임워크', 'Claude Code 다중 프로젝트 자동화'),
        ('info',  'ℹ️', '소개',      '도구·개념 소개 자료'),
        ('test',  '🧪', '테스트',    '개발·검증용 프로젝트'),
        ('other', '📁', '그 외',     '미분류 프로젝트'),
    ]
    _CATEGORY_EMOJI = {k: e for k, e, _t, _d in _CATEGORY_SECTIONS if k != 'other'}
    _PUBLISH_AFFIRM_RE = re.compile(r'^(o|y|yes|true|1|✓|v|ok)$', re.IGNORECASE)

    @classmethod
    def _category_key(cls, raw: str) -> str:
        """Normalize a Projects.md category cell to a known section key ('other' fallback)."""
        k = (raw or '').strip().lower()
        known = {key for key, *_ in cls._CATEGORY_SECTIONS}
        return k if k in known else 'other'

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

    def _serve_deck_list(self):
        """GET /pd/ — Projects_deck/decks/<category>/<deck> listing (Issue281).

        Deck builds are file://-portable static artifacts; entry links go straight
        to the static path (super().do_GET) — no /p/ proxy machinery involved.
        """
        decks_root = os.path.join(os.getcwd(), 'Projects_deck', 'decks')
        if not os.path.isdir(decks_root):
            self.send_error(404, 'Projects_deck/decks not found')
            return
        sections_html = []
        total = 0
        for cat in sorted(os.listdir(decks_root)):
            cat_dir = os.path.join(decks_root, cat)
            if cat.startswith(('.', '_')) or not os.path.isdir(cat_dir):
                continue
            cards = []
            for name in sorted(os.listdir(cat_dir)):
                deck_dir = os.path.join(cat_dir, name)
                if name.startswith(('.', '_')) or not os.path.isdir(deck_dir):
                    continue
                total += 1
                title = self._esc_html(name)
                entry = os.path.join(deck_dir, 'slide', 'index.html')
                if os.path.isfile(entry):
                    href = f'/Projects_deck/decks/{cat}/{name}/slide/index.html'
                    cards.append(
                        f'<div class="card"><h3><a href="{href}" target="_blank" rel="noopener">🃏 {title}</a></h3>'
                        f'<div class="links"><a href="{href}" target="_blank" rel="noopener">🎬 진입</a></div></div>'
                    )
                else:
                    cards.append(
                        f'<div class="card"><h3>🃏 {title}</h3>'
                        '<div class="meta">⚠️ 빌드 산출물 없음 (slide/index.html 부재)</div></div>'
                    )
            if cards:
                sections_html.append(
                    f'<section class="proj-section"><div class="section-header">'
                    f'<h2 class="section-title">📁 {self._esc_html(cat)} '
                    f'<span class="section-count">({len(cards)})</span></h2></div>'
                    '<div class="grid">' + '\n'.join(cards) + '</div></section>'
                )
        body = (
            '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
            '<title>m2slide — decks</title>'
            + self._common_styles() +
            '</head><body>'
            + self._common_header('🃏 덱 목록 (Projects_deck)') +
            f'<p>총 <b>{total}</b>개 덱 — <code>Projects_deck/decks/&lt;category&gt;/&lt;deck&gt;</code> '
            '(빌드 산출물 static 직접 서빙).</p>'
            + ''.join(sections_html) +
            '</body></html>'
        )
        self._write_html(body)

    def _serve_project_list(self):
        """GET /p/ — project directory listing."""
        projects = self._list_projects()
        meta_by_name = {r['name']: r for r in self._read_projects_md_active_rows()}
        # Bucket cards by category so /p/ mirrors docs/index.html classification.
        buckets = {key: [] for key, *_ in self._CATEGORY_SECTIONS}
        for p in projects:
            files = self._list_slide_files(p)
            entry = 'index.html' if 'index.html' in files else (files[0] if files else None)
            meta = meta_by_name.get(p)
            cat_key = self._category_key(meta['category'] if meta else '')
            cards = buckets[cat_key]
            cat_emoji = self._CATEGORY_EMOJI.get(cat_key, '📁')
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
            gear = (f'<button type="button" class="cfg-gear" '
                    f'data-project="{self._esc_html(p)}" title="설정">⚙️</button>')
            if not entry:
                cards.append(
                    f'<div class="card" data-project="{self._esc_html(p)}">'
                    + gear +
                    f'<h3>{title_html}</h3>'
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
                f'<div class="card" data-project="{self._esc_html(p)}">'
                + gear +
                f'<h3><a href="{first_link}" target="_blank" rel="noopener">{title_html}</a></h3>'
                + meta_line +
                f'<div class="meta">{build_label} · 진입: <code>{entry}</code></div>'
                '<div class="links">'
                f'<a href="/p/{p}" target="_blank" rel="noopener">📋 슬라이드 목록</a>'
                f'<a href="{first_link}" target="_blank" rel="noopener">🎬 진입 (cover/agenda/toc/첫슬라이드 fallback)</a>'
                '</div></div>'
            )
        sections_html = []
        for key, emoji, title, desc in self._CATEGORY_SECTIONS:
            bucket = buckets.get(key)
            if not bucket:
                continue
            sections_html.append(
                f'<section class="proj-section" id="section-{key}">'
                '<div class="section-header">'
                f'<h2 class="section-title">{emoji} {self._esc_html(title)} '
                f'<span class="section-count">({len(bucket)})</span></h2>'
                f'<p class="section-desc">{self._esc_html(desc)}</p></div>'
                '<div class="grid">' + '\n'.join(bucket) + '</div>'
                '</section>'
            )
        body = (
            '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
            '<title>m2slide — projects</title>'
            + self._common_styles() +
            '</head><body>'
            + self._common_header('📂 프로젝트 목록', show_projects_link=False) +
            f'<p>총 <b>{len(projects)}</b>개 프로젝트. '
            '(🏷️버전 · 📝설명 · ✅/🚧/⬜/➖ Manual Check · 🌐공개/🔒비공개 — '
            f'<code>Projects.md</code> 반영). 각 카드 <b>⚙️</b> → <code>_config.yml</code> 렌더 옵션 편집 + 재빌드.</p>'
            + ''.join(sections_html)
            + self._config_modal_html()
            + self._config_modal_script() +
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

    # ---- config editor GUI (Issue275) — full _config.yml render options ----
    # Whitelist of editable render options surfaced by the /p/ ⚙️ modal. Mirrors
    # _config.org.yml. Each field: key(dotted for nested)·tab(1-5)·type·label(ko)·
    # en·default + type params. Only these keys are writable via POST /p/<P>/config.
    _TRANSITIONS = ['none', 'fade', 'slide', 'convex', 'concave', 'zoom']
    _CSS_LEN_PAT = r'^(0|[0-9]+(\.[0-9]+)?(px|em|rem|vh|vw|vmin|vmax|%))$'
    _CONFIG_SCHEMA = [
        # Tab 1 — Theme & Layout
        {'key': 'theme', 'tab': 1, 'type': 'combo', 'label': '테마', 'en': 'Theme', 'default': 'default', 'pattern': r'^[a-z][a-z0-9_-]*$'},
        {'key': 'palette', 'tab': 1, 'type': 'combo', 'label': '팔레트', 'en': 'Palette', 'default': 'default', 'pattern': r'^[a-z][a-z0-9_-]*$', 'options': ['default', 'warm', 'cool', 'mono', 'office_rainbow']},
        {'key': 'theme_default_layout', 'tab': 1, 'type': 'text', 'label': '기본 레이아웃', 'en': 'Default layout', 'default': 'contents', 'pattern': r'^_?[a-z][a-z0-9-]*$'},
        {'key': 'cover_enabled', 'tab': 1, 'type': 'bool', 'label': '커버 슬라이드', 'en': 'Cover slide', 'default': 'false'},
        {'key': 'cover_layout', 'tab': 1, 'type': 'text', 'label': '커버 레이아웃', 'en': 'Cover layout', 'default': '_cover', 'pattern': r'^_?[a-z][a-z0-9-]*$'},
        {'key': 'auto_layout_detect', 'tab': 1, 'type': 'bool', 'label': '자동 레이아웃 감지', 'en': 'Auto layout detect', 'default': 'true'},
        {'key': 'top_align', 'tab': 1, 'type': 'bool', 'label': '상단 정렬', 'en': 'Top align', 'default': 'false'},
        {'key': 'guide_line', 'tab': 1, 'type': 'bool', 'label': '가이드 라인(디버그)', 'en': 'Guide line (debug)', 'default': 'false'},
        {'key': 'use_open_props', 'tab': 1, 'type': 'bool', 'label': 'Open Props 로드', 'en': 'Load Open Props', 'default': 'false'},
        {'key': 'title_contents_gap', 'tab': 1, 'type': 'int', 'label': '제목↔본문 갭(%)', 'en': 'Title-content gap (%)', 'default': '30', 'min': 0, 'max': 100},
        {'key': 'card_columns', 'tab': 1, 'type': 'int', 'label': '카드 열 수', 'en': 'Card columns', 'default': 'auto', 'min': 1, 'max': 12},
        # Tab 2 — TOC & Structure
        {'key': 'toc_placeholder', 'tab': 2, 'type': 'bool', 'label': '첫 슬라이드 TOC', 'en': 'First-slide TOC', 'default': 'true'},
        {'key': 'cards_placeholder', 'tab': 2, 'type': 'bool', 'label': 'H1 카드 페이지', 'en': 'H1 cards page', 'default': 'true'},
        {'key': 'agenda_enabled', 'tab': 2, 'type': 'bool', 'label': 'agenda 페이지', 'en': 'Agenda page', 'default': 'true'},
        {'key': 'agenda_card_mode', 'tab': 2, 'type': 'bool', 'label': 'agenda 카드 렌더', 'en': 'Agenda card mode', 'default': 'false'},
        {'key': 'toc_card_mode', 'tab': 2, 'type': 'bool', 'label': 'TOC 카드 렌더', 'en': 'TOC card mode', 'default': 'false'},
        {'key': 'agenda_title', 'tab': 2, 'type': 'text', 'label': 'agenda 제목', 'en': 'Agenda title', 'default': 'Agenda'},
        {'key': 'markmap_depth', 'tab': 2, 'type': 'int', 'label': 'markmap 깊이', 'en': 'Markmap depth', 'default': '2', 'min': 0, 'max': 9},
        {'key': 'chapter_markmap_depth', 'tab': 2, 'type': 'int', 'label': '챕터 markmap 깊이', 'en': 'Chapter markmap depth', 'default': '3', 'min': 0, 'max': 9},
        {'key': 'head_left', 'tab': 2, 'type': 'text', 'label': 'head 좌측', 'en': 'Head left', 'default': 'd1', 'pattern': r'^(d[0-9]{1,2}|now|none)$'},
        {'key': 'head_right', 'tab': 2, 'type': 'text', 'label': 'head 우측', 'en': 'Head right', 'default': 'now', 'pattern': r'^(d[0-9]{1,2}|now|none)$'},
        {'key': 'head_breadcum', 'tab': 2, 'type': 'bool', 'label': 'breadcrumb', 'en': 'Breadcrumb', 'default': 'true'},
        # Tab 3 — Navigation
        {'key': 'nav_indicator', 'tab': 3, 'type': 'enum', 'label': '네비게이터', 'en': 'Nav indicator', 'default': 'both', 'options': ['both', 'diamond', 'page']},
        {'key': 'nav_color', 'tab': 3, 'type': 'color', 'label': '네비 색', 'en': 'Nav color', 'default': 'auto'},
        {'key': 'page_number_mode', 'tab': 3, 'type': 'enum', 'label': '페이지 번호 모드', 'en': 'Page number mode', 'default': 'global', 'options': ['global', 'local']},
        {'key': 'breadcrumb', 'tab': 3, 'type': 'bool', 'label': 'breadcrumb 접두', 'en': 'Breadcrumb prefix', 'default': 'true'},
        # Tab 4 — Color & Animation
        {'key': 'htmlart_line_color', 'tab': 4, 'type': 'color', 'label': 'htmlArt 선 색', 'en': 'htmlArt line color', 'default': 'auto'},
        {'key': 'animation.default_transition', 'tab': 4, 'type': 'enum', 'label': '전환 효과', 'en': 'Transition', 'default': 'slide', 'options': _TRANSITIONS},
        {'key': 'animation.default_transition_speed', 'tab': 4, 'type': 'enum', 'label': '전환 속도', 'en': 'Transition speed', 'default': 'default', 'options': ['default', 'fast', 'slow']},
        {'key': 'animation.default_background_transition', 'tab': 4, 'type': 'enum', 'label': '배경 전환', 'en': 'Background transition', 'default': 'slide', 'options': _TRANSITIONS},
        {'key': 'video_default', 'tab': 4, 'type': 'text', 'label': '비디오 기본', 'en': 'Video default', 'default': 'controls', 'pattern': r'^[a-z][a-z-]*$'},
        {'key': 'background', 'tab': 4, 'type': 'text', 'label': '전역 배경', 'en': 'Global background', 'default': 'none'},
        # Tab 5 — Size & Font
        {'key': 'slide_ratio', 'tab': 5, 'type': 'enum', 'label': '슬라이드 비율', 'en': 'Slide ratio', 'default': '16:9', 'options': ['16:9', '3:2', 'fill']},
        {'key': 'slide_outer_padding', 'tab': 5, 'type': 'text', 'label': '외부 패딩', 'en': 'Outer padding', 'default': '0', 'pattern': _CSS_LEN_PAT},
        {'key': 'slide_inner_padding', 'tab': 5, 'type': 'text', 'label': '내부 패딩', 'en': 'Inner padding', 'default': '0', 'pattern': _CSS_LEN_PAT},
        {'key': 'style.theContents.font_size_auto', 'tab': 5, 'type': 'bool', 'label': '본문 폰트 자동', 'en': 'Auto font size', 'default': 'true'},
        {'key': 'style.theContents.font_size_min', 'tab': 5, 'type': 'text', 'label': '최소 폰트', 'en': 'Min font size', 'default': '20px', 'pattern': _CSS_LEN_PAT},
        {'key': 'style.theContents.font_size_max_ratio', 'tab': 5, 'type': 'float', 'label': '본문 최대 비율', 'en': 'Max font ratio', 'default': '0.66', 'min': 0.0, 'max': 1.0},
        {'key': 'style.theContents.media_container_enlarge', 'tab': 5, 'type': 'enum', 'label': '미디어 확대', 'en': 'Media enlarge', 'default': 'fit', 'options': ['original', 'width', 'height', 'fit']},
        # Tab 6 — Build & Deploy
        {'key': 'asset_mode', 'tab': 6, 'type': 'enum', 'label': '자산 배치', 'en': 'Asset mode', 'default': 'vendor', 'options': ['vendor', 'cdn']},
        {'key': 'deploy_formats', 'tab': 6, 'type': 'multi', 'label': '배포 형식', 'en': 'Deploy formats', 'default': '[]', 'options': ['epub', 'pdf', 'pptx']},
        {'key': 'kroki_server', 'tab': 6, 'type': 'text', 'label': 'Kroki 서버', 'en': 'Kroki server', 'default': 'https://kroki.io', 'pattern': r'^https?://[^\s;{}<>"]+$'},
    ]
    _CONFIG_I18N = {
        'ko': {
            'tabs': ['테마·레이아웃', '목차·구조', '네비게이션', '색·애니메이션', '크기·폰트', '빌드·배포'],
            'title': '설정', 'save': '저장 + 재빌드', 'saving': '저장·재빌드 중... (수 초)',
            'unset': '미설정', 'nochange': '변경 없음', 'loading': '로딩...', 'load_fail': '로딩 실패',
            'saved_ok': '저장·재빌드 완료', 'saved_norebuild': '저장됨 · 재빌드 실패', 'send_fail': '전송 실패',
            'userset': '기본값에서 변경됨',
            'open_file': '📄 설정 파일 열기', 'opening': '여는 중...', 'opened': '설정 파일 열기 완료 (VSCode)', 'open_fail': '열기 실패',
        },
        'en': {
            'tabs': ['Theme & Layout', 'TOC & Structure', 'Navigation', 'Color & Animation', 'Size & Font', 'Build & Deploy'],
            'title': 'Settings', 'save': 'Save + Rebuild', 'saving': 'Saving & rebuilding... (a few sec)',
            'unset': 'unset', 'nochange': 'No change', 'loading': 'Loading...', 'load_fail': 'Load failed',
            'saved_ok': 'Saved & rebuilt', 'saved_norebuild': 'Saved · rebuild failed', 'send_fail': 'Send failed',
            'userset': 'Changed from default',
            'open_file': '📄 Open settings file', 'opening': 'Opening...', 'opened': 'Opened in VSCode', 'open_fail': 'Open failed',
        },
    }
    _CONFIG_MAX_BODY = 64 * 1024
    _NAV_COLOR_RE = re.compile(
        r'^(auto|light|dark|#[0-9a-fA-F]{3,8}|rgba?\([^;{}<>]+\)|hsla?\([^;{}<>]+\)|[a-zA-Z]+)$')

    def _config_path(self, project: str) -> str:
        return os.path.join(os.getcwd(), 'Projects', project, '_config.yml')

    def _list_themes(self):
        """Theme names under theme/ (excluding _ prefixed like _shared)."""
        root = os.path.join(os.getcwd(), 'theme')
        out = []
        if os.path.isdir(root):
            for n in sorted(os.listdir(root)):
                if not n.startswith('_') and os.path.isdir(os.path.join(root, n)):
                    out.append(n)
        return out

    @staticmethod
    def _cfg_indent(line: str) -> int:
        s = line.rstrip('\n')
        return len(s) - len(s.lstrip(' '))

    @staticmethod
    def _cfg_key(line: str):
        s = line.strip()
        if not s or s.startswith('#') or ':' not in s:
            return None
        return s.split(':', 1)[0].strip()

    def _config_flat_values(self, project: str) -> dict:
        """Read _config.yml into a flat dict with dotted keys for nested blocks
        (animation.*, style.theContents.*). Preserves a leading '#' in scalar
        values (hex color); strips a trailing ' #comment' and surrounding quotes."""
        path = self._config_path(project)
        vals = {}
        if not os.path.isfile(path):
            return vals
        stack = []  # (indent, key) of open parent blocks
        try:
            with open(path, 'r', encoding='utf-8') as fh:
                for line in fh:
                    raw = line.rstrip('\n')
                    if not raw.strip() or raw.lstrip().startswith('#') or ':' not in raw:
                        continue
                    indent = self._cfg_indent(raw)
                    k, _, v = raw.partition(':')
                    k = k.strip()
                    while stack and stack[-1][0] >= indent:
                        stack.pop()
                    vc = re.sub(r'\s+#.*$', '', v).strip()
                    if len(vc) >= 2 and vc[0] == vc[-1] and vc[0] in '"\'':
                        vc = vc[1:-1]
                    if vc == '':
                        stack.append((indent, k))   # parent block
                    else:
                        dotted = '.'.join([s[1] for s in stack] + [k])
                        vals[dotted] = vc
        except OSError:
            pass
        return vals

    def _config_current(self, project: str) -> dict:
        """Schema-key current values. Absent key → '' (all types). Present bool →
        'true'/'false'. Client uses '' to show the unset badge + default placeholder."""
        raw = self._config_flat_values(project)
        out = {}
        for f in self._CONFIG_SCHEMA:
            v = raw.get(f['key'])
            if v is None:
                out[f['key']] = ''
            elif f['type'] == 'bool':
                out[f['key']] = 'true' if str(v).strip().lower() in ('true', 'yes', '1') else 'false'
            else:
                out[f['key']] = v
        return out

    def _validate_config_value(self, field: dict, value):
        """Return (ok, normalized_str_or_None, err). normalized None → remove key."""
        t = field['type']
        if t == 'bool':
            b = str(value).strip().lower() in ('true', 'yes', '1', 'on')
            return True, ('true' if b else 'false'), None
        s = ('' if value is None else str(value)).strip()
        if s == '':
            return True, None, None   # empty → remove line (revert to default)
        if any(c in s for c in '\n\r"<>{};'):
            return False, None, f'{field["key"]}: 금지 문자 포함'
        if t == 'int':
            try:
                n = int(s)
            except ValueError:
                return False, None, f'{field["key"]}: 정수 필요'
            lo, hi = field.get('min', 0), field.get('max', 999)
            if n < lo or n > hi:
                return False, None, f'{field["key"]}: 범위 {lo}~{hi}'
            return True, str(n), None
        if t == 'float':
            try:
                n = float(s)
            except ValueError:
                return False, None, f'{field["key"]}: 실수 필요'
            lo, hi = field.get('min', 0.0), field.get('max', 1.0)
            if n < lo or n > hi:
                return False, None, f'{field["key"]}: 범위 {lo}~{hi}'
            return True, s, None
        if t == 'enum':
            if s not in field['options']:
                return False, None, f'{field["key"]}: 허용값 {"|".join(field["options"])}'
            return True, s, None
        if t == 'multi':
            inner = s[1:-1] if s.startswith('[') and s.endswith(']') else s
            items = [x.strip() for x in inner.split(',') if x.strip()]
            for it in items:
                if it not in field['options']:
                    return False, None, f'{field["key"]}: 허용값 {"|".join(field["options"])}'
            return True, '[' + ', '.join(items) + ']', None
        if t == 'color':
            if not self._NAV_COLOR_RE.match(s):
                return False, None, f'{field["key"]}: auto|light|dark|<css-color>'
            return True, s, None
        # combo / text
        pat = field.get('pattern')
        if pat and not re.match(pat, s):
            return False, None, f'{field["key"]}: 형식 위반'
        return True, s, None

    @staticmethod
    def _cfg_render(v: str) -> str:
        """Scalar rendering — quote values with '#' (hex) or ':' (ratio) to match
        the _config.yml quoting convention (e.g. "#ffcc00", "3:2")."""
        return f'"{v}"' if ('#' in v or ':' in v) else v

    def _cfg_block_end(self, lines, start, hi, indent):
        """First index in [start, hi) whose real line has indent <= `indent`;
        trailing blanks/comments are excluded from the block."""
        last_real = start
        i = start
        while i < hi:
            k = self._cfg_key(lines[i])
            if k is not None:
                if self._cfg_indent(lines[i]) <= indent:
                    break
                last_real = i + 1
            i += 1
        return last_real

    def _apply_top_level(self, lines, updates):
        seen = set()
        out = []
        for line in lines:
            stripped = line.rstrip('\n')
            if stripped and stripped[0] not in ' \t#' and ':' in stripped:
                k = stripped.partition(':')[0].strip()
                if k in updates:
                    seen.add(k)
                    val = updates[k]
                    if val is None:
                        continue
                    out.append(f'{k}: {self._cfg_render(val)}\n')
                    continue
            out.append(line if line.endswith('\n') else line + '\n')
        for k, v in updates.items():
            if k in seen or v is None:
                continue
            out.append(f'{k}: {self._cfg_render(v)}\n')
        return out

    def _apply_nested(self, lines, parts, value):
        """Generic n-level (2-space indent) nested set/remove. value None → remove
        leaf (parent block preserved). Creates missing ancestor blocks/leaf."""
        depth = len(parts)
        lo, hi = 0, len(lines)
        for level, seg in enumerate(parts):
            want = level * 2
            found = None
            i = lo
            while i < hi:
                k = self._cfg_key(lines[i])
                if k is not None and self._cfg_indent(lines[i]) < want and level > 0:
                    break
                if k == seg and self._cfg_indent(lines[i]) == want:
                    found = i
                    break
                i += 1
            if level == depth - 1:
                if found is not None:
                    if value is None:
                        del lines[found]
                    else:
                        lines[found] = ' ' * want + f'{seg}: {self._cfg_render(value)}\n'
                elif value is not None:
                    ins = self._cfg_block_end(lines, lo, hi, want)
                    lines.insert(ins, ' ' * want + f'{seg}: {self._cfg_render(value)}\n')
                return lines
            if found is not None:
                lo = found + 1
                hi = self._cfg_block_end(lines, lo, hi, want)
            else:
                if value is None:
                    return lines
                ins = self._cfg_block_end(lines, lo, hi, want)
                lines.insert(ins, ' ' * want + f'{seg}:\n')
                lo = ins + 1
                hi = ins + 1
        return lines

    def _write_config_keys(self, project: str, updates: dict) -> None:
        """Write whitelisted keys to _config.yml. Top-level via line replace/append,
        dotted keys via the nested writer. Comments/order preserved; '#'/':' values
        quoted. None removes the key (reverts to global default)."""
        path = self._config_path(project)
        lines = []
        if os.path.isfile(path):
            with open(path, 'r', encoding='utf-8') as fh:
                lines = fh.readlines()
        top = {k: v for k, v in updates.items() if '.' not in k}
        nested = {k: v for k, v in updates.items() if '.' in k}
        lines = self._apply_top_level(lines, top)
        for dk, v in nested.items():
            lines = self._apply_nested(lines, dk.split('.'), v)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as fh:
            fh.writelines(lines)

    def _rebuild_project(self, project: str):
        """Run ./m2slide.sh <project> --no-serve. Returns (ok, returncode, log_tail)."""
        build_sh = os.path.join(os.getcwd(), 'm2slide.sh')
        if not os.path.isfile(build_sh):
            return False, -1, 'm2slide.sh not found'
        try:
            p = subprocess.run(
                [build_sh, project, '--no-serve'],
                cwd=os.getcwd(), capture_output=True, text=True, timeout=300)
        except subprocess.TimeoutExpired:
            return False, -1, 'build timeout (300s)'
        except OSError as e:
            return False, -1, f'build spawn 실패: {e}'
        out = (p.stdout or '') + (p.stderr or '')
        return (p.returncode == 0), p.returncode, out[-1500:]

    def _config_schema_out(self):
        """Schema with dynamic theme options injected (combo datalist source)."""
        themes = self._list_themes()
        out = []
        for f in self._CONFIG_SCHEMA:
            g = dict(f)
            if f['key'] == 'theme':
                g['options'] = themes or ['default']
            out.append(g)
        return out

    def _serve_config_get(self, project: str):
        """GET /p/<P>/config — schema (tabs·i18n labels), current values, defaults,
        themes, i18n bundle. Client renders tabs + language switch without re-fetch."""
        if project not in self._list_projects():
            self.send_error(404, f'project not found: {project}')
            return
        self._write_json({
            'project': project,
            'schema': self._config_schema_out(),
            'values': self._config_current(project),
            'defaults': {f['key']: f.get('default', '') for f in self._CONFIG_SCHEMA},
            'themes': self._list_themes(),
            'i18n': self._CONFIG_I18N,
            'tabCount': 6,
        })

    def _handle_config_post(self, project: str):
        """POST /p/<P>/config — validate + write whitelisted keys (incl. nested) to
        _config.yml, then rebuild. Body: {"values": {key: val, ...}}."""
        if project not in self._list_projects():
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
        if length > self._CONFIG_MAX_BODY:
            self.send_error(413, 'body too large')
            return
        try:
            payload = json.loads(self.rfile.read(length).decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            self.send_error(400, 'invalid JSON')
            return
        values = payload.get('values') if isinstance(payload, dict) else None
        if not isinstance(values, dict) or not values:
            self.send_error(400, 'values{} required')
            return
        field_by_key = {f['key']: f for f in self._CONFIG_SCHEMA}
        updates = {}
        errors = []
        for k, v in values.items():
            f = field_by_key.get(k)
            if not f:
                errors.append(f'{k}: 미허용 키')
                continue
            ok, norm, err = self._validate_config_value(f, v)
            if not ok:
                errors.append(err)
                continue
            updates[k] = norm
        if errors:
            self._write_json({'status': 'error', 'errors': errors}, status=400)
            return
        if not updates:
            self._write_json({'status': 'ok', 'saved': 0, 'rebuilt': False})
            return
        try:
            self._write_config_keys(project, updates)
        except OSError as e:
            self._write_json({'status': 'error', 'errors': [f'write 실패: {e}']}, status=500)
            return
        rebuilt, rc, log_tail = self._rebuild_project(project)
        self._write_json({
            'status': 'ok', 'saved': len(updates),
            'keys': sorted(updates.keys()),
            'rebuilt': rebuilt, 'returncode': rc, 'log': log_tail,
        })

    def _handle_open_config(self, project: str):
        """POST /p/<P>/open-config — open Projects/<P>/_config.yml in VSCode
        (parity with prj1 hub 'Open settings file'). Touches the file first when
        missing, matching Save which creates _config.yml on first write. The
        project is whitelisted via _list_projects() and the path is fixed under
        Projects/<P>/, so no arbitrary path is opened. Server binds 127.0.0.1
        only, so no extra IP allowlist is needed."""
        if project not in self._list_projects():
            self.send_error(404, f'project not found: {project}')
            return
        path = self._config_path(project)
        existed = os.path.isfile(path)
        if not existed:
            try:
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, 'a', encoding='utf-8'):
                    pass
            except OSError as e:
                self._write_json({'status': 'error', 'error': f'create 실패: {e}'}, status=500)
                return
        try:
            subprocess.Popen(['open', '-a', 'Visual Studio Code', path],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except OSError as e:
            self._write_json({'status': 'error', 'error': f'spawn 실패: {e}'}, status=500)
            return
        self._write_json({'status': 'opened', 'path': path, 'created': not existed})

    def _config_modal_html(self) -> str:
        """Static hidden modal: header(title + KO/EN switch + close), tab bar,
        panels container, footer(open file + status + save)."""
        return (
            '<div id="cfg-overlay" class="cfg-overlay" hidden>'
            '<div class="cfg-modal" role="dialog" aria-modal="true">'
            '<div class="cfg-modal-head"><b id="cfg-title">설정</b>'
            '<span class="cfg-head-right">'
            '<span class="cfg-lang">'
            '<button type="button" class="cfg-lang-btn active" data-lang="ko">KO</button>'
            '<button type="button" class="cfg-lang-btn" data-lang="en">EN</button></span>'
            '<button type="button" class="cfg-x" id="cfg-close" title="닫기">✕</button>'
            '</span></div>'
            '<div class="cfg-tabs" id="cfg-tabs"></div>'
            '<form id="cfg-form" class="cfg-body"></form>'
            '<div class="cfg-foot">'
            '<button type="button" id="cfg-openfile" class="cfg-openfile" '
            'title="_config.yml 을 VSCode 로 열기">📄 설정 파일 열기</button>'
            '<span id="cfg-status" class="cfg-status"></span>'
            '<button type="button" id="cfg-save" class="cfg-save">저장 + 재빌드</button></div>'
            '</div></div>'
        )

    def _config_modal_script(self) -> str:
        """Inline JS: gear → GET → build tabs/fields → badges → lang switch → POST diff."""
        js = r'''
var overlay=document.getElementById('cfg-overlay');
var tabsEl=document.getElementById('cfg-tabs');
var form=document.getElementById('cfg-form');
var titleEl=document.getElementById('cfg-title');
var statusEl=document.getElementById('cfg-status');
var saveBtn=document.getElementById('cfg-save');
var openBtn=document.getElementById('cfg-openfile');
var DATA=null, initial={}, lang='ko', activeTab=1;
try{lang=localStorage.getItem('m2cfgLang')||'ko';}catch(e){}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function idOf(k){return 'cfg-f-'+k.replace(/\./g,'-');}
function L(f){return lang==='en'?f.en:f.label;}
function T(k){return (DATA.i18n[lang]||{})[k]||k;}
function badgeHtml(){return '<span class="cfg-set" title="'+esc(T('userset'))+'">✏️</span>';}
function normList(v){return parseList(v).slice().sort().join(',');}
// pencil ✏️ shows only when the value differs from its schema default
function diffsDefault(f,v,def){
  if(f.type==='bool')return v!==def;
  if(v==='')return false;
  if(f.type==='multi')return normList(v)!==normList(def);
  return v!==def;
}
function ctrl(f){
  var id=idOf(f.key), val=(DATA.values[f.key]!=null?DATA.values[f.key]:''), def=DATA.defaults[f.key]||'';
  var cur=(f.type==='bool')?(val!==''?val:def):val;
  var badge=diffsDefault(f,cur,def)?badgeHtml():'';
  var lab='<span class="cfg-lab"><span class="cfg-lname" data-ko="'+esc(f.label)+'" data-en="'+esc(f.en)+'">'+esc(L(f))+'</span>'+badge+'</span>';
  var ctl;
  if(f.type==='bool'){
    var on=(val!==''?val==='true':def==='true');
    var sw='<span class="cfg-switch"><input type="checkbox" id="'+id+'"'+(on?' checked':'')+' role="switch"><span class="cfg-slider"></span></span>';
    return '<label class="cfg-row cfg-bool" data-key="'+esc(f.key)+'">'+lab+sw+'</label>';
  }
  if(f.type==='int'||f.type==='float'){
    var step=f.type==='float'?' step="0.01"':'';
    ctl='<input type="number" id="'+id+'"'+(f.min!=null?' min="'+f.min+'"':'')+(f.max!=null?' max="'+f.max+'"':'')+step+' value="'+esc(val)+'" placeholder="'+esc(def)+'">';
  }else if(f.type==='enum'){
    var opts=(f.options||[]).map(function(o){return '<option'+(o===val?' selected':'')+'>'+esc(o)+'</option>';}).join('');
    ctl='<select id="'+id+'"><option value=""'+(val===''?' selected':'')+'>('+esc(def)+')</option>'+opts+'</select>';
  }else if(f.type==='combo'){
    var lis=(f.options||[]).map(function(o){return '<li data-val="'+esc(o)+'"'+(o===val?' class="cur"':'')+'>'+esc(o)+'</li>';}).join('');
    ctl='<div class="cfg-combo" data-combo="1">'
      +'<input type="text" id="'+id+'" class="cfg-combo-input" value="'+esc(val)+'" placeholder="'+esc(def)+'" autocomplete="off" role="combobox" aria-expanded="false">'
      +'<button type="button" class="cfg-combo-toggle" tabindex="-1" aria-label="목록">▾</button>'
      +'<ul class="cfg-combo-list hidden">'+lis+'</ul></div>';
  }else if(f.type==='multi'){
    var mcur=parseList(val);
    var boxes=(f.options||[]).map(function(o){var on=mcur.indexOf(o)>=0;return '<label class="cfg-multi-item"><input type="checkbox" data-mopt="'+esc(o)+'"'+(on?' checked':'')+'>'+esc(o)+'</label>';}).join('');
    ctl='<div class="cfg-multi" id="'+id+'">'+boxes+'</div>';
  }else{
    ctl='<input type="text" id="'+id+'" value="'+esc(val)+'" placeholder="'+esc(def)+'">';
  }
  return '<div class="cfg-row" data-key="'+esc(f.key)+'">'+lab+ctl+'</div>';
}
function buildTabs(){
  tabsEl.innerHTML=DATA.i18n.ko.tabs.map(function(_,i){
    var n=i+1;
    return '<button type="button" class="cfg-tab'+(n===activeTab?' active':'')+'" data-tab="'+n+'">'
      +'<span data-ko="'+esc(DATA.i18n.ko.tabs[i])+'" data-en="'+esc(DATA.i18n.en.tabs[i])+'">'+esc(DATA.i18n[lang].tabs[i])+'</span></button>';
  }).join('');
}
function buildPanels(){
  var html='';
  for(var t=1;t<=DATA.tabCount;t++){
    html+='<div class="cfg-panel'+(t===activeTab?'':' hidden')+'" data-panel="'+t+'">';
    html+=DATA.schema.filter(function(f){return f.tab===t;}).map(ctrl).join('');
    html+='</div>';
  }
  form.innerHTML=html;
  form.querySelectorAll('.cfg-row [id^=cfg-f-]').forEach(function(el){
    el.addEventListener('input',onFieldInput);
    el.addEventListener('change',onFieldInput);
  });
  form.querySelectorAll('.cfg-combo').forEach(wireCombo);
}
function closeAllCombos(){document.querySelectorAll('.cfg-combo-list').forEach(function(l){l.classList.add('hidden');var c=l.closest('.cfg-combo');if(c){var i=c.querySelector('.cfg-combo-input');if(i)i.setAttribute('aria-expanded','false');}});}
function wireCombo(combo){
  var inp=combo.querySelector('.cfg-combo-input');
  var list=combo.querySelector('.cfg-combo-list');
  var toggle=combo.querySelector('.cfg-combo-toggle');
  function filter(){var v=inp.value.trim().toLowerCase();list.querySelectorAll('li').forEach(function(li){li.style.display=(!v||li.dataset.val.toLowerCase().indexOf(v)>=0)?'':'none';});}
  function showAll(){list.querySelectorAll('li').forEach(function(li){li.style.display='';});}
  function open(){closeAllCombos();showAll();list.classList.remove('hidden');inp.setAttribute('aria-expanded','true');}
  function shut(){list.classList.add('hidden');inp.setAttribute('aria-expanded','false');}
  toggle.addEventListener('click',function(e){e.stopPropagation();if(list.classList.contains('hidden'))open();else shut();});
  inp.addEventListener('focus',open);
  inp.addEventListener('input',filter);
  list.addEventListener('mousedown',function(e){e.preventDefault();});
  list.addEventListener('click',function(e){var li=e.target.closest('li');if(!li)return;inp.value=li.dataset.val;list.querySelectorAll('li.cur').forEach(function(x){x.classList.remove('cur');});li.classList.add('cur');shut();inp.dispatchEvent(new Event('input',{bubbles:true}));});
}
function fixBodyHeight(){
  var panels=form.querySelectorAll('.cfg-panel'), prev=[];
  panels.forEach(function(p,i){prev[i]=p.classList.contains('hidden');p.classList.remove('hidden');});
  var mx=0; panels.forEach(function(p){if(p.offsetHeight>mx)mx=p.offsetHeight;});
  panels.forEach(function(p,i){if(prev[i])p.classList.add('hidden');});
  if(mx>0)form.style.minHeight=mx+'px';
}
function onFieldInput(e){
  var row=e.target.closest('.cfg-row'); if(!row)return;
  var key=row.dataset.key, f=fieldOf(key); if(!f)return;
  var v=readField(f), def=DATA.defaults[key]||'';
  var badge=row.querySelector('.cfg-set');
  var should=diffsDefault(f,v,def);
  if(should&&!badge){
    var lab=row.querySelector('.cfg-lab');
    if(lab)lab.insertAdjacentHTML('beforeend',badgeHtml());
  }else if(!should&&badge){badge.remove();}
}
function fieldOf(key){return DATA.schema.filter(function(f){return f.key===key;})[0];}
function parseList(v){v=(v||'').trim();if(v.charAt(0)==='[')v=v.slice(1);if(v.charAt(v.length-1)===']')v=v.slice(0,-1);return v.split(',').map(function(x){return x.trim();}).filter(Boolean);}
function readField(f){var el=document.getElementById(idOf(f.key));if(!el)return '';if(f.type==='bool')return el.checked?'true':'false';if(f.type==='multi'){var sel=[];el.querySelectorAll('input[type=checkbox]:checked').forEach(function(c){sel.push(c.dataset.mopt);});return '['+sel.join(', ')+']';}return (el.value||'').trim();}
function applyLang(l){
  lang=l; try{localStorage.setItem('m2cfgLang',l);}catch(e){}
  document.querySelectorAll('.cfg-lang-btn').forEach(function(b){b.classList.toggle('active',b.dataset.lang===l);});
  document.querySelectorAll('#cfg-overlay [data-ko]').forEach(function(el){
    var t=el.getAttribute('data-'+l); if(t!=null)el.textContent=t;
  });
  titleEl.textContent=(overlay.dataset.project||'')+' — '+T('title');
  saveBtn.textContent=T('save');
  openBtn.textContent=T('open_file');
  fixBodyHeight();
}
function showTab(n){
  activeTab=n;
  tabsEl.querySelectorAll('.cfg-tab').forEach(function(b){b.classList.toggle('active',+b.dataset.tab===n);});
  form.querySelectorAll('.cfg-panel').forEach(function(p){p.classList.toggle('hidden',+p.dataset.panel!==n);});
}
function openModal(project){
  overlay.dataset.project=project; statusEl.textContent=''; activeTab=1;
  tabsEl.innerHTML=''; form.innerHTML=''; overlay.hidden=false;
  titleEl.textContent=project+' — 설정';
  fetch('/p/'+encodeURIComponent(project)+'/config').then(function(r){return r.json();}).then(function(j){
    DATA=j; initial={};
    DATA.schema.forEach(function(f){var v=DATA.values[f.key]!=null?DATA.values[f.key]:'';
      if(f.type==='bool')initial[f.key]=(v!==''?v:(DATA.defaults[f.key]||'false'));
      else if(f.type==='multi')initial[f.key]='['+parseList(v).join(', ')+']';
      else initial[f.key]=v;});
    buildTabs(); buildPanels(); applyLang(lang); showTab(1);
    tabsEl.querySelectorAll('.cfg-tab').forEach(function(b){b.addEventListener('click',function(){showTab(+b.dataset.tab);});});
  }).catch(function(e){statusEl.style.color='#c33';statusEl.textContent=T('load_fail')+': '+e.message;});
}
function closeModal(){overlay.hidden=true;}
function save(){
  var project=overlay.dataset.project, values={};
  DATA.schema.forEach(function(f){var v=readField(f);if(v!==initial[f.key])values[f.key]=v;});
  if(Object.keys(values).length===0){statusEl.style.color='';statusEl.textContent=T('nochange');return;}
  statusEl.style.color='';statusEl.textContent=T('saving');saveBtn.disabled=true;
  fetch('/p/'+encodeURIComponent(project)+'/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({values:values})})
    .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};});})
    .then(function(res){saveBtn.disabled=false;var j=res.j;
      if(!res.ok||j.status==='error'){statusEl.style.color='#c33';statusEl.textContent='✗ '+((j.errors||[]).join('; ')||j.status||'error');return;}
      statusEl.style.color=j.rebuilt?'#0a6':'#c60';
      statusEl.textContent=(j.rebuilt?'✓ '+T('saved_ok'):'⚠ '+T('saved_norebuild')+' (rc '+j.returncode+')')+' ['+(j.keys||[]).join(', ')+']';
      DATA.schema.forEach(function(f){initial[f.key]=readField(f);});
    }).catch(function(e){saveBtn.disabled=false;statusEl.style.color='#c33';statusEl.textContent='✗ '+T('send_fail')+': '+e.message;});
}
document.addEventListener('click',function(e){
  var g=e.target.closest?e.target.closest('.cfg-gear'):null;
  if(g){e.preventDefault();openModal(g.dataset.project);return;}
  var lb=e.target.closest?e.target.closest('.cfg-lang-btn'):null;
  if(lb){applyLang(lb.dataset.lang);return;}
  if(!e.target.closest||!e.target.closest('.cfg-combo'))closeAllCombos();
  if(e.target===overlay)closeModal();
});
document.getElementById('cfg-close').addEventListener('click',closeModal);
saveBtn.addEventListener('click',save);
openBtn.addEventListener('click',function(){
  var project=overlay.dataset.project; if(!project)return;
  statusEl.style.color='';statusEl.textContent=T('opening');openBtn.disabled=true;
  fetch('/p/'+encodeURIComponent(project)+'/open-config',{method:'POST'})
    .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};});})
    .then(function(res){openBtn.disabled=false;var j=res.j;
      if(!res.ok||j.status!=='opened'){statusEl.style.color='#c33';statusEl.textContent='✗ '+((j&&j.error)||T('open_fail'));return;}
      statusEl.style.color='#0a6';statusEl.textContent='✓ '+T('opened');})
    .catch(function(e){openBtn.disabled=false;statusEl.style.color='#c33';statusEl.textContent='✗ '+T('send_fail')+': '+e.message;});
});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!overlay.hidden)closeModal();});
'''
        return '<script>(function(){' + js + '})();</script>'

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
        m = self._CONFIG_RE.match(path_only)
        if m:
            return self._handle_config_post(m.group(1))
        m = self._OPEN_CONFIG_RE.match(path_only)
        if m:
            return self._handle_open_config(m.group(1))
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
