#!/usr/bin/env python3
"""정책 goal_check 를 산출물(markdown)에 실제로 적용해 위반 잔존을 검출.

`./m2slide.sh --lint-data` 의 산출물 검사(검사 9)를 담당한다. 스키마 검사
(lint-policy-schema.py)가 "룰이 목적을 제대로 기술했는가"를 보는 반면, 본
스크립트는 "그 목적이 실제 산출물에서 지켜졌는가"를 본다. 정책이 켜져 있는데
위반이 남아 있으면 fail-loud 한다.

파일럿 룰: heuristics.yml conversion_mode.md_first_constraints
           .drop_redundant_page_screenshot (goal_type: machine_readable)

판정은 파일명이 아니라 이미지 속성으로 한다. detect_hints 정규식은 후보를
좁히는 힌트일 뿐이며, 힌트에 안 걸려도 아래 속성 판정으로 검출한다 —
`pdf-p\\d+` 만 보던 구 구현이 `sNN_iM.png`·`<Deck>_vNN_N.png` bleed 를 놓친
회귀(AgenticCoding 2026-07-06)가 이 설계의 근거다.

옵트인 범위: `Projects/<Name>/_pipeline/` 이 있는 프로젝트(= ppt2m2slide 역변환
산출물)만 검사한다. 손으로 쓴 덱까지 강제하면 의도적 풀블리드 이미지가 전부
위반으로 잡히기 때문. 덱 용도(purpose)별 완화는 Issue295 소관.

exit 0 = 통과, 1 = 위반 있음. pyyaml 부재 시 0 으로 skip.
"""
import re
import struct
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit(0)

# 슬라이드 기준 픽셀 예산 (m2slide 렌더 1920x1080). 면적 비율의 분모.
PAGE_W, PAGE_H = 1920, 1080
PAGE_AREA = PAGE_W * PAGE_H

# "페이지 모양" 종횡비 후보 — 16:9 / 4:3 / A4 가로 / letter 가로.
# 원본 문서 페이지를 통째로 캡처하면 이 중 하나에 근접한다.
PAGE_ASPECTS = (16 / 9, 4 / 3, 297 / 210, 11 / 8.5)

IMG_RE = re.compile(r"!\[(?P<alt>[^\]]*)\]\((?P<src>[^)\s]+)(?:\s+\"[^\"]*\")?\)")
SLIDE_SEP = re.compile(r"^---\s*$", re.M)


def png_size(data: bytes):
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return struct.unpack(">II", data[16:24])


def jpeg_size(data: bytes):
    if data[:2] != b"\xff\xd8":
        return None
    i = 2
    n = len(data)
    while i < n - 9:
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
            i += 2
            continue
        seg_len = struct.unpack(">H", data[i + 2:i + 4])[0]
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
                      0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            h, w = struct.unpack(">HH", data[i + 5:i + 9])
            return w, h
        i += 2 + seg_len
    return None


def image_size(path: Path):
    try:
        data = path.read_bytes()[:65536]
    except OSError:
        return None
    return png_size(data) or jpeg_size(data)


def near_page_aspect(w: int, h: int, tol: float) -> bool:
    if h == 0:
        return False
    aspect = w / h
    return any(abs(aspect / ref - 1) <= tol for ref in PAGE_ASPECTS)


def load_rule(root: Path):
    """파일럿 룰 로드. 미전환/비활성이면 None."""
    path = root / "data" / "ppt2m2slide" / "heuristics.yml"
    if not path.exists():
        return None
    try:
        cfg = yaml.safe_load(path.read_text()) or {}
    except Exception:
        return None
    rule = (cfg.get("conversion_mode", {})
               .get("md_first_constraints", {})
               .get("drop_redundant_page_screenshot"))
    if not isinstance(rule, dict):          # v1 불리언 형태 = 미전환 → 산출물 검사 skip
        return None
    if not rule.get("enabled", True):
        return None
    if rule.get("confidence") != "high":    # enforce 아닌 룰은 fail-loud 하지 않음
        return None
    return rule


