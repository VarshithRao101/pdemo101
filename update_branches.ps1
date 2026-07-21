$files = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts","*.css" | Select-Object -ExpandProperty FullName

$replacements = @(
    # Branch array — old 5 branches replaced with 4
    @{ From = "'Madhapur', 'Jubilee Hills', 'Gachibowli', 'Kukatpally', 'Secunderabad'"; To = "'Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'" },
    @{ From = "'Madhapur', 'Jubilee Hills', 'Gachibowli', 'Kukatpally', 'Secunderab...'"; To = "'Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'" },

    # TypeScript union type for branch state
    @{ From = "useState<'Madhapur' | 'Jubilee Hills' | 'Gachibowli' | 'Kukatpally' | 'Secunderabad'>('Madhapur')"; To = "useState<'Erragattugutta C1' | 'Erragattugutta C2' | 'Beemaram C1' | 'Beemaram C2'>('Erragattugutta C1')" },

    # Single branch string references
    @{ From = "branch !== 'Madhapur'"; To = "branch !== 'Erragattugutta C1'" },
    @{ From = "branch === 'Madhapur'"; To = "branch === 'Erragattugutta C1'" },
    @{ From = "e.branch === 'Madhapur'"; To = "e.branch === 'Erragattugutta C1'" },
    @{ From = "branch: 'Madhapur'"; To = "branch: 'Erragattugutta C1'" },
    @{ From = "saved.branch = 'Madhapur'"; To = "saved.branch = 'Erragattugutta C1'" },
    @{ From = "'(Madhapur)'"; To = "'(Erragattugutta C1)'" },
    @{ From = "(Madhapur)"; To = "(Erragattugutta C1)" },

    # Address line
    @{ From = "address: 'Madhapur Campus, Hyderabad'"; To = "address: 'Erragattugutta Campus 1, Hyderabad'" },

    # Display text — profile / clearance
    @{ From = "All 5 Branches"; To = "All 4 Branches" },
    @{ From = "All 5 Campuses"; To = "All 4 Campuses" },
    @{ From = "all 5 branches"; To = "all 4 branches" },
    @{ From = "all 5 campuses"; To = "all 4 campuses" },
    @{ From = "Madhapur Campus Principal Dean"; To = "Erragattugutta C1 Campus Principal Dean" },
    @{ From = "Level 2 Operations Clearance (Madhapur Campus)"; To = "Level 2 Operations Clearance (Erragattugutta C1)" },
    @{ From = "Principal Coordinator (Madhapur Campus)"; To = "Principal Coordinator (Erragattugutta C1)" },
    @{ From = "Superintendent Coordinator (All 5 Campuses)"; To = "Superintendent Coordinator (All 4 Campuses)" },

    # Module desc text
    @{ From = "view records across all 5 branches"; To = "view records across all 4 branches" },
    @{ From = "log expenses across all 5 branches"; To = "log expenses across all 4 branches" },
    @{ From = "Compare totals and log expenses across all 5 branches"; To = "Compare totals and log expenses across all 4 branches" },
    @{ From = "Edit student details for Madhapur branch"; To = "Edit student details for Erragattugutta C1 branch" },
    @{ From = "Log and track local expenditures of Madhapur branch"; To = "Log and track local expenditures of Erragattugutta C1" },
    @{ From = "Review Madhapur principal dean credentials"; To = "Review Erragattugutta C1 principal dean credentials" }
)

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
    $changed = $false
    foreach ($r in $replacements) {
        if ($content.Contains($r.From)) {
            $content = $content.Replace($r.From, $r.To)
            $changed = $true
        }
    }
    if ($changed) {
        [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
        Write-Host "Updated: $(Split-Path $file -Leaf)"
    }
}
Write-Host "Done."
