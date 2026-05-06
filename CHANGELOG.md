# Changelog

All notable changes to this project. m2slide follows [SemVer](https://semver.org/).

## [v0.7.0] - 2026-05-06

### What's new

#### 🚀 `/deploy-docs` 커맨드 신규 — multi-project GitHub Pages 배포 (Issue127)

`docs/` 하위에 다수 프로젝트를 카드 형태로 한 곳에 모아 배포하는 워크플로우 도입.

- **`/deploy-docs <project>`**: docs/<project>/ 존재 시 update, 없으면 new 자동 분기
- **`/deploy-docs <project> delete`**: 폴더 + 메인 인덱스 카드 제거 (사용자 승인 필수)
- **`/deploy-docs`**: 사용법 + 현재 docs/ 배포 목록 출력
- 카드 제목 자동 추출(`<title>` 태그) + `data-project` 속성 unique 매칭 + stale 파일 제거 + 검증 5종

#### 📦 다양한 출력 형식 통합 — `_config.yml: deploy_formats` (Issue127)

프로젝트 `_config.yml`에 한 줄 추가하면 `/deploy-docs`가 m2slide.sh에 옵션 자동 전달.

```yaml
deploy_formats: [epub, pdf, pptx]   # 모든 형식 (HTML 기본 + 추가)
deploy_formats: [epub]               # EPUB만
## 키 생략 또는 [] → HTML만
```

- 빌드 후 산출물(`<project>.epub`/`.pdf`/`.pptx`)이 docs/ 자동 동기화
- 메인 인덱스 카드에 다운로드 배지 동적 노출 (📚 EPUB amber / 📄 PDF red / 📊 PPTX emerald)
- 의존성 누락 시 graceful degradation (mmdc·decktape·pandoc 안내 출력 후 빌드 계속)

#### 🎨 agenda 다운로드 버튼 우하단 이동 (Issue128, Issue80 후속)

마스코트(우상단)와 시각적 충돌 회피.

- 위치: `header > .toc-page-downloads` (float right) → `.layout-_agenda > .toc-page-downloads` (position absolute, bottom 3% + 5px / right 3%)
- Issue113 frame 변수(--frame-h/--frame-w) 재사용 — viewport letterbox 변화 무관
- z-index 5로 마스코트(z-index 0) 위에 표시되어 클릭 가능
- Issue80 §2.2 `margin-right: 16%` 회피 마진 제거 (불필요)

### Issues 종결

- **Issue127** (commit: c3a9feb): /deploy-docs 신규 커맨드 + deploy_formats 옵션 + 카드 다운로드 배지 + README 업데이트
- **Issue128** (commit: c3a9feb): agenda 다운로드 버튼 우하단 이동 (Issue80 후속)
- **v0.6.x 시리즈 (Issue71-126, 56건)** 누적 z_old 아카이브 — 본 release에 누적 정리

### 변경 파일

- 신규: `.claude/commands/deploy-docs.md` (340줄)
- 수정: `theme/default/layouts/_agenda.html`, `theme/default/slide.css`, `lib/html-builder.js`, `docs/index.html`, `README.md`, `Issue.md`, `VERSION`
- 아카이브: `z_old/old_issue.md`에 v0.7.0 섹션 prepend (Issue127-128 + v0.6.x 누적)

## [v0.6.0] - 2026-05-05

### Issues 종결 (36건, Issue71-106)

#### 키보드 네비게이션 — 9키 체계 정립 + 트리 탐색 (Issue71, 87-92, 99-106)

- **Issue71**: ↑ 키 H1 section anchor 단위 이동 + Home 키 도입 (d54eab7)
- **Issue87**: key_navigation 설계 반영 — 9키 네비게이션 체계 구현 (a44b7b6)
- **Issue88**: key_navigation.md 정합성 후속 수정 (a44b7b6)
- **Issue89**: ⇤ Home / ⇥ End 키 동작 안 함 — Reveal.js hijack 수정 (ba4e084)
- **Issue92**: Home/End sibling 점프가 H2 sub-section까지 매칭 + 일부 환경에서 Home/End keydown 미전달 (b9610bb)
- **Issue99**: Chapter 모드 본문(leaf)에서 ↓ 키 무동작 — 다음 챕터 fall-through (68eb82b)
- **Issue100**: 본문 leaf에서 ↑ 키가 직속 부모(H2 sub-anchor) 건너뛰고 H1 anchor로 점프 (68eb82b)
- **Issue102**: H2 sub-anchor에서 ↑ 시 직속 부모 H1 anchor로 이동 (Issue100 후속) (354d142)
- **Issue103**: Single 모드 본문(leaf)에서 ↓ 키 무동작 — 다음 H1 anchor fall-through (7570cf0)
- **Issue104**: Chapter ← 이전 챕터 진입 시 backward 트랜지션 애니메이션 반영 (48f63e2)
- **Issue105**: ⇤/⇥ Single 모드 sibling을 H1 전용에서 레벨 인식 트리 탐색으로 확장 (2e188b5)
- **Issue106**: anchor에서 ↓ 누름 시 자식 sub-anchor 우선 — H1 → 첫 H2로 점프 (dc60188)

#### 시각·CSS 개선 (Issue72, 80, 85-86, 90-91, 94-98, 101)

- **Issue72**: CSS `!important` 과도 사용 1차 최적화 (05b7782)
- **Issue80**: theme_layout_default.md §2 레이아웃 변경 결정사항 default theme 적용 (a268ad4)
- **Issue85**: slide_outer_padding 4면 균등 적용 + agenda 반영 + unitless 0 calc 회귀 수정 (1a9d78d)
- **Issue86**: default theme 시각 개선 — 가로선 hr.png 통일 + 페이지 UI를 outer padding 바깥으로 (582d064)
- **Issue90**: title_contents_gap이 .contents-title에 적용 안 됨 (2b1c3d9)
- **Issue91**: 제목 underline이 contents-header 안쪽에 있어 위/아래 갭 비대칭 (2b1c3d9)
- **Issue94**: 테이블 슬라이드에 layout-_contents 클래스 미적용 (45cedeb)
- **Issue95**: Pandoc `::: rows` 행이 contents-body 채우지 못하고 height 비례 미적용 (09babdf)
- **Issue96**: 2x2 그리드 (columns 안에 rows 중첩) 균등 분할 미적용 (fdbe8da)
- **Issue97**: default_lec theme를 default theme의 Issue80/86 시각 변경과 동기화 (8883e2e)
- **Issue98**: 코드 블록 좌측 정렬 + HTML escape + hljs 클래스 누락 (d567d53)
- **Issue101**: 코드 박스 시각 안정화 — CDN github.css 의존 제거 + 자체 .code-wrapper 박스 (42979cf)

#### 기능 추가 / Pandoc 호환 (Issue73-74, 76, 79, 81, 93)

- **Issue73**: theme/default/layouts/ 번호 prefix layout 6종 신규 추가 (da0cc88)
- **Issue74**: AGENDA title Format A/B 통일 + cover 강사 label 미세 개선 (67222eb)
- **Issue76**: lib/combine-pdfs.py 신규 — macOS Quartz 기반 PDF 병합 (1cb45ba)
- **Issue79**: `_meta.yml` 폐기 + 메타데이터를 슬라이드 소스 frontmatter로 통합 (d49f9bb)
- **Issue81**: 슬라이드 layout 메타 `#layout-` prefix 정식 지원 (c27ae5d)
- **Issue93**: Pandoc `::: columns` / `::: rows` 본문 누락 (09babdf)

#### 설계 문서 정합성 (Issue75, 77-78, 82-84)

- **Issue75**: _agenda.html instructor div 제거 + CLAUDE.md base.css 가드 섹션 추가 (8d47945)
- **Issue77**: markmap fold 인디케이터 원 크기 30% 축소 (a29a0fa)
- **Issue78**: 번호 prefix layout 6종 폐기 + layout_default.md를 theme_layout_default.md에 머징 (afdb361)
- **Issue82**: lib/layout.js dead `_WARNED_MISSING_LAYOUTS` 제거 + 설계 문서 §4.4 정정 (ee70b2a)
- **Issue83**: 설계 문서 `theme_layout.md` §5.1·§11.2·§15 `_toc` 자동 적용 조건 정정 (568f456)
- **Issue84**: 설계 문서 `theme.md` §2 `slide_css:` 우선순위 표 정정 (568f456)

### 주요 변화 요약

- **9키 네비게이션 SSOT 정립**: `_doc_design/key_navigation.md` — ←/→/↑/↓ 4방향 + ⇤/⇥/⇞/⇟ 4단축. Single/Chapter 모드 매트릭스 + K1~K11 결정사항
- **트리 탐색 의미 도입**: ⇤/⇥는 enclosing anchor 레벨 N 기준 prev/next anchor at `level ≤ N` (H1↔H1, H2↔H2, …). leaf ↓는 fall-through (다음 챕터/다음 H1). anchor ↓는 자식 sub-anchor 우선
- **Backward 트랜지션 애니메이션**: ← 챕터 이동 시 우측에서 슬라이드 진입(좌측 모션). `?back=1`/`?fwd=1` URL 시그널 + 자체 CSS keyframe
- **Pandoc fenced div 호환**: `::: columns` / `::: rows` 정상 처리 + 2x2 그리드 균등 분할
- **메타데이터 SSOT 통합**: `_meta.yml` 폐기, 슬라이드 소스 frontmatter로 통합 (Issue79). cover/agenda 자동 주입 정책

## [v0.5.0] - 2026-05-03

### Issues 종결 (71건)

- **Issue70**: 키 네비게이션 체계 정리 — Single ←·Chapter ↑·Chapter 챕터 간 ← (fa43351)
- **Issue66**: cover 페이지 Reveal.initialize 하드코딩으로 slide_ratio 무효화 (bffd865)
- **Issue69**: agenda.html이 _config.yml의 slide_ratio를 적용하지 않음 (84a2fbe)
- **Issue68**: single-page mode PDF 미생성 + 프로젝트 루트 stale EPUB 누적 (0cec27f)
- **Issue67**: cover layout 빈 메타 변수 → 빈 박스/래퍼 잔존 (b3a486e)
- **Issue65**: slide_ratio: none 값 제거 — 유효값 단일화 (9c83d87)
- **Issue63**: slide_ratio 기반 슬라이드 레이아웃 크기 체계 정립 (c34d560, 33d4cc1)
- **Issue64**: lib/css/base.css 도입 — _config.yml + slide.css 슬림화 (7a10b81)
- **Issue62**: cover-title 반응형 크기 조정 및 CSS 구현 설계 문서화 (b12a8db, 789947d)
- **Issue61**: title_contents_gap이 media-enlarge-fit 모드 + H3 슬라이드에서 미적용 (4e418c2, 789947d, 8db51ae)
- **Issue60**: generate-slides.js 모듈 분리 리팩터링 (05c1299)
- **Issue59**: cover_enabled=true 시 커버 페이지 복원 (bba0104)
- **Issue58**: Cover Slide 제거 및 TOC 통합 (9ed3298)
- **Issue57**: Agenda/TOC 페이지 ArrowLeft 키 누락 (c730a5c)
- **Issue52**: m2SlideStyle2_chapter 프로젝트 구조 정비 (c57e016)
- **Issue51**: 장표 드래그 네비게이션 (c57e016)
- **Issue50**: Orientation 슬라이드 + TOC 제외 메타 (c57e016)
- **Issue55**: chapter/single 모드 출력 구조 통일 — 3페이지 모델 (71841f5)
- **Issue56**: theme/nowage markmap 링크 밑줄 제거 (542ed18)
- **Issue49**: 제목 페이지 자동 생성 — Frontmatter 기반 cover 슬라이드 (71b5fc5, 6d42c37)
- **Issue48**: meta.yml 운영 — 프로젝트 메타데이터 분리 SSOT (0a2f75a)
- **Issue54**: 자동 layout 슬라이드 화면 밖 렌더링 — `position: relative` 가 reveal.js 스택 깨뜨림 (6141a6c)
- **Issue53**: 페이지 번호 링크 비활성화 — prev arrow 클릭 영역 침범 해결 (f67aff6)
- **Issue46**: TOC markmap 노드 클릭 시 슬라이드 인덱스 1칸 어긋남 — `_toc` 자동 prepend 미반영 (1d20fdb)
- **Issue47**: keynote-nowage-theme 시각 디자인 적용 (1dc825a)
- **Issue45**: layout 이름 정규화 정책 문서·회귀 검증 정합성 점검 (ea56fa1)
- **Issue44**: raw HTML `<video>`/`<audio>` multi-line block이 `<p>` wrap으로 깨짐 (2f90ee8)
- **Issue26**: 동영상 지원 기능 (2f90ee8)
- **Issue27**: 제목 없는 단독 이미지 페이지 자동 확대 (bde5f69)
- **Issue27_1**: 전체 이미지 단독 슬라이드 → `_blank.html` 적용 (bde5f69)
- **Issue27_2**: 제목 비어있는 슬라이드 → `_contents_no_title.html` 적용 (bde5f69)
- **Issue27_3**: 자동 layout 감지 ON/OFF 옵션을 `_config.yml`에 추가 (bde5f69)
- **Issue27_4**: `_blank` full-image 이미지 크기 확대 (bde5f69)
- **Issue41**: theme_default_layout 값 정규화 + 경고 dedup (2f90ee8)
- **Issue43**: `_config.org.yml` video 기본 옵션 정리 + `![] (2f90ee8)
- **Issue40**: PPT 슬라이드 마크다운 규칙 정립 — md-slide-rules + md-m2slide-rules 2계층
- **Issue39**: TOC markmap 초기 렌더링 누락 — tocData 빈 wrapper + `#toc-mindmap` ID 중복 (4567248)
- **Issue28**: 베이스 폴더 변경
- **Issue37**: H 제목 내 특수문자 처리 버그 (9d160e5)
- **Issue38**: layout 파일명 표준화 + default 테마 fallback 시스템 (b58b563)
- **Issue36**: theme/{name}/ + HTML 템플릿 layout 시스템 도입 (687ce22)
- **Issue36_1**: 첫 페이지 렌더링 오작동 (a95cd61)
- **Issue36_2**: nowage 테마로 재테스트 (a95cd61)
- **Issue35**: chapter-list TOC 카드 블록 레이아웃 전환 (30181b9)
- **Issue34**: 다분할 레이아웃 마크다운 단축 표기 지원 (bfdd1c0)
- **Issue34_1**: 다분할 레이아웃 렌더링 버그 수정 (bfdd1c0)
- **Issue32**: m2slide.sh -h/--help 옵션 추가 (2bbb15a)
- **Issue31**: top_align 버그 수정 및 title_contents_gap 옵션 추가 (8ca0915)
- **Issue30**: _config.org.yml을 기본값 SSOT로 변경 (6805b6d)
- **Issue29**: convert.sh → m2slide.sh 이름 변경 (c5030fb)
- **Issue24**: Slide 폴더 포터블화 (40e8bc4)
- **Issue20**: PPTX 생성 옵션 (40e8bc4)
- **Issue23**: 단일 페이지 모드에서 ePub 생성 지원 (40e8bc4)
- **Issue18**: PDF 생성 옵션 (40e8bc4)
- **Issue22**: 테이블 내 이미지 크기 자동 조절 (40e8bc4)
- **Issue21**: 번호 있는 리스트 (0310884)
- **Issue19**: 단일 페이지 모드용 종합 샘플 프로젝트 (40e8bc4)
- **Issue17**: 단일 페이지 모드 시 markdown 폴더 없이 루트 md 파일 인식 지원 (103203c)
- **Issue16**: 단일 페이지 프로젝트 (3603790)
- **Issue15**: 챕터별 페이지 markmap depth 별도 설정 (3603790)
- **Issue14**: 챕터별 프로젝트 (3603790)
- **Issue13**: Markmap Depth 설정 및 표시 오류 수정 (eaa5870)
- **Issue12**: font_size_auto 미작동 수정 (7bbeaac)
- **Issue11**: 스타일 상세 설정 (84ddacb)
- **Issue10**: 개요 페이지 컬럼 수 제한 (2982855)
- **Issue7**: 개요1 페이지 반응형 다단 레이아웃 (a0f7f03)
- **Issue8**: index.html 네비게이션 개선 (2d6421a)
- **Issue9**: 챕터 간 네비게이션 개선 (2d6421a)
- **Issue6**: 이미지/SVG 크기 옵션 추가 (f047fbb)
- **Issue4**: 리스트 (08e8483)
- **Issue5**: 제목 크기 및 패딩 설정 (08e8483)
