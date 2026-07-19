# Issue Management
* https://github.com/Finfra/m2slide/issues
* Issue HWM: 293
* Checkpoints:
    - bf2efa7 (2026-07-13) 작업 트리 스냅샷
* 오래된 Issue는 `z_old/old_issue.md`에 저장
* Save Point :
    - **v0.8.0 (2026-07-13)** — release: 라이선스 이중화(CC BY 4.0 + 상업, LICENSE.md 신설) + dev-server 확장(/s/·/n/ semantic 분리, /pd/ 덱 목록, 설정 GUI, 피드백 루프) + default_dark 테마·palette 시스템 + authoring-pipeline 학습 루프(slide-tuner·ppt2m2slide·note-writer) + self-contained vendor 자산. 완료 이슈 159건 z_old 아카이브.
    - **v0.7.0 (2026-05-06)** — release: `/deploy-docs` 신규 커맨드 + `_config.yml: deploy_formats` 옵션 (EPUB/PDF/PPTX 자동 빌드·배포 + 메인 인덱스 카드 다운로드 배지) + agenda 다운로드 버튼 위치 변경(우상단 헤더 → `.layout-_agenda` 우하단 absolute, 마스코트 충돌 회피). v0.6.x 시리즈(Issue71-126 + Issue127-128) 누적 z_old 아카이브.
    - **v0.5.0 (2026-05-03)** — release: 71건 완료 이슈 z_old 아카이브, CHANGELOG.md 신규 (Issue70까지 포함)
    
# 🤔 결정사항
* _meta.yml파일 사용 안함 : AGENDA.md나 {프로젝트명}.md파일의 yaml front matter에 추가하기로 함. 
* 현재 프로젝트가 contents 생성에 치중함에 따라 m2slide모듈은 분리되어야하나 지금은 생성되는 컨텐츠와 slide생성이 밀접하고 scar부분에 한정되어 있어서 한동안 함께 진행 후 분리하고 push예정.
* 배포를 위해 가급적 scar는 프로젝트 폴더에 배치함. 
## img 폴더 이중 복사 유지
* 소스 `img/` + 빌드 `slide/img/` 이중 복사(`fs.cpSync`) 유지 — `slide/` 통째 재생성 빌드 패턴 대응. 영상 등 기타 리소스 동일.

## 개별 에니메이션 지원
* 로우·값 단위 개별 애니메이션 지원(VideoMaker 영상 플레이용). Issue149 완료 — reveal.js `<!-- .element: class="..." -->` + Pandoc `{.fragment}` 병존.

# 🌱 이슈후보
1. **이미지 정밀 편집(색만·글자만 교체) 지원** — schnell img2img 로는 불가(strength 0.3↑ 원본 복제 / 0.1 재해석 드리프트, 2026-07-13 실측). edit 전용 모델(Qwen-Image-Edit·FLUX Kontext, ~수십 GB) 설치가 선행 조건이며 설치·큐 연동은 prj55 소관. 모델 확보 통지 시 이슈 승격 (Issue293 스타일 통일과 구분되는 별개 기능)

# 🔥 진행 중

# 📕 중요

# 📙 일반

# 📗 선택

# ✅ 완료

## Issue293. 공개 이미지 스타일 통일 (free_image → img2img) + 이미지 백엔드 img-add 전환 (등록: 2026-07-19, 해결: 2026-07-19, commit: c28d94f) ✅
* 목적: free_image(Openverse CC)로 받은 사진이 덱의 톤·스타일과 따로 노는 문제를 img2img 재해석으로 해소하고, 2026-07-13 이후 신설된 글로벌 스킬 `img-add`(fg1 주력·jm4 폴백 자동 라우팅)로 이미지 생성 호출 경로를 통일한다.
* 설계: `_doc_arch/media-creater-image-backend.md`
* 상세:
    - 현재 `data/media-creater/tools.yml` 의 `local_image_gen` 은 `mflux-enqueue` 를 직접 호출 — jm4 고정 경로라 fg1(NVIDIA) 자원을 못 쓰고, 글로벌 `img-add` 의 백엔드 판정·반응형 강등을 우회한다
    - img2img 자체는 두 하위 스킬(flux-fg1·flux-jm4)이 `--image-path`·`--image-strength` 로 이미 지원 — m2slide 쪽 카탈로그에 소비 경로가 없어 미사용 상태
    - **스코프 = 스타일 통일 한정**. 정밀 편집(색만·글자만 교체)은 schnell 구조상 불가(실측)이라 본 이슈에서 제외 — 이슈후보1로 분리
    - 파생물 저작권: CC 사진을 img2img 로 변형해도 2차적저작물이므로 원본 출처 표기 의무는 유지되어야 함
* 구현 명세:
    - `data/media-creater/tools.yml` (수정 전 `./lib/tuner/backup-data-yml.sh` 의무)
        - `local_image_gen`: handler `mflux` → `img-add`, invocation 을 img-add 스킬 위임으로 교체. 직접 `mflux-*`·`flux-fg1`·`flux-jm4` 호출 금지 가드 유지
        - 신규 도구 `image_restyle` 등재: `--image-path`(free_image 산출물) + `--image-strength 0.5~0.7` 로 스타일 재해석. `source_attribution: inherit_from_source` (원본이 CC면 출처 표기 승계)
        - `processing_policy.style_unification`: Info.md `image_style` 지정 + free_image 산출물 사용 시에만 opt-in 적용, 실패 시 원본 사진 그대로 유지(강등)
    - `_doc_arch/media-creater-image-backend.md`: 백엔드 호출 경로(img-add) 갱신 + 스타일 통일 절 신설 + 정밀 편집 한계 명시
    - 검증: `./m2slide.sh --lint-data` 통과
* 결과 (2026-07-19):
    - `local_image_gen` handler `mflux` → `img-add`. invocation 을 스킬 위임 규약으로 교체, `mflux-*` 직접 실행 + `flux-fg1`·`flux-jm4` 하위 스킬 직접 호출 전면 금지 가드 유지
    - `image_restyle` 신설 (type `photo_restyle`) — img2img `--image-path`·`--image-strength 0.6` 기본. 후처리 전용이라 `image_fallback_chain` 미포함, 실패 시 `keep_original`
    - `processing_policy.style_unification` 신설 — Info.md `image_style` 명시 + free_image 산출물 + 비인물 3조건 AND opt-in
    - 출처 승계: `source_attribution: inherit_from_source` + CREDITS.md "변형함(adapted)" 명시 + 원본 파일 보존
    - 인자명 대조 검증: `img-add` SKILL.md 116행에 `--prompt`·`--output`·`--project`·`--image-path`·`--image-strength` 동일 이름 패스스루 확인
    - `./m2slide.sh --lint-data` 통과 (파싱·categories↔priority·promotion status 3종 전부 ✅)
    - 미해결 이관: 정밀 편집(색만·글자만)은 edit 전용 모델(prj55 소관) 대기 → 이슈후보1. `image_restyle` 실사용 검증은 `_doc_arch` 🚧 TODO

## Issue292. 라이선스 표기 자동 삽입 — 첫 장·마지막 장 뱃지 + 대비 규칙 (등록: 2026-07-14, 해결: 2026-07-14, commit: 659f9f1) ✅
* 목적: LICENSE.md 이중 라이선스 정책("모든 산출물의 첫 장·마지막 장에 'Powered by finfra.kr, Made by m2slide' 표기 유지 의무", CC BY 4.0 근거)을 실제 빌드 산출물에 강제 반영.
* plan: `_doc_work/plan/license-attribution_plan.md`
* task: `_doc_work/tasks/license-attribution_task.md`
* 설계: `_doc_arch/license-attribution.md`
* 최종 확정 사양 (2026-07-14 사용자 시각 컨펌 2회):
    1. 위치: 하단 중앙 (`left:50%; transform:translateX(-50%);`) — 초안(우하단)에서 사용자 피드백으로 변경
    2. 자동 보정: 빌드마다 첫/마지막 top-level section(agenda.html 등 standalone 페이지 포함)에 자동 삽입, 삽입 후 자체 검증(`console.error` fail-loud)
    3. 크기: 하한 `--m2-license-fs-min: 0.55em` / 기본 `--m2-license-fs: 0.65em`, `max()`로 축소 무력화
    4. 색상: 전용 변수 `--m2-license-fg`(진한회색 — light `#5a5a5a` / dark `#9fa1b2`) — 순수 `--kn-text` 재사용안에서 "너무 진하지 않게" 피드백으로 분리. `--kn-accent` 저알파 `text-shadow`로 은은한 노랑 그림자 추가
    5. 대비: WCAG 2.1 contrast ratio(≥4.5:1) 채택 — 사용자 초안(채도/명도/색상差 규칙)보다 표준적인 방법으로 대체 승인받음. `--lint-license` subcommand 신설, 전 테마(default/default_lec/default_dark) 6.7~6.9:1로 통과
    6. `license_attribution: false` 시 빌드 로그에 위법 소지 경고 (하드 차단 아닌 warn)
