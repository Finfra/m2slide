---
name: pptx-rules
description: "PowerPoint 산출(--pptx·--ppt-make) 배선·lane A/B/G/M·검증 축 — CLAUDE.md 에서 분리한 조건부 상세"
date: 2026.10.01
---

> 📖 **조건부 로드** (Issue429) — `.claude/rules/` 밖이라 세션 시작에 주입되지 않는다. 진입점: [CLAUDE.md](../../CLAUDE.md) «조건부 규칙 — 읽는 시점» 표

# PowerPoint 변환 (옵션)

```bash
# 빌드와 함께
./m2slide.sh [ProjectName] --pptx

# 오케스트레이션 — 앞단·lane A·뒷단·보고를 한 호출로 (Issue332)
./m2slide.sh [ProjectName] --ppt-make
./m2slide.sh [ProjectName] --ppt-make --ig     # + 인포그래픽 선별·비용 게이트

# 단독 실행 (부분 변환 가능)
./lib/pptx/build-pptx.sh Projects/[ProjectName] out.pptx [--pages 1-3]

# lane B(정형 블록 → 네이티브 도형)를 끄고 짓는다 — 회귀를 가를 때만 (Issue331)
./m2slide.sh [ProjectName] --pptx-no-lane-b
```

산출 경로는 `Projects/<Name>/slide/<Name>.pptx` 이며 `index.html` 에 다운로드 버튼이 붙는다.

**pandoc 을 직접 부르지 말 것** (Issue315). `pandoc <md...> -o x.pptx` 는 `--reference-doc` 이 없어 테마·팔레트가 통째로 빠지고 `#layout-*` 지시자가 본문에 누출된다(igTest 실측 5건). [build-pptx.sh](../../lib/pptx/build-pptx.sh) 가 글로벌 ppt-* SCAR 3종을 순서대로 잇는다:

| 단계 | 스크립트 | 하는 일 |
| :-- | :--- | :--- |
| ① | `ppt-spec/theme-from-css.py` | 빌드 산출 CSS 실측 → `theme.yml` |
| ② | `ppt-deck/theme2reference.py` | `theme.yml` → pandoc reference-doc |
| ③ | `ppt-deck/md2pptx.py --m2slide` | 원고 → pptx (single·chapter 자동 판별) |

⚠️ `ppt-deck` 의 `deck.py` 는 쓰지 않는다 — 그쪽 폴백 ①이 `m2slide.sh` 로 되위임하므로 상호 재귀가 된다. `md2pptx.py` 직접 호출만 안전하다.

**검증은 빌드에 내장돼 있고 FAIL 은 빌드를 실패시킨다** (Issue317). `md2pptx.py` 가 산출 직후 `check-conform`(`--lane a`) + `check-xml-order` 를 돌린다. WARN 은 통과, FAIL 은 `exit 1`. 의도적으로 넘기려면 `--pptx-no-verify`.

⚠️ 손으로 재검할 때 **`--lane a` 를 빠뜨리지 말 것**. 기본값 `b`(인포그래픽)는 본문 이미지를 위반으로 보므로, mermaid 렌더 이미지가 정상 콘텐츠인 m2slide 덱을 오판한다 — 같은 pptx 가 `--lane a` rc0 / 미지정 rc1 (실측).

## lane B — 정형 블록을 네이티브 도형으로 (Issue331)

