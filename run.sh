#!/bin/bash
# Usage:
#   ./run.sh [ProjectName]            # 빌드 후 Chrome으로 열기 (default: m2SlideStyle1_single)
#   ./run.sh --lint-config            # 모든 Projects/*/_config.yml의 theme_default_layout 값 검증
#   ./run.sh --lint-layouts           # 모든 theme/*/layouts/*.html @meta frontmatter 검증

export m2slide_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$m2slide_path" || exit 1

# --lint-layouts: 모든 theme HTML layout 파일의 @meta frontmatter 검증 (Issue154)
if [ "${1:-}" = "--lint-layouts" ]; then
    node lib/lint-layouts.js
    exit $?
fi

# --lint-config: 모든 프로젝트의 theme_default_layout 값을 스캔하여 미존재 layout 검출
if [ "${1:-}" = "--lint-config" ]; then
    echo "🔍 lint-config: 모든 프로젝트 _config.yml의 theme_default_layout 검증"
    echo ""

    # 사용 가능한 layout 수집 (theme/default/ + theme/{name}/ 모두)
    declare -a available_layouts
    for theme_dir in theme/*/layouts; do
        [ -d "$theme_dir" ] || continue
        for f in "$theme_dir"/*.html; do
            [ -f "$f" ] || continue
            base=$(basename "$f" .html)
            available_layouts+=("$base")
            # underscore 제거 alias도 추가
            if [[ "$base" == _* ]]; then
                available_layouts+=("${base#_}")
            fi
        done
    done

    # 중복 제거
    unique_layouts=$(printf '%s\n' "${available_layouts[@]}" | sort -u)

    error_count=0
    while IFS= read -r config; do
        layout=$(grep -E '^[[:space:]]*theme_default_layout:[[:space:]]*' "$config" 2>/dev/null | head -1 | sed -E 's/^[[:space:]]*theme_default_layout:[[:space:]]*([^# ]+).*/\1/' | tr -d '"' | tr -d "'")
        [ -z "$layout" ] && continue

        # 사용 가능한 layout 목록에 있는지 검사
        if echo "$unique_layouts" | grep -qx "$layout"; then
            echo "✓ $config → theme_default_layout: $layout"
        else
            echo "✗ $config → theme_default_layout: $layout (미존재)"
            error_count=$((error_count + 1))
        fi
    done < <(find Projects -maxdepth 2 -name "_config.yml" -type f)

    echo ""
    if [ "$error_count" -gt 0 ]; then
        echo "❌ $error_count 건의 미존재 layout 발견. 사용 가능 layout:"
        echo "$unique_layouts" | sed 's/^/  - /'
        exit 1
    else
        echo "✅ 모든 _config.yml의 theme_default_layout 정상"
        exit 0
    fi
fi

# --serve: 빌드 후 HTTP 서버 자동 띄우고 그 URL을 Chrome으로 open (file:// fetch 차단 우회)
#   model3d 인라인 빌드가 default 이므로 일반 케이스는 불필요.
#   대용량 GLB (inline_max_kb 초과) 또는 폰트·CDN 정밀 검증 시 사용.
#   사용: ./run.sh <Project> --serve [--port N]
_serve_mode=false
_serve_port=8765
_args=()
for a in "$@"; do
    case "$a" in
        --serve) _serve_mode=true ;;
        --port=*) _serve_port="${a#--port=}" ;;
        *) _args+=("$a") ;;
    esac
done
set -- "${_args[@]}"

# 기본 동작: 프로젝트 빌드 + 브라우저 열기
_arg="${1:-m2SlideStyle1_single}"
# 인자 형태별 분기:
#   1) 절대 경로 (/...)           → 그대로 사용 (lib/m2slide 외부 프로젝트 지원)
#   2) Projects/* 또는 ./Projects/* → 상대 경로 그대로 사용
#   3) 그 외 단순 이름            → ./Projects/<name> 으로 해석
if [[ "$_arg" == /* ]]; then
    if [ ! -d "$_arg" ]; then
        echo "❌ Error: Absolute path does not exist: $_arg" >&2
        exit 1
    fi
    export prj_path="$_arg"
    prj_name="$(basename "$_arg")"
    export prj_name
elif [[ "$_arg" == Projects/* || "$_arg" == ./Projects/* ]]; then
    export prj_path="./${_arg#./}"
    export prj_name="${_arg#./}"
    export prj_name="${prj_name#Projects/}"
else
    export prj_name="$_arg"
    export prj_path=./Projects/$prj_name
fi

rm -rf "$prj_path/slide"
# kroki SVG 캐시는 lib/kroki/(source-of-truth)에 보관되므로 slide/ 삭제 후에도 영향 없음.
# 빌드 시 lib/markdown.js의 fetchKrokiSvgCached가 자동으로 lib/kroki/ → slide/kroki/ 복사함.
./m2slide.sh "$prj_path"

if $_serve_mode; then
    # 포트 충돌 시 +1씩 증가 (최대 10회)
    for _i in $(seq 0 9); do
        _try_port=$((_serve_port + _i))
        if ! lsof -i:$_try_port >/dev/null 2>&1; then
            _serve_port=$_try_port
            break
        fi
    done
    cd "$prj_path/slide" || exit 1
    python3 -m http.server "$_serve_port" > "/tmp/m2slide_run_${_serve_port}.log" 2>&1 &
    _SERVER_PID=$!
    sleep 0.5
    echo "🌐 HTTP server started (PID $_SERVER_PID, port $_serve_port). Stop: kill $_SERVER_PID"
    open -a "Google Chrome" "http://127.0.0.1:$_serve_port/index.html"
elif [ -f "$prj_path/slide/index.html" ]; then
    open -a "Google Chrome" "$prj_path/slide/index.html"
else
    open -a "Google Chrome" "$prj_path"/slide/*.html
fi
