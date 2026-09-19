# Issue Management
* https://github.com/Finfra/m2slide/issues
* Issue HWM: 363
* Checkpoints:
    - 70e29d3 (2026-09-11) m2slide→pptx 정책 갱신·lane G SmartArt 종결 시점
    - 3510da8 (2026-08-11) ig-maker·ppt-maker 통합 착수 직전
    - bf2efa7 (2026-07-13) 작업 트리 스냅샷
* 오래된 Issue는 `z_old/old_issue.md`에 저장
* Save Point :
    - **v0.8.0 (2026-07-13)** — release: 라이선스 이중화(CC BY 4.0 + 상업, LICENSE.md 신설) + dev-server 확장(/s/·/n/ semantic 분리, /pd/ 덱 목록, 설정 GUI, 피드백 루프) + default_dark 테마·palette 시스템 + authoring-pipeline 학습 루프(slide-tuner·ppt2m2slide·note-writer) + self-contained vendor 자산. 완료 이슈 159건 z_old 아카이브.
    - **v0.7.0 (2026-05-06)** — release: `/deploy-docs` 신규 커맨드 + `_config.yml: deploy_formats` 옵션 (EPUB/PDF/PPTX 자동 빌드·배포 + 메인 인덱스 카드 다운로드 배지) + agenda 다운로드 버튼 위치 변경(우상단 헤더 → `.layout-_agenda` 우하단 absolute, 마스코트 충돌 회피). v0.6.x 시리즈(Issue71-126 + Issue127-128) 누적 z_old 아카이브.
    - **v0.5.0 (2026-05-03)** — release: 71건 완료 이슈 z_old 아카이브, CHANGELOG.md 신규 (Issue70까지 포함)
    
# 🤔 결정사항

결정은 **각 정본 문서**에 산다 — 여기 사본을 두지 않는다(2026.09.02 정리).

| 결정                                                                               | 정본                                                                       |
| :--------------------------------------------------------------------------------- | :------------------------------------------------------------------------- |
| 별도 `_meta.yml` 파일 미사용 — `AGENDA.md`·`{프로젝트명}.md` frontmatter 에 넣는다 | [meta-yml.md](_doc_arch/meta-yml.md) "별도 `_meta.yml` 파일은 쓰지 않는다" |
| m2slide 모듈 분리는 나중에 — 지금은 상위 프로젝트와 함께                           | [decisions.md](_doc_arch/decisions.md) "m2slide 모듈 분리는 나중에"        |
| SCAR 는 가급적 프로젝트 폴더에 배치 (배포용 자족)                                  | [scar-portability.md](_doc_arch/scar-portability.md) "SSOT 경계"           |
| `img/` 소스·빌드 이중 복사 유지                                                    | [decisions.md](_doc_arch/decisions.md) "`img/` 이중 복사를 유지한다"       |
| 로우·값 단위 개별 애니메이션 지원 (Issue149 완료)                                  | [animation.md](_doc_arch/animation.md) "3. m2slide syntax 설계"            |

# 🌱 이슈후보

# 🚧 진행중

## Issue358: m2slide → pptx 미세 조정 — HTML 실측 ↔ pptx 렌더 대조를 같은 방식으로 반복 (등록: 2026-09-11)
* 목적: Issue342~357 로 변환 정책이 "대체로 맞는" 상태가 됐다. 남은 차이를 같은 방식 — HTML 실측(ego-browser, 1920×1280) ↔ LibreOffice 렌더 대조 → [transform.yml](data/m2slide2ppt/transform.yml)·[fidelity.yml](data/m2slide2ppt/fidelity.yml) 갱신 → 재빌드 → 6.roundtrip 러너 — 으로 좁혀 간다. 원고는 손대지 않는다
* depends: Issue357
* 상세 (알려진 잔여 — 발견 순):
    - **PowerPoint 실물 확인 반영** — Issue354·357 은 LibreOffice 렌더 + PowerPoint 서체 캐시·저장본 구조 대조까지가 검증 한계였다. 사용자가 PowerPoint 에서 본 차이(서체·SmartArt 편집 가능 여부·수식)를 첫 입력으로 받는다
    - **나머지 htmlart 를 lane G(SmartArt) 로** — timeline·chevron·step·funnel·numbered·compare 는 아직 lane B 도형 근사. 종류마다 HTML 렌더러 기하를 실측해 `smartart.catalog` + 캐시 기하를 더한다(레이아웃 자원: `SmartArt.framework` lo/cs/qs)
    - **Issue343 이월** — 중첩 깊이(2칸 vs CommonMark)·하이픈 뒤 공백 없는 불릿의 정본 결정, 무제 이미지 장(`_blank`·문단+이미지)의 pptx 배치. m2Slide_chapter_mode 러너 FAIL 2건(장 +5·글자 25종)이 이 항목이다
    - **표 폭** — 열 폭을 모노스페이스 어림(한글 1em·그 외 0.5em)으로 잡아 HTML 904 vs pptx 876. 실측 폭 또는 서체 메트릭으로
    - **코드 상자 안 수식** — 코드 다음 문단의 OMML 은 PowerPoint 렌더를 봐야 한다(LibreOffice 는 fallback 평문)
    - **cards 본문 여러 줄·2단계** — aTest 는 한 줄 카드뿐. 여러 줄·`-` 2단계 카드의 높이 규칙(`card_geometry.body_line_h`) 실측
* 구현 명세:
    - 한 항목마다 ① ego-browser 로 HTML 실측 ② `soffice --headless --convert-to pdf` + `pdftoppm` 렌더 ③ 나란히 대조 ④ 정책 갱신(backup 후, 단독 커밋) ⑤ 필요 시 lane T/G 코드 ⑥ `./z_test/ig-ppt/6.roundtrip.sh aTest` 전건 + `4.laneb`·`5.lanem`·`--lint-data`
    - 정책이 소유해야 할 값(좌표·색·서체·기하)은 코드에 박지 않는다 — 검사기가 그 정책을 읽어 must_match 로 잰다
    - 종료 조건: 위 잔여 항목이 전부 계약(fidelity.yml)에 선언되거나 해소되고, aTest·m2Slide_chapter_mode 러너가 FAIL 0


# 📕 중요

# 📙 일반

