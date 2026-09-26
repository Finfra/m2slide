---
title: m2slide TDD 재생목록
description: prj42 m2slide 의 TDD 목표를 재생 순서로 나열한 목록 (prj6#Issue16)
date: 2026.09.26
---

# 무엇을 지키나

원고 md 한 벌에서 HTML·PDF·pptx 덱을 뽑을 때 내용 손실·조판 흔들림·조용한 성공 보고가 다시 생기지 않게 막는다

* 기존 러너: `cd ~/_git/__all/videoMaker/lib/m2slide && node --test 'lib/__tests__/*.test.js' ; bash z_test/pdf/{1.integrity,2.tripath,3.nondeterminism}.sh ; bash z_test/ig-ppt/{0..8}.*.sh ; bash z_test/run-policy-fixture.sh ; bash z_test/ego-mobile/run.sh aTest aTest-all`
* 목표 10개 중 테스트로 덮인 것 9개 · 신규 1개
* ⚠️ Node 24 의 `node --test` 는 디렉토리 인자를 받지 않는다(`Cannot find module …/__tests__`) — glob 으로 넘긴다

# 재생목록

위에서 아래로 돈다 — 빠르고 기초적인 것이 먼저, 통합·E2E 가 뒤다. 앞 항목이 깨지면 뒤 항목의 실패는 원인이 아니라 결과일 수 있다.

| #   | id                               | 목표                                                                                                                                                                    | 근거                                                                                                         | 실행                                                                                                      | 상태    |
| :-- | :------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- | :------ |
| 1   | `markdown-inline-attr-parse`     | Pandoc 인라인 속성 {.foo .bar} 가 클래스로 추출되고 마크다운→HTML 변환 결과가 기대와 같다                                                                               | lib/__tests__/markdown.test.js (Issue118 주석) 외 unit 10종(agenda·config·layout-meta-parser·pipeline-v2 등) | `node --test 'lib/__tests__/*.test.js'`                                                                   | ✅ 기존 |
| 2   | `policy-fixture-by-attribute`    | drop_redundant_page_screenshot 룰이 파일명이 아니라 속성으로 판정해 힌트에 없는 이름(Deck_v10_12.png)도 잡는다                                                          | z_test/run-policy-fixture.sh (Issue265 Phase 5), z_test/fixtures/policy                                      | `bash z_test/run-policy-fixture.sh`                                                                       | ✅ 기존 |
| 3   | `pdf-combine-page-count`         | --pdf 합본 페이지 수가 decktape Printed 합계와 같고, 다르면 합본을 쓰지 않고 rc 2 로 죽는다                                                                             | Issue398 PDF 합본이 306p 를 조용히 잃고 성공 보고 — lib/combine-pdfs.py                                      | `bash z_test/pdf/1.integrity.sh`                                                                          | ✅ 기존 |
| 4   | `pdf-slide-ratio-respected`      | slide_ratio 4:3 프로젝트의 PDF 전 페이지가 4:3(1440x1080) 비율이다                                                                                                      | Issue396 --pdf 가 slide_ratio 무시; z_test/pdf/1.integrity.sh(페이지 수·비율·폰트 격리·백지 장)              | `bash z_test/pdf/1.integrity.sh`                                                                          | ✅ 기존 |
| 5   | `pdf-layout-latch-after-measure` | PDF 2열 판정이 레이아웃 측정 키가 확정된 뒤에만 내려진다(CPU 감속 시 latchedWithoutMeasure=0)                                                                           | Issue407 --pdf 본문이 실행마다 다르게 조판; Issue413 러너 3종 중 3.nondeterminism --mechanism 역검증         | `bash z_test/pdf/3.nondeterminism.sh --mechanism`                                                         | ✅ 기존 |
| 6   | `chapter-pdf-keeps-cover-agenda` | chapter mode --pdf 산출물에 덱 표지와 전체 목차가 포함된다                                                                                                              | Issue402 chapter mode --pdf 가 index.html·agenda.html 을 continue 로 건너뜀(m2slide.sh)                      | —                                                                                                         | ⬜ 신규 |
| 7   | `pptx-keeps-entry-chapter-body`  | 자식 헤딩과 본문을 가진 진입 장(## N-M.)의 제목·본문·mermaid 가 pptx 에도 남아 HTML 과 내용이 같다                                                                      | Issue401 --pptx 가 본문 있는 진입 장을 통째로 버림; Issue403 ### H3 제목 덱 pptx 제목 소실                   | `bash z_test/ig-ppt/3.parity.sh`                                                                          | ✅ 기존 |
| 8   | `pptx-roundtrip-fidelity`        | m2slide→pptx→m2slide 왕복에서 fidelity.yml 에 선언되지 않은 차이가 0건이다                                                                                              | z_test/ig-ppt/6.roundtrip.sh (Issue342), data/m2slide2ppt/fidelity.yml; Issue389 왕복 2축                    | `bash z_test/ig-ppt/6.roundtrip.sh`                                                                       | ✅ 기존 |
| 9   | `ego-mobile-tap-nav`             | 모바일(아이폰) 에뮬레이션에서 탭만으로 덱이 넘어가고 스크롤 뷰 세로 스와이프는 키로 바뀌지 않는다(M1~M6·L1 PASS)                                                        | Issue415(🚧) 아이폰 탭 동작 점검 — z_test/ego-mobile/run.sh, M6 세로 스와이프 수정                           | `bash z_test/ego-mobile/run.sh aTest aTest-all`                                                           | ✅ 기존 |
| 10  | `projects-md-registry`           | Projects.md `경로` 열이 외부 마운트의 유일한 기록이다 — sync 가 심링크를 표대로 복원·흡수하고 실디렉토리는 건드리지 않으며, `/p/` 는 표에 없는 폴더를 미등재로 드러낸다 | Issue416 /p/ 목록 출처가 폴더·심링크·Projects.md 로 갈려 외부 여부·경로가 표에 없음                          | `node --test lib/__tests__/sync-projects-md.test.js && python3 -m unittest lib/dev-server/test_server.py` | ✅ 신규 |

# 규약

* **목표는 «검증 가능한 성질»** 이다 — *"잘 동작한다"* 는 목표가 아니다
* 새 버그를 고치면 **재현 테스트를 먼저** 여기 한 줄로 올리고(⬜), 테스트가 생기면 실행 열을 채워 ✅ 로 바꾼다
* 실패를 삼키는 패턴(`2>/dev/null || true` 등)을 테스트 안에 쓰지 않는다 — 실패는 실패로 드러나야 한다
* 판정 출처: prj6 `_doc_work/report/tdd-coverage_report.md` (이 프로젝트가 왜 TDD 대상인가)
