"""Unit tests for dev-server short URL routing (Issue240+).

Run: python3 -m unittest lib/dev-server/test_server.py -v
"""
import unittest
import re
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from server import DevHandler


class RegexTest(unittest.TestCase):
    def test_short_cover_c_matches(self):
        self.assertIsNotNone(DevHandler._SHORT_COVER_C_RE.match('/p/m2Slide/s/c'))
        self.assertIsNotNone(DevHandler._SHORT_COVER_C_RE.match('/p/m2Slide/s/c/'))

    def test_short_agenda_a_matches(self):
        self.assertIsNotNone(DevHandler._SHORT_AGENDA_A_RE.match('/p/m2Slide/s/a'))
        self.assertIsNotNone(DevHandler._SHORT_AGENDA_A_RE.match('/p/m2Slide/s/a/'))

    def test_short_toc_t_matches(self):
        self.assertIsNotNone(DevHandler._SHORT_TOC_T_RE.match('/p/m2Slide/s/t'))
        self.assertIsNotNone(DevHandler._SHORT_TOC_T_RE.match('/p/m2Slide/s/t/'))

    def test_c_a_t_do_not_match_slide_numeric(self):
        # /p/<P>/s/<chap>/<slide> 와 충돌 없음
        self.assertIsNone(DevHandler._SHORT_COVER_C_RE.match('/p/m2Slide/s/1/3'))
        self.assertIsNone(DevHandler._SHORT_AGENDA_A_RE.match('/p/m2Slide/s/1'))


class ActivationTest(unittest.TestCase):
    """판정 헬퍼 테스트 — 임시 디렉토리에 가짜 프로젝트 구조 생성."""

    @classmethod
    def setUpClass(cls):
        import tempfile
        cls.tmp = tempfile.mkdtemp(prefix='m2slide-test-')
        cls.old_cwd = os.getcwd()
        os.chdir(cls.tmp)
        # 가짜 chapter mode 프로젝트
        slide_dir = os.path.join('Projects', 'fakeChap', 'slide')
        os.makedirs(slide_dir)
        for f in ('index.html', 'agenda.html', '01-intro.html', '02-body.html'):
            with open(os.path.join(slide_dir, f), 'w') as fh:
                fh.write('<html></html>')
        with open(os.path.join('Projects', 'fakeChap', '_config.yml'), 'w') as fh:
            fh.write('cover_enabled: true\ntoc_placeholder: true\n')
        # 가짜 single mode 프로젝트 (cover off, toc off)
        slide_dir2 = os.path.join('Projects', 'fakeSingle', 'slide')
        os.makedirs(slide_dir2)
        with open(os.path.join(slide_dir2, 'index.html'), 'w') as fh:
            fh.write('<html></html>')
        with open(os.path.join('Projects', 'fakeSingle', '_config.yml'), 'w') as fh:
            fh.write('cover_enabled: false\ntoc_placeholder: false\n')

    @classmethod
    def tearDownClass(cls):
        import shutil
        os.chdir(cls.old_cwd)
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def _h(self):
        """Bare DevHandler instance for method invocation (no socket)."""
        h = DevHandler.__new__(DevHandler)
        return h

    def test_chapter_mode_cover_always_active(self):
        self.assertTrue(self._h()._cover_active('fakeChap'))

    def test_single_mode_cover_respects_config(self):
        self.assertFalse(self._h()._cover_active('fakeSingle'))

    def test_agenda_active_by_file_existence(self):
        self.assertTrue(self._h()._agenda_active('fakeChap'))
        self.assertFalse(self._h()._agenda_active('fakeSingle'))

    def test_toc_active_default_true(self):
        self.assertTrue(self._h()._toc_active('fakeChap'))
        self.assertFalse(self._h()._toc_active('fakeSingle'))


class FallbackRedirectTest(unittest.TestCase):
    """fallback chain (c→a→t→1/1) + legacy 302 검증. server를 실제 띄우지 않고
    _redirect_302 호출 시 send_response/header가 호출되는지 mock으로 확인."""

    def test_redirect_302_helper_sends_correct_response(self):
        h = DevHandler.__new__(DevHandler)
        calls = {'status': None, 'headers': [], 'end': False}
        h.send_response = lambda s: calls.__setitem__('status', s)
        h.send_header = lambda k, v: calls['headers'].append((k, v))
        h.end_headers = lambda: calls.__setitem__('end', True)
        h._redirect_302('/p/foo/s/a')
        self.assertEqual(calls['status'], 302)
        self.assertIn(('Location', '/p/foo/s/a'), calls['headers'])
        self.assertIn(('Content-Length', '0'), calls['headers'])
        self.assertTrue(calls['end'])


