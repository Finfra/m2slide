# Link
* MarkdownGraph : /Users/nowage/_git/__all/videoMaker/lib/m2slide/Projects/MarkdownGraph/slide/MarkdownGraph.html
* LlmAndVibeCoding : /Users/nowage/_git/__all/videoMaker/lib/m2slide/Projects/LlmAndVibeCoding/slide/index.html

# 모드 판정

* `AGENDA.md` 파일이 **있으면** → 챕터 모드, **없으면** → 단일 페이지 모드
* AGENDA.md 위치는 `markdown/` 폴더 안 (있을 때) 또는 프로젝트 루트

# 단일 페이지 모드 (Single Page Mode)

* 한 개의 마크다운 → 한 개의 HTML 슬라이드. 짧은 발표용.
* 사용법
    1. `Projects/{이름}/` 폴더 생성
    2. 그 안에 마크다운 파일 작성 (`---`로 슬라이드 구분)
    3. `./convert.sh Projects/{이름}` 실행
    4. `Projects/{이름}/slide/{이름}.html` 열어서 확인
* 마크다운 파일 선택 우선순위 (여러 .md 파일이 있을 때)
    1. `{프로젝트폴더명}.md` (예: `MarkdownGraph/MarkdownGraph.md`)
    2. `README.md`
    3. .md 파일이 1개뿐이면 그 파일
    4. 정상 문자(영문/숫자/한글)로 시작하는 .md가 1개뿐이면 그 파일
    - 후보가 여러 개면 **에러** → 폴더명과 같은 이름으로 리네임 권장
* 예시: `Projects/MarkdownGraph/MarkdownGraph.md` → `slide/MarkdownGraph.html`

# 챕터 모드 (Chapter Mode)

* 여러 마크다운 → 챕터별 HTML + 마인드맵 목차. 긴 강연·전자책용.
* 사용법
    1. `Projects/{이름}/markdown/` 폴더 생성
    2. 그 안에 챕터 파일들 작성
        - 메인 챕터: `01-opening.md`, `02-evolution.md`
        - 하위 챕터: `02.1-chat.md`, `02.2-ide.md`
    3. `markdown/AGENDA.md`에 목차 작성 (이 파일이 챕터 모드 활성화 신호):
        ```markdown
        ## [1. 오프닝](./01-opening.md)
        ## [2. 진화](./02-evolution.md)
        ### [2.1 채팅](./02.1-chat.md)
        ```
    4. `./convert.sh Projects/{이름}` 실행
    5. `Projects/{이름}/slide/index.html` (마인드맵 목차) 열기
* 예시: `Projects/LlmAndVibeCoding/`

# 출력 옵션

기본은 HTML만. 추가 형식이 필요하면 옵션 추가:

| 옵션      | 결과                            |
| :-------- | :------------------------------ |
| (없음)    | HTML 슬라이드만                 |
| `--epub`  | EPUB 전자책 추가 생성           |
| `--pdf`   | PDF 추가 생성 (decktape 필요)   |
| `--pptx`  | PowerPoint 추가 생성 (pandoc 필요) |

ex) `./convert.sh Projects/MyDeck --epub --pdf`

# 슬라이드 키보드 조작

* `←` `→` : 이전/다음 슬라이드
* `↑` :
    - 챕터 모드: 상위 페이지로 이동
    - 단일 페이지 모드: 첫 슬라이드로 이동
* 마지막 슬라이드에서 `→` 두 번 : 다음 챕터 (챕터 모드만)
* `ESC` : 전체 슬라이드 개요
* `S` : 발표자 노트

# Snippet
## convert.sh
/Users/nowage/_git/__all/videoMaker/lib/m2slide/convert.sh 