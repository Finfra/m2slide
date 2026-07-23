# Issue Management
* https://github.com/Finfra/m2slide/issues
* Issue HWM: 307
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

# 🔥 진행 중

# 📕 중요

# 📙 일반

# 📗 선택

## Issue305. 이미지 정밀 편집(색만·글자만 교체) 지원 (등록: 2026-07-23)
* 목적: schnell img2img 로는 부분 정밀 편집 불가(strength 0.3↑ 원본 복제 / 0.1 재해석 드리프트, 2026-07-13 실측). edit 전용 모델 기반 img-add `--edit` 모드를 media-creater 가 소비하여 슬라이드 이미지의 색·글자만 정밀 교체. Issue293 스타일 통일과 별개 기능.
* depends: prj3#Issue277
* trigger: prj3#Issue277 ✅ 완료 (img-add `--edit` 가용) + commit hash 기록
* 상세:
    - 진입점은 반드시 img-add (글로벌 SCAR). media-creater 는 flux 직접 호출 금지 — img-add `--edit` 경유 (img-add 필수 원칙 계승)
    - 선행 체인: prj55 fg1 edit 모델 설치 → prj3#Issue277 img-add `--edit` 모드 → 본 이슈 media-creater 소비
    - edit 모델·큐 연동은 prj55(DeviceManagement) 소관 — 본 프로젝트 범위 밖. fg1 `~/apps/flux/models/` 현재 비어있음(2026-07-23 확인) → 구현 착수 불가, 설계만 확정
* 구현 명세:
    - `data/media-creater/tools.yml` 에 edit 도구 항목 추가: 정밀 부분 편집(색·글자 교체) 용도. when-to-use = 기존 이미지 재생성이 아닌 국소 수정(구도 보존 필수)
    - media-creater agent: 편집 후보 감지 시 `img-add --edit --image-path <slide img> --edit-instruction "<색/글자 지시>" --edit-type color|text` 명세 생성
    - 산출물 경로: 기존 media placeholder 규약 재사용 (Projects/<Name>/img/ 갱신)
    - 검증: edit 모델 가용 환경에서 색만/글자만 교체 각 1건 실측 (원본 구도 보존 확인)
    - data-access-rules: tools.yml 수정 전 backup 선행 + 정책 yml 단독 커밋

## Issue307. 런타임 relax 게이팅 소비 — enforce 스캐너가 덱 purpose 로 룰 완화 (!) (등록: 2026-07-23)
* 목적: Issue295 가 정의한 축 2 필드(룰 `applies_to_purpose`/`relax_when` + Info.md `purpose`)를 실제 런타임에서 소비. enforce 스캐너(`lib/lint-policy-artifacts.py`)가 대상 덱의 `purpose.primary` 를 읽어, 룰의 `relax_when` 에 포함된 목적의 덱에서는 위반을 skip(광고·아카이브 덱에서 통짜 래스터 등 정당 허용). Issue295 는 필드·lint 정의까지였고 스캐너가 아직 purpose 를 읽지 않아 런타임 완화가 미작동.
* depends: Issue295
* trigger: Issue295 ✅ 완료 (축 2 필드·lint 검사 10·11 정착, commit 7263d61·795fde7) + 스캐너의 아티팩트→덱 purpose 매핑 설계 확정

# ✅ 완료

## Issue295. 덱 목적(purpose) enum 도입 — 정책 적용 강도의 덱 용도 스코프 (등록: 2026-07-20, 해결: 2026-07-23, commit: 7263d61, 795fde7) ✅
* 목적: 정책 룰이 모든 덱에 무차별 전역 강제되는 구조를 해소한다. 강의 덱에서 결함인 것(통짜 래스터·텍스트 미추출)이 광고 덱에서는 의도된 선택일 수 있으므로, 덱의 용도를 1급 메타로 두고 정책 적용 강도를 그 축으로 스코프한다.
* 스코프 결정 (2026-07-23 사용자 A 선택): 본 이슈 = **스키마·필드·수집·lint 검증까지**. 런타임 완화 게이팅 소비는 enforce 스캐너 부재(현 2종만)로 검증 불가 → Issue307 로 분리.
* 완료 범위:
    - 설계 SSOT `_doc_arch/policy-goal-schema.md`(로컬-전용, gitignore) "축 2 — 덱 목적(purpose)" 절 신설 — `purpose` enum 5종(lecture/info/promo/handout/archive) + `{primary,secondary}` 구조 + 룰 소비 필드 `applies_to_purpose`/`relax_when` + `confidence`×`purpose` 2차원 매트릭스. line32 `🚧 TODO` 해소.
    - 수집(7263d61): `data/info-filler/questions.yml` purpose 질문 1건(default lecture) + `data/Info.template.md` frontmatter `purpose` (canonical 위치).
    - lint(795fde7): `lib/lint-policy-schema.py` VALID_PURPOSE + 검사 10(룰 `applies_to_purpose`/`relax_when` 값 유효성) + 검사 11(Info.md `purpose` frontmatter enum·구조) + L2 override 반영. `--lint-data` 통과·purpose 미기재 aggregate info line(13개→lecture).
    - 골든 픽스처(795fde7): `z_test/run-purpose-fixture.sh` + `z_test/fixtures/policy/purpose/` negative — 검사 10·11 fail-loud 4건 회귀 고정.
    - 마이그레이션: `purpose` 미기재 = `lecture` 간주 — 기존 동작 회귀 0.
