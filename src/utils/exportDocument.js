// ============================================================================
// Document export helpers
// ----------------------------------------------------------------------------
// Mobile canvas PDF rendering can corrupt Thai glyph positioning. Phones and
// tablets use the browser's PDF/print renderer, while desktop keeps the direct
// generated PDF download path.
// ============================================================================

import html2pdf from 'html2pdf.js';

// True on iPhone/iPad (incl. iPadOS Safari, which masquerades as desktop Mac).
export function isAppleMobile() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOS || iPadOS;
}

function isMobileOrTablet() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const touchDevice = navigator.maxTouchPoints > 1;
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const coarsePointer = typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(pointer: coarse)').matches;

  return isAppleMobile() || mobileUA || (touchDevice && coarsePointer);
}

function withMobileThaiPrintFixes(htmlContent) {
  const mobilePrintCss = `
    <style id="mobile-thai-pdf-fixes">
      html, body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        text-rendering: optimizeLegibility !important;
      }

      body, table, tr, th, td, span, div, p {
        font-family: "Leelawadee UI", Tahoma, "Noto Sans Thai", "Sukhumvit Set", "Thonburi", "Ayuthaya", Arial, sans-serif !important;
        font-kerning: none !important;
        letter-spacing: 0 !important;
        word-spacing: 0 !important;
        line-height: 1.5 !important;
        overflow: visible !important;
      }

      body {
        padding: 20mm 14mm 0 14mm !important;
        font-size: 13.2pt !important;
      }

      .title {
        font-size: 14.2pt !important;
        line-height: 1.42 !important;
        margin-bottom: 4px !important;
      }

      .subtitle,
      .date {
        font-size: 13.2pt !important;
        line-height: 1.42 !important;
        margin-bottom: 4px !important;
      }

      table.report-table,
      table.time-table {
        margin-top: 6px !important;
        margin-bottom: 10px !important;
      }

      table.report-table th,
      table.report-table td,
      table.time-table th,
      table.time-table td {
        font-size: 11.6pt !important;
        line-height: 1.5 !important;
        padding: 3px 4px !important;
        vertical-align: middle !important;
      }

      table.time-table {
        width: 100% !important;
        table-layout: fixed !important;
      }

      table.time-table th,
      table.time-table td {
        overflow-wrap: anywhere !important;
        word-break: normal !important;
      }

      body.time-log-report {
        width: 210mm !important;
        min-height: 297mm !important;
        padding: 8mm 4mm 0 4mm !important;
        font-size: 6.5pt !important;
      }

      body.time-log-report .title {
        font-size: 9pt !important;
        line-height: 1.15 !important;
        margin-bottom: 0.5px !important;
      }

      body.time-log-report .subtitle,
      body.time-log-report .date {
        font-size: 8pt !important;
        line-height: 1.15 !important;
        margin-bottom: 1px !important;
      }

      body.time-log-report table.time-table {
        table-layout: fixed !important;
        margin-top: 0.5px !important;
        margin-bottom: 0.5px !important;
      }

      body.time-log-report table.time-table th,
      body.time-log-report table.time-table td {
        font-size: 5.5pt !important;
        line-height: 1.08 !important;
        padding: 0.3px 0.5px !important;
        overflow-wrap: break-word !important;
      }

      body.time-log-report table.time-table th:nth-child(1),
      body.time-log-report table.time-table td:nth-child(1),
      body.time-log-report table.time-table th:nth-child(3),
      body.time-log-report table.time-table td:nth-child(3),
      body.time-log-report table.time-table th:nth-child(5),
      body.time-log-report table.time-table td:nth-child(5),
      body.time-log-report table.time-table th:nth-child(6),
      body.time-log-report table.time-table td:nth-child(6),
      body.time-log-report table.time-table th:nth-child(8),
      body.time-log-report table.time-table td:nth-child(8),
      body.time-log-report table.time-table th:nth-child(10),
      body.time-log-report table.time-table td:nth-child(10) {
        white-space: nowrap !important;
        overflow-wrap: normal !important;
        word-break: keep-all !important;
      }

      body.time-log-report table.time-table th {
        font-size: 8.8pt !important;
        padding: 3px 2px !important;
      }

      body.time-log-report .section-row td {
        font-size: 8.8pt !important;
        line-height: 1.12 !important;
        padding: 2px 5px !important;
      }

      .section-title {
        font-size: 12.8pt !important;
        line-height: 1.5 !important;
        padding: 3px 4px !important;
      }

      table.names-table {
        margin-bottom: 8px !important;
      }

      table.names-table td,
      table.signature-table td,
      .sig-line td {
        font-size: 11.8pt !important;
        line-height: 1.5 !important;
      }

      table.names-table td {
        padding: 4px 4px !important;
      }

      table.signature-table {
        width: 100% !important;
        border-collapse: collapse !important;
        margin-top: 8px !important;
      }

      table.signature-table td {
        padding: 2px 4px !important;
        border: none !important;
        font-size: 12pt !important;
      }

      table.signature-table tr:first-child td {
        width: 50% !important;
        text-align: center !important;
        vertical-align: top !important;
      }

      table.signature-table tr:last-child td {
        text-align: center !important;
        padding: 8px 4px !important;
        vertical-align: top !important;
      }

      table.signature-table .sig-line {
        margin-bottom: 4px !important;
      }

      .names {
        column-gap: 10px !important;
        row-gap: 1px !important;
      }

      .names span {
        white-space: nowrap !important;
      }

      .sig-fill {
        height: 16pt !important;
      }

      .signature-director {
        padding-top: 14px !important;
      }
    </style>
  `;

  if (/<\/head>/i.test(htmlContent)) {
    return htmlContent.replace(/<\/head>/i, `${mobilePrintCss}</head>`);
  }

  return `${mobilePrintCss}${htmlContent}`;
}

