---
name: deploy-docs
description: m2slide 프로젝트를 GitHub Pages(docs/)에 배포·갱신·제거하는 커맨드. /deploy-docs <project> 자동 분기(있으면 update, 없으면 new), /deploy-docs <project> delete 제거
date: 2026-05-06
---

# /deploy-docs 커맨드

m2slide `Projects/{name}/`을 빌드하여 GitHub Pages 배포 경로 [docs/](../../docs/) 하위에 동기화하고 [docs/index.html](../../docs/index.html) 프로젝트 카드를 자동 갱신함. https://finfra.github.io/m2slide/ 에서 노출됨.

> ⚠️ `/deploy docs`(deploy.md의 `docs` 서브커맨드, 문서 변경 commit·push)와 **이름이 비슷하지만 별개 커맨드**임. 본 커맨드는 슬라이드 산출물 → docs/ 동기화에 한정.

# GitHub Pages 배포 방식 (Actions 기반, 2026-07-02 전환)

`docs/`는 **`.github/workflows/pages.yml`(GitHub Actions)** 로 배포됨 — 레거시 Jekyll 브랜치 빌드(`build_type: legacy`)는 원인 불명 `Page build failed`가 반복되어 폐기함. 현재 repo Pages 설정은 `build_type: workflow`.

* 트리거: `main` 브랜치 `docs/**` push, 또는 수동 `gh workflow run pages.yml --repo Finfra/m2slide`
* 진행 확인: `gh run list --repo Finfra/m2slide --workflow=pages.yml --limit 1`
* 상세 로그: `gh run view <run-id> --repo Finfra/m2slide --log-failed`

## 트러블슈팅 — `deployment_queued`에서 안 넘어가고 멈춤

`deploy-pages` 스텝 로그가 `Current status: deployment_queued` 를 10분간 반복하다 `Timeout reached, aborting!` 로 자체 취소되는 경우, GitHub Pages 백엔드 큐 처리 지연(일시적, repo 쪽 원인 아님)일 가능성이 높음. 대응:

1. **동일 sha 재실행 금지** — 같은 sha로 재시도하면 이전 배포의 cancel 잔재가 lock을 걸어 즉시 `Deployment cancelled`로 실패할 수 있음
2. **새 커밋으로 sha 갱신 후 재시도**:
    ```bash
    date -u '+# redeploy trigger %Y-%m-%dT%H:%M:%SZ' >> docs/.redeploy-trigger
    git add docs/.redeploy-trigger && git commit -m "ci(pages): 재배포 트리거" && git push origin main
    ```
3. 10분 간격으로 최대 몇 차례 반복 후에도 안 되면 GitHub 쪽 일시 장애로 보고 잠시 대기 후 재시도 (2026-07-02 사례는 4번째 시도에서 자연 해결됨 — 백엔드 장애 확정·Support 문의 단계까지 가지 않음)
4. 그래도 장기간 안 풀리면 최후 수단: `gh-pages` 브랜치로 소스 전환(`gh api -X PUT repos/Finfra/m2slide/pages -f build_type=legacy -f 'source[branch]=gh-pages' -f 'source[path]=/'`) 검토, 또는 GitHub Support 문의

# 사용법

```
/deploy-docs <project>          # 자동 분기: docs/<project>/ 존재 시 update, 없으면 new
/deploy-docs <project> delete   # docs/<project>/ 제거 + index 카드 삭제
/deploy-docs                    # 사용법 + 현재 docs/ 배포 목록 출력
```

**인자**

* `<project>` (필수): `Projects/{project}/` 경로의 프로젝트명
* `delete` (선택): 두 번째 위치 인자. 정확히 `delete` 문자열일 때만 제거 모드

# 동작 흐름

## A. 인자 없음 → 사용법 + 현황 출력

```bash
ls -1 docs/ 2>/dev/null | grep -v -E '^(index\.html|\.DS_Store)$'
```

