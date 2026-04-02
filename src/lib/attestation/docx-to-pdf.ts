import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * When `ATTESTATION_ENABLE_PDF=true`, converts .docx to .pdf via LibreOffice (`soffice`).
 * Set `ATTESTATION_SOFFICE_PATH` if `soffice` is not on PATH (typical for Windows).
 * Returns `null` if PDF is disabled or conversion fails (caller should serve .docx or 501).
 */
export async function convertDocxBufferToPdfIfEnabled(docx: Buffer): Promise<Buffer | null> {
  if (process.env.ATTESTATION_ENABLE_PDF !== "true") {
    return null;
  }
  const soffice = process.env.ATTESTATION_SOFFICE_PATH?.trim() || "soffice";
  const dir = await mkdtemp(join(tmpdir(), "att-pdf-"));
  try {
    const docxPath = join(dir, "in.docx");
    await writeFile(docxPath, docx);
    await new Promise<void>((resolve, reject) => {
      const p = spawn(soffice, ["--headless", "--convert-to", "pdf", "--outdir", dir, docxPath], {
        stdio: "ignore",
      });
      p.on("error", reject);
      p.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`LibreOffice exited with code ${code}`));
      });
    });
    const pdfPath = join(dir, "in.pdf");
    return await readFile(pdfPath);
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
