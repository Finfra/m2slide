#!/usr/bin/env bash
# backup-data-yml.sh — data/<stage>/*.yml 자동 backup 도구 (Issue247 Phase D)
#
# promote-to-data.py merge 액션 또는 사용자가 직접 yml 편집 전 호출하여
# 원본을 _backup/ 폴더에 timestamp prefix로 복사. 머지 회귀 시 되돌리기 가능.
#
# 사용:
#   ./lib/tuner/backup-data-yml.sh <yml_path>
#   ./lib/tuner/backup-data-yml.sh data/slide-tuner/patterns.yml
#   ./lib/tuner/backup-data-yml.sh data/md-builder/styles.yml
#
# 출력: <data 폴더>/_backup/<YYYYMMDD-HHMMSS>-<원본명>.yml
# Exit: 0 정상, 1 입력 없음/파일 부재, 2 backup 디렉토리 생성 실패

set -euo pipefail

if [[ $# -lt 1 ]]; then
    echo "usage: $0 <yml_path>" >&2
    echo "  ex) $0 data/slide-tuner/patterns.yml" >&2
    exit 1
fi

YML_PATH="$1"
if [[ ! -f "$YML_PATH" ]]; then
    echo "error: 파일 없음 — $YML_PATH" >&2
    exit 1
fi

YML_DIR="$(dirname "$YML_PATH")"
YML_NAME="$(basename "$YML_PATH")"
BACKUP_DIR="$YML_DIR/_backup"

if ! mkdir -p "$BACKUP_DIR"; then
    echo "error: backup 디렉토리 생성 실패 — $BACKUP_DIR" >&2
    exit 2
fi

TS="$(date +%Y%m%d-%H%M%S)"
DEST="$BACKUP_DIR/${TS}-${YML_NAME}"

cp -p "$YML_PATH" "$DEST"
echo "✅ backup: $DEST"

# 최근 30개 초과 시 오래된 backup 자동 삭제 (회전)
KEEP=30
COUNT="$(find "$BACKUP_DIR" -maxdepth 1 -name "*-${YML_NAME}" -type f | wc -l | tr -d ' ')"
if [[ "$COUNT" -gt "$KEEP" ]]; then
    REMOVE="$((COUNT - KEEP))"
    # 오래된 순서대로 REMOVE개 삭제 (find -print0 + sort + head)
    find "$BACKUP_DIR" -maxdepth 1 -name "*-${YML_NAME}" -type f -print0 \
        | sort -z \
        | head -z -n "$REMOVE" \
        | xargs -0 rm -f
    echo "ℹ️ 오래된 backup ${REMOVE}건 자동 삭제 (보유 상한 ${KEEP})"
fi
