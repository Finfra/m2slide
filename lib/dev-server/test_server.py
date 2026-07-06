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
        # Issue248 follow-up: index.html → /n/c (deck nav, was /s/c)
        self.assertEqual(
            self._h()._stem_to_short_path('m2Slide', 'index'),
            '/p/m2Slide/n/c'
        )

    def test_agenda_stem_to_agenda_short(self):
        # Issue248 follow-up: agenda.html → /n/a (deck nav, was /s/a)
        self.assertEqual(
            self._h()._stem_to_short_path('m2Slide', 'agenda'),
            '/p/m2Slide/n/a'
        )

    def test_chapter_stem_unchanged(self):
        # 01-intro.html → /p/<P>/01-intro (불변)
        self.assertEqual(
            self._h()._stem_to_short_path('m2Slide', '01-intro'),
            '/p/m2Slide/01-intro'
        )


class SubChapterNavRewriteTest(unittest.TestCase):
    """서브챕터(01.1 등 번호에 dot 포함) nav 링크 rewrite 회귀 방지.
    stem char class 가 dot 을 불허하면 NEXT_CHAPTER JS 리터럴이 rewrite 안 되어
    /n/ deck nav 에서 다음 서브챕터로 넘어가지 못함(404)."""

    def _h(self):
        return DevHandler.__new__(DevHandler)

    def test_nav_html_re_matches_dotted_stem(self):
        m = DevHandler._NAV_HTML_RE.search("'01.1-fpm-vs-plain-claude.html?fwd=1'")
        self.assertIsNotNone(m)
        self.assertEqual(m.group(2), '01.1-fpm-vs-plain-claude')
        self.assertEqual(m.group(3), '?fwd=1')

    def test_nav_html_re_matches_plain_stem(self):
        m = DevHandler._NAV_HTML_RE.search("'02-hub-mode.html'")
        self.assertIsNotNone(m)
        self.assertEqual(m.group(2), '02-hub-mode')

    def test_escaped_re_matches_dotted_stem(self):
        m = DevHandler._NAV_HTML_ESCAPED_RE.search('\\"05.2-sshf-remote.html\\"')
        self.assertIsNotNone(m)
        self.assertEqual(m.group(2), '05.2-sshf-remote')


class ChapterNavVarRewriteTest(unittest.TestCase):
    """chapter-nav JS 변수는 hash 주입 없이 bare short-path 로 rewrite (Issue242 follow-up).
    `#/1` 을 주입하면 런타임 `VAR + '?last=1&back=1'` 가 `.../n/N/1#/1?last=1&back=1` 가 되어
    (1) 첫 슬라이드(toc)로 가고 (2) query 가 hash 뒤로 밀려 ?last/?back/?fwd 무력화."""

    def test_re_matches_prev_chapter_var(self):
        m = DevHandler._NAV_CHAPTER_VAR_RE.search(
            "var PREV_CHAPTER = '01.1-fpm-vs-plain-claude.html'")
        self.assertIsNotNone(m)
        self.assertEqual(m.group(3), '01.1-fpm-vs-plain-claude')

    def test_re_matches_all_nav_var_names(self):
        for name in ('PREV_CHAPTER', 'NEXT_CHAPTER', 'PREV_SIBLING_CHAPTER',
                     'NEXT_SIBLING_CHAPTER', 'LAST_CHAPTER', 'COVER_LAST_CHAPTER',
                     'AGENDA_LAST_CHAPTER'):
            m = DevHandler._NAV_CHAPTER_VAR_RE.search(f"var {name} = '02-hub-mode.html'")
            self.assertIsNotNone(m, f'{name} should match')
            self.assertEqual(m.group(3), '02-hub-mode')

    def test_re_skips_empty_value(self):
        # 첫 챕터의 빈 PREV_CHAPTER 는 미매칭 → '' 그대로 보존
        m = DevHandler._NAV_CHAPTER_VAR_RE.search("var PREV_CHAPTER = ''")
        self.assertIsNone(m)

    def test_re_skips_already_rewritten(self):
        # 이미 /p/ short-path 로 치환된 값은 재매칭 금지 (negative lookahead)
        m = DevHandler._NAV_CHAPTER_VAR_RE.search(
            "var PREV_CHAPTER = '/p/fPmIntro/n/1/1'")
        self.assertIsNone(m)

    def test_re_does_not_capture_trailing_hash(self):
        # bare 변수는 hash 없이 선언됨 — capture 는 stem 만 (hash 미포함 확인)
        m = DevHandler._NAV_CHAPTER_VAR_RE.search("var NEXT_CHAPTER = '03-dashboard.html'")
        self.assertIsNotNone(m)
        self.assertEqual(m.group(4), "'")  # 종료 quote — hash 없음


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


