# 05. Markdown·Mermaid

## Markdown이란?



* 텍스트 기반의 마크업언어로 2004년 존그루버에 의해 만들어졌으며 쉽게 쓰고 읽을 수 있으며 HTML로 변환이 가능
* 특수기호와 문자를 이용한 매 _우 간단한 구조의 문법_ 을 사용하여 웹에서도 보다 빠르게 컨텐츠를 작성하고 보다  _직관적으로 인식_
* 깃헙의 저장소Repository에 관한 정보를 기록하는 README. _md _ 파일이 Markdown으로 작성됨
  * 설치방법, 소스코드 설명, 이슈 등을 간단하게 기록하고 가독성을 높일 수 있다는 강점이 부각되면서 널리 사용됨
* HTML : Hyper Text Markup Language  vs Markdown
  * html)  _<html><h1>hi</h1></html>   _
  * Markdown)  _# hi_


* 참고: [마크다운 작성법 (ihoneymon)](https://gist.github.com/ihoneymon/652be052a0727ad59601)

---

## Markdown의 장-단점

* 장점
  * 간결하다
  * 별도의 도구 없이 작성 가능
  * 다양한 형태로 변환 가능
  * 텍스트(Text)로 저장 — 용량이 적어 보관이 용이
  * 버전관리시스템(Git)으로 변경이력 관리 가능
  * 지원하는 프로그램과 플랫폼이 다양하다
* 단점
  * 표준이 없다
  * 도구에 따라 변환 방식이나 생성물이 다르다
  * 모든 HTML 마크업을 대신하지 못한다

---

## Markdown Example

::: columns
::: {.column width="55%"}
```markdown
# 개요1
## 개요2
<http://chenluois.com>
[Mou](https://twitter.com/mou)
[a relative link](other_file.md)
[^1]: And that's the footnote.
![logo](http://finfra.com/f/f.png)

| id | name |
|----|------|
| 1  | aaa  |
| 2  | bbb  |
| 3  | cccc |
```
:::
::: {.column width="45%"}
![Markdown Example 렌더 결과](img/GenContetntsProd_v10_17.png)
:::
:::

---

## Markdown 문법 - 강조

![Markdown 문법 - 강조](img/GenContetntsProd_v10_18.png)

---

## Markdown 문법 - 코드,HTML 블록

::: columns
::: {.column width="52%"}
* 코드 블록 (언어명은 생략 가능)

```python
for i in range(10):
    print(i)
```
:::
::: {.column width="48%"}
* HTML 블록
  * Markdown에서 표현 안되는 것 표현할 때 사용

![HTML 블록 예시](img/GenContetntsProd_v10_20.png)
:::
:::

---

## Markdown 문법 - html삽입

::: columns
::: {.column width="50%"}
```markdown
| id | name |
|----|------|
| 1  | aaa  |
| 2  | bbb  |
| 3  | cccc |
```
:::
::: {.column width="50%"}
![렌더 결과](img/GenContetntsProd_v10_21.png)
:::
:::

---

#layout-contents-full
## Mermaid 개요

![Mermaid 개요](img/GenContetntsProd_v10_22a.png)

---

#layout-contents-full
## Mermaid vs Excalidraw 비교

![Mermaid vs Excalidraw 비교](img/GenContetntsProd_v10_22b.png)

---

## Mermaid 핵심 특징

* Mermaid: 텍스트 DSL로 다이어그램 작성 — flowchart·sequence·class·gantt 등 10여 종 지원
* 작성 위치: Markdown 코드블록 안 — `mermaid` 펜스 블록
* 렌더링: VSCode + Mermaid Preview 확장 / GitHub / Notion / Obsidian 등 다수 환경 지원
* 장점: 텍스트 기반 → Git 관리 / AI 생성 친화 / 수정 용이
* 비교: Excalidraw(자유 손그림) vs Mermaid(정형·코드 기반)

---

## Mermaid Live Editor

* 온라인 편집기: [mermaid.ai/live](https://mermaid.ai/live/)

::right::

![Mermaid Live Editor](img/GenContetntsProd_v10_23.png)

![Mermaid Live Editor](img/GenContetntsProd_v10_24.png)

---

## Mermaid Samples <!-- nosplit -->

![Mermaid Samples](img/GenContetntsProd_v10_25.png)

* 예시 모음: [finfra.github.io/m2slide/MermaidExample](https://finfra.github.io/m2slide/MermaidExample)

---

## 🙋 Mermaid 실습 — 프롬프트로 코드 생성



* 작업: “신청서 처리 절차”를 Mermaid flowchart로 생성
* 절차:
  * Step 1: ChatGPT 또는 Claude에 프롬프트
    * “신청서 처리 절차를 Mermaid flowchart 코드로 작성해줘. 단계: 접수→검토→승인 or 반려→통보”
  * Step 2: 출력된 mermaid 코드 복사
  * Step 3: VSCode에서 process.md 파일 생성 → `mermaid` 펜스 블록 안에 붙여넣기
  * Step 4: Cmd/Ctrl+Shift+V 미리보기로 렌더링 확인 (Kroki extension 추천)
  * Step 5: 텍스트 수정 → 미리보기 실시간 갱신 확인
* 시간: 7분


