Add-Type -AssemblyName System.Drawing

$bgSource = "C:\Users\Admin\.gemini\antigravity\brain\5a284f24-820a-4f52-9264-0235e17a071b\hang_rong_street_trading_floor_1794486175902.jpg"
$sheetSource = "C:\Users\Admin\.gemini\antigravity\brain\5a284f24-820a-4f52-9264-0235e17a071b\hang_rong_trader_spritesheet_1794486191471.jpg"

$targetBg = "c:\Users\Admin\Desktop\LiveRepo\public\assets\wooden-temple-v1\background.png"
$targetSheet = "c:\Users\Admin\Desktop\LiveRepo\public\assets\wooden-temple-v1\devotee-sheet.png"
$backupBg = "c:\Users\Admin\Desktop\LiveRepo\public\assets\wooden-temple-v1\background_temple_backup.png"
$backupSheet = "c:\Users\Admin\Desktop\LiveRepo\public\assets\wooden-temple-v1\devotee-sheet_temple_backup.png"

# Backup originals if not backed up
if (-not (Test-Path $backupBg)) {
    Copy-Item $targetBg $backupBg
    Write-Host "Backed up original background to background_temple_backup.png"
}
if (-not (Test-Path $backupSheet)) {
    Copy-Item $targetSheet $backupSheet
    Write-Host "Backed up original sheet to devotee-sheet_temple_backup.png"
}

# 1. Process Background: resize to 941x1672
Write-Host "Processing background..."
$srcBgImg = [System.Drawing.Image]::FromFile($bgSource)
$destBg = New-Object System.Drawing.Bitmap 941, 1672
$gBg = [System.Drawing.Graphics]::FromImage($destBg)
$gBg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gBg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gBg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gBg.DrawImage($srcBgImg, 0, 0, 941, 1672)
$gBg.Dispose()
$srcBgImg.Dispose()

# Also save hang_rong_floor.png
$destBg.Save("c:\Users\Admin\Desktop\LiveRepo\public\assets\hang_rong_floor.png", [System.Drawing.Imaging.ImageFormat]::Png)
$destBg.Save($targetBg, [System.Drawing.Imaging.ImageFormat]::Png)
$destBg.Dispose()
Write-Host "Saved new Hàng Rong background to $targetBg and hang_rong_floor.png"

# 2. Inspect Sheet
$srcSheetImg = [System.Drawing.Image]::FromFile($sheetSource)
Write-Host "Sheet source size: $($srcSheetImg.Width) x $($srcSheetImg.Height)"
$srcSheetImg.Dispose()
