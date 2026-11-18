Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

public class CompositeDevoteeSheet
{
    public static void CreateComposite(string tradersDir, string outPath)
    {
        int cellW = 313;
        int cellH = 418;
        int cols = 4;
        int rows = 3;
        int width = cellW * cols; // 1252
        int height = cellH * rows; // 1254

        using (Bitmap comp = new Bitmap(width, height, PixelFormat.Format32bppArgb))
        {
            using (Graphics g = Graphics.FromImage(comp))
            {
                g.Clear(Color.Transparent);
                g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighQuality;

                for (int i = 0; i < 12; i++)
                {
                    string p = Path.Combine(tradersDir, "trader_" + i + ".png");
                    if (File.Exists(p))
                    {
                        using (Bitmap tBmp = new Bitmap(p))
                        {
                            int col = i % cols;
                            int row = i / cols;
                            int destH = (int)(cellH * 0.90);
                            int destW = (int)(tBmp.Width * ((double)destH / tBmp.Height));
                            int destX = col * cellW + (cellW - destW) / 2;
                            int destY = (row + 1) * cellH - destH - 10;
                            g.DrawImage(tBmp, destX, destY, destW, destH);
                        }
                    }
                }
            }
            comp.Save(outPath, ImageFormat.Png);
            Console.WriteLine("Composite saved to " + outPath + " (" + width + "x" + height + ")");
        }
    }
}
"@ -ReferencedAssemblies System.Drawing

$traders = "c:\Users\Admin\Desktop\LiveRepo\public\assets\hang_rong_traders"
$out = "c:\Users\Admin\Desktop\LiveRepo\public\assets\wooden-temple-v1\devotee-sheet.png"
[CompositeDevoteeSheet]::CreateComposite($traders, $out)
