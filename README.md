# MDViewer

가벼운 Markdown 뷰어 + 편집기 (WinForms + WebView2 + CodeMirror 6).
옵시디언 스타일 **라이브 프리뷰**: 원본 텍스트를 그대로 편집하되 화면에는 서식이 적용돼 보인다.
파일에는 타이핑한 글자만 들어가므로 git에 올라간 문서를 고쳐도 diff가 깨끗하다.

## 다운로드

[Releases](../../releases/latest) 페이지에서 `MDViewer-<버전>-win-x64.zip`을 받아 원하는 폴더에 풀고 `MDViewer.exe`를 실행한다.

- Windows 10/11 64비트. .NET 설치는 필요 없다(실행 파일에 포함).
- Edge WebView2 런타임 필요 (Windows 11과 대부분의 Windows 10에 기본 설치됨).
- 코드 서명이 없어서 처음 실행할 때 "Windows의 PC 보호" 창이 뜰 수 있다. `추가 정보` -> `실행`을 누르면 된다.

## 사용

- 실행 파일: `MDViewer.exe` (폴더째 옮겨도 됨 — 옮긴 뒤엔 확장자 등록을 다시 할 것)
- `.md` 파일을 창에 드래그&드롭하거나 `Ctrl+O`로 열기
- `File → Register as default .md viewer` → `.md` 더블클릭 시 MDViewer로 열림 (현재 사용자만, 관리자 권한 불필요)

| 키 | 동작 |
|---|---|
| `Ctrl+S` | 저장 (수정 중이면 제목에 `●`) |
| `Ctrl+E` | 편집 ↔ 읽기 모드 (표를 예쁘게 볼 때) |
| `Ctrl+B` / `Ctrl+I` | 선택 영역 굵게 / 기울임 |
| `Ctrl+F` | 찾기 |
| `Ctrl+클릭` | 링크 열기 (다른 `.md`는 뷰어 안에서, 외부 URL은 브라우저로) |
| `F5` | 디스크에서 다시 불러오기 |
| 체크박스 클릭 | `[ ]` ↔ `[x]` 토글 |

- 파일이 밖에서 바뀌면(git pull 등) 수정 중이 아닐 때는 조용히 새로고침, 수정 중이면 상단 배너로 선택
- 저장 시 원본의 줄바꿈(CRLF/LF)과 BOM 유무를 그대로 유지
- 시스템 다크 모드 자동 적용

## 빌드

```
cd editor && npm install && npm run build     # → wwwroot/editor.js (CodeMirror 번들)
dotnet publish -c Release -r win-x64 --self-contained false -o dist
```

배포용 zip (.NET 포함 단일 exe + `wwwroot` 폴더):

```
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:DebugType=none -p:AllowedReferenceRelatedFileExtensions=none -o dist-release
```

`dist-release`에 `README.md`, `LICENSE`, `THIRD-PARTY-NOTICES.txt`를 복사한 뒤 폴더 내용을 zip으로 묶는다.

.NET 9 런타임과 Edge WebView2 런타임 필요 (Windows 11 기본 포함).

`cd editor && npm test` — 헤드리스 Edge에서 방향키 위/아래 이동이 모든 줄을 순서대로 지나는지 검사 (`editor/test/nav.html`).
줄 장식 CSS에는 `margin`을 쓰면 안 된다 — CodeMirror가 줄 높이를 잴 때 margin이 빠져서 클릭/방향키가 엉뚱한 줄로 간다. 이 테스트가 그걸 잡는다.

## 구성

- `Form1.cs` — 창, 파일 열기/저장/감시, 드롭 처리, 링크, 확장자 등록
- `editor/src/main.js` — CodeMirror 6 + 라이브 프리뷰 확장 (`livePreview`), 호스트와의 메시지 브리지
- `wwwroot/index.html` — 편집기/읽기 모드 셸과 스타일
- `wwwroot/` — marked.js, highlight.js, github-markdown-css, `editor.js` (전부 오프라인 내장)

## 알려진 한계

- 편집 모드에서 표는 고정폭 텍스트로 표시 (읽기 모드에서 렌더링됨)
- 슬래시 메뉴 같은 노션식 UI는 없음 — 서식은 마크다운 문법을 타이핑

## 라이선스

MIT. 포함된 외부 라이브러리의 라이선스는 `THIRD-PARTY-NOTICES.txt` 참고.
