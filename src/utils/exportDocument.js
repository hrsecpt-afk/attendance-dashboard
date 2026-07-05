// ============================================================================
// Document export helpers
// ----------------------------------------------------------------------------
// iOS / iPadOS Safari ignores the <a download> attribute, so the .doc/.pdf
// "download" links used on desktop silently do nothing on iPhone/iPad. For those
// devices we instead open the generated HTML in a new window and trigger the
// native print dialog, from which the user can "Save to Files" / "Save as PDF".
// ============================================================================

// True on iPhone/iPad (incl. iPadOS Safari, which masquerades as desktop Mac).
export function isAppleMobile() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOS || iPadOS;
}

// Open printable HTML in a new window and trigger the print / save dialog.
// Works on desktop, Android, and iOS/iPadOS (Save to Files as PDF).
export function printHtmlDocument(htmlContent, title) {
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
  // Give the browser a moment to lay out content (and decode any base64 images)
  // before invoking print.
  const triggerPrint = () => {
    try { win.print(); } catch { /* ignore */ }
  };
  win.onload = triggerPrint;
  setTimeout(triggerPrint, 700);
}

// Download an editable Word (.doc) file on desktop; fall back to print-to-PDF on
// iOS/iPadOS where the download attribute does not work.
export function exportDoc(htmlContent, filename, title) {
  if (isAppleMobile()) {
    printHtmlDocument(htmlContent, title || filename);
    return;
  }
  try {
    // Leading BOM (﻿) so Word opens the file as UTF-8.
    const blob = new Blob(['﻿' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (e) {
    // If anything goes wrong with the blob download, fall back to print.
    console.error('Doc download failed, falling back to print', e);
    printHtmlDocument(htmlContent, title || filename);
  }
}
