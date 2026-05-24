# 3. 애니메이션 호환성 테스트

reveal.js 애니메이션 옵션의 m2slide 호환성 검증. (구 animationTest)

---

## 0. 검증 목적

* reveal.js 5.0.4 애니메이션 syntax들이 m2slide 파이프라인을 통과하는지 확인
* **방법**: 각 syntax를 실제 슬라이드에 작성 → 빌드 → 결과 HTML grep
* **3가지 syntax 패턴 시도**:
    1. reveal.js 표준 markdown 주석 (`<!-- .slide: ... -->`, `<!-- .element: ... -->`)
    2. 인라인 raw HTML 속성 (`<div data-fragment-index>`)
    3. m2slide 메타 라인 (`#layout-*` 같은 향후 확장 후보 — 미구현)

---

## 1. Transition: 표준 주석 syntax

<!-- .slide: data-transition="zoom" -->

* 이 슬라이드 진입 시 **zoom** 트랜지션을 기대
* m2slide 파서가 `<!-- .slide: ... -->` 주석을 보존하지 못하면 무시됨
* 결과 HTML의 `<section>` 태그에 `data-transition="zoom"` 속성 존재 여부 확인

---

## 2. Transition: 인라인 raw HTML
```html
<section data-transition="convex">

이 슬라이드는 raw `<section>` 태그를 본문에 직접 작성한 케이스. 파서가 자체 `<section>`으로 한 번 더 감싸면 nested section이 됨.

</section>
```

---

## 3. Fragment: 표준 주석 syntax

* 첫 번째 항목 (즉시 표시)
* 두 번째 항목 <!-- .element: class="fragment fade-up" -->
* 세 번째 항목 <!-- .element: class="fragment highlight-blue" -->
* 네 번째 항목 <!-- .element: class="fragment grow" -->

→ → 키 누를 때마다 단계별로 등장하는지 확인

---

## 4. Fragment: 인라인 클래스 (markdown 확장)

* 첫 번째 항목
* 두 번째 항목 {.fragment}
* 세 번째 항목 {.fragment .highlight-red}

Pandoc-style attribute syntax — m2slide 파서가 이를 인식하는지

---

## 5. Auto-Animate (1/2)
#auto-animate

# Hello

---

## 5. Auto-Animate (2/2)
#auto-animate

# Hello, World!

→ 두 슬라이드 사이 글자가 부드럽게 모핑되는지 확인

---

## 6. Background Color

<!-- .slide: data-background-color="#1a1a2e" -->

* 슬라이드 배경이 어두운 남색으로 칠해지는지 확인
* 표준 주석 syntax

---

## 7. Background Image

<!-- .slide: data-background-image="./img/bg.png" data-background-size="cover" -->

* 배경 이미지 (없으면 기본 배경)
* 검증용으로 `data-background-color`도 함께 시도 가능

---

## 8. Background Transition

<!-- .slide: data-background-color="#0f3460" data-background-transition="zoom" -->

* 배경만 zoom으로 전환되는 효과
* `data-transition`과 별개 옵션

---

## 9. Auto-slide

<!-- .slide: data-autoslide="2000" -->

* 2초 후 자동으로 다음 슬라이드로 진행되는지 확인
* 키오스크·전시 모드용

---

## 11. m2slide 디렉티브 — Transition fade
#transition-fade

* m2slide 표준 디렉티브: 슬라이드 첫 줄 `#transition-fade`
* 결과 HTML `<section>`에 `data-transition="fade"` 속성 주입 기대 (Issue117)

---

## 12. m2slide 디렉티브 — Transition zoom-fast
#transition-zoom-fast

* `#transition-{name}-{speed}` 형식: `data-transition="zoom"` + `data-transition-speed="fast"`

---

## 13. m2slide 디렉티브 — Auto-Animate (1/2)
#auto-animate

# 진화 시작

---

## 14. m2slide 디렉티브 — Auto-Animate (2/2)
#auto-animate


* 진화 완료, 부드럽게

---

## 15. m2slide 디렉티브 — Background Color
#background-color-a1a1FF

* `data-background-color="#a1a1FF"` (hex 자동 prepend)
* 밝은 보라 배경 기대

---

## 16. m2slide 디렉티브 — Auto-slide 2초
#autoslide-2000

* `#autoslide-2000` → `data-autoslide="2000"` (2초 후 자동 진행)

---

## 17. m2slide 디렉티브 — Background Transition zoom
#background-transition-zoom
#background-color-0f3460

* 배경만 zoom 트랜지션
* 동일 슬라이드에 `#background-color-` 와 `#background-transition-` 함께 사용 가능 (멀티 디렉티브)

---

## 18. m2slide 디렉티브 — Background Image (Issue117_1)
#background-image-./img/bg.png
#background-size-cover

* `#background-image-{path}` + `#background-size-{cover|contain|auto}` (m2slide 디렉티브)
* 결과 HTML `<section>`에 `data-background-image` + `data-background-size` 주입 → reveal.js가 슬라이드 배경에 그림
* **대조군**: 슬라이드 7번(`<!-- .slide: data-background-image="..." -->` 표준 주석 syntax)은 m2slide 파서가 처리하지 않아 **미동작 (예상된 fail)** — 이 슬라이드 18번이 m2slide에서 동작하는 정식 표기법
* path는 `\S+` 매칭이라 상대경로(`./img/...`), 절대경로(`/...`), URL(`http(s)://...`) 모두 허용