위 목록을 "현재 docs/에 배포된 프로젝트"로 보고. 사용법 텍스트 함께 출력.

## B. `<project>` (자동 분기)

### B-0. 사전 검증

| 체크                           | 실패 시 동작                              |
| :----------------------------- | :---------------------------------------- |
| `Projects/{project}/` 폴더 존재 | 즉시 중단 + 오류 보고                     |
| `Projects/{project}/_config.yml` 또는 단일 `.md` 존재 | 즉시 중단 + 오류 보고 |

### B-1. 모드 자동 판정

```bash
if [ -d "docs/{project}" ]; then
    MODE=update
else
    MODE=new
fi
```

판정 근거를 한 줄로 보고: ex) `"docs/MyProject 존재 → update 모드"` / `"docs/MyProject 없음 → new 모드"`

### B-2. 빌드 — 출력 형식 자동 감지

`Projects/{project}/_config.yml`의 `deploy_formats` 키를 검사하여 m2slide.sh에 옵션 전달.

**지원 형식** (m2slide.sh `--epub` / `--pdf` / `--pptx`):

| 형식  | 산출물 (`slide/{project}.{ext}`) | 의존성                              |
| :---- | :------------------------------- | :---------------------------------- |
| `epub` | `{project}.epub`                | (선택) mmdc — Mermaid SVG 렌더용   |
| `pdf`  | `{project}.pdf` (챕터별 합본)   | decktape (없으면 `npx -y decktape`) |
| `pptx` | `{project}.pptx`                | pandoc (`brew install pandoc`)      |

**`_config.yml` 옵션 명세** (한 줄 인라인 리스트):

```yaml
deploy_formats: [epub, pdf, pptx]   # 모든 형식
deploy_formats: [epub]               # EPUB만
deploy_formats: []                   # HTML만 (기본값과 동일)
## 키 자체를 생략해도 HTML만 생성
```

**빌드 옵션 구성**:

```bash
## deploy_formats 추출 (인라인 리스트 또는 빈 값)
## ⚠️ 코멘트(`#` 이후)를 먼저 제거한 후 [...] 매칭 — 코멘트 안의 예시 대괄호와 충돌 방지
FORMATS_RAW=$(grep -E '^deploy_formats:' "Projects/{project}/_config.yml" 2>/dev/null \
              | sed 's/#.*//' \
              | sed -E 's/.*\[(.*)\].*/\1/' | tr -d ' ')
## 예: "epub,pdf,pptx" 또는 ""

BUILD_OPTS=""
[[ "$FORMATS_RAW" == *"epub"* ]] && BUILD_OPTS="$BUILD_OPTS --epub"
[[ "$FORMATS_RAW" == *"pdf"*  ]] && BUILD_OPTS="$BUILD_OPTS --pdf"
[[ "$FORMATS_RAW" == *"pptx"* ]] && BUILD_OPTS="$BUILD_OPTS --pptx"

## 옵션 보고: ex) "deploy_formats: epub,pdf → --epub --pdf 옵션 적용"
echo "deploy_formats: ${FORMATS_RAW:-(none)} →${BUILD_OPTS:- (HTML only)}"

./m2slide.sh {project} $BUILD_OPTS
```

* 빌드 실패 시 docs/ 변경 없이 즉시 중단 + 오류 보고
* 빌드 결과 디렉토리: `Projects/{project}/slide/` (m2slide.sh가 산출물도 slide/로 자동 이동)
* 의존성 누락 시 (decktape·pandoc·mmdc) m2slide.sh가 경고 후 graceful degradation — 빌드 자체는 진행됨

### B-3. docs/ 동기화

```bash
# update 모드는 stale 파일 제거를 위해 먼저 비움
if [ "$MODE" = "update" ]; then
    rm -rf "docs/{project}"