def slide_chunks(text: str):
    """--- 구분자로 슬라이드 단위 분할. (시작 라인 번호, 본문) 반환."""
    positions = [0]
    for m in SLIDE_SEP.finditer(text):
        positions.append(m.end())
    positions.append(len(text))
    for i in range(len(positions) - 1):
        start, end = positions[i], positions[i + 1]
        line_no = text.count("\n", 0, start) + 1
        yield line_no, text[start:end]


def strip_nontext(chunk: str) -> str:
    """이미지·코드펜스·디렉티브를 걷어낸 '재구성 텍스트' 잔여분."""
    body = IMG_RE.sub("", chunk)
    body = re.sub(r"```.*?```", "", body, flags=re.S)
    body = re.sub(r"^\s*#[a-z][a-z0-9-]*\s*$", "", body, flags=re.M)   # #layout-* 등
    body = re.sub(r"^\s*:{3}.*$", "", body, flags=re.M)                 # fenced div
    body = re.sub(r"^\s*#{1,6}\s.*$", "", body, flags=re.M)             # 제목은 본문 아님
    return body.strip()


def check_project(proj: Path, rule: dict):
    gc = rule.get("goal_check", {}) or {}
    sole_only = bool(gc.get("sole_image_in_slide", True))
    tol = float(gc.get("aspect_ratio_near_page", 0.05))
    min_w = int(gc.get("min_pixel_width", 800))
    need_sibling = bool(gc.get("require_sibling_text", True))
    alt_signal = bool(gc.get("empty_alt_is_signal", True))

    md_files = sorted(proj.glob("markdown/*.md")) + sorted(proj.glob("*.md"))
    violations = []
    for md in md_files:
        if md.name.upper() == "AGENDA.MD":
            continue
        try:
            text = md.read_text()
        except OSError:
            continue
        for line_no, chunk in slide_chunks(text):
            refs = list(IMG_RE.finditer(chunk))
            if not refs:
                continue
            has_text = bool(strip_nontext(chunk))
            if need_sibling and not has_text:
                continue                     # 재구성 실패 슬라이드 = keep_when 보존 대상
            if sole_only and len(refs) > 1:
                continue                     # 이미지 여러 장 = 전면 점유 아님
            for m in refs:
                src = m.group("src")
                if src.startswith(("http://", "https://", "data:")):
                    continue
                img = (proj / src.lstrip("./")).resolve()
                if not img.exists():
                    img = (md.parent / src).resolve()
                if not img.exists():
                    continue
                size = image_size(img)
                if not size:
                    continue
                w, h = size
                if w < min_w:
                    continue                 # 아이콘·썸네일
                if not near_page_aspect(w, h, tol):
                    continue
                if alt_signal and m.group("alt").strip():
                    continue                 # 의미 있는 alt = 설명 목적 이미지로 간주
                violations.append(
                    f"{md.relative_to(proj.parent.parent)}:~{line_no}: "
                    f"{src} ({w}x{h}, 종횡비 {w / h:.3f} 페이지 근접, 슬라이드 유일 이미지, alt 빈값) "
                    "— 재구성 텍스트가 있는 슬라이드에 통짜 페이지 래스터 잔존"
                )
    return violations


# ── hygiene: 렌더 노출 텍스트 위생 (Issue296) ──────────────────────────────
# md-builder slide_text_hygiene_policy — 청중에게 보이는 텍스트(제목·bullet·표셀)에
# 내부 추적 표기(이슈 번호·TODO·FIXME)가 남으면 위반. 코드블록 예제 내부는 예외.
# drop_redundant 와 달리 전 덱 공통(옵트인 아님) — 내부 표기 노출은 어느 덱이든 결함.

def load_hygiene_rule(root: Path):
    path = root / "data" / "md-builder" / "styles.yml"
    if not path.exists():
        return None
    try:
        cfg = yaml.safe_load(path.read_text()) or {}
    except Exception:
        return None
    rule = cfg.get("slide_text_hygiene_policy")
    if not isinstance(rule, dict) or rule.get("confidence") != "high":
        return None
    pat = (rule.get("goal_check") or {}).get("text_pattern_absent")
    if not pat:
        return None
    try:
        return re.compile(pat)
    except re.error:
        return None