function normalizeSignatureTitles(htmlContent) {
  return String(htmlContent)
    .replace(/หัวหน้างานบุคลากร/g, 'หัวหน้าฝ่ายบริหารงานบุคคล')
    .replace(/หัวหน้างานบุคลกร/g, 'หัวหน้าฝ่ายบริหารงานบุคคล')
    .replace(/เจ้าหน้าที่งานบุคลากร/g, 'หัวหน้างานวินัยและรักษาวินัย');
}

// Open printable HTML in a new window and trigger the print / save dialog.
// Works on desktop, Android, and iOS/iPadOS (Save to Files as PDF).
export function printHtmlDocument(htmlContent, title) {
  htmlContent = normalizeSignatureTitles(htmlContent);
  const win = window.open('', '_blank');
  if (!win) {
    alert('กรุณาอนุญาตให้เปิด Pop-up สำหรับเว็บไซต์นี้ เพื่อบันทึก/พิมพ์เอกสาร');
    return;
  }
  win.document.open();
  win.document.write(htmlContent);
  if (title) {
    try { win.document.title = title; } catch { /* ignore */ }
  }
  win.document.close();
  win.focus();

  const triggerPrint = async () => {
    try {
      if (win.document?.fonts?.ready) await win.document.fonts.ready;
    } catch { /* ignore */ }
    await new Promise((resolve) => {
      try {
        win.requestAnimationFrame(() => win.requestAnimationFrame(resolve));
      } catch {
        setTimeout(resolve, 250);
      }
    });
    try { win.print(); } catch { /* ignore */ }
  };
  win.onload = triggerPrint;
  setTimeout(triggerPrint, 1200);
}

function waitForFrameLoad(frame) {
  return new Promise((resolve) => {
    const done = () => requestAnimationFrame(() => setTimeout(resolve, 150));
    frame.onload = done;
    setTimeout(done, 700);
  });
}

function copyDocumentStyles(sourceDoc, targetDoc) {
  sourceDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    targetDoc.head.appendChild(node.cloneNode(true));
  });
}

