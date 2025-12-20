# GitLab Pages Build Script
if (Test-Path public) { Remove-Item public -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path public -Force | Out-Null
# Remove-Item public\* -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item *.html public\ -Force -ErrorAction SilentlyContinue
Copy-Item *.css public\ -Force -ErrorAction SilentlyContinue
Copy-Item *.js public\ -Force -ErrorAction SilentlyContinue
Copy-Item *.json public\ -Force -ErrorAction SilentlyContinue
Copy-Item *.png public\ -Force -ErrorAction SilentlyContinue
Copy-Item *.ico public\ -Force -ErrorAction SilentlyContinue
if (Test-Path images) { Copy-Item images public\ -Recurse -Force }
if (Test-Path audio) { Copy-Item audio public\ -Recurse -Force }
if (Test-Path data) { Copy-Item data public\ -Recurse -Force }
if (Test-Path analysis) { Copy-Item analysis public\ -Recurse -Force }
if (Test-Path experimental) { Copy-Item experimental public\ -Recurse -Force }
if (Test-Path fonts) { Copy-Item fonts public\ -Recurse -Force }
if (Test-Path assets) { Copy-Item assets public\ -Recurse -Force }
