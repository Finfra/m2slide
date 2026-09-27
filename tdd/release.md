---
title: m2slide 배포 재생목록
description: prj42 m2slide 의 공개 저장소 태그 출고(GitHub clone)·GitHub Pages 덱 배포 검증 목록 (prj3#Issue717)
date: 2026.09.27
evidence_dir: tdd/evidence
gate: pre-tag
r2: warn
env: jm4
---

# 무엇을 지키나

태그(`v{VER}`)로 출고된 `github.com/Finfra/m2slide` 를 깨끗이 clone 한 사용자가 같은 원고에서 HTML·PDF·pptx 를 뽑을 수 있고, GitHub Pages(`docs/`) 배포본이 열리는지 지킨다

* 브랜치 모델: `main` + 태그(`/deploy release` 가 VERSION·CHANGELOG·`git tag`). `release/*` 없음(`feat/*`·`fix/*` 는 기능 브랜치) → R1 은 태그 대상 커밋
* Pages 는 태그와 별개로 `/deploy-docs` 가 main 에 push 한다 — 그 push 도 출고이므로 R2 대상이다

# 재생목록

| #   | id                        | 채널         | 목표                                                                                                                        | 근거                                                                                                      | 실행                                                              | 상태      |
| :-- | :------------------------ | :----------- | :-------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------- | :-------- |
| 1   | `dev-playlist-green`      | —            | 개발 재생목록(`tdd/playlist.md`) 전 행 통과                                                                                 | `tdd/playlist.md`                                                                                         | `tdd/playlist.md` 기존 러너                                       | ⬜ 미실행 |
| 2   | `clean-clone-html-build`  | GitHub 소스  | 태그 대상 커밋을 임시 폴더에 clean clone → `./m2slide.sh Projects/aTest` 가 exit 0 이고 `slide/index.html` 이 생성된다      | `README.md` Usage 1 · `_doc_arch/scar-portability.md` (standalone clone 자족)                             | `./m2slide.sh Projects/aTest`                                     | ⬜ 미실행 |
| 3   | `clean-clone-pdf-pptx`    | GitHub 소스  | 같은 clean clone 에서 `--pdf`·`--pptx` 산출물이 페이지 수·비율 검사와 HTML↔pptx 내용 동등 검사를 통과한다                   | `tdd/playlist.md` #3·#7 · `z_test/pdf/1.integrity.sh` · `z_test/ig-ppt/3.parity.sh`                       | `bash z_test/pdf/1.integrity.sh ; bash z_test/ig-ppt/3.parity.sh` | ⬜ 미실행 |
| 4   | `clone-no-local-leak`     | GitHub 소스  | clean clone 산출물·빌드 로그에 jm4 절대경로(`/Users/nowage`) 참조나 미추적 자산 누락 오류가 0건이다                         | `.claude/rules/repo-tracking-rules.md` (CLAUDE.md 색인) · `scar-portability.md` 오프라인 self-containment | —                                                                 | ⬜ 신규   |
| 5   | `version-tag-consistency` | GitHub 소스  | `VERSION` 값 = 태그 `v{VER}` = `CHANGELOG.md` 최상단 릴리스 절 버전                                                         | `.claude/commands/deploy.md` 2단계 버전 결정                                                              | —                                                                 | ⬜ 신규   |
| 6   | `pages-deck-served`       | GitHub Pages | `/deploy-docs` 후 `https://finfra.github.io/m2slide/` 의 해당 덱 카드와 `docs/{project}/index.html` 이 HTTP 200 으로 열린다 | `README.md` GitHub Pages Deployment · `.claude/commands/deploy-docs.md` · `lib/deploy.sh`                 | —                                                                 | ⬜ 신규   |

# 증거

* 경로: `tdd/evidence/v{VER}/release-test_{VER}.md` (frontmatter `evidence_dir`) (`VER` = 루트 `VERSION`)
* frontmatter `version·commit·dirty·result·env·date` + `| # | id | 결과 | 비고 |` 표 — 형식 SSOT 는 `~/.claude/_doc_arch/rules-ondemand/release-test-rules.md` "증거 형식"
* `_doc_work/` 가 이 repo 에서 gitignore 라 증거를 추적 경로 `tdd/evidence/` 에 둔다 — R3(릴리스 커밋에 싣기) 가능
* ⚠️ `dirty: yes` 는 근거 불인정 — 이 저장소는 작업트리가 상시 dirty 하므로 R1 은 **clean clone** 에서 돈다(#2~#4)

# 규약

* 각 행의 목표는 **검증 가능한 성질**이다 — *"잘 설치된다"* 가 아니라 종료 코드·파일 존재·HTTP 상태로 판정한다
* 행을 건너뛴 실행은 `result: partial` 로 기록한다 — `pass` 로 쓰지 않는다
* 실패를 삼키지 않는다(`2>/dev/null || true` 금지) — 실패는 실패로 증거에 남긴다
