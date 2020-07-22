if (-not (Get-Command Set-PsEnv -errorAction SilentlyContinue))
{
    Install-Module -Name Set-PsEnv -Scope CurrentUser -ErrorAction Stop
}

Set-PsEnv;
web-ext sign -s dist/build --channel=listed --api-key=$env:API_KEY --api-secret=$env:API_SECRET;
