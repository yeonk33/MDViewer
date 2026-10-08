# MDViewer

가벼운 Markdown 뷰어 + 편집기 (WinForms + WebView2 + CodeMirror 6).
옵시디언 스타일 **라이브 프리뷰**: 원본 텍스트를 그대로 편집하되 화면에는 서식이 적용돼 보인다.
파일에는 타이핑한 글자만 들어가므로 git에 올라간 문서를 고쳐도 diff가 깨끗하다.

## 다운로드

[Releases](../../releases/latest) 페이지에서 둘 중 하나를 받는다.

- **설치 파일** `MDViewer-Setup-<버전>.exe` (권장): 실행하면 `%LOCALAPPDATA%\Programs\MDViewer`에 설치되고, 시작 메뉴 등록과 `.md` 연결까지 된다. 관리자 권한은 필요 없다. 받은 설치 파일은 설치 후 지워도 된다. 제거는 Windows "설정 -> 앱"에서 한다.
- **포터블** `MDViewer-<버전>-win-x64.zip`: 원하는 폴더에 풀고 `MDViewer.exe`를 실행한다. 업데이트할 때는 같은 폴더에 덮어쓴다.

공통 사항:

- Windows 10/11 64비트. .NET 설치는 필요 없다(실행 파일에 포함).
- Edge WebView2 런타임 필요 (Windows 11과 대부분의 Windows 10에 기본 설치됨).
- 코드 서명이 없어서 처음 실행할 때 "Windows의 PC 보호" 창이 뜰 수 있다. `추가 정보` -> `실행`을 누르면 된다.
- 설치 직후 `.md`를 처음 열 때 Windows가 어떤 앱으로 열지 물을 수 있다. MDViewer를 고르고 `항상`을 누르면 된다.

## 사용

- 실행 파일: `MDViewer.exe` (폴더째 옮겨도 됨 — 옮긴 뒤엔 확장자 등록을 다시 할 것)
- `.md` 파일을 창에 드래그&드롭하거나 `Ctrl+O`로 열기
- `.json` 파일도 열고 고치고 저장할 수 있다. 마크다운 꾸밈 없이 JSON 문법 색상과 고정폭 글꼴로 보이고, 읽기 모드는 쓰지 않는다
- `File → Register as default .md viewer` → `.md` 더블클릭 시 MDViewer로 열림 (현재 사용자만, 관리자 권한 불필요)

| 키 | 동작 |
|---|---|
| `Ctrl+S` | 저장 (수정 중이면 제목에 `●`) |
| `Ctrl+E` | 편집 ↔ 읽기 모드 (표를 예쁘게 볼 때) |
| `Ctrl+B` / `Ctrl+I` | 선택 영역 굵게 / 기울임 |
| `Shift+Alt+F` | JSON 정렬 (pretty print, `View` 메뉴에도 있음). 파일의 기존 들여쓰기(탭, 칸 수)를 따르고 값은 글자 그대로 둔다. 문법 오류가 있으면 위치를 알려 주고 바꾸지 않는다. `Ctrl+Z`로 되돌릴 수 있다 |
| `Ctrl+F` | 찾기 |
| `Ctrl+클릭` | 링크 열기 (다른 `.md`는 뷰어 안에서, 외부 URL은 브라우저로) |
| `F5` | 디스크에서 다시 불러오기 |
| 체크박스 클릭 | `[ ]` ↔ `[x]` 토글 |

- 파일이 밖에서 바뀌면(git pull 등) 수정 중이 아닐 때는 조용히 새로고침, 수정 중이면 상단 배너로 선택
- 저장 시 원본의 줄바꿈(CRLF/LF)과 BOM 유무를 그대로 유지
- 시스템 다크 모드 자동 적용
- `Settings -> App icon color`로 앱 아이콘 색 변경 (12색). 창, 작업 표시줄, 시작 메뉴/바탕화면/작업 표시줄 고정 바로가기, `.md` 파일 아이콘이 함께 바뀐다. 탐색기에서 보이는 `MDViewer.exe` 파일 아이콘만 기본색으로 남는다

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

설치 파일은 [Inno Setup 6](https://jrsoftware.org/isinfo.php)으로 만든다 (`winget install JRSoftware.InnoSetup`). 위 `dist-release`를 만든 뒤:

```
"%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" installer.iss     # → MDViewer-Setup-<버전>.exe
```

버전은 csproj의 `Version`을 따라간다. 설치 경로, `.md` 연결 키는 `installer.iss`에 있다.

.NET 9 런타임과 Edge WebView2 런타임 필요 (Windows 11 기본 포함).

`cd editor && npm test` — 헤드리스 Edge에서 방향키 위/아래 이동이 모든 줄을 순서대로 지나는지 검사 (`editor/test/nav.html`).
줄 장식 CSS에는 `margin`을 쓰면 안 된다 — CodeMirror가 줄 높이를 잴 때 margin이 빠져서 클릭/방향키가 엉뚱한 줄로 간다. 이 테스트가 그걸 잡는다.

## 구성

- `Form1.cs` — 창, 파일 열기/저장/감시, 드롭 처리, 링크, 확장자 등록, 아이콘 색 설정 (`%APPDATA%\MDViewer\settings.json`)
- `editor/src/main.js` — CodeMirror 6 + 라이브 프리뷰 확장 (`livePreview`), 호스트와의 메시지 브리지
- `wwwroot/index.html` — 편집기/읽기 모드 셸과 스타일
- `wwwroot/` — marked.js, highlight.js, github-markdown-css, `editor.js` (전부 오프라인 내장)
- `icons/` — 아이콘 색별 `.ico`. `python icons/src/make_icons.py`(Pillow, numpy 필요)로 `icons/src/logo.png`에서 다시 만든다. 기본색 `icon.ico`도 같이 갱신된다

## 알려진 한계

- 편집 모드에서 표는 고정폭 텍스트로 표시 (읽기 모드에서 렌더링됨)
- 슬래시 메뉴 같은 노션식 UI는 없음 — 서식은 마크다운 문법을 타이핑

## 라이선스

MIT. 포함된 외부 라이브러리의 라이선스는 `THIRD-PARTY-NOTICES.txt` 참고.
