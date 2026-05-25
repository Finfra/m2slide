#!/usr/bin/env python3
"""m2slide dev-server — Issue235

localhost-only static HTTP server for m2slide build artifacts.
Document root = m2slide project root (passed via --root).
Bound to 127.0.0.1 only.

SSOT: lib/m2slide/_doc_arch/dev-server.md
"""

import argparse
import os
import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler


class QuietHandler(SimpleHTTPRequestHandler):
    """Reduce log noise — log to stderr only on errors."""

    def log_message(self, format, *args):
        # Only log errors (4xx/5xx) to keep log file small
        try:
            code = int(args[1]) if len(args) > 1 else 0
            if code >= 400:
                sys.stderr.write("%s - - [%s] %s\n" % (
                    self.address_string(), self.log_date_time_string(), format % args))
        except (ValueError, IndexError):
            pass


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
    server = ThreadingHTTPServer((args.bind, args.port), QuietHandler)
    sys.stderr.write("m2slide dev-server listening on http://%s:%d/ root=%s\n" % (
        args.bind, args.port, root))
    sys.stderr.flush()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        sys.stderr.write("\nshutting down\n")
        server.shutdown()


if __name__ == "__main__":
    main()