* 구현 명세:
    - `lib/config.js`: `licenseAttribution` 파싱 + false 시 경고 로그
    - `lib/generate-slides.js`: 첫/마지막 section 판정(chapter/single 분기) + `injectLicenseBadge`/`verifyLicenseBadge` (reveal 덱 + standalone 페이지 양쪽 대응)
    - `theme/_shared/components.css`: `.m2-license-badge` 스타일, `theme/default_dark/slide.css`: `--m2-license-fg` override
    - `lib/lint-license.js` + `m2slide.sh --lint-license`: 테마별 WCAG 대비 자동 검증
    - `_config.org.yml`·`lib/dev-server/server.py`·`_doc_arch/config-gui.md`: `license_attribution` 키 4곳 동기화
    - 19개 활성 프로젝트(`Projects/*`, `_*`/`z_*` 제외) 전체 재빌드 — `--lint-deployment`·`--lint-license` 통과 확인
* 검증: 대표 샘플(default/default_lec/default_dark × single/chapter) iframe 실시간 검토 페이지로 사용자 2회 시각 컨펌(위치·크기·색 조정 1회 반영 후 최종 승인) → 전체 소급 적용

# ⏸️ 보류

## Issue265. policy 데이터 yml 목적 지향(goal-oriented) 스키마 + confidence 가중치 도입 — 정책 무력화·오변경 예방 (등록: 2026-07-06, 보류: 2026-07-11)
* branch따서 작업할 것. 
* 보류 사유: 대규모 변경(triage 복잡) — 착수 시점 조정. plan/task 작성 완료 상태로 보류.
* 재개 예정: 2026-07-15 (수) — prj5 aoa-mq 리마인드 등록
* 목적: `data/<stage>/*.yml` 정책이 (A) 파일명 정규식 하드코딩으로 조용히 무력화되고(`drop_redundant_page_screenshot`가 `pdf-p\d+`만 검출 → AgenticCoding `sNN_i1.png` bleed 8건 미검출), (B) 일괄 커밋(chore bulk)에 섞여 회귀 원인 격리가 불가하며, (C) 학습 사례 1건이 즉시 전역 enforce로 승격되어 과소/과대 일반화 위험을 안는 구조적 약점을 차단.
* plan: `_doc_work/plan/policy-goal-schema_plan.md`
* task: `_doc_work/tasks/policy-goal-schema_task.md`
* 분석 문서: http://jm4.local:9876/htm-doc?path=/Users/nowage/_git/__all/videoMaker/lib/m2slide/_doc_work/z_htm/hub_htm_20260706_210035_a_policy-history.htm (git history 사례 A/B/C + 예방책 ①~⑤ 상세)
* 상세:
    - 사례 A (목적·수단 불일치): commit `4b38619` 정책의 goal은 "재구성 성공 슬라이드에 통짜 래스터 0건"이나 구현은 특정 파일명 패턴 — 다른 추출 네이밍(sNN_iM)에서 무력화. 2026-07-06 AgenticCoding 튜닝에서 실증
    - 사례 B (일괄 커밋): `01ad51a`·`80cd65b`·`b580e13` — 정책 yml+코드+산출물 혼합 커밋. theme fallback 회귀 원인 코드가 `01ad51a`에 숨어 있었음 (기존 Issue 기록)
    - 사례 C (단일 사례 즉시 enforce): 7/3 백업 diff 기준 하루 3룰 추가 전부 사례 1건 근거 + 예외조건(`keep_screenshot_when`)이 자연어라 기계 판정 불가
