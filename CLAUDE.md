---
name: CLAUDE
description: "Claude Code 가 이 저장소에서 작업할 때 참고하는 가이드"
date: 2026.09.03

# ── L1 아이덴티티 (Issue472) ──────────────────────────────────────────
# 스키마 정본: prj6 ~/_git/___oracle/_doc_arch/project-identity-scheme.md
# ⚠️ 빈 필드는 추측으로 채우지 말 것 — 틀린 값은 빈 값보다 나쁘다
prj: 42
identity: 마크다운 원고를 Reveal.js 웹 슬라이드로 바꾸는 변환기 (외부 의존 없는 순수 Node.js)
not: 프레젠테이션 편집기가 아니다 — 원고가 SSOT 이고 슬라이드는 생성물이다
goal_parent: 빠른_강의_자료_생성
lifetime: perpetual
outcome: 강의 자료 한 벌을 원고에서 슬라이드까지 손대지 않고 뽑는가
status: active
---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

> 🧭 **아이덴티티 L2 — 불변 조항**: [`_doc_arch/m2slide-identity.md`](_doc_arch/m2slide-identity.md) (Issue338).
> *"이 기능이 이 제품의 일부인가"* 를 다투게 되면 그 문서의 조항 4개로 판정한다 — 원고 SSOT · 파일 하나 배포 · 외부 의존 0 · 파생 형식이 웹을 좁히지 않음.

마크다운 기반 프레젠테이션 자료 생성 도구. `Projects/<Name>/` 독립 폴더마다 강연 자료를 관리하며 Reveal.js·Markmap 인터랙티브 HTML 을 생성한다.

* 기술 스택: **Reveal.js 5.0.4** · **Markmap** · **Node.js**(`generate-slides.js` — 표준 라이브러리만, 외부 dependencies 없음) · Pandoc(선택, PowerPoint)
* 모드: **chapter mode**(`markdown/AGENDA.md` + 챕터 파일) · **single mode**(`<Name>.md` 하나)
* 아키텍처·변환 프로세스·파일명·Theme/Layout·네비게이션·구현 상세 → [m2slide-reference.md](.claude/rules-ondemand/m2slide-reference.md)

## ⚠️ CSS 수정 시 주의사항 (generate-slides.js)

Reveal.js 는 자체 레이아웃으로 슬라이드를 중앙 정렬한다. 핵심 레이아웃 속성을 바꾸면 **제목이 사라지거나 슬라이드가 깨진다**.

❌ **위험한 CSS 속성** (Reveal.js 레이아웃 파괴):
- `display` 값 변경(`display: flex` 등) · `height: 100%` 또는 고정 height
- `position` · `transform`/`translate` · `justify-content`/`align-items` 등 flex/grid 레이아웃
- `.reveal .slides` 컨테이너 자체 수정

```css
/* 이런 코드는 제목을 날려버립니다! */
.reveal .slides { height: 100vh !important; }            /* ❌ 컨테이너 건드림 */
.reveal .slides section {
  display: flex !important;                               /* ❌ 레이아웃 파괴 */
  height: 100% !important;                                /* ❌ 높이 강제 */
  justify-content: flex-start !important;                 /* ❌ 제목 소실 */
}
```

✅ **안전한 CSS 속성**: `overflow`(-x/-y) · `padding`·`margin` · `max-height`·`max-width`(height·width 는 금지) · `font-size`·`color`·`background` · `border`·`box-shadow`

```css
/* 스크롤 추가는 이 방식으로만 */
.reveal .slides section,
.reveal .slides section.present,
.reveal .slides section.past,
.reveal .slides section.future {
  overflow-y: auto !important;
  max-height: 100vh !important;
  padding: 20px 60px !important;
  box-sizing: border-box !important;
}
```

**수정 후 확인 필수**: ① 첫 슬라이드(`#/0`) 제목 표시 ② 다음 슬라이드(`#/1`·`#/2`) 제목 표시 ③ 모든 슬라이드 스크롤 작동 ④ 창 크기 변경 시 레이아웃 유지. 문제 발생 시 즉시 원복하고 안전한 속성만 사용할 것.

