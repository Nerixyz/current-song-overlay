@echo off
%~dp0\nssm.exe status CurrentSong

if errorlevel 1 (
    %~dp0\nssm.exe install CurrentSong "%~dp0start.bat"
)

%~dp0\nssm.exe set CurrentSong AppDirectory %~dp0%
%~dp0\nssm.exe set CurrentSong Application "%~dp0start.bat"
%~dp0\nssm.exe set CurrentSong start SERVICE_AUTO_START

echo Set up SERVICE_AUTO_START
