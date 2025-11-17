# Markmap 시각화

마크다운 문서를 [Markmap](https://markmap.js.org)을 사용하여 마인드맵으로 시각화한 자료입니다.

## 📂 파일 구조

```
markmap/
├── index.html              # 메인 목차 페이지
├── 01-opening.html         # 1. AI 코딩의 패러다임 전환
├── 02-llm-tool-evolution.html  # 2. LLM 코딩 툴의 진화 과정
├── 03-vibecoding-concept.html  # 3. 바이브 코딩 개념과 철학
├── 04-vibecoding-generations.html  # 4. 바이브 코딩 세대 구분
├── 05-generation-comparison.html   # 5. 세대별 비교 및 선택 가이드
├── 06-practical-cases.html     # 6. 실전 사례: 세대별 활용법
├── 07-adoption-roadmap.html    # 7. 바이브 코딩 도입 로드맵
├── 08-qa-closing.html          # 8. 자주 묻는 질문 (Q&A)
├── generate.py              # markmap 생성 스크립트
└── README.md               # 이 파일
```

## 🚀 사용 방법

### 1. 브라우저에서 보기

메인 목차 페이지를 브라우저에서 엽니다:

```bash
open markmap/index.html
```

또는 파일 탐색기에서 `index.html`을 더블 클릭합니다.

### 2. 마인드맵 조작

- **확대/축소**: 마우스 휠 또는 핀치 제스처
- **이동**: 드래그
- **노드 펼치기/접기**: 노드 클릭
- **전체 화면**: 브라우저의 전체 화면 모드 사용 (F11)

## 🔄 재생성 방법

md 폴더의 내용이 변경되었을 때 markmap을 다시 생성하려면:

```bash
python3 markmap/generate.py
```

## 🛠 기술 스택

- **[Markmap](https://markmap.js.org)**: 마크다운을 마인드맵으로 변환
- **markmap-autoloader**: 자동 마인드맵 렌더링
- **D3.js**: 시각화 라이브러리 (markmap 내부에서 사용)

## 📝 특징

- **인터랙티브**: 클릭하여 노드를 펼치고 접을 수 있음
- **반응형**: 브라우저 크기에 맞춰 자동 조정
- **깔끔한 디자인**: 헤더와 함께 보기 좋은 레이아웃
- **쉬운 탐색**: 목차 페이지에서 원하는 챕터로 이동

## 🎨 커스터마이징

markmap 스타일을 변경하려면 각 HTML 파일의 `<style>` 섹션을 수정하세요.

## 📌 참고사항

- 모든 HTML 파일은 CDN을 통해 markmap 라이브러리를 로드하므로 **인터넷 연결이 필요**합니다.
- 오프라인 사용을 원하면 markmap 라이브러리를 로컬에 다운로드하고 HTML을 수정해야 합니다.

## 🔗 관련 링크

- [Markmap 공식 사이트](https://markmap.js.org)
- [Markmap GitHub](https://github.com/markmap/markmap)
- [Markmap 문서](https://markmap.js.org/docs)