## 🛑 base.css 수정 가드 (필독)

`lib/css/base.css` 는 모든 theme·layout 이 공유하는 **최하단 기반 스타일 SSOT** — 변경이 모든 프로젝트에 동시에 번진다.

1. **수정 전 사용자 컨펌 필수** — 컨펌 없이 즉시 수정 금지. theme `slide.css`·layout 단위 CSS 로 우회 가능한지 먼저 검토하고, 컨펌 시 변경 사유·범위·대안 검토 결과를 함께 제시
2. **최소 수정 원칙** — 우선순위 theme `slide.css` > layout 단위 CSS > base.css. 특정 theme/layout 전용 스타일은 base.css 추가 금지. 진짜 모든 프로젝트 공통 기반(Reveal.js 핵심 레이아웃 보정 등)만
3. **수정 후 대표 프로젝트 빌드·확인** — `./m2slide.sh m2Slide_single_mode` · `m2Slide_chapter_mode` · `layoutTest` + 위 «수정 후 확인 필수» 4항목. 회귀 발견 시 즉시 원복

트리거: 사용자가 base.css 수정 요청 · 다른 작업 중 base.css 수정 필요성 발견 · Issue·plan 에 base.css 변경 포함 — 셋 중 하나라도 해당하면 발동.

## 주요 작업 명령어

| 목적       | 명령                                                                                                                                                                                |
| :--------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTML 빌드  | `./m2slide.sh <Name>` (인자 없으면 도움말) · `node generate-slides.js Projects/<Name>`                                                                                              |
| EPUB       | `./m2slide.sh <Name> --epub` · `node generate-epub.js Projects/<Name>`                                                                                                              |
| PowerPoint | `./m2slide.sh <Name> --pptx` · `--ppt-make [--ig]` — ⚠️ **pandoc 직접 호출 금지**(Issue315). 배선·lane·검증은 [pptx-rules.md](.claude/rules-ondemand/pptx-rules.md) 를 **먼저 Read** |
| dev-server | `./m2slide.sh --serve start\|stop\|status\|restart` (port 9877, 빌드 시 자동 시동)                                                                                                  |
| lint       | `--lint-deployment` · `--lint-license` · `--lint-data` · `--lint-config` · `--lint-layouts`                                                                                         |

* 출력: `Projects/<Name>/slide/*.html`(+ `index.html` Markmap 목차) · `Projects/<Name>/<Name>.epub` · `Projects/<Name>/slide/<Name>.pptx`
* 캡처·스크린샷은 **`_doc_work/capture/` 에만** 저장 — 루트 저장 금지([capture-output-rules](.claude/rules/capture-output-rules.md))
* 프로젝트 폴더명은 무버전, 버전은 `Projects/<Name>/VERSION` · z_done 이동 시 `<Name>_v<VERSION>` 복원([project-version-rules](.claude/rules/project-version-rules.md))
* 재생성 가능한 중간 산출물 폴더(`_pipeline/` 류)를 새로 만들면 **그 자리에서** 루트 `.gitignore` 에 추가([repo-tracking-rules](.claude/rules/repo-tracking-rules.md))

## Claude Code 규칙 — 로드 방식 (Issue429)

> **상시**는 매 세션 주입된다. **`paths:`** 는 frontmatter 의 파일 패턴을 Claude 가 읽거나 고칠 때만 로드된다(실측 2026-10-01: 시작 컨텍스트에서 빠짐). **읽는 시점** 은 `.claude/rules-ondemand/` 에 있어 해당 작업 진입 시 **직접 Read** 한다.