* 파급 지점 판정: `data/md-builder/styles.yml`·`data/slide-tuner/patterns.yml` 은 런타임 *소비* 지점이라 Issue307(스캐너 확장)에서 처리 — 본 이슈 미변경(회귀 0). 원 명세의 "--lint-data purpose 경고"는 aggregate info line 으로 구현(미기재 = 정상 fallback 이라 per-deck 경고는 노이즈).
* 검증: `./m2slide.sh --lint-data` 통과(goal 9룰 + 검사 10·11) · `z_test/run-purpose-fixture.sh` rc0 · `z_test/run-policy-fixture.sh` 회귀 통과. questions.yml backup 선행 + 정책/코드 커밋 분리.
* 근거 문서: `_doc_work/htm/hub_htm_20260720_192649_a_goal-taxonomy.htm`, plan `_doc_work/plan/purpose-enum_plan.md`

## Issue306. Issue304 goal 룰 5건 enforce 스캐너 + 골든 픽스처 (등록: 2026-07-23, 해결: 2026-07-23, commit: d7d514c) ✅
* 목적: Issue304 가 goal 스키마로 전환한 5룰의 `goal_check` 술어에 실제 산출물 판정 코드가 미구현이라 enforce 불가. 각 술어별 스캐너 + 골든 픽스처로 enforce 승격 기반 마련.
* depends: Issue304
* 완료 범위 — `lib/lint-policy-artifacts.py` 검사 3~6 신설 (파일명 아닌 속성 판정):
    - 검사 3 `h1_not_duplicate_title` (agenda 2룰): 첫 본문 H1 ↔ frontmatter.title·AGENDA 상위 제목 정규화 대조(선두 번호·강조 제거)
    - 검사 4 `note_not_echo_body` (note-writer): 노트 블록 ↔ `#id-` 대응 슬라이드 bullet `SequenceMatcher` 유사도 ≥0.9
    - 검사 5 `require_source_url` (media-creater): CREDITS.md(외부 CC 권위 목록) 항목 URL 존재 + 등재 이미지 사용 슬라이드 `::: source` 존재. CREDITS.md 보유 프로젝트 옵트인
    - 검사 6 `text_pattern_absent: \bSmartArt\b` (ppt2m2slide): `_pipeline` 옵트인 역변환 산출물 상표어 스캔(코드펜스 예외)
* confidence 게이팅: low=미적용(픽스처 검증만)·medium=warn·high=enforce. 5룰 전부 low → 실 프로젝트 무영향(회귀 0). evidence 축적 시 승격.
* 골든 픽스처 4종 (`z_test/fixtures/policy/{h1-dup-title,note-echo,source-attribution,smartart-hygiene}/`): 룰마다 위반 검출 + 오검출 방지 케이스. importlib 로 `check_*` 직접 호출(confidence 무관) — 파일명 의존 회귀 차단.
* 검증: `run-policy-fixture.sh` 회귀 통과(신규 11개 assert) + `./m2slide.sh --lint-data` rc0 + schema lint rc0. 정책 yml 미수정 → 커밋 규율 무관.
* 설계 SSOT: `_doc_arch/policy-goal-schema.md` "산출물 enforce 스캐너 (검사 9)" 절 추가.

## Issue304. Issue296 잔여 — 정책 goal 룰 5건 전환 (등록: 2026-07-23, 해결: 2026-07-23, commit: cc7c3bb, aa02a9b, 67e47aa, fa364e8, c8f5d92) ✅
* 목적: Issue296 파일럿(md-builder 3룰)에서 남긴 잔여 goal 전환 대상 5건. 각 룰이 목적 없는 플래그·주석 상태라 사례 A 형(파일명 의존 무력화)에 노출됨.
* 완료 범위 — 5룰 **goal-oriented 스키마 전환** (goal_type/goal/goal_check 속성 spec + detect_hints 로 기존 정규식·자연어 조건 이관, confidence: low):
    - agenda-designer 2건: `chapter_no_redundant_title_slide`·`h1_no_duplicate_with_title` → hygiene / `h1_not_duplicate_title` (cc7c3bb)
    - note-writer 1건: `no_verbatim_echo` → hygiene / `note_not_echo_body` (67e47aa)
    - media-creater 1건: `external_cc_source_attribution` 신설 → attribution / `require_source_url` (fa364e8)
    - SmartArt 상표어 1건: `smartart_trademark_hygiene` 신설(ppt2m2slide) → hygiene / `text_pattern_absent(\bSmartArt\b)` (c8f5d92)
