"""prj3#Issue848 — tailnet 원격 접근 게이트 단위 테스트.

tailnet 접근은 `tailscale serve --http=9877 → 127.0.0.1:9877` 프록시로 연다
(_doc_arch/dev-server.md «bind 주소와 tailnet 접근»). 프록시를 거치면 peer 가 늘
127.0.0.1 이라 쓰기 엔드포인트(POST config·feedback·open-config)가 tailnet 전체에
열려 있었다. 프록시가 붙이는 X-Forwarded-For 로 실제 클라이언트를 가려 원격은
허용 대역(기본 tailnet 100.64.0.0/10)의 **읽기(GET·HEAD)만** 받는다.

Run: python3 -m unittest lib/dev-server/test_remote_access.py -v
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
from server import effective_client_ip, parse_allow_nets, client_allowed


class EffectiveClientIpTest(unittest.TestCase):
    def test_direct_loopback_without_xff(self):
        self.assertEqual(effective_client_ip('127.0.0.1', None), '127.0.0.1')

    def test_proxied_by_tailscale_serve(self):
        # 실측 2026-10-02: jma → jm4.tail064437.ts.net:9877 → XFF 100.85.239.86
        self.assertEqual(effective_client_ip('127.0.0.1', '100.85.239.86'), '100.85.239.86')

    def test_xff_chain_takes_first(self):
        self.assertEqual(effective_client_ip('127.0.0.1', '100.85.239.86, 10.0.0.1'),
                         '100.85.239.86')

    def test_xff_from_non_loopback_peer_ignored(self):
        # 프록시가 아닌 원격 peer 의 XFF 는 위조 가능 — peer 주소를 쓴다
        self.assertEqual(effective_client_ip('192.168.0.50', '127.0.0.1'), '192.168.0.50')

    def test_empty_xff(self):
        self.assertEqual(effective_client_ip('127.0.0.1', '  '), '127.0.0.1')


class ClientAllowedTest(unittest.TestCase):
    def setUp(self):
        self.nets = parse_allow_nets('100.64.0.0/10')

    def test_loopback_any_method(self):
        for m in ('GET', 'HEAD', 'POST'):
            self.assertTrue(client_allowed('127.0.0.1', m, self.nets))
        self.assertTrue(client_allowed('::1', 'POST', self.nets))

    def test_tailnet_get_allowed(self):
        self.assertTrue(client_allowed('100.85.239.86', 'GET', self.nets))
        self.assertTrue(client_allowed('100.85.239.86', 'HEAD', self.nets))

    def test_tailnet_post_denied(self):
        self.assertFalse(client_allowed('100.85.239.86', 'POST', self.nets))

    def test_outside_allow_denied(self):
        self.assertFalse(client_allowed('192.168.0.50', 'GET', self.nets))

    def test_ipv4_mapped_ipv6(self):
        self.assertTrue(client_allowed('::ffff:100.85.239.86', 'GET', self.nets))

    def test_garbage_ip_denied(self):
        self.assertFalse(client_allowed('not-an-ip', 'GET', self.nets))

    def test_allow_spec_multi(self):
        nets = parse_allow_nets('100.85.239.86/32, 10.0.0.0/8')
        self.assertTrue(client_allowed('10.1.2.3', 'GET', nets))
        self.assertFalse(client_allowed('100.89.64.1', 'GET', nets))


if __name__ == '__main__':
    unittest.main()
