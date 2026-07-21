$files = @(
    "src/views/AdminPortalViews.tsx",
    "src/views/AccountantPortalViews.tsx",
    "src/views/AuthenticatorPortalViews.tsx"
)
foreach ($file in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    # Replace surrogate pairs (emoji in UTF-16) with empty string
    $cleaned = [System.Text.RegularExpressions.Regex]::Replace($text, '[\uD800-\uDFFF]', '')
    [System.IO.File]::WriteAllText($file, $cleaned, [System.Text.Encoding]::UTF8)
    Write-Host "Cleaned: $file"
}
