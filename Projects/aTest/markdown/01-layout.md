# 1. 레이아웃 테스트

분할·자동 감지·동영상 케이스 모음. (구 LayoutTest)

---

# 분할 레이아웃

---

## 휴리스틱 자동 2분할 (리스트 + 이미지)

* 마크다운 변경 없음
* 리스트와 이미지가 함께 있으면
* 자동으로 좌/우 2분할로 배치됨

![Chart](./img/chart.png)

---

## Slidev 슬롯 `::right::` 명시 단축

* 좌측 텍스트 영역
* 슬롯 위쪽 라인이 좌측 컬럼으로
* 슬롯 아래쪽 라인이 우측 컬럼으로 분리됨

::right::

![Scenery](./img/scenery.png)

추가 우측 텍스트도 가능합니다.

---

## Pandoc `::: columns` 두 컬럼

::: columns
:::: {.column width="48%"}
* 좌측: width 48%
* Pandoc 표준 펜스
* `:::: {.column width="48%"}` 표기
::::
:::: {.column width="48%"}
![Chart](./img/chart.png)
::::
:::

---

## 3분할 카드

::: columns
:::: {.column .card}
**카드 1**

* 첫번째 카드
* 좌측 정렬
::::
:::: {.column .card}
**카드 2**

* 가운데 카드
* 균등 분배
::::
:::: {.column .card}
**카드 3**

* 우측 카드
* `.card` 스타일 적용
::::
:::

---

## 상/하 분할

::: rows
:::: {.row height="40%"}
**상단 영역 (40%)**

* 헤더 정보
* 요약 통계
::::
:::: {.row height="60%"}
**하단 영역 (60%)**

![Scenery](./img/scenery.png)
::::
:::

---

## 2x2 그리드 (columns 안에 rows 중첩)

::: columns
:::: {.column}
::::: rows
::::::: {.row .card}
**좌상단**
- A1 항목
- A2 항목
:::::::
::::::: {.row .card}
**좌하단**
- B1 항목
- B2 항목
:::::::
:::::
::::
:::: {.column}
::::: rows
::::::: {.row .card}
**우상단**
- C1 항목
- C2 항목
:::::::
::::::: {.row .card}
**우하단**
- D1 항목
- D2 항목
:::::::
:::::
::::
:::

---

## `<!-- nosplit -->` 휴리스틱 비활성

<!-- nosplit -->

* 이 슬라이드는 리스트와 이미지가 함께 있지만
* `<!-- nosplit -->` 주석으로 자동 분할이 꺼짐
* 이미지가 리스트 아래에 그대로 표시되어야 함

![Chart](./img/chart.png)

---

# 자동 레이아웃 감지 (No-Title)

---

## 단독 이미지 풀스크린 (`_blank` 자동)

* 다음 슬라이드는 제목·본문 없이 이미지 한 개만 있음
* 자동으로 `_blank` layout + `--full-image` modifier 적용
* 이미지가 화면에 꽉 차게 표시됨 (aspect ratio 유지)

---

![Scenery full-screen](./img/scenery.png)

---

## 빈 제목 슬라이드 (`_contents_no_title`, 헤더 단독)

* 다음 슬라이드는 `## ` 빈 헤더만 두고 본문 콘텐츠를 넣은 케이스
* `_contents_no_title` layout이 자동 적용되어 title 영역이 사라짐
* 본문(텍스트+이미지+리스트)은 정상 렌더링됨

---

## 

이 슬라이드는 `## ` 단독 헤더로 시작하지만, **빈 제목 자동 감지** 로직이 작동하여
`_contents_no_title` layout이 적용됩니다.

* 제목 영역 미표시
* 본문 콘텐츠는 그대로 렌더링
* 헤더 마크업 자체는 출력에서 strip 됨

![Chart](./img/chart.png)

---

## 빈 제목 슬라이드 (`_contents_no_title`, 헤더 부재)

* 다음 슬라이드는 헤더 자체가 없는 케이스
* 본문이 텍스트·리스트·이미지 혼합으로 다양함 (image-only 아님)
* `_contents_no_title` layout이 자동 적용됨

---

이 슬라이드는 제목 헤더가 **아예 없으며**, 본문이 텍스트와 이미지가 섞여 있습니다.

* image-only가 아니므로 `_blank` 적용 대상 아님
* 빈 제목 감지로 `_contents_no_title` layout 자동 매칭
* 본문 영역만 렌더링됨

![Chart](./img/chart.png)

---

# 동영상

---

## 동영상 단독 슬라이드

![Movie sample](./video/Movie-1.mp4)


---

![Movie sample](./video/Movie-1.mp4)

---

## 동영상 + 텍스트 휴리스틱 2분할

* 마크다운 이미지 문법으로 mp4 임베드
* 확장자가 비디오면 `<video controls>`로 자동 변환
* 이미지처럼 휴리스틱 2분할 동작

![Movie sample](./video/Movie-1.mp4)

---

## 비디오 — 기본 플레이어 (HTML 임베드)

```html
<video width="640" height="360" controls>
  <source src="./video/Movie-1.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>
```
