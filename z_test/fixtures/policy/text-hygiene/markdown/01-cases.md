---
title: 텍스트 위생 골든 픽스처
type: ppt
---

## 0. Chapter Divider 테스트 (Issue229)

정상 본문. 이 슬라이드 제목에 이슈 번호가 노출되어 위반.

* 본문 bullet 의 Issue3 은 콘텐츠일 수 있어 미검출 (문맥 의존)

---

## fpm 이슈 관리 데모

fpm 은 Issue 번호로 작업을 추적한다. 본문 단락의 Issue941 은 도구 콘텐츠 — 미검출.

* Issue3 처리 예시 (bullet — 미검출)

---

## TODO 정리 방법

이 제목의 TODO 는 위반. 아래는 코드블록 예외 확인:

```
# TODO: 코드블록 안이라 예외
```
