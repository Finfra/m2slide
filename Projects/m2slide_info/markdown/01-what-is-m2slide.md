---
title: m2slide란?
type: ppt
---

# 01. m2slide란?

#layout-chapter

::: part
Chapter 1.
:::

## 정체성 한 줄 정의

---

## m2slide 한 줄 정의

* **마크다운(.md)으로 작성 → 한 줄 빌드 → Reveal.js HTML 슬라이드** 변환 도구
* 같은 소스 한 벌로 **발표용 HTML + 읽기용 EPUB**까지 함께 나옴
* HTML·CSS·JS를 직접 만지지 않고 슬라이드를 저작함

```mermaid
graph LR
  A["Markdown 소스 (.md)"] --> B["./m2slide.sh 빌드"]
  B --> C[Reveal.js HTML 슬라이드]
  B --> D[EPUB 전자책]
```

---

## 어떤 문제의식에서 출발했나

* 발표 자료는 자주 고쳐 쓰는데, **PPT는 고칠 때마다 손이 많이 감**
* 순수 Reveal.js는 텍스트 기반이라 좋지만, **HTML을 직접 편집해야 함**
* 둘 사이의 빈틈 — "마크다운처럼 쉽게 쓰면서, Reveal.js처럼 웹 네이티브인 도구"가 필요했음

::: cards
* **저작은 마크다운**
  - 글쓰기에만 집중
* **외관은 설정 1줄**
  - `_config.yml`의 theme·layout
* **산출물은 다중 포맷**
  - HTML·EPUB·PDF·PPTX
:::

---

## 이 자료가 다루는 세 가지 질문

* **왜** m2slide 같은 도구가 필요한가 {.fragment}
* **어디에** 쓰면 특히 좋은가 {.fragment}
* m2slide만의 **강점**은 무엇인가 {.fragment}

* 마크다운 문법·설정 키 하나하나는 다루지 않음 — README·저장소 문서 참고

---

## 실제로 이렇게 씁니다

* 설치도 사용도 몇 줄이면 끝남 — 이게 저작 부담을 줄이는 실질적인 이유

```bash
# 1) 저장소 클론
git clone https://github.com/Finfra/m2slide.git

# 2) 프로젝트 폴더의 마크다운을 한 줄로 빌드
./m2slide.sh MyProject
```

* 빌드 결과는 바로 브라우저에서 열리는 HTML 슬라이드 — 서버·배포 설정 없이 `file://`로 확인 가능

---

## 직접 확인할 수 있음

* 아래 두 링크에서 실제로 돌아가는 m2slide를 바로 볼 수 있음

::: cards
* **GitHub**
  - [github.com/Finfra/m2slide](https://github.com/Finfra/m2slide) — 소스 전체 공개
* **온라인 데모**
  - [finfra.github.io/m2slide](https://finfra.github.io/m2slide) — 실제 프로젝트 슬라이드를 브라우저에서 그대로 열람
:::
