#!/usr/bin/env python3
"""data/<stage>/*.yml 의 goal-oriented 정책 룰(schema_version: 2) 검증.

`./m2slide.sh --lint-data` 의 검사 4~8 을 담당한다. 스키마 정의 SSOT 는
`_doc_arch/policy-goal-schema.md` 이며, 본 파일의 GOAL_CHECK_FAMILIES 가
"goal_type 별 허용 술어" 의 실행 SSOT 다 (문서와 동기화 의무).

전환 단위는 파일이 아니라 룰이다. schema_version 2 파일이라도 goal_type 을
선언한 룰만 검사하고, 미전환 룰은 정보 라인으로만 보고한다 — 전환이 끝날
때까지 lint 를 못 돌리게 되면 도입 자체가 막히기 때문.

exit 0 = 통과, 1 = 위반 있음, 2 = 실행 불가(pyyaml 부재 등은 0 으로 skip).
"""
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    # 기존 --lint-data 다른 검사와 동일하게 pyyaml 없으면 조용히 skip
    sys.exit(0)

# goal_type enum (닫힌 집합) → 허용 술어(goal_check 키) 목록.
# _doc_arch/policy-goal-schema.md "goal_type enum (7종 — 확정)" 표와 동기화 의무.
GOAL_CHECK_FAMILIES = {
    "fidelity": {
        "text_node_count_min", "text_chars_min", "text_ratio_min",
        "source_text_coverage_min",
        "markup_tokens_wrapped",       # 마크업 토큰이 backtick/코드블록 밖에 노출되지 않음
    },
    "machine_readable": {
        "sole_image_in_slide", "aspect_ratio_near_page", "min_pixel_width",
        "require_sibling_text", "empty_alt_is_signal", "require_alt",
        "raster_count_max",
    },
    "intent_guard": {
        "require_flag", "require_config_key", "require_user_confirmation",
        "forbid_auto_promotion",
    },
    "consistency": {
        "palette_match", "style_tag_match", "font_family_match", "tone_match",
    },
    "legibility": {
        "chars_max", "items_max", "font_size_min", "box_overflow_max",
        "lines_max",
        "no_empty_bullet_li",          # 파서 충돌로 빈 <li> 가 생기지 않음
    },
    "attribution": {
        "require_badge", "require_credits_entry", "require_source_url",
        "inherit_from_source",
    },
    "hygiene": {
        "residual_count_max", "forbid_empty_slot", "forbid_placeholder",
        "text_pattern_absent",         # 렌더 텍스트에 특정 패턴(내부추적 표기 등) 잔존 금지
        "h1_not_duplicate_title",      # 본문 H1 이 frontmatter title·상위 제목과 중복 아님
        "note_not_echo_body",          # 발표 노트가 슬라이드 본문을 그대로 복사하지 않음
    },
}

VALID_CONFIDENCE = ("low", "medium", "high")
ENFORCE_LEVELS = ("high",)          # enforce = goal_check 필수
EVIDENCE_REQUIRED = ("medium", "high")


def walk_rules(node, path=()):
    """dict 트리를 순회하며 'goal_type' 을 가진 매핑을 (경로, 룰) 로 반환."""
    if isinstance(node, dict):
        if "goal_type" in node:
            yield path, node
            return                   # 룰 내부는 더 내려가지 않음
        for key, value in node.items():
            yield from walk_rules(value, path + (str(key),))
    elif isinstance(node, list):
        for idx, value in enumerate(node):
            yield from walk_rules(value, path + (f"[{idx}]",))


def count_legacy_flags(node, path=()):
    """미전환 후보(불리언 true 플래그)를 세어 전환 진척을 가늠."""
    total = 0
    if isinstance(node, dict):
        if "goal_type" in node:
            return 0
        for key, value in node.items():
            if isinstance(value, bool) and value:
                total += 1
            else:
                total += count_legacy_flags(value, path + (str(key),))
    elif isinstance(node, list):
        for value in node:
            total += count_legacy_flags(value, path)
    return total