* 판정 이탈 기록: SmartArt 룰은 이슈 상세가 "(consistency)" 라벨했으나 consistency 계열에 상표어 부재 술어가 없고 hygiene/`text_pattern_absent` 가 정확한 의미 → **hygiene 확정**(라벨보다 술어 정합성 우선, 룰 주석에 근거 기재).
* 인프라: `data/*` gitignore 화이트리스트에 note-writer·media-creater stage 누락분 추가 (aa02a9b) — 두 stage 정책 yml 추적 가능화.
* 검증: `./m2slide.sh --lint-data` 통과(goal 룰 9개 검사 4~8) + `z_test/run-policy-fixture.sh` 회귀 통과(산출물 위반 0·L2 override·텍스트 위생). 4개 yml 수정 전 backup 선행 + 정책 yml 단독 커밋 규율 준수.
* 후속: enforce **판정 코드(스캐너)·골든 픽스처**는 Issue306 으로 분리 (Issue304 자체가 "판정 코드는 룰별 후속"으로 프레임 — 현 스캐너는 text_pattern_absent·sole_image 2종만 구현). 스캐너 정착 후 confidence medium/high 승격.
* 근거 문서: `_doc_work/htm/hub_htm_20260721_215009_a_yml-audit.htm`

## Issue300. 슬라이드 부제목 표시 정책 결정 (등록: 2026-07-21, 해결: 2026-07-23, commit: d094fda) ✅
* 목적: 상위 프로젝트 videoMaker(prj41) Issue19에서 위임. videoMaker Issue9(2026-04-13, commit 8fddb16)로 frontmatter `subtitle` 렌더링 자체는 구현됐으나, "그대로 노출 / 제거 / 상위 주제 값으로 대체" 중 어느 정책을 취할지 미결정 상태였음.
* 결정: **(c) 현행 유지 확정** — frontmatter `subtitle` 값을 `_cover` layout `{{subtitle}}` slot 에 그대로 노출하는 현행 동작을 정책으로 확정. 코드 변경 없음.
* 근거:
    - subtitle 렌더 지점은 `_cover` layout 1곳뿐 (title-card 는 미표시) — 임시 상태가 아니라 이미 국소화된 명확한 동작.
    - `subtitle:` frontmatter 사용 프로젝트 21개 — (a) 제거·(b) 상위 주제 대체는 21개 데크 표시를 일괄 변경하는 회귀 리스크. (c) 는 회귀 0.
    - 저자가 frontmatter 에 subtitle 을 명시하는 것은 명시적 의도 — 자동 제거·대체보다 저자 입력 존중이 KISS.
* 정책 결정 폼: `_doc_work/htm/hub_htm_20260723_182841_b_subtitle-policy.htm` (사용자 (c) 선택)
* 후속: 상위 videoMaker(prj41) Issue19 에 "정책=현행 유지 확정" 결과 반영 필요 (본 repo 범위 밖).

## Issue303. data/htmlart/types.yml type_count drift 교정 (등록: 2026-07-23, 해결: 2026-07-23, commit: bc3e77d) ✅
* 목적: `data/htmlart/types.yml` `type_count: 26` 선언이 실제 타입 수(코드 `HTMLART_TYPES` Set 27 · yml 타입 키 27 · `_doc_arch` 문서 27종)와 어긋난 SSOT drift. Issue299 감사 중 발견(out-of-scope 로 이관됐던 건).
* 근본 원인: v6 serpentine `bend_process`(Issue218, Bending Process 흡수)가 타입 헤더 주석 열거에서 누락 → 열거 합계가 26 으로 고정. 코드·yml 키·설계문서는 27 로 정상이었음.
* 구현: `type_count: 26`→`27`, 헤더 주석 `26종`→`27종` + `v6 워크플로 1`→`v6 워크플로·serpentine 2`, `bend_process` 열거 행 추가.
* 검증: type_count 27 == yml 키 27 == 코드 Set 27 정합. `./m2slide.sh --lint-data` 통과. backup 선행(`data/htmlart/_backup/20260723-182041-types.yml`).

## Issue301. 챕터 경계에서 ←/→ 화살표 회색 노출 + 클릭 위임 (등록: 2026-07-21, 해결: 2026-07-23, commit: 3d44c4d) ✅
* 목적: 마우스/터치 클릭으로 다음/이전 페이지 이동 가능하게 함. reveal.js 기본 동작은 챕터 첫/마지막 슬라이드에서 ←/→ 컨트롤을 숨겨(`.enabled` 제거 + `disabled` 속성) 클릭 불가. m2slide는 챕터 경계에서 →가 다음 챕터, ←가 이전 챕터로 이어지므로 화살표를 숨기면 안 됨.
* 방향 전환 경위:
    - 최초(2026-07-21): 별도 원형 `m2-nav-arrows` 버튼을 8개 layout에 추가 → 사용자가 스크린샷으로 지적한 대상은 기존 reveal.js **다이아몬드 컨트롤**(우하단 마름모)이었음. 원형 버튼은 다이아몬드와 중복되는 오해석 → 전량 revert
    - 확정(2026-07-23): 기존 다이아몬드 nav의 ←/→를 ↑/↓와 동일하게 "항상 회색 노출 + 클릭 위임"으로 처리