pptx 에는 "카드 그리드" 라는 어휘가 없어 `::: cards` 와 htmlart 가 **평문 불릿으로 눕는다**. 그 자리를 글로벌 [`ppt-info`](file:///Users/nowage/.claude/skills/ppt-info/SKILL.md) 블록 렌더러로 다시 그리는 것이 lane B 다 — **그림이 아니라 도형**이라 문구를 그대로 고칠 수 있다.

| 단계 | 무엇이 | 어디서 |
| :-- | :--- | :--- |
| 표시 | cards·정형 htmlart 를 골라 `_pipeline/pptx/lane-b.json` 에 적는다 | [build-source.py](../../lib/pptx/build-source.py) ⑫ |
| 렌더 | `pptx-info` 펜스 → `info-build.py` → 한 장짜리 pptx | 글로벌 ppt-info (**무수정 호출**) |
| 병합 | 본문 문단을 대조해 걷어내고 그 자리에 도형을 끼운다 | [lane-b.py](../../lib/pptx/lane-b.py) |

**카탈로그 (lane B 로 그리는 것)** — 여기 없는 것은 lane C(`ig-maker`) 대상이고 **비슷한 블록으로 근사하지 않는다**:

| m2slide 블록 | ppt-info 블록 |
| :--- | :--- |
| `::: cards` · `::: htmlart numbered` | `cards` (좌측 액센트 바) |
| `::: htmlart process` | `cards` + `flow_arrow` (네이티브 커넥터 — 도형을 옮겨도 따라온다) |
| `::: htmlart compare` | `compare` |

* **기본 on** 이다. lane C 의 승인 게이트는 **토큰 비용**(장당 33만) 때문에 있는데 lane B 는 초 단위·토큰 0 이다. 끄려면 `--pptx-no-lane-b`
* **lane A 를 깨지 않는다** — 자산 부재·렌더 실패·본문 대조 불일치 어느 쪽이든 그 장을 건너뛰고 평문 불릿을 남긴다. 그래서 `lane-b.py` 는 rc0 으로 끝나는 것이 기본이고 실패는 stderr 로 크게 알린다
* ⚠️ 배선 자리는 **③-b 다음 · ③-c 앞**이다. 앞이면 bold 색 교정이 카드 글자를 덮고, 뒤면 도형 서체가 `retheme` 을 놓쳐 `3.parity.sh` ⑥(테마 밖 폰트 0)이 깨진다
* 회귀 러너: `./z_test/ig-ppt/4.laneb.sh [프로젝트]` (단언 6종 — 도형 존재·그림 0·평문 불릿 제거·lane C 미개입·conform)

## lane G — htmlArt 를 SmartArt 로 (Issue357)

htmlArt 는 애초에 **PowerPoint SmartArt 를 본뜬 어휘**다([smartart-catalog.yml](../../data/htmlart/smartart-catalog.yml), 역방향 [mappings.yml](../../data/ppt2m2slide/mappings.yml) 은 "Basic Process" → `process` 로 읽는다). 그러므로 정방향의 정본 대응은 도형 근사(lane B)가 아니라 **SmartArt 그 자체**다 — PowerPoint 에서 SmartArt 로 편집되고, 역변환이 데이터 모델을 읽어 원고로 되돌린다.

| 단계 | 무엇이 | 어디서 |
| :-- | :--- | :--- |
| 표시 | `smartart.catalog` 에 있는 htmlart 를 `lane: g` 로 적는다 | [build-source.py](../../lib/pptx/build-source.py) ⑫ |
| 렌더 | 파트 5종(data·layout·quickStyle·colors·**drawing 캐시**)을 직접 만들어 심는다 | [smartart.py](../../lib/pptx/smartart.py) · [lane-g.py](../../lib/pptx/lane-g.py) |
| 배선 | ③-b2 **lane B 앞** — 자원이 없으면 사이드카를 `lane: b` 로 되돌려 lane B 가 이어받는다 | [build-pptx.sh](../../lib/pptx/build-pptx.sh) |

* 레이아웃·색·스타일 정의는 PowerPoint 앱 자원(`SmartArt.framework/Resources` `lo/*.glo`·`cs/*.gcs`·`qs/*.gqs`)에서 읽는다 — SmartArt 를 담은 모든 pptx 에 같은 XML 이 그대로 들어간다. 경로는 [transform.yml](../../data/m2slide2ppt/transform.yml) `smartart.resources`
* **캐시는 HTML 실측 기하**로 그린다(`process_geometry` = `renderProcess` 의 viewBox 규칙). 그래서 열자마자 HTML 과 같은 꼴이고, 사용자가 손대는 순간부터 SmartArt 규칙(Basic Process 재배치)을 따른다
* ⚠️ `diagramDrawing` 관계는 **슬라이드 rels** 에 둔다 — `dsp:dataModelExt@relId` 가 슬라이드 rId 다. data 파트에 걸면 LibreOffice 가 빈 그룹으로 들여온다(실측 2026-09-11). LibreOffice 는 캐시만 그리고 자기 레이아웃은 하지 않으므로 캐시 없는 SmartArt 는 LibreOffice 에서 백지다
* 역변환([pptx2source.py](../../lib/pptx/pptx2source.py))은 `dgm:dataModel` 의 parOf 연결로 `* 항목` / `  - 하위` 를 그대로 되찾는다 — 계약 `htmlart_smartart: lossless`
* 지금은 **`htmlart process`(Basic Process) · `htmlart chevron`(Basic Chevron Process)** 둘이다. 나머지(timeline·step·funnel·numbered·compare)는 lane B 그대로다
* **한 종류를 더하는 일은 카탈로그 한 줄이 아니다** — `.glo` 의 layoutNode 이름이 레이아웃마다 통째로 다르므로(process1 은 `node`·`sibTrans`·`connectorText`, chevron1 은 `composite`·`parTx`·`desTx`·`parTxOnly`·`space`) **데이터 모델을 새로 짓고** HTML 렌더러 기하를 복제한 캐시를 함께 만들어야 한다. [smartart.py](../../lib/pptx/smartart.py) `BUILDERS` 에 (모델 빌더, 캐시 빌더) 쌍으로 건다
* ⚠️ **검증할 수 있는 갈래만 넣는다.** chevron1 은 자식 유무로 갈래가 갈리는데(`parTxOnly` vs `composite`+`desTx`) 후자는 캐시와 데이터 모델이 1:1 이 아니게 된다 — 카탈로그의 `needs_flat: true` 가 그런 원고를 lane B 로 되돌린다
* 회귀: `./z_test/ig-ppt/6.roundtrip.sh aTest` 의 `htmlart_smartart` 행 · `4.laneb.sh` ① 이 lane G 장 수를 같이 보고한다

## lane M — 수식을 네이티브 OMML 로 (Issue339)

pandoc 3.10 pptx writer 는 **Math 인라인을 만나면 그 슬라이드의 콘텐츠 shape 을 아예 만들지 않는다.** 경고도 rc 도 없다 — 수식 한 개가 같은 장의 불릿·코드까지 데리고 **조용히** 사라진다. 실측(2026-09-09, aTest p05: 코드블록 + `$$E = mc^2$$` → 제목만 남은 백지):

| 원고 | pandoc 3.10 결과 |
| :--- | :--- |
| 불릿만 · 코드블록만 | 정상 |
| `$$E = mc^2$$` 단독 · `$E=mc^2$` 단독 | **본문 소실** |
| 불릿 + `$$…$$` · 코드블록 + `$$…$$` | **불릿·코드까지 함께 소실** |
| escape 소괄호 형태 | 소실은 면하나 리터럴 `(E=mc^2)` 로 노출 |

고칠 곳은 pandoc 이 아니라 **pandoc 에 무엇을 주는가**다. 그래서 lane M 은 두 걸음이다:

| 단계 | 무엇이 | 어디서 |
| :-- | :--- | :--- |
| 표시 | 수식을 평문 마커(`⟦m2math:NNNN⟧`)로 바꾸고 `_pipeline/pptx/lane-m.json` 에 적는다 | [build-source.py](../../lib/pptx/build-source.py) ⑬ |
| 복원 | 마커 자리에 **네이티브 OMML** 을 심는다 (`pandoc -o docx` 를 수식 변환기로 씀) | [lane-m.py](../../lib/pptx/lane-m.py) |

* 마커가 평문이라 pandoc 이 Math 를 만나지 않는다 → **같은 장의 불릿·코드가 살아남는다**. 이것이 이 lane 의 본체이고 수식 자체의 미려함은 부수 효과다
* **추가 의존 0** — pandoc 의 docx writer 는 같은 LaTeX 를 완전한 OMML 로 낸다. 그것을 `mc:AlternateContent` 로 감싸 pptx 문단에 옮기고, `mc:Fallback` 에 평문 LaTeX 를 남긴다(수식을 모르는 뷰어에서도 글자는 보인다)
* **그림이 아니라 도형** — PowerPoint 수식 편집기로 그대로 고칠 수 있다. lane B 와 같은 철학
* 코드펜스 안의 `$` 는 건드리지 않는다 (`$HOME`·`$(pwd)` 오탐 0 실측)
* ⚠️ 배선 자리는 **③-c(retheme) 다음**이다. OMML 을 먼저 심으면 폰트 교정 순회가 수식 내부를 지나고, 마커는 평문이라 retheme 이 그냥 지나치므로 나중이 안전하다
* 실패해도 빌드를 죽이지 않는다 — 그 수식만 평문 LaTeX 로 남는다
* 회귀 러너: `./z_test/ig-ppt/5.lanem.sh [프로젝트]` (단언 6종)

## 패키지 조립 무결성 (Issue382)

lane B/G/M/S/T 는 pptx 의 XML part·rel 을 **손으로 끼운다.** 그 조립이 온전한지는 `check-conform`(규격)도 `check-empty`(내용)도 `3.parity`(렌더 텍스트)도 보지 못한다 — 셋 다 패키지가 열리고 파싱된 **뒤**를 본다.

```bash
./z_test/ig-ppt/8.assembly.sh                    # 기본 3덱
./z_test/ig-ppt/8.assembly.sh <프로젝트…> [--no-build]
```

* 판정은 글로벌 [`check-assembly.py`](file:///Users/nowage/.claude/skills/ppt-check/scripts/check-assembly.py) 가 하고 러너는 호출·집계·보고만 한다. `lib/pptx/` 에 **복사하지 않는다**
* baseline 불요 5규칙만 켠다(zip 항목 고유 · 지운 슬라이드 rel 잔존 · sldId 안정 · 목록=part · 미디어 확장자 선언). `--baseline` 3규칙은 Issue383 소관이며 **SKIP 건수를 보고**한다
* ⚠️ **차단 지점이 아니다** — 내장 검증은 FAIL 시 빌드를 죽이므로 현재 FAIL 0 인 축을 거기 넣으면 오탐 1건이 배포를 막는다. 회귀 가드로만 둔다
* 선례 — lane G 의 `diagramDrawing` 관계를 data 파트에 걸었을 때 LibreOffice 가 빈 그룹으로 들여왔다(2026-09-11). **어떤 검사도 잡지 못했다**

## 백지 장 검출 (Issue339)

`check-conform` 은 **규격**을 재고, [check-empty.py](../../lib/pptx/check-empty.py) 는 **내용 유무**를 잰다. 제목만 남은 장은 규격상 완전해서 conform 을 통과한다 — 그래서 별도 검사다. 면제는 표지와 챕터 진입 장(`Section Header` layout)뿐이다.

* 컴포넌트 펜스(`chart`·`p5`·`react`·`d3`·`map`·`model3d`)는 pptx 로 옮길 수 없어 제거하는 것이 맞지만, 그 자리를 비워 두면 **제목만 남은 장이 배포된다**(실측 aTest p18·p19). 이제 무엇이 있던 자리인지 한 줄 표식을 남긴다 — 목차 라벨과 같은 **구조 표식**이며 원고의 문장을 짓는 것이 아니다
* **경고이지 차단이 아니다** — 의도적으로 제목만 두는 간지 장이 있을 수 있고, lane C 이월처럼 사람이 뒤에서 채울 자리도 있다. 판정 줄을 크게 남겨 배포 전에 사람이 보게 한다

## `--ppt-make` — ppt-maker 오케스트레이션 (Issue332)

`--pptx` 는 lane A(원고 → 덱) 하나만 돈다. `--ppt-make` 는 그 앞뒤를 잇는다 — 구현은 [ppt-make.sh](../../lib/pptx/ppt-make.sh) 이고 **하는 일은 글로벌 호출과 결과 회수뿐**이다(오케스트레이션 로직을 복제하지 않는다).

| 단계 | 부르는 것 | 비고 |
| :-: | :--- | :--- |
| ① 입력 판정 | — | **lane 은 자동 선택하지 않는다.** m2slide 원본은 언제나 마크다운이라 lane A 고정 |
| ② 앞단 | `ppt-init/init.py` | 덱 폴더·자산 확보(멱등). `Projects/<N>/.claude/pptx.yml` **옵트인 프로젝트만** |
| ③ lane A | `build-pptx.sh` | 위 3종 배선 그대로. **차단 게이트는 여기 하나다** |
| ④ 뒷단 | `ppt-check/check.py` + `check-palette.py` | 검증 5종·팔레트를 **보고**. 차단하지 않는다 |
| ⑤ 인포그래픽 | `ig-selector/igselect.py scan`·`cost` | 선별·비용만. **팬아웃 없음** (`--ig` 옵트인) |

⚠️ **`ppt-maker/make.py` 도 `ppt-deck/deck.py` 도 부르지 않는다.** 되위임 폴백이 사는 지점이 그 둘이고(`make.py` lane A 가 `deck.py` 를 거친다), 부르면 `m2slide.sh → deck.py → m2slide.sh` 무한 재귀다. 그 위에 `m2slide.sh` 가 `M2SLIDE_PPTX_DEPTH` **재진입 가드**를 걸어, 되불림이 루프가 아니라 rc1 즉시 실패가 되게 한다.

⚠️ **뒷단은 차단하지 않는다.** PowerPoint 가 거부하는 위반은 ③ 이 이미 막았고(Issue317), 뒷단이 더하는 `legible` 류는 휴리스틱이라 오탐이 성립한다 — 실측(aTest p24): 문법 소개 덱의 산문 `flowchart TD 위→아래 흐름` 을 *"mermaid 원문 노출"* 로 FAIL 판정. 판정 줄을 읽고 실재 결함인지 사람이 가른다.
