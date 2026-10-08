# Tildoc

[한국어](#tildoc) | [English](#tildoc-english)

개발자와 기획자를 위한 가벼운 Markdown / JSON 뷰어 + 편집기 (WinForms + WebView2 + CodeMirror 6).
옵시디언 스타일 **라이브 프리뷰**: 원본 텍스트를 그대로 편집하되 화면에는 서식이 적용돼 보인다.
파일에는 타이핑한 글자만 들어가므로 git에 올라간 문서를 고쳐도 diff가 깨끗하다.

예전 이름은 MDViewer였다. Tildoc 설치 파일을 MDViewer 위에 덮어 설치하면 설정(아이콘 색), `.md` 연결, 바로가기가 Tildoc으로 옮겨진다.

## 다운로드

[Releases](../../releases/latest) 페이지에서 둘 중 하나를 받는다.

- **설치 파일** `Tildoc-Setup-<버전>.exe` (권장): 실행하면 `%LOCALAPPDATA%\Programs\Tildoc`에 설치되고, 시작 메뉴 등록과 `.md` 연결까지 된다. 관리자 권한은 필요 없다. 받은 설치 파일은 설치 후 지워도 된다. 제거는 Windows "설정 -> 앱"에서 한다.
- **포터블** `Tildoc-<버전>-win-x64.zip`: 원하는 폴더에 풀고 `Tildoc.exe`를 실행한다. 업데이트할 때는 같은 폴더에 덮어쓴다.

공통 사항:

- Windows 10/11 64비트. .NET 설치는 필요 없다(실행 파일에 포함).
- Edge WebView2 런타임 필요 (Windows 11과 대부분의 Windows 10에 기본 설치됨).
- 코드 서명이 없어서 처음 실행할 때 "Windows의 PC 보호" 창이 뜰 수 있다. `추가 정보` -> `실행`을 누르면 된다.
- 설치 직후 `.md`를 처음 열 때 Windows가 어떤 앱으로 열지 물을 수 있다. Tildoc을 고르고 `항상`을 누르면 된다.

## 사용

- 실행 파일: `Tildoc.exe` (폴더째 옮겨도 됨 — 옮긴 뒤엔 확장자 등록을 다시 할 것)
- `.md` 파일을 창에 드래그&드롭하거나 `Ctrl+O`로 열기
- `.json` 파일도 열고 고치고 저장할 수 있다. 마크다운 꾸밈 없이 JSON 문법 색상과 고정폭 글꼴로 보이고, 읽기 모드는 쓰지 않는다
- `File → Register as default .md viewer` → `.md` 더블클릭 시 Tildoc으로 열림 (현재 사용자만, 관리자 권한 불필요)

| 키 | 동작 |
|---|---|
| `Ctrl+S` | 저장 (수정 중이면 제목에 `●`) |
| `Ctrl+E` | 편집 ↔ 읽기 모드 (표를 예쁘게 볼 때) |
| `Ctrl+B` / `Ctrl+I` | 선택 영역 굵게 / 기울임 |
| `Shift+Alt+F` | JSON 정렬 (pretty print, `View` 메뉴에도 있음). 파일의 기존 들여쓰기(탭, 칸 수)를 따르고 값은 글자 그대로 둔다. 문법 오류가 있으면 위치를 알려 주고 바꾸지 않는다. `Ctrl+Z`로 되돌릴 수 있다 |
| `Ctrl+Shift+[` / `Ctrl+Shift+]` | 커서 위치 접기 / 펼치기 (JSON은 `{ }` `[ ]` 블록, 마크다운은 제목 아래 구간). 줄 왼쪽 화살표를 클릭해도 된다. 화면에서만 접히고 파일은 그대로 |
| `Ctrl+Alt+[` / `Ctrl+Alt+]` | 전체 접기 / 전체 펼치기 |
| `Ctrl+F` | 찾기 |
| `Ctrl+클릭` | 링크 열기 (다른 `.md`는 뷰어 안에서, 외부 URL은 브라우저로) |
| `F5` | 디스크에서 다시 불러오기 |
| 체크박스 클릭 | `[ ]` ↔ `[x]` 토글 |

- 파일이 밖에서 바뀌면(git pull 등) 수정 중이 아닐 때는 조용히 새로고침, 수정 중이면 상단 배너로 선택
- 저장 시 원본의 줄바꿈(CRLF/LF)과 BOM 유무를 그대로 유지
- 시스템 다크 모드 자동 적용
- `Settings -> App icon color`로 앱 아이콘 색 변경 (12색). 창, 작업 표시줄, 시작 메뉴/바탕화면/작업 표시줄 고정 바로가기, `.md` 파일 아이콘이 함께 바뀐다. 탐색기에서 보이는 `Tildoc.exe` 파일 아이콘만 기본색으로 남는다

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
"%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" installer.iss     # → Tildoc-Setup-<버전>.exe
```

버전은 csproj의 `Version`을 따라간다. 설치 경로, `.md` 연결 키, MDViewer에서 옮겨 오는 처리는 `installer.iss`에 있다.

.NET 9 런타임과 Edge WebView2 런타임 필요 (Windows 11 기본 포함).

`cd editor && npm test` — 헤드리스 Edge에서 방향키 위/아래 이동이 모든 줄을 순서대로 지나는지 검사 (`editor/test/nav.html`).
줄 장식 CSS에는 `margin`을 쓰면 안 된다 — CodeMirror가 줄 높이를 잴 때 margin이 빠져서 클릭/방향키가 엉뚱한 줄로 간다. 이 테스트가 그걸 잡는다.

## 구성

- `Form1.cs` — 창, 파일 열기/저장/감시, 드롭 처리, 링크, 확장자 등록, 아이콘 색 설정 (`%APPDATA%\Tildoc\settings.json`, 첫 실행 때 MDViewer 설정을 옮겨 옴)
- `editor/src/main.js` — CodeMirror 6 + 라이브 프리뷰 확장 (`livePreview`), 호스트와의 메시지 브리지
- `wwwroot/index.html` — 편집기/읽기 모드 셸과 스타일
- `wwwroot/` — marked.js, highlight.js, github-markdown-css, `editor.js` (전부 오프라인 내장)
- `icons/` — 아이콘(물결 `~`) 색별 `.ico`. `python icons/src/make_icons.py`(Pillow, numpy 필요)로 다시 만든다. 기본색 `icon.ico`도 같이 갱신된다

## 알려진 한계

- 편집 모드에서 표는 고정폭 텍스트로 표시 (읽기 모드에서 렌더링됨)
- 슬래시 메뉴 같은 노션식 UI는 없음 — 서식은 마크다운 문법을 타이핑

## 라이선스

MIT. 포함된 외부 라이브러리의 라이선스는 `THIRD-PARTY-NOTICES.txt` 참고.

---

# Tildoc (English)

A lightweight Markdown / JSON viewer and editor for developers and planners (WinForms + WebView2 + CodeMirror 6).
Obsidian-style **live preview**: you edit the raw text, but it is displayed with formatting applied.
Only what you type goes into the file, so editing documents tracked in git keeps the diff clean.

Tildoc was previously called MDViewer. Installing Tildoc over an existing MDViewer install carries over the settings (icon color), the `.md` association, and the shortcuts.

## Download

Get one of the two from the [Releases](../../releases/latest) page.

- **Installer** `Tildoc-Setup-<version>.exe` (recommended): installs to `%LOCALAPPDATA%\Programs\Tildoc`, adds a Start menu entry and the `.md` association. No administrator rights needed. You can delete the installer afterwards. Uninstall from Windows "Settings -> Apps".
- **Portable** `Tildoc-<version>-win-x64.zip`: unzip anywhere and run `Tildoc.exe`. To update, overwrite the same folder.

Notes:

- Windows 10/11, 64-bit. No .NET installation needed (bundled in the executable).
- Requires the Edge WebView2 runtime (preinstalled on Windows 11 and most Windows 10 machines).
- The app is not code-signed, so the first launch may show a "Windows protected your PC" dialog. Click `More info` -> `Run anyway`.
- Right after installing, Windows may ask which app to use the first time you open a `.md` file. Choose Tildoc and `Always`.

## Usage

- Executable: `Tildoc.exe` (the folder can be moved; re-register the file association afterwards)
- Drag and drop a `.md` file onto the window, or open one with `Ctrl+O`
- `.json` files can be opened, edited and saved too. They are shown with JSON syntax colors in a monospace font, without Markdown formatting; read mode is not used for JSON
- `File → Register as default .md viewer` → double-clicking a `.md` file opens Tildoc (current user only, no administrator rights needed)

| Key | Action |
|---|---|
| `Ctrl+S` | Save (the title shows `●` while there are unsaved edits) |
| `Ctrl+E` | Toggle edit / read mode (for nicely rendered tables) |
| `Ctrl+B` / `Ctrl+I` | Bold / italic the selection |
| `Shift+Alt+F` | Format JSON (pretty print; also in the `View` menu). Keeps the file's existing indentation (tabs or number of spaces) and leaves values exactly as written. On a syntax error it reports the location and changes nothing. Undo with `Ctrl+Z` |
| `Ctrl+Shift+[` / `Ctrl+Shift+]` | Fold / unfold at the cursor (`{ }` `[ ]` blocks in JSON, sections under a heading in Markdown). You can also click the arrow left of the line. Folding only affects the screen, not the file |
| `Ctrl+Alt+[` / `Ctrl+Alt+]` | Fold all / unfold all |
| `Ctrl+F` | Find |
| `Ctrl+Click` | Open a link (other `.md` files open in the viewer, external URLs in the browser) |
| `F5` | Reload from disk |
| Click a checkbox | Toggle `[ ]` ↔ `[x]` |

- When the file changes on disk (e.g. `git pull`), it reloads silently if you have no unsaved edits; otherwise a banner lets you choose
- Saving preserves the original line endings (CRLF/LF) and BOM
- Follows the system dark mode
- `Settings -> App icon color` changes the app icon color (12 colors). The window, taskbar, Start menu / desktop / pinned taskbar shortcuts and the `.md` file icon all change together. Only the icon of `Tildoc.exe` itself as seen in Explorer stays the default color

## Build

```
cd editor && npm install && npm run build     # → wwwroot/editor.js (CodeMirror bundle)
dotnet publish -c Release -r win-x64 --self-contained false -o dist
```

Release zip (single exe with .NET included + `wwwroot` folder):

```
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:DebugType=none -p:AllowedReferenceRelatedFileExtensions=none -o dist-release
```

Copy `README.md`, `LICENSE` and `THIRD-PARTY-NOTICES.txt` into `dist-release`, then zip the folder contents.

The installer is built with [Inno Setup 6](https://jrsoftware.org/isinfo.php) (`winget install JRSoftware.InnoSetup`). After building `dist-release` above:

```
"%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" installer.iss     # → Tildoc-Setup-<version>.exe
```

The version follows `Version` in the csproj. The install path, the `.md` association keys and the migration from MDViewer live in `installer.iss`.

Requires the .NET 9 runtime and the Edge WebView2 runtime (included with Windows 11).

`cd editor && npm test` — checks in headless Edge that the up/down arrow keys visit every line in order (`editor/test/nav.html`).
Never use `margin` in line decoration CSS: CodeMirror leaves margins out when measuring line heights, so clicks and arrow keys land on the wrong line. This test catches that.

## Project layout

- `Form1.cs` — window, file open/save/watch, drop handling, links, file association, icon color setting (`%APPDATA%\Tildoc\settings.json`; MDViewer settings are carried over on first run)
- `editor/src/main.js` — CodeMirror 6 + the live preview extension (`livePreview`), message bridge to the host
- `wwwroot/index.html` — shell and styles for edit / read mode
- `wwwroot/` — marked.js, highlight.js, github-markdown-css, `editor.js` (all bundled for offline use)
- `icons/` — `.ico` per icon color (tilde `~`). Regenerate with `python icons/src/make_icons.py` (needs Pillow and numpy); the default `icon.ico` is updated as well

## Known limitations

- In edit mode, tables are shown as monospace text (they are rendered in read mode)
- No Notion-style UI such as a slash menu; formatting is done by typing Markdown syntax

## License

MIT. See `THIRD-PARTY-NOTICES.txt` for the licenses of bundled third-party libraries.
