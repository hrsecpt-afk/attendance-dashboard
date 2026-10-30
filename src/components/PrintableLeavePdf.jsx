import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getSupabaseConfig } from '../config/supabaseConfig.js';
import html2pdf from 'html2pdf.js';

const PrintableLeavePdf = ({ request, onClose }) => {
  const [mobilePreviewScale, setMobilePreviewScale] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [showAttachment, setShowAttachment] = useState(false);

  // The attachment is a base64 data URI averaging ~736 kB, so the list screens that open
  // this modal deliberately leave attachment_url out of their queries — pulling it for
  // every row is what drained the project's egress quota. It is fetched here instead, for
  // the one request actually being printed. A parent that still passes the column through
  // is honoured as-is, so nothing refetches needlessly.
  const [attachmentUrl, setAttachmentUrl] = useState(
    'attachment_url' in (request || {}) ? request.attachment_url : null
  );

  useEffect(() => {
    if (!request || 'attachment_url' in request || !request.id) return;

    let cancelled = false;
    (async () => {
      try {
        const cfg = getSupabaseConfig();
        if (!cfg) return;
        const res = await fetch(
          `${cfg.url}/rest/v1/leave_requests?select=attachment_url&id=eq.${request.id}&limit=1`,
          { headers: { 'apikey': cfg.key, 'Authorization': `Bearer ${cfg.key}` } }
        );
        if (!res.ok) return;
        const rows = await res.json();
        if (!cancelled) setAttachmentUrl(rows?.[0]?.attachment_url || null);
      } catch (e) {
        console.error('Failed to load leave attachment', e);
      }
    })();

    return () => { cancelled = true; };
  }, [request]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const updateMobilePreviewScale = () => {
      if (typeof window === 'undefined') return;
      const pageWidth = 794;
      const pageHeight = 1123;
      const viewport = window.visualViewport;
      const viewportWidth = viewport?.width || window.innerWidth;
      const viewportHeight = viewport?.height || window.innerHeight;
      const isMobile = viewportWidth <= 768;

      if (!isMobile) {
        setMobilePreviewScale(1);
        return;
      }

      const actionHeight = 96;
      const availableWidth = Math.max(viewportWidth - 16, 280);
      const availableHeight = Math.max(viewportHeight - actionHeight - 12, 420);
      setMobilePreviewScale(Math.min(availableWidth / pageWidth, availableHeight / pageHeight, 1));
    };

    updateMobilePreviewScale();
    window.addEventListener('resize', updateMobilePreviewScale);
    window.addEventListener('orientationchange', updateMobilePreviewScale);
    window.visualViewport?.addEventListener('resize', updateMobilePreviewScale);
    window.visualViewport?.addEventListener('scroll', updateMobilePreviewScale);
    return () => {
      window.removeEventListener('resize', updateMobilePreviewScale);
      window.removeEventListener('orientationchange', updateMobilePreviewScale);
      window.visualViewport?.removeEventListener('resize', updateMobilePreviewScale);
      window.visualViewport?.removeEventListener('scroll', updateMobilePreviewScale);
    };
  }, []);

  const parseDateThaiParts = (dateStr) => {
    if (!dateStr) return { day: '.......', month: '................', year: '.......' };
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return { day: '.......', month: '................', year: '.......' };
      const months = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
      ];
      return {
        day: date.getDate().toString(),
        month: months[date.getMonth()],
        year: (date.getFullYear() + 543).toString()
      };
    } catch (e) {
      return { day: '.......', month: '................', year: '.......' };
    }
  };

  const docDate = parseDateThaiParts(request.created_at || new Date());
  const startDateThai = parseDateThaiParts(request.start_date);
  const endDateThai = parseDateThaiParts(request.end_date);
  
  const lastStartThai = parseDateThaiParts(request.last_leave_start_date);
  const lastEndThai = parseDateThaiParts(request.last_leave_end_date);

  const isVacation = Boolean(request.leave_type?.includes('พักผ่อน'));
  const isSick = Boolean(request.leave_type?.includes('ป่วย'));
  const isPersonal = Boolean(request.leave_type?.includes('กิจ'));
  const isMaternity = Boolean(request.leave_type?.includes('คลอด'));

  // Strip token and email from reason before displaying on the official form
  const cleanReason = (request.reason || '')
    .replace(/\[EMAIL:.*?\]/g, '')
    .replace(/\[TOKEN:.*?\]/g, '')
    .trim();

  // Parse director feedback, signature and timestamp
  const rawComment = request.director_comment || '';
  const signatureImg = rawComment.match(/\[SIGNATURE:(.*?)\]/)?.[1] || null;
  const signedAt = rawComment.match(/\[SIGNED_AT:(.*?)\]/)?.[1] || null;
  const cleanComment = rawComment
    .replace(/\[SIGNATURE:.*?\]/g, '')
    .replace(/\[SIGNED_AT:.*?\]/g, '')
    .trim();

  const signedDateThai = signedAt ? parseDateThaiParts(signedAt) : { day: '.......', month: '................', year: '.......' };

  // Calculate statistics for the table
  const isLastSick = Boolean(request.last_leave_type?.includes('ป่วย'));
  const isLastPersonal = Boolean(request.last_leave_type?.includes('กิจ'));
  const isLastMaternity = Boolean(request.last_leave_type?.includes('คลอด'));

  const pastSick = parseFloat(isLastSick ? request.last_leave_days || 0 : 0);
  const currentSick = isSick ? parseFloat(request.days || 0) : 0;
  const totalSick = (isSick ? currentSick : 0) + pastSick;

  const pastPersonal = parseFloat(isLastPersonal ? request.last_leave_days || 0 : 0);
  const currentPersonal = isPersonal ? parseFloat(request.days || 0) : 0;
  const totalPersonal = currentPersonal + pastPersonal;

  const pastMaternity = parseFloat(isLastMaternity ? request.last_leave_days || 0 : 0);
  const currentMaternity = isMaternity ? parseFloat(request.days || 0) : 0;
  const totalMaternity = currentMaternity + pastMaternity;

  // Attachments arrive in two shapes: an https URL for anything uploaded to Cloudinary,
  // and a base64 data URI for the older rows written before that change (plus the local
  // preview shown before a request is saved). Both still have to render.
  const hasAttachment = Boolean(attachmentUrl);
  const isImageAttachment =
    attachmentUrl?.startsWith('data:image') ||
    /^https?:\/\/\S+\.(jpe?g|png|gif|webp|bmp|heic|heif)(\?|#|$)/i.test(attachmentUrl || '');
  const isPdfAttachment =
    attachmentUrl?.startsWith('data:application/pdf') ||
    /^https?:\/\/\S+\.pdf(\?|#|$)/i.test(attachmentUrl || '');

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    const element = document.getElementById('print-area');
    if (!element) return;
    setDownloadingPdf(true);
    const cleanEmpName = (request.employee_name || 'ใบลา').replace(/\s+/g, '_');
    const cleanType = (request.leave_type || 'ขอลา').replace(/\s+/g, '_');
    const filename = `${cleanType}_${cleanEmpName}_${request.start_date || 'doc'}.pdf`;

    try {
      await html2pdf()
        .set({
          margin: 0,
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff', windowWidth: 794 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .from(element)
        .save();
    } catch (err) {
      console.error('Failed to download PDF directly, opening print dialog', err);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const previewModal = (
    <div className="print-modal-overlay">
      <div className="print-modal-actions no-print" style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexWrap: 'wrap',
        maxWidth: 'calc(100vw - 40px)',
        gap: '10px',
        background: 'rgba(0,0,0,0.85)',
        padding: '12px 18px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        alignItems: 'center'
      }}>
        <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>👁️ ตัวอย่างใบลาขออนุมัติออนไลน์</span>
        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          style={{
            padding: '8px 16px',
            background: '#2563eb',
            border: 'none',
            color: '#fff',
            borderRadius: '8px',
            cursor: downloadingPdf ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {downloadingPdf ? '⏳ กำลังสร้าง PDF...' : '📥 ดาวน์โหลด PDF'}
        </button>
        <button
          onClick={() => window.print()}
          style={{
            padding: '8px 16px',
            background: '#10b981',
            border: 'none',
            color: '#fff',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🖨️ สั่งพิมพ์ใบลา
        </button>
        {hasAttachment && (
          <button
            onClick={() => setShowAttachment(true)}
            style={{ padding: '8px 16px', background: '#8b5cf6', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
          >
            📎 ดูเอกสารแนบ
          </button>
        )}
        <button onClick={onClose} style={{ padding: '8px 16px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>✕ ปิดตัวอย่าง</button>
      </div>

      {showAttachment && (
        <div className="attachment-viewer no-print" onClick={() => setShowAttachment(false)}>
          <div className="attachment-viewer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="attachment-viewer-header">
              <strong>📎 เอกสารแนบใบลา</strong>
              <button onClick={() => setShowAttachment(false)}>✕ ปิด</button>
            </div>
            {isImageAttachment ? (
              <img src={attachmentUrl} alt="เอกสารแนบใบลา" className="attachment-viewer-image" />
            ) : isPdfAttachment ? (
              <div className="attachment-viewer-file">
                <div style={{ fontSize: '2rem' }}>📄</div>
                <div>ไฟล์ PDF แนบมากับใบลา</div>
                <a href={attachmentUrl} download="เอกสารแนบ.pdf">ดาวน์โหลดไฟล์ PDF</a>
              </div>
            ) : (
              <div className="attachment-viewer-file">
                <div style={{ fontSize: '2rem' }}>📁</div>
                <div>{attachmentUrl.replace('file://', '')}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className="printable-document-frame"
        style={{
          '--mobile-preview-scale': mobilePreviewScale,
          '--mobile-preview-width': `${794 * mobilePreviewScale}px`,
          '--mobile-preview-height': `${1123 * mobilePreviewScale}px`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}
      >
      <div id="print-area" className="printable-document" style={{
        background: '#fff',
        color: '#000',
        padding: '1.2cm 1.8cm 1.0cm 1.8cm',
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        fontFamily: '"TH SarabunPSK", "Sarabun", sans-serif',
        fontSize: '15pt',
        lineHeight: '1.32',
        position: 'relative',
        boxSizing: 'border-box'
      }}>
        
        {/* Document Title */}
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '18pt', marginBottom: '6px' }}>
          {isVacation ? 'ใบลาพักผ่อน' : 'ใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว'}
        </div>

        {/* Header Block: Top Right */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginBottom: '8px' }}>
          <div style={{ width: '310px', textAlign: 'left', lineHeight: '1.4' }}>
            <div>ศูนย์การศึกษาพิเศษ ประจำจังหวัดปทุมธานี</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              วันที่ <span style={{ borderBottom: '1px dotted #000', minWidth: '35px', textAlign: 'center', fontWeight: 'bold' }}>{docDate.day}</span> 
              เดือน <span style={{ borderBottom: '1px dotted #000', minWidth: '80px', textAlign: 'center', fontWeight: 'bold' }}>{docDate.month}</span> 
              พ.ศ. <span style={{ borderBottom: '1px dotted #000', minWidth: '45px', textAlign: 'center', fontWeight: 'bold' }}>{docDate.year}</span>
            </div>
          </div>
        </div>

        {/* Subject & To Block */}
        <div style={{ marginBottom: '5px' }}>
          <strong>เรื่อง</strong> {isVacation ? 'ขอลาพักผ่อน' : (request.leave_type?.startsWith('ขอ') ? request.leave_type : (request.leave_type?.startsWith('ลา') ? `ขอ${request.leave_type}` : `ขอลา${request.leave_type || 'ป่วย'}`))}
        </div>
        <div style={{ marginBottom: '10px' }}>
          <strong>เรียน</strong> ผู้อำนวยการศูนย์การศึกษาพิเศษ ประจำจังหวัดปทุมธานี
        </div>

        {/* Form Body Context */}
        {isVacation ? (
          /* VACATION LEAVE FORM CONTENT */
          <div style={{ lineHeight: '1.4', marginBottom: '10px' }}>
            <div style={{ textIndent: '1.5cm', marginBottom: '4px' }}>
              ข้าพเจ้า <span style={{ borderBottom: '1px dotted #000', padding: '0 8px', fontWeight: 'bold' }}>{request.employee_name}</span> 
              ตำแหน่ง <span style={{ borderBottom: '1px dotted #000', padding: '0 8px' }}>{request.position || 'พนักงาน'}</span>
            </div>
            <div style={{ marginBottom: '4px' }}>
              สังกัด <span style={{ borderBottom: '1px dotted #000', padding: '0 8px' }}>ศูนย์การศึกษาพิเศษ ประจำจังหวัดปทุมธานี สำนักบริหารงานการศึกษาพิเศษ</span>
            </div>
            <div style={{ marginBottom: '4px' }}>
              มีวันลาพักผ่อนสะสมปี 2568 <span style={{ borderBottom: '1px dotted #000', padding: '0 8px', fontWeight: 'bold' }}>{request.vacation_accumulated || 0}</span> วันทำการ 
              มีสิทธิ์วันลาพักผ่อนปี 2569 <span style={{ borderBottom: '1px dotted #000', padding: '0 8px', fontWeight: 'bold' }}>{request.vacation_quota_current_year || 10}</span> วันทำการ 
              รวมวันลาพักผ่อนทั้งหมด <span style={{ borderBottom: '1px dotted #000', padding: '0 8px', fontWeight: 'bold' }}>{request.vacation_quota_total || 10}</span> วันทำการ
            </div>
            <div style={{ marginBottom: '4px' }}>
              ลาพักผ่อนมาแล้ว <span style={{ borderBottom: '1px dotted #000', padding: '0 8px', fontWeight: 'bold' }}>{request.vacation_taken || 0}</span> วันทำการ 
              สิทธิ์วันลาพักผ่อนคงเหลือปี 2569 <span style={{ borderBottom: '1px dotted #000', padding: '0 8px', fontWeight: 'bold' }}>{request.vacation_remaining || 0}</span> วันทำการ
            </div>
            <div style={{ marginBottom: '4px' }}>
              ขอลาพักผ่อนตั้งแต่วันที่ <span style={{ borderBottom: '1px dotted #000', padding: '0 8px', fontWeight: 'bold' }}>{startDateThai.day}</span> 
              เดือน <span style={{ borderBottom: '1px dotted #000', padding: '0 8px', fontWeight: 'bold' }}>{startDateThai.month}</span> 
              พ.ศ. <span style={{ borderBottom: '1px dotted #000', padding: '0 8px', fontWeight: 'bold' }}>{startDateThai.year}</span> 
              ถึงวันที่ <span style={{ borderBottom: '1px dotted #000', padding: '0 8px', fontWeight: 'bold' }}>{endDateThai.day}</span> 
              เดือน <span style={{ borderBottom: '1px dotted #000', padding: '0 8px', fontWeight: 'bold' }}>{endDateThai.month}</span> 
              พ.ศ. <span style={{ borderBottom: '1px dotted #000', padding: '0 8px', fontWeight: 'bold' }}>{endDateThai.year}</span> 
              มีกำหนด <span style={{ borderBottom: '1px dotted #000', padding: '0 8px', fontWeight: 'bold' }}>{request.days}</span> วัน
            </div>
            <div style={{ marginBottom: '4px' }}>
              ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ <span style={{ borderBottom: '1px dotted #000', padding: '0 8px' }}>{request.address || '-'}</span>
            </div>
            <div style={{ marginBottom: '10px' }}>
              หมายเลขโทรศัพท์ <span style={{ borderBottom: '1px dotted #000', padding: '0 8px', fontWeight: 'bold' }}>{request.phone || '-'}</span>
            </div>
          </div>
        ) : (
          /* SICK/PERSONAL/MATERNITY LEAVE FORM CONTENT */
          <div style={{ lineHeight: '1.4', marginBottom: '8px' }}>
            <div style={{ textIndent: '1.5cm', marginBottom: '4px' }}>
              ข้าพเจ้า <span style={{ borderBottom: '1px dotted #000', padding: '0 8px', fontWeight: 'bold' }}>{request.employee_name}</span> 
              ตำแหน่ง <span style={{ borderBottom: '1px dotted #000', padding: '0 8px' }}>{request.position || 'พนักงาน'}</span>
            </div>
            <div style={{ marginBottom: '4px' }}>
              สังกัด <span style={{ borderBottom: '1px dotted #000', padding: '0 8px' }}>ศูนย์การศึกษาพิเศษ ประจำจังหวัดปทุมธานี สำนักบริหารงานการศึกษาพิเศษ</span>
            </div>

            <div style={{ margin: '4px 0 6px 0', display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '55px', paddingLeft: '1.5cm', whiteSpace: 'nowrap' }}>ขอลา</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '1px solid #000', textAlign: 'center', lineHeight: '12px', fontSize: '10pt', marginRight: '6px', flexShrink: 0 }}>
                    {isSick ? '✓' : ''}
                  </span>
                  <span style={{ width: '45px', flexShrink: 0 }}>ป่วย</span>
                  <span style={{ marginRight: '6px', flexShrink: 0 }}>เนื่องจาก</span>
                  <span style={{ flex: 1, borderBottom: '1px dotted #000', padding: '0 4px', fontWeight: isSick ? 'bold' : 'normal', minHeight: '18px' }}>
                    {isSick ? cleanReason : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '1px solid #000', textAlign: 'center', lineHeight: '12px', fontSize: '10pt', marginRight: '6px', flexShrink: 0 }}>
                    {isPersonal ? '✓' : ''}
                  </span>
                  <span style={{ width: '45px', flexShrink: 0 }}>กิจส่วนตัว</span>
                  <span style={{ marginRight: '6px', flexShrink: 0 }}>เนื่องจาก</span>
                  <span style={{ flex: 1, borderBottom: '1px dotted #000', padding: '0 4px', fontWeight: isPersonal ? 'bold' : 'normal', minHeight: '18px' }}>
                    {isPersonal ? cleanReason : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '1px solid #000', textAlign: 'center', lineHeight: '12px', fontSize: '10pt', marginRight: '6px', flexShrink: 0 }}>
                    {isMaternity ? '✓' : ''}
                  </span>
                  <span>คลอดบุตร</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '4px' }}>
              ตั้งแต่วันที่ <span style={{ borderBottom: '1px dotted #000', padding: '0 6px', fontWeight: 'bold' }}>{startDateThai.day}</span> 
              เดือน <span style={{ borderBottom: '1px dotted #000', padding: '0 6px', fontWeight: 'bold' }}>{startDateThai.month}</span> 
              พ.ศ. <span style={{ borderBottom: '1px dotted #000', padding: '0 6px', fontWeight: 'bold' }}>{startDateThai.year}</span> 
              ถึงวันที่ <span style={{ borderBottom: '1px dotted #000', padding: '0 6px', fontWeight: 'bold' }}>{endDateThai.day}</span> 
              เดือน <span style={{ borderBottom: '1px dotted #000', padding: '0 6px', fontWeight: 'bold' }}>{endDateThai.month}</span> 
              พ.ศ. <span style={{ borderBottom: '1px dotted #000', padding: '0 6px', fontWeight: 'bold' }}>{endDateThai.year}</span>
            </div>

            <div style={{ marginBottom: '4px' }}>
              มีกำหนด <span style={{ borderBottom: '1px dotted #000', padding: '0 8px', fontWeight: 'bold' }}>{request.days}</span> วัน 
              และข้าพเจ้าได้ลา&nbsp;
              <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '1px solid #000', textAlign: 'center', lineHeight: '12px', fontSize: '10pt', verticalAlign: 'middle', marginRight: '4px' }}>
                {isLastSick ? '✓' : ''}
              </span> ป่วย&nbsp;&nbsp;&nbsp;&nbsp;
              <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '1px solid #000', textAlign: 'center', lineHeight: '12px', fontSize: '10pt', verticalAlign: 'middle', marginRight: '4px' }}>
                {isLastPersonal ? '✓' : ''}
              </span> กิจส่วนตัว&nbsp;&nbsp;&nbsp;&nbsp;
              <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '1px solid #000', textAlign: 'center', lineHeight: '12px', fontSize: '10pt', verticalAlign: 'middle', marginRight: '4px' }}>
                {isLastMaternity ? '✓' : ''}
              </span> คลอดบุตร
            </div>

            <div style={{ marginBottom: '4px' }}>
              ครั้งสุดท้ายตั้งแต่วันที่ <span style={{ borderBottom: '1px dotted #000', padding: '0 6px' }}>{lastStartThai.day}</span> 
              เดือน <span style={{ borderBottom: '1px dotted #000', padding: '0 6px' }}>{lastStartThai.month}</span> 
              พ.ศ. <span style={{ borderBottom: '1px dotted #000', padding: '0 6px' }}>{lastStartThai.year}</span> 
              ถึง วันที่ <span style={{ borderBottom: '1px dotted #000', padding: '0 6px' }}>{lastEndThai.day}</span> 
              เดือน <span style={{ borderBottom: '1px dotted #000', padding: '0 6px' }}>{lastEndThai.month}</span> 
              พ.ศ. <span style={{ borderBottom: '1px dotted #000', padding: '0 6px' }}>{lastEndThai.year}</span>
            </div>

            <div style={{ marginBottom: '4px' }}>
              มีกำหนด <span style={{ borderBottom: '1px dotted #000', padding: '0 8px', fontWeight: 'bold' }}>{request.last_leave_days || '-'}</span> วัน 
              ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ <span style={{ borderBottom: '1px dotted #000', padding: '0 6px' }}>{request.address || '-'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <span>หมายเลขโทรศัพท์ <span style={{ borderBottom: '1px dotted #000', minWidth: '160px', display: 'inline-block', textAlign: 'center', fontWeight: 'bold' }}>{request.phone || '-'}</span></span>
            </div>
          </div>
        )}

        {/* Requester Signature Block */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', marginRight: '0.5cm' }}>
          <div style={{ textAlign: 'center', minWidth: '220px', lineHeight: '1.35' }}>
            <div>ลงชื่อ............................................................</div>
            <div style={{ marginTop: '2px' }}>({request.employee_name})</div>
          </div>
        </div>

        {/* Split Section: Leave Stats (Left) & Approvals (Right) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '11.5pt', lineHeight: '1.3' }}>
          
          {/* Left Side: Stats Check & Personnel Staff Signatures */}
          <div style={{ width: '48%', display: 'flex', flexDirection: 'column' }}>
            {isVacation ? (
              /* Vacation Left Side Stats display */
              <div style={{ border: '1px solid #000', padding: '8px', borderRadius: '3px', marginBottom: '10px' }}>
                <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '4px', fontSize: '11.5pt' }}>สถิติการลาพักผ่อนในปีงบประมาณนี้</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11pt' }}>
                  <div>- วันลาสะสม: <strong>{request.vacation_accumulated || 0}</strong> วันทำการ</div>
                  <div>- มีสิทธิลาปีนี้: <strong>{request.vacation_quota_current_year || 10}</strong> วันทำการ</div>
                  <div>- รวมเป็น: <strong>{request.vacation_quota_total || 10}</strong> วันทำการ</div>
                  <div>- ลาไปแล้ว: <strong>{request.vacation_taken || 0}</strong> วันทำการ</div>
                  <div>- ลาครั้งนี้: <strong>{request.days}</strong> วันทำการ</div>
                  <div>- คงเหลือสิทธิ์: <strong>{request.vacation_remaining || 0}</strong> วันทำการ</div>
                </div>
              </div>
            ) : (
              /* Sick/Personal/Maternity Left Side Stats display */
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '11.5pt' }}>สถิติการลาในปีงบประมาณนี้</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '10.5pt', border: '1px solid #000' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #000', padding: '3px 4px', fontSize: '10pt', fontWeight: 600 }}>ประเภทลา</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', fontSize: '9pt', fontWeight: 600, lineHeight: '1.15' }}>ลามาแล้ว<br/>(วันทำการ)</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', fontSize: '9pt', fontWeight: 600, lineHeight: '1.15' }}>ลาครั้งนี้<br/>(วันทำการ)</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', fontSize: '9pt', fontWeight: 600, lineHeight: '1.15' }}>รวมเป็น<br/>(วันทำการ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'left' }}>ป่วย</td>
                      <td style={{ border: '1px solid #000', padding: '2px' }}>{pastSick > 0 ? pastSick : '-'}</td>
                      <td style={{ border: '1px solid #000', padding: '2px', fontWeight: isSick ? 'bold' : 'normal' }}>{isSick ? request.days : '-'}</td>
                      <td style={{ border: '1px solid #000', padding: '2px', fontWeight: isSick ? 'bold' : 'normal' }}>{totalSick > 0 ? totalSick : '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'left' }}>กิจส่วนตัว</td>
                      <td style={{ border: '1px solid #000', padding: '2px' }}>{pastPersonal > 0 ? pastPersonal : '-'}</td>
                      <td style={{ border: '1px solid #000', padding: '2px', fontWeight: isPersonal ? 'bold' : 'normal' }}>{isPersonal ? request.days : '-'}</td>
                      <td style={{ border: '1px solid #000', padding: '2px', fontWeight: isPersonal ? 'bold' : 'normal' }}>{totalPersonal > 0 ? totalPersonal : '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'left' }}>คลอดบุตร</td>
                      <td style={{ border: '1px solid #000', padding: '2px' }}>{pastMaternity > 0 ? pastMaternity : '-'}</td>
                      <td style={{ border: '1px solid #000', padding: '2px', fontWeight: isMaternity ? 'bold' : 'normal' }}>{isMaternity ? request.days : '-'}</td>
                      <td style={{ border: '1px solid #000', padding: '2px', fontWeight: isMaternity ? 'bold' : 'normal' }}>{totalMaternity > 0 ? totalMaternity : '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Staff Signature 1: Reviewer */}
            <div style={{ marginTop: '8px', textAlign: 'center', lineHeight: '1.25' }}>
              <div>ลงชื่อ............................................................ผู้ตรวจสอบ</div>
              <div style={{ marginTop: '2px' }}>(นายณัฐิวุฒิ พลนาคู)</div>
              <div style={{ fontSize: '10pt', color: '#000' }}>ตำแหน่ง ครูผู้ช่วย</div>
              <div style={{ marginTop: '2px', fontSize: '10pt' }}>วันที่........../........../..........</div>
            </div>

            {/* Staff Signature 2: Head of Personnel */}
            <div style={{ marginTop: '12px', textAlign: 'center', lineHeight: '1.25' }}>
              <div>ลงชื่อ............................................................หัวหน้ากลุ่มบริหารงานบุคคล</div>
              <div style={{ marginTop: '2px' }}>(นายโกสินทร์ ยังมี)</div>
              <div style={{ fontSize: '10pt', color: '#000' }}>ตำแหน่ง ครู</div>
              <div style={{ marginTop: '2px', fontSize: '10pt' }}>วันที่........../........../..........</div>
            </div>
          </div>

          {/* Right Side: Deputy Director & Director Approval */}
          <div style={{ width: '48%', display: 'flex', flexDirection: 'column' }}>
            {/* 1. Deputy Director Block */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>ความเห็นผู้บังคับบัญชา</div>
              <div style={{ fontSize: '11pt', marginTop: '1px' }}>ความคิดเห็นรองผู้อำนวยการ</div>
              <div style={{ fontSize: '10.5pt', marginTop: '3px' }}>ความเห็นเพิ่มเติม......................................................................</div>
              <div style={{ fontSize: '10.5pt', marginTop: '2px' }}>......................................................................................................</div>
              <div style={{ marginTop: '8px', textAlign: 'center', lineHeight: '1.25' }}>
                <div>(ลงชื่อ)................................................................................</div>
                <div style={{ marginTop: '2px' }}>(นายชัยธวัช สาทถาพร)</div>
                <div style={{ fontSize: '9.5pt' }}>รองผู้อำนวยการศูนย์การศึกษาพิเศษประจำจังหวัดปทุมธานี</div>
                <div style={{ marginTop: '2px', fontSize: '9.5pt' }}>วันที่........../........../..........</div>
              </div>
            </div>

            {/* 2. Director Order Block */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontWeight: 'bold', fontSize: '11pt' }}>
                <span>คำสั่ง</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '1px solid #000', textAlign: 'center', lineHeight: '12px', fontSize: '10pt' }}>
                    {request.status === 'approved' ? '✓' : ''}
                  </span>
                  <span>อนุญาต</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '1px solid #000', textAlign: 'center', lineHeight: '12px', fontSize: '10pt' }}>
                    {request.status === 'rejected' ? '✓' : ''}
                  </span>
                  <span>ไม่อนุญาต</span>
                </div>
              </div>
              <div style={{ fontSize: '10.5pt', marginTop: '4px' }}>
                ความเห็นเพิ่มเติม {cleanComment ? <span style={{ fontWeight: 'bold' }}>{cleanComment}</span> : '......................................................................'}
              </div>
              <div style={{ fontSize: '10.5pt', marginTop: '2px' }}>
                ......................................................................................................
              </div>
              <div style={{ marginTop: '8px', textAlign: 'center', lineHeight: '1.25' }}>
                {signatureImg ? (
                  <div style={{ marginBottom: '2px' }}>
                    <img src={signatureImg} alt="ลายเซ็นผู้อำนวยการ" style={{ maxHeight: '42px', margin: '0 auto', display: 'block', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div>(ลงชื่อ)................................................................................</div>
                )}
                <div style={{ marginTop: '2px' }}>(นางสาวภัทรภร หมื่นมะเริง)</div>
                <div style={{ fontSize: '9.5pt' }}>ผู้อำนวยการศูนย์การศึกษาพิเศษประจำจังหวัดปทุมธานี</div>
                <div style={{ marginTop: '2px', fontSize: '9.5pt' }}>
                  {signedAt ? (
                    `วันที่ ${signedDateThai.day} เดือน ${signedDateThai.month} พ.ศ. ${signedDateThai.year}`
                  ) : (
                    'วันที่........../........../..........'
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>


        {/* Attachment Preview Section */}
        {attachmentUrl && (
          <div className="mobile-preview-attachment" style={{ marginTop: '24px', borderTop: '1px solid #ccc', paddingTop: '16px', pageBreakBefore: 'always', breakBefore: 'page' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13pt', marginBottom: '10px' }}>
              📎 เอกสารแนบ (ใบรับรองแพทย์ / หลักฐานประกอบ)
            </div>
            {isImageAttachment ? (
              <div style={{ textAlign: 'center' }}>
                <img
                  src={attachmentUrl}
                  alt="เอกสารแนบ"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    objectFit: 'contain',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    display: 'block',
                    margin: '0 auto'
                  }}
                />
              </div>
            ) : isPdfAttachment ? (
              <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '2rem' }}>📄</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '11.5pt' }}>ไฟล์ PDF แนบมาด้วย</div>
                  <a
                    href={attachmentUrl}
                    download="เอกสารแนบ.pdf"
                    style={{ color: '#2563eb', fontSize: '10.5pt', textDecoration: 'underline' }}
                    className="no-print"
                  >
                    คลิกเพื่อดาวน์โหลดไฟล์ PDF
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '6px', fontSize: '11pt', color: '#555' }}>
                📁 ชื่อไฟล์: {attachmentUrl.replace('file://', '')}
              </div>
            )}
          </div>
        )}

      </div>
      </div>

      {/* Printing Styles Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: #fff !important;
            color: #000 !important;
          }
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0 !important;
            padding: 1.0cm 1.0cm 1.0cm 1.0cm !important;
            width: 100% !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
        .print-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 999;
          overflow-y: auto;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 40px 10px;
        }
        .printable-document {
          box-sizing: border-box;
        }
        .printable-document-frame {
          width: 210mm;
          margin: 20px auto;
        }
        .attachment-viewer {
          position: fixed;
          inset: 0;
          z-index: 2147483200;
          background: rgba(0, 0, 0, 0.86);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .attachment-viewer-panel {
          width: min(960px, 100%);
          max-height: calc(100dvh - 32px);
          background: #fff;
          color: #111;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 16px 50px rgba(0, 0, 0, 0.45);
        }
        .attachment-viewer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          background: #111827;
          color: #fff;
          font-weight: 800;
        }
        .attachment-viewer-header button {
          border: 0;
          border-radius: 8px;
          background: #ef4444;
          color: #fff;
          padding: 8px 12px;
          font-weight: 800;
          cursor: pointer;
        }
        .attachment-viewer-image {
          width: 100%;
          max-height: calc(100dvh - 92px);
          object-fit: contain;
          background: #f8fafc;
        }
        .attachment-viewer-file {
          min-height: 220px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          text-align: center;
          color: #111;
        }
        .attachment-viewer-file a {
          color: #2563eb;
          font-weight: 800;
        }
        @media (max-width: 768px) {
          .print-modal-overlay {
            display: block;
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100dvh !important;
            padding: 12px;
            overflow: hidden;
            -webkit-overflow-scrolling: touch;
            z-index: 2147483000 !important;
          }
          .print-modal-actions {
            position: sticky !important;
            top: 8px !important;
            right: auto !important;
            left: auto !important;
            width: calc(100vw - 16px);
            max-width: 100%;
            margin: 0 auto 8px auto;
            padding: 8px !important;
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px !important;
            border-radius: 10px !important;
          }
          .print-modal-actions span {
            grid-column: 1 / -1;
            font-size: 0.72rem !important;
            line-height: 1.2 !important;
          }
          .print-modal-actions button {
            width: 100%;
            min-height: 38px;
            padding: 6px 8px !important;
            white-space: normal;
            line-height: 1.15;
          }
          .attachment-viewer {
            padding: 8px;
          }
          .attachment-viewer-panel {
            width: calc(100vw - 16px);
            max-height: calc(100dvh - 16px);
            border-radius: 10px;
          }
          .attachment-viewer-image {
            max-height: calc(100dvh - 74px);
          }
          #print-area.printable-document {
            width: 794px !important;
            max-width: none !important;
            min-height: 1123px !important;
            height: 1123px !important;
            margin: 0 !important;
            padding: 46px 44px 34px 44px !important;
            font-size: 15pt !important;
            line-height: 1.22 !important;
            transform: scale(var(--mobile-preview-scale));
            transform-origin: top left;
            background: #fff !important;
            color: #000 !important;
            color-scheme: light !important;
            overflow: hidden !important;
            overflow-wrap: anywhere;
            word-break: normal;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.22) !important;
          }
          .printable-document-frame {
            width: var(--mobile-preview-width);
            max-width: var(--mobile-preview-width);
            height: var(--mobile-preview-height);
            max-height: var(--mobile-preview-height);
            margin: 0 auto;
            overflow: visible;
            position: relative;
            left: 0;
          }
          #print-area *,
          #print-area table,
          #print-area tr,
          #print-area th,
          #print-area td {
            color-scheme: light !important;
          }
          #print-area [style*="font-size: 20pt"] {
            font-size: 18pt !important;
            margin-bottom: 10px !important;
          }
          #print-area [style*="font-size: 16pt"],
          #print-area [style*="font-size: 14pt"],
          #print-area [style*="font-size: 13pt"] {
            font-size: 14pt !important;
          }
          #print-area [style*="marginBottom: '20px'"],
          #print-area [style*="margin-bottom: 20px"] {
            margin-bottom: 10px !important;
          }
          #print-area [style*="display: flex"] {
            flex-wrap: nowrap;
          }
          #print-area table {
            page-break-inside: avoid;
            table-layout: auto;
            width: 100% !important;
          }
          #print-area th,
          #print-area td {
            overflow-wrap: anywhere;
            word-break: normal;
          }
          #print-area img {
            max-width: 100% !important;
            max-height: 260px !important;
            object-fit: contain !important;
          }
          .mobile-preview-attachment {
            display: none !important;
          }
        }
      `}} />
    </div>
  );

  if (typeof document === 'undefined' || !mounted) return null;
  return createPortal(previewModal, document.body);
};

export default PrintableLeavePdf;