| 규칙                                                                 | 로드                                      | 트리거 · 내용                                                                                                      |
| :------------------------------------------------------------------- | :---------------------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| `apply-verify-rules`                                                 | 상시                                      | 코드·템플릿·CSS·콘텐츠 수정 후 빌드 → HTML 검증 → 결과 링크. 검증 채널·lane·PDF 회귀는 상세편                      |
| `data-access-rules`                                                  | 상시                                      | 파이프라인 단계 SCAR 의 `data/<stage>/` 접근 격리 표. backup·커밋 규율·schema lint 는 상세편                       |
| `identifier-meta-rules`                                              | 상시                                      | instructor_name 등 식별자 메타 자동 채움 금지 · 로마자 → 한글 역변환 금지                                          |
| `md-m2slide-rules`                                                   | `paths:` `Projects/**/*.md`               | m2slide 마크다운 작성 규칙(글로벌 `md-slide-rules` 기반 확장)                                                      |
| `release-date-rules`                                                 | `paths:` `Projects/**/*.md`               | 슬라이드 소스 수정 시 frontmatter `release_date` 갱신                                                              |
| `file-deployment-rules`                                              | `paths:` 산출물 생성 코드·템플릿          | 단일 `.html` + `img/` 로 `file://` 동작 · server-only 금지                                                         |
| `config-sync-rules`                                                  | `paths:` 설정 파서·GUI·`_config*.yml`     | 설정 키 변경 시 4곳 동기화                                                                                         |
| `issue-rules`                                                        | `paths:` `Issue.md`                       | m2slide 이슈 규칙(`IssueNN:` 콜론 표기 · 카테고리 · GitHub 연동)                                                                  |
| `capture-output-rules`                                               | `paths:` `_doc_work/capture/**`           | 캡처 경로 의무 상세(핵심 한 줄은 위 명령어 절)                                                                     |
| `project-version-rules`                                              | `paths:` `VERSION`·`Projects.md`·`z_done` | 무버전 폴더 + VERSION SSOT                                                                                         |
| `repo-tracking-rules`                                                | `paths:` `.gitignore`·`lib/vendor/**`     | push 용량 재발 방지 gitignore 정책                                                                                 |
| [apply-verify-detail](.claude/rules-ondemand/apply-verify-detail.md) | 읽는 시점                                 | 헤드리스·시각 검증 채널(ego-browser)·슬라이드 링크 규약·배포 lint·pptx·PDF 회귀 러너 — **apply-verify §4 진입 시** |
| [data-access-detail](.claude/rules-ondemand/data-access-detail.md)   | 읽는 시점                                 | `data/<stage>/*.yml` **수정·커밋·lint** 시 — backup 의무·단독 커밋 규율·pre-commit 훅·schema lint                  |
| [pptx-rules](.claude/rules-ondemand/pptx-rules.md)                   | 읽는 시점                                 | `--pptx`·`--ppt-make`·`lib/pptx/` 작업 진입 시                                                                     |
| [m2slide-reference](.claude/rules-ondemand/m2slide-reference.md)     | 읽는 시점                                 | 아키텍처·변환 흐름·네비게이션 구현을 파악해야 할 때                                                                |
| [graphify-rules](.claude/rules-ondemand/graphify-rules.md)           | 읽는 시점                                 | graphify 자동 발동 트리거 표 — 글로벌 hook 이 매 턴 환기하므로 상시 불필요                                         |

**슬라이드 마크다운 작성 시 의무 참조 순서**: ① `~/.claude/_doc_arch/rules-ondemand/md-rules.md` ② `~/.claude/_doc_arch/rules-ondemand/md-slide-rules.md` ③ `.claude/rules/md-m2slide-rules.md`

## graphify

This project has a graphify knowledge graph at `graphify-out/`.

* **진입점**: `graphify-out/GRAPH_REPORT.brief.md` (없으면 `/graphify-prune`) · **금지**: `GRAPH_REPORT.md` / `graph.json` / `graph.html` 직접 Read
* **CLI 우선**: 코드/아키텍처 질문은 `graphify query "<질문>"` · `graphify path "<A>" "<B>"` · `graphify explain "<개념>"` · 파일 수정 후 `graphify update .`
* 룰: 글로벌 [`~/.claude/_doc_arch/rules-ondemand/graphify-rules.md`](~/.claude/_doc_arch/rules-ondemand/graphify-rules.md) · m2slide 트리거 표 [graphify-rules](.claude/rules-ondemand/graphify-rules.md) · 적용 SSOT `~/_git/___pm/_doc_arch/graphify-priority-setup.md`
