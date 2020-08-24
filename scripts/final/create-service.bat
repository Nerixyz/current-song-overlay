@echo off
%~dp0\nssm.exe status CurrentSong

if errorlevel 1 (
    %~dp0\nssm.exe install CurrentSong deno.exe
)

%~dp0\nssm.exe set CurrentSong AppDirectory %~dp0%
%~dp0\nssm.exe set CurrentSong Application deno.exe
%~dp0\nssm.exe set CurrentSong AppParameters "run --allow-read --allow-net --allow-env --allow-write .\server\index.ts"
%~dp0\nssm.exe set CurrentSong start SERVICE_AUTO_START

echo Set up SERVICE_AUTO_START
