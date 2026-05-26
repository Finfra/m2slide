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


if __name__ == '__main__':
    unittest.main()
