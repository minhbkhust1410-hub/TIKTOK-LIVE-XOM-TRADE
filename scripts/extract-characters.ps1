Add-Type -AssemblyName System.Drawing

$sheetSource = "C:\Users\Admin\.gemini\antigravity\brain\5a284f24-820a-4f52-9264-0235e17a071b\hang_rong_trader_spritesheet_1794486191471.jpg"
$bmp = New-Object System.Drawing.Bitmap($sheetSource)

$w = $bmp.Width
$h = $bmp.Height

# We have 4 columns roughly: 0..344, 344..688, 688..1032, 1032..1376
$colWidth = [int]($w / 4)

for ($i = 0; $i -lt 4; $i++) {
    $minX = $i * $colWidth
    $maxX = ($i + 1) * $colWidth - 1
    
    # Find tight bounding box of non-white pixels in this column
    $bMinX = $maxX; $bMaxX = $minX; $bMinY = $h; $bMaxY = 0
    for ($x = $minX; $x -le $maxX; $x++) {
        for ($y = 0; $y -lt $h; $y++) {
            $c = $bmp.GetPixel($x, $y)
            if ($c.R -lt 245 -or $c.G -lt 245 -or $c.B -lt 245) {
                if ($x -lt $bMinX) { $bMinX = $x }
                if ($x -gt $bMaxX) { $bMaxX = $x }
                if ($y -lt $bMinY) { $bMinY = $y }
                if ($y -gt $bMaxY) { $bMaxY = $y }
            }
        }
    }
    
    Write-Host "Character $i bounds: X=[$bMinX .. $bMaxX] (W=$($bMaxX - $bMinX + 1)), Y=[$bMinY .. $bMaxY] (H=$($bMaxY - $bMinY + 1))"
    
    # Create transparent PNG for this character
    $charW = $bMaxX - $bMinX + 1
    $charH = $bMaxY - $bMinY + 1
    if ($charW -gt 0 -and $charH -gt 0) {
        $charBmp = New-Object System.Drawing.Bitmap($charW, $charH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        for ($cx = 0; $cx -lt $charW; $cx++) {
            for ($cy = 0; $cy -lt $charH; $cy++) {
                $srcC = $bmp.GetPixel($bMinX + $cx, $bMinY + $cy)
                # Compute brightness
                $brightness = ($srcC.R * 0.299 + $srcC.G * 0.587 + $srcC.B * 0.114)
                if ($srcC.R -gt 248 -and $srcC.G -gt 248 -and $srcC.B -gt 248) {
                    # Pure transparent
                    $charBmp.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
                } elseif ($srcC.R -gt 235 -and $srcC.G -gt 235 -and $srcC.B -gt 235) {
                    # Soft edge blend
                    $alpha = [int](255 * (255 - $brightness) / 20)
                    if ($alpha -lt 0) { $alpha = 0 }
                    if ($alpha -gt 255) { $alpha = 255 }
                    $charBmp.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb($alpha, $srcC.R, $srcC.G, $srcC.B))
                } else {
                    $charBmp.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb(255, $srcC.R, $srcC.G, $srcC.B))
                }
            }
        }
        $outPath = "c:\Users\Admin\Desktop\LiveRepo\public\assets\hang_rong_char_$i.png"
        $charBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $charBmp.Dispose()
        Write-Host "Saved char $i to $outPath"
    }
}

$bmp.Dispose()
