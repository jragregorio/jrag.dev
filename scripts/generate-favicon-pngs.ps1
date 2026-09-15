Add-Type -AssemblyName System.Drawing

$grid = @(
    @(1, 1, 1, 1, 1, 1, 1),
    @(0, 0, 0, 1, 0, 0, 0),
    @(0, 0, 0, 1, 0, 0, 0),
    @(0, 0, 0, 1, 0, 0, 0),
    @(0, 0, 0, 1, 0, 0, 0),
    @(0, 0, 0, 1, 0, 0, 0),
    @(1, 0, 0, 1, 0, 0, 0),
    @(0, 1, 1, 0, 0, 0, 0)
)

function Save-FaviconPng {
    param(
        [int]$Size,
        [string]$Path
    )

    $scale = $Size / 32.0
    $originX = 6.55 * $scale
    $originY = 5.0 * $scale
    $spacing = 3.15 * $scale
    $radius = 1.2 * $scale
    $corner = 6.0 * $scale

    $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::FromArgb(255, 17, 17, 16))

    $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 17, 17, 16))
    $dotBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)

    $graphics.FillRectangle(
        $bgBrush,
        0,
        0,
        $Size,
        $Size
    )

    $pathObj = New-Object System.Drawing.Drawing2D.GraphicsPath
    $rect = New-Object System.Drawing.RectangleF 0, 0, $Size, $Size
    $pathObj.AddArc($rect.X, $rect.Y, $corner * 2, $corner * 2, 180, 90)
    $pathObj.AddArc($rect.Right - ($corner * 2), $rect.Y, $corner * 2, $corner * 2, 270, 90)
    $pathObj.AddArc($rect.Right - ($corner * 2), $rect.Bottom - ($corner * 2), $corner * 2, $corner * 2, 0, 90)
    $pathObj.AddArc($rect.X, $rect.Bottom - ($corner * 2), $corner * 2, $corner * 2, 90, 90)
    $pathObj.CloseFigure()
    $graphics.SetClip($pathObj)
    $graphics.Clear([System.Drawing.Color]::FromArgb(255, 17, 17, 16))

    for ($row = 0; $row -lt $grid.Length; $row++) {
        for ($col = 0; $col -lt $grid[$row].Length; $col++) {
            if ($grid[$row][$col] -eq 1) {
                $cx = $originX + ($col * $spacing)
                $cy = $originY + ($row * $spacing)
                $diameter = $radius * 2
                $graphics.FillEllipse(
                    $dotBrush,
                    ($cx - $radius),
                    ($cy - $radius),
                    $diameter,
                    $diameter
                )
            }
        }
    }

    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

    $graphics.Dispose()
    $bitmap.Dispose()
    $bgBrush.Dispose()
    $dotBrush.Dispose()
    $pathObj.Dispose()
}

$publicDir = Join-Path (Join-Path $PSScriptRoot "..") "public"
Save-FaviconPng -Size 180 -Path (Join-Path $publicDir "apple-touch-icon.png")
Save-FaviconPng -Size 32 -Path (Join-Path $publicDir "favicon-32.png")

Write-Host "Wrote apple-touch-icon.png (180x180) and favicon-32.png (32x32)"