* 구현 완료:
    - ✅ 원형 `m2-nav-arrows` 전량 제거: 8개 layout HTML(`theme/default/layouts/*.html` 7종 + `theme/default_lec/layouts/_contents.html`) + base.css CSS 블록 + html-builder.js `setupMobileNavigation` 함수
    - ✅ CSS(html-builder.js): `.navigate-left/-right`를 ↑/↓처럼 항상 `visibility:visible` + `opacity:0.25`(회색), reveal의 `.enabled` 있으면 `opacity:1`, hover 0.7. `body[data-nav-indicator="page"]` 숨김 규칙은 specificity로 여전히 우선(회귀 0)
    - ✅ JS(html-builder.js): `m2UpdateNavControls`에서 매 slidechanged마다 ←/→의 `disabled` 속성 제거(disabled 버튼은 click 미발화) + `Reveal.on('ready')`에서 ←/→ 클릭을 `ArrowLeft/ArrowRight` 키로 위임 → 기존 키 네비게이션 매트릭스(마지막→다음챕터, 첫→이전챕터) 재사용
    - ✅ 검증(m2Slide 프로젝트, Playwright): 챕터1 마지막(3/3) → navigate-right `disabled:false` `opacity:0.25` / 1클릭 → 안내 메시지 / 2클릭 → 챕터2(2/1) 이동 / 중간 슬라이드 단일 클릭 1칸 전진(메시지 없음) / `--lint-deployment` 통과
* 근본 원인: reveal.js가 끝단 슬라이드에서 nav 버튼에 `disabled="disabled"` 부여 → disabled 버튼은 click 이벤트 미발화(CSS `pointer-events`로 못 뚫음). slidechanged마다 `removeAttribute('disabled')`로 해소
* 후속(2026-07-23): 마지막 슬라이드에서 → 가 우측으로 삐져나오는 위치 버그 — reveal 기본이 비활성 ←/→에 `transform:translateX(±10px)`를 남기고 `.enabled`일 때만 `transform:none`으로 제자리 복귀시킴. 회색(비활성) 상태에도 항상 노출하므로 `.navigate-left/-right`에 `transform:none !important` 강제 → 활성/비활성 무관 마름모 정위치 유지. 검증: 마지막 슬라이드 → x=1663(뷰포트 1707 내), transform:none
* 캡처: `_doc_work/capture/issue301-last-slide-gray-arrow.png`, `_doc_work/capture/issue301-last-slide-arrow-fixed.png`

## Issue302. agenda markmap 챕터 노드 확장 미작동 — 평면 AGENDA 챕터에 슬라이드 children 부재 (등록: 2026-07-21, 해결: 2026-07-21, commit: e6897c7) ✅
* 목적: 서브챕터(`### [..]`) 없는 평면 챕터 데크는 agenda 목차 markmap 의 각 챕터 노드 `children` 이 빈 배열이라 펼침 원이 그려지지 않아, 노드를 클릭해도 확장이 일어나지 않았다. `parseAgenda` 가 AGENDA.md 의 서브챕터 엔트리에서만 children 을 만드는 구조적 한계.
* 상세:
    - 재현: 평면 5챕터 데크(fWarrangeCliIntro·fSnippetCliIntro·m2slide_info 등) 목차에서 챕터 노드 클릭 시 무반응. `tocData` 각 챕터 `children:[]` 확인.
    - 대조: fPmIntro 는 `### [1.1 ..]` 서브챕터 보유 → 정상 확장. 즉 빌드 회귀 아닌 콘텐츠 구조 한계.
* 구현 명세:
    - 수정: [`lib/generate-slides.js`](lib/generate-slides.js) — `parseAgenda` 직후 보강. children 이 빈 챕터 노드에 한해 이미 생성된 챕터 HTML 의 실제 slide `<section>` 순서를 harvest → 각 슬라이드를 `chapter.html#/N` cross-page 앵커 children 으로 채움.
    - 앵커 정확성: 마크다운 소스 기반 `#/N`(generateTOCFromFile)은 prepend 되는 toc-placeholder Map Slide 를 반영 못 해 off-by-one 발생 → 산출 HTML DOM 순서를 신뢰(ground truth).
    - 회귀 방지: children 이 이미 있는 노드(서브챕터 보유)는 미변경. fPmIntro 서브챕터 노드(1·2·5장) 보존 + 서브챕터 없던 3·4·6장만 슬라이드 보강 확인. lint rc=0(fWarrangeCliIntro·fSnippetCliIntro). 대표 빌드(m2slide_info·chapter_mode·single_mode·fPmIntro) 정상.
    - 적용 범위: chapter mode 전 데크(평면 목차 데크 포함) — 순수 추가라 회귀 없음. 초기 펼침 단계 축소·옵트인 플래그화는 후속 필요 시.