HEADING_RE = re.compile(r"^\s*#{1,6}\s+(.*)$")


def _heading_lines(text: str):
    """코드블록 밖 마크다운 제목(H1~H6) 라인. (라인번호, 제목텍스트).

    enforce 대상을 제목으로 한정한다. 본문 bullet·단락의 이슈 번호는 덱 콘텐츠
    (도구 데모 등)일 수 있어 문맥 의존이므로 기계 enforce 에서 제외 — 원 학습
    사례(m2Slide_single_mode 챕터 제목에 (Issue229) 노출)는 제목 실수였다.
    bullet·단락 검사는 md-builder agent 가 scope 서술로 참고한다(비-enforce).
    """
    in_code = False
    for i, line in enumerate(text.splitlines(), 1):
        if line.lstrip().startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        m = HEADING_RE.match(line)
        if m and not m.group(1).lstrip().startswith("layout-"):
            yield i, m.group(1)


# 슬라이드 소스가 아닌 파이프라인 부산물 — 위생 검사 제외
_HYGIENE_SKIP = {"info.md", "readme.md", "credits.md"}


def check_hygiene(proj: Path, pattern):
    md_files = sorted(proj.glob("markdown/*.md")) + sorted(proj.glob("*.md"))
    violations = []
    for md in md_files:
        if md.name.upper() == "AGENDA.MD" or md.name.lower() in _HYGIENE_SKIP:
            continue
        try:
            text = md.read_text()
        except OSError:
            continue
        for line_no, heading in _heading_lines(text):
            m = pattern.search(heading)
            if m:
                violations.append(
                    f"{md.relative_to(proj.parent.parent)}:{line_no}: "
                    f"슬라이드 제목에 내부 추적 표기 '{m.group(0)}' 잔존"
                )
    return violations


def main():
    args = sys.argv[1:]
    root = Path(args[0]) if args else Path.cwd()

    if len(args) > 1:
        explicit = [Path(a).resolve() for a in args[1:]]
    else:
        explicit = None

    failed = False

    # ── 검사 1: drop_redundant_page_screenshot (이미지, _pipeline 옵트인) ──
    rule = load_rule(root)
    if rule is None:
        print("ℹ️ drop_redundant_page_screenshot 미전환/비활성 — 이미지 검사 skip")
    else:
        projects = explicit or [p.parent for p in sorted(root.glob("Projects/*/_pipeline"))]
        if not projects:
            print("ℹ️ _pipeline 보유 프로젝트 없음 — 이미지 검사 대상 0")
        else:
            v = []
            for proj in projects:
                v.extend(check_project(proj, rule))
            print(f"ℹ️ 통짜 래스터 검사 {len(projects)}개 프로젝트 (ppt2m2slide 역변환 옵트인)")
            if v:
                for x in v:
                    print(f"❌ {x}", file=sys.stderr)
                failed = True
            else:
                print("✅ 통짜 페이지 래스터 잔재 0건 (goal_check 속성 판정)")

    # ── 검사 2: slide_text_hygiene_policy (텍스트, 전 덱 공통) ──
    hy = load_hygiene_rule(root)
    if hy is None:
        print("ℹ️ slide_text_hygiene_policy 미전환/비활성 — 텍스트 위생 검사 skip")
    else:
        hy_projects = explicit or sorted(
            p for p in root.glob("Projects/*") if p.is_dir() and p.name != "z_done"
        )
        v = []
        for proj in hy_projects:
            v.extend(check_hygiene(proj, hy))
        print(f"ℹ️ 텍스트 위생 검사 {len(hy_projects)}개 프로젝트")
        if v:
            for x in v:
                print(f"❌ {x}", file=sys.stderr)
            failed = True
        else:
            print("✅ 렌더 노출 텍스트 내부 추적 표기 0건")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
