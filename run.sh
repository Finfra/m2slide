#!/bin/bash
# Usage:
#   ./run.sh [ProjectName]            # 빌드 후 Chrome으로 열기 (default: m2SlideStyle1_single)
#   ./run.sh --lint-config            # 모든 Projects/*/_config.yml의 theme_default_layout 값 검증

export m2slide_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$m2slide_path" || exit 1

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

# 기본 동작: 프로젝트 빌드 + 브라우저 열기
export prj_name="${1:-m2SlideStyle1_single}"
export prj_path=./Projects/$prj_name

rm -rf "$prj_path/slide"
./m2slide.sh "$prj_path"
if [ -f "$prj_path/slide/index.html" ]; then
    open -a "Google Chrome" "$prj_path/slide/index.html"
else
    open -a "Google Chrome" "$prj_path"/slide/*.html
fi