// Render the HTML report to an actual PDF file and download it immediately.
export async function exportPdf(htmlContent, filename, title) {
  htmlContent = normalizeSignatureTitles(htmlContent);

  if (isMobileOrTablet()) {
    printHtmlDocument(withMobileThaiPrintFixes(htmlContent), title || filename);
    return;
  }

  const frame = document.createElement('iframe');
  frame.title = title || filename || 'PDF export';
  frame.style.position = 'fixed';
  frame.style.left = '-10000px';
  frame.style.top = '0';
  frame.style.width = '794px';
  frame.style.height = '1123px';
  frame.style.border = '0';
  frame.style.visibility = 'hidden';
  document.body.appendChild(frame);

  try {
    frame.contentDocument.open();
    frame.contentDocument.write(htmlContent);
    frame.contentDocument.close();
    await waitForFrameLoad(frame);

    const doc = frame.contentDocument;
    if (doc?.fonts?.ready) await doc.fonts.ready;
    doc.documentElement.style.background = '#ffffff';
    doc.documentElement.style.colorScheme = 'light';
    doc.body.style.background = '#ffffff';
    doc.body.style.color = '#000000';
    doc.body.style.colorScheme = 'light';

    const pdfBlob = await html2pdf()
      .set({
        filename: filename || 'document.pdf',
        margin: 0,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: false,
          backgroundColor: '#ffffff',
          windowWidth: 794,
          onclone: (clonedDoc) => {
            copyDocumentStyles(doc, clonedDoc);
            clonedDoc.documentElement.style.background = '#ffffff';
            clonedDoc.documentElement.style.colorScheme = 'light';
            clonedDoc.body.style.background = '#ffffff';
            clonedDoc.body.style.color = '#000000';
            clonedDoc.body.style.colorScheme = 'light';
            if (clonedDoc.body.classList.contains('time-log-report')) {
              clonedDoc.body.style.padding = '13mm 7mm 0 7mm';
              clonedDoc.body.style.fontSize = '8.8pt';
            }
            clonedDoc.querySelectorAll('body, table, tr, th, td, span, div, p').forEach((node) => {
              node.style.fontFamily = '"Leelawadee UI", Tahoma, "Noto Sans Thai", Arial, sans-serif';
              node.style.lineHeight = '1.5';
              node.style.letterSpacing = '0';
              node.style.wordSpacing = '0';
              node.style.overflow = 'visible';
            });
            clonedDoc.querySelectorAll('body.time-log-report table.time-table th, body.time-log-report table.time-table td')
              .forEach((node) => {
                node.style.fontSize = '8pt';
                node.style.lineHeight = '1.12';
                node.style.padding = '1px 2px';
              });
            clonedDoc.querySelectorAll(
              'body.time-log-report table.time-table th:nth-child(1), ' +
              'body.time-log-report table.time-table td:nth-child(1), ' +
              'body.time-log-report table.time-table th:nth-child(3), ' +
              'body.time-log-report table.time-table td:nth-child(3), ' +
              'body.time-log-report table.time-table th:nth-child(5), ' +
              'body.time-log-report table.time-table td:nth-child(5), ' +
              'body.time-log-report table.time-table th:nth-child(6), ' +
              'body.time-log-report table.time-table td:nth-child(6), ' +
              'body.time-log-report table.time-table th:nth-child(8), ' +
              'body.time-log-report table.time-table td:nth-child(8), ' +
              'body.time-log-report table.time-table th:nth-child(10), ' +
              'body.time-log-report table.time-table td:nth-child(10)'
            ).forEach((node) => {
              node.style.whiteSpace = 'nowrap';
              node.style.overflowWrap = 'normal';
              node.style.wordBreak = 'keep-all';
              node.style.wordWrap = 'normal';
            });
            clonedDoc.querySelectorAll(
              'body.time-log-report table.time-table td:nth-child(3), ' +
              'body.time-log-report table.time-table td:nth-child(8)'
            ).forEach((node) => {
              node.style.fontSize = '6.8pt';
              node.style.letterSpacing = '-0.1px';
            });
            clonedDoc.querySelectorAll(
              'body.time-log-report table.time-table th:nth-child(1), ' +
              'body.time-log-report table.time-table th:nth-child(6)'
            ).forEach((node) => {
              node.style.width = '5%';
            });
            clonedDoc.querySelectorAll(
              'body.time-log-report table.time-table th:nth-child(2), ' +
              'body.time-log-report table.time-table th:nth-child(7)'
            ).forEach((node) => {
              node.style.width = '19%';
            });
            clonedDoc.querySelectorAll(
              'body.time-log-report table.time-table th:nth-child(3), ' +
              'body.time-log-report table.time-table th:nth-child(8)'
            ).forEach((node) => {
              node.style.width = '10%';
            });
            clonedDoc.querySelectorAll(
              'body.time-log-report table.time-table th:nth-child(4), ' +
              'body.time-log-report table.time-table th:nth-child(9)'
            ).forEach((node) => {
              node.style.width = '9%';
            });
            clonedDoc.querySelectorAll(
              'body.time-log-report table.time-table th:nth-child(5), ' +
              'body.time-log-report table.time-table th:nth-child(10)'
            ).forEach((node) => {
              node.style.width = '7%';
            });
          }
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { mode: ['css', 'legacy'] }
      })
      .from(doc.body)
      .output('blob');

    try {
      if (isAppleMobile() && typeof File !== 'undefined' && navigator.share) {
        const file = new File([pdfBlob], filename || 'document.pdf', { type: 'application/pdf' });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: title || filename
          });
          return;
        }
      }
    } catch (e) {
      if (e?.name === 'AbortError') return;
      console.error('Mobile PDF share failed, falling back to download', e);
    }

    triggerBlobDownload(pdfBlob, filename || 'document.pdf');
  } catch (e) {
    console.error('PDF export failed, falling back to print', e);
    printHtmlDocument(htmlContent, title || filename);
  } finally {
    setTimeout(() => {
      if (frame.parentNode) frame.parentNode.removeChild(frame);
    }, 1000);
  }
}

function createDocBlob(htmlContent) {
  // Leading BOM so Word opens the file as UTF-8.
  return new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1000);
}

// Download an editable Word (.doc) file. On iPhone/iPad, prefer the native share
// sheet because it reliably exposes "Save to Files" for generated files.
export async function exportDoc(htmlContent, filename, title) {
  const blob = createDocBlob(htmlContent);

  try {
    if (isAppleMobile() && typeof File !== 'undefined' && navigator.share) {
      const file = new File([blob], filename, { type: 'application/msword' });
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title || filename
        });
        return;
      }
    }
  } catch (e) {
    if (e?.name === 'AbortError') return;
    console.error('Mobile file share failed, falling back to download', e);
  }

  try {
    triggerBlobDownload(blob, filename);
    if (isAppleMobile()) {
      setTimeout(() => {
        alert('หากไฟล์ยังไม่ถูกดาวน์โหลด ให้กดปุ่มแชร์ แล้วเลือก "บันทึกไปยังไฟล์" หรือใช้ตัวเลือกพิมพ์เป็น PDF');
      }, 900);
    }
  } catch (e) {
    console.error('Doc download failed, falling back to print', e);
    printHtmlDocument(htmlContent, title || filename);
  }
}
