# 5. 레이아웃 예제 (DIV 활용)

---

## 2분할 레이아웃 - 1단계
* 왼쪽 텍스트 영역
  -HTML DIV 태그를 사용하여
  -원하는 레이아웃을 직접 구성할 수 있습니다.
  -flexbox 스타일을 활용하세요.

![Chart](./img/chart.png)

---

## 2분할 레이아웃 - 1단계 [좌이미지]

![Chart](./img/chart.png)

* 왼쪽 텍스트 영역
  -HTML DIV 태그를 사용하여
  -원하는 레이아웃을 직접 구성할 수 있습니다.
  -flexbox 스타일을 활용하세요.

---

## 2분할 레이아웃 - 2단계
* 왼쪽 텍스트 영역
  -HTML DIV 태그를 사용하여
  -원하는 레이아웃을 직접 구성할 수 있습니다.
  -flexbox 스타일을 활용하세요.
::right::
![Chart](./img/chart.png)

---

## 2분할 레이아웃 (좌: 텍스트 / 우: 이미지) - Pandoc 펜스 div

::: columns
:::: {.column width="48%"}
* 왼쪽 텍스트 영역
  - HTML DIV 태그를 사용하여
  - 원하는 레이아웃을 직접 구성할 수 있습니다.
  - flexbox 스타일을 활용하세요.
::::
:::: {.column width="48%"}
![Chart](./img/chart.png)
::::
:::

---

## 3분할 레이아웃 (카드 형태) - Pandoc 펜스 div

::: columns
:::: {.column .card}
![Chart](./img/chart.png)
::::
:::: {.column .card}
* 왼쪽 텍스트 영역
  - HTML DIV 태그를 사용하여
  - 원하는 레이아웃을 직접 구성할 수 있습니다.
  - flexbox 스타일을 활용하세요.
::::
:::: {.column .card}
![Chart](./img/scenery.png)
::::
:::

---

## 2분할 레이아웃 (좌: 텍스트 / 우: 이미지) - dev

<div style="display: flex; align-items: center; justify-content: space-between;">
  <div style="width: 48%;">
    <h3>왼쪽 텍스트 영역</h3>
    <ul>
      <li>HTML DIV 태그를 사용하여</li>
      <li>원하는 레이아웃을 직접 구성할 수 있습니다.</li>
      <li>flexbox 스타일을 활용하세요.</li>
    </ul>
  </div>
  <div style="width: 48%;">
    <img src="./img/chart.png" alt="Chart" style="width: 100%; border-radius: 10px;">
  </div>
</div>

---

## 3분할 레이아웃 (카드 형태) - div

<div style="display: flex; justify-content: space-around;">
  <div style="width: 30%; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px;">
    <h4>Card 1</h4>
    <p>첫 번째 카드의 내용입니다.</p>
  </div>
  <div style="width: 30%; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px;">
    <h4>Card 2</h4>
    <p>두 번째 카드의 내용입니다.</p>
  </div>
  <div style="width: 30%; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px;">
    <h4>Card 3</h4>
    <p>세 번째 카드의 내용입니다.</p>
  </div>
</div>