fi
mkdir -p "docs/{project}"
cp -R "Projects/{project}/slide/." "docs/{project}/"
```

### B-4. 카드 메타데이터 추출

#### 4-a. 카드 제목

빌드된 [Projects/{project}/slide/index.html](../../Projects/) `<title>` 태그에서 카드 제목 추출:

```bash
TITLE=$(grep -o '<title>[^<]*</title>' "docs/{project}/index.html" | head -1 | sed 's|<title>||;s|</title>||')
## fallback: TITLE이 비었거나 'Reveal.js'·'Untitled' 등 무의미하면 project명 사용
```

* `<title>`이 없거나 `Reveal.js`·`Untitled`·빈 문자열이면 fallback으로 `{project}` 사용
* HTML 이스케이프(`&` 등) 그대로 보존

#### 4-b. 산출물 존재 여부 (배지 결정용)

```bash
HAS_EPUB=$([ -f "docs/{project}/{project}.epub" ] && echo true || echo false)
HAS_PDF=$([ -f "docs/{project}/{project}.pdf"  ] && echo true || echo false)
HAS_PPTX=$([ -f "docs/{project}/{project}.pptx" ] && echo true || echo false)
```

* `deploy_formats` 명시 → 빌드 → 산출물 파일 존재 검증의 결과로, 실제 파일이 있을 때만 배지 표시 (정합성 보장)
* `deploy_formats: [pdf]` 명시했으나 decktape 의존성 누락으로 PDF 미생성 시 → 배지 표시 안 함 + B-6에서 경고

### B-5. docs/index.html 카드 갱신

[docs/index.html](../../docs/index.html)는 3개 섹션(`m2` / `lec` / `pr`)으로 분리되어 있으며, 각 섹션은 독립 마커 쌍을 가짐 (Issue — 2026-07-03 3섹션 분리):

| 섹션 id | 마커                                                | 대상 (Projects.md 분류) |
| :------ | :--------------------------------------------------- | :----------------------- |
| `m2`    | `<!-- PROJECT_ENTRIES_M2_START/END -->`              | `m2` (m2slide 도구 자체 소개·데모) |
| `lec`   | `<!-- PROJECT_ENTRIES_LEC_START/END -->`             | `lec` (강연 자료)         |
| `pr`    | `<!-- PROJECT_ENTRIES_PR_START/END -->`              | `PR` (fPM 등 프레임워크)  |

**섹션 결정**: `Projects.md`의 `분류` 열에서 `{project}` 행을 찾아 위 매핑으로 타깃 마커 결정. 분류를 못 찾으면(`Projects.md`에 행 없음) 사용자에게 질의.

* **new 모드**: 대상 섹션 마커 끝 직전에 카드 블록 append
* **update 모드**: `data-project="{project}"` 속성을 가진 기존 카드 블록을 문서 전체에서 찾아 그 자리만 교체 (섹션·순서 보존). 못 찾으면 대상 섹션에 append (안전 장치)
* 프로젝트의 분류가 바뀌어 섹션 이동이 필요하면(드묾) 기존 카드 블록을 제거 후 새 섹션에 append

카드 블록 (들여쓰기 4칸 = 기존 패턴 일치). 산출물 존재 여부에 따라 배지 동적 추가:

```html
    <a class="card" href="{project}/index.html" data-project="{project}">
      <h2>{title}</h2>
      <div class="project-id">{project}</div>
      <span class="badge">프레젠테이션</span>
      <span class="badge badge-epub">📚 EPUB</span>     <!-- HAS_EPUB=true 일 때만 -->
      <span class="badge badge-pdf">📄 PDF</span>       <!-- HAS_PDF=true 일 때만 -->
      <span class="badge badge-pptx">📊 PPTX</span>     <!-- HAS_PPTX=true 일 때만 -->
    </a>
