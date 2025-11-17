# GitHub Pages 설정 방법

## 1. GitHub 저장소 설정

1. GitHub에서 저장소로 이동: https://github.com/Finfra/m2slide
2. **Settings** 탭 클릭
3. 왼쪽 메뉴에서 **Pages** 클릭

## 2. Pages 설정

**Source 섹션**:
- Branch: `main` 선택
- Folder: `/docs` 선택
- **Save** 버튼 클릭

## 3. 접속 URL

설정 후 약 1-2분 뒤에 다음 URL로 접속 가능:

**메인 페이지 (Markmap 목차)**:
- https://finfra.github.io/m2slide/

**개별 슬라이드**:
- https://finfra.github.io/m2slide/01-opening.html
- https://finfra.github.io/m2slide/02-llm-tool-evolution.html
- https://finfra.github.io/m2slide/02.1.chat-based.html
- ... (나머지 슬라이드)

## 4. 자동 업데이트

이후 마크다운 파일을 수정하고 다음 명령을 실행하면 자동으로 웹페이지가 업데이트됩니다:

```bash
# 1. HTML 재생성
./convert.sh Documents/LlmAndVibeCoding

# 2. docs 폴더에 복사
cp -r Documents/LlmAndVibeCoding/slide/* docs/

# 3. Git 커밋 및 푸시
git add docs
git commit -m "Update slides"
git push
```

## 5. 현재 상태

✅ docs 폴더 준비 완료 (16개 HTML + 이미지)
✅ GitHub에 푸시 완료
⏳ GitHub Pages 설정 필요 (위 1-2번 단계)

설정 완료 후 **https://finfra.github.io/m2slide/** 에서 프레젠테이션을 볼 수 있습니다!
