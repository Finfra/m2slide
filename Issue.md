# Issue Management
* https://github.com/Finfra/m2slide/issues
* Max Issue Num: 17
* 오래된 Issue는 `z_old/old_issue.md`에 저장



# 🌱이슈 후보

# 🔥 진행 중
## Issue 18. PDF 생성 옵션 (--pdf) 추가
* `convert.sh`에 `--pdf` 옵션 추가
* 실행 시 DeckTape 등을 활용하여 생성된 HTML 슬라이드를 PDF로 변환하는 기능 구현 고려
* 또는 브라우저 인쇄 기능을 활용한 PDF 저장 가이드 또는 자동화 스크립트 추가

## Issue 19. 단일 페이지 모드용 종합 샘플 프로젝트(m2Slide 스타일) 추가
* m2Slide 사용법과 기능을 보여주는 종합 예제 프로젝트 생성
* 단일 페이지 모드(Single Page Mode)로 구성
* 포함 내용:
    * 다양한 텍스트 레이아웃
    * 이미지 배치 패턴
    * 각종 그래프 및 Mermaid 다이어그램 예시
    * 코드 블록 및 Syntax Highlighting
    * m2Slide 자체 스타일 가이드 및 기능 설명 포함




# 🏁 완료된 이슈
## Issue 17. 단일 페이지 모드 시 markdown 폴더 없이 루트 md 파일 인식 지원 (2025-12-06 해결)
* `convert.sh` 및 `generate-slides.js` 수정: `markdown` 폴더가 없으면 프로젝트 루트를 입력으로 자동 인식
* 파일 인식 우선순위 로직 구현:
    1. 프로젝트 폴더명과 동일한 `.md` 파일
    2. `README.md`
    3. `.md` 파일이 하나만 있는 경우 해당 파일
    4. 2개 이상일 경우 특수문자로 시작하지 않는 파일 (하나일 때만 선택, 여러 개면 에러)
* `AGENDA.md`가 없는 경우 "Single Page Mode"로 작동하여 `index.html` 생성 스킵

## Issue 16. 단일 페이지 프로젝트(MarkdownGraph) markmap depth 미적용 수정 (2025-12-06 해결)
* `generate-slides.js`에서 `markmapDepth` 결정 로직 개선: `AGENDA.md` 유무(`hasAgenda`)를 확인하여 분기 처리
* 다중 페이지 프로젝트(챕터): `config.chapter_markmap_depth` 우선 적용
* 단일 페이지 프로젝트: `config.markmap_depth` 적용

## Issue 15. 챕터별 페이지 markmap depth 별도 설정 (상대적 깊이 적용) (2025-12-06 해결)
* `config.yml`에 `chapter_markmap_depth` (기본값: 3) 추가
* `generate-slides.js`에서 챕터별 페이지 생성 시 `chapter_markmap_depth`를 우선 적용하도록 수정하여 챕터 상세 페이지에서 더 깊은 레벨(3차)까지 표시되도록 개선

## Issue 14. 챕터별 프로젝트(LlmAndVibeCoding) markmap 미출력 수정 (2025-12-06 해결)
* `generate-slides.js`의 `generateIndexHTML` 함수에서 `initialExpandLevel`이 1로 하드코딩되어 있던 문제 수정
* `config.yml`의 `markmap_depth` 설정을 따르도록 변경하여 `markmap_depth: 2`일 경우 하위 챕터까지 바로 보이도록 개선

## Issue 13. Markmap Depth 설정 및 표시 오류 수정 (2025-12-06 해결)
* `generate-slides.js`에서 `config.yml`의 `markmap_depth` 설정을 제대로 읽지 못하는 문제 수정
* `config.yml`의 `markmap_depth` 기본값을 1에서 2로 변경하여 초기 로드 시 노드가 보이도록 개선