```

**배지 정책**: 카드 자체가 `<a>` 태그(슬라이드 페이지로 이동)이므로 카드 안 배지는 시각 표시용 `<span>`. **실제 다운로드는 슬라이드 페이지의 다운로드 버튼**(m2slide.sh가 `slide/index.html`에 자동 주입) 사용. 메인 인덱스 진입 → 카드 클릭 → 슬라이드 페이지 → 다운로드.

**CSS 스타일** ([docs/index.html](../../docs/index.html) `<style>` 영역에 1회 추가, 이후 재사용):

```css
.badge-epub { background: #f59e0b; }   /* amber */
.badge-pdf  { background: #ef4444; }   /* red */
.badge-pptx { background: #10b981; }   /* emerald */
.badge + .badge { margin-left: 4px; }
```

**구현 방식**: 정확한 매칭을 위해 Read → 문자열 치환 → Write 패턴 사용. sed/awk inline 편집 금지(개행 처리·이스케이프 위험).

### B-6. 검증

`apply-verify-rules`에 따른 산출물 검증:

**기본 3종**:

```bash
## HTML 파일 존재
test -f "docs/{project}/index.html"

## placeholder 누수 확인
grep -c '{{' "docs/{project}/index.html"   # 0이어야 함

## index.html 카드 등록 확인
grep -c "data-project=\"{project}\"" docs/index.html   # 정확히 1이어야 함
```

**deploy_formats 추가 검증** (명시된 형식만):

```bash
[[ "$FORMATS_RAW" == *"epub"* ]] && test -f "docs/{project}/{project}.epub"
[[ "$FORMATS_RAW" == *"pdf"*  ]] && test -f "docs/{project}/{project}.pdf"
[[ "$FORMATS_RAW" == *"pptx"* ]] && test -f "docs/{project}/{project}.pptx"
```

* 명시된 형식 산출물 누락 시: **경고만 출력**하고 배포는 계속 (의존성 부재로 인한 graceful degradation 허용)
* 경고 메시지에 의존성 설치 가이드 포함:
    - epub 누락 → "mmdc 설치 권장: `npm install -g @mermaid-js/mermaid-cli`"
    - pdf 누락 → "decktape 설치 권장 또는 `npx -y decktape` 자동 사용 확인"
    - pptx 누락 → "pandoc 설치 필요: `brew install pandoc`"

기본 3종은 모두 통과해야 성공으로 간주. 추가 검증은 권고 수준.

### B-7. 결과 보고

| 항목                  | 내용                                                       |
| :-------------------- | :--------------------------------------------------------- |
| 모드                  | new 또는 update                                            |
| 빌드 옵션             | 적용된 옵션 리스트 (ex: `--epub --pdf`)                    |
| 빌드 결과             | 성공/실패                                                  |
| 동기화 파일 수        | `find docs/{project} -type f \| wc -l`                     |
| 산출물                | HTML / EPUB / PDF / PPTX 별 ✅·❌ 표시                    |
| index.html 카드       | 추가됨 / 갱신됨 + 노출된 배지 목록                         |
| 검증                  | 기본 3종 통과 여부 + 추가 검증 결과                        |
| 의존성 경고           | 누락 도구별 설치 가이드 (해당 시)                          |
| 다음 단계             | `git add docs/ && git commit && git push` 안내 + push 후 `gh run list --repo Finfra/m2slide --workflow=pages.yml --limit 1` 로 Actions 배포 확인 안내 (본 문서 상단 "GitHub Pages 배포 방식" 참조) |

브라우저 자동 실행은 **하지 않음** (배포 작업이지 미리보기가 아님). 미리보기는 `/run {project}` 또는 사용자가 직접 `open docs/index.html`.

## C. `<project> delete`

### C-1. 사전 확인

```bash
test -d "docs/{project}"   # 없으면 "이미 배포되지 않음" 보고 후 종료
```

### C-2. 사용자 승인 (Opus 4.7 파괴적 작업 룰)

다음을 출력하고 사용자 승인 대기:

```
다음을 제거합니다:
* docs/{project}/  ({파일 N개})
* docs/index.html 카드 1개

진행할까요? (y/N)
```

명시적 `y`·`yes` 응답이 없으면 중단.

### C-3. 제거

```bash
rm -rf "docs/{project}"
```

### C-4. 카드 삭제

[docs/index.html](../../docs/index.html)에서 `data-project="{project}"` 카드 블록을 마커 내부에서 정확히 매칭하여 제거. 카드 시작 `<a class="card"` 부터 종료 `</a>` 까지 5줄 단위로 삭제하되, 들여쓰기 보존 + 빈 줄 발생 방지.

### C-5. 검증

```bash
test ! -d "docs/{project}"                              # 폴더 제거됨
grep -c "data-project=\"{project}\"" docs/index.html    # 0이어야 함
```

### C-6. 결과 보고

* 제거된 폴더 경로
* 제거된 카드 정보 (title + project)
* `Projects/{project}/`은 **건드리지 않음** 명시 (소스 보존)
* 다음 단계: `git add docs/ && git commit && git push` 안내

# 안전 가드

* **소스 보존**: `Projects/{project}/`는 어떤 모드에서도 수정·삭제 금지. 빌드 산출물 `slide/`만 사용
* **빌드 실패 시 unchanged**: docs/ 어떤 변경도 발생하지 않아야 함 (빌드를 docs/ 동기화보다 먼저 수행)
* **delete 승인 필수**: 자동 진행 금지
* **카드 정합성**: `data-project` 속성으로 unique 매칭. 동일 project로 중복 카드 발생 금지

# 예시

## 기본 사용 (HTML만)

```
/deploy-docs MarkdownGraph
→ deploy_formats: (none) → (HTML only)
→ ./m2slide.sh MarkdownGraph 빌드
→ docs/MarkdownGraph/ 생성 + 카드 추가
→ 검증 통과
→ "git add docs/ && git commit && git push" 안내
```

## EPUB·PDF·PPTX 추가

`Projects/MarkdownGraph/_config.yml`에 한 줄 추가:

```yaml
deploy_formats: [epub, pdf, pptx]
```

이후 평소처럼 호출:

```
/deploy-docs MarkdownGraph
→ deploy_formats: epub,pdf,pptx → --epub --pdf --pptx 옵션 적용
→ ./m2slide.sh MarkdownGraph --epub --pdf --pptx 빌드
→ docs/MarkdownGraph/ 동기화
   * MarkdownGraph.epub  ✅
   * MarkdownGraph.pdf   ✅
   * MarkdownGraph.pptx  ✅
→ 카드에 [📚 EPUB] [📄 PDF] [📊 PPTX] 배지 추가
```

## EPUB만 추가

```yaml
deploy_formats: [epub]
```

```
/deploy-docs MarkdownGraph
→ --epub 옵션만 적용
→ 카드에 [📚 EPUB] 배지만 추가
```

## Update — 제목·산출물 동시 갱신

```
/deploy-docs MarkdownGraph
→ docs/MarkdownGraph/ 존재 → update 모드
→ 빌드 + 동기화 + 카드 갱신 (제목·배지 모두 반영)
```

## 제거

```
/deploy-docs MarkdownGraph delete
→ "docs/MarkdownGraph/ + 카드 1개 제거. 진행? (y/N)" 출력 → 사용자 y
→ 폴더·카드 제거 + 검증
```

# 참조

* GitHub Pages 설정: `gh api repos/Finfra/m2slide/pages` → `source.path: /docs`
* 배포 URL: https://finfra.github.io/m2slide/
* 빌드 wrapper: [m2slide.sh](../../m2slide.sh)
* 검증 절차: [.claude/rules/apply-verify-rules.md](../rules/apply-verify-rules.md)
* 일반 배포 워크플로우: [.claude/commands/deploy.md](deploy.md) (release/docs commit·push — 본 커맨드와 별개)
