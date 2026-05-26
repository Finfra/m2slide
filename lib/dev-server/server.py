#!/usr/bin/env python3
"""m2slide dev-server — Issue235 / Issue236

localhost-only static HTTP server for m2slide build artifacts.
Document root = m2slide project root (passed via --root).
Bound to 127.0.0.1 only.

Short URL routing (Issue236.5~12):
  GET /p/<project>/s/<chap>/<slide>           → design view (proxy build artifact)
  GET /p/<project>/s/<chap>/<slide>?mode=text → plain text section (curl-friendly)
  GET /p/<project>                            → slide list overview
  GET /p/<project>/s/cover                    → index.html proxy (markmap)
  GET /p/<project>/s/<chap>/toc               → chap N first slide

This server is dev-only; it is NOT part of build artifacts and does not affect
file:// deployment. The file-deployment rule remains intact.

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

        Default (bare URL): proxy build artifact + navigate to slide N (browser design view).
        ?mode=text: plain text section (curl-friendly).
        ?mode=raw: alias for bare (backward compat).

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
        if q.get('mode', [''])[0] == 'text':
            # text section (curl-friendly)
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
        # default: proxy build artifact (browser design view) + navigate to slide N
        return self._proxy_build_artifact(file_rel, slide_n=n)

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
        """/p/<P>/s/c — cover. Fallback: not active → 302 /s/a."""
        if not self._cover_active(project):
            return self._redirect_302(f'/p/{project}/s/a')
        # cover 활성 — chapter mode·single mode 모두 index.html proxy (markmap or cover slide)
        file_rel = self._short_file_rel(project, None)  # index.html
        return self._proxy_build_artifact(file_rel)

    def _serve_short_a(self, project: str):
        """/p/<P>/s/a — agenda. Fallback: not active → 302 /s/t."""
        if not self._agenda_active(project):
            return self._redirect_302(f'/p/{project}/s/t')
        file_rel = f'Projects/{project}/slide/agenda.html'
        return self._proxy_build_artifact(file_rel)

    def _serve_short_t(self, project: str):
        """/p/<P>/s/t — toc. Fallback: not active → 302 /s/1/1."""
        if not self._toc_active(project):
            return self._redirect_302(f'/p/{project}/s/1/1')
        # toc slide 위치:
        #   single mode: index.html#/2 (cover=#/1, toc=#/2)
        #   chapter mode: 첫 chapter html#/2 (chapter 페이지 첫 슬라이드 = toc 자동 주입)
        # 모두 chap=1, slide=2 로 통일 가능 (m2slide hashOneBasedIndex 정합)
        return self._serve_short_slide_indexed(project, 1, 2)

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

        slide_n (optional): if provided AND > 1, injects a script to navigate
        to #/N when the browser has not already set a hash. URL hash from the
        user (preserved by browser across our 302) wins.

        slide_n=1 case skips inject — reveal.js default entry is first slide,
        and hashOneBasedIndex maps it to #/1 lazily on first navigation.
        Avoids redundant `#/1` appearing in the URL bar on first-slide entry
        (e.g. clicking a /p/<P>/s/<chap>/1 link from the overview page).
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
        if slide_n is not None and slide_n > 1:
            nav_script = (
                f'<script>(function(){{'
                f'if(!window.location.hash){{'
                f'window.location.hash="#/{slide_n}";'
                f'}}'
                f'}})();</script>'
            )
            new_content, _ = re.subn(
                r'(</body\s*>)', nav_script + r'\1', content, count=1, flags=re.IGNORECASE)
            content = new_content if _ else content + nav_script
        data = content.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        # Disable cache so iterative dev (build → reload) always sees fresh
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    # Pattern A — X.html in quotes (JS string literal, HTML href/src attr direct).
    _NAV_HTML_RE = re.compile(
        r"""(['"])(?!/|https?:|file:|data:)([\w][\w-]*)\.html(\?[^'"#]*)?(#[^'"]*)?(\1)""",
        re.IGNORECASE,
    )
    # Pattern B — meta refresh: <meta http-equiv="refresh" content="0; url=agenda.html">
    # url= sits inside a quoted attribute, not at the quote boundary.
    _META_REFRESH_RE = re.compile(
        r"""(\burl\s*=\s*)([\w][\w-]*)\.html(\?[^"'\s>]*)?(#[^"'\s>]*)?""",
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
        """
        prefix = f'/p/{project}/s/'

        def repl(m):
            attr, q1, val, q2 = m.group(1), m.group(2), m.group(3), m.group(4)
            # skip if val ends with .html (with optional query/fragment) — nav rewrite handles
            stripped = val.split('?', 1)[0].split('#', 1)[0]
            if stripped.lower().endswith('.html'):
                return m.group(0)
            return f'{attr}{q1}{prefix}{val}{q2}'

        return self._REL_ASSET_RE.sub(repl, content)

    def _stem_to_short_path(self, project: str, stem: str) -> str:
        # Issue240: short URL 통일 — index → /s/c (cover), agenda → /s/a (agenda).
        # chapter stem 은 그대로 /p/<P>/<stem>.
        s = stem.lower()
        if s == 'index':
            return f'/p/{project}/s/c'
        if s == 'agenda':
            return f'/p/{project}/s/a'
        return f'/p/{project}/{stem}'

    def _rewrite_nav_strings(self, content: str, project: str) -> str:
        """Rewrite agenda.html / index.html / <chapter>.html navigation to short
        /p/<P>[/<stem>] form. Covers:
          - JS string literals: 'agenda.html?back=1'
          - HTML attrs: <a href="agenda.html">, <link href="agenda.html">
          - meta refresh: <meta http-equiv="refresh" content="0; url=agenda.html">
        """
        def repl_quoted(m):
            q1, stem, qry, frag, q2 = (
                m.group(1), m.group(2), m.group(3) or '', m.group(4) or '', m.group(5)
            )
            new = self._stem_to_short_path(project, stem)
            return f'{q1}{new}{qry}{frag}{q2}'
        content = self._NAV_HTML_RE.sub(repl_quoted, content)

        def repl_meta(m):
            prefix, stem, qry, frag = (
                m.group(1), m.group(2), m.group(3) or '', m.group(4) or ''
            )
            new = self._stem_to_short_path(project, stem)
            return f'{prefix}{new}{qry}{frag}'
        content = self._META_REFRESH_RE.sub(repl_meta, content)
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
            'code{background:#f3f3f3;padding:2px 6px;border-radius:3px;font-size:0.9em}'
            'pre{background:#2d2d2d;color:#f8f8f2;padding:12px;border-radius:4px;overflow-x:auto}'
            '@media (prefers-color-scheme:dark){body{background:#1a1a1a;color:#e0e0e0}'
            '.card{background:#222;border-color:#444}.card .links a{background:#2a3a3e}'
            'th{background:#2a3a3e}td,th{border-color:#444}code{background:#2d2d2d;color:#e0e0e0}}'
            '</style>'
        )

    def _common_header(self, title: str):
        return (
            f'<header><h1>{title}</h1>'
            '<div><a href="/">🏠 home</a> · <a href="/p/">📂 projects</a></div></header>'
        )

    def _serve_root(self):
        """GET / — landing page with server info + main navigation."""
        projects = self._list_projects()
        sample = projects[0] if projects else 'm2SlideStyle1_single'
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
            f'<div class="card"><h3><a href="/p/{sample}/s/c">🎬 sample 진입</a></h3>'
            f'<div class="meta">{sample} cover (없으면 agenda·toc·첫슬라이드 fallback)</div>'
            f'<div class="links"><a href="/p/{sample}/s/c">/p/{sample}/s/c</a></div></div>'
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

    def _serve_project_list(self):
        """GET /p/ — project directory listing."""
        projects = self._list_projects()
        cards = []
        for p in projects:
            files = self._list_slide_files(p)
            entry = 'index.html' if 'index.html' in files else (files[0] if files else None)
            count = len(files)
            if not entry:
                cards.append(
                    f'<div class="card"><h3>{p}</h3>'
                    f'<div class="meta">⚠️ 빌드 산출물 없음 (slide/ 비어있음)</div>'
                    f'<div class="links"><a href="/p/{p}">목록 보기</a></div></div>'
                )
                continue
            # Use chap_idx-aware short URL form (/p/<P>/s/<chap>/<slide>?mode=raw)
            deck_files = [f for f in files if f != 'agenda.html']
            chapter_files = [f for f in deck_files if f != 'index.html']
            if chapter_files:
                meta_label = f'{len(chapter_files)} chapter (chapter mode)'
            else:
                meta_label = '1 deck (single mode)'
            first_link = f'/p/{p}/s/c'  # was /s/1/1 — fallback chain 보장
            cards.append(
                f'<div class="card"><h3><a href="{first_link}">{p}</a></h3>'
                f'<div class="meta">{meta_label} · 진입: <code>{entry}</code></div>'
                '<div class="links">'
                f'<a href="/p/{p}">📋 슬라이드 목록</a>'
                f'<a href="{first_link}">🎬 진입 (cover/agenda/toc/첫슬라이드 fallback)</a>'
                '</div></div>'
            )
        body = (
            '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
            '<title>m2slide — projects</title>'
            + self._common_styles() +
            '</head><body>'
            + self._common_header('📂 프로젝트 목록') +
            f'<p>총 <b>{len(projects)}</b>개 프로젝트.</p>'
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
                rows.append(
                    f'<tr><td>{one}</td>'
                    f'<td><a href="/p/{project}/s/{chap_idx}/{one}">{title}</a></td>'
                    f'<td><a href="/p/{project}/s/{chap_idx}/{one}?mode=text">text</a></td>'
                    f'<td>{e - s}</td></tr>'
                )
            chapter_entry = f'/p/{project}/s/{chap_idx}/1'
            section = (
                f'<h3>chap {chap_idx} — {stem} '
                f'<small style="color:#888">({count} slides · '
                f'<a href="{chapter_entry}">open</a>)</small></h3>'
                '<table><thead><tr><th>n</th><th>title (→ live)</th><th>text</th><th>bytes</th></tr></thead>'
                f'<tbody>{"".join(rows) or "<tr><td colspan=4>no sections</td></tr>"}</tbody></table>'
            )
            sections_html_blocks.append(section)
        summary = f'<b>{total_slides}</b> slides · {mode_label}'
        body = (
            '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
            f'<title>m2slide — {project}</title>'
            + self._common_styles() +
            '</head><body>'
            + self._common_header(f'📋 {project}') +
            f'<p>{summary}</p>'
            + '\n'.join(sections_html_blocks) +
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
