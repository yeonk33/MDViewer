; MDViewer 설치 파일 스크립트 (Inno Setup 6)
; 먼저 README의 배포용 dotnet publish로 dist-release를 만든 뒤:
;   ISCC.exe installer.iss   -> MDViewer-Setup-<버전>.exe
; 버전은 dist-release\MDViewer.exe(= csproj의 Version)에서 읽는다.

#define AppName "MDViewer"
#define AppExe "MDViewer.exe"
; 파일 버전은 1.0.0.0 형식이라 끝의 .0을 뗀다
#define AppVersion RemoveFileExt(GetVersionNumbersString("dist-release\" + AppExe))
#define ProgId "MDViewer.md"

[Setup]
; AppId는 업데이트/제거 식별자라 바꾸면 안 된다
AppId={{6F3C2A0E-8B4D-4E21-9C7A-2D5B1E9F4A63}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=이연경
AppPublisherURL=https://github.com/yeonk33/MDViewer
AppSupportURL=https://github.com/yeonk33/MDViewer/issues
AppUpdatesURL=https://github.com/yeonk33/MDViewer/releases
; 관리자 권한 없이 현재 사용자에게 설치 -> %LOCALAPPDATA%\Programs\MDViewer
PrivilegesRequired=lowest
DefaultDirName={autopf}\{#AppName}
DisableProgramGroupPage=yes
DisableDirPage=auto
LicenseFile=LICENSE
SetupIconFile=icon.ico
UninstallDisplayIcon={app}\{#AppExe}
OutputDir=.
OutputBaseFilename=MDViewer-Setup-{#AppVersion}
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
Name: "assoc"; Description: ".md 파일을 MDViewer로 열기"
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; Flags: unchecked

[Files]
Source: "dist-release\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[InstallDelete]
; 이전 버전이 남긴 화면 파일 정리 (덮어쓰기 전에 비운다)
Type: filesandordirs; Name: "{app}\wwwroot"
Type: filesandordirs; Name: "{app}\icons"

[UninstallDelete]
; 앱이 저장한 설정 (아이콘 색)
Type: filesandordirs; Name: "{userappdata}\MDViewer"

[Icons]
Name: "{autoprograms}\{#AppName}"; Filename: "{app}\{#AppExe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Registry]
; 앱 메뉴의 "Register as default .md viewer"(Form1.RegisterAssociation)와 같은 키를 쓴다
Root: HKA; Subkey: "Software\Classes\{#ProgId}"; ValueType: string; ValueName: ""; ValueData: "Markdown Document"; Flags: uninsdeletekey; Tasks: assoc
Root: HKA; Subkey: "Software\Classes\{#ProgId}\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: """{app}\{#AppExe}"",0"; Tasks: assoc
Root: HKA; Subkey: "Software\Classes\{#ProgId}\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#AppExe}"" ""%1"""; Tasks: assoc
Root: HKA; Subkey: "Software\Classes\.md"; ValueType: string; ValueName: ""; ValueData: "{#ProgId}"; Flags: uninsdeletevalue; Tasks: assoc
Root: HKA; Subkey: "Software\Classes\.md\OpenWithProgids"; ValueType: none; ValueName: "{#ProgId}"; Flags: uninsdeletevalue; Tasks: assoc
Root: HKA; Subkey: "Software\Classes\.markdown"; ValueType: string; ValueName: ""; ValueData: "{#ProgId}"; Flags: uninsdeletevalue; Tasks: assoc
Root: HKA; Subkey: "Software\Classes\.markdown\OpenWithProgids"; ValueType: none; ValueName: "{#ProgId}"; Flags: uninsdeletevalue; Tasks: assoc
Root: HKA; Subkey: "Software\Classes\.mdown"; ValueType: string; ValueName: ""; ValueData: "{#ProgId}"; Flags: uninsdeletevalue; Tasks: assoc
Root: HKA; Subkey: "Software\Classes\.mdown\OpenWithProgids"; ValueType: none; ValueName: "{#ProgId}"; Flags: uninsdeletevalue; Tasks: assoc
; Windows "연결 프로그램 -> 항상"으로 고른 MDViewer.exe가 이 키를 쓴다. 예전 위치를 가리키면 설치 위치로 바로잡는다
Root: HKA; Subkey: "Software\Classes\Applications\{#AppExe}"; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\Applications\{#AppExe}\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#AppExe}"" ""%1"""
Root: HKA; Subkey: "Software\Classes\Applications\{#AppExe}\SupportedTypes"; ValueType: string; ValueName: ".md"; ValueData: ""

[Run]
Filename: "{app}\{#AppExe}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent
