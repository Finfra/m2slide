# Issue Management
* Max Issue Num: 1
* 오래된 Issue는 `z_old/old_issue.md`에 저장됨



# 🌱이슈 후보
*

# 🔥 진행 중

# 🏁 완료된 이슈
## issue1. UX 개선 및 코드 정리 (2025-11-18 해결)
* 문제: Slides 내의 내용이 길 경우 아래 내용을 볼 수 없음.
* 해결 방안 : 해당 페이지에 스크롤 기능 추가. (페이지 높이가 컨텐츠 높이 보다 작을 경우에만 스크롤 바 생성)
* 구현 내용:
  - `.reveal .slides section`에 `overflow-y: auto` 추가하여 컨텐츠가 넘칠 때만 스크롤바 표시
  - `max-height: 100vh` 설정으로 뷰포트 높이를 최대 높이로 제한
  - 스크롤바 스타일링 추가 (webkit 브라우저용)

# 🗑️ 보류된 이슈
