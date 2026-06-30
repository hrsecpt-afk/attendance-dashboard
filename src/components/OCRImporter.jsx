import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';

const OCRImporter = ({ employeesData, onImportData }) => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [rawText, setRawText] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const fileInputRef = useRef(null);

  // Conversion of Thai digits to Arabic digits
  const thaiToArabicDigits = (text) => {
    const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return text.replace(/[๐-๙]/g, (char) => thaiDigits.indexOf(char).toString());
  };

  // Simple similarity score for names
  const findBestEmployeeMatch = (lineText) => {
    if (!lineText) return null;
    const cleanLine = lineText.replace(/\s+/g, '');
    let bestMatch = null;
    let maxScore = 0;

    for (const emp of employeesData) {
      const cleanName = emp.name.replace(/\s+/g, '');
      
      // Exact match or substring
      if (cleanLine.includes(cleanName) || cleanName.includes(cleanLine)) {
        return { employee: emp, score: 1.0 };
      }

      // Overlap score
      let matchCount = 0;
      const chars = cleanName.split('');
      for (const char of chars) {
        if (cleanLine.includes(char)) {
          matchCount++;
        }
      }
      
      const score = matchCount / cleanName.length;
      if (score > 0.65 && score > maxScore) {
        maxScore = score;
        bestMatch = emp;
      }
    }

    return bestMatch ? { employee: bestMatch, score: maxScore } : null;
  };

  // Drag handlers
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
      setupImage(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setupImage(e.target.files[0]);
    }
  };

  const setupImage = (file) => {
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setParsedRows([]);
    setRawText('');
  };

  // Main OCR Execution
  const handleRunOCR = async () => {
    if (!image) return;
    setIsProcessing(true);
    setStatus('กำลังเตรียมการประมวลผล...');
    setProgress(0);

    try {
      const result = await Tesseract.recognize(
        image,
        'tha+eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setStatus(`กำลังอ่านตัวอักษรภาษาไทย...`);
              setProgress(Math.round(m.progress * 100));
            } else if (m.status === 'loading thai language traineddata') {
              setStatus('กำลังโหลดฐานข้อมูลโมเดลภาษาไทย...');
              setProgress(30);
            } else {
              setStatus(m.status);
            }
          }
        }
      );

      const ocrText = result.data.text;
      setRawText(ocrText);
      parseOCRText(ocrText);
      setStatus('เสร็จสิ้นการทำ OCR');
      setProgress(100);
    } catch (err) {
      console.error(err);
      setStatus(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseOCRText = (text) => {
    const lines = text.split('\n');
    const newRows = [];

    lines.forEach((line, idx) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.length < 5) return; // skip noise

      // Match employee
      const match = findBestEmployeeMatch(trimmedLine);
      if (!match) return; // skip if no employee match found

      const emp = match.employee;

      // Extract numbers in Arabic format
      const cleanLine = thaiToArabicDigits(trimmedLine).replace(emp.name, '');
      const numbers = cleanLine.match(/\d+(\.\d+)?/g) || [];

      // Skip the first number if it is close to the employee ID (sequence number in sheet)
      let startIndex = 0;
      if (numbers.length > 0 && Math.abs(parseInt(numbers[0]) - emp.id) <= 2) {
        startIndex = 1;
      }

      const parsedNums = numbers.slice(startIndex).map(Number);

      // Map to columns sequentially
      // Col 0: sick.count, Col 1: sick.days, Col 2: vacation.count, Col 3: vacation.days, Col 4: vacation.remaining,
      // Col 5: personal.count, Col 6: personal.days, Col 7: absent, Col 8-25: special leaves,
      // Col 26: late.count, Col 27: late.days, Col 28: outOfArea.count, Col 29: outOfArea.hours, Col 30: outOfArea.days
      const sickDays = parsedNums[1] !== undefined ? parsedNums[1] : 0;
      const vacationDays = parsedNums[3] !== undefined ? parsedNums[3] : 0;
      const personalDays = parsedNums[6] !== undefined ? parsedNums[6] : 0;
      
      // Absent usually sits at Col 7 in standard sheets
      const absent = parsedNums[7] !== undefined ? parsedNums[7] : 0;

      // Late count is usually Col 26
      const lateCount = parsedNums[26] !== undefined ? parsedNums[26] : 0;

      // Out of area days sits at Col 28 or Col 30
      const outOfAreaDays = parsedNums[30] !== undefined ? parsedNums[30] : parsedNums[28] !== undefined ? parsedNums[28] : 0;

      newRows.push({
        id: emp.id,
        name: emp.name,
        position: emp.position,
        location: emp.location,
        leaves: {
          sick: { count: parsedNums[0] || 0, days: sickDays },
          vacation: { count: parsedNums[2] || 0, days: vacationDays, remaining: parsedNums[4] !== undefined ? parsedNums[4] : (30 - vacationDays) },
          personal: { count: parsedNums[5] || 0, days: personalDays },
          absent: absent,
          maternity: { count: parsedNums[8] || 0, days: parsedNums[9] || 0 },
          wifeAssist: { count: parsedNums[10] || 0, days: parsedNums[11] || 0 },
          ordination: { count: parsedNums[12] || 0, days: parsedNums[13] || 0 },
          military: { count: parsedNums[14] || 0, days: parsedNums[15] || 0 },
          study: { count: parsedNums[16] || 0, days: parsedNums[17] || 0 },
          work: { count: parsedNums[18] || 0, days: parsedNums[19] || 0 },
          follow: { count: parsedNums[20] || 0, days: parsedNums[21] || 0 },
          rehab: { count: parsedNums[22] || 0, days: parsedNums[23] || 0 },
          total: { count: parsedNums[24] || 0, days: parsedNums[25] || (sickDays + vacationDays + personalDays) },
          late: { count: lateCount, days: parsedNums[27] || 0 },
          outOfArea: { count: parsedNums[28] || 0, hours: parsedNums[29] || 0, days: outOfAreaDays }
        },
        rawLine: trimmedLine
      });
    });

    // Sort by original employee ID
    newRows.sort((a, b) => a.id - b.id);
    setParsedRows(newRows);
  };

  const handleRowChange = (index, field, value) => {
    setParsedRows(prev => prev.map((row, i) => {
      if (i !== index) return row;
      
      const newRow = { ...row };
      const parsedVal = parseFloat(value) || 0;

      if (field === 'name') {
        const found = employeesData.find(e => e.name === value);
        if (found) {
          newRow.id = found.id;
          newRow.name = found.name;
          newRow.position = found.position;
          newRow.location = found.location;
        }
      } else if (field === 'sickDays') {
        newRow.leaves.sick.days = parsedVal;
      } else if (field === 'vacationDays') {
        newRow.leaves.vacation.days = parsedVal;
        newRow.leaves.vacation.remaining = 30 - parsedVal;
      } else if (field === 'personalDays') {
        newRow.leaves.personal.days = parsedVal;
      } else if (field === 'absent') {
        newRow.leaves.absent = parsedVal;
      } else if (field === 'lateCount') {
        newRow.leaves.late.count = parsedVal;
      } else if (field === 'outOfAreaDays') {
        newRow.leaves.outOfArea.days = parsedVal;
      }

      // Re-sum total days
      const l = newRow.leaves;
      l.total.days = parseFloat((l.sick.days + l.vacation.days + l.personal.days + l.absent).toFixed(1));
      l.total.count = Math.round(l.sick.count + l.vacation.count + l.personal.count);

      return newRow;
    }));
  };

  const handleAddRow = () => {
    if (employeesData.length === 0) return;
    const defaultEmp = employeesData[0];
    setParsedRows(prev => [...prev, {
      id: defaultEmp.id,
      name: defaultEmp.name,
      position: defaultEmp.position,
      location: defaultEmp.location,
      leaves: {
        sick: { count: 0, days: 0 },
        vacation: { count: 0, days: 0, remaining: 30 },
        personal: { count: 0, days: 0 },
        absent: 0,
        maternity: { count: 0, days: 0 },
        wifeAssist: { count: 0, days: 0 },
        ordination: { count: 0, days: 0 },
        military: { count: 0, days: 0 },
        study: { count: 0, days: 0 },
        work: { count: 0, days: 0 },
        follow: { count: 0, days: 0 },
        rehab: { count: 0, days: 0 },
        total: { count: 0, days: 0 },
        late: { count: 0, days: 0 },
        outOfArea: { count: 0, hours: 0, days: 0 }
      },
      rawLine: 'เพิ่มข้อมูลด้วยตัวเอง'
    }]);
  };

  const handleRemoveRow = (index) => {
    setParsedRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveAll = () => {
    if (parsedRows.length === 0) return;
    onImportData(parsedRows);
    setParsedRows([]);
    setImage(null);
    setImagePreview('');
    setStatus('💾 นำเข้าและบันทึกสถิติเรียบร้อยแล้ว!');
    setProgress(0);
  };

  const triggerInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>📷 นำเข้าสถิติการลาด้วยการสแกนรูปภาพ (OCR)</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            สแกนตารางสถิติลาป่วย, ลาพักผ่อน, ลากิจ, ขาด หรือสาย ภาษาไทยได้ทันทีจากภาพถ่าย
          </p>
        </div>
        {rawText && (
          <button 
            onClick={() => setShowRawText(!showRawText)}
            style={{
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            {showRawText ? '🙈 ซ่อนข้อความดิบ' : '👁️ ดูข้อความดิบ'}
          </button>
        )}
      </div>

      {/* Drag and Drop Area */}
      {!imagePreview && (
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerInput}
          style={{
            border: '2px dashed var(--border-color)',
            borderRadius: '16px',
            padding: '40px 20px',
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
            accept="image/*"
            onChange={handleFileChange}
          />
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📸</div>
          <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>
            วางรูปภาพตารางสถิติที่นี่ หรือคลิกเพื่ออัปโหลด
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            รองรับไฟล์ภาพ JPG, PNG, JPEG ความคมชัดปานกลางถึงสูง
          </p>
        </div>
      )}

      {/* OCR Status/Progress Panel */}
      {imagePreview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {/* Image Preview Window */}
            <div className="glass-panel" style={{ flex: '1', minWidth: '280px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.1)' }}>
              <img 
                src={imagePreview} 
                alt="Upload Preview" 
                style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: '8px' }} 
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', width: '100%' }}>
                <button
                  disabled={isProcessing}
                  onClick={() => { setImage(null); setImagePreview(''); setParsedRows([]); setRawText(''); }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: 'var(--red)',
                    borderRadius: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.82rem'
                  }}
                >
                  ❌ ยกเลิกรูปนี้
                </button>
                <button
                  disabled={isProcessing}
                  onClick={handleRunOCR}
                  className="glow-button"
                  style={{
                    flex: 2,
                    padding: '10px',
                    justifyContent: 'center',
                    fontSize: '0.82rem'
                  }}
                >
                  🚀 {isProcessing ? 'กำลังสแกน...' : 'เริ่มสแกนรูปภาพ (OCR)'}
                </button>
              </div>
            </div>

            {/* OCR Progress Information */}
            {(isProcessing || progress > 0 || status) && (
              <div className="glass-panel" style={{ flex: '1', minWidth: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px' }}>
                <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '8px' }}>สถานะการประมวลผล OCR:</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '12px' }}>
                  {status}
                </p>
                {progress > 0 && progress < 100 && (
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                      <span>ความคืบหน้า</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="progress-bar-container" style={{ height: '8px' }}>
                      <div className="progress-bar-fill" style={{ width: `${progress}%`, background: 'var(--primary)' }}></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Raw Text Output Log (collapsible) */}
          {showRawText && rawText && (
            <div className="glass-panel" style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>ข้อความสแกนดิบที่ตรวจพบ (Raw OCR Output):</h4>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-main)', maxHeight: '150px', overflowY: 'auto' }}>
                {rawText}
              </pre>
            </div>
          )}

          {/* Parsed Verification Table */}
          {parsedRows.length > 0 && (
            <div className="glass-panel animate-fade-in" style={{ padding: '20px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--green)' }}>🔍 ผลการสแกนและจับคู่พนักงาน ({parsedRows.length} รายการ)</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    โปรดตรวจสอบความถูกต้องและแก้ไขข้อมูลวันลาในช่องตารางก่อนกดยืนยันบันทึกข้อมูลเข้าสู่ระบบ
                  </p>
                </div>
                <button
                  onClick={handleAddRow}
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(159, 122, 234, 0.08)',
                    border: '1px solid rgba(159, 122, 234, 0.2)',
                    color: 'var(--primary)',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  ➕ เพิ่มพนักงานด้วยมือ
                </button>
              </div>

              <div className="table-wrapper">
                <table className="employee-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>ชื่อพนักงาน</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>ป่วย (วัน)</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>พักผ่อน (วัน)</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>กิจ (วัน)</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>ขาด (วัน)</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>สาย (ครั้ง)</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>ออกพื้นที่ (วัน)</th>
                      <th style={{ width: '150px' }}>บรรทัดที่สแกนได้จากรูป</th>
                      <th style={{ width: '50px', textAlign: 'center' }}>ลบ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} style={{ cursor: 'default' }}>
                        <td>
                          <select
                            className="select-input"
                            value={row.name}
                            onChange={(e) => handleRowChange(idx, 'name', e.target.value)}
                            style={{
                              padding: '6px',
                              fontSize: '0.8rem',
                              width: '100%',
                              minWidth: '150px',
                              background: 'var(--bg-dark)',
                              borderColor: 'var(--border-color)',
                              borderRadius: '6px'
                            }}
                          >
                            {employeesData.map(e => (
                              <option key={e.id} value={e.name}>
                                {e.name} ({e.position})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            step="0.5"
                            value={row.leaves.sick.days}
                            onChange={(e) => handleRowChange(idx, 'sickDays', e.target.value)}
                            style={{ width: '50px', textAlign: 'center', padding: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--cyan)', fontWeight: 'bold' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            step="0.5"
                            value={row.leaves.vacation.days}
                            onChange={(e) => handleRowChange(idx, 'vacationDays', e.target.value)}
                            style={{ width: '50px', textAlign: 'center', padding: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--primary)', fontWeight: 'bold' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            step="0.5"
                            value={row.leaves.personal.days}
                            onChange={(e) => handleRowChange(idx, 'personalDays', e.target.value)}
                            style={{ width: '50px', textAlign: 'center', padding: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--yellow)', fontWeight: 'bold' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            step="1"
                            value={row.leaves.absent}
                            onChange={(e) => handleRowChange(idx, 'absent', e.target.value)}
                            style={{ width: '50px', textAlign: 'center', padding: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--red)', fontWeight: 'bold' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            step="1"
                            value={row.leaves.late.count}
                            onChange={(e) => handleRowChange(idx, 'lateCount', e.target.value)}
                            style={{ width: '50px', textAlign: 'center', padding: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--yellow)', fontWeight: 'bold' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            step="1"
                            value={row.leaves.outOfArea.days}
                            onChange={(e) => handleRowChange(idx, 'outOfAreaDays', e.target.value)}
                            style={{ width: '50px', textAlign: 'center', padding: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--green)', fontWeight: 'bold' }}
                          />
                        </td>
                        <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>
                          {row.rawLine}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => handleRemoveRow(idx)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--red)',
                              cursor: 'pointer',
                              fontSize: '1.1rem'
                            }}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button
                  onClick={() => setParsedRows([])}
                  style={{
                    padding: '10px 18px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  ล้างรายการทั้งหมด
                </button>
                <button
                  onClick={handleSaveAll}
                  className="glow-button"
                  style={{
                    padding: '10px 22px',
                    fontSize: '0.85rem'
                  }}
                >
                  💾 บันทึกข้อมูลที่ตรวจสอบแล้ว
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OCRImporter;