## Issue298. 정책 yml 혼재 커밋 pre-commit 경고 훅 (등록: 2026-07-21) — 해결: 2026-07-21 (commit: 50de0fb) ✅
* 목적: Issue265 Phase 4 에서 커밋 규율을 문서화했으나 강제 수단이 없어, 사례 B(정책 yml + 코드 + 산출물 혼합 커밋으로 회귀 원인 격리 불가)가 사람 주의력에만 의존한다. 문서 규율을 기계 경고로 보강한다.
* depends: Issue265
* trigger: Issue265 ✅ 완료 (commit 1fc4c24, 70fca45) — 규율 문서(`data-access-rules.md` "정책 yml 커밋 규율") 확정됨
* 상세:
    - 규율 SSOT: `.claude/rules/data-access-rules.md` "정책 yml 커밋 규율" 절
    - Issue265 task 에서 선택 항목으로 취소(`- [x]`)했던 항목 — 규율 자체는 문서로 성립하나 위반 검출이 없음
    - `.git/hooks/` 는 git 추적 대상이 아니므로 repo 마다 개별 설치 필요 (graphify post-commit 훅과 동일 제약)
* 구현 명세:
    - staged 파일에 `data/<stage>/*.yml` 이 포함되고 동시에 그 외 파일(정책 문서·정책 lint 구현 제외)이 있으면 경고 출력
    - 차단이 아니라 경고 + 확인 프롬프트 — 정당한 동반 변경(설계 문서·lint 구현)이 존재하므로 hard fail 은 과함
    - 설치 스크립트 제공 (`z_test/` 또는 `lib/` 하위) + README 안내. `graphify hook install` 이 훅을 덮는 선례가 있으므로 재설치 시 패치 유실 주의 문구 포함
    - `_backup/` 하위 yml 은 판정에서 제외
* 결과: `lib/hooks/check-policy-commit.sh`(staged 정책 yml + 무관 파일 혼재 경고) + `install-hooks.sh`(pre-commit 설치, 기존 훅 chain append). bash 3.2 호환
* 동반 허용: 설계 문서·lint 구현·정책 픽스처. 차단 아닌 경고. `_backup` 제외
* 검증: 혼재(경고)·단독(무출력)·동반허용(무출력) 3케이스

## Issue297. L2 프로젝트 override 병합 결과의 goal_check 정합성 검사 (등록: 2026-07-21) — 해결: 2026-07-21 (commit: 3e350bb) ✅
* 목적: `--lint-data` 검사 4~6 이 L1(`data/<stage>/*.yml`) 정의만 검사하므로, 프로젝트 override(`Projects/<N>/_pipeline/policy/<stage>.yml`)가 `goal_check` 를 덮어써 판정을 무력화해도 lint 가 통과한다. 정책 cascade 와 goal 스키마가 각각은 검증되지만 **병합 결과는 아무도 검증하지 않는** 사각지대다.
* depends: Issue265
* trigger: Issue265 ✅ 완료 (commit 1fc4c24, 70fca45)
* 상세:
    - cascade 설계: `_doc_arch/pipeline-policy-cascade.md` (L1 글로벌 ↔ L2 프로젝트 deep-merge)
    - goal 스키마: `_doc_arch/policy-goal-schema.md` (룰의 목적·판정)
    - 두 축은 직교하나 병합 후 값이 스키마 규율을 지키는지는 미검사 — 동 문서 "룰 내부 스키마와의 경계" 절에 🚧 TODO 마커 부착됨
    - 위험 시나리오: L2 가 `goal_check` 를 빈 매핑으로 덮어 enforce 룰을 사실상 무력화, 또는 `goal_type` 계열 밖 술어를 주입
* 구현 명세:
    - `lib/lint-policy-schema.py` 에 병합 모드 추가 — 프로젝트별로 L1+L2 deep-merge 결과를 구성해 검사 4~8 재적용
    - L2 가 `goal_type` 자체를 바꾸는 것은 금지(룰의 정체성 변경) — 발견 시 실패
    - L2 가 `goal_check` 를 **완화**하는 경우 경고, **삭제**하는 경우 실패로 분리
    - 검사 대상 프로젝트가 늘면 비용 증가 → `_pipeline/policy/` 존재 프로젝트만 스캔
