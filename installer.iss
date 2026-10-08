; Tildoc 설치 파일 스크립트 (Inno Setup 6)
; 먼저 README의 배포용 dotnet publish로 dist-release를 만든 뒤:
;   ISCC.exe installer.iss   -> Tildoc-Setup-<버전>.exe
; 버전은 dist-release\Tildoc.exe(= csproj의 Version)에서 읽는다.
; 예전 이름은 MDViewer였다. 그 설치본 위에 덮어 설치하면 아래 "MDViewer 정리" 항목들이 옛 흔적을 옮기거나 지운다.

#define AppName "Tildoc"
#define AppExe "Tildoc.exe"
; 파일 버전은 1.0.0.0 형식이라 끝의 .0을 뗀다
#define AppVersion RemoveFileExt(GetVersionNumbersString("dist-release\" + AppExe))
#define ProgId "Tildoc.md"
#define OldName "MDViewer"
#define OldProgId "MDViewer.md"

[Setup]
; AppId는 업데이트/제거 식별자라 바꾸면 안 된다 (MDViewer 시절과 같은 값 -> 덮어 설치하면 같은 앱의 업데이트로 처리)
AppId={{6F3C2A0E-8B4D-4E21-9C7A-2D5B1E9F4A63}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=이연경
AppPublisherURL=https://github.com/yeonk33/Tildoc
AppSupportURL=https://github.com/yeonk33/Tildoc/issues
AppUpdatesURL=https://github.com/yeonk33/Tildoc/releases
; 관리자 권한 없이 현재 사용자에게 설치 -> %LOCALAPPDATA%\Programs\Tildoc
PrivilegesRequired=lowest
DefaultDirName={autopf}\{#AppName}
; 같은 AppId라도 예전 폴더(Programs\MDViewer)를 이어 쓰지 않고 새 이름 폴더에 설치한다
UsePreviousAppDir=no
DisableProgramGroupPage=yes
DisableDirPage=auto
LicenseFile=LICENSE
SetupIconFile=icon.ico
UninstallDisplayIcon={app}\{#AppExe}
OutputDir=.
OutputBaseFilename=Tildoc-Setup-{#AppVersion}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
ChangesAssociations=yes
CloseApplications=yes

[Languages]
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "assoc"; Description: ".md 파일을 Tildoc으로 열기"
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; Flags: unchecked

[Files]
Source: "dist-release\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[InstallDelete]
; 이전 버전이 남긴 화면 파일 정리 (덮어쓰기 전에 비운다)
Type: filesandordirs; Name: "{app}\wwwroot"
Type: filesandordirs; Name: "{app}\icons"
; MDViewer 정리: 옛 설치 폴더와 바로가기 (설정 폴더는 앱이 첫 실행 때 옮겨 간다)
Type: filesandordirs; Name: "{autopf}\{#OldName}"
Type: files; Name: "{autoprograms}\{#OldName}.lnk"
Type: files; Name: "{autodesktop}\{#OldName}.lnk"

[UninstallDelete]
; 앱이 저장한 설정 (아이콘 색). MDViewer 시절 폴더도 함께
Type: filesandordirs; Name: "{userappdata}\{#AppName}"
Type: filesandordirs; Name: "{userappdata}\{#OldName}"

[Icons]
Name: "{autoprograms}\{#AppName}"; Filename: "{app}\{#AppExe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Registry]
; 앱 메뉴의 "Register as default .md viewer"(Form1.RegisterAssociation)와 같은 키를 쓴다.
; OpenWithProgids 값은 빈 문자열로 만든다 (ValueType: none은 값 없이 키만 만든다)
Root: HKA; Subkey: "Software\Classes\{#ProgId}"; ValueType: string; ValueName: ""; ValueData: "Markdown Document"; Flags: uninsdeletekey; Tasks: assoc
Root: HKA; Subkey: "Software\Classes\{#ProgId}\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: """{app}\{#AppExe}"",0"; Tasks: assoc
Root: HKA; Subkey: "Software\Classes\{#ProgId}\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#AppExe}"" ""%1"""; Tasks: assoc
Root: HKA; Subkey: "Software\Classes\.md"; ValueType: string; ValueName: ""; ValueData: "{#ProgId}"; Flags: uninsdeletevalue; Tasks: assoc
Root: HKA; Subkey: "Software\Classes\.md\OpenWithProgids"; ValueType: string; ValueName: "{#ProgId}"; ValueData: ""; Flags: uninsdeletevalue; Tasks: assoc
Root: HKA; Subkey: "Software\Classes\.markdown"; ValueType: string; ValueName: ""; ValueData: "{#ProgId}"; Flags: uninsdeletevalue; Tasks: assoc
Root: HKA; Subkey: "Software\Classes\.markdown\OpenWithProgids"; ValueType: string; ValueName: "{#ProgId}"; ValueData: ""; Flags: uninsdeletevalue; Tasks: assoc
Root: HKA; Subkey: "Software\Classes\.mdown"; ValueType: string; ValueName: ""; ValueData: "{#ProgId}"; Flags: uninsdeletevalue; Tasks: assoc
Root: HKA; Subkey: "Software\Classes\.mdown\OpenWithProgids"; ValueType: string; ValueName: "{#ProgId}"; ValueData: ""; Flags: uninsdeletevalue; Tasks: assoc
; Windows "연결 프로그램 -> 항상"으로 고른 exe가 이 키를 쓴다. 예전 위치를 가리키면 설치 위치로 바로잡는다
Root: HKA; Subkey: "Software\Classes\Applications\{#AppExe}"; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\Applications\{#AppExe}\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#AppExe}"" ""%1"""
Root: HKA; Subkey: "Software\Classes\Applications\{#AppExe}\SupportedTypes"; ValueType: string; ValueName: ".md"; ValueData: ""

; MDViewer 정리: 옛 ProgId와 "연결 프로그램" 목록 항목 삭제
Root: HKA; Subkey: "Software\Classes\{#OldProgId}"; ValueType: none; Flags: deletekey
Root: HKA; Subkey: "Software\Classes\.md\OpenWithProgids"; ValueType: none; ValueName: "{#OldProgId}"; Flags: deletevalue
Root: HKA; Subkey: "Software\Classes\.markdown\OpenWithProgids"; ValueType: none; ValueName: "{#OldProgId}"; Flags: deletevalue
Root: HKA; Subkey: "Software\Classes\.mdown\OpenWithProgids"; ValueType: none; ValueName: "{#OldProgId}"; Flags: deletevalue
; MDViewer 정리: 예전에 "항상 MDViewer.exe로 열기"를 고른 사용자는 그 선택이 Applications\MDViewer.exe 키를 가리킨다.
; Windows가 그 선택을 보호하고 있어 바꿀 수 없으니, 키를 지우는 대신 Tildoc.exe를 실행하도록 돌려놓는다
Root: HKA; Subkey: "Software\Classes\Applications\{#OldName}.exe"; Flags: uninsdeletekey; Check: HasOldOpenWith
Root: HKA; Subkey: "Software\Classes\Applications\{#OldName}.exe\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#AppExe}"" ""%1"""; Check: HasOldOpenWith
Root: HKA; Subkey: "Software\Classes\Applications\{#OldName}.exe\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: """{app}\{#AppExe}"",0"; Check: HasOldOpenWith

[Run]
Filename: "{app}\{#AppExe}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent

[Code]
// MDViewer 시절 "연결 프로그램 -> 항상" 선택이 남아 있는지
function HasOldOpenWith: Boolean;
begin
  Result := RegKeyExists(HKCU, 'Software\Classes\Applications\{#OldName}.exe');
end;
