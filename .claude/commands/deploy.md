---
name: deploy
description: m2slide 배포 커맨드 — release/docs 두 종류 지원. /deploy release [version]은 VERSION 갱신·CHANGELOG 생성·완료 이슈 z_old 아카이브·git tag·release commit 일괄 수행
date: 2026-05-03
---

# 사용법

```
/deploy release [version]
/deploy docs               # 문서 변경만 commit·push (CHANGELOG·README 등)
```

`version` 미지정 시 `VERSION` 파일 값 사용. 명시 시 VERSION 파일을 먼저 갱신.

# /deploy release 워크플로우

## 1. 사전 검증

* git working tree clean (또는 release-only 변경만 staged)
* `VERSION` 파일 존재 (없으면 `0.1.0`로 초기 생성)
* 사용자 승인 (Opus 4.7 실행 제약 — 파괴적 작업)

## 2. 버전 결정

```bash
TARGET_VERSION="${1:-$(cat VERSION)}"
# 형식 검증: x.y.z
echo "$TARGET_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$' || exit 1
echo "$TARGET_VERSION" > VERSION
```

기존 git tag와 충돌하면 사용자에게 재확인.

## 3. CHANGELOG.md 생성·갱신

`Issue.md`의 `# ✅ 완료` 섹션을 파싱하여 `CHANGELOG.md`에 새 버전 섹션 추가.

```markdown
# Changelog

## [v0.5.0] - 2026-05-03

### Added · Fixed · Changed
- Issue70: 키 네비게이션 통일 — Single ←·Chapter ↑·Chapter ← 챕터 간 (commit: fa43351)
- Issue66: cover 페이지 Reveal.initialize 하드코딩 → slide_ratio 적용 (commit: bffd865)
- ...
```

기존 `CHANGELOG.md` 있으면 최상단(첫 `## [` 이전)에 새 버전 섹션 prepend.

## 4. 완료 이슈 아카이브

`Issue.md`의 `# ✅ 완료` 섹션 전체를 잘라내어 `z_old/old_issue.md`로 이동:

```bash
mkdir -p z_old
# z_old/old_issue.md 없으면 생성, 있으면 새 release 섹션 prepend
```

`z_old/old_issue.md` 형식:

```markdown
# Old Issues

> Issue.md에서 release 시점에 아카이브된 완료 이슈 모음. 시간 역순 (최신 release가 위).

## v0.5.0 (2026-05-03)

[기존 Issue.md의 ✅ 완료 섹션 전체]

## v0.4.0 (이전 release 시점)

...
```

`Issue.md`의 `# ✅ 완료` 섹션은 비워둠 (헤더는 유지).

## 5. Save Point 갱신

`Issue.md` 상단 Save Point에 버전 추가 (가장 위에):

```
* Save Point :
    - v0.5.0 (2026-05-03) — Issue70 (fa43351), Issue66 (bffd865), ...
    - Issue70 (2026-05-03, fa43351)
    ...
```

기존 commit-단위 Save Point는 유지.

## 6. 릴리즈 commit

```bash
git add VERSION CHANGELOG.md z_old/old_issue.md Issue.md
git commit -m "release(v$TARGET_VERSION): ...

- CHANGELOG.md 신규 섹션 추가
- 완료 이슈 z_old/old_issue.md로 아카이브 (N건)
- Save Point에 v$TARGET_VERSION 마킹

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

## 7. git tag

```bash
git tag -a "v$TARGET_VERSION" -m "Release v$TARGET_VERSION"
```

## 8. push (사용자 승인 시)

```bash
# 사용자가 명시적으로 push 지시한 경우만
git push origin main
git push origin "v$TARGET_VERSION"
```

# /deploy docs 워크플로우

문서만 변경한 경우 사용. CHANGELOG·README·_doc_arch 등 코드 외 변경을 한 번에 commit.

```bash
git add CHANGELOG.md README.md $(git ls-files _doc_arch 2>/dev/null)
git commit -m "docs: ..."
```

# 종료 조건

* 모든 staged 파일 commit 완료
* git tag 생성 완료 (release만)
* 다음 단계 안내 (push 여부 등)
* 자동 push 금지 — 사용자 명시 승인 필요

# Opus 4.7 실행 제약

* 사용자 승인 없이 git tag 생성 금지 (한 번 만든 tag는 force-push 외 변경 불가)
* push는 항상 사용자 명시 승인 후
* VERSION 파일 변경 시 기존 git tag와 충돌 검사
