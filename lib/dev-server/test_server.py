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


if __name__ == '__main__':
    unittest.main()