class NavRouteRegexTest(unittest.TestCase):
    """Issue248 follow-up — /n/ path regex matching."""

    def test_nav_chap_slide_digit(self):
        m = DevHandler._SHORT_NAV_CHAP_RE.match('/p/X/n/1/3')
        self.assertIsNotNone(m)
        self.assertEqual(m.group(1), 'X')
        self.assertEqual(m.group(2), '1')
        self.assertEqual(m.group(3), '3')

    def test_nav_chap_slide_id(self):
        m = DevHandler._SHORT_NAV_CHAP_RE.match('/p/X/n/1/toc-placeholder')
        self.assertIsNotNone(m)
        self.assertEqual(m.group(3), 'toc-placeholder')

    def test_nav_chap_only(self):
        m = DevHandler._SHORT_NAV_CHAPONLY_RE.match('/p/X/n/2')
        self.assertIsNotNone(m)
        self.assertEqual(m.group(2), '2')

    def test_nav_named_c_a_t(self):
        self.assertIsNotNone(DevHandler._SHORT_NAV_C_RE.match('/p/X/n/c'))
        self.assertIsNotNone(DevHandler._SHORT_NAV_A_RE.match('/p/X/n/a'))
        self.assertIsNotNone(DevHandler._SHORT_NAV_T_RE.match('/p/X/n/t'))

    def test_nav_slide_token_excludes_digits_only_chapter(self):
        # /p/X/n/1 should NOT match _SHORT_NAV_CHAP_RE (only 2 segments after /n/)
        self.assertIsNone(DevHandler._SHORT_NAV_CHAP_RE.match('/p/X/n/1'))