* 구현 명세 (분석 문서 ①~⑤ — 대규모 변경이라 등록만, 착수 시 plan 필수):
    - ① goal-oriented 스키마: 각 룰에 `goal:`(검증 가능 목표) + `goal_check:`(속성 기반 판정 — 면적·종횡비·빈 alt 등) + `detect_hints:`(파일명 정규식은 힌트로 강등)
    - ② confidence 가중치: `evidence:` 구조화 필드 기반 low(=proposal)/medium(=warn+apply)/high(=enforce) 3단계 적용 강도. promote-to-data.py 연동
    - ③ 정책 yml 단독 커밋 규율 (bulk commit에 data/*.yml 혼입 금지)
    - ④ `--lint-data` 확장: enforce 룰이 goal_check 없이 정규식만 가지면 경고 + 산출물 검사(정책 on인데 위반 잔존 시 fail-loud)
    - ⑤ 학습 사례 골든 픽스처화: rationale 사례 슬라이드 재변환 회귀 테스트
    - 우선순위: ①+④ (사례 A 직접 차단) → ② (사례 C 구조 개선) → ③⑤
    - triage: 복잡 (heuristics.yml 스키마 개편 + promote-to-data.py + lint 확장 — 설계 결정이 후속 이슈에 영향)

## Issue145. Fragment 단계별 등장 + 색 강조 동시 적용 syntax 부재 (등록: 2026-05-10, 보류: 2026-05-10)
* 목적: 한 요소에 두 개의 fragment-index를 거는 reveal.js 표준 패턴(등장 → 다음 단계에서 색 강조)을 m2slide 마크다운으로 자연스럽게 표현할 수 있게 함. 현재 인라인 attribute `{.fragment .highlight-red}`는 단일 class 세트만 li/p에 주입하므로 등장과 색 강조를 분리 적용할 수 없음.
* 카테고리: Generator
* 보류 사유: 사용자 결정 — 진행하지 않는 것으로 보류. 현재 raw HTML 우회 경로가 존재하고 사용 빈도가 낮아 우선순위 후순위. 재개 시 본 문서의 구현 명세 그대로 활용 가능.
* 재개 조건:
    - 사용자 명시 요청 또는 fragment-index 다단계 요구 사례 누적
    - reveal.js markdown syntax 호환성 강화가 다른 이슈와 묶여 일괄 처리 가능한 시점
* 상세:
    - 위치: `lib/markdown.js` `extractInlineClasses()` (L96-123) + list/paragraph 적용부 (L419-423, L495-, L661-)
    - 케이스 1: `Projects/animationTest/animationTest.md` L42-45 — reveal.js 표준 주석 `<!-- .element: class="..." -->` 가 그대로 텍스트로 출력되어 무효 (m2slide는 reveal.js markdown 플러그인을 사용하지 않음). 산출 `slide/index.html` L1493-1496에서 주석이 `<li>` 본문에 그대로 포함된 상태 확인
    - 케이스 2: `Projects/animationTest/animationTest.md` L51-55 — `{.fragment .highlight-red}` 적용 시 reveal.js 사양상 `.highlight-*`는 처음부터 visible. 결과적으로 step 0에서 첫 번째·세 번째 항목만 보이고 두 번째 자리에 빈 공간 발생 (사양 동작이지만 사용자 의도 표현 한계)
    - reveal.js 사양 근거: `.fragment.highlight-{red,green,blue,...}` selector는 `opacity:1; visibility:inherit` 시작 + `.visible` 단계에서 `color` 변경 (등장 효과 아님)
    - 사용자 요구 시나리오: "두 번째 항목 등장 → 세 번째 항목 등장 → 세 번째 항목 빨간색 강조" 같은 3단계 fragment-index 시나리오
    - 현재 우회: raw HTML로 `<ul>` 전체를 작성 + `<span class="fragment highlight-red" data-fragment-index="N">` 중첩 — 가독성·유지보수 저하
* 구현 명세 (재개 시):
    - **옵션 A (권장)**: reveal.js 표준 주석 syntax 지원
        - 패턴: `<!-- .element: class="fragment fade-up" data-fragment-index="2" -->` 를 직전 li/p에 매칭하여 class 병합 + data-* 속성 주입
        - 매칭 정규식 후보: 라인 끝 또는 li/p 종료 직전의 `<!--\s*\.element:\s*([^>]*?)\s*-->` 캡처 → attribute 토큰 분리 (`class="..."`, `data-*="..."`)
        - 적용 지점: `convertMarkdownToHTML()` 내 list 항목 처리 직후 후처리 단계, paragraph 종결 직전 후처리 단계
        - 장점: reveal.js 표준 호환, fragment-index·data-autoslide·data-background-* 등 모든 속성 자유 지정, 학습 곡선 낮음
    - **옵션 B (보조)**: 인라인 attribute에 `key=value` 토큰 확장
        - `{.fragment .highlight-red data-fragment-index=3}` 형태로 attribute key=value 토큰 허용
        - `parseLayoutAttrs()` (L126~) 패턴 재사용 가능 — 이미 width=, height= 토큰 처리 중
        - 옵션 A와 충돌 없이 보조로 도입 가능
    - **옵션 C (선택)**: chained class 표기 — `{.fragment}{.highlight-red data-fragment-index=2}` 시 한 요소에 여러 fragment를 자동으로 wrapping `<span>`으로 감싸는 syntax sugar
    - 우선순위: 옵션 A → B → C 순서로 단계 도입. 옵션 A만으로도 사용자 요구 시나리오 충족
    - 기존 `{.fragment .highlight-red}` 동작은 호환성을 위해 유지 (deprecation 없음)
    - 보호 규칙 추가: 코드 인라인 안의 `<!-- ... -->`, code block 내부의 주석은 매칭 제외
* 검증 (재개 시):
    - `node --test lib/__tests__/markdown.test.js` 통과 (신규 테스트 케이스 포함)
    - `./m2slide.sh animationTest` 빌드 후 `slide/index.html`에서 fragment-index·class 정확 주입 확인
    - 브라우저 수동 확인: step 진행 시 의도 단계 등장·색 강조 순서 일치
* 후속 작업 (재개 시):
    - `.claude/rules/md-m2slide-rules.md` "단계별 등장 — Pandoc inline attribute (Issue118)" 섹션에 옵션 A 신규 syntax 사례 추가
    - `Projects/animationTest/animationTest.md` 슬라이드 3·4 갱신 — 신규 syntax 데모로 전환

## Issue42. `slide_ratio` 옵션 완전 제거 (보류: 2026-05-01)
* 목적: theme 시스템 도입 후 사실상 단일 분기(`none`)만 사용되는 `slide_ratio` 옵션을 코드·CSS·설정에서 완전 제거
* 상세:
    - 도입 배경: c0a24ef(2025-11-28)에서 Reveal.js 기본 중앙정렬을 끄기 위해 `.ratio-none`/`.ratio-16-9`/`.ratio-3-2` 클래스 + `Reveal.initialize({width,height})` 분기로 도입
    - 현재 상태: 모든 프로젝트 `_config.yml`이 `none`만 사용. `16:9`/`3:2` 분기는 데드 코드
    - 1차 정리(2026-05-01): `_config.org.yml`에는 옵션을 남겨두고, `Projects/{layoutTest, m2SlideStyle2_chapter, MarkdownGraph}/_config.yml`에서 라인 제거 완료
* 보류 사유: `.reveal.ratio-none .slides { inset:0; transform:none }`이 현 레이아웃의 핵심 reset이므로 단순 제거는 불가. 셀렉터를 `.reveal .slides`로 바꾸는 css 수정이 필요한데 [`CLAUDE.md`](CLAUDE.md) "CSS 수정 시 주의사항"의 위험 속성(`transform`, `position`, `inset`)에 직접 닿는 작업이라 회귀 테스트 비용이 큼. theme 시스템 안정화 후 재개.
* 재개 조건:
    - default·nowage 양쪽 테마에서 `.ratio-none` 의존성을 한꺼번에 제거할 수 있는 시점
    - 모든 프로젝트의 첫·중간·끝 슬라이드 시각 회귀 테스트 자동화 마련
* 구현 명세 (재개 시):
    - `lib/generate-slides.js:10,48-51,1486-1499,1738,1765-1766` `SLIDE_RATIO`/`ratioClass`/`revealWidth`/`revealHeight` 분기 삭제
    - `theme/default/slide.css:55,67`, `theme/nowage/slide.css:57,69` 셀렉터 `.reveal.ratio-none` → `.reveal`
    - `_config.org.yml:50` 라인 제거
    - Reveal.initialize 호출부 width/height 인자 제거 (기본값 위임)

# 🚫 취소

# 📜 참고

## Issue25. 배경 이미지 설정 기능 (보류: 2026-05-01)
* 마크다운 메타데이터(YAML frontmatter)를 통해 전체 슬라이드의 배경 이미지를 지정하는 기능 구현
* `background` 속성으로 이미지 경로 혹은 color 지정 지원
* **보류 사유**: theme/{name}/slide.css 시스템(Issue36/38)으로 동일 목적 달성 가능 (ex: `.reveal { background: url('img/bg.png') center/cover; }`). 비기술 사용자가 마크다운만으로 슬라이드별 배경을 자주 바꾸는 use-case가 누적되면 재검토.

