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


_PATH_PROJECT_RE = re.compile(
    r'^Projects/([^/]+)/slide/(.+)\.html$', re.IGNORECASE)


def to_short_url(file_path: str, n=None, mode: str = '') -> str:
    """Convert Projects/<P>/slide/<X>.html [+ n] to /p/<P>[/<X>]/s/<n>[?mode=raw].

    Returns shortened URL when path matches build-artifact convention, else falls
    back to the long path-segment form.
    """
    m = _PATH_PROJECT_RE.match(file_path.lstrip('/'))
    if not m:
        # fallback — long form
        if n is None:
            return '/' + file_path.lstrip('/')
        return f'/_dev/text/{n}/{file_path}'
    project, stem = m.group(1), m.group(2)
    chapter_seg = '' if stem == 'index' else f'/{stem}'
    # text is default — only raw needs ?mode=raw
    suffix = '?mode=raw' if mode == 'raw' else ''
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


def render_raw_nav(file_path: str, n: int, total: int, mode: str = 'raw') -> str:
    """Legacy fallback for callers without chap_idx context — uses to_short_url."""
    prev_n = max(1, n - 1)
    next_n = min(total, n + 1)
    return render_raw_nav_with_urls(
        file_path, n, total,
        prev_url=to_short_url(file_path, prev_n),
        next_url=to_short_url(file_path, next_n),
        list_url=to_short_url(file_path),
        live_url=to_short_url(file_path, n, 'raw'),
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
    """Static serve + /_dev/{raw,list,help} endpoints (Issue236)."""

    def log_message(self, format, *args):
        try:
            code = int(args[1]) if len(args) > 1 else 0
            if code >= 400:
                sys.stderr.write("%s - - [%s] %s\n" % (
                    self.address_string(), self.log_date_time_string(), format % args))
        except (ValueError, IndexError):
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
    #   /p/<project>/s/<chap>/<slide>      → text section. chap, slide both 1-base
    #   /p/<project>/s/<slide>             → chap=1 (single mode index.html) shorthand
    #   /p/<project>/<chapter_name>/s/<n>  → text section, chapter named (legacy)
    #   /p/<project>                       → HTML overview page
    #   /p/<project>/<chapter_name>        → 302 to /Projects/<project>/slide/<chapter>.html
    # ?mode=raw  → 302 to live URL with #/N (browser design view)
    _SHORT_SLIDE_CHAP_RE = re.compile(r'^/p/([^/]+)/s/(\d+)/(\d+)/?$')
    _SHORT_SLIDE_RE = re.compile(r'^/p/([^/]+)(?:/([^/]+))?/s/(\d+)/?$')
    _SHORT_ENTRY_RE = re.compile(r'^/p/([^/]+)(?:/([^/]+))?/?$')

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
        # Legacy build-artifact .html — redirect to short /p/ form (Issue236.9)
        m = self._LEGACY_BUILD_HTML_RE.match(path_only)
        if m:
            return self._redirect_legacy_html(m.group(1), m.group(2))
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
            f'(text) or <code>?mode=raw</code> (design view).</p>'
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
        """Convert Projects/<P>/slide/<X>.html [+ slide] to /p/<P>/s/<chap>/<slide>[?mode=raw].

        Returns None if file_path not a build artifact under Projects/<P>/slide/.
        Falls back to long form for unknown paths.
        """
        m = _PATH_PROJECT_RE.match(file_path.lstrip('/'))
        if not m:
            return None
        project, stem = m.group(1), m.group(2)
        chap_idx = self._stem_to_chapter_index(project, stem)
        if chap_idx is None:
            return None
        suffix = '?mode=raw' if mode == 'raw' else ''
        if slide_idx is None:
            return f'/p/{project}'
        return f'/p/{project}/s/{chap_idx}/{slide_idx}{suffix}'

    def _serve_short_slide(self, project: str, chapter, n: int):
        """Handle /p/<project>[/<chapter>]/s/<n>."""
        file_rel = self._short_file_rel(project, chapter)
        # mode=raw → proxy build artifact content + base href + hash navigate
        # (Issue236.9 — no longer 302 to /Projects/...; URL bar stays short)
        q = parse_qs(urlparse(self.path).query)
        if q.get('mode', [''])[0] == 'raw':
            return self._proxy_build_artifact(file_rel, slide_n=n)
        # default: text section
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

    def _render_indexed_nav(self, file_path: str, n: int, total: int):
        """Build nav bar with chap_idx-aware URLs (/p/<P>/s/<chap>/<slide>)."""
        prev_n = max(1, n - 1)
        next_n = min(total, n + 1)
        prev = self._file_path_to_short_indexed(file_path, prev_n)
        nxt = self._file_path_to_short_indexed(file_path, next_n)
        lst = self._file_path_to_short_indexed(file_path)
        live = self._file_path_to_short_indexed(file_path, n, 'raw')
        # fallback to legacy form for non-build-artifact paths
        if prev is None:
            return render_raw_nav(file_path, n, total, mode='text')
        return render_raw_nav_with_urls(file_path, n, total, prev, nxt, lst, live)

    def _serve_short_entry(self, project: str, chapter):
        """Handle /p/<project>[/<chapter>].

        * chapter present → proxy build artifact content (Issue236.9 — was 302)
        * chapter absent  → HTML overview page (project slide list)
        """
        if chapter is not None:
            file_rel = self._short_file_rel(project, chapter)
            return self._proxy_build_artifact(file_rel)
        return self._serve_project_overview(project)

    def _proxy_build_artifact(self, file_rel: str, slide_n=None):
        """Serve build artifact content as 200 response with <base href> + slide nav.

        Issue236.9 — keeps URL bar short (/p/<P>[/<chapter>]) while serving the
        m2slide deck. Internal relative paths (img/, agenda.html, sibling chapters)
        resolve via <base href="/Projects/<P>/slide/"> — those .html links are then
        caught by _redirect_legacy_html and bounced to /p/<P>/<stem>.

        slide_n (optional): if provided, injects a script to navigate to #/N when
        the browser has not already set a hash. URL hash from the user (preserved
        by browser across our 302) wins.
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
        # base href so relative paths in build HTML still resolve to the build dir
        slide_dir = '/'.join(rel.split('/')[:-1]) + '/'  # e.g. 'Projects/X/slide/'
        base_tag = f'<base href="/{slide_dir}">'
        # Inject base tag immediately after opening <head ...>
        new_content, n_subs = re.subn(
            r'(<head\b[^>]*>)', r'\1' + base_tag, content, count=1, flags=re.IGNORECASE)
        if n_subs:
            content = new_content
        else:
            # head missing — fall back to original content
            pass
        # Optional: navigate to slide N when hash not preset by client
        if slide_n is not None:
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
            '<div><a href="/">🏠 home</a> · <a href="/p/">📂 projects</a> · '
            '<a href="/_dev/">📖 help</a></div></header>'
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
            '<div class="card"><h3><a href="/_dev/">📖 endpoint help</a></h3>'
            '<div class="meta">전체 endpoint 사용법</div>'
            '<div class="links"><a href="/_dev/">/_dev/</a></div></div>'
            f'<div class="card"><h3><a href="/p/{sample}">🔍 sample 슬라이드 목록</a></h3>'
            f'<div class="meta">{sample} 슬라이드 인덱스</div>'
            f'<div class="links"><a href="/p/{sample}">/p/{sample}</a></div></div>'
            '</div>'
            '<h2>주소 체계 (legacy /Projects/... 차단됨 → 404)</h2>'
            '<table><thead><tr><th>URL</th><th>응답</th></tr></thead><tbody>'
            '<tr><td><code>/p/</code></td><td>프로젝트 목록 페이지</td></tr>'
            '<tr><td><code>/p/&lt;P&gt;</code></td><td>프로젝트 슬라이드 목록 (overview)</td></tr>'
            '<tr><td><code>/p/&lt;P&gt;/s/&lt;chap&gt;/&lt;n&gt;</code></td><td>N번째 슬라이드 text (curl 친화)</td></tr>'
            '<tr><td><code>/p/&lt;P&gt;/s/&lt;chap&gt;/&lt;n&gt;?mode=raw</code></td><td>디자인 view (브라우저)</td></tr>'
            '<tr><td><code>/p/&lt;P&gt;/s/&lt;n&gt;</code></td><td>chap=1 자동 (single mode shorthand)</td></tr>'
            '<tr><td><code>/_dev/list/&lt;file&gt;</code></td><td>section JSON·HTML 인덱스</td></tr>'
            '<tr><td><code>/_dev/text/&lt;n&gt;/&lt;file&gt;</code></td><td>plain text section</td></tr>'
            '<tr><td><code>/_dev/raw/&lt;n&gt;/&lt;file&gt;</code></td><td>302 to live #/N</td></tr>'
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
            first_link = f'/p/{p}/s/1/1?mode=raw'
            cards.append(
                f'<div class="card"><h3><a href="{first_link}">{p}</a></h3>'
                f'<div class="meta">{meta_label} · 진입: <code>{entry}</code></div>'
                '<div class="links">'
                f'<a href="/p/{p}">📋 슬라이드 목록</a>'
                f'<a href="{first_link}">🎬 chap 1 slide 1</a>'
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

    def _serve_project_overview(self, project: str):
        """GET /p/<project> — slide list (all .html files + sections)."""
        files = self._list_slide_files(project)
        if not files:
            project_dir = os.path.join(os.getcwd(), 'Projects', project)
            if not os.path.isdir(project_dir):
                self.send_error(404, f'project not found: {project}')
                return
            self.send_error(404, f'no .html in Projects/{project}/slide/ (build first)')
            return
        # If single mode (only index.html + agenda.html), show sections of index.html directly.
        # Otherwise show chapter list + section count per chapter.
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
            # Determine 1-base chapter index for this stem
            chap_idx = self._stem_to_chapter_index(project, stem)
            if chap_idx is None:
                # agenda.html or unmapped (chapter mode index.html which is redirect/cover)
                # — still show file info but skip the slide table to avoid noise
                section = (
                    f'<h3>{stem} '
                    f'<small style="color:#888">(non-deck file · {count} sections)</small></h3>'
                )
                sections_html_blocks.append(section)
                continue
            rows = []
            for i, (s, e) in enumerate(spans):
                sec_html = html[s:e]
                title = extract_section_title(sec_html) or '(no title)'
                one = i + 1
                rows.append(
                    f'<tr><td>{one}</td>'
                    f'<td><a href="/p/{project}/s/{chap_idx}/{one}?mode=raw">{title}</a></td>'
                    f'<td><a href="/p/{project}/s/{chap_idx}/{one}">text</a></td>'
                    f'<td>{e - s}</td></tr>'
                )
            chapter_entry = f'/p/{project}/s/{chap_idx}/1?mode=raw'
            section = (
                f'<h3>chap {chap_idx} — {stem} '
                f'<small style="color:#888">({count} slides · '
                f'<a href="{chapter_entry}">open</a>)</small></h3>'
                '<table><thead><tr><th>n</th><th>title (→ live)</th><th>text</th><th>bytes</th></tr></thead>'
                f'<tbody>{"".join(rows) or "<tr><td colspan=4>no sections</td></tr>"}</tbody></table>'
            )
            sections_html_blocks.append(section)
        body = (
            '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
            f'<title>m2slide — {project}</title>'
            + self._common_styles() +
            '</head><body>'
            + self._common_header(f'📋 {project}') +
            f'<p>files in <code>Projects/{project}/slide/</code>: <b>{len(files)}</b></p>'
            + '\n'.join(sections_html_blocks) +
            '</body></html>'
        )
        self._write_html(body)

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
        nav_html = self._render_indexed_nav(rel, n, total)
        self._write_html(wrap_text_html(rel, n, total, section_html, head_links, nav_html))

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
        nav_html = self._render_indexed_nav(rel, n, total)
        self._write_html(wrap_text_html(rel, n, total, section_html, head_links, nav_html))

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
                # short /p/<P>/s/<chap>/<slide> form (legacy /Projects/... blocked)
                'raw_url': self._file_path_to_short_indexed(rel, one, 'raw')
                           or f'/_dev/raw/{one}/{rel}',
                'text_url': self._file_path_to_short_indexed(rel, one)
                            or f'/_dev/text/{one}/{rel}',
                # live_url = design view (mode=raw) — same target as raw_url here
                'live_url': self._file_path_to_short_indexed(rel, one, 'raw')
                            or f'/{rel.lstrip("/")}#/{one}',
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
            '<h1>m2slide dev-server — endpoints (Issue236)</h1>'
            '<h2>Short form (recommended — shortest URL)</h2>'
            '<pre># N번째 슬라이드 text (single mode — chap=1)\n'
            'curl http://127.0.0.1:9877/p/m2SlideStyle1_single/s/25\n\n'
            '# chapter mode (chap idx 1-base)\n'
            'curl http://127.0.0.1:9877/p/&lt;P&gt;/s/&lt;chap&gt;/&lt;n&gt;\n\n'
            '# 프로젝트 overview (슬라이드 목록 HTML)\n'
            'curl http://127.0.0.1:9877/p/m2SlideStyle1_single\n\n'
            '# 디자인 view (브라우저)\n'
            'open \'http://127.0.0.1:9877/p/m2SlideStyle1_single/s/25?mode=raw\'</pre>'
            '<h2>/_dev/ endpoints (보조 — 별도 .html path 받기)</h2>'
            '<p>모든 <code>n</code>은 <b>1-base</b> (m2slide hashOneBasedIndex — live URL <code>#/N</code>과 동일).</p>'
            '<p><b>주의</b>: <code>/Projects/&lt;P&gt;/slide/...</code> 직접 접근은 차단됨 (404). 짧은 <code>/p/...</code> 형태 사용 권장.</p>'
            '<h2>/_dev/list — section 인덱스</h2>'
            '<p>모든 section 목록 (title + bytes). HTML 기본, JSON <code>?format=json</code> 또는 '
            '<code>Accept: application/json</code>.</p>'
            '<pre>curl -H "Accept: application/json" http://127.0.0.1:9877/p/m2SlideStyle1_single</pre>'
            '<h2>file path 보안</h2>'
            '<p>document root 기준 상대. traversal 차단. <code>.html</code>만 허용.</p>'
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
