import React from 'react';

const PrintableLeavePdf = ({ request, onClose }) => {
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

  const isVacation = request.leave_type?.startsWith('ลาพักผ่อน');

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
        <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>👁️ ตัวอย่างใบลาขออนุมัติออนไลน์</span>
        <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#10b981', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>🖨️ สั่งพิมพ์ใบลา</button>
        <button onClick={onClose} style={{ padding: '8px 16px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>✕ ปิดตัวอย่าง</button>
      </div>

      <div id="print-area" className="printable-document" style={{
        background: '#fff',
        color: '#000',
        padding: '2.0cm 2.0cm 2.0cm 2.0cm',
        width: '210mm',
        minHeight: '297mm',
        margin: '20px auto',
        fontFamily: '"TH SarabunPSK", "Sarabun", sans-serif',
        fontSize: '16pt',
        lineHeight: '1.25',
        boxShadow: '0 0 10px rgba(0,0,0,0.15)',
        position: 'relative',
        boxSizing: 'border-box'
      }}>
        
        {/* Document Title */}
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '20pt', marginBottom: '15px', textDecoration: 'underline' }}>
          {isVacation ? 'ใบลาพักผ่อน' : 'ใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว'}
        </div>

        {/* Written At and Date Block */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginBottom: '20px' }}>
          <div style={{ width: '280px' }}>เขียนที่ ศูนย์การศึกษาพิเศษ ประจำจังหวัดปทุมธานี</div>
          <div style={{ width: '280px', display: 'flex', justifyContent: 'flex-start', gap: '4px' }}>
            วันที่ <span style={{ borderBottom: '1px dotted #000', minWidth: '35px', textAlign: 'center' }}>{docDate.day}</span> 
            เดือน <span style={{ borderBottom: '1px dotted #000', minWidth: '80px', textAlign: 'center' }}>{docDate.month}</span> 
            พ.ศ. <span style={{ borderBottom: '1px dotted #000', minWidth: '50px', textAlign: 'center' }}>{docDate.year}</span>
          </div>
        </div>

        {/* Subject & To Block */}
        <div style={{ marginBottom: '12px' }}>
          <strong>เรื่อง</strong> {isVacation ? 'ขอลาพักผ่อน' : `ขอลา${request.leave_type}`}
        </div>
        <div style={{ marginBottom: '18px' }}>
          <strong>เรียน</strong> ผู้อำนวยการศูนย์การศึกษาพิเศษ ประจำจังหวัดปทุมธานี
        </div>

        {/* Form Body Context */}
        {isVacation ? (
          /* VACATION LEAVE FORM CONTENT */
          <div style={{ textAlign: 'justify', textIndent: '1.5cm', marginBottom: '15px', lineHeight: '1.3' }}>
            ข้าพเจ้า <span style={{ borderBottom: '1px dotted #000', minWidth: '150px', display: 'inline-block', textAlign: 'center', fontWeight: 'bold' }}>{request.employee_name}</span> 
            ตำแหน่ง <span style={{ borderBottom: '1px dotted #000', minWidth: '120px', display: 'inline-block', textAlign: 'center' }}>{request.position || 'พนักงาน'}</span> 
            สังกัด <span style={{ borderBottom: '1px dotted #000', minWidth: '220px', display: 'inline-block', textAlign: 'center' }}>ศูนย์การศึกษาพิเศษ ประจำจังหวัดปทุมธานี สำนักบริหารงานการศึกษาพิเศษ</span>
            <br />
            มีวันลาพักผ่อนสะสมปี 2568 <span style={{ borderBottom: '1px dotted #000', minWidth: '40px', display: 'inline-block', textAlign: 'center', fontWeight: 'bold' }}>{request.vacation_accumulated || 0}</span> วันทำการ 
            มีสิทธิ์วันลาพักผ่อนปี 2569 <span style={{ borderBottom: '1px dotted #000', minWidth: '40px', display: 'inline-block', textAlign: 'center', fontWeight: 'bold' }}>{request.vacation_quota_current_year || 10}</span> วันทำการ 
            รวมวันลาพักผ่อนทั้งหมด <span style={{ borderBottom: '1px dotted #000', minWidth: '40px', display: 'inline-block', textAlign: 'center', fontWeight: 'bold' }}>{request.vacation_quota_total || 10}</span> วันทำการ
            <br />
            ลาพักผ่อนมาแล้ว <span style={{ borderBottom: '1px dotted #000', minWidth: '40px', display: 'inline-block', textAlign: 'center', fontWeight: 'bold' }}>{request.vacation_taken || 0}</span> วันทำการ 
            สิทธิ์วันลาพักผ่อนคงเหลือปี 2569 <span style={{ borderBottom: '1px dotted #000', minWidth: '40px', display: 'inline-block', textAlign: 'center', fontWeight: 'bold' }}>{request.vacation_remaining || 0}</span> วันทำการ
            <br />
            ขอลาพักผ่อนตั้งแต่วันที่ <span style={{ borderBottom: '1px dotted #000', minWidth: '35px', display: 'inline-block', textAlign: 'center' }}>{startDateThai.day}</span> 
            เดือน <span style={{ borderBottom: '1px dotted #000', minWidth: '70px', display: 'inline-block', textAlign: 'center' }}>{startDateThai.month}</span> 
            พ.ศ. <span style={{ borderBottom: '1px dotted #000', minWidth: '50px', display: 'inline-block', textAlign: 'center' }}>{startDateThai.year}</span>
            ถึงวันที่ <span style={{ borderBottom: '1px dotted #000', minWidth: '35px', display: 'inline-block', textAlign: 'center' }}>{endDateThai.day}</span> 
            เดือน <span style={{ borderBottom: '1px dotted #000', minWidth: '70px', display: 'inline-block', textAlign: 'center' }}>{endDateThai.month}</span> 
            พ.ศ. <span style={{ borderBottom: '1px dotted #000', minWidth: '50px', display: 'inline-block', textAlign: 'center' }}>{endDateThai.year}</span>
            มีกำหนด <span style={{ borderBottom: '1px dotted #000', minWidth: '40px', display: 'inline-block', textAlign: 'center', fontWeight: 'bold' }}>{request.days}</span> วัน
          </div>
        ) : (
          /* SICK/PERSONAL/MATERNITY LEAVE FORM CONTENT */
          <div style={{ textAlign: 'justify', textIndent: '1.5cm', marginBottom: '15px', lineHeight: '1.3' }}>
            ข้าพเจ้า <span style={{ borderBottom: '1px dotted #000', minWidth: '150px', display: 'inline-block', textAlign: 'center', fontWeight: 'bold' }}>{request.employee_name}</span> 
            ตำแหน่ง <span style={{ borderBottom: '1px dotted #000', minWidth: '120px', display: 'inline-block', textAlign: 'center' }}>{request.position || 'พนักงาน'}</span> 
            สังกัด <span style={{ borderBottom: '1px dotted #000', minWidth: '220px', display: 'inline-block', textAlign: 'center' }}>ศูนย์การศึกษาพิเศษ ประจำจังหวัดปทุมธานี สำนักบริหารงานการศึกษาพิเศษ</span>
            <br />
            ขอลา &nbsp;
            <span style={{ fontSize: '12pt', border: '1px solid #000', padding: '0 4px', marginRight: '4px', verticalAlign: 'middle' }}>
              {request.leave_type?.startsWith('ลาป่วย') ? '✓' : ' '}
            </span> ป่วย เนื่องจาก <span style={{ borderBottom: '1px dotted #000', minWidth: '220px', display: 'inline-block', textAlign: 'center' }}>{request.leave_type?.startsWith('ลาป่วย') ? request.reason : '..........................................................'}</span>
            <br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            <span style={{ fontSize: '12pt', border: '1px solid #000', padding: '0 4px', marginRight: '4px', verticalAlign: 'middle' }}>
              {request.leave_type?.startsWith('ลากิจ') ? '✓' : ' '}
            </span> กิจส่วนตัว เนื่องจาก <span style={{ borderBottom: '1px dotted #000', minWidth: '220px', display: 'inline-block', textAlign: 'center' }}>{request.leave_type?.startsWith('ลากิจ') ? request.reason : '..........................................................'}</span>
            <br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            <span style={{ fontSize: '12pt', border: '1px solid #000', padding: '0 4px', marginRight: '4px', verticalAlign: 'middle' }}>
              {request.leave_type?.startsWith('ลาคลอด') ? '✓' : ' '}
            </span> คลอดบุตร
            <br />
            ตั้งแต่วันที่ <span style={{ borderBottom: '1px dotted #000', minWidth: '35px', display: 'inline-block', textAlign: 'center' }}>{startDateThai.day}</span> 
            เดือน <span style={{ borderBottom: '1px dotted #000', minWidth: '70px', display: 'inline-block', textAlign: 'center' }}>{startDateThai.month}</span> 
            พ.ศ. <span style={{ borderBottom: '1px dotted #000', minWidth: '50px', display: 'inline-block', textAlign: 'center' }}>{startDateThai.year}</span>
            ถึงวันที่ <span style={{ borderBottom: '1px dotted #000', minWidth: '35px', display: 'inline-block', textAlign: 'center' }}>{endDateThai.day}</span> 
            เดือน <span style={{ borderBottom: '1px dotted #000', minWidth: '70px', display: 'inline-block', textAlign: 'center' }}>{endDateThai.month}</span> 
            พ.ศ. <span style={{ borderBottom: '1px dotted #000', minWidth: '50px', display: 'inline-block', textAlign: 'center' }}>{endDateThai.year}</span>
            มีกำหนด <span style={{ borderBottom: '1px dotted #000', minWidth: '40px', display: 'inline-block', textAlign: 'center', fontWeight: 'bold' }}>{request.days}</span> วัน
            <br />
            และข้าพเจ้าได้ลา &nbsp;
            <span style={{ fontSize: '12pt', border: '1px solid #000', padding: '0 4px', marginRight: '4px', verticalAlign: 'middle' }}>
              {request.last_leave_type === 'ป่วย' ? '✓' : ' '}
            </span> ป่วย &nbsp;&nbsp;&nbsp;&nbsp;
            <span style={{ fontSize: '12pt', border: '1px solid #000', padding: '0 4px', marginRight: '4px', verticalAlign: 'middle' }}>
              {request.last_leave_type === 'กิจส่วนตัว' ? '✓' : ' '}
            </span> กิจส่วนตัว &nbsp;&nbsp;&nbsp;&nbsp;
            <span style={{ fontSize: '12pt', border: '1px solid #000', padding: '0 4px', marginRight: '4px', verticalAlign: 'middle' }}>
              {request.last_leave_type === 'คลอดบุตร' ? '✓' : ' '}
            </span> คลอดบุตร ครั้งสุดท้าย
            <br />
            ตั้งแต่วันที่ <span style={{ borderBottom: '1px dotted #000', minWidth: '35px', display: 'inline-block', textAlign: 'center' }}>{lastStartThai.day}</span> 
            เดือน <span style={{ borderBottom: '1px dotted #000', minWidth: '70px', display: 'inline-block', textAlign: 'center' }}>{lastStartThai.month}</span> 
            พ.ศ. <span style={{ borderBottom: '1px dotted #000', minWidth: '50px', display: 'inline-block', textAlign: 'center' }}>{lastStartThai.year}</span>
            ถึงวันที่ <span style={{ borderBottom: '1px dotted #000', minWidth: '35px', display: 'inline-block', textAlign: 'center' }}>{lastEndThai.day}</span> 
            เดือน <span style={{ borderBottom: '1px dotted #000', minWidth: '70px', display: 'inline-block', textAlign: 'center' }}>{lastEndThai.month}</span> 
            พ.ศ. <span style={{ borderBottom: '1px dotted #000', minWidth: '50px', display: 'inline-block', textAlign: 'center' }}>{lastEndThai.year}</span>
            มีกำหนด <span style={{ borderBottom: '1px dotted #000', minWidth: '40px', display: 'inline-block', textAlign: 'center', fontWeight: 'bold' }}>{request.last_leave_days || ' - '}</span> วัน
          </div>
        )}

        {/* Contact address & phone block */}
        <div style={{ textIndent: '1.5cm', marginBottom: '25px', lineHeight: '1.3' }}>
          ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ <span style={{ borderBottom: '1px dotted #000', minWidth: '420px', display: 'inline-block', paddingLeft: '4px' }}>{request.address || '-'}</span>
          <br />
          หมายเลขโทรศัพท์ <span style={{ borderBottom: '1px dotted #000', minWidth: '220px', display: 'inline-block', paddingLeft: '4px' }}>{request.phone || '-'}</span>
        </div>

        {/* Requester Signature Block */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '35px', marginRight: '1cm' }}>
          <div style={{ textAlign: 'center', width: '250px' }}>
            <div style={{ marginBottom: '25px' }}>ขอแสดงความนับถือ</div>
            <div>(ลงชื่อ)............................................................</div>
            <div style={{ marginTop: '5px' }}>({request.employee_name})</div>
          </div>
        </div>

        <hr style={{ border: '0.5px solid #000', margin: '20px 0' }} />

        {/* Split Section: Leave Stats (Left) & Director Decision (Right) */}
        <div style={{ display: 'flex', width: '100%', gap: '40px', fontSize: '13pt', lineHeight: '1.3' }}>
          
          {/* Left Side: Stats Check */}
          <div style={{ width: '45%', border: '1px solid #000', padding: '12px', borderRadius: '4px' }}>
            {isVacation ? (
              /* Vacation Left Side Stats display */
              <div>
                <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '8px' }}>สถิติการลาพักผ่อนในงบประมาณนี้</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12pt' }}>
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
              <div>
                <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '8px' }}>สถิติการลาในปีงบประมาณนี้</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '11pt' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <th style={{ textAlign: 'left', padding: '2px' }}>ประเภทลา</th>
                      <th>ลามาแล้ว</th>
                      <th>ลาครั้งนี้</th>
                      <th>รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '0.5px solid #ccc' }}>
                      <td style={{ textAlign: 'left', padding: '2px' }}>ป่วย</td>
                      <td>{request.leave_type === 'ลาป่วย' ? request.last_leave_days || 0 : 0} วัน</td>
                      <td>{request.leave_type === 'ลาป่วย' ? request.days : 0} วัน</td>
                      <td>{request.leave_type === 'ลาป่วย' ? (parseFloat(request.last_leave_days || 0) + parseFloat(request.days)) : 0} วัน</td>
                    </tr>
                    <tr style={{ borderBottom: '0.5px solid #ccc' }}>
                      <td style={{ textAlign: 'left', padding: '2px' }}>กิจส่วนตัว</td>
                      <td>{request.leave_type === 'ลากิจ' ? request.last_leave_days || 0 : 0} วัน</td>
                      <td>{request.leave_type === 'ลากิจ' ? request.days : 0} วัน</td>
                      <td>{request.leave_type === 'ลากิจ' ? (parseFloat(request.last_leave_days || 0) + parseFloat(request.days)) : 0} วัน</td>
                    </tr>
                    <tr style={{ borderBottom: '0.5px solid #ccc' }}>
                      <td style={{ textAlign: 'left', padding: '2px' }}>คลอดบุตร</td>
                      <td>{request.leave_type === 'ลาคลอด' ? request.last_leave_days || 0 : 0} วัน</td>
                      <td>{request.leave_type === 'ลาคลอด' ? request.days : 0} วัน</td>
                      <td>{request.leave_type === 'ลาคลอด' ? (parseFloat(request.last_leave_days || 0) + parseFloat(request.days)) : 0} วัน</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <div>(ลงชื่อ)...................................................... ผู้ตรวจ</div>
              <div style={{ fontSize: '10.5pt', color: '#444', marginTop: '4px' }}>เจ้าหน้าที่งานข้อมูล/สารสนเทศงานบุคคล</div>
            </div>
          </div>

          {/* Right Side: Director Approval */}
          <div style={{ width: '55%', border: '1px solid #000', padding: '12px', borderRadius: '4px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>คำสั่งผู้อำนวยการ</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ border: '1px solid #000', width: '15px', height: '15px', display: 'inline-block', textAlign: 'center', lineHeight: '11px', fontWeight: 'bold' }}>
                  {request.status === 'approved' ? '✓' : ''}
                </span>
                <span>อนุมัติ</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ border: '1px solid #000', width: '15px', height: '15px', display: 'inline-block', textAlign: 'center', lineHeight: '11px', fontWeight: 'bold' }}>
                  {request.status === 'rejected' ? '✓' : ''}
                </span>
                <span>ไม่อนุมัติ เนื่องจาก..............................................</span>
              </div>
            </div>

            {request.director_comment && (
              <div style={{ marginBottom: '10px', padding: '6px', background: '#f5f5f5', borderRadius: '4px', fontStyle: 'italic', fontSize: '11.5pt' }}>
                หมายเหตุ ผอ.: {request.director_comment}
              </div>
            )}

            <div style={{ marginTop: '25px', textAlign: 'center' }}>
              <div>(ลงชื่อ).............................................................</div>
              <div style={{ marginTop: '5px' }}>ผู้อำนวยการศูนย์การศึกษาพิเศษประจำจังหวัดปทุมธานี</div>
              <div style={{ marginTop: '4px' }}>วันที่......./.............../.......</div>
            </div>
          </div>

        </div>

        {/* Attachment Preview Section */}
        {request.attachment_url && (
          <div style={{ marginTop: '24px', borderTop: '1px solid #ccc', paddingTop: '16px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13pt', marginBottom: '10px' }}>
              📎 เอกสารแนบ (ใบรับรองแพทย์ / หลักฐานประกอบ)
            </div>
            {request.attachment_url.startsWith('data:image') ? (
              <div style={{ textAlign: 'center' }}>
                <img
                  src={request.attachment_url}
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
            ) : request.attachment_url.startsWith('data:application/pdf') ? (
              <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '2rem' }}>📄</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '11.5pt' }}>ไฟล์ PDF แนบมาด้วย</div>
                  <a
                    href={request.attachment_url}
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
                📁 ชื่อไฟล์: {request.attachment_url.replace('file://', '')}
              </div>
            )}
          </div>
        )}

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
      `}} />
    </div>
  );
};

export default PrintableLeavePdf;