## Issue360: layout `*-body` 명시도 충돌 전수 — base.css shorthand 가 theme 가로 padding 을 삼킨다 (등록: 2026-09-19)
* 목적: [Issue359](#issue359) 로 `exercise`·`exercise-small` 을 고치면서 **같은 충돌이 살아 있는 layout 6종을 더 찾았다.** exercise 와 달리 이쪽은 실사용 덱이 전부 쓰는 layout 이라 고치는 순간 기존 덱의 렌더가 바뀐다 — 그래서 Issue359 에 묶지 않고 분리했다
* depends: Issue359
* 상세 (실측 2026-09-19, ego-browser `getComputedStyle`, 1920 기준):
    - 원인은 Issue359 와 같다 — [base.css](lib/css/base.css) `.reveal section[class*="layout-"] > div[class$="-body"]`(명시도 **0-3-2**, `padding: 1em 0`)가 theme 의 0-3-1 선언을 이긴다. theme 이 나중에 로드돼도 소용없다
    - theme [default_lec](theme/default_lec/slide.css): `cover-body`(L722 `0.6em 5% 0.6em 0` → 실측 `30px 0`) · `summary-body`(L578 `0 6% 0 5%` → `42px 0`) · `chapter-toc-body`(L433 `1em 1.4em`) · `chapter-body`(L488 `0` → `40px 0`) · `_contents_no_title > .contents-body`(L405 `padding-top: 0` → `40px`)
    - theme [default](theme/default/slide.css): `_toc > .toc-body`(L794 `1em 1.5em`) · `cover-body`(L689) · `chapter-toc-body`(L447) · `_contents_no_title`(L426). `_blank > .blank-body`(L531)는 `!important` 라 이미 이긴다
    - **가장 눈에 띄는 것은 cover** — 강사명 박스가 `padding-right: 5%` 를 못 받아 우측 끝에 붙는다. 같은 슬라이드의 `cover-tr`·`cover-br` 은 `right: 5%` 라 **둘이 안 맞는다**
    - 선례가 이미 있다: [default/slide.css](theme/default/slide.css) L1468 주석이 *"base.css §5 를 이기려고 `.slides` 를 넣었다"* 고 적고 `.reveal .slides section.layout-chapter .chapter-body`(0-4-1)로 올려 놨다. 같은 함정을 이미 한 번 밟았다는 뜻이다
* 구현 명세:
    - 고치는 방법은 Issue359 와 같다 — 선택자에 `> div` 를 넣어 0-3-2 동점을 만든다. base.css 는 건드리지 않는다
    - ⚠️ **일괄 적용 전에 시각 확인이 필요하다.** 고치면 theme 작성자가 의도한 값이 비로소 먹으므로 기존 덱의 여백이 전부 바뀐다. layout 별 before/after 캡처를 붙여 사용자 승인 후 반영
    - 근본 대안도 함께 검토: base.css L782 의 shorthand `padding: 1em 0` 을 `padding-block: 1em` 으로 바꾸면 좌우를 아예 건드리지 않아 theme 의 가로 선언이 자연히 산다. **base.css 수정이라 [CLAUDE.md](CLAUDE.md) "base.css 수정 가드" 의 사용자 컨펌 대상**
    - 검증: `./m2slide.sh m2Slide_single_mode` · `m2Slide_chapter_mode` + 테스트 필수 4항목 + layout 별 `getComputedStyle` before/after

## Issue361: sreMsa v2.1.2 가독성 처방을 `legibility` goal 로 정책 스키마에 편입 (등록: 2026-09-19)
* 목적: m2slide 의 `legibility` 계열은 **선언만 있고 비어 있다.** [lint-policy-schema.py](lib/lint-policy-schema.py) 가 술어 6종(`chars_max`·`items_max`·`font_size_min`·`box_overflow_max`·`lines_max`·`no_empty_bullet_li`)을 열거하지만 실제로 쓰는 룰은 [styles.yml](data/md-builder/styles.yml) 의 `backtick_marker_conflict_policy` 하나뿐이고, 그마저 `no_empty_bullet_li` 만 쓴다 — **나머지 5종은 소비처 0건**이다. 한편 prj61 sreMsa 는 v2.1.2 에서 그 5종을 실제로 기계 판정하는 검증기와 실측 근거를 이미 만들었다. 그 처방을 정책 스키마로 옮겨 빈 계열을 채운다
* 상세 (근거 — prj61 sreMsa Issue18, 2026-09-19 종결, commit 960908b):
    - 정본 리포트 `~/work/sreMsa/_doc_work/report/v2.1.2_가독성교정_issue18_report.md` · 검증기 `~/work/sreMsa/sh/ig-legibility-check.py`
    - 실측 규모 — 인포그래픽 run 887개 중 **16pt 미만 769 → 0**, **bold 393 → 213**, **도형 밖 넘침 6 → 0**, 신규 겹침·장식 침범 0, 장 수 보존(147·133)
    - 처방① **바닥 글자 크기 16pt** — 기존 `font_size_min` 술어에 그대로 대응한다
    - 처방② **본문 굵기 해제** — 16pt 본문의 bold 를 전부 푼다. 유지는 넷뿐(바닥보다 큰 글자 · 진한 채움 위 흰 글자 · 강조 배경 안 글자 · 원형 안 3자 이하 기호). **대응 술어 없음**
    - 처방③ **넘침 흡수 순서** — 글자를 키우면 도형을 넘치므로 줄이지 않고 ⑴가로 확장 ⑵여백 0 ⑶이웃 라벨 죔 ⑷도형 확대 ⑸괘선 길이 ⑹라벨을 막대 밖으로 순으로 흡수한다. `box_overflow_max` 에 대응하되 **전술의 순서 자체가 정책의 일부**다
    - 처방④ **신규 겹침 0 · 신규 장식 침범 0** — 교정이 만들어 낸 새 충돌을 기준본과 대조해 센다. **대응 술어 없음**
    - 처방⑤ **적용 범위가 판정의 핵심** — *"placeholder 가 아니면서 run 에 크기가 명시된 도형"* 만 고친다. 곧 **우리가 생성한 도형만**이고 상속분(Keynote 산 원본)은 건드리지 않는다. 근거는 원본 전수 조사에서 그런 run 이 0개라는 실측이다. **대응 필드 없음**
    - ⚠️ **⑹ 은 값을 가진 도형을 키우면 그래프가 거짓말이 되는 예외다** — 카나리 5% 막대는 높이 0.046in 이라 막대를 그대로 두고 라벨만 밖으로 꺼냈다. legibility 와 fidelity 가 정면으로 부딪치는 지점이고, 스키마가 이 충돌을 표현할 수 있어야 한다
    - ⚠️ **⑶ 은 전 장 일괄 적용이 회귀를 냈다** — 추정 글꼴이 실제보다 좁아 멀쩡하던 카드 제목이 두 줄로 접혔다(part1 s22 실측). 228건 → 필요분 4건으로 줄였다. `confidence` 와 적용 범위를 어떻게 둘지의 실사례다
* 구현 명세:
    - 산출은 **스키마 정의 + 정책 yml 룰**이다. 교정 스크립트 이식은 범위 밖 — sreMsa 는 pptx 후처리이고 m2slide 는 원고 → 산출 경로라 구현체가 다르다. 옮기는 것은 *판정 기준*이지 *코드*가 아니다
    - ① [policy-goal-schema.md](_doc_arch/policy-goal-schema.md) 에 `legibility` 계열 절을 세우고 신규 술어를 정의한다 — `emphasis_scope`(굵기 유지 조건 화이트리스트)·`overlap_count_max`·`decoration_intrusion_max`. 이름·의미는 등록 시점 잠정이며 착수 때 확정한다
    - ② 문서를 먼저 고치고 [lint-policy-schema.py](lib/lint-policy-schema.py) 의 `GOAL_CHECK_FAMILIES["legibility"]` 를 뒤따라 동기화한다 (순서는 [data-access-rules.md](.claude/rules/data-access-rules.md) 의 동기화 의무)
    - ③ **적용 범위 축을 어디에 둘지 가른다** — 처방⑤ 의 판정 기준은 덱 용도(`purpose`, 축 2)가 아니라 **요소의 출처**(생성분 / 상속분)라서 기존 두 축 어디에도 맞지 않는다. 축을 새로 세울지, `applies_to_*` 계열로 흡수할지가 이 이슈의 설계 핵심이다
    - ④ 룰이 `data/md-builder/styles.yml`(원고 측)과 [transform.yml](data/m2slide2ppt/transform.yml)(pptx 산출 측) 중 어디에 사는지 가른다. 굵기·바닥 크기는 산출 측 테마 값이라 후자일 가능성이 높다
    - ⑤ `evidence` 에 prj61 실측을 그대로 적는다(project: sreMsa · date: 2026-09-19 · 위 수치). `confidence` 는 단일 프로젝트 1회 관측이라 **medium 이 상한**이다
    - 검증: `./m2slide.sh --lint-data` rc0 + 검사 4(goal-oriented 스키마)가 신규 술어를 계열 정합으로 받아들일 것
    - 종료 조건: ①~④ 가 문서·코드에 반영되고 `--lint-data` 가 통과하며, 신규 술어를 실제로 쓰는 룰이 최소 1건 등록된다
* ⚠️ **본 이슈는 등록까지만 수행했다** (사용자 지시 2026-09-19 — "등록만 하고 구현은 하지 말 것"). 착수 전 ③ 의 설계 판정을 먼저 사용자와 확인한다


# 📗 선택

# ✅ 완료

## Issue363: htmlart `callout` 라벨이 viewBox 밖에 그려진다 — `wide` orientation 신설 (등록: 2026-09-19, 해결: 2026-09-19, commit: `85fa4bc`, `b3bb28b`) ✅
* 목적: Issue362 의 4:3 검증에서 드러난 **선행 결함**. 4:3 이 만든 문제가 아니라 4:3 이 **드러낸** 문제다
* depends: Issue362
* 상세 — 원인 사슬:
    - [htmlart_dispatch.client.js:1548](lib/component-hooks/htmlart_dispatch.client.js#L1548) `renderCallout` 의 viewBox 는 `0 0 2000 1200` 고정인데, `W`/`E` zone 라벨 박스는 `labelBox()` 가 `x = -460` ~ `x = 2460` 에 배치한다 — **viewBox 밖 좌우 460 단위씩**
    - SVG 는 `width:100%;height:100%` + 기본 `preserveAspectRatio="xMidYMid meet"` 이다. `meet` 레터박스 여백이 viewBox 밖 라벨을 우연히 보여주고 있었을 뿐이다
    - htmlart 블록은 남는 세로 공간을 채우도록 자란다 → 4:3(슬라이드 1440) 에서 블록이 높아짐 → `meet` 스케일 상승(3:2 `0.7325` → 4:3 `0.8658`) → 레터박스 여백이 좁아짐(각 171 → 38 논리px) → viewBox 밖 라벨이 **슬라이드 경계 밖으로 밀려 잘린다**
    - 실측(4:3, `m2Slide_visual_component` 5.27c vertical): `W` zone 라벨 "속도 2배 향상" 이 "도 2배 향상" 으로 좌측 잘림. 최우측 요소가 슬라이드 폭 1920 을 `+130.9` 초과
    - 3:2 에서도 라벨 박스 자체는 이미 슬라이드 밖(`-109`)이다. 텍스트가 박스보다 좁아 **우연히** 안 잘렸을 뿐이라 원래부터 아슬아슬했다
* 구현 — 사용자 판정(2026-09-19): **기존 배치를 고치지 않고 레이아웃을 추가한다**
    - 정공법(기존 viewBox 확장)은 `meet` 스케일이 `0.7325 → 0.619` 로 떨어져 **기존 덱의 callout 도해가 통째로 작아진다**. 라벨이 온전해지는 것은 개선이지만 기존 외관을 바꾸는 대가가 이슈 밖이라 택하지 않았다
    - 대신 [renderCallout](lib/component-hooks/htmlart_dispatch.client.js#L1554) 에 `wide` 를 더했다 — `vertical` 과 **같은 좌우 배치(V_p)** 에 캔버스만 `2920×1200` 으로 넓힌 변형. `fan` 이 이미 `2200×1500` 별도 캔버스를 쓰므로 **orient 마다 캔버스를 달리하는 패턴은 이 코드에 이미 있었다**
    - `2920` 은 임의 값이 아니다 — `hubW 920 + 좌우 각 (arm 520 + labelW 480)` 이라 **여백 없이 딱 맞는다**. 기존 좌표식을 하나도 안 건드리고 `cx` 만 따라 옮겨진다
    - [markdown.js](lib/markdown.js#L347) 파서에 `{.w}`/`{.wide}` → `data-orientation="wide"`. ⚠️ 정규식 alternation 은 `wide` 를 `w` **앞**에 둔다 — 뒤에 두면 축약이 긴 이름을 가로챈다(회귀 가드 테스트 1건 추가)
    - 카탈로그 [types.yml](data/htmlart/types.yml) `callout.orientation_note` 에 선택 기준을 적었다 — *"4:3 에서 좌우 분산이 필요하면 vertical 대신 wide"*
* 검증 (ego-browser 실측, `Reveal.configure({transition:"none"})` — Issue362 의 트랜지션 오탐 교훈 적용):

  | 판형 | `{.v}` | `{.w}` |
  | :--- | :--- | :--- |
  | 4:3 | 좌우 각 **117.2px 넘침** (잘림 재현) | **161.1px 여유** |
  | 3:2 | 33.3px 여유 (무변경) | 202.6px 여유 |

    - 대가는 크기다 — 4:3 에서 svg 높이 `930.7 → 769.5`. 폭 제한 스케일이 낮아지므로 도해가 작게 보인다. **그래서 기존 배치를 바꾸지 않고 선택지로 더한 것**이다
    - 회귀 — 3:2 에서 `fan`(2200×1500) · `horizontal`(2000×1200) · `vertical`(2000×1200) viewBox·배치 전부 불변
    - `node --test lib/__tests__/markdown.test.js` 66/66 (wide 3케이스 신규) · `--lint-data` · `--lint-deployment` rc0
    - 데모 `m2Slide_visual_component` 에 5.27d 장 추가 (5.27c `{.v}` 와 나란히 대비). branch 5개로 두어 **정동(W·E) zone 을 실제로 쓰게** 했다 — 4개면 대각 zone 만 쓰므로 가장 먼 케이스를 실증하지 못한다
    - 4:3 에서 W·E 를 쓰는 5-branch `{.w}` 도 좌우 **50.2px 여유**(넘침 0). 2920 이 콘텐츠 실폭이라 여유가 얇은 것이지 모자란 것이 아니다
* ⚠️ **등록 시 서술 정정 — 밖으로 나가는 것은 W/E 만이 아니다**:
    - 등록 본문은 5.27c 의 잘린 라벨을 *"`W` zone"* 이라 적었으나, 그 장의 branch 는 4개라 `V_p[4]=['NW','NE','SW','SE']` — 실제로는 **`NW` zone** 이다. `labelBox` 로 재면 `lx = (1000-320)-480 = -260` 으로 역시 viewBox 밖이다
    - 즉 `vertical` 은 **branch 수와 무관하게 항상 밖**이다 — 4개면 대각(`-260`~`2260`), 그 밖의 수면 W/E(`-460`~`2460`). 지목 대상만 틀렸고 결함의 범위는 등록 당시 추정보다 **넓다**
    - `wide` 는 가장 먼 W/E 기준으로 캔버스를 잡았으므로 대각 zone 은 자동으로 들어온다
* ⚠️ **커밋이 Issue358 작업과 섞였다** — 같은 repo 에서 Issue358 세션이 **동시 진행 중**이었고, 본 이슈가 `git add` 해 둔 인덱스가 그 세션의 커밋에 실렸다. 그래서 본 이슈의 코드 변경은 독립 커밋이 아니라 `85fa4bc`(*"Policy(Issue358): 표 계약을 lossy → lossless 로 정정"*) 안에 있다
    - 되돌리지 않는다 — [data-access-rules](.claude/rules/data-access-rules.md) *"이미 섞어 커밋했다면 되돌리지 말고 후속 커밋에서 분리 이력을 남긴다"*. 강제 히스토리 재작성은 협업자 재clone 을 요구한다
    - 교훈: **한 repo 에 두 세션이 붙어 있으면 `git add` 로 인덱스를 점유한 채 다른 일을 하지 않는다.** 인덱스는 repo 단위 공유 자원이라 남의 `git commit` 이 그대로 집어간다. 경로를 지정하는 `git commit -- <path>` 가 안전하다

## Issue362: `slide_ratio: "4:3"` 지원 — 기존 강의 덱(4:3)과 한 파일로 합치기 위해 (등록: 2026-09-19, 해결: 2026-09-19, commit: `b81c1a1`) ✅
* 목적: prj60(`__lec`) 대금지오웰 설계·R&D 교안을 m2slide 로 만드는데, 그 교안이 **기존 강의 덱과 한 파일로 합쳐져야 한다**. 그 덱들이 전부 4:3 이라 m2slide 가 4:3 을 못 내면 HTML 도 pptx 도 그 판형으로 못 간다
* triage: 중간 (화이트리스트 1줄이 아니라 JS·Python 3모듈 + 비율 소비 지점 전수 감사. 레이아웃 수정은 불필요했고, 대신 htmlart callout 선행 결함 1건을 별건으로 분리)
* 요청 출처: prj60 `__lec` — `Project/202609_Rebuild/1.design_rnd`. 지금까지 `16:9` 로 우회해 둔 상태였다
* 기존 덱 4:3 판형 실측값 (13004800 × 9753600 EMU = 1.3333):
    - `~/work/sreMsa/ppt_withVm_3d/kubernetes_part1_v2.1.2.pptx` (147장)
    - `~/work/sreMsa/ppt_withVm_3d/kubernetes_part2_v2.1.2.pptx` (133장)
    - prj60 `Project/202609_Rebuild/1.design_rnd/build/base.pptx`
* 상세 — 비율 소비 지점 전수 추적 결과:

  | 위치 | 역할 | 4:3 대응 |
  | :--- | :--- | :--- |
  | [config.js:20](lib/config.js#L20) `VALID_SLIDE_RATIOS` | 화이트리스트 (hard error 게이트) | **수정** — `'4:3'` 추가 |
  | [html-builder.js:197](lib/html-builder.js#L197) `resolveRevealDimensions` | Reveal width/height/ratioClass | **수정** — `1920×1440`·`ratio-4-3` 분기 추가 |
  | [server.py:1875](lib/dev-server/server.py#L1875) 설정 GUI enum | dev-server 비율 드롭다운 | **수정** — 옵션 추가 |
  | [config.js:771](lib/config.js#L771) `slideRatioNumeric` | CSS `--slide-ratio` 값 | 무수정 — 정규식 기반이라 `4:3 → 1.3333` 자동 |
  | [build-pptx.sh:169](lib/pptx/build-pptx.sh#L169) 판형 교정 | theme.yml canvas | 무수정 — 정규식 기반. `338.67×254.00mm` 산출 확인 |
  | [check-visual.py:243](lib/pptx/check-visual.py#L243) 판형 검증 | HTML↔pptx 대조 | 무수정 — 정규식 기반 |
  | [detect-viewport.py:29](lib/tuner/detect-viewport.py#L29) `RATIO_MAP` | tuner 뷰포트 | 무수정 — **이미 `4:3 → 1920×1440` 을 갖고 있었다** |
  | [base.css](lib/css/base.css) · theme `slide.css` | ratio 클래스 | 무수정 — `ratio-fill` 만 특례 처리하고 나머지는 `--slide-ratio` 변수로 일반화돼 있다. `ratio-4-3` 전용 CSS 불필요 |

* 구현 명세 — 논리 폭은 **언제나 1920 고정**이고 높이만 늘린다 (`1920×1440`):
    - theme CSS 의 `font-size`·`padding` 이 전부 **1920 논리폭 좌표계**에서 쓰였다. 폭을 줄이면(ex `1440×1080`) 가로 조판이 통째로 어긋난다
    - 같은 원칙을 [build-pptx.sh](lib/pptx/build-pptx.sh) 가 이미 명문화해 뒀다 — *"폭은 그대로 두고 높이만 비율에 맞춘다"*. `3:2 → 1920×1280` 선례와도 일치
* 검증 — `default_lec` layout 7종 · htmlart 27종 · cards · 표 전수 빌드 후 [ego-browser](~/.claude/skills/ego-browser/SKILL.md) 실측:
    - **layout 7종 전부 정상** — `chapter`·`contents`·`contents-full`·`contents-split`·`exercise`·`exercise-small`·`summary`·`closing` 넘침 0. `cards`(3열·6장) · 7열 표 · 긴 셀 표 · 코드블록 도 정상
    - htmlart 27종 중 **25종 정상**. `callout` 의 `horizontal`·`vertical` 2변형만 가로 넘침 (→ Issue363 분리)
    - ⚠️ **넘침 측정은 `Reveal.configure({transition:"none"})` 로 트랜지션을 끄고 재야 한다.** `convex` 전환 중 `getBoundingClientRect` 가 회전 transform 을 포함해 **450ms 대기로는 오탐이 난다** — 최초 측정에서 exercise·summary·closing 이 넘치는 것으로 잡혔으나 전부 허위였다
* 회귀 — `m2Slide_single_mode`(3:2) · `m2Slide_chapter_mode`(3:2) · `m2Slide_visual_component`(3:2) 변경 전후 빌드 산출 대조:
    - 캐시버스터 타임스탬프를 정규화하면 남는 diff 는 **주석 1줄뿐**(`ratio-3-2/16-9` → `ratio-3-2/4-3/16-9`). Reveal `width`·`height`·`ratioClass` 전부 동일

## Issue359: `exercise`·`exercise-small` 본문 들여쓰기가 안 먹는다 — CSS 명시도 충돌 (등록: 2026-09-19, 해결: 2026-09-19, commit: `d537625`) ✅
* 목적: prj60 작업 중 실측으로 드러난 것. `default_lec` 테마의 `exercise` 계열 layout 이 본문 좌측 들여쓰기를 선언해 두고도 **적용받지 못해** 나비 마스코트가 글자를 덮는다. 원고가 아니라 CSS 명시도 문제다
* 상세:
    - 충돌 표 (먼저 로드되는 쪽이 **명시도로** 이긴다):

      | 출처 | 선택자 | 명시도 | 선언 |
      | :--- | :--- | :--- | :--- |
      | [base.css](lib/css/base.css) L782 (먼저 로드) | `.reveal section[class*="layout-"] > div[class$="-body"]` | **0-3-2** | `padding: 1em 0` |
      | [default_lec/slide.css](theme/default_lec/slide.css) L507·L522 (나중 로드) | `.reveal section.layout-exercise .exercise-body` | 0-3-1 | `padding-left: 18%` |

    - shorthand `padding: 1em 0` 이 `padding-left`·`padding-right` 를 **0 으로 리셋**한다. 나중에 로드돼도 명시도가 낮아 theme 선언이 진다
    - 실측(ego-browser `getComputedStyle`, 1920 기준): **before `padding: 40px 0px 40px 0px`** — 선언한 18%/30%·4% 가 전혀 안 걸렸다
    - 증상: 나비(`background-position: 4% 60%`, `background-size: 14%`)가 본문 글자와 겹친다. `exercise-small` 은 나비가 22% 라 더 심하다. 부수적으로 `htmlart numbered` SVG 가 폭이 안 줄어 본문 영역을 넘친다
    - 🔴 **`#layout-exercise` 실사용 0건**(`Projects/` 전수 grep)인 이유가 이것으로 보인다 — 안 쓴 게 아니라 **써 보니 깨져서** 안 쓴 것. 동시에 기존 덱에 회귀 위험이 없는 근거이기도 하다
    - 같은 결함이 `theme/default` 에도 **글자 그대로 복제**돼 있었다(L469·L484) — 함께 고쳤다
* 구현 명세:
    - 선택자에 **자식 결합자 + 요소 선택자**(`> div`)를 넣어 0-3-2 동점을 만든다. 동점이면 나중 로드가 이긴다
    - `.reveal section.layout-exercise > div.exercise-body` · `.reveal section.layout-exercise-small > div.exercise-body`
    - ⚠️ **base.css 는 고치지 않는다** — [CLAUDE.md](CLAUDE.md) 의 base.css 가드(사용자 컨펌 필수)와 우선순위 규칙(`theme slide.css > layout CSS > base.css`)을 따라 theme 에서 끝낸다
    - 장황해 보이는 선택자가 되돌려지지 않도록 **왜 `> div` 가 필요한지** 주석을 규칙 위에 남긴다
    - 검증: 대표 프로젝트 2종 빌드 + 테스트 필수 4항목 + `exercise` 최소 원고로 `padding-left` 실측
* 결과:
    - 실측 **before `padding-left: 0px` → after `325.44px`(= 1808 × 18%)** · exercise-small `0px → 542.40px`(= 30%) · `padding-right` 양쪽 `72.31px`(= 4%). 나비와 본문이 겹치지 않음을 캡처로 확인
    - 회귀 검증: `./m2slide.sh m2Slide_single_mode`·`m2Slide_chapter_mode` rc0. 산출 diff 는 **캐시버스터 타임스탬프 + 본 수정분뿐**. 테스트 필수 4항목(첫 슬라이드 제목·다음 슬라이드 제목·스크롤 `overflow-y: auto` 유지·880×587 리사이즈) 전건 통과, 콘솔 에러 0
    - 전수 확인 중 **같은 충돌이 live layout 6종에 더 있음**을 발견 — 기존 덱 렌더가 바뀌는 범위라 [Issue360](#issue360) 으로 분리

## Issue343: m2slide 파서와 pandoc 이 같은 원고를 다르게 읽는다 — HTML 덱과 pptx 가 갈린다 (등록: 2026-09-10, 해결: 2026-09-11, commit: `fd7567e`, `8ad540c`, `4e904c4`, `a0621e9`) ✅
* 목적: Issue342 왕복 검증 중에 드러난 것. **왕복 문제가 아니라 산출물 불일치**다 — 같은 원고가 HTML 덱과 pptx 에서 다른 모양으로 렌더된다
* depends: Issue342
* 상세:
    - **중첩 깊이**: m2slide 파서는 2칸을 1레벨로 읽고([md-m2slide-rules](.claude/rules/md-m2slide-rules.md) "카드 본문 2칸 기준"), pandoc 은 CommonMark(부모 마커 + 공백) 기준이다. `    - 레벨 2`(4칸)를 m2slide 는 레벨 2 로, pandoc 은 레벨 1 로 읽는다
    - **비표준 불릿 표기**: `  -HTML DIV 태그를 사용하여` 처럼 **하이픈 뒤 공백이 없는** 줄을 m2slide 는 산문으로, pandoc 은 앞 리스트 항목의 연속으로 읽는다 (m2Slide_chapter_mode `05-layout-examples.md` 에 실재)
    - 실측(2026-09-10): `./z_test/ig-ppt/6.roundtrip.sh m2Slide_chapter_mode` — `bullet_nesting` −2/+2 · `bullets` −3/+3
* 구현 명세:
    - 고칠 곳이 **변환기인지 원고인지 먼저 가른다**. 비표준 표기는 원고 쪽이 맞고, 중첩 깊이는 두 파서 중 어느 쪽을 정본으로 볼지 결정이 필요하다
    - ⚠️ 원고 수정은 사용자 콘텐츠라 임의로 하지 않는다 — 확인 후 진행
    - 결정 후 `data/m2slide2ppt/fidelity.yml` 의 `bullet_nesting`·`paragraph` 등급을 재조정
* 결과: m2slide → pptx 변환 정책(transform.yml·fidelity.yml)을 실측으로 갱신해 aTest 왕복이 계약대로 전건 통과(원고 16종·시각 must_match 11·전수 대조 0). 사용자 판정 2026-09-11 "완벽하지는 않으나 대체적으로 맞음" 으로 종결. **이월**: 중첩 깊이·비표준 불릿의 정본 결정(m2Slide_chapter_mode +5장·글자 25종)과 무제 이미지 장 배치는 원고 수정 여부 결정이 필요해 [Issue358](#issue358) 미세 조정에서 같은 방식(실측 → 정책 → 러너)으로 이어 간다

## Issue357: `htmlart process` 가 pptx 에서 SmartArt 가 아니었다 — lane G 신설 (등록: 2026-09-11, 해결: 2026-09-11, commit: `4e904c4`, `a0621e9`) ✅
* 목적: 사용자 지적 — htmlArt 는 애초에 PowerPoint SmartArt 를 본뜬 것인데 pptx 는 ppt-info 도형 근사(lane B `cards`+`flow_arrow`)로 나와 HTML 과 꼴이 다르고 SmartArt 로 편집도 안 됐다
* depends: Issue355
* 상세:
    - 정본 대응은 **SmartArt 그 자체**(역방향 [mappings.yml](data/ppt2m2slide/mappings.yml) "Basic Process" → process 와 대칭). 파트 5종(data·layout·quickStyle·colors·drawing)을 직접 만든다 — python-pptx 에 다이어그램 API 가 없어 `pptx.opc` 로 파트·관계를 맺는다
    - 레이아웃·색·스타일 정의는 PowerPoint 앱 자원(`SmartArt.framework/Resources` lo/cs/qs — `process1.glo`·`accent1_1.gcs`·`simple1.gqs`, 평문 XML)에서 읽는다. 자원이 없는 기계는 lane G 가 사이드카를 `lane: b` 로 되돌려 lane B 가 이어받는다(그래서 lane B **앞**에 돈다)
    - 캐시(`dsp:drawing`)는 HTML `renderProcess` 실측 기하로 그린다(viewBox 196/230/52/28 · 강조색 테두리 2 · 모서리 14 · 제목 `titleFsFor` 체인 최솟값 · 하위 ×0.66 · 삼각 화살표 검정 45%) → 열자마자 HTML 과 같은 꼴, 편집하면 SmartArt 규칙(Basic Process 재배치)
    - ⚠️ **`diagramDrawing` 관계는 슬라이드 rels** 에 있어야 한다(`dsp:dataModelExt@relId` = 슬라이드 rId). data 파트에 걸었더니 LibreOffice 가 빈 그룹으로 들여왔다 — 이식 실험(PowerPoint 저장본 파트를 우리 장에 통째로)으로 좁혀 잡았다. LibreOffice 는 캐시만 그리고 자기 레이아웃은 하지 않는다. 기록: [debug_TECH.md](_doc_work/debug_TECH.md)
    - 역변환은 `dgm:dataModel` 의 parOf 로 항목·하위·순서를 그대로 되찾고 종류는 lane S 신호 → 레이아웃 id 순. 전수 대조는 데이터 모델 글자를 센다. 계약 `htmlart_smartart: lossless` 신설
    - 이월: timeline·chevron·step·funnel 등은 lane B 그대로 — 레이아웃별 캐시 기하 실측이 필요해 `smartart.catalog` 에 더할 때 별도 이슈
* 구현 명세: [smartart.py](lib/pptx/smartart.py)(신설) · [lane-g.py](lib/pptx/lane-g.py)(신설) · [build-source.py](lib/pptx/build-source.py) ⑫ `lane: g` · [build-pptx.sh](lib/pptx/build-pptx.sh) ③-b2 · [transform.yml](data/m2slide2ppt/transform.yml) `smartart` · [fidelity.yml](data/m2slide2ppt/fidelity.yml) · [pptx2source.py](lib/pptx/pptx2source.py)·[check-parity.py](lib/pptx/check-parity.py)·[check-roundtrip.py](lib/pptx/check-roundtrip.py) · [CLAUDE.md](CLAUDE.md) "lane G" 절
* 결과: aTest p7 LibreOffice 렌더가 HTML 과 일치 · 왕복 원고 동일(`htmlart_smartart 1/1 lossless`) · 시각·전수 대조 전건 · 4.laneb 6/6 · conform WARN 0. ⚠️ PowerPoint 실물 확인은 사용자 몫 — 구조는 PowerPoint 저장본(pres 포인트·캐시·슬라이드 rels)과 같게 맞췄다

## Issue356: HTML `htmlart pie` 가 균등 분할됐다 — 정규식 이중 이스케이프 (등록: 2026-09-11, 해결: 2026-09-11, commit: `8ad540c`) ✅
* 목적: `::: htmlart pie` 의 `모바일 45%` 가 HTML 에서 25% 로 그려졌다(ego-browser 실측) — pptx 대조 중 HTML 쪽에서 발견
* depends: Issue353
* 상세:
    - [htmlart_dispatch.client.js](lib/component-hooks/htmlart_dispatch.client.js) 정규식 3줄(996·1080·1152)의 `\\s` 가 문자열 안에서 `\s` 가 아니라 리터럴 `\\s` 가 되어 값 토큰(`N%`)이 안 잡혔다 → 전 항목 `value=null` → 균등 분할
* 구현 명세: 3줄을 `\s` 로 교정. pie 외 balance 등 같은 패턴을 쓰는 렌더러도 같은 줄에서 고쳤다
* 결과: 45/30/15/10 정상 · 범례 `모바일 (45%)` · pptx 네이티브 차트와 값 일치

## Issue355: 글+표/그림 장(`Content with Caption`)의 배치가 HTML 과 달랐다 (등록: 2026-09-11, 해결: 2026-09-11, commit: `fd7567e`, `8ad540c`) ✅
* 목적: pandoc 은 글을 좁은 좌측에·표/그림을 우측에·alt 를 캡션으로 낸다. HTML 은 **리스트+이미지만** 2분할이고 문단+표는 위아래(표 내용 폭·가운데·회색 머리행), 캡션은 없다(alt 는 `img[alt]` 로만)
* depends: Issue354
* 상세:
    - HTML 실측(ego-browser 1920×1280): `.m2-cols` 868/868 gap 72 · 표 th/td 45.4px pad 16/40 · th bg rgba(0,0,0,.06) · td 밑선 1px rgba(0,0,0,.2) · 문단 아래 40px
    - 2분할은 **리스트+이미지** 일 때만(pandoc 은 평문 문단에만 `<a:buNone/>` 을 적어 구분된다). 문단+이미지·무제 이미지 장은 pandoc 자리 그대로 둔다 — HTML 배치가 다른 규칙(세로 흐름·`_blank`)이라 근사하지 않는다(Issue343 이월)
    - 캡션은 항상 그림 `descr`(alt-text)로 옮기고 상자를 없앤다. 역변환은 `descr` 를 alt 로 되돌리고, 전수 대조는 `descr` 를 `img[alt]` 와 짝짓는다
    - 표는 pandoc 표 스타일(`tableStyleId`·firstRow·bandRow)을 끄고 셀 여백·글자·머리행 채움·밑선을 직접 적는다. 열 폭은 모노스페이스 폭 어림(한글 1em·그 외 0.5em)+패딩
    - 제목이 없는 장도 해당한다 — 처음엔 제목 유무 분기 안에 호출을 두어 m2Slide_chapter_mode p18·p19·p22 가 빠졌다
* 구현 명세: [transform.yml](data/m2slide2ppt/transform.yml) `split_geometry`·`table_geometry` · [lane-t.py](lib/pptx/lane-t.py) `relayout_caption`/`has_bullets` · [pptx2source.py](lib/pptx/pptx2source.py) alt ← `descr` · [check-parity.py](lib/pptx/check-parity.py) · [check-visual.py](lib/pptx/check-visual.py) 시각 축 `caption_layout`(must_match) · [fidelity.yml](data/m2slide2ppt/fidelity.yml)
* 결과: aTest p5(표)·p6(그림) LibreOffice 렌더가 HTML 과 일치 · m2Slide_chapter_mode `Content with Caption` 7장 위반 0

## Issue354: 제목 서체가 안 먹었다 — 마스터 placeholder 리터럴 + 한글 ea + OS family (등록: 2026-09-11, 해결: 2026-09-11, commit: `fd7567e`, `8ad540c`) ✅
* 목적: Issue350 이 `majorFont` 를 바꿨는데도 PowerPoint·LibreOffice 에서 제목이 `NanumGothicCoding` 이었다 — 사용자 "폰트 안 맞음(모든 페이지)"
* depends: Issue350
* 상세 (겹이 셋이다):
    - ① `theme2reference`·`retheme --font-only` 가 마스터/레이아웃 **제목 placeholder lstStyle 에 서체를 리터럴로** 적어 `+mj-lt` 참조가 끊겨 있었다 → `set_major_font` 가 `+mj-lt/+mj-ea/+mj-cs` 로 되돌리고 `defRPr b` 를 정책대로 맞춘다
    - ② 한글 제목은 latin 이 아니라 **ea·`script="Hang"`** 서체로 그려진다 → majorFont 의 latin·ea·cs·script 전부를 같은 이름으로 (HTML 도 한글 제목에 GmarketSansBold 하나를 쓴다)
    - ③ OS family — name 테이블 ID1 `Gmarket Sans Bold` 로 갔다가 되돌렸다(라틴만 맞고 한글 ea 매칭이 깨짐). PowerPoint 서체 캐시(`FontCache/systemfontmetadata.json` fa)와 LibreOffice A/B 렌더 모두 **`Gmarket Sans` + b=1** (face 가 Light/Medium/Bold 뿐이라 family + bold 가 Bold face)
    - ④ [pptxutil.py](lib/pptx/pptxutil.py) 신설 — PowerPoint 저장본이 OMML 본문을 `mc:AlternateContent` 로 감싸 `slide.shapes` 가 못 보던 것을 `iter_shapes` 로 순회. 첫 판의 `id(child)` 중복 제거가 lxml 프록시 id 재사용으로 **도형을 건너뛰어** 러너가 가로선 17→12 오탐을 냈다(제거)
    - 표지 제목 155px(computed) · 표지/Agenda 제목 `noAutofit`(상자 높이 = 글자 높이라 뷰어 재계산 시 줄어든다) · 강사 박스 2px FFD700 radius 6
    - check-visual `title_font` 가 majorFont latin·ea/Hang·마스터 placeholder 리터럴 셋을 다 본다 — 이 부류를 초록불로 통과시키던 구멍. `css_body_font` 의 `mono|coding` 제외 휴리스틱도 제거(default_lec 본문이 'Nanum Gothic Coding')
    - 진단 기록: [debug_TECH.md](_doc_work/debug_TECH.md) "2026-09-11 m2slide→pptx 제목 서체·도형 순회 오진"
* 구현 명세: [transform.yml](data/m2slide2ppt/transform.yml) `font`·`cover_geometry` · [lane-t.py](lib/pptx/lane-t.py) `set_major_font(bold=)`·`add_outline(radius)` · [pptxutil.py](lib/pptx/pptxutil.py) · [check-visual.py](lib/pptx/check-visual.py)
* 결과: 전 9장 제목 Gmarket Sans Bold(LibreOffice v8 렌더, 한글 포함) · 시각 축 must_match 전건 · 전수 대조 모자란 것 0

## Issue353: `htmlart pie` 가 pptx 에 없었다 — 네이티브 파이 차트 + 도형 범례 (등록: 2026-09-11, 해결: 2026-09-11, commit: `fd7567e`, `8ad540c`) ✅
* 목적: lane B 카탈로그 밖(pie)은 lane C(ig-maker) 소관이라 pptx 에 평문 불릿만 남았다 — 사용자 "파이 그래프 안 들어감"
* depends: Issue352
* 상세:
    - "근사하지 않는다" 원칙의 예외 — **차트는 pptx 가 자기 어휘로 가진 것**이라 근사가 아니다. python-pptx `add_chart(PIE)` + plotArea `manualLayout` 으로 HTML 실측 자리(중심 675,715 · r 407)
    - 범례는 차트 내장이 아니라 **도형**(색 칩 roundRect + `이름 (N%)` + 서브라벨) — 내장 범례의 manualLayout 은 뷰어마다 다르게 풀리고(LibreOffice 는 한 줄로 눕힌다) 라벨 꼴·서브라벨을 못 담는다. 전부 `m2slide:content/pie-*` 표식
    - HTML 범례 글자는 svg viewBox(964×600) 안 foreignObject 라 **viewBox 단위** — 캔버스 축척 1.565 를 곱해 label 31.3 · sub 23.5 · pct 37.6px. 첫 판(20/15/24)이 그대로 pt 로 가서 작았다
    - 역변환: 차트 범주 → `* 모바일 45%` · `pie-sub` 표식 → `  - iOS·Android`. 전수 대조는 범례 글자를 범주의 파생물로 걷어내고, 카드 판정에서 색 칩을 뺀다
* 구현 명세: [transform.yml](data/m2slide2ppt/transform.yml) `native_charts`·`pie_geometry` · [fidelity.yml](data/m2slide2ppt/fidelity.yml) `htmlart_lane_c: lossless` · [lane-t.py](lib/pptx/lane-t.py) `render_pie` · [pptx2source.py](lib/pptx/pptx2source.py) · [check-parity.py](lib/pptx/check-parity.py)
* 결과: aTest p8 — 45/30/15/10 · 범례·서브라벨 HTML 과 일치 · 왕복 원고 동일(`htmlart_lane_c 1/1 lossless`)

## Issue352: 코드 블록이 pptx 에서 HTML `pre` 꼴이 아니었다 + placeholder 높이 0 (등록: 2026-09-11, 해결: 2026-09-11, commit: `fd7567e`, `8ad540c`) ✅
* 목적: 사용자 실측(PowerPoint) — 코드가 상자 없이 본문 글자로 눕고 크기·색이 달랐다
* depends: Issue351
* 상세:
    - HTML `pre` 실측(ego-browser 1920×1280): 56,245,1808×155 · pad 27/34 · fs 38.6px(첫 판 34 는 오측) · lh 49.3 · bg F6F8FA · radius 6 · 키워드 D73A49 · 아래 요소까지 60
    - lane T `restyle_code` 가 placeholder 를 상자 안으로 옮길 때 `top` 만 써서 python-pptx 가 ext 0×0 xfrm 을 만들어 **높이 0** → 뷰어 `normAutofit` 이 글자를 점처럼 줄였다(LibreOffice 렌더 5px). 높이 부여 + `noAutofit`
    - 코드 상자는 `m2slide:ornament/codebox` 표식 → 역변환·전수 대조가 걸러낸다. build-pptx ③-b 강조색 교정은 코드 문단(`buNone`+latin)을 건너뛴다
* 구현 명세: [transform.yml](data/m2slide2ppt/transform.yml) `code_geometry` · [lane-t.py](lib/pptx/lane-t.py) `restyle_code`/`is_code_para` · [build-pptx.sh](lib/pptx/build-pptx.sh) ③-b
* 결과: aTest p4 — LibreOffice 렌더가 HTML 과 일치(Menlo 19.3pt · 키워드 색 · 상자 · 수식은 상자 아래)

## Issue350: pptx 서체가 HTML 과 달랐다 — Windows 폰트를 고르고 있었다 (등록: 2026-09-11, 해결: 2026-09-11, commit: `417bd04`, `f09a28b`) ✅
* 목적: 글로벌 `theme-from-css.py` 가 CSS 체인에서 `Malgun Gothic`(Windows)을 골라 macOS 에서 대체 렌더됐다. 같은 파일이 기계마다 다르게 보인다
* depends: Issue349
* 상세:
    - HTML 실측(ego-browser) — 제목 `GmarketSansBold` · 본문 `Nanum Gothic Coding`. 둘 다 이 기계에 설치돼 있다
    - theme.yml 에는 서체가 **하나뿐**이라 `theme2reference` 가 major/minor 를 같은 값으로 넣는다
    - ⚠️ **두 번 되돌려졌다** — ① `set_major_font` 를 `prs.save()` **앞**에 부르면 메모리 내용이 덮어쓴다 ② `retheme.py --font-only`(③-c)가 theme.yml 서체로 pptx 전체를 덮는다. 그래서 최종 교정은 **retheme 뒤 단계**(lane T ornament)에서 한다
* 구현 명세: [`transform.yml`](data/m2slide2ppt/transform.yml) `font:` 가 실측 서체를 소유 · build-pptx ①-c 가 본문 서체를, lane T 가 제목 서체(`majorFont`)를 적용
* 결과: major `GmarketSansBold` · minor `Nanum Gothic Coding` — HTML 실측과 일치

## Issue351: Agenda 장이 pptx 에 없었다 + 목차 레이아웃 미적용 (등록: 2026-09-11, 해결: 2026-09-11, commit: `417bd04`, `f09a28b`) ✅
* 목적: HTML 은 `agenda.html` 을 **별도 페이지로 항상** 내는데 pptx 에는 그 장이 없었다
* depends: Issue350
* 상세:
    - agenda.html 내용은 **JS(markmap)가 그린다** — 정적 HTML 에 글자가 없어 전수 대조가 볼 수 없다. 그래서 계약에 `synthesized` + `slides: 1` 로 선언하고 대조기가 그만큼 허용한다
    - HTML `layout-_agenda` 는 reveal 덱이 아니라 별도 프레임(`.agenda-frame` 896×597)이라 **프레임 기준 좌표를 캔버스 1920 으로 환산**했다
* 구현 명세: build-source ⑮ 가 표지 다음에 Agenda 장을 만든다(제목 고정 `Agenda`) · lane T 가 노란 테두리 박스·고양이 마스코트·좌측 제목을 입힌다 · 역변환이 그 장을 걸러낸다(원고에 없으므로)
* 결과: aTest 9장(HTML 8 + agenda 1) · 왕복·시각·전수 대조 전부 통과 · lane B 6/6 · lane M · lint-data 통과

## Issue348: 장 구성이 HTML 과 pptx 에서 갈렸다 — 읽는 설정이 달랐다 (등록: 2026-09-10, 해결: 2026-09-10) ✅
* 목적: 같은 원고가 HTML 8장 · pptx 10장으로 나왔다. 세 검사가 모두 통과하는데도 그랬다
* depends: Issue347
* 상세:
    - **읽는 설정 집합이 다르다** — HTML([`config.js`](lib/config.js))은 `cards_placeholder`·`toc_placeholder` 를 읽는데 [`build-source.py`](lib/pptx/build-source.py) 는 `cover_enabled` **하나만** 읽었다. 그래서 `cards_placeholder: false`(H1 슬라이드 제거)를 pptx 가 무시하고 H1 진입 장 + 자동 목차 장을 만들었다
    - **계약이 원고만 봤다** — `h1_chapter: lossless` 는 원고 기준이고 산출물 기준이 아니었다. 원고 축과 시각 축이 다른 정본을 보던 자리
    - **`agenda_chapters` 가 늘 0건이었다** — `## [제목]` 만 찾는데 실제 AGENDA 는 `# [제목]`(H1). m2Slide_chapter_mode 7챕터를 한 번도 인식하지 못했다(기존 결함)
    - **전수 대조가 장 수를 실패로 세지 않았다** — 출력만 했다
* 구현 명세: build-source 가 두 설정을 읽는다 · chapter mode 판정은 `markdown/` 디렉토리로(AGENDA 파싱 결과에 기대지 않는다) · `agenda_chapters` 가 H1 도 받는다 · check-parity 가 장 수 불일치를 실패로 든다
* 결과: aTest HTML 8 = pptx 8. m2Slide_chapter_mode 는 HTML 31 · pptx 35 로 **+4 남음**(원인 미확인 — pandoc 이 장을 더 나누는 축으로 보이나 확인하지 않았다)

## Issue349: pptx 카드가 m2slide 카드와 다른 디자인이었다 (등록: 2026-09-10, 해결: 2026-09-10) ✅
* 목적: lane B 가 글로벌 ppt-info 의 `cards`(좌측 액센트 바 + 회색 본문)를 쓰는데 m2slide 카드는 **상단 노란 제목 밴드 + 본문**이다. 세로 위치도 달랐다(lane B 중앙 · HTML 상단)
* depends: Issue348
* 상세:
    - 실측(ego-browser) — HTML 카드 `l 56 · t 253 · w 593 · h 237` · 밴드 `h 130 · bg #F5C518` · 본문 `fs 40`. pptx 는 `t 595` · 전체 `F2F5FA` + 좌측 10px 액센트 바(3색 순환)
    - 전수 대조가 **글자만** 보므로 이 차이를 못 잡았다
* 구현 명세: [`lane-t.py`](lib/pptx/lane-t.py) `redraw_cards` 가 lane B 도형에서 글자를 회수해 m2slide 카드로 다시 그린다. **커넥터가 있으면 손대지 않는다**(순차 블록은 별도 판단)
* 결과: aTest 카드 3개 재작성 · lane B 회귀 6/6(단언 ③ 을 테마 장식 제외로 갱신) · 왕복·시각·전수 대조 전부 통과

## Issue345: pptx 에 m2slide 테마의 **꼴** 이식 — lane T (등록: 2026-09-10, 해결: 2026-09-10) ✅
* 목적: Issue344 가 색·판형을 맞췄지만 pptx 를 PowerPoint 로 열면 여전히 민 흰 바탕이었다. *"뭐가 같냐"* 는 지적의 실체가 여기 있었다
* depends: Issue344
* 상세:
    - **placeholder 가 슬라이드 폭을 안 채운다** — `theme2reference --adapt` 는 슬라이드 **크기만** theme.yml canvas 로 키우고 placeholder 좌표는 pandoc 기본(10×7.5in)으로 둔다. 13.33in 판에 9.5in 상자가 앉아 **우측 3.8in 가 빈 채로** 배포됐다. 눈에 가장 크게 띄는 차이였다
    - **테마 장식이 없다** — m2slide 는 상·하단 노랑 가로선과 제목 밑줄(`hr.png`)로 판을 짜는데 pptx 에는 그 어휘가 없었다
* 구현 명세:
    - [`lane-t.py`](lib/pptx/lane-t.py) 신설 — `--mode layout`(reference placeholder 재배치) · `--mode ornament`(최종 pptx 에 가로선·밑줄). python-pptx 가 마스터에 그림을 넣지 못해 두 걸음이다
    - 좌표는 **HTML 덱을 실제로 렌더해 잰 값** — CSS 선언만으로는 flex 최종 위치가 정해지지 않는다. [`transform.yml`](data/m2slide2ppt/transform.yml) `theme_geometry` 가 소유하고 이식·검증이 **같은 값**을 읽는다
    - `hr.png` 는 손으로 그은 붓 자국이라 **도형으로 근사하지 않고** 이미지를 그대로 넣는다
    - 시각 계약에 `content_box`·`theme_rule`·`title_underline` 3축 추가 (must_match)
* 결과:
    - aTest·m2Slide_chapter_mode 둘 다 시각 축 `must_match` 7/7 일치. 판·가로선·밑줄이 HTML 실측과 정확히 같다
    - 장식 그림에 `m2slide:ornament` alt-text 표식 — 없으면 왕복이 본문 이미지로 읽는다(실측: 10장에 21개 오염 → 표식 후 1=1)
    - 남은 `known_gap` 2종 — 본문 서체(Windows 폰트 선택)·**세부 꼴**(카드 밴드 모서리·자간·줄간). 세부까지는 CSS→pptx 번역기가 필요하다
* 미해결 🚧:
    - `theme_geometry` 는 `default` theme 기준 실측이다. **다른 theme 을 쓰면 다시 재야 한다** — 자동 측정 경로가 없다

## Issue344: pptx 판형·테마 색이 HTML 덱과 달랐다 — 시각 축 계약 신설 (등록: 2026-09-10, 해결: 2026-09-10) ✅
* 목적: Issue342 가 만든 왕복 계약은 **원고 축만** 잰다. 그 사이 `slide_ratio: "3:2"` 인 덱이 16:9 pptx 로 나가는 동안 왕복 검사는 초록불이었다 — Issue342 가 지적한 것("규격만 재고 충실을 안 잰다")과 **같은 종류의 사각지대**를 새로 만든 셈이다
* depends: Issue342
* 상세:
    - **판형 불일치**: 글로벌 [`theme-from-css.py`](file:///Users/nowage/.claude/skills/ppt-spec/scripts/theme-from-css.py) 의 `CANVAS` 에는 `16:9`·`4:3`·`a4` 뿐이라 m2slide 의 `3:2` 를 표현할 어휘가 없고, [`build-pptx.sh`](lib/pptx/build-pptx.sh) 는 `--canvas` 를 넘기지도 않아 **언제나 16:9 로 굳었다** (실측 aTest·m2Slide_chapter_mode 둘 다)
    - **먹색 불일치**: 제목 run 은 색을 직접 갖지 않고 테마 `dk1` 을 상속하는데, 그 값이 `#1A1A1A` 였다. CSS 정본은 `--kn-text: #111111` (ΔE 15.6). 기존 ②-b 교정은 placeholder 에 `srgbClr` 이 **직기입된** 경우만 고치므로 테마 상속을 못 잡았다
* 구현 명세:
    - [`build-pptx.sh`](lib/pptx/build-pptx.sh) ①-c — 산출된 `theme.yml` 의 canvas 높이와 `palette.ink` 를 CSS 실측으로 덮는다. **글로벌 스킬은 건드리지 않았다**
    - [`fidelity.yml`](data/m2slide2ppt/fidelity.yml) `visual:` 절 신설 — 판형·강조색·배경·제목색(`must_match`) · 서체·레이아웃 꼴(`known_gap`)
    - [`check-visual.py`](lib/pptx/check-visual.py) 신설 + 러너 ⑤ 로 편입
* 결과:
    - aTest·m2Slide_chapter_mode 둘 다 `must_match` 전건 일치. 원고 왕복은 무영향(33=33 유지)
    - 남은 `known_gap` 2종 — 본문 서체(pptx 가 CSS 체인에서 Windows 폰트 `Malgun Gothic` 을 고른다)·레이아웃 꼴(글로벌 스킬이 색·서체만 옮기도록 설계돼 있다)
* 미해결 🚧:
    - 근본 원인인 **글로벌 `theme-from-css.py` 에 `3:2` 부재**는 그대로다. 로컬에서 덮고 있을 뿐이라 다른 프로젝트가 같은 함정을 밟는다 — `~/.claude/Issue.md` 이슈 등록 대상(타 repo 수정이라 사용자 승인 필요)
    - 레이아웃 꼴 이식은 pptx 레이아웃 마스터를 m2slide theme 에서 생성하는 별도 규모의 일

## Issue342: m2slide → pptx 에 변환 정책이 없다 — round-trip 계약 신설 + agent 화 (등록: 2026-09-09, 해결: 2026-09-10, commit: 3835de0, bb837c5) ✅
* 목적: 역방향(`pptx → m2slide`)은 [`data/ppt2m2slide/`](data/ppt2m2slide/) 3종 yml 로 데이터-주도인데, **정방향(`m2slide → pptx`)은 정책이 전부 코드 상수·정규식에 박혀 있다**. 그래서 *"이 변환에서 무엇이 어떻게 손실되는가"* 를 선언할 자리도, 검증할 장치도, 학습할 경로도 없다. 이 비대칭이 pptx 산출 품질 회귀가 조용히 통과하는 근본 원인이다
* 상세:
    - 정책이 코드에 박힌 지점 — [`build-source.py`](lib/pptx/build-source.py): `FENCE_DROP`·`FENCE_DROP_LABEL`(컴포넌트 드롭 카탈로그) · `ID_LINE`·`ANIM_LINE`·`SLOT_RIGHT`(디렉티브 제거) · `ATTR`·`SYMBOL`·`ELEMENT_COMMENT`(인라인 제거) · `LANE_B_CATALOG`(도형 렌더 대상) · `normalize_chapter`(챕터 TOC **자동 생성**) · `defer_heavy`(표·그림 순서 변경)
    - 현행 검증 3종(`check-conform`·`check-xml-order`·`check-empty`)은 **pptx 내부 규격**만 잰다. *"원고가 pptx 에 제대로 옮겨졌는가"* 는 아무도 재지 않는다
    - 실측(aTest 10장 픽스처, 2026-09-09): 빌드 rc0 · FAIL 0 · WARN 0 인데도 frontmatter 전량 · `#id-*`·`#transition-*` 디렉티브 · `{.fragment}` · `::: htmlart pie`(lane C 이월) · ` ```chart ` 컴포넌트가 소실되고, 원본에 **없던** 챕터 TOC 장이 생성됨
* 구현 명세:
    - 신설 `data/m2slide2ppt/` (kind: policy/stage) — 요소별 pptx 표현과 **복원 등급**(lossless·lossy·declared-drop)을 선언하는 round-trip 충실도 계약
    - 신설 round-trip 검증 — 원본 md ↔ 역변환 md 를 대조해 **계약에 선언되지 않은 손실**만 FAIL 로 든다. 선언된 손실은 통과(그것이 계약의 목적)
    - 변환 기능을 agent 방식으로 전환 — 코드 상수를 정책 yml 로 외부화하고 판정을 agent 가 소유
    - 수렴 판정: `aTest → pptx → aTest_rt` 왕복에서 **undeclared diff 0** 이 될 때까지 정책 갱신 반복
* 결과:
    - 계약 요소 32종 — lossless 15 · lossy 9 · declared_drop 6 · synthesized 2
    - **aTest 왕복 수렴**: 슬라이드 8=8 · 불릿 21=21 · frontmatter 11 필드 · `#id-*` 7건 ·
      `#transition-zoom` · `::: htmlart pie` · `{.fragment}` · 코드 언어 전부 복원.
      남은 손실은 컴포넌트 config 1건(lane A 진입 전 삭제되어 원리적으로 복원 불가)
    - lane S 신설 — 도형 alt-text + `docProps/custom.xml` 에 복원 신호. 둘 다 pptx
      표준 필드라 화면에 안 보이고 PowerPoint 편집·재저장에 살아남는다
    - m2Slide_chapter_mode 일반화 검증에서 계약 밖 차이 5건 → 1건. 남은 1건은
      **원고의 비표준 표기**가 원인이라 Issue343 으로 분리(원고는 건드리지 않았다)
    - 회귀 4.laneb 6/6 · 5.lanem 통과 · lint-data 통과


## Issue341: policy 미해결 3종 처리 — 승격 심사·축 2 소비·리스트 치환 (등록: 2026-09-09, 해결: 2026-09-09) ✅
* 목적: Issue340 이 남긴 미해결 셋을 닫는다. 셋 다 **장치는 있는데 작동하지 않는** 상태다 — 승격은 사람이 기억해야 일어나고, 덱 목적(축 2)은 소비하는 룰이 0건이며, 가장 위험한 병합 함정에는 검사가 없다
* depends: Issue340

### Issue341_1: 커밋 시 승격 심사 환기
* 상세:
    - 승격 4단계(관측 → `aggregate-feedback.py` → `_proposals/promotion-*.md` → 사람 판단)의 **3번이 사람 기억에 의존**한다. 실측: `pending` 3건이 이 세션의 커밋 4회 동안 한 번도 환기되지 않았다
    - 그중 `promotion-1779899438-text_diff.md` 는 `count 7 · threshold 3` 으로 [`_suggest_confidence()`](lib/tuner/promote-to-data.py) 기준 **`medium` 제안 대상**이다. 즉 심사받아야 할 후보가 실제로 대기 중인데 아무도 모른다
* 구현 명세:
    - [check-policy-commit.sh](lib/hooks/check-policy-commit.sh) 와 같은 자리(pre-commit)에서 `data/_proposals/promotion-*.md` 의 `status: pending` 을 세어 **심사 대상만** 알린다
    - 심사 대상 판정은 `_suggest_confidence()` 와 **같은 규칙**을 쓴다(`count >= max(threshold, 2)` → medium). 규칙을 두 벌 두면 갈라진다 — 파이썬 헬퍼를 훅이 호출하는 형태
    - ⚠️ **자동 승격 금지.** 승격이 사람 승인인 것은 설계의 핵심이다(프로젝트 하나의 사정이 전 프로젝트 기본값을 조용히 바꾸면 안 된다). 훅은 **차단도 하지 않는다** — 알리기만 한다
    - `count <= 1` 인 low 후보는 소음이므로 요약 한 줄로만 센다

### Issue341_2: 축 2(덱 목적)를 실제로 소비하는 첫 룰
* 상세:
    - ⚠️ **원인 정정**: 앞선 보고에서 *"Info.md 15개 purpose 미기재라 완화 경로가 비어 있다"* 고 적었으나 실측 결과 **`applies_to_purpose`·`relax_when` 을 쓰는 룰이 0건**이다. purpose 를 15개 다 채워도 **완화 효과는 0**이다 — 미기재는 증상이 아니라 무해한 상태(미기재 = `lecture` 간주 = 현행 동작 = 회귀 0)
    - 진짜 공백은 **축 2를 소비하는 룰이 하나도 없다**는 것이다. lint 는 그 필드의 유효성을 검사할 준비만 돼 있다(검사 10·11)
* 구현 명세:
    - 근거 있는 첫 소비처 하나만 붙인다 — [policy-goal-schema.md](_doc_arch/policy-goal-schema.md) 가 `promo` 를 *"광고·홍보, 비주얼 우선 · 완화(통짜 비주얼 허용)"* 로 정의하고, `drop_redundant_page_screenshot`(통짜 페이지 래스터 제거)이 정확히 그 반대편 규칙이다. 홍보 덱에서는 통짜 비주얼이 **정당한 선택**이므로 이 룰에 `applies_to_purpose` 를 단다
    - ⚠️ **`purpose` 값을 덱에 임의로 채우지 않는다.** 어느 덱이 홍보용인지는 콘텐츠 판단이라 사용자 확인 사항이다([identifier-meta-rules](.claude/rules/identifier-meta-rules.md) 와 같은 취지). 룰 쪽 배선만 먼저 하고, 실제 `purpose: promo` 기재는 사용자가 지목한 덱에만 넣는다
    - `--lint-data` 검사 10 이 이 필드를 이미 검사하므로 배선만으로 집행이 붙는다

### Issue341_3: 리스트 치환 함정 lint
* 상세:
    - deep-merge 는 dict 만 재귀하고 **리스트는 L2 값으로 통째 치환**한다(결정성 우선). 그런데 primary yml 의 최상위 컬렉션은 대부분 리스트라, L2 에 신규 항목 1개만 적으면 **L1 의 기존 항목이 전부 사라진다** — *"추가"* 를 의도했는데 결과는 *"대체"* 다(Issue308 파일럿 실측)
    - 현재 방어는 [pipeline-policy-cascade.md](_doc_arch/pipeline-policy-cascade.md) 의 ⚠️ 문단 **하나뿐**이고 검사가 없다. 사람이 그 문단을 읽었는지에 걸려 있다
* 구현 명세:
    - [lint-policy-schema.py](lib/lint-policy-schema.py) `lint_l2_overrides()` 계열에 검사 추가 — L2 가 L1 의 리스트를 **축소**했으면(병합 결과 길이 < L1 길이, 또는 L1 항목이 결과에서 사라졌으면) 보고한다
    - ⚠️ **의도적 축소는 정당하다** — 그래서 FAIL 이 아니라 **경고**다. 다만 *"몰라서 잃은 것"* 과 *"알고 줄인 것"* 을 가르기 위해 사라진 항목을 이름으로 나열한다
    - 판정은 항목 id·name 키가 있으면 그것으로, 없으면 원소 자체로 비교한다
* Checkpoints:
* 결과:
    - **341_1 승격 심사 환기 ✅** — [promote-to-data.py](lib/tuner/promote-to-data.py) 에 `--review` 추가(심사 대상만 출력, rc 1 = 대상 있음). 판정은 `_suggest_confidence()` 를 **그대로 재사용**한다(규칙을 두 벌 두면 갈라진다). [check-promotion-due.sh](lib/hooks/check-promotion-due.sh) 신설 + [install-hooks.sh](lib/hooks/install-hooks.sh) 를 훅 2종 설치로 일반화. **정책 yml 유무와 무관하게 매 커밋 동작**한다(승격은 다른 축)
        - 구현 중 발견: `Proposal` 에 `threshold` property 가 없어 `--review` 가 즉시 죽었다. 누락 시 1 로 두되 `max(threshold, 2)` 계산이 보수적이라 **모르는 값이 승격을 앞당기지 않는다**
        - **실측 동작 확인** — 직후 정책 커밋에서 심사 대상 1건이 실제로 환기됐다
    - **341_2 축 2 첫 소비 ✅** — `drop_redundant_page_screenshot` 에 `applies_to_purpose: [lecture, info, handout]` · `relax_when: [promo, archive]` 부여 (commit `2f05a4e`)
        - ⚠️ **원인 재정정**: 런타임 게이트 `purpose_gates_out()` 는 **이미 구현돼 있었다**(Issue307). 빠진 것은 그것을 쓰는 룰이었다 — 필드를 붙이자 즉시 작동했다(실측: lecture·info·handout=False / promo·archive=True)
        - `purpose` 값을 덱에 임의로 채우지 않았다 — 어느 덱이 홍보용인지는 콘텐츠 판단이라 사용자 확인 사항이다. 미기재 = `lecture` 간주 = 회귀 0
    - **341_3 리스트 치환 lint ✅** — [lint-policy-schema.py](lib/lint-policy-schema.py) 에 `lint_l2_list_shrink()` 신설. L2 가 건드린 리스트만 대조해 **사라진 L1 항목을 이름으로** 나열한다. 의도적 축소가 정당하므로 **경고이지 실패가 아니다**
        - 역검증: 최상위(`tone_presets` 4→0)·중첩(`nested.items` 2 소실) 둘 다 검출. 현 실 프로젝트 위반 0건
* 미해결:
    - 🚧 축 2 를 소비하는 룰이 아직 **1개**다. 나머지 룰은 여전히 전 목적 무차별 적용이며, 확장은 근거가 생길 때마다 개별 판단한다
    - 🚧 `purpose` 기재 자체는 **사용자 판단 대기** — 15개 덱 중 어느 것이 `promo`·`archive` 인지 지목되면 그때 기재한다


## Issue340: data/ 범주 경계 정리 — 허용 목록의 구멍과 L1/L2 용어 충돌 (등록: 2026-09-09, 해결: 2026-09-09) ✅
* 목적: `data/` 아래 파일이 **정책인지 카탈로그인지**, 그리고 **어느 축의 L1/L2 인지**를 판정할 수 있게 한다. 지금은 둘 다 위치로만 추정해야 하고, 그래서 규칙이 현실과 어긋난 채 방치돼 있다
* 상세:
    - **① 허용 목록의 구멍 — `slot-designer` 는 지금 문서상 위반이다.** [data-access-rules](.claude/rules/data-access-rules.md) 는 공유 허용 파일을 **하드코딩 5개**(`component-libraries`·`visual-elements`·`symbol-usage`·`emoji-usage`·`Info.template.md`)로 못박았는데, 실제 `data/` 에는 목록 밖 카탈로그가 **8개** 더 있다:
        - `slot_meta.yml`·`slot_pandoc.yml`·`slot_animation.yml`·`slot_user.yml` — **slot-designer agent 본문이 4종 모두 참조**(실측)
        - `htmlart/types.yml`·`htmlart/smartart-catalog.yml`·`palettes/catalog.yml`·`_meta.yml`·`_meta_lec.yml`
        - 실제로는 정당한 사용이고 **규칙 쪽이 낡았다**. 방치하면 *"어차피 안 맞는 규칙"* 이 되어 진짜 위반도 안 잡힌다
        - 원인은 구조다 — **허용 목록을 사람이 손으로 유지**하므로 카탈로그가 늘 때마다 갱신을 기억해야 하고, 잊으면 조용히 어긋난다
    - **② L1/L2 가 두 축에서 충돌한다.** `data/promo-cartoon/policy.yml` 첫 줄은 자기를 *"(L2, m2slide)"* 라 부르고 글로벌 `~/.claude/data/promo-cartoon/policy.yml` 을 L1 이라 한다. 그런데 [pipeline-policy-cascade.md](_doc_arch/pipeline-policy-cascade.md) 정의표는 `data/<단계>/*.yml` 을 **L1** 으로 못박는다 — **같은 파일이 축에 따라 L1 이자 L2** 다
        - 모순이 아니라 **축이 둘인데 이름이 하나**인 것이다 (축 A: m2slide↔프로젝트 / 축 B: 글로벌 SCAR↔m2slide)
    - **③ cascade 문서의 범위가 현실보다 좁다** — 열거된 "단계" 는 8종인데 `data/` 에는 `ppt2m2slide`·`slide-tuner`·`promo-cartoon` 이 더 있다. 이들이 축 A 밖이라는 명시가 없다
    - ⚠️ 앞선 조사에서 *"헷갈리는 경계"* 로 함께 꼽았던 `_config.yml` vs policy · `rules/*.md` vs policy 는 **이미 정본이 있다**([config-sync-rules](.claude/rules/config-sync-rules.md) · 글로벌 `global-scar-change-detail`). 본 이슈 범위 밖이다
* 구현 명세:
    - **1단계 — 파일이 스스로 범주를 말한다.** `data/` 하위 모든 yml 첫 줄에 `# kind:` 1줄 선언. 이미 전 파일이 첫 줄 자기설명 주석을 갖고 있으므로(실측) **형식을 고정하는 것**이다
        - `policy/stage` — 파이프라인 단계 정책(`data/<stage>/`). 접근은 **자기 단계만**
        - `policy/upstream` — 글로벌 SCAR 정책에 얹는 m2slide 측 값(`promo-cartoon` 류). 그 벤더만
        - `catalog` — 어휘·인벤토리(`slot_*`·`htmlart/`·`palettes/`·`component-libraries` …). **전 단계 허용**
        - 판정 근거가 **위치에서 선언으로** 옮겨가므로 폴더가 늘거나 파일이 옮겨져도 규칙이 안 깨진다
    - **2단계 — 허용 목록을 선언 기반으로 교체.** `data-access-rules` 의 하드코딩 5개 목록을 *"`kind: catalog` 인 파일은 전 단계에서 읽을 수 있다"* 한 줄로 대체 → **구멍 8개 즉시 폐쇄** + 유지보수 부담 제거. `--lint-data` 에 `kind` 부재·오값 검사(검사 6번) 추가로 집행
    - **3단계 — 축 B 에서 `L2` 라는 말을 쓰지 않는다.** `L1/L2` 는 축 A 전용으로 고정하고 축 B 는 `upstream` → `local override`. `data/promo-cartoon/policy.yml` 헤더 1줄 + cascade 문서 "범위" 절에 축 A 전용 명시 + 비단계 폴더 3종 취급 한 줄
    - **하지 않을 것**: `Glossary.md` 에 큰 절 신설 금지 — 21KB 문서에 이 경계가 없다는 사실이 *"거기 써도 안 읽힌다"* 는 증거다(포인터 1행이면 충분). 새 룰 파일 신설 금지 — 고칠 곳은 기존 2개와 각 yml 첫 줄뿐이다. `identity vs policy` 경계는 **혼동 사건이 없어** 조항으로 쓰지 않는다
* Checkpoints:
* 결과:
    - **1단계** — `data/` 하위 yml **26개 전건**에 `# kind:` 첫 줄 선언(`policy/stage` 12 · `catalog` 13 · `policy/upstream` 1). 이미 전 파일이 첫 줄 자기설명을 갖고 있어 형식을 고정하는 작업이었다
    - **2단계** — [data-access-rules](.claude/rules/data-access-rules.md) 의 하드코딩 5개 목록을 *"`kind: catalog` 인 파일은 모든 단계에서 읽을 수 있다"* 로 교체. **구멍 8개 폐쇄** — `slot-designer` 의 문서상 위반 상태가 해소됐다(읽는 `slot_*.yml` 4종이 모두 `catalog` 로 판정)
    - **3단계** — 축 B 에서 `L2` 표기 제거. `data/promo-cartoon/policy.yml` 헤더를 `upstream → local override` 로 고치고, [pipeline-policy-cascade.md](_doc_arch/pipeline-policy-cascade.md) 에 *「이 문서의 L1·L2 는 이 축 전용」* 절 + **비단계 폴더 4종 취급 표** 추가
    - **집행** — [lint-policy-kind.py](lib/lint-policy-kind.py) 신설, `--lint-data` **검사 6번**으로 배선. 선언 누락·오값·위치 불일치(카탈로그 자리에 policy 자칭 = 격리 우회) 3종을 차단. 알려진 실패 3종으로 역검증해 전건 검출 확인
    - `_doc_arch/Glossary.md` 에는 큰 절 대신 **포인터 2행**만 추가 (그 문서에 이 경계가 없었다는 사실 자체가 "거기 써도 안 읽힌다" 는 증거)
    - 검증: `--lint-data` 6/6 통과 · aTest 빌드 무회귀 · 문서 상대경로 링크 4건 유효
* 미해결:
    - 🚧 `data/_meta.yml`·`_meta_lec.yml` 은 **코드 소비처 0건**이고 [Glossary](_doc_arch/Glossary.md) 가 *"구 `_meta.yml` — Issue79부터 폐기"* 라 적고 있다. 폐기 잔재로 보이나 삭제는 별도 판단이라 `kind: catalog` 만 붙여 두었다


## Issue339: m2slide → pptx 조용한 내용 손실 3종 (등록: 2026-09-09, 해결: 2026-09-09, commit: `f4c36eb`) ✅
* 목적: `ppt(pdf) → m2slide → ppt` 왕복에서 **되돌아온 ppt 가 원고보다 적은 것**을 막는다. 지금은 `--pptx` 가 rc0 · FAIL 0 으로 끝나면서 슬라이드 본문이 통째로 비어 나온다 — 실패가 아니라 **성공으로 위장한 손실**이라 배포까지 간다
* 상세:
    - 실측 픽스처: `Projects/aTest`(패턴당 1장으로 축소한 21장 데크). `./m2slide.sh aTest --pptx` → rc0 · FAIL 0 · WARN 1 인데 아래 3종이 사라진다
    - **① 수식이 같은 슬라이드의 본문을 함께 끌고 사라진다 (가장 심각)** — pandoc 3.10 pptx writer 는 Math 인라인을 만나면 그 슬라이드의 콘텐츠 shape 을 **아예 만들지 않는다**. 최소 재현(reference-doc 유무 무관):
        - 코드블록만 → 정상 · 불릿만 → 정상
        - `$$E = mc^2$$` 단독 → 본문 소실 · `$E=mc^2$` 단독 → 본문 소실
        - 불릿 + `$$…$$` → **불릿까지 함께 소실** · 코드블록 + `$$…$$` → **코드까지 함께 소실**
        - `\(…\)` 는 소실은 면하지만 백슬래시만 벗겨진 **리터럴 `(E=mc^2)`** 로 노출
        - aTest p05(코드블록 + 수식) 실측 = 제목 1개만 남은 백지
    - **② 컴포넌트 펜스 드롭이 백지를 남긴다** — [build-source.py](lib/pptx/build-source.py) `FENCE_DROP = {chart, d3, p5, map, model3d, react}` 는 설정·코드 원문 노출을 막는 옳은 판단이지만, **그 자리에 아무것도 놓지 않는다**. aTest p18(chart)·p19(p5) 는 제목만 있는 빈 장으로 배포된다
    - **③ 검증이 이 손실을 보지 못한다** — `check-conform --lane a` 는 본문 0 장을 위반으로 보지 않아 FAIL 0. Issue317 이 세운 차단 게이트가 **가장 흔한 손실 유형에는 열려 있다**
* 구현 명세:
    - **① lane M — 수식을 네이티브 OMML 로 복원**. pandoc 에 Math 를 주지 않는 것이 원인 제거다
        - `build-source.py` 에 ⑬ 단계: `$$…$$` · `$…$` · `\(…\)` 를 코드펜스 밖에서 탐지 → 사이드카 `_pipeline/pptx/lane-m.json` 에 (원고·슬라이드 인덱스·LaTeX·display 여부) 기록 → 원고에는 **마커 문단**으로 치환. 마커는 평문이라 같은 슬라이드의 불릿·코드가 살아남는다
        - 후처리 `lib/pptx/lane-m.py`: 각 LaTeX 를 `pandoc -o x.docx` 로 변환 → `word/document.xml` 의 `<m:oMath>` 를 추출 → pptx 의 마커 문단을 그 OMML 로 교체. **추가 의존 0** (pandoc 은 이미 필수). 실현성 실측 완료 — `$$E = mc^2$$` → `<m:sSup>` 포함 정상 OMML
        - lane B 와 같은 철학: 그림이 아니라 **편집 가능한 네이티브 요소**
        - 배선은 lane B 렌더 **다음**. 실패 시 그 수식만 평문 fallback 으로 남기고 rc0 (lane A 를 깨지 않는다)
    - **② 드롭 자리에 대체 문단** — `FENCE_DROP` 제거 시 그 종류를 밝히는 한 줄을 남긴다. 문구는 구조 표식이며 내용 창작이 아니다(⑨ 목차 라벨과 같은 예외). 캡처 이미지 치환은 후속 후보
    - **③ 본문 0 장 검출** — 제목만 있고 도형·그림·표가 0 인 장을 세어 보고한다. 챕터 진입 장(H1 단독)·표지는 정상이므로 제외한다
    - 회귀 러너: `z_test/ig-ppt/5.lanem.sh` 신설 — 수식 장의 OMML 존재 · 같은 장의 코드·불릿 생존 · 백지 장 0 을 단언
* Checkpoints:
* 결과:
    - **lane M 신설** — [build-source.py](lib/pptx/build-source.py) ⑬ 이 수식을 평문 마커(`⟦m2math:NNNN⟧`)로 치환하고 [lane-m.py](lib/pptx/lane-m.py) 가 산출 뒤 네이티브 OMML 을 심는다. 변환기는 pandoc 자신(`-o docx` → `<m:oMath>`)이라 **추가 의존 0**. `mc:Fallback` 에 평문 LaTeX 를 남겨 수식 미지원 뷰어에서도 글자가 보인다
    - **컴포넌트 드롭 자리에 구조 표식** — `FENCE_DROP` 이 지운 자리에 종류를 밝히는 한 줄. 백지 장을 만들지 않는다
    - **[check-empty.py](lib/pptx/check-empty.py) 신설** — 본문 0 장 보고. 경고이지 차단이 아니다(간지 장·lane C 이월처럼 정당하게 비는 자리가 있다)
    - 회귀 러너 `z_test/ig-ppt/5.lanem.sh` 단언 6종 통과 · 기존 러너 무회귀(4.laneb aTest 6/6 · 3.parity igTest 7/7) · 최종 FAIL 0 · WARN 0
    - 픽스처: `Projects/aTest` 를 **10장**(1.9KB — 원본 42장 14.9KB)으로 축소. `--pptx` 6.9s → **2.7s**. 원본은 `Projects/aTest.bak.20260909` 백업
        - 유지 축: lane A(표·불릿·이미지·코드) · lane B(cards·process) · lane C(pie 이월) · lane M(display + **인라인** 수식) · 컴포넌트 드롭 표식 · 면제 layout 2종(`Title Slide`·`Section Header`)
        - 뺀 것: mermaid(mmdc·Chrome 기동이 첫 빌드 14s 의 주범) · 여분 이미지 3장 · compare · matrix · numbered · p5 · wordart · 컬럼. H1 챕터는 **1개만** — 하나가 2장(Section Header + 챕터 TOC)을 만든다
        - ⚠️ **축소가 러너 버그를 드러냈다** — `5.lanem.sh` ③ 이 `"<m:oMath>"` 정확 일치로 세고 있었다. 인라인 수식은 그 요소가 ns 선언을 이고 나오므로(`<m:oMath xmlns:m="…">`) 조용히 0 으로 세어져 **없는 회귀를 보고했다**. display 만 있던 21장 픽스처에서는 안 걸렸다. 패턴을 `<m:oMath[ >]` 로 고쳤다
    - 진단 기록: `_doc_work/debug_TECH.md` (오진 2건 — 표를 못 읽은 계측 함정 · 검사기 layout 부분일치로 검사 무력화)


## Issue338: 아이덴티티 L2 문서 신설 — 불변 조항 (등록: 2026-09-03, 해결: 2026-09-09) ✅
* 목적: 이 프로젝트가 **무엇이고 무엇이 아닌가**를 판정에 쓸 수 있는 형태로 남긴다. 새 기능을 붙일 때 *"이게 이 제품의 일부인가"* 를 매번 주관으로 다투지 않기 위해서다
* depends: prj1#Issue472
* 상세:
    - [CLAUDE.md](CLAUDE.md) frontmatter 에 **L1 은 이미 기재됨**(prj1#Issue472_3 팬아웃). 본 이슈는 그 위의 **L2 불변 조항 문서**다
    - 한 줄 정체성: 마크다운 → 웹 슬라이드 변환기
    - 형식은 prj1 `fpm-identity.md` → prj6 `architect-identity.md` → prj5 `common-identity.md` 로 **세 번 검증된 것**을 준용한다
* 구현 명세:
    - `_doc_arch/m2slide-identity.md` 신설. 절 구성: 개요(왜 필요해졌나 — 구체 사건) / 무엇인가(한 줄 + 축) / 무엇이 아닌가(표) / 불변 조항(번호 고정) / 현행 준수 실측 / 미해결
    - **조항은 *"지키면 좋은 것"* 이 아니라 *"어기면 그 기능이 이 제품의 일부가 아닌 것"* 으로 쓴다.** 기능 목록을 나열하는 문서가 아니다
    - 이 프로젝트에서 다룰 후보: 원고가 SSOT 이고 슬라이드가 생성물이라는 경계 · 외부 의존 0 원칙
    - 재료: `_doc_base/promotion_0.initial.md`(있으면 포지셔닝·타깃) · 기존 `_doc_arch/` 설계 문서 · 실제로 혼동이 일어났던 이슈
    - ⚠️ 근거 없는 조항을 발명하지 말 것 — **실제로 헷갈렸던 사건**이 있는 것부터 적는다. 없으면 조항 1개로 시작해도 된다
    - 스키마·형식 정본: prj6 [project-identity-scheme.md](~/_git/___architect/_doc_arch/project-identity-scheme.md)
* 결과:
    - `_doc_arch/m2slide-identity.md` 신설 (98줄). 절 구성은 명세대로 — 개요(구체 사건 3건) / 무엇인가 / 무엇이 아닌가(표 5행) / 불변 조항 4개 / 현행 준수 실측 / 미해결 3건
    - **조항은 실제로 헷갈렸던 사건이 있는 것만 썼다** — ① 원고 SSOT(산출물 직접 수정이 룰 예외 조항으로 존재) ② 파일 하나 배포(dev-server 도입이 `file-deployment-rules` 신설을 불렀다) ③ 외부 의존 0(Issue339 lane M 이 새 렌더러 대신 pandoc 재사용을 택한 근거) ④ 파생 형식이 웹을 좁히지 않음(Issue339 에서 컴포넌트를 웹에서 빼지 않고 pptx 에 표식만 남긴 판정)
    - 근거 없는 조항은 쓰지 않고 **미해결로 남겼다** — 저작 파이프라인이 정체성의 일부인지(비대칭) · `ppt2m2slide` 확대 시 "PowerPoint 대체가 아니다" 재판정
    - [CLAUDE.md](CLAUDE.md) 프로젝트 개요 머리에 L2 진입 링크 추가


## Issue333: lane B 카탈로그 확장 — 순차형 htmlart 와 남은 대응 (등록: 2026-08-25, 해결: 2026-09-01, commit: `7d74658`) ✅
* depends: Issue331
* 목적: Issue331 이 깐 lane B 배선 위에서 **카탈로그를 넓힌다.** 지금 4종(`cards`·`numbered`·`process`·`compare`)만 도형으로 그리고 나머지 htmlart 는 전부 lane C 이월이라 평문 불릿으로 남는다.
* 상세:
    - 넓힐 수 있는 것 — `timeline`·`chevron`·`step`·`funnel` 은 **순차형**이라 `process` 매핑(`cards` + `flow_arrow`)을 그대로 늘리면 된다. m2slide 쪽 표만 고치면 되고 글로벌 수정이 필요 없다
    - 넓힐 수 **없는** 것 — `pie`·`matrix`·`venn`·`pyramid`·`hierarchy`·`radial`·`gear`·`target` 은 ppt-info 에 대응 블록이 없다. 블록 신설은 **글로벌 소관**이므로 `~/.claude/Issue.md` 등록 후 별도 세션이다. 여기서 비슷한 블록으로 근사하지 않는다(원본과 다른 도해가 조용히 나간다)
    - 블록 **뒤에 본문이 더 있는 장**도 지금은 이월한다 — 지울 자리가 문단 목록의 끝이 아니게 되고 도형 자리도 정해지지 않는다(실측 8건 전부 블록이 장 끝이라 현재 발생 0건이지만, 카탈로그를 넓히면 부딪힌다)
* 구현 명세:
    - [`build-source.py`](lib/pptx/build-source.py) `LANE_B_CATALOG` 에 순차형 4종 추가 → [`lane-b.py`](lib/pptx/lane-b.py) `build_page` 는 `process` 분기를 그대로 탄다
    - 픽스처는 `Projects/z_done/aTest_v1`(htmlArt 전 타입 보존)에서 필요한 장만 추려 온다
    - 검증: [`4.laneb.sh`](z_test/ig-ppt/4.laneb.sh) 단언 6종 통과 + [`3.parity.sh`](z_test/ig-ppt/3.parity.sh) 7/7 유지
* 결과 (Walkthrough):
    - `LANE_B_CATALOG` 에 순차형 4종(`htmlart timeline`·`chevron`·`step`·`funnel`) → `process` 매핑 추가. **코드 변경은 표 4줄뿐** — 사이드카 `kind` 가 `process` 로 적히므로 `lane-b.py` `build_page` 의 기존 분기(카드 + `flow_arrow` 커넥터)를 무수정으로 탄다. HTML 의 시각 변주(연대축·갈매기·계단·깔때기)는 근사하지 않는다 — 살아남는 것은 순서와 연결이고 그것이 flow_arrow 가 그리는 것
    - 픽스처: `z_done/aTest_v1/markdown/17-htmlart-catalog.md` 에서 4장(timeline·chevron·step·funnel)을 추려 `Projects/aTest/aTest.md` compare 뒤에 추가(제목·#id·설명 불릿 형식은 기존 htmlArt 장과 통일, release_date 갱신). ⚠️ aTest 는 [repo-tracking-rules](.claude/rules/repo-tracking-rules.md) 로 **gitignore** 대상이라 픽스처 확장분은 로컬 파일로만 남는다(Issue331 산출물과 동일 패턴)
    - 검증: [`4.laneb.sh`](z_test/ig-ppt/4.laneb.sh) aTest **6/6 통과** — 사이드카 lane B **4→8장**(신규 4장 전부 `kind: process` 기록), 대상 8장 전부 글자 있는 네이티브 도형·그림 0·평문 불릿 제거, **lane C 이월 3건(pie×2·matrix) 미개입**, `check-conform --lane a` FAIL 0. [`3.parity.sh`](z_test/ig-ppt/3.parity.sh) igTest **7/7 유지**(회귀 0)
    - ⚠️ **`funnel` 은 근사 금지 원칙의 명시적 예외다** (2026-09-01 검토 부기). `timeline`·`chevron`·`step` 은 **순서가 정보의 전부**라 옮겨도 잃는 것이 시각 변주뿐이지만, 깔때기는 순서에 더해 **단계마다 줄어드는 양**을 도형 폭으로 말한다. 균등 카드 + 커넥터로 그리면 그 축소가 사라지고 청중은 "순차 4단계"로 읽는다 — 코드 주석의 `단계 축소 = 순서` 는 등가 선언이지만 등가가 아니다. 평문 불릿보다는 낫다는 판단으로 유지하되, **`pyramid` 처럼 "크기가 곧 의미"인 블록을 같은 논리로 끌어오는 선례로 삼지 않는다**
    - ⚠️ **검증 재현성 부채**: `4.laneb.sh` 의 픽스처 `Projects/aTest` 가 gitignore 라 **clone 한 사람은 이 검증을 재현할 수 없다**. Issue331 부터 이어진 패턴인데 카탈로그가 4→8종으로 늘어 러너의 가치가 커진 만큼 부채도 커졌다 — 추적 대상 `igTest` 로 순차형 픽스처를 이관하는 후속 필요
    - 📌 남은 대응: `pie`·`matrix`·`venn` 류는 ppt-info 블록 신설이 선행 — 사용자 승인(폼 회수)을 받아 **글로벌 `~/.claude/Issue.md` Issue491 로 등록 완료**(별도 세션 처리 예정). 신설 후 m2slide 쪽은 `LANE_B_CATALOG` 매핑 1줄씩 추가하는 후속 이슈만 남는다. "블록 뒤 본문" 케이스는 이번 확장 후에도 실측 발생 0건이라 현행 이월 유지

## Issue337: (!) n3shIntro 덱 업데이트 — 추가 장표 인포그래픽화(ig-maker 핀봇) + 덱 반영 (등록: 2026-08-31, 해결: 2026-08-31, commit: `a2f39fe`, `bed2b97`) ✅
* 목적: Issue335·336 으로 검증된 레이아웃 준수 파이프라인(v2)을 n3shIntro 나머지 장표에 적용한다. 사용자 지시 — "n3shIntro 업데이트 진행(ig-maker 핀봇 활용)"
* depends: Issue336
* 상세:
    - 대상 선별(fit 게이트 판정) → 캡처 → _source/N 배치 → ig-maker 병렬 완주 → 발행 svg 를 원고에 반영 → 재빌드 → VERSION 1.1
    - 슬라이드 6(커리큘럼)은 검증분 curriculum-3.svg(레이아웃 준수판) 반영
* 결과 (Walkthrough):
    - 선별: 다이어그램 중심 2장(슬라이드 2 개념도·슬라이드 4 모디파이어 층) + 기검증분(슬라이드 6)
    - `fbot-igmaker-issue337` 배치(prj=42) → **봇 2개 병렬 완주**(ig-4-b4f7·ig-5-4d25) — 폴더·로그 충돌 0, 둘 다 `content` 자가 판정·content_box 준수·게이트 전부 통과
    - **레이아웃 계약의 부산물 활용** — 5.svg(타이틀 없는 콘텐츠판)를 `img/curriculum-{3,4,5}-content.svg` 로 복사해 슬라이드에 임베드. 테마 h2 밴드와 이중 타이틀 없이 전폭 렌더
    - 원고 3 슬라이드(2·4·6): 불릿+mermaid → 인포그래픽 단독(내용 중복 제거). VERSION 1.0→1.1, 재빌드·렌더 육안 검증 2장
    - 1차 반영은 불릿 병기로 시도 → 우측 반폭 축소로 텍스트 불가독 실측 → 단독 배치로 교정
    - 📎 커밋 2건이다 — `a2f39fe` 는 원고·svg·VERSION 이 [repo-tracking-rules](.claude/rules/repo-tracking-rules.md) gitignore 대상이라 실질 diff 가 `Issue.md` 뿐이고, 실산출은 `bed2b97`(`docs/` 배포 — index 카드 + n3shIntro 12파일)에 담겼다. `bed2b97` 은 완료 이동(`5c1ebba`) **뒤**에 커밋돼 한때 `commit:` 필드에서 누락돼 있었다(2026-09-01 검토에서 보강)


## Issue336: 테마 레이아웃 카탈로그 선언 — ig-maker 가 선택할 layouts 절 + curriculum 테마 정본 (등록: 2026-08-31, 해결: 2026-08-31, commit: `bab8424`) ✅
* 목적: Issue335 after 에서 ig-maker 가 전체 캔버스를 재작화한 원인의 절반은 **선택할 레이아웃 카탈로그가 프로젝트에 없었기** 때문이다(theme/curriculum/theme.yml 자체가 부재 — 내장 기본 테마로 조립). 테마 정본을 세우고 layouts 카탈로그를 선언해 prj3#Issue484(ig-maker 구조 개정)의 판정 재료를 공급한다
* 상세:
    - `_asset_ppt/theme/curriculum/theme.yml` 신설 — canvas·margin·palette(원본 실측 hex)·**layouts 카탈로그**
    - layouts 스키마는 prj3 `_doc_arch/ig-maker-design.md` §레이아웃 계약이 SSOT — 여기는 **값**만 선언
    - 초기 2종: `content`(테마 타이틀 밴드+본문 영역 — 덱 장표 표준) · `canvas`(전면 — 독립 인포그래픽용)
* 구현 명세:
    - 검증: prj3 개정(Issue484 로 재번호) 후 `_source/3` 재생성이 이 카탈로그를 읽어 `content` 를 선택하고 본문 영역만 작화하는지 확인
* 결과 (Walkthrough):
    - `theme/curriculum/theme.yml` 신설 — canvas·margin·palette(실측 hex 5슬롯)·layouts 2종(content·canvas). 스키마 SSOT 는 prj3 `ig-maker-design.md` §12
    - `_source/3` 재생성 실증: 봇이 `content` 자가 판정(`4.layout.yml` 기록, 애매성 없음) → viewBox 를 content_box 비율로 고정해 구조적 침범 불가 → 타이틀은 테마 골드 밴드로 조립. 게이트 전부 통과(문구 16/16·커넥터 5/5)
    - 색이 팔레트 **슬롯명**(band/green/purple) 참조로 바뀜 — hex 인라인 0건. ⚠️ 로더가 `gold` 슬롯 키를 병합하지 않아 band 로 대체(로더 허용 키 확장은 후속 판단)
    - 리포트 갱신: `_doc_work/report/ig-maker-before-after_report.md` "after v2" 절
* ✅ **§12 계약 적합성 사후 실측** (2026-08-31, 선행 prj3#Issue484 `fcb5bf4` 확정 후 재검):
    - **스키마 일치** — `layouts:` 절이 §12-2 최소셋(`content`·`canvas`)을 그대로 갖고 키도 `title_band`·`footer`·`content_box` 3종뿐이다. 여기는 **값만** 선언한다는 경계가 지켜졌다(스키마 조항을 복제하지 않음)
    - **전사 무결** — `theme.yml layouts.content.content_box`(x10.0 y28.0 w318.67 h150.0) 와 `4.layout.yml` 기록값이 **완전 일치**. `layout: content` · `reason` 기재 → §12-3 "기록 없는 선택은 게이트 위반" 충족
    - **영역 침범 0** — 4·5.svg 의 viewBox 종횡비 2.1250 이 content_box 비율 2.1245 와 일치(오차 0.02%)하여 좌표계 자체가 콘텐츠 영역이다. 두 파일 좌표 **488개 전수 검사 결과 viewBox 이탈 0건**(x 최대 1265/1275 · y 최대 570/600)
    - **금지 문법 미사용** — `content` 선택 시 금지인 [타이틀 계층]·[한 줄 정리 밴드] 없음. 4.svg 의 골드(`#F5C518`) 3회는 전부 **카드 액센트**(테두리·번호 배지·별 아이콘)이고 상단 전폭 밴드가 아니다. 타이틀 밴드는 조립본 7.svg(16:9 전체 캔버스 1355×762)에만 존재 → §12-4 "7단계는 테마 값으로 조립" 충족
* 🔧 **낡은 참조 정리** — 선행 이슈가 483 → 484 로 재번호되며 본문·산출물에 구 번호가 남아 있었다. `Issue.md` 목적 · `4.layout.yml` 헤더 · `0.origin.yml` notes **3곳 갱신**(잔존 0건 확인). 덤으로 `7.md` 머리말이 슬롯명을 `gold` 로 적어 놓고 데이터는 `band` 를 쓰던 불일치도 바로잡았다 — 재현자가 없는 슬롯을 찾게 만드는 줄이었다
* 📎 산출물(`Projects/n3shIntro/**`)과 리포트(`_doc_work/**`)는 [repo-tracking-rules](.claude/rules/repo-tracking-rules.md) 로 **gitignore** 대상이라 커밋에 담기지 않는다 — 로컬 파일로만 남는다. 실물 경로는 `Projects/n3shIntro/ppt/_asset_ppt/theme/curriculum/theme.yml`(위 상세의 `_asset_ppt/…` 는 `ppt/` 가 빠진 축약 표기)
* ⚠️ **커밋 위생 결함 — 사후 정정** (2026-09-01 검토): 위 줄은 본래 *"커밋되는 것은 `Issue.md` 뿐"* 이라고 적혀 있었으나 **사실과 다르다.** `bab8424` 의 실제 변경은 3파일이고, 커밋 메시지가 언급조차 않는 다음 2건이 함께 들어갔다 — 둘 다 이 이슈(테마 레이아웃 카탈로그)와 무관하다
    - [`.claude/commands/serve.md`](.claude/commands/serve.md) — dev-server tailnet 접근 항목 신설(`tailscale serve --bg --http=9877`). **tailscaled 에 영속되는 머신 상태 변경**이라 오히려 눈에 띄어야 할 변경이었다
    - [`lib/dev-server/server.py`](lib/dev-server/server.py) — 개요 페이지 카테고리 `pr`(📢 프레임워크) → `app`(📱 앱) 교체. 사용자에게 보이는 분류 체계 변경이므로 **별도 이슈감**이었다
    - 원인: 산출물이 gitignore 라 *"어차피 diff 가 비어 있다"* 가 기본값이 되면, 무관한 변경이 섞여도 걸리지 않는다. `git log` 로 위 둘을 추적하면 "테마 레이아웃 카탈로그" 아래 묻혀 검색되지 않는다

## Issue335: n3sh 소개 프로젝트(n3shIntro·Info 분류) 생성 + ig-maker before·after 실증 (등록: 2026-08-31, 해결: 2026-08-31, commit: `e300215`, `bab8424`) ✅
* 목적: prj58 n3sh(세벌식 390 속기 확장, 최근 pqrs 공개)를 소개하는 프로젝트를 **Info 분류**(도구 소개 — 강연자료 아님, graphify 선례)로 생성하고, 그 장표를 재료로 ig-maker 파이프라인의 **before·after 개선 실증**을 수행한다. Issue334(샘플 4장 분석 기반 개선)의 실작업 본체
* depends: Issue334
* 상세:
    - 산출: `Projects/n3shIntro/` — 상세 원고(`n3shIntro.ppt.md`)·`_config.yml`·`VERSION`·`Info.md`
    - before: 현행 ig-maker 로 대표 장표 도형화 → `ppt/` 산출 + `~/Desktop` 백업
    - upgrade: `~/Desktop/sample/ig` 4장 실측 분석 → ig-maker 개선
    - after: 동일 장표 재생성 → 수치·시각 비교 리포트(`_doc_work/report/`)
    - 담당: fbot-igmaker (prj3 카탈로그 2026-08-31 신설 직능)
* 결과 (Walkthrough):
    - n3shIntro 생성(Info 분류·원고 9장·Projects.md 등재) → 슬라이드 6 캡처(1300×650) → before 완주(도형 24·게이트 전부 통과) → 샘플 4장 문법 7종 추출 → prj3 `agents/ig-maker.md` 4단계 프롬프트 개정 → after 완주(도형 30·게이트 전부 통과)
    - **벤치마크 문법 1/7 → 7/7** · 문구 무결(13/13→18/18)·플로우 논리 보존(커넥터 5=5). 상세: `_doc_work/report/ig-maker-before-after_report.md`
    - 백업: `~/Desktop/n3sh-ig-backup/{before,after}/`
    - 수행: fbot-igmaker-issue335 (before `ig-1-e7f7` · after `ig-2-c8f9`) — 재시도 루프 0

## Issue334: (!) 인포그래픽 개선 — ~/Desktop/sample/ig 샘플 4장 분석 기반 ig-maker 성능 개선 (등록: 2026-08-31, 해결: 2026-08-31, commit: `e300215`) ✅
* 목적: 사용자 제공 샘플(`~/Desktop/sample/ig/IMG_0211~0214.JPG` 4장)을 분석해 개선 방향을 기획하고, 기존 ig-maker 파이프라인을 활용해 인포그래픽 품질·성능을 개선한다. **prj3 핀봇 조직의 첫 리크루팅 E2E 실증**(prj3#Issue482)의 실작업 대상 이슈이기도 하다
* 상세:
    - 트리거(사용자, 2026-08-31): "~/Desktop/sample/ig 의 내용 prj42 의 인포그래픽 개선작업 진행해줘"
    - 담당: `fbot-igmaker-issue334` (igmaker 직능 — prj3 카탈로그 2026-08-31 신설, agents/ig-maker.md 승격)
    - (!) 약식 등록 — 표준 시나리오 1 의 1단계. 정식 승격(plan/task)은 착수 시 작업핀봇이 수행
* 구현 명세:
    - ① 샘플 4장 실측 분석(구성·도형화 난도) → ② 개선 방향 기획 → ③ ig-maker 파이프라인으로 변환·개선 → ④ 전후 비교


## Issue331: lane B — cards·htmlart 를 네이티브 도형으로 (등록: 2026-08-18, 해결: 2026-08-25, commit: 24b8b09) ✅
* depends: Issue328, Issue329 (둘 다 완료)
* 완료 실측 (2026-08-25, commit 24b8b09): 배선 3단 신설 — [`build-source.py`](lib/pptx/build-source.py) ⑫ 가 대상 장을 `_pipeline/pptx/lane-b.json` 에 **표시**하고, [`lane-b.py`](lib/pptx/lane-b.py) 가 글로벌 [`ppt-info/info-build.py`](file:///Users/nowage/.claude/skills/ppt-info/SKILL.md) 를 **무수정 호출**해 받은 도형을 본문 자리에 **병합**한다. [`build-pptx.sh`](lib/pptx/build-pptx.sh) ③-b2 가 그 자리다
* 📊 **착수 전 실측** — 이슈 본문의 *"htmlart 는 통째로 사라졌다"* 는 2026-08-25 시점에는 **사실이 아니었다.** `md2pptx` 가 펜스 껍데기만 벗기고 내용은 남기므로 사라지는 것이 아니라 **평문으로 눕는다**. 격차의 성격은 같고(표현 등가 상실) 정도만 다르다
    - igTest 41장 — `::: cards` 3블록(장 6·9·37), 카드 8항목이 전부 본문 placeholder 안의 평문 불릿. 도형 0 · 그림 0. htmlart 는 이 덱에 **0건**
    - aTest 41장 — `::: cards` 2블록(장 2·12) + htmlart 5블록(장 19 pie · 21 process · 22 matrix · 23 compare · 40 pie). 전부 평문 불릿. 도형 0 · 그림 0
* 🔑 **원고를 바꾸지 않고 사이드카에만 표시한다.** lane B 가 어떤 이유로 빠져도(자산 부재·pyyaml 부재·렌더 실패·본문 대조 불일치) 평문 불릿이 그대로 남는다 — 원고에서 블록을 들어내 버리면 그 안전망이 사라진다. *"구조(lane A)가 먼저다"* 를 배선으로 굳힌 것이고, 그래서 `lane-b.py` 는 **rc0 으로 끝나는 것이 기본**이며 실패는 stderr 로 크게 알린다
* 🔑 **어느 문단을 지울지 셈으로 맞히지 않는다.** 사이드카가 적어 둔 `flat`(블록이 만들어 낼 문단 문자열)이 실제 본문 문단의 **끝과 정확히 일치할 때만** 지운다. 원고·평탄화 규칙이 달라지면 대조가 깨지고, 그때는 지우지 않고 건너뛴다 — 조용한 오배치보다 낫다
* 🔑 **카탈로그 밖은 근사하지 않는다.** lane B/C 경계는 *"패턴 카탈로그에 있는가"* 하나다. 카탈로그: `cards`·`htmlart numbered` → ppt-info `cards`(좌측 액센트 바) · `htmlart process` → `cards` + `flow_arrow`(`p:cxnSp` 네이티브 커넥터 — 도형을 옮겨도 따라온다) · `htmlart compare` → `compare`. 나머지는 lane C 이월로 **적고 손대지 않는다**(도형 배치 자체가 판단이라 근사하면 원본과 다른 도해가 나간다)
* 🔑 **테마는 실측 `theme.yml` 을 그대로 쓴다** — 색·캔버스가 lane A 와 같아야 같은 덱으로 보인다. 고치는 것은 둘뿐이다: `margin` 을 **대상 장 본문 placeholder 기하로** 덮고(테마 기본 전폭 10.2~328.5mm vs pandoc 제목·본문 12.7~241.3mm — 전폭으로 그리면 도형만 제목보다 넓어진다), `font.body` 를 카드용으로 낮춘다(카드는 밀집 표현이다)
* 🔑 **배선 자리가 ③-b 다음·③-c 앞인 것은 실측 근거가 있다.** 앞이면 ③-b 의 bold 색 교정이 카드 글자를 강조색으로 덮어 계단색이 사라지고, 뒤면 도형 서체가 ③-c `retheme` 을 놓쳐 `3.parity.sh` ⑥(테마 밖 폰트 0)이 깨진다
* ✅ **검증** — igTest `cards` 3장 **3/3 도형 렌더**(장 6: 도형 6 · 장 9: 4 · 장 37: 6, 전부 `AUTO_SHAPE` + 글자) · **그림 0** · `check-conform --lane a` **FAIL 0 · WARN 0**. aTest `cards` 2 + `process` 1 + `compare` 1 → **4/4**, lane C 이월 3건(`pie`×2 · `matrix`) **미개입**
    - [`3.parity.sh`](z_test/ig-ppt/3.parity.sh) **rc0 · 7/7 유지** (회귀 0). aTest 는 `--no-lane-b` 기준선과 **판정 완전 동일**(4/7 — single mode 라 러너의 챕터 전제가 안 맞는 기존 상태이며 lane B 무관)
    - `--pptx` · `--ppt-make` **양쪽 경로 모두** lane B 3/3 적용 확인. `1.infographic.sh`·`2.deck.sh` rc0
    - 회귀 러너 신설 [`4.laneb.sh`](z_test/ig-ppt/4.laneb.sh) — 단언 6종(사이드카 · 글자 있는 네이티브 도형 · 그림 0 · 평문 불릿 제거 · lane C 미개입 · conform). igTest·aTest **6/6**
* 🐞 **곁다리로 잡은 결함 2건** — ① `build-source.py` 심벌 제거(⑥)가 `[ \t]{2,} → " "` 를 줄 전체에 걸어 **선두 들여쓰기까지 뭉갰다**. `  - :fa-check: 완료` 의 2칸이 1칸이 되어 중첩 레벨이 통째로 사라진다(실측: aTest 심벌 카드 2장이 최상위 10항목으로 펴짐). ② python-pptx 로 **상속** placeholder 의 `height` 만 쓰면 `a:ext` 가 새로 생기며 `cx` 가 0 이 된다 — 본문이 폭 0 으로 사라진다. 네 값을 전부 적는다
* ⚙️ **기본 on 으로 두고 `--pptx-no-lane-b` 로 끈다.** 설계 3레인 표는 lane B 를 "옵트인" 으로 적었지만 그 게이트가 지키려던 위험은 **lane C 의 토큰 비용**(장당 33만)이다. lane B 는 초 단위·토큰 0 이고 결정적이며 실패해도 lane A 를 남기는 덧칠이라 그 위험이 없다 — 위험 없는 곳에 게이트를 두면 기능이 그냥 안 쓰인다. 끄는 스위치는 남겼다(회귀를 가를 때 *"lane B 탓인가"* 를 1초에 답해야 한다)
* 📌 남은 것은 **Issue333**(lane B 카탈로그 확장)으로 분리 등록. 순차형 4종은 m2slide 표만 고치면 되고, `pie`·`matrix` 류는 ppt-info 에 대응 블록이 없어 **글로벌 신설**이 선행이다
* 📎 설계 SSOT [`_doc_arch/pptx-parity-design.md`](_doc_arch/pptx-parity-design.md) "lane B 구현" 절을 함께 갱신했으나, 이 repo 는 `_doc_arch/` 를 gitignore 하므로([repo-tracking-rules](.claude/rules/repo-tracking-rules.md)) **로컬 파일로만 남는다**

## Issue332: ppt-maker 오케스트레이션 도입 — 원본 하나로 완성 덱까지 (등록: 2026-08-18, 해결: 2026-08-25, commit: 62f1cb4) ✅
* 완료 실측 (2026-08-25, commit 62f1cb4): 진입점 [`m2slide.sh --ppt-make`](m2slide.sh) 신설 — ①입력 판정 ②앞단 `ppt-init` ③lane A ④뒷단 `ppt-check` ⑤인포그래픽 게이트 ⑥보고. 구현은 [`lib/pptx/ppt-make.sh`](lib/pptx/ppt-make.sh) 이고 **하는 일은 글로벌 호출과 결과 회수뿐**이다. [`3.parity.sh`](z_test/ig-ppt/3.parity.sh) **rc0 · 7/7 유지**(회귀 0). 새 경로 산출물로 `--no-build` 재판정도 7/7. 신·구 경로 pptx 는 **전 XML 파트·미디어 3개 바이트 동일**(차이는 tempdir 이름·docProps 시각뿐 — 비결정 요소). `2.deck.sh` rc0 · `--lint-deployment` 위반 0
* 🔑 **재귀 회피를 원칙 하나로 두지 않았다.** 되위임 폴백이 사는 지점은 글로벌에 정확히 둘이다 — `deck.py` 폴백 ①(*"m2slide 가 있으면 `m2slide.sh --pptx`"*)과 그 `deck.py` 를 lane A 에서 부르는 `make.py`. ① **그 둘을 부르지 않고** 되위임 폴백이 없는 하위 스크립트만 직접 부른다(`init.py`·`check.py`·`igselect.py`·`igpath.py`) → 호출 방향이 **m2slide → 글로벌 단방향**임이 구조로 성립한다. ② 그 위에 `M2SLIDE_PPTX_DEPTH` **재진입 가드**를 걸어 되불림이 무한 루프가 아니라 **rc1 즉시 실패**가 되게 했다. 둘 다 둔 이유는 성격이 다르기 때문이다 — **원칙은 사람이 어길 수 있고, 가드는 어겨지지 않는다**. 실증: 가드 무장(`=1`)에서 `--pptx`·`--ppt-make` 둘 다 rc1 · 평시 실행은 가드가 물린 채 rc0 완주(= 실행 중 재진입 0건) · 정적 grep 으로 `deck.py`/`make.py` 호출 0건(전부 주석)
* 🔑 **`make.py` 를 부르지 않은 이유는 재귀만이 아니다 — 품질이 더 크다.** `make.py` lane A 는 `deck.py <파일>` 을 `--theme`·`--reference` **없이** 부른다(소스 확인). 그러면 pandoc 기본 서식이 나와 **테마가 통째로 빠진 덱**이 된다. m2slide 의 lane A 는 CSS 실측 → `theme.yml` → reference-doc 을 거치므로 글로벌 오케스트레이터의 lane A 로 대체할 수 없다 — 즉 이 이슈에서 붙일 수 있는 것은 **앞단·뒷단·게이트·보고**이고 lane A 는 기존 경로가 정본이다
* 🔑 **차단 게이트는 ③ 하나로 남겼다.** `ppt-maker` 7단계는 *"통과하지 못하면 완료가 아니다"* 지만 m2slide 에서 그 역할은 ③ 이 이미 한다(Issue317). 뒷단이 더하는 `legible` 류는 **휴리스틱이라 오탐이 성립**한다 — 실측(aTest p24): `check-legible` 이 *"mermaid 원문 노출 — `flowchart TD`"* 로 FAIL 했지만 실제 문장은 문법 소개 덱의 **산문** `flowchart TD 위→아래 흐름` 이었다. 고칠 수 없는 글로벌 휴리스틱이 빌드를 죽이면 회피 수단이 *"검증 끄기"* 뿐이 되므로 **보고는 크게, 차단은 ③ 에** 둔다
* 🔑 **팔레트 대조에 `--theme` 를 주지 않는다.** m2slide 는 제목색·강조색을 CSS 실측으로 **의도적으로 덮으므로**(Issue329) `theme.yml` 대조는 설계대로 동작한 결과를 FAIL 로 만든다. 대신 [`build-pptx.sh`](lib/pptx/build-pptx.sh) ③-d 가 덮은 값을 `_pipeline/pptx/measured.env` 로 남기고 뒷단이 그것만 `--allow` 로 풀어 **남는 이탈만** 비차단 정보로 찍는다
* 🆕 **그 결과로 드러난 신규 결함**: igTest 팔레트 이탈 2 — `#60A0B0`·`#06287E`. 둘 다 **pandoc 이 코드 스팬에 박는 syntax highlighting 색**이며 `Courier`(Issue329 G6)와 정확히 같은 계열이다. `retheme.py --font-only` 는 서체만 바꾸므로 걷어내지 못한다 → 후속 이슈 후보(글로벌 위임 아님 — Courier 선례대로 m2slide 배선으로 걷어낼 사안)
* 🔒 **경계 준수**: 글로벌 SCAR(`ppt-maker`·`ppt-deck`·`ppt-check`·`ig-selector`) **무수정**. lane C 팬아웃 **미실행**(장당 33만 토큰) — 실측으로 확인: `--ig` 실행 전후 `Projects/igTest/ppt/strengths/` 해시 동일. `ppt-init` 은 `pptx.yml` **옵트인 프로젝트만** 돈다(전 프로젝트 롤아웃 안 함 — 기존 판정 유지)
* ⚠️ 설계 SSOT [`ig-ppt-integration.md`](_doc_arch/ig-ppt-integration.md) "오케스트레이션" 절을 함께 갱신했으나 이 repo 는 `_doc_arch/` 를 **gitignore** 한다(repo-tracking-rules) — 커밋에 담기지 않고 로컬 파일로만 남는다
* depends: Issue330
* 목적: 지금은 사람이 lane 을 고르고 단계를 잇는다. 글로벌 [`ppt-maker`](file:///Users/nowage/.claude/skills/ppt-maker/SKILL.md)(원본 → init·trace·spec·deck·check 오케스트레이션)를 m2slide 진입점에 붙여 **한 번의 호출로 완성 덱**까지 가게 한다. prj82 가 `run.sh` 로 하던 일을 제품 경로로 옮기는 것과 같은 성격.
* 상세:
    - prj82 계승·비계승 판정은 [`pptx-parity-design.md`](_doc_arch/pptx-parity-design.md) "prj82 에서 무엇을 가져오나" 절 — `potx.md` **원칙**은 계승(m2slide 판은 `theme.yml`), `pages.py` 파이썬 원고는 **비계승**(m2slide 원고는 마크다운이고 그것이 존재 이유)
    - ⚠️ 순환 주의 — `ppt-deck`/`ppt-maker` 폴백 ①이 *"m2slide 가 있으면 m2slide.sh 에 위임"* 이라 무조건 호출하면 상호 재귀([`ig-ppt-integration.md`](_doc_arch/ig-ppt-integration.md) "순환" 절). `md2pptx.py` 직접 호출 원칙 유지
    - lane 자동 선택은 **하지 않는다** — lane C(ig-maker)는 장당 33만 토큰이라 `ig-selector` 승인 게이트가 존재 이유다
* 구현 명세:
    - lane A 완주(Issue326~329)와 parity 러너(Issue330) 통과가 선행 — 구조가 틀린 덱을 오케스트레이션으로 감싸면 결함이 자동화된다
    - m2slide 쪽은 **호출과 결과 회수**만. 오케스트레이션 로직을 복제하지 않는다

## Issue329: 테마 일치 완성 — layout 유도 매핑 + 코드 폰트 이탈 제거 (등록: 2026-08-18, 해결: 2026-08-25, commit: 53169cb, 7220b2e) ✅
* depends: Issue327
* 완료 실측 (2026-08-25, commit 7220b2e): [`3.parity.sh`](z_test/ig-ppt/3.parity.sh) igTest **6/7 → 7/7 rc0**. 잔여 3종이 모두 닫혔다 — ① 테마 밖 폰트 `Courier` ×20 → **0** ② 본문 크기 9.5pt(폭의 0.99%) → **20.0pt(2.08%)** 로 HTML `--r-main-font-size` 40px / reveal 캔버스 1920px = 2.083% 와 일치 ③ aTest 2×2 장 `{.column}` 누출 1 → **0**, 장 쪼개짐 42 → **41장**. igTest 41장 · 제목 보유 41/41(100%) 로 Issue328 실측에서 회귀 없음. `check-conform --lane a` igTest FAIL 0 · aTest FAIL 0 WARN 0
* 🔑 **G6 `Courier` 출처 = pandoc pptx writer 하드코딩** (판정 근거 3종: `reference.pptx` 전수 스캔 0회 · 산출 pptx 에서도 `ppt/slides/*.xml` 에만 있고 master·layout·theme 에 없음 · 코드 스팬 한 줄짜리 md 를 같은 reference 로 넣어도 재현). **글로벌 자산의 결함이 아니므로 위임하지 않았다** — [`build-pptx.sh`](lib/pptx/build-pptx.sh) ③-c 에 글로벌 [`retheme.py`](file:///Users/nowage/.claude/skills/ppt-deck/scripts/retheme.py)(비-`+` typeface → 테마 서체 치환)를 배선해 걷어낸다. ⚠️ `--font-only` 가 필수다 — 색까지 맡기면 ②-b·③-b 가 CSS 실측으로 교정한 제목색(#111111)·강조색(#2ECC71)이 theme.yml 값으로 되돌아간다
* 🔑 **본문 크기는 CSS 가 정본이다** — `theme-from-css.py` 는 이름과 달리 크기를 재지 않고 `title: 27`·`body: 9.5` 를 상수로 박는다(색·캔버스만 실측한다). 조직 템플릿이 없을 때 쓰는 무난한 기본값이지만 m2slide 는 **빌드 산출 HTML 한 장에서 실측할 수 있다** — base.css 가 `<style>` 로 인라인되고 reveal 캔버스 폭이 `Reveal.initialize({width: …})` 에 적히기 때문이며, 브라우저를 띄우지 않으므로 빌드에 헤드리스 의존이 늘지 않는다. ①-c 가 그 비율을 pptx 캔버스로 환산해 덮고, 키우면 넘칠 수 있으므로 ③-b 에서 **본문 placeholder 에도 자동 축소**를 건다(제목과 같은 이유 — pandoc 이 빈 `<a:bodyPr/>` 로 레이아웃 설정을 덮는다)
* 🔑 **중첩 `::: {.column}` 누출의 원인은 attribute 제거가 fence 줄까지 물린 것**이다. `ATTR` 정규식이 `::::::: {.row .card}` 의 attribute 를 벗기면 그 줄이 맨 `:::::::` 가 되고, `md2pptx.FENCE_OPEN` 이 정보 없는 `:::` 를 **닫는 줄**로 읽어(`info == ""` → `stack.pop`) 여닫이가 어긋난다. 짝을 잃은 `:::: {.column}` 이 본문에 글자 그대로 새고 장까지 쪼개졌다(교정 전 실측: aTest 8·9번 장이 `좌상단 …` / `좌하단 … :::: {.column} 우상단 … ::::::: 우하단 …`). [`build-source.py`](lib/pptx/build-source.py) 에 `FENCE_LINE` 가드를 넣어 fence 줄에서는 attribute 제거를 건너뛴다 — **껍데기 처리는 md2pptx 소관**이다
* 목적: 색·서체는 옮겨졌지만(accent `F5C518`·Malgun Gothic 실측 확인) **layout 개념과 코드 서식이 이탈**해 있다. m2slide layout 5종과 pptx 마스터의 대응을 세우고 템플릿 밖 폰트를 없앤다.
* 상세:
    - 🟢 **초기 판단이 실측에서 뒤집혔다** — "마스터 레이아웃을 신설해야 한다"고 봤으나, `theme2reference.py --adapt` 가 표준 11종을 **이미 만들어 두었다**(reference.pptx 실측). 즉 G3 는 마스터 문제가 아니라 **원고를 그 모양으로 쓰는 문제**다
    - pandoc 은 레이아웃을 이름으로 고르지 않고 **슬라이드 구조로 자동 선택**한다 → 매핑표는 [`pptx-parity-design.md`](_doc_arch/pptx-parity-design.md) "layout 매핑" 절
    - ~~G6: `Courier` 15회(코드블록). 출처가 reference 테마인지 pandoc 하드코딩인지 **미판정** — 전자면 글로벌(prj3) 위임, 후자면 원고에서 코드블록 표현 교체~~ → **판정 완료: pandoc 하드코딩**. 위 🔑 항 참조(위임 아님, `retheme.py --font-only` 배선으로 해소)
    - 🔑 **챕터 진입 장이 3장으로 쪼개진다** (Issue326 실측 2026-08-18): 원본 `chapter` layout 1장이 pptx 에서 `Section Header`(H1) + 제목 없는 장("Chapter 1.") + `Title and Content`(부제) **3장**이 된다. 이것이 제목 보유율이 87% 에서 100% 로 못 가는 직접 원인(45장 중 6장 무제목 = 챕터 5개 × 1 + α). 원고에서 챕터 진입부를 **H1 단독**으로 만들면 1장으로 수렴한다
* 🟢 부분 완료 (2026-08-19, commit: 53169cb): ① 챕터 진입 3장 → **2장**(Section Header + 챕터 TOC) 수렴 ② 무제목 장 **6 → 0**(igTest 41/41 제목 보유) — 원인이 둘이었다: H1 뒤 본문이 흘러나가는 것과 `Content with Caption` 넘침(표·그림 **뒤**의 글). 후자는 무거운 블록을 장 끝으로 옮겨 막았고, mermaid 펜스도 **그림이므로** 무거운 블록에 넣었다 ③ 제목색·강조색을 **CSS 실측값으로 교정**([`css-var.py`](lib/pptx/css-var.py)) — 글로벌 `title_color()` 는 accent 중 가장 어두운 색(#977A0E)을 고르는 추정이라 실제(#111111)와 달랐다 ④ 좁은 제목칸의 긴 한글 제목 잘림 → 자동 축소(레이아웃뿐 아니라 **장 쪽에도** 걸어야 듣는다. pandoc 이 빈 `<a:bodyPr/>` 로 상속을 덮는다)
* 구현 명세:
    - 원고 생성기에 layout 유도 규칙 구현 (`chapter`→H1 단독 / 도해 장→이미지+캡션 / 2분할→`::: columns`)
    - 코드 폰트 출처 판정 후 분기 — 위임이면 `~/.claude/Issue.md` 등록(*-maker·ppt-* 무수정 원칙)
    - 검증: 산출 pptx 레이아웃 분포가 원본 layout 분포와 대응 · 테마 밖 폰트 0 · `check-conform --lane a` WARN 감소

## Issue330: parity 회귀 러너 — `z_test/ig-ppt/3.parity.sh` (등록: 2026-08-18, 해결: 2026-08-25, commit: ebf226a) ✅
* 완료 실측 (2026-08-25, igTest 빌드 포함 6.6초): **6/7 통과** — ① 슬라이드 41장 = HTML 본문 39 + 구조 2 ✅ · ② Title placeholder 41/41(100%) ✅ · ③ 제목 문자열·순서 일치(챕터 5 · 본문 29장) ✅ · ④ 구조 슬라이드 7장(표지 1 · 목차 1 · 챕터 진입 5) ✅ · ⑤ 마크다운 누출 0 ✅ · ⑥ **테마 밖 폰트 `Courier` ×20 ❌** · ⑦ `check-conform --lane a` FAIL 0 ✅
* ⑥ 은 러너 오탐이 아니라 **실재 결함**이며 소관은 Issue329 잔여 G6 이라 여기서 고치지 않았다. 다만 그 이슈의 *"출처 미판정"* 은 이번에 판정됐다 — `reference.pptx` 에도 `ppt-deck` 스크립트에도 `Courier` 가 없고, 코드 스팬 한 줄짜리 md 를 pandoc 에 넣으면 **reference-doc 유무와 무관하게** `Courier` 가 나온다(실측). 즉 pandoc pptx writer 하드코딩이며, 글로벌 [`retheme.py`](file:///Users/nowage/.claude/skills/ppt-deck/scripts/retheme.py)(비-`+` typeface → 테마 폰트 치환)가 m2slide 경로에 배선돼 있지 않다. 실린 장은 인라인 코드가 있는 8장(6·8·14·22·28·32·33·40)
* 🔑 **오탐 대비를 설계에 넣었다** — ③⑤ 는 XML 날것이 아니라 렌더 텍스트(`text_frame.text`)로 판정한다. 선례 2건(XML 주석 인용·`<tspan>` 분절)이 모두 날것 grep 에서 났기 때문이고, run 이 쪼개져도 문단 단위로 다시 붙는다. ⑤ 패턴은 m2slide 고유 문법으로 좁혔다(`-->` 처럼 산문에 자연히 나오는 토큰은 제외 — 오탐이 러너를 무력화한다)
* 🔑 **변이 테스트 5종으로 각 단언의 독립 발화를 확인**했다(러너가 무엇도 못 잡는 상태로 통과하는 것을 막기 위함): 장 제거 → ①③ / 제목 공백화 → ③만(②는 98% 로 **통과** — Issue326 회귀를 ② 혼자서는 못 잡는다는 근거) / 리터럴 주입 → ⑤ / 목차 훼손 → ④ / 현행 → ⑥
* 챕터 진입 2장은 HTML 과 **순서가 뒤집혀 있다**(HTML `[챕터 H1, 챕터 TOC]` ↔ pptx `[Section Header(챕터명), 챕터 TOC(H1)]`). Issue329 가 의도해 수렴시킨 매핑이라 ③ 은 쌍 내부만 집합으로 보고 **본문 장은 순서까지 정확히** 대조한다
* 빌드는 `--pptx-no-verify` 로 짓는다 — 내장 검증이 먼저 죽으면 나머지 6종이 측정되지 않는다. 검증을 건너뛰는 것이 아니라 **판정 지점을 러너로 모으는** 것이며 ⑦ 이 같은 검사를 직접 수행한다
* depends: Issue326
* 목적: 충실도를 **눈이 아니라 러너가** 판정하게 한다. 기존 [`2.deck.sh`](z_test/ig-ppt/2.deck.sh)는 *"3장 나오고 색이 있고 지시자가 안 샜다"* 만 보므로 **35장이 제목 없이 나와도 통과했다** — 실제로 통과했고, 그래서 결함이 배포까지 갔다.
* 상세:
    - 판정 기준은 **원본 HTML** 이다 — 그쪽이 정본이고, 두 산출물을 같은 잣대로 재는 유일한 지점이다
    - 팬아웃 0 이라 비용 0 — 매 빌드에 붙일 수 있다
* 구현 명세:
    - 단언 7종: 슬라이드 수 대응 · Title placeholder ≥95% · 제목 문자열·순서 일치 · 구조 슬라이드 존재 · 마크다운 누출 0 · 테마 밖 폰트 0 · `check-conform --lane a` FAIL 0
    - 픽스처는 `Projects/igTest` (Issue324 재구축본)
    - 러너 작성 시 **오탐 주의** — 선례 2건(XML 주석 인용·`<tspan>` 분절)이 있다. 렌더 텍스트 기준으로 판정할 것

## Issue328: 구조 슬라이드 주입 — cover·agenda·챕터 TOC 12장 복원 (등록: 2026-08-18, 해결: 2026-08-25, commit: 53169cb) ✅
* depends: Issue327
* 완료 실측 (2026-08-25 재현): igTest — **45장/무제목 6 → 41장/무제목 0(제목 보유 100%)** · 구조 슬라이드 **0 → 7**(표지 1 · 목차 1 · 챕터 TOC 5). 원본 HTML `<section>` 40 과 대응. `cover_enabled: false` 에서 표지 미주입 확인(`00-cover.md` 생성 0). single mode 회귀 없음 — aTest 42장 · 제목 보유 90% → 93% · FAIL 0. `check-conform --lane a` FAIL 0 · WARN 1(기존 `Courier` — Issue329 잔여). [`2.deck.sh`](z_test/ig-ppt/2.deck.sh) 5단언 통과
* 🔑 검증 중 발견·해소 — `--pages` 부분 변환에서 **표지 YAML 이 글자 그대로 슬라이드에 찍혔다**. `md2pptx.slice_pages()` 가 `---` 를 슬라이드 경계로 보므로 메타데이터의 여닫이가 경계가 되고 그 사이가 본문 블록으로 승격된다(실측: 1번 장 전체가 `title: "m2Slide란?" subtitle: "…"`). 리터럴 누출 0(Issue327)을 깨는 형태라 [`build-pptx.sh`](lib/pptx/build-pptx.sh) 가 `--pages` 동반 시 표지 파일을 빼도록 **원인 쪽을 막았다** — 그 전까지 `2.deck.sh` 가 빨간 상태였다
* 목적: 원본 39장 중 **12장(cover 1 · agenda 1 · 챕터 TOC 10)이 pptx 에 통째로 없다.** 이 장들은 원고 md 에 존재하지 않고 m2slide 빌드가 주입하므로, 원고 생성기가 같은 일을 pptx 원고에도 해야 한다.
* 상세:
    - 원본 layout 분포 실측(2026-08-18): `_contents` 29 · `_toc` 10 · `chapter` 5 · `_cover` 1 · `_agenda` 1
    - cover 메타 출처는 `markdown/AGENDA.md` frontmatter(instructor·version·lecture_date 등) + `_config.yml` `cover_enabled`·`cover_layout` — [`meta-yml.md`](_doc_arch/meta-yml.md) 규약 준수
    - 챕터 TOC 는 각 챕터의 H2 목록에서 생성 (`toc_card_mode` 는 HTML 전용 표현이므로 pptx 에서는 불릿 목록으로 등가 처리)
* 구현: [`build-source.py`](lib/pptx/build-source.py) 가 표지·목차·챕터 TOC 를 주입한다. 표지는 **pandoc 메타데이터**로 적어야 `Title Slide` 레이아웃이 잡힌다(실측) — 파일 첫 줄을 비워 `md2pptx.strip_frontmatter()`(파일이 `---` 로 *시작할 때만* 걷어냄)를 통과시킨다. 챕터 TOC 는 챕터 진입부의 부제 H2 를 제목으로 삼아 합쳤다(장수 팽창 없이 원본 2장 ↔ 산출 2장). 실측은 아래 완료 실측 참조
* 구현 명세:
    - 원고 생성기가 cover(문서 최상단 제목·부제 메타) · agenda(H2+불릿) · 챕터 TOC(각 챕터 진입부) 를 md 로 생성
    - `cover_enabled: false` 프로젝트에서는 주입하지 않는다 — 설정을 존중
    - 검증: 산출 장수가 원본 `<section>` 수와 대응 · cover/agenda/TOC 각 1장 이상 실존

## Issue327: pptx 원고 생성기 골격 — `lib/pptx/build-source.py` 신설 (등록: 2026-08-18, 해결: 2026-08-18, commit: 0338cc3) ✅
* 완료 실측 (2026-08-18): [`build-source.py`](lib/pptx/build-source.py) 신설 + [`build-pptx.sh`](lib/pptx/build-pptx.sh) 를 `--m2slide` 자동수집 → **중간 원고 전달**로 교체. igTest — 산출 pptx 리터럴 누출 **0건**(`{.`·`:::`·`#layout-`·`#id-`·주석), 45장·Title 39(87%)·FAIL 0 유지. single mode 회귀 없음(aTest 42장 FAIL 0, 정리 attr 10·`#id` 31·심벌 8·애니 3)
* 🔑 **G8 발견·해소** — ig-maker 가 만든 `img/strengths-1.svg`(장당 33만 토큰)가 pptx 에서 **조용히 누락**되고 있었다. 원고는 `markdown/` 에 있고 실물은 프로젝트 루트 `img/` 에 있는데 **빌드만 두 곳을 병합 복사**하기 때문. 변환 로그가 `✕ 없음` 을 정직하게 찍었지만 빌드가 성공으로 끝나 아무도 보지 않았다 — *"성공으로 보이는 품질 회귀"*. 생성기가 m2slide 탐색 규칙(원고 옆 → 프로젝트 루트)으로 해소: **이미지 파일없음 1→0 · SVG 변환 0→1**(산출 94KB→179KB)
* 역할 경계 준수: `#layout-*` 제거·fenced div 껍데기·mermaid 렌더는 **md2pptx 소관이라 건드리지 않았다** — 같은 판정을 두 곳에서 하면 갈린다(Issue323 에서 실제로 겪은 형태)
* depends: Issue326
* 목적: m2slide 만 아는 것(빌드 지식)을 pptx 경로에 전달할 **유일한 통로**를 만든다. 구조 슬라이드·layout·cards 는 원고 md 에 없고 `_config.yml`·AGENDA·빌더가 만들기 때문에, md 만 읽는 글로벌 변환기는 원리적으로 알 수 없다.
* 상세:
    - 아키텍처 결정 근거·대안 3안 비교는 [`pptx-parity-design.md`](_doc_arch/pptx-parity-design.md) "아키텍처 결정" 절. 채택안 ⓒ = **중간 원고**
    - `md2pptx.py` 는 위치 인자로 md 파일 목록을 받으므로(`md nargs="*"`), `--m2slide <폴더>` 대신 **생성 원고를 넘기면** 글로벌 수정 없이 성립한다
    - 산출 위치 `Projects/<N>/_pipeline/pptx/source/*.md` — `_pipeline/` 은 git 미추적([repo-tracking-rules](.claude/rules/repo-tracking-rules.md))
    - ⚠️ **내용을 새로 쓰지 않는다.** 문구는 원본 그대로 옮기고 구조만 만든다 — 넘으면 두 산출물이 다른 말을 하기 시작한다
* 구현 명세:
    - 본 이슈 범위는 **골격 + 문법 정리(G5)** 까지: `{.fragment}`·`<!-- .element: -->`·`::right::`·`#id-*`·비-pandoc 슬롯 fenced div 제거·평탄화
    - 구조 슬라이드 주입은 Issue328, layout 유도는 Issue329 로 분리 (한 커밋에 몰면 회귀 원인 격리가 안 된다)
    - `build-pptx.sh` 가 원고 생성 → 그 목록을 `md2pptx.py` 에 전달하도록 배선 교체
    - 검증: 산출 pptx 에서 `{.`·`:::`·`#layout-` 리터럴 0 (현행 `{.fragment}` 4번 장·`# ` 5번 장 누출)

## Issue323: theme-from-css `--kn-accent` 오탐 — prj3 위임 + 임시 교정 수명 관리 (등록: 2026-08-18, 해결: 2026-08-18, commit: 81ea414) ✅
* 완료 실측 (2026-08-18): **trigger 충족** — prj3#Issue434 가 `cc01ad8`(`:root --kn-accent` 폴백)로 완료됨을 확인. m2slide 임시 교정 36줄 제거 후 **글로벌 단독 산출이 구 교정본과 accent 4색 전부 일치**(`#F5C518 #FFE15A #C49D13 #977A0E` — 실렌더 `--kn-accent` 와 같다). reference.pptx accent1~4 반영 확인 · `2.deck` 러너 5단언 통과 · `check-conform --lane a` FAIL 0
* 판정 근거: 같은 판정을 로컬·글로벌 두 곳에서 하면 갈린다. 글로벌이 같은 로직(`shade()` 포함)을 승계했으므로 로컬 사본은 중복이며, 남겨 두면 다음 글로벌 개선이 로컬 덮어쓰기에 가려진다
* depends: prj3#Issue434
* trigger: prj3#Issue434 ✅ 완료 + commit hash 기록 → [`build-pptx.sh`](lib/pptx/build-pptx.sh) 의 `--kn-accent` 임시 교정 제거 + igTest `--pptx` 재검증
* 목적: [`ig-ppt-integration.md`](_doc_arch/ig-ppt-integration.md) 🔧 FIXME(palette 미지정 덱 accent 오탐 — 글로벌 `theme-from-css.py` 소관)를 prj3#Issue434 로 정식 위임하고, m2slide 쪽 임시 교정의 제거 조건을 명시한다. *-maker 는 prj82·범용 공용이라 m2slide 세션에서 직접 수정하지 않는다(사용자 지시 2026-08-18).
* 상세:
    - prj3#Issue434 등록 완료 (2026-08-18, prj3 commit 3c54dd7) — 오탐 메커니즘·폴백 명세·검증 조건 포함
    - m2slide 는 그때까지 `build-pptx.sh` 의 임시 우회(palette 미지정 시 `--kn-accent` 덮어쓰기)를 유지한다
* 구현 명세:
    - 본 이슈는 prj3 해결 대기 — trigger 충족 시 임시 교정 제거 + 재검증 후 종결

## Issue326: `--slide-level 2` 전환 — 제목 소실(5/35) 복원 (등록: 2026-08-18, 해결: 2026-08-18, commit: 6ea4db9) ✅
* 완료 실측 (2026-08-18): [`build-pptx.sh`](lib/pptx/build-pptx.sh) 에 `--slide-level 2` 전달(사용자 인자가 뒤에 와서 덮을 수 있게 배치). igTest 재산출 — **35장 Title 5(14%) → 45장 Title 39(87%)**, `check-conform --lane a` FAIL 0 유지(WARN 1 = 기존 Courier). single mode 회귀 없음 확인: aTest 41장 Title 8(20%) → 42장 Title 38(90%) — 두 모드 다 H2 가 슬라이드 제목이라는 같은 규약을 따르기 때문
* 부수: [`2.deck.sh`](z_test/ig-ppt/2.deck.sh) 기대값이 레벨 1 시절 상수(3장)라 실패 → **하한(원고 3블록 ≤ 산출) + 제목 보유율 ≥60%** 로 교체. 상수로 두면 개선할 때마다 러너가 막고 기대값을 습관적으로 고치게 된다. 정밀 장수·제목 판정은 Issue330 parity 러너로 이관
* 🔑 발견: 챕터 진입 장 1개가 **3장으로 쪼개진다**(H1 + "Chapter N." + 부제) — 87%가 100%가 아닌 직접 원인. Issue329 에 실측 근거로 기재
* depends: Issue325
* 목적: PPTX 산출물의 **86% 슬라이드에 제목이 없는** 상태를 고친다. m2slide 는 **H2 가 슬라이드 제목**인데 변환이 `--slide-level=1`(H1 경계)로 돌아 H2 가 본문 첫 줄로 강등된다.
* 상세:
    - 🟢 **실측으로 이미 확인된 해법** (2026-08-18): 같은 원고·같은 reference 로 `--slide-level` 만 바꾼 결과 — `1` → 35장·Title **5**장 / `2` → 45장·Title **39**장. **39 는 원본 HTML 슬라이드 수와 정확히 일치**한다
    - 45−39=6 은 H1 챕터 진입 장이 별도 슬라이드로 서기 때문 — 없앨 것이 아니라 `Section Header` 로 매핑할 대상(Issue329)
    - 비용 0·즉시 되돌림 가능. 다른 격차와 달리 **인자 한 개**다
* 구현 명세:
    - [`lib/pptx/build-pptx.sh`](lib/pptx/build-pptx.sh) 가 `md2pptx.py` 호출 시 `--slide-level 2` 전달
    - ⚠️ single mode 덱(H1 이 슬라이드 제목인 프로젝트)에서 회귀하지 않는지 확인 — 필요하면 chapter/single 판별로 레벨을 가른다
    - 검증: `igTest` 재산출 후 Title placeholder ≥95% · `check-conform --lane a` FAIL 0 · 기존 [`2.deck.sh`](z_test/ig-ppt/2.deck.sh) 통과 유지

## Issue325: PPTX 충실도 설계 SSOT 작성 — 실측 격차 카탈로그 + 원고 생성기 아키텍처 (등록: 2026-08-18, 해결: 2026-08-18) ✅
* 목적: *"다운로드한 pptx 가 원본과 너무 다르다"* 는 관측을 **격차 목록·원인·해법 경계**로 확정해 후속 이슈 전부의 근거로 삼는다. 일치화를 시도한 적이 없었으므로(사용자 확인) 배선 문서와 별개로 충실도 설계가 필요했다.
* 산출: [`_doc_arch/pptx-parity-design.md`](_doc_arch/pptx-parity-design.md) 신설
* 완료 범위 (실측 2026-08-18 · `~/Downloads/igTest.pptx` 35장 ↔ 원본 39장):
    - **파리티 정의** — 픽셀 일치가 아니라 3축(구조 동형 → 테마 동일 → 표현 등가) 우선순위. pptx 는 편집 가능해야 하므로 캡처 복제는 목표가 아니다
    - **격차 카탈로그 G1~G7** — 제목 5/35 · 구조 슬라이드 12장 부재 · layout 대응 0 · cards/htmlart 소실 · 마크다운 누출 2종 · Courier 15회 · 팔레트 스코프 오탐
    - **원인 3종 분리** — O1 경계 레벨(인자) · O2 전달 경로 부재(구조적) · O3 어휘 미정의(렌더러). ⚠️ O2 를 글로벌 변환기 결함으로 읽으면 안 된다는 판정 포함
    - **아키텍처 결정** — 대안 3안(글로벌 확장·캡처 경유·중간 원고) 비교 후 **ⓒ 중간 원고 생성기** 채택. 글로벌 무수정 + 중간물이 검사 가능
    - **layout 매핑표** — 🟢 초기 판단 뒤집힘: 마스터 신설이 아니라 **원고 구조로 유도**하는 문제(표준 11종은 `--adapt` 가 이미 생성해 둠, 실측)
    - **3레인 경계** — A(텍스트·토큰 0) / B(도형·소) / C(ig-maker·장당 33만). "A 를 건너뛰고 C 로 가지 않는다"
    - **prj82 계승 판정** — `potx.md` 원칙 계승 · 렌더러는 글로벌 경유 · `pages.py` 파이썬 원고는 비계승(m2slide 원고는 마크다운이고 그것이 존재 이유)
* 부수 실측: `--slide-level` 을 `2` 로 바꾸면 Title placeholder 가 **5 → 39장**(원본 슬라이드 수와 정확히 일치) — Issue326 의 근거

## Issue324: igTest 재구축 — 픽스처 초기화 + 통합 회귀 전판 + ig-maker 1장 E2E (등록: 2026-08-18, 해결: 2026-08-18, commit: 11c6ad1) ✅
* 완료 실측 (2026-08-18): 재구축(기존본 스크래치 보존 → playground fresh 복사 → 템플릿 2종 → `igpath resolve` 4키 기대값 일치) + 회귀 전판 통과 — 빌드 · `--pptx` rc0(검증 내장) · `0.cost-gate` 5단언(실덱 후보 6장 exit 4 재현) · `2.deck` 4단언 · `1.infographic` 8단언 · lint-deployment. E2E 1장 — 인스턴스 `ig-1-5e92`(sonnet, 31.8만 토큰·23분·재시도 0, 글로벌 장당 실측치와 일치), `7.pptx` 이미지 0·텍스트 프레임 15·conform WARN 0, igsvg rc0, palette 채움(`seeded_by: ppt-init` 쓰기 확대 경로 prj3#382 검증), 발행본=원본 cmp 일치, 슬라이드 실렌더 육안 확인(크롬 비복제 — 1라운드의 revise 사유를 프롬프트 선제 명시로 재발 방지)
* 부수 교정: 러너 검사 4(원문 보존)가 `<tspan>` 줄바꿈 분절을 누락으로 **오탐**(실측 5건) — 렌더 텍스트·공백 무시 기준으로 교정, 가짜 문구 반증 테스트로 검출력 유지 확인
* depends: Issue320, Issue322
* 목적: 사용자 지시("igTest 다시 만드는 수준") 이행 — playground 원본에서 픽스처를 fresh 재생성하고, 2차 정합 상태에서 통합 경로 전판(빌드 · `--pptx` 검증 차단 · 비용 게이트 · 회귀 러너 3종 · lint)을 재검증한다. ig-maker 1장 E2E(캡처→팬아웃→발행→슬라이드 참조)로 SVG 소비 경로를 재실증한다.
* 상세:
    - 기존 igTest 는 삭제하지 않고 스크래치로 이동 보존(오판 대비 — ig-maker-design §4-5 "삭제를 승인 대상으로 남겨 둔 절차가 오판을 막았다"와 같은 취지)
    - 재생성 절차 = Issue319 규약: `~/.claude/playground/resource/m2slide` 복사(markdown 5챕터 + `_config.yml` + `VERSION` + `Info.md`) + [`data/ppt-integration/`](data/ppt-integration/README.md) 템플릿 2종 복사
    - E2E 팬아웃은 **1장** — 게이트 임계(warn 2) 미만, 1라운드 선례(Issue312) 있음. 인스턴스는 sonnet 모델 명시(본 세션 모델 상속 금지 — 크레딧 과금 회피)
    - 픽스처는 git 미추적(Issue319) — `--sync-projects` 실행 금지(추적 목록 부작용 실측 있음)
* 구현 명세:
    - 재구축: 이동 보존 → playground 복사 → 템플릿 복사 → `igpath resolve` 4키 기대값 확인
    - 회귀: `./m2slide.sh igTest` 빌드 → `--pptx` 검증 통과 → `z_test/ig-ppt/0.cost-gate.sh` → `2.deck.sh` → lint(deployment)
    - E2E: [`lib/ig/capture-for-ig.sh`](lib/ig/capture-for-ig.sh) → ig-maker 1장(sonnet) → `igpublish` → `04-strengths.md` 참조 → 재빌드 → `1.infographic.sh` 통과

## Issue322: ```pptx-info 펜스 블록의 m2slide 빌드 통과성 실측 + 사용 정책 박제 (등록: 2026-08-18, 해결: 2026-08-18, commit: e496f0c) ✅
* 완료 실측 (스크래치 프로젝트, 2026-08-18): HTML 빌드 = `<code class="language-pptx-info hljs">` 코드블록 리터럴 렌더·빌드 정상. `--pptx`(lane A) = pandoc 일반 코드블록 통과·검증 rc0. 즉 빌드는 비파괴지만 **yaml 소스가 청중에 노출** → "m2slide 마크다운에서 쓰지 않는다" 정책을 [`md-m2slide-rules`](.claude/rules/md-m2slide-rules.md) 에 박제 + 통합 SSOT 판정 완료 표기
* 목적: 상위 설계 [`pptx-scar-design.md`](file:///Users/nowage/.claude/_doc_arch/pptx-scar-design.md) §8-3 이 prj42 몫으로 지정한 *"` ```pptx-info ` 블록을 파서가 통과시키는지 확인(미지원 코드블록으로 렌더될 수 있음)"* 을 이행한다. 실측 후 m2slide 마크다운에서의 사용 정책을 규칙으로 박제한다.
* 상세:
    - `pptx-info` 블록은 파트 C(ppt-info, lane B 인포그래픽 덱)의 페이지 정의 입력이다. m2slide 덱(lane A)의 인포그래픽 경로는 ig-maker SVG 발행(`img/`)이 정본이므로, m2slide 마크다운에서는 **쓰지 않는다**가 유력 — 실측으로 확정
    - 확인 지점 2곳: ① m2slide HTML 빌드가 블록을 만나면 어떻게 렌더되나(코드블록 리터럴? 빌드 깨짐?) ② `--pptx`(md2pptx lane A) 경로에서의 처리
* 구현 명세:
    - 스크래치 프로젝트에 `pptx-info` 블록 포함 md 를 넣고 빌드 실측
    - 결과를 [`md-m2slide-rules.md`](.claude/rules/md-m2slide-rules.md) 시각화 구성요소 절에 1항 추가 + `ig-ppt-integration.md` 연동
    - 실측이 "빌드 깨짐"이면 대응 재판정(별도 이슈 분리)

## Issue321: promo-cartoon(cartoon-maker) L2 정책 배선 — m2slide 최초 도입 + 파일럿 1장 (등록: 2026-08-18, 해결: 2026-08-18, commit: 749edf0) ✅
* 완료 실측: L2 `data/promo-cartoon/policy.yml` 생성 + 파일럿 카툰(`data/promo-cartoon/output/m2slide-killer-scene-1.{svg,png}` — SVG 2.8MB·PNG 282KB) 1장 산출. 육안 검증 통과 — ③ 4단계 아이콘 SVG 도형(문서·슬라이더·재생·2×2 그리드) 렌더 정상·검은 사각 0, 카툰체 하이브리드 폰트(TmonMonsori·나눔손글씨·나눔스퀘어라운드) 적용, 마스코트 6포즈 base64 embed 정상, ④ 체크 심볼·⑤ 4컷·⑥ CTA 전부 정상. 산출물·L2 는 정책상 git 미추적(`/data/*` 기본 제외 실측) — commit 은 등록 커밋(구현 명세 포함)
* 목적: 글로벌 [`promo-cartoon`](file:///Users/nowage/.claude/skills/promo-cartoon/SKILL.md) 설계의 "최초 프로젝트 도입 시 L2 정책 파일 생성" TODO 를 m2slide 에서 이행한다. m2slide 제품 홍보 카툰(세로형 1장 SVG→PNG)을 이 repo 에서 정책 기반으로 생성 가능하게 한다.
* 상세:
    - L2 `data/promo-cartoon/policy.yml` — `product: m2slide` · `killer_scene_source: ~/_git/___common/_doc_base/promotion_0.initial.md`(m2slide Killer Scene ①~④ 표 실존 확인) · `output_dir: data/promo-cartoon/output/`
    - gitignore 는 이미 충족 — 루트 `.gitignore` 의 `/data/*` 기본 제외 + 화이트리스트 방식이라 `data/promo-cartoon/` 은 화이트리스트 미추가로 자동 제외(`git check-ignore` 실측). 설계 문서의 ".gitignore 추가 필수"는 m2slide 에선 구조적으로 이행됨
    - ⚠️ ③ `{{STEP*_ICON}}` 은 호출자 주입값 — **이모지 금지, SVG 도형 주입**(prj3#426 이 ④는 템플릿에서 해결했으나 ③은 호출자 책임으로 잔존. 이모지를 넣으면 rsvg 가 검은 사각으로 렌더)
    - 마스코트 7종은 기존 스프라이트 재사용 — 이미지 생성 비용 0
* 구현 명세:
    - `data/promo-cartoon/policy.yml` 생성 (L2 허용 키만)
    - 파일럿 카툰 1장 — m2slide Killer Scene ①("슬라이드를 고치지 말고 패턴을 고쳐라") 6블록 SVG 조립 + `rsvg-convert` PNG export → `data/promo-cartoon/output/`
    - 검증: PNG 실렌더에서 검은 사각·실루엣 0 (③ 아이콘 SVG 도형 사용) · 마스코트 base64 embed 정상 · L1+L2 병합 값 확인

## Issue320: ig·ppt·cartoon 설계 2차 정합 — 글로벌 8/11~8/17 변경 반영 (등록: 2026-08-18, 해결: 2026-08-18, commit: 90cf746) ✅
* 완료 실측: `ig-ppt-integration.md` 에 igsvg 대조 게이트·카툰 편입 경로 절 신설 + 미해결 4건 재판정(위임 1·유지 1·판정 완료 3) 반영. `issue-rules.md` 완료 섹션명 표기 정정(구 `🏁 완료-해결순` → 실물 `✅ 완료`). ⚠️ `_doc_arch/` 는 gitignore(로컬 전용)라 커밋은 룰 정정분만 담김
* 목적: 1라운드(Issue309~319) 종결 이후 글로벌 *-maker 쪽에 들어온 변경(prj3 Issue382~388·412·425·426)을 m2slide 통합 SSOT 에 반영하고, [`ig-ppt-integration.md`](_doc_arch/ig-ppt-integration.md) 미해결 4건 + 상위 설계([`pptx-scar-design.md`](file:///Users/nowage/.claude/_doc_arch/pptx-scar-design.md) §8 "prj42 수정 필요 3건" 중 잔여 2건)를 재판정해 결정을 박제한다. 검토 결론 — **글로벌 *-maker 는 수정 불요**, m2slide 쪽 문서·배선 갱신으로 전부 흡수된다.
* 상세:
    - 반영 대상 글로벌 변경: `igsvg` 대조 게이트 재정의(prj3#388 — 입력을 5.svg 고정에서 해제, 기준은 `7.pptx` 문구·우회 플래그 없음) · `7.svg` 생성 주체 확정(#383 — 에이전트가 그리고 igsvg 는 판정만) · agent id 형식 집행(#384) · `.ready` `seeded_by` 쓰기 권한 확대(#382) · ig-selector 갈래 2 = promo-cartoon 위임(pptx-scar-design §6-1-c P5)
    - 재판정 ①: 상위 설계 §8-2 `Projects/_ppt/` 공용 자산 루트 — **신설하지 않음**. m2slide 는 프로젝트=덱 단위고 테마가 프로젝트마다 다르다. `Projects/<N>/ppt/_asset_ppt` 상향 탐색 공유(Issue310)로 충분
    - 재판정 ②: 파이프라인 단계 5 선별 자동화 — **사람 지목 유지**. 팬아웃·승인 게이트는 ig-selector 소유(Issue313)라 m2slide 가 자동화하면 게이트 우회가 된다
    - 재판정 ③: `pptx.yml` 전 프로젝트 롤아웃 — **옵트인 유지**(필요 프로젝트만 템플릿 복사). 근거: ppt/ 폴더는 덱 작업이 실제로 있는 프로젝트에만 의미가 있다
    - 부수 정정: [`.claude/rules/issue-rules.md`](.claude/rules/issue-rules.md) 의 완료 섹션명 기술(`🏁 완료-해결순`)이 실제 파일(`✅ 완료`)·상위 videoMaker 규칙(2026-05-10 단일화)과 어긋남 — 실물에 맞춰 정정
* 구현 명세:
    - `_doc_arch/ig-ppt-integration.md` 섹션 단위 Edit — "알려진 편차·미해결" 4건 재판정 결과 반영 + igsvg 게이트·카툰 편입 경로 절 추가
    - `.claude/rules/issue-rules.md` 완료 섹션명 정정
    - 검증: 문서 내 죽은 참조 0 · 미해결 마커 잔존은 근거와 함께만

## Issue317: ppt-check 검증 배선 + m2slide lint 통합 (등록: 2026-08-11, 해결: 2026-08-11, commit: 647db93) ✅
* **결정: 경고가 아니라 차단** (2026-08-11). 근거 — `check-conform` 의 FAIL 은 *"PowerPoint 가 거부하거나 깨져 보이는 위반"*이다. 통과시키면 `index.html` 에 다운로드 버튼까지 달려 배포된다. [`build-pptx.sh`](lib/pptx/build-pptx.sh) 가 구 pandoc 직접 경로로 **폴백하지 않는 것과 같은 이유**이며(성공으로 보이는 품질 회귀 차단), `--pptx` 는 옵트인 경로라 기본 빌드(`./m2slide.sh <P>`)에는 영향이 없다
* **심각도 구분은 m2slide 가 하지 않는다.** FAIL/WARN 은 `check-conform` 이 이미 가르며 WARN 은 rc0 이라 통과한다 — igTest 35장 실측 `FAIL 0 · WARN 1`(템플릿 밖 폰트 Courier)에서 빌드 성공. m2slide 가 자체 임계를 또 두면 판정이 두 곳으로 갈라진다
* **배선 결함 발견·수정**: 기존 코드는 검증 실패를 `❌ Failed to generate PPTX` 로 보고했다 — 파일은 생성됐는데 생성 실패라 하고, "pandoc 이 처리 못 하는 문법" 을 의심하라고 오도했다. `build-pptx.sh` 가 **산출 파일 갱신 여부**로 두 사건을 가른다 (rc 2 = 검증 실패·파일 있음 / rc 1 = 생성 실패·파일 없음). 낡은 산출물이 남아 있어도 mtime 비교로 오분류하지 않는다
* **`--pptx-no-verify` 신설**: 차단을 의도적으로 넘길 때만. 산출물이 규격을 지킨다는 뜻이 아니므로 통과 시에도 생략 사실을 출력한다
* 실측 5종 전부 확인 — 정상 `rc0` · 검증실패 `rc2` → m2slide.sh `exit 1`(이때 `index.html` 갱신도 건너뛰므로 실패한 덱에 다운로드 버튼이 붙지 않는다) · 생성실패 `rc1` · 낡은 산출물 잔존 시 오분류 0 · `--pptx-no-verify` `rc0`
* ⚠️ **`--lane a` 필수** — `check-conform` 기본값은 `b`(인포그래픽)이고 그 lane 은 본문 이미지를 위반으로 본다. m2slide 덱은 lane A 라 mermaid 렌더 이미지가 **정상 콘텐츠**인데 기본값으로 재면 FAIL 이 뜬다. 같은 pptx 실측: `--lane a` rc 0 / lane 미지정 rc 1. `md2pptx.py` 는 이미 `--lane a` 로 부르므로 **손으로 재검할 때만** 문제가 된다 → 3곳에 명시([`build-pptx.sh`](lib/pptx/build-pptx.sh) 주석·실패 안내문·[`CLAUDE.md`](CLAUDE.md)·[`apply-verify-rules`](.claude/rules/apply-verify-rules.md) §4.7)
* 목적: PPTX·인포그래픽 산출을 "성공했다"가 아니라 **검증 통과**로 판정한다.
* depends: Issue314, Issue315
* 상세:
    - 글로벌 `ppt-check` 는 검증 5종 보유(PowerPoint 가 거부하는 위반 포함) — m2slide 자체 lint(`--lint-deployment`·`--lint-data`·`--lint-license`)와 역할이 겹치지 않음
* 구현 명세:
    - `--pptx` 산출 직후 `ppt-check` 자동 실행, 실패 시 rc≠0 로 빌드 실패 ✅ — `md2pptx.py` 가 `check-conform`(`--lane a`) + `check-xml-order` 를 내장 실행하고, 그 rc 가 `build-pptx.sh` → `m2slide.sh` 로 전파된다
    - [`apply-verify-rules`](.claude/rules/apply-verify-rules.md) 의 lint 목록에 항목 추가 ✅ — §4.7 신설. **lint subcommand 가 아니라 `--pptx` 빌드 내장**이라는 점을 목록에 명시

## Issue313: ig-selector 비용 게이트 배선 — 자동 팬아웃 금지 (등록: 2026-08-11, 해결: 2026-08-11, commit: ca62a88, fb49bbe, 7373785, 55e5895) ✅
* 완료 실측 (2026-08-11, `Projects/igTest` 35장 덱): 스모크테스트 5개 단언 전부 통과 — 10장 `exit 4` / 9장 `exit 0`(임계 경계) · 파이프 삼킴 재현 · pipefail 시 4 보존 · 실덱 후보 6장이 프로젝트 임계 초과로 `exit 4`. 회귀 러너 [`z_test/ig-ppt/0.cost-gate.sh`](z_test/ig-ppt/0.cost-gate.sh) — ig-maker 를 돌리지 않으므로 **비용 0**
* ⚠️ **등록 당시 가정이 반증됐다.** "덱이 20~40장이라 기본 임계에 거의 항상 걸린다"는 틀렸다 — 게이트가 세는 것은 **덱 장수가 아니라 후보 장수**이고 분류기가 크게 걷어낸다. 35장 → 후보 6장(17%) = 198만 토큰인데 기본 임계(warn 5 · hard 10)에서 **rc0 통과**했다. 즉 기본값은 m2slide 덱에서 사실상 무동작이며, 임계는 **올릴 것이 아니라 내려야** 한다
* 확정 임계: `warn_pages: 2` · `hard_pages: 3` ([`ig-selector.yml.template`](data/ppt-integration/ig-selector.yml.template) 에 주석 해제 반영). 근거 — warn 2 는 Issue319 가 회귀 러너 팬아웃 상한으로 이미 확정한 값, hard 3 은 99만 토큰·75~90분으로 한 세션 무인 실행 상한선
* ⚠️ **삼킴 경로는 파이프로 특정됐다.** `igselect cost ... | tee log` 의 rc 는 마지막 명령의 것이라 `exit 4` 가 `0` 으로 바뀐다(실측). 파이프가 필요하면 `set -o pipefail` 을 함께 건다 — 명령치환(`$(...)`)은 rc 를 전파하므로 안전
* 부수 정정: [`data/ppt-integration/README.md`](data/ppt-integration/README.md) 의 "임계를 낮추면 팬아웃이 는다" 는 방향이 반대였다 — 팬아웃을 늘리는 쪽은 **올리는** 재정의다
* 목적: 장당 **33만 토큰·25~30분**(글로벌 실측)인 ig-maker 를 파이프라인이 조용히 N장 돌리는 사고를 구조적으로 차단한다.
* depends: Issue312
* 상세:
    - 선별·승인·팬아웃·조합·발행은 전부 `ig-selector` 소유 — m2slide 가 팬아웃을 **가져오지 않는다**(글로벌 사용자 결정 2026-08-09). m2slide 는 호출과 결과 회수만
    - 픽스처의 `Projects/igTest/.claude/ig-selector.yml` 은 **git 미추적**이다(igTest 자체가 미추적). 템플릿 복사로 언제든 재생성된다
* 구현 명세:
    - `Projects/<Name>/.claude/ig-selector.yml` 부분 재정의 템플릿 + 판정 축 문서화 ✅ — 부분 재정의 동작 확인(`cost.warn/hard` 만 교체, `tokens_per_page`·`text.*` 등 기본값 보존)
    - media-creater 가 인포그래픽을 여러 장 요구할 때 **일괄 자동 실행 금지** ✅ — `tools.yml` `ig_maker.gate` 에 삼킴 경로·임계 실측 추가
    - exit 4 를 rc0 으로 뭉개는 wrapper 금지 — 스모크테스트로 확인 ✅

## Issue319: 소규모 테스트 픽스처 + 회귀 러너 (등록: 2026-08-11, 해결: 2026-08-11, commit: d6e1aaa, 2dc8453, fea7dbc) ✅
* 완료 실측: 러너 2종 전부 통과. 픽스처는 `Projects/igTest`(git 미추적, playground 원본 복사로 재생성). ⚠️ 러너 작성 중 오탐 2건을 겪음 — ig-maker 가 헤더 주석에 규약 문구(`@import 0`)와 제거 대상 문자열(`4 › 23 / 39`)을 그대로 인용하므로 **XML 주석을 먼저 걷어내고 `<text>`/`<tspan>` 렌더 텍스트만 판정**해야 한다
* 목적: 통합 검증을 **적은 페이지**로 돌린다. 40장짜리 실덱으로 검증하면 ig-maker 비용(장당 33만 토큰)과 회귀 원인 격리 난이도가 동시에 폭발한다.
* depends: Issue309
* 상세:
    - 픽스처 `Projects/igTest` 배치 완료 (2026-08-11) — `~/.claude/playground/resource/m2slide` 소스 복사(markdown 5챕터 + `_config.yml` + `VERSION` + `Info.md`). 빌드 산출물·`_pipeline/` 은 복사하지 않음
    - **페이지 수 기준이 둘이라 혼동 주의** — playground `test_task_define.md` 의 "9 페이지"는 **pandoc 슬라이드(H1 기준)** 이고, 같은 원고를 m2slide 로 빌드하면 **39 슬라이드**다(실측: 7+7+8+10+7). 인포그래픽 대상 "6·7 페이지"는 전자 기준(04-strengths · 05-wrap-up 진입 장)
    - 픽스처는 **git 미추적**이다 — `Projects/.gitignore` 가 `Projects.md` publishing 열에서 생성되고 igTest 는 발행 대상이 아니다. 재생성은 playground 원본 복사로 언제든 가능하므로 추적하지 않는다([repo-tracking-rules](.claude/rules/repo-tracking-rules.md) 판정 4)
    - ⚠️ `./m2slide.sh --sync-projects` 는 `Projects/.gitignore`·`Projects_org.md` 를 **함께** 갱신하며, 실행 시 기존 미추적 프로젝트 3건(AgenticCoding·StellarEvolution·graphify)이 추적 목록에 추가되는 부작용이 관측됐다(2026-08-11, revert 처리). 픽스처 작업 중 무심코 커밋하지 말 것
* 구현 명세:
    - playground 6종 중 **1·2번을 m2slide 쪽 러너로 이식** — `z_test/ig-ppt/{1.infographic,2.deck}/run.sh`. 각 run.sh 는 playground 원본을 인용하되 입력을 `Projects/igTest` 로 바꾼다
    - 통과 조건은 playground `test_task_define.md` 를 그대로 인용 — 1번: 2장·이미지 0·원본 문구가 편집 가능한 도형 텍스트로 존재·회귀 `summary` / 2번: 3장·accent 색 반영·`#layout-*` 누출 0·회귀 `convert`(어휘 커버리지 90%↑)
    - `ppt-check --baseline Projects/igTest --regress-mode <mode> --strict` 로 판정
    - 비용 상한 명시 — 1번은 팬아웃 0(ppt-info 블록 데이터), ig-maker 팬아웃이 붙는 경로는 **2장 이하**로 제한

## Issue318: 문서·룰 동기화 (등록: 2026-08-11, 해결: 2026-08-11, commit: 4235c61, fb49bbe) ✅
* 목적: 통합 결과를 CLAUDE.md·룰·설계 문서에 반영해 다음 세션이 같은 조사를 반복하지 않게 한다.
* depends: Issue312, Issue315
* 구현 명세:
    - [`CLAUDE.md`](CLAUDE.md) — PPTX 변환 절(현 pandoc 직접 안내)을 ppt-deck 경유로 갱신
    - [`_doc_arch/authoring-pipeline.md`](_doc_arch/authoring-pipeline.md) 단계 5 갱신 · [`.claude/rules/data-access-rules.md`](.claude/rules/data-access-rules.md) 단계별 data 접근표에 ig 관련 항목 반영 여부 판정
    - [`_doc_arch/ig-ppt-integration.md`](_doc_arch/ig-ppt-integration.md) 의 미해결 마커(🚧/🔧) 정리

## Issue316: theme CSS → reference.pptx 2단 배선 (등록: 2026-08-11, 해결: 2026-08-11, commit: 9c94d97) ✅
* 목적: PPTX 가 m2slide 덱과 **같은 팔레트**를 쓰게 한다. 이 단계를 빼면 덱은 나오지만 색이 원본과 무관해진다(playground 실측: accent 검출 0회).
* depends: Issue315
* 상세:
    - **범위 축소 (2026-08-11 실측)** — "조사"가 아니라 **이미 있는 2단 파이프 배선**이다:
        1. [`theme-from-css.py`](file:///Users/nowage/.claude/skills/ppt-spec/scripts/theme-from-css.py) `<m2slide루트> --theme <name> --palette <p> --name <테마명> --out theme.yml` — `theme/<name>/slide.css`·`palettes/<p>.css` 를 실측하고, 없으면 `slide/css/custom.css` 로 폴백한다. `[data-palette="X"]` 스코프 병합까지 지원
        2. [`theme2reference.py`](file:///Users/nowage/.claude/skills/ppt-deck/scripts/theme2reference.py) `theme.yml --out reference.pptx --adapt` — 그 테마를 pandoc reference-doc 으로
    - 즉 m2slide 가 할 일은 `_config.yml` 의 `theme:`·`palette:` 값을 두 스크립트에 **그대로 전달**하는 것뿐이다. 손으로 만든 potx 는 선택 사항으로 남는다
* 구현 명세:
    - `_config.yml` 의 `theme`·`palette` 를 읽어 `--theme`·`--palette` 로 전달 (파서는 [`lib/config.js`](lib/config.js) 가 이미 해석)
    - 산출 `theme.yml`·`reference.pptx` 위치는 덱 작업 폴더(`ppt/<ppt명>/_asset_ppt/`·`_source/`) — Issue310 경로 규약을 따른다
    - 사용자 지정 potx 를 우선하는 override 경로를 남길지 설계에서 확정
    - 검증: 산출 pptx 에서 m2slide accent 색 검출 ≥1회 (playground 2번 케이스 기준)

## Issue315: `m2slide.sh --pptx` → md2pptx.py 배선 (테마 반영) (등록: 2026-08-11, 해결: 2026-08-11, commit: 9c94d97) ✅
* 완료 실측 (igTest): accent 검출 17회 (구 경로 0회) · Malgun Gothic 193회 (0회) · `#layout-*` 누출 0건 (5건) · 전체 변환 35장 FAIL 0. 회귀 러너 [`z_test/ig-ppt/2.deck.sh`](z_test/ig-ppt/2.deck.sh) 4항목 통과
* 목적: PPTX 산출이 테마를 잃는 현 상태를 고친다. pandoc 직접 호출을 글로벌 `ppt-deck` 의 **m2slide 전용 진입점**으로 교체한다.
* depends: Issue309
* 상세:
    - 현재 코드: `m2slide.sh` PPTX 블록이 single/chapter 분기 후 `pandoc ... -o "$PPTX_OUTPUT"` 직접 호출. `--reference-doc` 없음 → 조직 서식·테마 전무
    - **범위 축소 (2026-08-11 실측)** — 쓸 도구는 `deck.py` 가 아니라 [`md2pptx.py`](file:///Users/nowage/.claude/skills/ppt-deck/scripts/md2pptx.py) 다. `--m2slide <프로젝트폴더>` 플래그가 `markdown/*.md` 를 자동 수집(AGENDA 제외·이름순)하고 `--pages 1-3` 부분 변환·`#layout-*` 지시자 제거까지 이미 처리한다. 문서 예시 자체가 이 repo 경로(`m2slide/Projects/fPmIntro_en`)를 가리킨다
    - **순환은 `deck.py` 경로에만 있다** — `deck.py` 폴백 ①이 `m2slide.sh` 로 되위임하므로 그 경로를 쓰면 `m2slide.sh → deck.py → m2slide.sh` 무한 재귀가 된다. `md2pptx.py` 직접 호출은 이 재귀가 성립하지 않는다. 만약 `deck.py` 를 쓰기로 바꾸면 `--force-lane a` 가 필수
    - reference 는 [`theme2reference.py`](file:///Users/nowage/.claude/skills/ppt-deck/scripts/theme2reference.py) 가 theme.yml 에서 만든다(Issue316) — lane A 가 색을 물려받는 유일한 경로
* 구현 명세:
    - `m2slide.sh` PPTX 블록 교체 — `python3 ~/.claude/skills/ppt-deck/scripts/md2pptx.py --m2slide "$PROJECT_DIR" --reference "$REF" -o "$PPTX_OUTPUT"` (single/chapter 분기는 `--m2slide` 가 흡수하는지 실측 후 결정)
    - `ppt-deck`·pandoc 미설치 시 **기존 pandoc 직접 경로로 폴백하지 말 것** — 조용한 품질 회귀. 명시적 안내 후 종료
    - 회귀 검증은 Issue319 픽스처로 — `./m2slide.sh igTest --pptx` (전체) + `--pages 1-3` 부분 변환. 통과 조건은 playground 2번 케이스와 동일(3장 · accent 색 반영 · `#layout-*` 누출 0)
    - 옵션 키가 추가되면([`_config.yml`](_config.org.yml) `pptx_reference` 등) [`config-sync-rules`](.claude/rules/config-sync-rules.md) 4곳 동기화 의무

## Issue314: ig 산출 SVG 의 배포 규약 검증 (등록: 2026-08-11, 해결: 2026-08-11, commit: 9a5f7cb, 2dc8453) ✅
* 목적: ig-maker 가 발행한 `img/{ppt명}-{장표번호}.svg` 가 m2slide 의 단일 파일 배포 규약을 깨지 않는지 보장한다.
* depends: Issue312
* 상세:
    - [`file-deployment-rules`](.claude/rules/file-deployment-rules.md): 빌드 산출물은 임의 단일 `.html` + 동일 디렉토리 `img/` 만으로 `file://` 동작해야 함. SVG 내부의 외부 폰트·`@import`·remote href 는 위반
    - ig-maker 발행은 **복사**(symlink 아님)라 `slide/img/` 자동 복사 규약과 충돌 없음 — 실측으로 확인
* 구현 명세:
    - `./m2slide.sh --lint-deployment <project>` rc0
    - SVG 내 외부 참조 검사 항목 추가 검토(현 lint 패턴은 localhost·절대경로 중심)
    - 대표 슬라이드 1장 `file://` 직접 열기 육안 검증

## Issue312: media-creater 에 ig_maker 도구 등록 + design_html orphan 정리 (등록: 2026-08-11, 해결: 2026-08-11, commit: ca62a88, 8fad72b) ✅
* 완료 실측: `ig_maker` 도구로 실제 SVG 1장 산출 → 슬라이드 반영까지 확인. 구 `design_html` 은 handler 부재 orphan 이었음이 확정됐고 참조 3곳(tools.yml 2 · agent md 1) 전부 정리
* 목적: 파이프라인 단계 5(media-creater)가 인포그래픽 요구를 ig-maker 로 라우팅하게 하고, 실체 없는 `design_html` handler 를 정리한다.
* depends: Issue309, Issue311
* 상세:
    - `design_html` 은 `delegate_skill: design-html` 을 가리키나 그 스킬이 **존재하지 않음**(실측). 선택지는 ① 제거 ② ig_maker 로 대체 ③ 실제 스킬 신설 — 설계(Issue309)에서 확정
    - `type: infographic` 라우팅 순서를 재정의: 구조적 텍스트·기존 그래픽 → ig_maker, 단순 관계도 → mermaid, 데이터 그래프 → d3, SmartArt 형 → htmlart
* 구현 명세:
    - `data/media-creater/tools.yml` 수정 — **수정 직전** `./lib/tuner/backup-data-yml.sh data/media-creater/tools.yml` 필수([data-access-rules](.claude/rules/data-access-rules.md))
    - 정책 yml 변경은 **단독 커밋**(코드·산출물 동반 금지). 커밋 메시지에 근거 명시
    - [`.claude/agents/media-creater.md`](.claude/agents/media-creater.md) 의 "design-html 인포그래픽" 절 동기 수정
    - `./m2slide.sh --lint-data` rc0 확인

## Issue311: 슬라이드 캡처 브리지 — md 덱 → ig-maker 입력 (등록: 2026-08-11, 해결: 2026-08-11, commit: 9a5f7cb) ✅
* 목적: ig-maker 입력 계약(이미지 1장)과 m2slide 원본(md)의 간극을 메운다. 대상 슬라이드를 PNG 로 렌더해 ig-maker 에 넘기는 단일 경로를 만든다.
* depends: Issue310
* 상세:
    - 기존 자산 재사용 우선: [`lib/slide_capture/`](lib/slide_capture/) (Puppeteer) · dev-server solo view `/p/<P>/s/<chap>/<slide>` · [`.claude/skills/slide-compare`](.claude/skills/slide-compare) — **새 캡처기를 만들지 않는다**
    - 캡처 출력은 [`capture-output-rules`](.claude/rules/capture-output-rules.md) 를 따라 `_doc_work/capture/` 하위. ig-maker `_org/` 투입은 복사로 처리
    - 슬라이드 번호 ↔ ig-maker `{장표번호}` 매핑 규칙 확정 필요 — m2slide 는 `chap/slide` 2축, ig-maker 는 단일 장표번호
* 구현 명세:
    - `lib/ppt-integration/capture-for-ig.sh` (또는 python) — 입력 `<Project> <chap> <slide>`, 출력 `_doc_work/capture/ig/<Project>-<chap>_<slide>.png` + `_org/` 복사
    - dev-server 미기동 시 자동 `--serve start` (idempotent)
    - 실패는 fail-loud — 캡처 실패를 무시하고 빈 이미지로 진행 금지

## Issue310: 프로젝트별 `.claude/pptx.yml` 경로 규약 도입 (등록: 2026-08-11, 해결: 2026-08-11, commit: fb49bbe) ✅
* 목적: ig-maker 4키(`asset_root`·`ppt_root`·`out_root`·`publish`)를 m2slide 프로젝트 구조에 착지시켜, 어느 덱에서 실행해도 산출물이 그 덱의 `img/` 로 발행되게 한다.
* depends: Issue309
* 상세:
    - ig-maker `igpath.py` 는 `.claude/pptx.yml` 을 **상향 탐색 8단계·가장 가까운 하나만** 채택(병합 안 함). 상대경로 기준은 `.claude/` 의 부모
    - m2slide 는 `Projects/<Name>/` 이 덱 단위이므로 `Projects/<Name>/.claude/pptx.yml` 이 자연스러운 자리 — repo 루트 `.claude/` 와 충돌하지 않는지 실측 필요(루트에 pptx.yml 을 두면 모든 덱이 같은 ppt_root 를 물어 사고)
* 구현 명세:
    - 템플릿 `data/ppt-integration/pptx.yml.template` 신설 (`ppt_root: ppt/{ppt명}` · `publish: img/`)
    - 파일럿 1개 프로젝트에만 실배치(`Projects/m2Slide_chapter_mode/`) — 전 프로젝트 롤아웃은 검증 후 별도
    - `python3 ~/.claude/skills/ig-maker/scripts/igpath.py resolve --start Projects/<Name> --json` 이 의도한 4키를 내는지 실측 로그를 이슈에 첨부
    - `ppt/` 작업 폴더는 중간 산출물(`_source/`·`_org/`)을 담으므로 `.gitignore` 판정 필요 — [`repo-tracking-rules`](.claude/rules/repo-tracking-rules.md) 절차 적용

## Issue309: ig-maker·ppt-maker 통합 설계 SSOT 작성 (등록: 2026-08-11, 해결: 2026-08-11, commit: fea7dbc) ✅
* 목적: 글로벌 SCAR 로 완성된 `ig-maker`(인포그래픽)·`ppt-maker`(덱) 계열을 m2slide 의 **인포그래픽 생성기**·**PPT 생성 옵션** 자리에 붙이기 위한 경계·계약·순환 위험을 하나의 설계 문서로 확정. 후속 이슈 전부가 이 문서를 근거로 움직인다.
* 상세:
    - 사전 분석 결과 3건이 이 문서의 출발점:
        1. **PPTX 경로 결함** — 현재 [`m2slide.sh`](m2slide.sh) `--pptx` 는 `pandoc <md...> -o x.pptx` 직접 호출이라 `--reference-doc` 이 없다. 테마·layout·htmlart 가 전부 소실되고 Calibri 기본 서식으로 나온다. 글로벌 `ppt-deck` lane A(`--adapt` + `--reference`)가 정확히 이 결함을 메우는 도구다
        2. **순환 위험(크리티컬)** — `ppt-deck` 의 폴백 ①은 *"프로젝트에 m2slide 가 있으면 `m2slide.sh` 에 위임"* 이다(`deck.py:66-79`). m2slide 가 무조건 `ppt-deck` 를 부르면 **상호 재귀**가 된다. 반드시 `--force-lane a` 로 ①을 봉인해야 한다
        3. **인포그래픽 handler 공백** — [`data/media-creater/tools.yml`](data/media-creater/tools.yml) 의 `design_html` 은 `handler: design-html` / `delegate_skill: design-html` 을 가리키는데 **그 스킬이 글로벌·로컬 어디에도 없다**(실측 2026-08-11). `type: infographic` 도구 중 실동작하는 것은 `d3_inline` 뿐이고, 나머지 인포그래픽 요구는 htmlart·mermaid 로 흘러간다 — "인포그래픽 품질이 나쁘다"는 사용자 관측의 구조적 원인
    - ig-maker 는 **m2slide host 규약을 이미 문서화하고 있다** — `Projects/{name}/.claude/pptx.yml` 에 `ppt_root`·`publish: img/` 를 적으면 `_source/{장표번호}/7.svg` → `img/{ppt명}-{장표번호}.svg` 로 발행된다. 즉 m2slide 쪽은 **소비 배선만** 만들면 된다(글로벌 SCAR 수정 불필요)
    - 입력 계약 불일치가 유일한 실질 간극: ig-maker 입력은 **이미지 1장 또는 pptx/pdf 페이지**인데 m2slide 원본은 md 다 → 캡처 브리지가 필요(Issue311)
    - **선행 실측 자산 발견 (2026-08-11)** — `~/.claude/playground/` 에 테스트 6종(`0.zero_base`~`5.doc_to_ppt`)이 정의·실행되고 있고, 그중 **1번(m2slide 인포그래픽 업그레이드)·2번(m2slide 원고→덱)** 이 본 통합의 두 목표와 동일하다. 각 케이스의 `run.sh` 가 곧 참조 구현이며 `test_task_define.md` 가 통과 기준·회귀 모드를 정의한다. 설계 SSOT 는 이것을 **재발명하지 말고 인용**한다
    - 그 결과 이미 구현된 것이 3종 확인됨 — `ppt-deck/scripts/md2pptx.py --m2slide <프로젝트> --pages 1-3`(m2slide 전용 진입점, `deck.py` 순환 우회) · `ppt-spec/scripts/theme-from-css.py <m2slide루트> --theme --palette`(theme CSS·palette 실측 → theme.yml, `slide/css/custom.css` 폴백 포함) · `ppt-deck/scripts/theme2reference.py`(theme.yml → reference.pptx). Issue315·316 은 **신규 개발이 아니라 배선**으로 축소됐다
* 구현 명세:
    - `_doc_arch/ig-ppt-integration.md` 신설 — 경계표(무엇을 글로벌이 갖고 무엇을 m2slide 가 갖나) · 순환 방지 규약 · 4키 경로 매핑 · 비용 게이트 소유권 · 산출물 배포 규약
    - 글로벌 SCAR(`~/.claude/skills/ig-*`·`ppt-*`)는 **읽기만** 한다. 수정 필요가 발견되면 `~/.claude/Issue.md` 에 이슈 등록 후 별도 세션(global-scar-change-rules)
    - 기존 문서와의 관계 명시: [`_doc_arch/authoring-pipeline.md`](_doc_arch/authoring-pipeline.md) 단계 5(media-creater) · [`_doc_arch/component-slide.md`](_doc_arch/component-slide.md) · `data/htmlart/`

## Issue308: 호문쿨루스 학습 결과를 policy 로 받는 파일럿 (등록: 2026-08-03, 해결: 2026-08-03, commit: 46966f4) ✅
* 목적: prj3(`~/.claude`) 가 학습(instinct) → policy yml **제안** 컴파일러를 완성했다(Issue334 P4-2). 본 프로젝트는 그 첫 소비처다. *"쓰다 보면 policy 가 생기는"* 파이프라인이 실제로 도는지 note-writer **1개 stage 로 검증**.
* depends: prj3#Issue334
* trigger: prj3#Issue334 P4-2 ✅ 완료 (commit e9c4324) → **충족** — `hooks/policy-compile.py` 실존 확인 후 진행
* 완료 범위:
    - `.claude/policy-map.yml` 신규 — note-writer stage → `data/note-writer/patterns.yml`의 `tone_presets` 컬렉션 매핑. 필드 `id`(copy) · `trigger`(keywords, 사람이 채움) · `confidence`(enum high≥0.8/medium≥0.6/low) · `action`(text, instinct `## Action` 절 추출 → `style`). `sink`는 파일럿 검증용 고정 프로젝트 `Projects/m2Slide_chapter_mode/_pipeline/policy`로 명시 — m2slide가 `Projects/<N>` 다건 저장소라 매핑 하나로 "실 배포 시 어느 프로젝트에 착지시킬지"까지는 못 정한다는 한계를 주석으로 남김(후속 과제)
    - `_doc_arch/pipeline-policy-cascade.md` "병합 알고리즘" 절에 캐비앗 추가 — 리스트 컬렉션에 delta-only 제안을 그대로 L2 적용하면 deep-merge의 "리스트 전치환" 시맨틱 때문에 L1 기존 항목이 전멸함을 실측 근거로 명문화(아래 검증 참조)
* 검증 (2026-08-03):
    - **① 매핑 문법**: `python3 ~/.claude/hooks/policy-compile.py --project . --list` → 매핑 파싱 성공, "instinct 없음"(m2slide 실 instinct 0건, 선행 조건대로) 정상 보고 — rc1(엔진 사양대로 정상 종료 코드)
    - **② 드라이런**(선행 조건이 명시한 "타 프로젝트 instinct로 드라이런" 경로): `--project ~/work/AgenticCoding-lec --map .claude/policy-map.yml`로 workflow 도메인 instinct 1건(`diagram-asset-generation`, confidence 0.85) 컴파일 → `trigger: [] # __NEEDS_HUMAN__`(키워드 미채움 정상) · `confidence: high`(0.85→high 임계 정확) · `style`에 `## Action` 본문 정확 추출. keywords/enum/text 3핸들러 전부 정상 동작
    - **③ L2 착지 스모크테스트**: `__NEEDS_HUMAN__`를 사람이 채운 뒤 `Projects/m2Slide_chapter_mode/_pipeline/policy/note-writer.yml`에 임시 착지 → `./m2slide.sh --lint-data` rc0(스키마 위반 0건). 검증 직후 원복 — 해당 instinct는 m2slide 소유가 아니고 내용도 "노트 톤"이 아닌 "다이어그램 생성 워크플로"라 실 채택 대상이 아님(파이프라인 동작 검증 목적 한정, 실제 채택 여부는 사람이 판단해 기각한 사례로 기록)
    - **발견**: `tone_presets` 같은 리스트 컬렉션은 deep-merge가 "치환"이므로 delta-only L2를 그대로 적용하면 L1 프리셋(`casual_lecture`·`formal_conference`·`workshop_handson`·`default`) 이 전멸 — `pipeline-policy-cascade.md`에 경고 반영. note-writer 뿐 아니라 리스트 형태 primary yml을 쓰는 모든 stage에 해당하는 일반 위험
    - `data-access-rules.md` 격리 위반 없음 — 본 작업은 note-writer stage 범위만 다뤘고 타 stage `data/` 접근 없음
* 범위 밖(후속 과제로 이월): 엔진 수정(prj3 소관) · 다른 stage 확대 · 자동 apply 배선 · m2slide 실 instinct 축적 후 재검증 · sink 프로젝트별 파라미터화(현재 매핑 1개 = 고정 sink 1개 한계)

## Issue305: 이미지 정밀 편집(색만·글자만 교체) 지원 (등록: 2026-07-23, 해결: 2026-07-29, commit: 59405d7, cb52c5b, 958f816, 2c8a653) ✅
* 목적: schnell img2img 로는 부분 정밀 편집 불가(strength 0.3↑ 원본 복제 / 0.1 재해석 드리프트, 2026-07-13 실측). edit 전용 모델 기반 img-add `--edit` 모드를 media-creater 가 소비하여 슬라이드 이미지의 색·글자만 정밀 교체. Issue293 스타일 통일과 별개 기능.
* depends: prj3#Issue277
* trigger: prj3#Issue277 ✅ 완료 (img-add `--edit` 가용) + commit hash 기록 → **충족** (2026-07-29, commit a6f1b8b). 등록 시 차단 사유였던 fg1 모델 부재도 해소 — Kontext 는 `~/apps/flux/hf-cache/hub/models--black-forest-labs--FLUX.1-Kontext-dev` 에 설치됨(구 표기 `~/apps/flux/models/` 는 실경로 아님)
* 완료 범위:
    - `data/media-creater/tools.yml` — `tools.image_edit` 신설(handler img-add edit 모드, fg1 고정, when_to_use·invocation·limits·guard) + `processing_policy.precise_edit`(enabled_when 3조건·edit_type_map·instruction_format·output_naming `_edit` 접미·on_failure keep_original). `image_restyle` 과 배타이며 동시 매칭 시 precise_edit 우선
    - `.claude/agents/media-creater.md` — §3 "이미지 정밀 편집" 절 신설(진입 판정·명세 "편집 지시" 절 양식·img-add 호출 형태·편집 종류별 신뢰도 표), §7 체크포인트에 원본↔편집본 쌍·edit_type·지시문 보고 의무
    - 강등 금지 fail-loud 명문화 — edit 실패 시 img2img·jm4 로 조용히 대체 금지, 원본 유지 후 사유 보고
* 검증 (2026-07-29 fg1 FLUX Kontext 실측 2건):
    - **color ✅** — `Projects/MediaBackendTest/img/ramen-art.png` 그릇 금색→청색 교체. 면·젓가락·배경·나무 테이블·구도 전부 보존 (1024², steps 28, guidance 2.5, ~7분)
    - **text ⚠️ 조건부** — `Projects/AgenticCoding/img/s22_i1.png`(1793×843, 카드 4개) `(File Ops)`→`(File Work)`. 지시 대상 헤딩은 교체됐고 상단 2카드는 보존됐으나 **하단 2카드의 코드·한글이 gibberish 로 재생성**, 닫는 괄호도 유실. 증거: `_doc_work/capture/issue305-text-edit-evidence.png`(gitignore — 로컬 보존)
    - 위 실측을 `limits`·`edit_type_map`·`text_edit_gate`(라틴 문자 한정 · 텍스트 밀도 낮을 것 · 육안 확인 필수)에 박제. `region` 은 미검증으로 표기
    - `--lint-data` 통과 · 정책 yml 단독 커밋 + backup 선행(20260729-153832, 20260729-160352) 준수
## Issue307: 런타임 relax 게이팅 소비 — enforce 스캐너가 덱 purpose 로 룰 완화 (등록: 2026-07-23, 해결: 2026-07-29, commit: 6d22698, 700bcb3) ✅
* 목적: Issue295 가 정의한 축 2 필드(룰 `applies_to_purpose`/`relax_when` + Info.md `purpose`)를 enforce 스캐너(`lib/lint-policy-artifacts.py`)가 런타임 소비 — 대상 덱 `purpose.primary` 를 읽어 `relax_when` 매치 목적의 덱에서 위반 skip(광고·아카이브 덱 통짜 래스터 정당 허용).
* depends: Issue295
* 승격 (2026-07-29, `(!)` 제거): 소비 설계 `_doc_arch/policy-goal-schema.md` "런타임 소비 게이팅" 절 확정 (commit 6d22698).
* 완료 범위 (구현 700bcb3):
    - `deck_purpose(proj)` — `Projects/<Name>/Info.md` frontmatter `purpose.primary`(yaml 블록 파싱, lint-policy-schema `_read_frontmatter` 동일 로직). 미기재/부재/무효 → lecture(안전 기본). `secondary` 무관.
    - `purpose_gates_out(rule, purpose)` — ① `applies_to_purpose` 존재 & purpose ∉ → skip · ② purpose ∈ `relax_when` → skip · ③ 그 외 정상. confidence 강도 판정 **앞단**, 두 축 직교.
    - 배선: 검사1(drop_redundant, machine_readable) + `_run_gated`(검사3~6). 검사2(hygiene)는 purpose-불변(내부표기 노출은 어느 덱이든 결함)이라 의도적 미게이팅. 완화 skip 카운트 로그 보고.
    - 골든 픽스처 `z_test/run-purpose-gate-fixture.sh` + `z_test/fixtures/policy/purpose-gate/` — 동일 위반이 promo 덱(relax_when:[promo]) skip / lecture 덱 검출 대조 고정.
* 검증: 신규 게이팅 픽스처 rc0(4단언) · `run-policy-fixture.sh`·`run-purpose-fixture.sh` 회귀 통과 · 실 repo `--lint-data` 통과(실 룰 relax_when 미보유 → 게이트 무발화, 회귀 0).

## Issue295: 덱 목적(purpose) enum 도입 — 정책 적용 강도의 덱 용도 스코프 (등록: 2026-07-20, 해결: 2026-07-23, commit: 7263d61, 795fde7) ✅
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
* 근거 문서: `_doc_work/htm/hub_htm_20260720_192649_a_goal-taxonomy.htm`, plan `_doc_work/z_done/plan/purpose-enum_plan.md`

## Issue306: Issue304 goal 룰 5건 enforce 스캐너 + 골든 픽스처 (등록: 2026-07-23, 해결: 2026-07-23, commit: d7d514c) ✅
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

## Issue304: Issue296 잔여 — 정책 goal 룰 5건 전환 (등록: 2026-07-23, 해결: 2026-07-23, commit: cc7c3bb, aa02a9b, 67e47aa, fa364e8, c8f5d92) ✅
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

## Issue300: 슬라이드 부제목 표시 정책 결정 (등록: 2026-07-21, 해결: 2026-07-23, commit: d094fda) ✅
* 목적: 상위 프로젝트 videoMaker(prj41) Issue19에서 위임. videoMaker Issue9(2026-04-13, commit 8fddb16)로 frontmatter `subtitle` 렌더링 자체는 구현됐으나, "그대로 노출 / 제거 / 상위 주제 값으로 대체" 중 어느 정책을 취할지 미결정 상태였음.
* 결정: **(c) 현행 유지 확정** — frontmatter `subtitle` 값을 `_cover` layout `{{subtitle}}` slot 에 그대로 노출하는 현행 동작을 정책으로 확정. 코드 변경 없음.
* 근거:
    - subtitle 렌더 지점은 `_cover` layout 1곳뿐 (title-card 는 미표시) — 임시 상태가 아니라 이미 국소화된 명확한 동작.
    - `subtitle:` frontmatter 사용 프로젝트 21개 — (a) 제거·(b) 상위 주제 대체는 21개 데크 표시를 일괄 변경하는 회귀 리스크. (c) 는 회귀 0.
    - 저자가 frontmatter 에 subtitle 을 명시하는 것은 명시적 의도 — 자동 제거·대체보다 저자 입력 존중이 KISS.
* 정책 결정 폼: `_doc_work/htm/hub_htm_20260723_182841_b_subtitle-policy.htm` (사용자 (c) 선택)
* 후속: 상위 videoMaker(prj41) Issue19 에 "정책=현행 유지 확정" 결과 반영 필요 (본 repo 범위 밖).

## Issue303: data/htmlart/types.yml type_count drift 교정 (등록: 2026-07-23, 해결: 2026-07-23, commit: bc3e77d) ✅
* 목적: `data/htmlart/types.yml` `type_count: 26` 선언이 실제 타입 수(코드 `HTMLART_TYPES` Set 27 · yml 타입 키 27 · `_doc_arch` 문서 27종)와 어긋난 SSOT drift. Issue299 감사 중 발견(out-of-scope 로 이관됐던 건).
* 근본 원인: v6 serpentine `bend_process`(Issue218, Bending Process 흡수)가 타입 헤더 주석 열거에서 누락 → 열거 합계가 26 으로 고정. 코드·yml 키·설계문서는 27 로 정상이었음.
* 구현: `type_count: 26`→`27`, 헤더 주석 `26종`→`27종` + `v6 워크플로 1`→`v6 워크플로·serpentine 2`, `bend_process` 열거 행 추가.
* 검증: type_count 27 == yml 키 27 == 코드 Set 27 정합. `./m2slide.sh --lint-data` 통과. backup 선행(`data/htmlart/_backup/20260723-182041-types.yml`).

## Issue301: 챕터 경계에서 ←/→ 화살표 회색 노출 + 클릭 위임 (등록: 2026-07-21, 해결: 2026-07-23, commit: 3d44c4d) ✅
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

## Issue302: agenda markmap 챕터 노드 확장 미작동 — 평면 AGENDA 챕터에 슬라이드 children 부재 (등록: 2026-07-21, 해결: 2026-07-21, commit: e6897c7) ✅
* 목적: 서브챕터(`### [..]`) 없는 평면 챕터 데크는 agenda 목차 markmap 의 각 챕터 노드 `children` 이 빈 배열이라 펼침 원이 그려지지 않아, 노드를 클릭해도 확장이 일어나지 않았다. `parseAgenda` 가 AGENDA.md 의 서브챕터 엔트리에서만 children 을 만드는 구조적 한계.
* 상세:
    - 재현: 평면 5챕터 데크(fWarrangeCliIntro·fSnippetCliIntro·m2slide_info 등) 목차에서 챕터 노드 클릭 시 무반응. `tocData` 각 챕터 `children:[]` 확인.
    - 대조: fPmIntro 는 `### [1.1 ..]` 서브챕터 보유 → 정상 확장. 즉 빌드 회귀 아닌 콘텐츠 구조 한계.
* 구현 명세:
    - 수정: [`lib/generate-slides.js`](lib/generate-slides.js) — `parseAgenda` 직후 보강. children 이 빈 챕터 노드에 한해 이미 생성된 챕터 HTML 의 실제 slide `<section>` 순서를 harvest → 각 슬라이드를 `chapter.html#/N` cross-page 앵커 children 으로 채움.
    - 앵커 정확성: 마크다운 소스 기반 `#/N`(generateTOCFromFile)은 prepend 되는 toc-placeholder Map Slide 를 반영 못 해 off-by-one 발생 → 산출 HTML DOM 순서를 신뢰(ground truth).
    - 회귀 방지: children 이 이미 있는 노드(서브챕터 보유)는 미변경. fPmIntro 서브챕터 노드(1·2·5장) 보존 + 서브챕터 없던 3·4·6장만 슬라이드 보강 확인. lint rc=0(fWarrangeCliIntro·fSnippetCliIntro). 대표 빌드(m2slide_info·chapter_mode·single_mode·fPmIntro) 정상.
    - 적용 범위: chapter mode 전 데크(평면 목차 데크 포함) — 순수 추가라 회귀 없음. 초기 펼침 단계 축소·옵트인 플래그화는 후속 필요 시.

## Issue298: 정책 yml 혼재 커밋 pre-commit 경고 훅 (등록: 2026-07-21) — 해결: 2026-07-21 (commit: 50de0fb) ✅
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

## Issue297: L2 프로젝트 override 병합 결과의 goal_check 정합성 검사 (등록: 2026-07-21) — 해결: 2026-07-21 (commit: 3e350bb) ✅
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

## Issue296: 나머지 정책 yml 9종 goal-oriented 전환 (등록: 2026-07-21) — 해결: 2026-07-21 (commit: 1e03c52, c63df03) ✅
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

## Issue299: _doc_arch ↔ 소스코드 정합성 감사 (등록: 2026-07-21, 해결: 2026-07-21, commit: 없음—gitignore) ✅
* 목적: `_doc_arch/` 영속 설계 문서가 참조하는 파일 경로·스크립트명·함수명·CLI 플래그·동작 서술이 현재 소스코드와 어긋난 곳(stale)을 전수 검토하여 교정.
* plan: `_doc_work/z_done/plan/doc-arch-audit_plan.md`
* task: `_doc_work/z_done/tasks/doc-arch-audit_task.md`
* 결과: 문서 42개 7-subagent fan-out 감사 → **42건 발견, 39건 교정, 3건 false-positive 기각**(htmlArt PANDOC_LAYOUT_RESERVED 실존 확인 slide-parser.js:282). CLEAN 15개.
    - HIGH 2건: dev-server.md `/n/` 네임스페이스 미구현 오기(실제 구현 완료) · theme_layout_lec.md underscore class 서술 stale(실제 `layout-_*`)
    - 주요 교정: nowage 테마 폐기 잔존→default_lec 정정(theme/css/theme_layout_default/video-player) · keynote 자산 `_doc_base/background/` 이동 경로 · Issue257 파이프라인 재번호(stage9=note-writer, info/cost-manager/authoring-pipeline) · 함수·라인번호 drift(brittle 라인번호는 심볼 참조로 대체) · _README 인덱스 32→41 문서 · htmlArt 19종→27종 · 테스트 30→63 · `--lint-palette`/`--lint-config` 실존 확인
    - 재-grep 검증 통과: keynote 경로·opus-4-8·_README 41/41 링크·`_applyDirectiveAttrs` 실존
* 미해결 마커: color-palette.md `--lint-palette` 🚧 [TODO] 2곳 (전용 lint 미구현, 현행 warn+fallback)
* **커밋 없음 사유**: `_doc_arch`·`Issue.md`·`_doc_work` 가 `.gitignore` 대상(L4-6)이라 commit hash 생성 불가. `-f` 강제 추적·gitignore 수정 금지 지침 준수 — hash 없이 종결. (public remote 존재, 내부 설계문서 강제 추가 금지)
* 방법론 원본: prj1#Issue306, fan-out: prj1#Issue307

## Issue265: policy 데이터 yml 목적 지향(goal-oriented) 스키마 + confidence 가중치 도입 — 정책 무력화·오변경 예방 (등록: 2026-07-06, 보류: 2026-07-11, 보류해제: 2026-07-20, 해결: 2026-07-21, commit: 1fc4c24, 70fca45) ✅
* branch따서 작업할 것. 
* status: 완료 — 브랜치 `fix/issue265-policy-goal-schema` (main 병합 미수행, 사용자 검토 대기)
* 범위 확정 (2026-07-20 사용자 결정): 축 1(룰 목적)만. 축 2(덱 목적 purpose enum)는 Issue295 로 분리. `goal_type` enum 7종 전량 채택
* 후행: Issue295 (덱 목적 purpose enum) — **trigger 충족, 착수 가능** / Issue296·297·298 (미해결 항목 이관)
* 목적: `data/<stage>/*.yml` 정책이 (A) 파일명 정규식 하드코딩으로 조용히 무력화되고(`drop_redundant_page_screenshot`가 `pdf-p\d+`만 검출 → AgenticCoding `sNN_i1.png` bleed 8건 미검출), (B) 일괄 커밋(chore bulk)에 섞여 회귀 원인 격리가 불가하며, (C) 학습 사례 1건이 즉시 전역 enforce로 승격되어 과소/과대 일반화 위험을 안는 구조적 약점을 차단.
* plan: `_doc_work/z_done/plan/policy-goal-schema_plan.md`
* task: `_doc_work/z_done/tasks/policy-goal-schema_task.md`
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
* report: `_doc_work/z_done/report/policy-goal-schema_issue265_report.md`
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

## Issue294: m2slide.sh 프로젝트 이름 해석이 Projects_deck 덱을 못 찾음 (등록: 2026-07-20, 해결: 2026-07-20, commit: 49f64fe) ✅
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

## Issue293: 공개 이미지 스타일 통일 (free_image → img2img) + 이미지 백엔드 img-add 전환 (등록: 2026-07-19, 해결: 2026-07-19, commit: c28d94f) ✅
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

## Issue292: 라이선스 표기 자동 삽입 — 첫 장·마지막 장 뱃지 + 대비 규칙 (등록: 2026-07-14, 해결: 2026-07-14, commit: 659f9f1) ✅
* 목적: LICENSE.md 이중 라이선스 정책("모든 산출물의 첫 장·마지막 장에 'Powered by finfra.kr, Made by m2slide' 표기 유지 의무", CC BY 4.0 근거)을 실제 빌드 산출물에 강제 반영.
* plan: `_doc_work/z_done/plan/license-attribution_plan.md`
* task: `_doc_work/z_done/tasks/license-attribution_task.md`
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

## Issue145: Fragment 단계별 등장 + 색 강조 동시 적용 syntax 부재 (등록: 2026-05-10, 보류: 2026-05-10)
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

## Issue42: `slide_ratio` 옵션 완전 제거 (보류: 2026-05-01)
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

## Issue25: 배경 이미지 설정 기능 (보류: 2026-05-01)
* 마크다운 메타데이터(YAML frontmatter)를 통해 전체 슬라이드의 배경 이미지를 지정하는 기능 구현
* `background` 속성으로 이미지 경로 혹은 color 지정 지원
* **보류 사유**: theme/{name}/slide.css 시스템(Issue36/38)으로 동일 목적 달성 가능 (ex: `.reveal { background: url('img/bg.png') center/cover; }`). 비기술 사용자가 마크다운만으로 슬라이드별 배경을 자주 바꾸는 use-case가 누적되면 재검토.

