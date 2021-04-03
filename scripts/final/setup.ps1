$envFile = ".env";
$configFile = ".config";
# TODO: create function
if (-not [System.IO.File]::Exists($envFile))
{
    Copy-Item "$envFile.example" $envFile > $null;
}
if (-not [System.IO.File]::Exists($configFile))
{
    Copy-Item "$configFile.example" $configFile > $null;
}

New-Item "$($Env:APPDATA)\vlc\lua\intf" -Type Directory -Force -ErrorAction Ignore > $null;
Copy-Item "vlc\current-song.lua" "$($Env:APPDATA)\vlc\lua\intf" > $null;

$filepath = "$($Env:APPDATA)\vlc\vlcrc";
if ([System.IO.File]::Exists($filepath))
{
    $content = Get-Content $filepath -Raw;
    $content -replace "\n#?lua-intf=.*\n", "`nlua-intf=current-song`n" -replace "\n#?intf=.*\n", "`nintf=qt`n" -replace "\n#?extraintf=.*\n", "`nextraintf=luaintf`n" | Out-File $filepath > $null;
}
else
{
    Write-Output "Could not find $filepath";
}
