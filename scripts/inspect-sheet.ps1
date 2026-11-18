Add-Type -AssemblyName System.Drawing

$sheetSource = "C:\Users\Admin\.gemini\antigravity\brain\5a284f24-820a-4f52-9264-0235e17a071b\hang_rong_trader_spritesheet_1794486191471.jpg"
$bmp = New-Object System.Drawing.Bitmap($sheetSource)

Write-Host "Width: $($bmp.Width), Height: $($bmp.Height)"

# Sample horizontal scan to find columns where characters are located
$w = $bmp.Width
$h = $bmp.Height

$colCounts = New-Object int[] $w
for ($x = 0; $x -lt $w; $x += 4) {
    $nonWhite = 0
    for ($y = 0; $y -lt $h; $y += 4) {
        $c = $bmp.GetPixel($x, $y)
        # Check if significantly different from white (e.g. R < 240 or G < 240 or B < 240)
        if ($c.R -lt 240 -or $c.G -lt 240 -or $c.B -lt 240) {
            $nonWhite++
        }
    }
    $colCounts[$x] = $nonWhite
}

# Print histogram blocks
$step = [Math]::Floor($w / 40)
$out = ""
for ($i = 0; $i -lt 40; $i++) {
    $x = $i * $step
    $val = $colCounts[$x]
    if ($val -gt 20) { $out += "#" }
    elseif ($val -gt 5) { $out += "." }
    else { $out += "_" }
}
Write-Host "Horizontal profile: $out"

$bmp.Dispose()