## Issue 12. font_size_auto 미작동 수정 (2025-11-30 해결)
* `font_size_auto`가 H2(소제목)가 있는 슬라이드에서만 작동하던 문제 수정
* H2가 없으면 H1(대제목) 이후의 모든 내용을 `.theContents`로 감싸도록 로직 개선
* `ResizeObserver`를 도입하여 이미지 로딩 등 컨텐츠 크기 변화를 실시간으로 감지하고 폰트 크기를 자동 재조정하도록 개선 (브라우저 네이티브 API 활용)
* `config.yml`에서 `font_size_auto` 설정 지원 (기본값: false)
* `config.yml` 키 이름 변경: `max_font_size` -> `font_size`, `max_font_color` -> `font_color`
* `fit`/`height` 모드에서 `font_size_auto` 최적화 (이미지 컨테이너 높이 자동 조절)
* `config.yml`에서 `font_weight` 설정 지원 (기본값: title 700, sub 500)

## Issue 11. 스타일 상세 설정 (config.yml) (2025-11-30 해결, commit: 84ddacb)
* `config.yml`에 `title`, `sub_title`, `theContents`에 대한 상세 스타일 설정 추가
* 지원 항목: `max_font_size`, `max_font_color`, `align`, `outer_padding`
* `generate-slides.js`에서 해당 설정을 파싱하여 CSS 변수 또는 스타일로 적용

## Issue 10. 개요 페이지 컬럼 수 제한 (2025-11-30 해결, commit: 2982855)
* 반응형 다단 레이아웃(Issue 7) 적용 시, 컬럼 수가 리스트 항목 수를 넘지 않도록 제한
* 예: 리스트 항목이 2개면 최대 2단까지만 표시 (화면이 넓어도 3단이 되지 않게 함)
## Issue 7. 개요1 페이지 반응형 다단 레이아웃 (2025-11-30 해결, commit: a0f7f03)
* 개요1 페이지(Overview)의 리스트를 화면 너비에 따라 반응형으로 다단 처리
* `column-width: 300px` 활용하여 너비가 좁으면 1단, 넓으면 2단 이상으로 자동 조절

## Issue 8. index.html 네비게이션 개선 (2025-11-30 해결, commit: 2d6421a)
* index.html 첫페이지에서 오른쪽 화살표 누르면 다음 페이지로 이동

## Issue 9. 챕터 간 네비게이션 개선 (2025-11-30 해결, commit: 2d6421a)
* 해당 챕터의 마지막 페이지에서 오른쪽 화살표 누르면 마지막 페이지라는 메세지 표시
* 다시 오른쪽 화살표 누르면 다음 챕터 첫페이지로 이동
## Issue 6. 이미지/SVG 크기 옵션 추가 (2025-11-30 해결, commit: f047fbb)
* `config.yml`에 `style > theContents > media_container_enlarge` 옵션 추가
* 4가지 모드 지원:
  1. `original`: 원본 크기 유지 (단, 화면 넘지 않음)
  2. `width`: 너비 최대화
  3. `height`: 높이 최대화
  4. `fit`: 스크롤 없이 화면에 꽉 차게 (비율 유지)
## Issue 4. 리스트(UL) 글자 크기 최적화 (2025-11-29 해결, commit: 08e8483)
* 최대 크기는 제목의 2/3 수준으로 설정
* 내용이 많으면 줄이되, 최소 크기(`config.yml` 지정) 이하로는 줄어들지 않게 함 (스크롤 허용)
* `config.yml`에 최소 글자 크기 설정 추가

## Issue 5. 제목 크기 및 패딩 설정 (2025-11-29 해결, commit: 08e8483)
* 제목 크기를 2배로 확대
* 상단 패딩 추가
* `config.yml`에서 제목 크기 배율과 패딩값 설정 가능하게 함

## Issue 1. H1 페이지 수정 (2025-11-29 해결, commit: 647e8eb)
* 내용 없는 개요 페이지(H1)는 제목을 2배 크게 하고, 하위 장표(H2) 리스트를 자동으로 추가하기

## Issue 2. 개요 1을 오른쪽 위에 작은 글씨로 넣기 (2025-11-29 해결, commit: 647e8eb)
* 현재 내용이 개요1의 슬라이드 일경우 우측 상단에 표시

## Issue 3. 단일 페이지 상위 이동 (2025-11-29 해결, commit: 647e8eb)
* 화살표키 위를 입력하면 상위 페이지로 가게 되어 있는데, 단일 페이지일 경우는 가장 앞페이지로 오기

# 🗑️ 보류된 이슈

