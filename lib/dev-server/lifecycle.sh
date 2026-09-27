#!/bin/bash
# m2slide dev-server lifecycle — Issue235
#
# Functions: dev_server_start / stop / status / restart
# Idempotent — multiple start calls are safe.
# SSOT: lib/m2slide/_doc_arch/dev-server.md

# Resolve repo root (the directory containing m2slide.sh)
_DEV_SERVER_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEV_SERVER_ROOT="$(cd "$_DEV_SERVER_SCRIPT_DIR/../.." && pwd)"
DEV_SERVER_PY="$_DEV_SERVER_SCRIPT_DIR/server.py"
DEV_SERVER_PORT="${DEV_SERVER_PORT:-9877}"
DEV_SERVER_BIND="${DEV_SERVER_BIND:-127.0.0.1}"
DEV_SERVER_PID_FILE="$DEV_SERVER_ROOT/_doc_work/.dev-server.pid"
DEV_SERVER_LOG_FILE="$DEV_SERVER_ROOT/_doc_work/.dev-server.log"

# 빌드 뒤 안내할 URL — **dev-server 가 실제로 서빙하는 형태**로 낸다 (Issue418)
#   구 안내는 `/<상대경로>/slide/index.html` 이었다. 그 legacy 경로는 Issue236.11 에서 404 로
#   막혔으므로 저장소 안 프로젝트도 열리지 않았고, 외부 경로는 `//Users/...` 가 되었다.
#     Projects/<이름> 이 이 프로젝트를 가리킨다(심링크 포함 — `--link`·Projects.md `경로` 열)
#         → http://<bind>:<port>/p/<이름>/n/c   (deck 진입 — 표지부터)
#     그 밖 (저장소 밖 절대경로 빌드)
#         → file://<프로젝트>/slide/index.html (dev-server 는 등록 안 된 경로를 모른다)
# 인자: $1 프로젝트 dir  $2 m2slide 루트(기본 DEV_SERVER_ROOT)
dev_server_project_url() {
  local proj="$1" root="${2:-$DEV_SERVER_ROOT}" name real cand
  proj="$(cd "$proj" 2>/dev/null && pwd)" || { echo "file://$1/slide/index.html"; return 0; }
  name="$(basename "$proj")"
  real="$(cd "$proj" && pwd -P)"
  if [ -d "$root/Projects/$name" ]; then
    cand="$(cd "$root/Projects/$name" && pwd -P)"
    if [ "$cand" = "$real" ]; then
      echo "http://${DEV_SERVER_BIND}:${DEV_SERVER_PORT}/p/${name}/n/c"
      return 0
    fi
  fi
  echo "file://${proj}/slide/index.html"
}

_dev_server_alive() {
  local pid="$1"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

_dev_server_read_pid() {
  [ -f "$DEV_SERVER_PID_FILE" ] && cat "$DEV_SERVER_PID_FILE" 2>/dev/null
}

_dev_server_port_in_use() {
  # Return 0 if port is in use, 1 otherwise (no external lsof dependency assumed)
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$DEV_SERVER_PORT" -sTCP:LISTEN -n -P 2>/dev/null | grep -q LISTEN
  else
    # Fallback — try connecting with bash /dev/tcp
    (echo >/dev/tcp/127.0.0.1/"$DEV_SERVER_PORT") 2>/dev/null
  fi
}

# pid alive만으로는 실제 서비스 여부를 보증하지 않는다 — process는 남아 있는데
# HTTP 포트는 죽은 좀비 상태(2026-08-31 실측: pid alive, curl connection refused)가
# 존재한다. healthy = alive AND 포트가 실제로 LISTEN 중.
_dev_server_healthy() {
  local pid="$1"
  _dev_server_alive "$pid" && _dev_server_port_in_use
}

_dev_server_kill_pid() {
  local pid="$1"
  kill "$pid" 2>/dev/null
  local i=0
  while [ $i -lt 20 ] && _dev_server_alive "$pid"; do
    sleep 0.1
    i=$((i + 1))
  done
  if _dev_server_alive "$pid"; then
    kill -9 "$pid" 2>/dev/null
  fi
}

dev_server_start() {
  mkdir -p "$(dirname "$DEV_SERVER_PID_FILE")"

  local pid
  pid=$(_dev_server_read_pid)

  if _dev_server_healthy "$pid"; then
    echo "  ℹ️  dev-server already running (pid $pid) — http://$DEV_SERVER_BIND:$DEV_SERVER_PORT/"
    return 0
  fi

  # pid는 살아 있는데 포트가 죽은 좀비 — 정리 후 재기동으로 자동 치유
  if _dev_server_alive "$pid"; then
    echo "  ⚠️  dev-server pid $pid alive but not listening on $DEV_SERVER_PORT (zombie). Killing and restarting."
    _dev_server_kill_pid "$pid"
  fi

  # Stale pid — clean up
  if [ -n "$pid" ]; then
    rm -f "$DEV_SERVER_PID_FILE"
  fi

  if _dev_server_port_in_use; then
    echo "  ❌ dev-server: port $DEV_SERVER_PORT is already in use by another process" >&2
    echo "     stop the conflicting process or override DEV_SERVER_PORT" >&2
    return 1
  fi

  # Launch in background
  nohup python3 "$DEV_SERVER_PY" \
    --root "$DEV_SERVER_ROOT" \
    --port "$DEV_SERVER_PORT" \
    --bind "$DEV_SERVER_BIND" \
    >"$DEV_SERVER_LOG_FILE" 2>&1 &

  local new_pid=$!
  echo "$new_pid" > "$DEV_SERVER_PID_FILE"

  # Wait briefly and verify
  sleep 0.3
  if _dev_server_alive "$new_pid"; then
    echo "  ✅ dev-server started (pid $new_pid) — http://$DEV_SERVER_BIND:$DEV_SERVER_PORT/"
    return 0
  else
    echo "  ❌ dev-server failed to start — see $DEV_SERVER_LOG_FILE" >&2
    rm -f "$DEV_SERVER_PID_FILE"
    return 1
  fi
}

dev_server_stop() {
  local pid
  pid=$(_dev_server_read_pid)

  if ! _dev_server_alive "$pid"; then
    [ -f "$DEV_SERVER_PID_FILE" ] && rm -f "$DEV_SERVER_PID_FILE"
    echo "  ℹ️  dev-server not running"
    return 0
  fi

  _dev_server_kill_pid "$pid"

  rm -f "$DEV_SERVER_PID_FILE"
  echo "  ✅ dev-server stopped (pid $pid)"
}

dev_server_status() {
  local pid
  pid=$(_dev_server_read_pid)

  if _dev_server_healthy "$pid"; then
    echo "  ✅ dev-server running (pid $pid) — http://$DEV_SERVER_BIND:$DEV_SERVER_PORT/"
    return 0
  fi

  if _dev_server_alive "$pid"; then
    echo "  ⚠️  dev-server pid $pid alive but NOT responding on port $DEV_SERVER_PORT (zombie) — run '--serve restart'" >&2
    return 2
  fi

  if [ -n "$pid" ]; then
    echo "  ⚠️  dev-server stale pid file ($pid not alive). Cleaning up."
    rm -f "$DEV_SERVER_PID_FILE"
  fi

  echo "  ℹ️  dev-server not running"
  return 1
}

dev_server_restart() {
  dev_server_stop
  dev_server_start
}