def lint_file(path: Path):
    """단일 yml 검사. (errors, migrated_count, legacy_count) 반환."""
    errors = []
    try:
        with path.open() as fh:
            cfg = yaml.safe_load(fh) or {}
    except Exception as exc:                        # 파싱은 검사 1 이 이미 잡음
        return [f"{path}: 파싱 실패 — {exc}"], 0, 0

    if not isinstance(cfg, dict):
        return [], 0, 0

    # 검사 대상 판정은 파일 버전이 아니라 goal_type 룰 존재로 한다 (Issue296).
    # schema_version:2 뿐 아니라 version:2 파일(md-builder 등)에 goal 룰을 넣어도,
    # 심지어 버전 필드가 없어도 goal_type 을 선언한 순간 v2 규율을 받는다.
    # count_legacy_flags 는 버전 필드가 2 일 때만 전환 진척 지표로 보고한다.
    rule_list = list(walk_rules(cfg))
    versioned = cfg.get("schema_version") == 2 or cfg.get("version") == 2
    if not rule_list:
        return [], 0, 0                             # goal 룰 없음 → 검사 4~8 대상 아님

    migrated = 0
    for rule_path, rule in rule_list:
        migrated += 1
        rid = f"{path}:{'.'.join(rule_path)}"
        goal_type = rule.get("goal_type")
        goal_check = rule.get("goal_check")
        detect_hints = rule.get("detect_hints")
        confidence = rule.get("confidence", "low")

        # 검사 4 — goal_type enum 유효성
        if goal_type not in GOAL_CHECK_FAMILIES:
            errors.append(
                f"{rid}: goal_type={goal_type!r} 은 미등록 값 "
                f"(허용: {', '.join(sorted(GOAL_CHECK_FAMILIES))})"
            )
            continue                                # 계열 검사 불가 → 이후 skip

        # goal 서술 존재 (사람용 — 목적 상실 방지)
        if not str(rule.get("goal") or "").strip():
            errors.append(f"{rid}: goal(목표 서술) 누락 — 룰이 무엇을 보장하는지 기술 필요")

        # confidence 값 유효성
        if confidence not in VALID_CONFIDENCE:
            errors.append(
                f"{rid}: confidence={confidence!r} (허용: {', '.join(VALID_CONFIDENCE)})"
            )

        # 검사 5 — enforce 룰의 goal_check 유무
        if confidence in ENFORCE_LEVELS and not goal_check:
            errors.append(
                f"{rid}: confidence={confidence} (enforce) 인데 goal_check 부재 "
                "— 정규식만으로는 목적 판정 불가 (사례 A 재발 경로)"
            )

        # 검사 7 — detect_hints 단독 판정 금지
        if detect_hints and not goal_check:
            errors.append(
                f"{rid}: detect_hints 만 있고 goal_check 없음 "
                "— 힌트는 후보 축소용이며 단독 판정 금지"
            )

        # 검사 6 — goal_type ↔ goal_check 계열 정합성
        if isinstance(goal_check, dict):
            allowed = GOAL_CHECK_FAMILIES[goal_type]
            unknown = sorted(set(goal_check) - allowed)
            if unknown:
                errors.append(
                    f"{rid}: goal_type={goal_type} 계열에 없는 술어 {unknown} "
                    f"(허용: {sorted(allowed)})"
                )
        elif goal_check is not None:
            errors.append(f"{rid}: goal_check 는 매핑이어야 함 (현재 {type(goal_check).__name__})")

        # 검사 8 — evidence 유무
        if confidence in EVIDENCE_REQUIRED:
            evidence = rule.get("evidence")
            if not evidence:
                errors.append(
                    f"{rid}: confidence={confidence} 인데 evidence 부재 "
                    "— 근거 사례 1건으로 승격되는 것을 막기 위한 필수 필드 (사례 C)"
                )
            elif not isinstance(evidence, list):
                errors.append(f"{rid}: evidence 는 리스트여야 함")
            else:
                for i, ev in enumerate(evidence):
                    if not isinstance(ev, dict) or not ev.get("project"):
                        errors.append(f"{rid}: evidence[{i}] 에 project 필드 필요")

    legacy = count_legacy_flags(cfg) if versioned else 0
    return errors, migrated, legacy


# ── L2 프로젝트 override 병합 검사 (Issue297) ──────────────────────────────
# cascade 설계: _doc_arch/pipeline-policy-cascade.md
# L1(data/<stage>/*.yml) 위에 L2(Projects/<N>/_pipeline/policy/<stage>.yml)를
# deep-merge 한 결과가 goal 스키마 규율을 지키는지 검사한다. 각 축(cascade·goal)은
# 개별 검증되나 병합 결과는 아무도 검증하지 않던 사각지대를 메운다.

def deep_merge(base, override):
    """override 를 base 위에 깊은 병합 (프로젝트 우선). dict 만 재귀, 그 외는 교체."""
    if not isinstance(base, dict) or not isinstance(override, dict):
        return override
    out = dict(base)
    for k, v in override.items():
        out[k] = deep_merge(base.get(k), v) if k in base else v
    return out


def _rules_by_path(cfg):
    """schema_version 2 파일의 goal_type 룰을 {경로: 룰} 로."""
    if not isinstance(cfg, dict) or cfg.get("schema_version") != 2:
        return {}
    return {path: rule for path, rule in walk_rules(cfg)}


