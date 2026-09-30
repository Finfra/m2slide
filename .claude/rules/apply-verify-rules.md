---
name: apply-verify-rules
description: m2slide 코드·템플릿·CSS 수정 후 빌드→HTML 검증→브라우저 표시까지의 적용 검증 절차
date: 2026-05-03
---

# 적용 트리거

m2slide 저장소(`lib/m2slide/`) 내 다음 파일을 수정한 직후 자동 발동:

* `generate-slides.js`, `generate-epub.js`, `lib/**/*.js` (코어 변환 로직)
* `theme/**/*.html` (layout 템플릿)
* `theme/**/*.css`, `lib/css/*.css` (스타일)
* `Projects/{Name}/**/*.md`, `Projects/{Name}/_config.yml` (프로젝트 콘텐츠·설정. 구 `_meta.yml` 은 Issue79 에서 폐기 — 메타는 슬라이드 소스 frontmatter 소유)
* `m2slide.sh`, `run.sh` 등 빌드 스크립트

위 변경이 한 건이라도 발생하면 사용자에게 별도 확인 없이 검증 절차를 즉시 수행함.

# 핵심 절차 (필수 순서)

## 1. 대상 프로젝트 결정

`/run` 커맨드와 동일한 우선순위 적용:

| 순위 | 소스                                                                              | 비고                                                                                  |
| :--- | :-------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| 1    | 사용자가 명시한 프로젝트명                                                        | "MarkdownGraph 빌드해줘" 등 직접 지시                                                 |
| 2    | 수정한 파일이 속한 프로젝트                                                       | `Projects/{Name}/...` 경로에서 `{Name}` 추출                                          |
| 3    | IDE 컨텍스트                                                                      | `<ide_opened_file>` / `<ide_selection>`에서 `Projects/{Name}/` 캡처                   |
| 4    | 영향 범위가 글로벌(`generate-slides.js`, `theme/default/`, `lib/css/base.css` 등) | 대표 프로젝트 다수 빌드 — `m2Slide_single_mode`, `m2Slide_chapter_mode`, `layoutTest` |

결정 근거를 한 줄로 사용자에게 알림.

## 1.5 Effective theme 확정 (theme/**/slide.css·layouts 편집 시 필수)

`theme/{name}/slide.css`, `theme/{name}/layouts/*.html`, `theme/{name}/palettes/*.css` 등 **theme 자산을 편집하기 전** 반드시 *실제 적용되는 theme*을 먼저 확정함. 잘못된 theme 파일을 고치면 빌드 산출물(`slide/css/custom.css`)에 반영되지 않아 헛수고 발생.

### theme 결정 우선순위 (lib/config.js 레이어 — 나중이 이김)

| 순위 | 소스                                | 비고                       |
| :--- | :---------------------------------- | :------------------------- |
| 1    | `_config.yml`의 `slide_css:`        | 있으면 최우선 (theme 무시) |
| 2    | `projectDir/_config.yml`의 `theme:` | 프로젝트 단위 override     |
| 3    | `ROOT/_config.yml`의 `theme:`       | 전역 기본                  |
| 4    | `ROOT/_config.org.yml`의 `theme:`   | 최후 fallback              |

* **⚠️ AGENDA.md / 슬라이드 소스 `.md` frontmatter의 `theme:`는 theme 해석에 쓰이지 않음** (Issue79 — frontmatter는 instructor 등 *메타 전용*). frontmatter에 `theme:`이 있어도 무시되므로, 그 값을 보고 편집 대상 theme을 판단하면 안 됨.

### 확정 절차 (편집 직전)

```bash
# 1) 적용 theme 추출 (projectDir _config > ROOT _config 순)
grep -h '^theme:' Projects/<P>/_config.yml _config.yml _config.org.yml 2>/dev/null | head -1

# 2) 빌드 로그로 교차 확인 (SSOT)
./m2slide.sh <P> 2>&1 | grep 'Theme applied:'
#   → "✅ Theme applied: <name> (.../theme/<name>/slide.css)"
```

* 편집 대상 = **빌드 로그가 보고한 `<name>`**의 `theme/<name>/slide.css`.
* 구조성(레이아웃·정렬) 규칙이면 `theme/_shared/` 우선 검토 (모든 theme 공유).
* 자매 theme(default·default_lec 등) 간 parity가 필요한 변경이면 양쪽 모두 반영하되, **실제 적용 theme을 1순위로 검증**.

## 2. 빌드 실행

```bash
./m2slide.sh {ProjectName}
```

* 변경 영향이 큰 경우(`base.css`, `generate-slides.js` 등)는 위 표 4번에 따라 대표 프로젝트 다수를 순차 빌드
* `--epub` 옵션은 사용자가 명시한 경우에만 추가
* 빌드 실패 시 즉시 사용자 보고 + 후속 절차 중단

## 3. HTML 산출물 직접 검증

빌드 성공 후 **반드시 결과 HTML 파일을 직접 Read하여** 다음을 확인:

| 검증 항목                        | 확인 방법                                                              |
| :------------------------------- | :--------------------------------------------------------------------- |
| HTML 파일 생성 여부              | `ls Projects/{Name}/slide/*.html`                                      |
| 변경 의도가 산출물에 반영됐는지  | 수정 의도와 관련된 HTML 영역(섹션·class·data attribute 등) Read·Grep   |
| 파서 오류 흔적                   | `undefined`, `{{...}}` 미치환 placeholder, 빈 `<section></section>` 등 |
| 사용자 명시 layout/slot          | `class="layout-*"`, `data-*` 속성, 슬롯 div 존재 여부                  |
| Cover/agenda 자동 주입 (해당 시) | 첫 슬라이드의 cover/agenda 마커 존재                                   |

검증 통과 기준은 **"수정 사항이 HTML에 의도대로 나타났는가"** — 단순 빌드 성공만으로 종료 금지.

## 4. 브라우저·검증 채널 — 요약 (상세: [apply-verify-detail.md](../rules-ondemand/apply-verify-detail.md))

**§4 에 진입하면 상세편을 먼저 Read** 한다. 상시로 지켜야 할 핵심만 여기 남긴다:

* **검증 엔진은 ego-browser** — 캡처를 포함해 전 축(Issue377). 판정은 `evaluate()`·`snapshot()` 이 1차 수단. 캡처 15초 타임아웃은 재시도·엔진 교체가 아니라 `task.newPage()` 새 Page
* **헤드리스 URL 은 short form** — solo `http://127.0.0.1:9877/p/<P>/s/<chap>/<slide>` · deck `…/p/<P>/n/<chap>/<slide>` (1-base). legacy `/Projects/<P>/slide/<X>.html` 은 404
* **시각 채널에서 shell `open -a "Google Chrome"` 금지** — AppleScript(`activate` + `make new tab`) 또는 ego-browser
* **변경 종류별 추가 검증**(상세편 절 번호): 산출물 코드·컴포넌트 → `--lint-deployment`(§4.5) · theme CSS → `--lint-license`(§4.6) · `--pptx` 는 빌드 내장 검증이 차단(§4.7) · lane B/M·커버리지·조립·PDF·single parity 러너(§4.8~4.13)

## 5. 결과 보고

사용자에게 다음을 한 묶음으로 보고:

* 빌드 대상 프로젝트(들) + 결정 근거
* 빌드 결과 (성공/실패)
* HTML 검증 항목 + 통과 여부
* 검증 채널(시각/헤드리스) + 사용 도구 + 경로/URL
* 파일 단위 배포 lint 통과 여부 (§4.5 적용 시)

### 5.1 결과 링크 의무 (필수)

슬라이드를 빌드·수정·검증한 응답은 채팅 말미에 **결과 링크(deck deep-link)** 를 반드시 포함함. 사용자가 변경 결과를 즉시 브라우저로 열 수 있어야 함. 캡처·문서가 있으면 함께 3종 묶음으로 제시:

```
캡처: _doc_work/capture/<파일>.png
문서: http://jm4.local:9876/htm-doc?path=<.htm 절대경로>
결과 링크: http://127.0.0.1:9877/p/<P>/n/<chap>/<slide>#/<hash>
```

* **결과 링크 형식**: dev-server deck navigation deep-link `http://127.0.0.1:9877/p/<P>/n/<chap>/<slide>` (chap·slide 1-base). 특정 슬라이드를 가리킬 땐 `#/<hash>` 또는 `#/toc-placeholder` 등 reveal.js hash 부가
    - 변경이 특정 슬라이드면 그 슬라이드를 직접 가리킴 (ex: TOC 변경 → `/n/6/1#/toc-placeholder`)
    - 변경이 데크 전반이면 진입점 `/n/c` (cover) 또는 대표 슬라이드 1장
* **3종 라벨 고정**: `캡처:` / `문서:` / `결과 링크:` — 라벨명·순서 유지. 해당 항목 없으면 그 줄 생략 가능하나 **결과 링크는 슬라이드 작업 시 항상 포함**
* 캡처·문서가 없는 단순 빌드라도 결과 링크는 제시 (사용자가 결과를 열어볼 1차 수단)

# 예외 (절차 생략 가능)

* 마크다운·문서 파일만 수정한 경우 (`*.md` 중 `Projects/` 외부, `Issue.md`, `_doc_arch/*.md`, `_doc_work/**/*.md`, `CLAUDE.md`, `README.md` 등) — 검증 불필요
* 사용자가 "빌드 안 해도 돼", "검증 생략" 등 명시적으로 우회 지시한 경우
* `.claude/`, `.gitignore`, 메타 파일만 수정한 경우

# 위반 시 대응

* 코드 수정 후 본 절차를 누락한 사실을 발견하면 즉시 본 절차 수행 + 사용자에게 누락 보고
* 사용자가 누락을 지적하면 `~/.claude/learning_log.md`에 한 줄 기록 (`* YYYY-MM-DD: m2slide 코드 수정 후 빌드·검증 누락`)

# 참조

* `/run` 커맨드: `.claude/commands/run.md`
* 루트 wrapper: `run.sh`
* CSS 수정 가드: [`CLAUDE.md`](../../CLAUDE.md) "CSS 수정 시 주의사항"
* base.css 수정 가드: [`CLAUDE.md`](../../CLAUDE.md) "base.css 수정 가드"
