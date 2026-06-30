import React from 'react';

const PrintableDutyPdf = ({ request, onClose }) => {
  const formatDateThai = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const months = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
      ];
      return `${date.getDate()} ${months[date.getMonth()]} พ.ศ. ${date.getFullYear() + 543}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="print-modal-overlay">
      <div className="print-modal-actions no-print" style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        gap: '10px',
        background: 'rgba(0,0,0,0.85)',
        padding: '12px 18px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        alignItems: 'center'
      }}>
        <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>👁️ ตัวอย่างใบขอออกนอกสถานศึกษา</span>
        <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#10b981', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>🖨️ สั่งพิมพ์เอกสาร</button>
        <button onClick={onClose} style={{ padding: '8px 16px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>✕ ปิดตัวอย่าง</button>
      </div>

      <div id="print-area" className="printable-document" style={{
        background: '#fff',
        color: '#000',
        padding: '2.5cm 2.0cm 2.0cm 2.5cm',
        width: '210mm',
        minHeight: '297mm',
        margin: '20px auto',
        fontFamily: '"TH SarabunPSK", "Sarabun", sans-serif',
        fontSize: '16pt',
        lineHeight: '1.3',
        boxShadow: '0 0 10px rgba(0,0,0,0.15)',
        position: 'relative'
      }}>
        
        {/* Header Section */}
        <div style={{ textAlign: 'right', marginBottom: '20px' }}>
          <div>เขียนที่ {request.location || 'ศูนย์การศึกษาพิเศษประจำจังหวัด'}</div>
          <div>วันที่ {formatDateThai(request.created_at || new Date())}</div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <strong>เรื่อง</strong> ขออนุญาตออกนอกสถานที่ราชการ
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <strong>เรียน</strong> ผู้อำนวยการศูนย์การศึกษาพิเศษประจำจังหวัด
        </div>

        {/* Body Section */}
        <div style={{ textIndent: '1.5cm', textAlign: 'justify', marginBottom: '15px' }}>
          ข้าพเจ้า <strong>{request.employee_name}</strong> ตำแหน่ง <strong>{request.position || 'พนักงาน'}</strong>
          {request.department ? <span> สังกัด<strong> {request.department}</strong></span> : null}
          {' '}ปฏิบัติงาน ณ <strong>{request.location || 'ศูนย์การศึกษาพิเศษฯ'}</strong>
          มีความประสงค์ขออนุญาตออกนอกสถานที่ราชการเพื่อเดินทางไปปฏิบัติงานประเภท <strong>{request.duty_type}</strong>
          ณ <strong>{request.destination || '-'}</strong> จังหวัด <strong>{request.province || '-'}</strong>
        </div>

        <div style={{ textIndent: '1.5cm', textAlign: 'justify', marginBottom: '15px' }}>
          วัตถุประสงค์เพื่อ <strong>{request.objective || '-'}</strong>
          ในวันที่ <strong>{formatDateThai(request.duty_date)}</strong>
          ตั้งแต่เวลา <strong>{request.time_out || '00:00'} น.</strong> ถึงเวลาประมาณ <strong>{request.time_in || '00:00'} น.</strong>
          คิดเป็นระยะเวลาประมาณ <strong>{request.hours} ชั่วโมง</strong>
        </div>

        {request.companions && (
          <div style={{ textIndent: '1.5cm', marginBottom: '12px' }}>
            ผู้ร่วมเดินทาง: <strong>{request.companions}</strong>
          </div>
        )}

        <div style={{ textIndent: '1.5cm', marginBottom: '30px' }}>
          ระหว่างออกปฏิบัติงานนอกสถานที่ราชการนี้ สามารถติดต่อได้ที่โทรศัพท์ <strong>{request.phone || '-'}</strong>
          {request.email && request.email !== '-' ? <span> อีเมล <strong>{request.email}</strong></span> : null}
        </div>

        {/* Requester Signature Block */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px', marginRight: '1cm' }}>
          <div style={{ textAlign: 'center', width: '250px' }}>
            <div style={{ marginBottom: '30px' }}>ขอแสดงความนับถือ</div>
            <div>(ลงชื่อ)............................................................ ผู้ขออนุญาต</div>
            <div style={{ marginTop: '5px' }}>({request.employee_name})</div>
          </div>
        </div>

        <hr style={{ border: '0.5px solid #000', margin: '25px 0' }} />

        {/* Split Section: Checklist (Left) & Director Decision (Right) */}
        <div style={{ display: 'flex', width: '100%', gap: '40px', fontSize: '14pt' }}>
          
          {/* Left Side: Stats/Check info */}
          <div style={{ width: '45%', border: '1px solid #000', padding: '12px', borderRadius: '4px' }}>
            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '8px' }}>ข้อมูลประกอบการยื่นขอ</div>
            <div style={{ fontSize: '13pt', lineHeight: '1.5' }}>
              • ประเภทภารกิจ: {request.duty_type}<br />
              • กลุ่มงาน/ฝ่าย: {request.department || '-'}<br />
              • วันที่เดินทาง: {formatDateThai(request.duty_date)}<br />
              • เวลาออก - เวลากลับ: {request.time_out} – {request.time_in} น.<br />
              • รวมเวลานอกพื้นที่: {request.hours} ชั่วโมง
              {request.companions ? <span><br />• ผู้ร่วมเดินทาง: {request.companions}</span> : null}
            </div>
            <div style={{ marginTop: '25px', textAlign: 'center' }}>
              <div>(ลงชื่อ)...................................................... ผู้ตรวจ</div>
              <div style={{ fontSize: '11pt', color: '#555', marginTop: '4px' }}>เจ้าหน้าที่ธุรการ / งานบุคคล</div>
            </div>
          </div>

          {/* Right Side: Director Approval */}
          <div style={{ width: '55%', border: '1px solid #000', padding: '12px', borderRadius: '4px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>คำพิจารณาของผู้อำนวยการ</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ border: '1px solid #000', width: '14px', height: '14px', display: 'inline-block', textAlign: 'center', lineHeight: '10px' }}>
                  {request.status === 'approved' ? '✓' : ''}
                </span>
                <span>อนุญาต</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ border: '1px solid #000', width: '14px', height: '14px', display: 'inline-block', textAlign: 'center', lineHeight: '10px' }}>
                  {request.status === 'rejected' ? '✓' : ''}
                </span>
                <span>ไม่อนุญาต เนื่องจาก..............................................</span>
              </div>
            </div>

            {request.director_comment && (
              <div style={{ marginBottom: '15px', padding: '5px', background: '#f5f5f5', borderRadius: '4px', fontStyle: 'italic', fontSize: '12pt' }}>
                หมายเหตุ: {request.director_comment}
              </div>
            )}

            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <div>(ลงชื่อ).............................................................</div>
              <div style={{ marginTop: '5px' }}>ผู้อำนวยการศูนย์การศึกษาพิเศษประจำจังหวัด</div>
              <div style={{ marginTop: '4px' }}>วันที่......./.............../.......</div>
            </div>
          </div>

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
            padding: 1.5cm 1.5cm 1.5cm 1.5cm !important;
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
      `}} />
    </div>
  );
};

export default PrintableDutyPdf;
