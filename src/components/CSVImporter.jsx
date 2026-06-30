import React, { useState, useRef } from 'react';

const CSVImporter = ({ onImportData }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const processFile = (file) => {
    setError('');
    setSuccess('');
    
    if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
      setError('❌ โปรดเลือกไฟล์ประเภท CSV เท่านั้น');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n');
        
        let csvStartIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('ลำดับ,ชื่อ - สกุล')) {
            csvStartIndex = i;
            break;
          }
        }

        if (csvStartIndex === -1) {
          setError('❌ รูปแบบไฟล์ไม่ถูกต้อง: ไม่พบแถวหัวตาราง "ลำดับ,ชื่อ - สกุล"');
          return;
        }

        const dataLines = lines.slice(csvStartIndex + 1);
        const parsedRecords = [];

        for (const line of dataLines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === ',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,') continue;
          
          const values = trimmed.split(',');
          if (values.length < 4) continue;
          
          const record = {
            id: parseInt(values[0]) || parsedRecords.length + 1,
            name: values[1].trim(),
            position: values[2].trim(),
            location: values[3].trim(),
            leaves: {
              sick: { count: parseFloat(values[4]) || 0, days: parseFloat(values[5]) || 0 },
              vacation: { count: parseFloat(values[6]) || 0, days: parseFloat(values[7]) || 0, remaining: parseFloat(values[8]) || 0 },
              personal: { count: parseFloat(values[9]) || 0, days: parseFloat(values[10]) || 0 },
              absent: parseFloat(values[11]) || 0,
              maternity: { count: parseFloat(values[12]) || 0, days: parseFloat(values[13]) || 0 },
              wifeAssist: { count: parseFloat(values[14]) || 0, days: parseFloat(values[15]) || 0 },
              ordination: { count: parseFloat(values[16]) || 0, days: parseFloat(values[17]) || 0 },
              military: { count: parseFloat(values[18]) || 0, days: parseFloat(values[19]) || 0 },
              study: { count: parseFloat(values[20]) || 0, days: parseFloat(values[21]) || 0 },
              work: { count: parseFloat(values[22]) || 0, days: parseFloat(values[23]) || 0 },
              follow: { count: parseFloat(values[24]) || 0, days: parseFloat(values[25]) || 0 },
              rehab: { count: parseFloat(values[26]) || 0, days: parseFloat(values[27]) || 0 },
              total: { count: parseFloat(values[28]) || 0, days: parseFloat(values[29]) || 0 },
              late: { count: parseFloat(values[30]) || 0, days: parseFloat(values[31]) || 0 },
              outOfArea: { count: parseFloat(values[32]) || 0, hours: parseFloat(values[33]) || 0, days: parseFloat(values[34]) || 0 }
            }
          };
          
          parsedRecords.push(record);
        }

        if (parsedRecords.length === 0) {
          setError('❌ ไม่พบข้อมูลรายชื่อพนักงานในไฟล์ CSV');
          return;
        }

        onImportData(parsedRecords);
        setSuccess(`✅ นำเข้าข้อมูลสำเร็จ: โหลดรายชื่อพนักงานแล้ว ${parsedRecords.length} คน`);
      } catch (err) {
        setError(`❌ เกิดข้อผิดพลาดในการประมวลผลไฟล์: ${err.message}`);
      }
    };
    reader.onerror = () => {
      setError('❌ เกิดข้อผิดพลาดในการอ่านไฟล์');
    };
    reader.readAsText(file);
  };

  const triggerInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '20px', marginBottom: '24px' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>📊 นำเข้าสถิติการลาชุดใหม่</h3>
      
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerInput}
        style={{
          border: '2px dashed var(--border-color)',
          borderRadius: '12px',
          padding: '30px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragActive ? 'rgba(159, 122, 234, 0.05)' : 'transparent',
          borderColor: dragActive ? 'var(--primary)' : 'var(--border-color)',
          transition: 'var(--transition-smooth)'
        }}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          style={{ display: 'none' }} 
          accept=".csv"
          onChange={handleChange}
        />
        
        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📁</div>
        <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
          ลากไฟล์ CSV มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          รองรับเฉพาะไฟล์ CSV ที่ส่งออกจาก Google Sheets สถิติการลาเท่านั้น
        </p>
      </div>

      {error && (
        <div style={{
          marginTop: '12px',
          padding: '10px 14px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          color: 'var(--red)',
          fontSize: '0.85rem',
          fontWeight: 500
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          marginTop: '12px',
          padding: '10px 14px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '8px',
          color: 'var(--green)',
          fontSize: '0.85rem',
          fontWeight: 500
        }}>
          {success}
        </div>
      )}
    </div>
  );
};

export default CSVImporter;