class StemRewriteTest(unittest.TestCase):
    def _h(self):
        return DevHandler.__new__(DevHandler)

    def test_index_stem_to_cover(self):
        # index.html (cover entry) → /s/c (was /s/)
        self.assertEqual(
            self._h()._stem_to_short_path('m2Slide', 'index'),
            '/p/m2Slide/s/c'
        )

    def test_agenda_stem_to_agenda_short(self):
        # agenda.html → /s/a (was /p/<P>/agenda)
        self.assertEqual(
            self._h()._stem_to_short_path('m2Slide', 'agenda'),
            '/p/m2Slide/s/a'
        )

    def test_chapter_stem_unchanged(self):
        # 01-intro.html → /p/<P>/01-intro (불변)
        self.assertEqual(
            self._h()._stem_to_short_path('m2Slide', '01-intro'),
            '/p/m2Slide/01-intro'
        )


class ScriptProtectTest(unittest.TestCase):
    """`<script>` 블록 안 JS regex literal·string 보호 (Issue241)."""

    def _h(self):
        return DevHandler.__new__(DevHandler)

    def test_script_block_regex_literal_untouched(self):
        html = (
            '<html><body>'
            '<a href="foo.png">img</a>'
            '<script>const m = "x".match(/href="([^"]+)"/);</script>'
            '</body></html>'
        )
        out = self._h()._rewrite_relative_assets(html, 'm2Slide')
        # Outside script: foo.png rewritten
        self.assertIn('href="/p/m2Slide/s/foo.png"', out)
        # Inside script: regex literal preserved (no /p/m2Slide/s/ injected)
        self.assertIn('match(/href="([^"]+)"/)', out)
        self.assertNotIn('match(/href="/p/m2Slide/s/', out)

    def test_multiple_script_blocks_protected(self):
        html = (
            '<img src="a.png">'
            '<script>var r = /href="([^"]+)"/;</script>'
            '<img src="b.png">'
            '<script>var s = /src="([^"]+)"/;</script>'
            '<img src="c.png">'
        )
        out = self._h()._rewrite_relative_assets(html, 'P')
        # All 3 image srcs rewritten
        self.assertIn('src="/p/P/s/a.png"', out)
        self.assertIn('src="/p/P/s/b.png"', out)
        self.assertIn('src="/p/P/s/c.png"', out)
        # Both script regex literals intact
        self.assertIn('var r = /href="([^"]+)"/;', out)
        self.assertIn('var s = /src="([^"]+)"/;', out)


class SoloSliceTest(unittest.TestCase):
    """Issue248 — solo mode body slice + matching </div> finder."""

    def _h(self):
        return DevHandler.__new__(DevHandler)

    def test_find_matching_div_close_basic(self):
        html = '<div class="slides"><section>A</section></div>tail'
        # body starts right after opening tag
        body_start = html.index('>') + 1
        close = self._h()._find_matching_div_close(html, body_start)
        # close should point at the </div> opening '<'
        self.assertEqual(html[close:close + 6], '</div>')

    def test_find_matching_div_close_nested(self):
        html = (
            '<div class="slides">'
            '<section><div>inner</div></section>'
            '<section><div><div>x</div></div></section>'
            '</div>tail'
        )
        body_start = html.index('class="slides">') + len('class="slides">')
        close = self._h()._find_matching_div_close(html, body_start)
        # the final </div> after second section, before "tail"
        self.assertEqual(html[close:close + 6], '</div>')
        self.assertTrue(html[close + 6:].startswith('tail'))

    def test_find_matching_div_close_imbalanced(self):
        html = '<div class="slides"><section>A</section>'  # no close
        body_start = html.index('>') + 1
        self.assertEqual(self._h()._find_matching_div_close(html, body_start), -1)


if __name__ == '__main__':
    unittest.main()
