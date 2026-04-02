const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function attestationDocxOrPdfResponse(
  docx: Buffer,
  filenameDocx: string,
  wantPdf: boolean,
): Promise<Response> {
  if (!wantPdf) {
    return new Response(new Uint8Array(docx), {
      headers: {
        "Content-Type": DOCX_TYPE,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filenameDocx)}`,
      },
    });
  }

  const { convertDocxBufferToPdfIfEnabled } = await import("@/lib/attestation/docx-to-pdf");
  const pdf = await convertDocxBufferToPdfIfEnabled(docx);
  if (!pdf) {
    return Response.json(
      {
        error: "PDF_NOT_AVAILABLE",
        hint:
          "PDF доступний лише якщо на сервері увімкнено ATTESTATION_ENABLE_PDF=true та встановлено LibreOffice (soffice). Інакше завантажуйте .docx без ?format=pdf.",
      },
      { status: 501 },
    );
  }

  const pdfName = filenameDocx.replace(/\.docx$/i, ".pdf");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(pdfName)}`,
    },
  });
}
