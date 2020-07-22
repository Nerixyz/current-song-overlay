$ignoredPaths = "dist", "node_modules", ".idea", ".code";
# the sourcecode
Compress-Archive -Path @(Get-ChildItem | Where-Object {-not $ignoredPaths.Contains($_.Name)} | % {$_.Name}) "dist\source.zip" -Force;