* 결과: `lib/lint-policy-schema.py lint_l2_overrides` — L1(data/<stage>/*.yml deep-merge)+L2 병합 결과에 검사 4·6 재적용. L2의 goal_type 변경·goal_check null 교체·계열밖 술어·룰 소멸 검출. `--lint-data` 검사 4 자동 포함
* deep-merge 시맨틱상 키 제거 불가 → 완화는 null 교체 형태로만 나타남을 반영
* 현재 실 override(feedback·note-writer)는 goal 룰 무관 0쌍, 픽스처 `z_test/fixtures/policy/l2-override/` 5쌍(P1~P5·OK)으로 검증

## Issue296. 나머지 정책 yml 9종 goal-oriented 전환 (등록: 2026-07-21) — 해결: 2026-07-21 (commit: 1e03c52, c63df03) ✅
* 목적: Issue265 가 파일럿 1종(`heuristics.yml`)만 전환했으므로, 남은 정책 yml 이 여전히 목적 없는 플래그·정규식 상태로 남아 사례 A 형 무력화에 노출되어 있다. `--lint-data` 검사 4가 매 실행 시 미전환 플래그 후보 43개를 보고하는 것이 그 가시화다.
* depends: Issue265
* trigger: Issue265 ✅ 완료 (commit 1fc4c24, 70fca45) — 스키마·lint 정착 확인됨
* 상세:
    - 대상 9종: `mappings.yml`(ppt2m2slide) · `patterns.yml`(slide-tuner·slot-designer·agenda-designer·note-writer) · `styles.yml`(md-builder) · `rules.yml`(layout-selector) · `tools.yml`(media-creater) · `questions.yml`(info-filler) · `channels.yml`(refs-collector)
    - `heuristics.yml` 내부에도 미전환 플래그 43개 잔존 — 파일 단위가 아니라 룰 단위 전환이므로 같은 파일을 여러 번 손대게 됨
    - 전환 판단 기준: 그 룰이 **위반을 검출해야 하는 룰인가**. 단순 설정값(임계치·목록·템플릿)은 goal 이 없으므로 전환 대상 아님
* 구현 명세:
    - 룰별로 `goal_type`(7종 enum) 선택 → `goal` 서술 → `goal_check` 판정식 작성. 기존 정규식·자연어 조건은 `detect_hints`·기계 판정 필드로 이관
    - `goal_check` 술어가 기존 7계열에 없으면 `_doc_arch/policy-goal-schema.md` 를 먼저 갱신하고 `lib/lint-policy-schema.py GOAL_CHECK_FAMILIES` 동기화
    - 각 yml 수정 전 `./lib/tuner/backup-data-yml.sh` 선행 + 정책 yml 단독 커밋 규율 준수
    - 전환 룰마다 골든 픽스처 1건 추가 권장 (`z_test/fixtures/policy/`)
    - 단계 분할 권장: 파급 큰 `styles.yml`·`rules.yml` 을 뒤로, 독립성 높은 `channels.yml`·`tools.yml` 을 앞으로
* status: **파일럿 완료** — md-builder styles.yml 3룰 전환 + hygiene 산출물 판정. 9종 전면 전환은 감사로 범위 재정의됨(아래)
* 감사 결과 (subagent 13파일 전수): 실제 goal 전환 대상은 **4파일 8건**, 나머지 9파일은 설정값 전용(룩업·분류·질문·채널 — goal 개념 없음). "43개 미전환 플래그"의 대부분이 설정 boolean 이었음
* 완료분: `slide_text_hygiene_policy`(hygiene, 제목 내부표기 노출 금지) · `inline_syntax_preservation`(fidelity, 문법 토큰 wrap) · `backtick_marker_conflict_policy`(legibility, 빈 li 방지)
* 핵심 개선: lint 검사 게이트를 `schema_version:2` → **`goal_type` 룰 존재**로 변경 — `version:` 파일도 goal 룰 넣는 즉시 검사됨 (감사가 짚은 버전 필드 네이밍 불일치 우회)
* hygiene enforce_scope=headings: 본문 bullet·단락의 이슈번호는 덱 콘텐츠(도구 데모)일 수 있어 제목만 기계 판정. 실 프로젝트 23개 위반 0건
* 잔여 5건은 🌱 이슈후보에 기록(개별 goal_check 판정 코드가 독립 작업이라 건별 후속 분리)
* 근거 문서: `_doc_work/htm/hub_htm_20260721_215009_a_yml-audit.htm`

## Issue299. _doc_arch ↔ 소스코드 정합성 감사 (등록: 2026-07-21, 해결: 2026-07-21, commit: 없음—gitignore) ✅
* 목적: `_doc_arch/` 영속 설계 문서가 참조하는 파일 경로·스크립트명·함수명·CLI 플래그·동작 서술이 현재 소스코드와 어긋난 곳(stale)을 전수 검토하여 교정.
* plan: `_doc_work/plan/doc-arch-audit_plan.md`
* task: `_doc_work/tasks/doc-arch-audit_task.md`
* 결과: 문서 42개 7-subagent fan-out 감사 → **42건 발견, 39건 교정, 3건 false-positive 기각**(htmlArt PANDOC_LAYOUT_RESERVED 실존 확인 slide-parser.js:282). CLEAN 15개.
    - HIGH 2건: dev-server.md `/n/` 네임스페이스 미구현 오기(실제 구현 완료) · theme_layout_lec.md underscore class 서술 stale(실제 `layout-_*`)
    - 주요 교정: nowage 테마 폐기 잔존→default_lec 정정(theme/css/theme_layout_default/video-player) · keynote 자산 `_doc_base/background/` 이동 경로 · Issue257 파이프라인 재번호(stage9=note-writer, info/cost-manager/authoring-pipeline) · 함수·라인번호 drift(brittle 라인번호는 심볼 참조로 대체) · _README 인덱스 32→41 문서 · htmlArt 19종→27종 · 테스트 30→63 · `--lint-palette`/`--lint-config` 실존 확인
    - 재-grep 검증 통과: keynote 경로·opus-4-8·_README 41/41 링크·`_applyDirectiveAttrs` 실존
* 미해결 마커: color-palette.md `--lint-palette` 🚧 [TODO] 2곳 (전용 lint 미구현, 현행 warn+fallback)
* **커밋 없음 사유**: `_doc_arch`·`Issue.md`·`_doc_work` 가 `.gitignore` 대상(L4-6)이라 commit hash 생성 불가. `-f` 강제 추적·gitignore 수정 금지 지침 준수 — hash 없이 종결. (public remote 존재, 내부 설계문서 강제 추가 금지)
* 방법론 원본: prj1#Issue306, fan-out: prj1#Issue307

## Issue265. policy 데이터 yml 목적 지향(goal-oriented) 스키마 + confidence 가중치 도입 — 정책 무력화·오변경 예방 (등록: 2026-07-06, 보류: 2026-07-11, 보류해제: 2026-07-20, 해결: 2026-07-21, commit: 1fc4c24, 70fca45) ✅
* branch따서 작업할 것. 
* status: 완료 — 브랜치 `fix/issue265-policy-goal-schema` (main 병합 미수행, 사용자 검토 대기)
* 범위 확정 (2026-07-20 사용자 결정): 축 1(룰 목적)만. 축 2(덱 목적 purpose enum)는 Issue295 로 분리. `goal_type` enum 7종 전량 채택
* 후행: Issue295 (덱 목적 purpose enum) — **trigger 충족, 착수 가능** / Issue296·297·298 (미해결 항목 이관)
* 목적: `data/<stage>/*.yml` 정책이 (A) 파일명 정규식 하드코딩으로 조용히 무력화되고(`drop_redundant_page_screenshot`가 `pdf-p\d+`만 검출 → AgenticCoding `sNN_i1.png` bleed 8건 미검출), (B) 일괄 커밋(chore bulk)에 섞여 회귀 원인 격리가 불가하며, (C) 학습 사례 1건이 즉시 전역 enforce로 승격되어 과소/과대 일반화 위험을 안는 구조적 약점을 차단.
* plan: `_doc_work/plan/policy-goal-schema_plan.md`
* task: `_doc_work/tasks/policy-goal-schema_task.md`
* 분석 문서: http://jm4.local:9876/htm-doc?path=/Users/nowage/_git/__all/videoMaker/lib/m2slide/_doc_work/z_htm/hub_htm_20260706_210035_a_policy-history.htm (git history 사례 A/B/C + 예방책 ①~⑤ 상세)
* 목적 2축 분리 근거: `_doc_work/htm/hub_htm_20260720_192649_a_goal-taxonomy.htm` (goal_type enum 7종 도출 + 축 2 분리 판단)
* 상세:
    - 사례 A (목적·수단 불일치): commit `4b38619` 정책의 goal은 "재구성 성공 슬라이드에 통짜 래스터 0건"이나 구현은 특정 파일명 패턴 — 다른 추출 네이밍(sNN_iM)에서 무력화. 2026-07-06 AgenticCoding 튜닝에서 실증
    - 사례 B (일괄 커밋): `01ad51a`·`80cd65b`·`b580e13` — 정책 yml+코드+산출물 혼합 커밋. theme fallback 회귀 원인 코드가 `01ad51a`에 숨어 있었음 (기존 Issue 기록)
    - 사례 C (단일 사례 즉시 enforce): 7/3 백업 diff 기준 하루 3룰 추가 전부 사례 1건 근거 + 예외조건(`keep_screenshot_when`)이 자연어라 기계 판정 불가
* 구현 명세 (분석 문서 ①~⑤ — 대규모 변경이라 등록만, 착수 시 plan 필수):
    - ① goal-oriented 스키마 (3필드 하이브리드): `goal_type:`(객관식 enum 7종 — `fidelity`·`machine_readable`·`intent_guard`·`consistency`·`legibility`·`attribution`·`hygiene`) + `goal:`(주관식 서술 — 검증 가능 목표) + `goal_check:`(판정식 — 면적·종횡비·빈 alt 등 속성 기반) + `detect_hints:`(파일명 정규식은 힌트로 강등)
    - ② confidence 가중치: `evidence:` 구조화 필드 기반 low(=proposal)/medium(=warn+apply)/high(=enforce) 3단계 적용 강도. promote-to-data.py 연동
    - ③ 정책 yml 단독 커밋 규율 (bulk commit에 data/*.yml 혼입 금지)
    - ④ `--lint-data` 확장: enforce 룰이 goal_check 없이 정규식만 가지면 경고 + `goal_type`↔`goal_check` 계열 정합성 검사 + 산출물 검사(정책 on인데 위반 잔존 시 fail-loud)
    - ⑤ 학습 사례 골든 픽스처화: rationale 사례 슬라이드 재변환 회귀 테스트
    - 우선순위: ①+④ (사례 A 직접 차단) → ② (사례 C 구조 개선) → ③⑤
    - triage: 복잡 (heuristics.yml 스키마 개편 + promote-to-data.py + lint 확장 — 설계 결정이 후속 이슈에 영향)
* report: `_doc_work/report/policy-goal-schema_issue265_report.md`
* 설계 SSOT: `_doc_arch/policy-goal-schema.md` (신규)
* 결과:
    - 목적 3필드 하이브리드 도입 — `goal_type`(enum 7종) + `goal`(서술) + `goal_check`(판정식). 파일명 정규식은 `detect_hints` 로 강등되어 판정 권한 상실
    - 파일럿 `heuristics.yml drop_redundant_page_screenshot` 전환 (`schema_version: 2`). 자연어 `keep_screenshot_when` → 기계 판정 `keep_when` 으로 대체
    - 전환 단위를 파일이 아닌 **룰** 로 재정의 — `goal_type` 선언 룰만 v2 규율. 미전환 룰은 lint 가 정보 라인 보고(실패 아님), 전환 도중에도 lint 사용 가능
    - lint 2종 신설: `lib/lint-policy-schema.py`(enum·계열 정합성·evidence) + `lib/lint-policy-artifacts.py`(산출물 속성 판정, `_pipeline` 보유 프로젝트 옵트인) → `--lint-data` 검사 4·5
    - `promote-to-data.py` confidence 제안 — `high`(enforce)는 자동 제안하지 않음 (사례 C 차단)
    - 골든 픽스처 + 러너(`z_test/`) — 힌트 미등록 네이밍(`Deck_v10_12.png`)까지 검출해야 통과
    - 정책 yml 단독 커밋 규율 문서화 (`data-access-rules.md`, 사례 B)
* 설계 교정 1건: 초안 `image_area_ratio_max`(픽셀 수 → 면적비 프록시)가 저해상도 페이지 캡처(1440x810·1600x900)를 놓쳐 픽스처 3건 중 1건만 검출. md 소스로는 렌더 면적 판정이 원리적으로 불가하므로 폐기하고 `sole_image_in_slide` + `min_pixel_width` 로 교체 — 판정 불가능한 값을 그럴듯하게 적어두는 것이 본 이슈가 막으려는 실패 모드
* 검증: `--lint-data` rc0(검사 1~5) · `z_test/run-policy-fixture.sh` rc0(위반 3건 검출·오검출 0) · 실 프로젝트 11개 잔재 0건 · `m2Slide_single_mode` 빌드 rc0

## Issue294. m2slide.sh 프로젝트 이름 해석이 Projects_deck 덱을 못 찾음 (등록: 2026-07-20, 해결: 2026-07-20, commit: 49f64fe) ✅
* 목적: `./m2slide.sh <덱이름>` 이 `Projects/` 하위만 조회하여 `Projects_deck/decks/<cat>/<deck>` 덱을 "존재하지 않음"으로 처리하는 비대칭을 해소한다. dev-server(`_project_root`, Issue290)는 이미 덱을 해석하므로 브라우저에서는 열리는 덱이 빌드에서는 안 잡히며, 이 때문에 Issue292 라이선스 뱃지 소급 재빌드가 덱 저장소 전체를 조용히 건너뛰었다.
* 상세:
    - 재현: `./m2slide.sh RamyeonCooking` → `❌ Error: Project directory does not exist: RamyeonCooking`. 같은 덱이 dev-server 에서는 `/p/RamyeonCooking/n/1/1` 로 정상 서빙됨
    - 원인: `m2slide.sh` 이름 해석이 `$SCRIPT_DIR/Projects/<name>` 단일 경로만 조립 (`Projects_deck` 문자열 자체가 파일에 없음)
    - 파급: `--lint-deployment <project>` 도 동일 한계. 전역 기능 롤아웃 시 덱 저장소 누락이 반복될 구조
    - 실측 근거(수정 전): `Projects/*/slide/index.html` 은 라이선스 뱃지 1~2개, `Projects_deck/decks/misc/RamyeonCooking/slide/*.html` 은 0개
* 구현 명세:
    - `m2slide.sh` 상단에 `_resolve_project_dir()` 헬퍼 신설 — `Projects/<name>` 우선, 없으면 `Projects_deck/decks/*/<name>` 탐색. 다중 매칭 시 stderr 경고 후 사전순 첫 매칭 사용 (dev-server `_project_root` 와 동일 규약)
    - 빌드 경로(파라미터 이름 해석)와 `--lint-deployment` 대상 해석 양쪽에 적용
* 검증 결과:
    - `bash -n m2slide.sh` 통과
    - `./m2slide.sh RamyeonCooking` — 덱 경로 자동 해석 후 빌드 성공, `©️ Injecting license attribution badge` 로그 확인
    - `grep -c m2-license-badge .../RamyeonCooking/slide/index.html` → 2 (첫·마지막 슬라이드)
    - `./m2slide.sh --lint-deployment RamyeonCooking` → 덱 경로 해석 성공 + `✅ No deployment violations`
    - `./m2slide.sh --lint-license` → 전 테마 통과
    - `Projects_deck/decks/*/*` 전수 스캔 — 덱 1건(RamyeonCooking) 전부 뱃지 보유, 소급 누락 잔존 0
* 후속 관찰(이슈 아님): `agenda.html` 은 전 프로젝트 공통으로 뱃지 0 — RamyeonCooking 고유 회귀가 아니라 현행 삽입 대상 목록의 특성. 필요 시 별도 이슈로 판단.

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