def lint_l2_overrides(root: Path):
    """Projects/*/_pipeline/policy/<stage>.yml 이 L1 goal 룰을 덮을 때 정합성 검사.

    deep-merge 시맨틱상 L2 는 키를 추가/교체만 할 수 있고 제거는 못 한다
    (제거는 `null` 명시 교체로만 가능). 따라서 검출 대상은:
    - L2 가 goal_type 자체 변경 → 실패 (룰 정체성 훼손)
    - L2 가 goal_check 를 null/비-dict 로 교체 → 실패 (판정 무력화)
    - L2 가 goal_check 에 계열 밖 술어 추가 → 실패 (검사 6 재적용)
    - L2 가 goal_type 을 비-goal 값으로 덮어 룰 소멸 → 실패

    반환: (errors, checked_pairs)
    """
    errors = []
    checked = 0

    l2_files = sorted(root.glob("Projects/*/_pipeline/policy/*.yml"))
    for l2_path in l2_files:
        stage = l2_path.stem                    # note-writer.yml → note-writer
        l1_dir = root / "data" / stage
        if not l1_dir.is_dir():
            continue                            # 대응 L1 stage 없음 (feedback inbox 등)

        # L1 = data/<stage>/ 하위 모든 yml 을 deep-merge 한 stage 네임스페이스
        l1_cfg = {}
        for l1_yml in sorted(l1_dir.glob("*.yml")):
            if "_backup" in l1_yml.parts:
                continue
            try:
                part = yaml.safe_load(l1_yml.read_text()) or {}
            except Exception:
                continue
            if isinstance(part, dict):
                l1_cfg = deep_merge(l1_cfg, part)

        l1_rules = _rules_by_path(l1_cfg)
        if not l1_rules:
            continue                            # 이 stage 에 goal 룰 없음 → 병합 검사 무의미

        try:
            l2_cfg = yaml.safe_load(l2_path.read_text()) or {}
        except Exception:
            continue
        if not isinstance(l2_cfg, dict):
            continue

        merged = deep_merge(l1_cfg, l2_cfg)
        merged_rules = _rules_by_path(merged)

        for path, l1_rule in l1_rules.items():
            checked += 1
            rid = f"{l2_path.relative_to(root)}:{'.'.join(path)}"
            m_rule = merged_rules.get(path)
            if m_rule is None:
                # 병합 후 goal_type 이 사라짐 = L2 가 룰을 비-goal 값으로 덮음
                errors.append(f"{rid}: L2 가 goal 룰을 goal_type 없는 값으로 덮어씀 (판정 소멸)")
                continue

            # goal_type 정체성 변경 금지
            if m_rule.get("goal_type") != l1_rule.get("goal_type"):
                errors.append(
                    f"{rid}: L2 가 goal_type 변경 "
                    f"({l1_rule.get('goal_type')} → {m_rule.get('goal_type')}) — 룰 정체성 훼손 금지"
                )

            l1_gc = l1_rule.get("goal_check")
            m_gc = m_rule.get("goal_check")
            # goal_check 를 null/비-dict 로 교체 = 판정 무력화 (deep-merge 로 키 제거는 불가)
            if isinstance(l1_gc, dict) and l1_gc and not (isinstance(m_gc, dict) and m_gc):
                errors.append(f"{rid}: L2 가 goal_check 를 삭제/무력화 (null 또는 비-매핑 교체)")

            # 병합 결과에 스키마 검사 4·6 재적용
            gt = m_rule.get("goal_type")
            if gt not in GOAL_CHECK_FAMILIES:
                errors.append(f"{rid}: 병합 결과 goal_type={gt!r} 미등록")
            elif isinstance(m_gc, dict):
                unknown = sorted(set(m_gc) - GOAL_CHECK_FAMILIES[gt])
                if unknown:
                    errors.append(
                        f"{rid}: 병합 결과 goal_type={gt} 계열 밖 술어 {unknown}"
                    )

    return errors, checked


def main():
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    targets = sorted(
        p for p in root.glob("data/*/*.yml")
        if "_backup" not in p.parts
    )

    all_errors = []
    total_migrated = 0
    v2_files = []
    for path in targets:
        errors, migrated, legacy = lint_file(path)
        all_errors.extend(errors)
        if migrated or errors:
            total_migrated += migrated
            v2_files.append((path.relative_to(root), migrated, legacy))

    for rel, migrated, legacy in v2_files:
        print(f"ℹ️ {rel}: goal-oriented 룰 {migrated}개 전환됨 / 미전환 플래그 후보 {legacy}개")

    # L2 프로젝트 override 병합 검사 (Issue297)
    l2_errors, l2_checked = lint_l2_overrides(root)
    all_errors.extend(l2_errors)
    if l2_checked:
        print(f"ℹ️ L2 override 병합 검사 — goal 룰 {l2_checked}쌍 대조")

    if all_errors:
        for err in all_errors:
            print(f"❌ {err}", file=sys.stderr)
        return 1

    if total_migrated == 0:
        print("ℹ️ schema_version 2 goal-oriented 룰 없음 — skip")
    else:
        print(f"✅ goal-oriented 룰 {total_migrated}개 스키마 검사 통과")
    return 0


if __name__ == "__main__":
    sys.exit(main())