class FeedbackPostTest(unittest.TestCase):
    """Issue261 — POST /p/<P>/feedback 저장·policy 분기·에러 처리."""

    @classmethod
    def setUpClass(cls):
        import tempfile
        cls.tmp = tempfile.mkdtemp(prefix='m2slide-fbtest-')
        cls.old_cwd = os.getcwd()
        os.chdir(cls.tmp)
        os.makedirs(os.path.join('Projects', 'fbProj', 'slide'))

    @classmethod
    def tearDownClass(cls):
        import shutil
        os.chdir(cls.old_cwd)
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def _post(self, project, body_bytes, content_length=None):
        """Bare handler로 _handle_feedback_post 호출. (status, payload) 반환.
        send_error 호출 시 payload=None, _write_json 호출 시 dict."""
        import io
        h = DevHandler.__new__(DevHandler)
        result = {'status': None, 'json': None}
        h.headers = {'Content-Length': str(
            len(body_bytes) if content_length is None else content_length)}
        h.rfile = io.BytesIO(body_bytes)
        h.send_error = lambda code, msg=None: result.update(status=code)
        h._write_json = lambda obj, status=200: result.update(status=status, json=obj)
        h._handle_feedback_post(project)
        return result['status'], result['json']

    def _read_jsonl(self):
        import json as _json
        p = os.path.join('Projects', 'fbProj', '_pipeline', 'feedback',
                         'dev-feedback.jsonl')
        if not os.path.isfile(p):
            return []
        with open(p, encoding='utf-8') as fh:
            return [_json.loads(ln) for ln in fh if ln.strip()]

    def _policy_yml(self):
        p = os.path.join('Projects', 'fbProj', '_pipeline', 'policy',
                         '_dev-feedback.yml')
        return open(p, encoding='utf-8').read() if os.path.isfile(p) else ''

    def test_normal_post_appends_jsonl(self):
        import json as _json
        body = _json.dumps({'items': [
            {'chap': 1, 'slide': 3, 'title': 'T', 'opinion': '의견1', 'policy': False},
        ]}).encode('utf-8')
        before = len(self._read_jsonl())
        status, payload = self._post('fbProj', body)
        self.assertEqual(status, 200)
        self.assertEqual(payload['saved'], 1)
        self.assertEqual(payload['policy_saved'], 0)
        recs = self._read_jsonl()
        self.assertEqual(len(recs), before + 1)
        self.assertEqual(recs[-1]['opinion'], '의견1')
        self.assertFalse(recs[-1]['policy'])
        self.assertIn('ts', recs[-1])

    def test_policy_true_appends_pending_yml(self):
        import json as _json
        body = _json.dumps({'items': [
            {'chap': 2, 'slide': 1, 'opinion': '정책 의견', 'policy': True},
            {'chap': 2, 'slide': 2, 'opinion': '일반 의견', 'policy': False},
        ]}).encode('utf-8')
        status, payload = self._post('fbProj', body)
        self.assertEqual(status, 200)
        self.assertEqual(payload['saved'], 2)
        self.assertEqual(payload['policy_saved'], 1)
        yml = self._policy_yml()
        self.assertIn('pending:', yml)
        self.assertIn('"정책 의견"', yml)
        self.assertNotIn('"일반 의견"', yml)
        self.assertIn('stage: null', yml)

    def test_empty_opinion_skipped(self):
        import json as _json
        body = _json.dumps({'items': [
            {'chap': 1, 'slide': 1, 'opinion': '   ', 'policy': True},
        ]}).encode('utf-8')
        status, payload = self._post('fbProj', body)
        self.assertEqual(status, 200)
        self.assertEqual(payload['saved'], 0)
        self.assertEqual(payload['policy_saved'], 0)

    def test_invalid_json_400(self):
        status, _ = self._post('fbProj', b'not-json{')
        self.assertEqual(status, 400)

    def test_missing_items_400(self):
        status, _ = self._post('fbProj', b'{"foo": 1}')
        self.assertEqual(status, 400)

    def test_oversize_body_413(self):
        status, _ = self._post('fbProj', b'{}',
                               content_length=DevHandler._FEEDBACK_MAX_BODY + 1)
        self.assertEqual(status, 413)

    def test_unknown_project_404(self):
        status, _ = self._post('noSuchProj', b'{"items":[]}')
        self.assertEqual(status, 404)

    def test_traversal_project_404(self):
        status, _ = self._post('..', b'{"items":[]}')
        self.assertEqual(status, 404)

    def test_post_route_regex(self):
        self.assertIsNotNone(
            DevHandler._FEEDBACK_POST_RE.match('/p/m2Slide/feedback'))
        self.assertIsNotNone(
            DevHandler._FEEDBACK_POST_RE.match('/p/m2Slide/feedback/'))
        self.assertIsNone(
            DevHandler._FEEDBACK_POST_RE.match('/p/m2Slide/s/1/1'))


class PendingFeedbackCountTest(unittest.TestCase):
    """Issue264 — _pending_feedback_count (개요 커맨드 박스 미처리 건수)."""

    @classmethod
    def setUpClass(cls):
        import tempfile
        cls.tmp = tempfile.mkdtemp(prefix='m2slide-fbcnt-')
        cls.old_cwd = os.getcwd()
        os.chdir(cls.tmp)
        os.makedirs(os.path.join('Projects', 'cntProj', '_pipeline', 'feedback'))

    @classmethod
    def tearDownClass(cls):
        import shutil
        os.chdir(cls.old_cwd)
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def _handler(self):
        return DevHandler.__new__(DevHandler)

    def _jsonl_path(self):
        return os.path.join('Projects', 'cntProj', '_pipeline', 'feedback',
                            'dev-feedback.jsonl')

    def test_missing_file_zero(self):
        self.assertEqual(self._handler()._pending_feedback_count('noProj'), 0)

    def test_counts_nonempty_lines(self):
        with open(self._jsonl_path(), 'w', encoding='utf-8') as fh:
            fh.write('{"a":1}\n\n{"b":2}\n')
        self.assertEqual(
            self._handler()._pending_feedback_count('cntProj'), 2)

    def test_empty_file_zero(self):
        with open(self._jsonl_path(), 'w', encoding='utf-8') as fh:
            fh.write('')
        self.assertEqual(
            self._handler()._pending_feedback_count('cntProj'), 0)


if __name__ == '__main__':
    unittest.main()
