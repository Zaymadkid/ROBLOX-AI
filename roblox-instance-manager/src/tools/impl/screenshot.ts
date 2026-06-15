import { execSync } from "child_process";
import { ProcessManager } from "../../process/manager.js";

export async function handleScreenshot(
  params: { clientId: string },
  processManager: ProcessManager
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const client = processManager.getClient(params.clientId);
  if (!client) {
    return { content: [{ type: "text", text: `Client "${params.clientId}" not found.` }] };
  }

  try {
    const tempDir = process.env.TEMP || "C:\\Temp";
    const outputPath = `${tempDir}\\roblox_${params.clientId}_${Date.now()}.png`;

    execSync(
      `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height; $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($bounds.X, $bounds.Y, 0, 0, $bounds.Size); $bitmap.Save('${outputPath}'); $graphics.Dispose(); $bitmap.Dispose()"`,
      { stdio: "ignore", timeout: 10000 }
    );

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          clientId: params.clientId,
          screenshotPath: outputPath,
          message: `Screenshot saved to ${outputPath}`,
        }, null, 2),
      }],
    };
  } catch (err) {
    return { content: [{ type: "text", text: `Screenshot failed: ${(err as Error).message}` }] };
  }
}