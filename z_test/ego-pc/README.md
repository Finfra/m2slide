# ego-pc — PC 1440×900 페이지 뷰 클릭·키보드 매트릭스 (prj42#Issue415 QA 2단계)

* 실행: `ego-browser nodejs < z_test/ego-pc/matrix-keys.js` · `ego-browser nodejs < z_test/ego-pc/click-swipe.js` (dev-server 9877 필요)
* `matrix-keys.js` — chapter·single 모드 키 매트릭스 22행을 진행 로그로 출력. 마지막의 클릭 구간은 ego 에서 `Inspected target navigated or closed` 로 죽는다 → 클릭·쓸기는 `click-swipe.js` 가 맡는다
* 판정은 사람이 [key_navigation.md](../../_doc_arch/key_navigation.md) 와 대조한다(자동 PASS/FAIL 없음)
