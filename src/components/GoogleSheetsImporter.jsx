import React, { useState, useEffect } from 'react';

const GoogleSheetsImporter = ({ onImportData, employeesData }) => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Data states
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [showMapping, setShowMapping] = useState(false);
  const [employeesPreview, setEmployeesPreview] = useState([]);

  // Column Mapping states
  const [mapping, setMapping] = useState({
    idCol: '',
    nameCol: '',
    positionCol: '',
    locationCol: '',
    sickDaysCol: '',
    personalDaysCol: '',
    vacationDaysCol: '',
    vacationRemainingCol: '',
    absentCol: '',
    lateCol: ''
  });

  // Supabase Sync states
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseTable, setSupabaseTable] = useState('employees');
  const [showSupabaseConfig, setShowSupabaseConfig] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);

  // Supabase Column Mapping states
  const [supabaseColumns, setSupabaseColumns] = useState({
    id: 'id',
    fullName: 'full_name',
    position: 'position',
    location: 'location'
  });

  // Load saved Supabase config on mount
  useEffect(() => {
    const saved = localStorage.getItem('attendance_dashboard_supabase_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.url) setSupabaseUrl(parsed.url);
        if (parsed.key) setSupabaseKey(parsed.key);
        // Load table name if saved, otherwise default to 'employees'
        if (parsed.employeesTable) {
          setSupabaseTable(parsed.employeesTable);
        }
        if (parsed.supabaseColumns) {
          setSupabaseColumns(prev => ({ ...prev, ...parsed.supabaseColumns }));
        }
      } catch (e) {
        console.error("Failed to load Supabase config in importer", e);
      }
    }
  }, []);

  // helper to parse CSV with standard state machine (handles quotes, commas, newlines)
  const parseCSV = (csvText) => {
    const lines = [];
    let line = [];
    let field = '';
    let inQuotes = false;
    
    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          field += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        line.push(field.trim());
        field = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
        line.push(field.trim());
        lines.push(line);
        line = [];
        field = '';
      } else {
        field += char;
      }
    }
    if (field || line.length > 0) {
      line.push(field.trim());
      lines.push(line);
    }
    return lines.filter(l => l.length > 0 && l.some(cell => cell !== ''));
  };

  // Convert sharing Google Sheets link to CSV export URL
  const getExportUrl = (url) => {
    try {
      const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!sheetIdMatch) return null;
      const sheetId = sheetIdMatch[1];
      
      let gid = '';
      const gidMatch = url.match(/[#?&]gid=([0-9]+)/);
      if (gidMatch) {
        gid = gidMatch[1];
      }
      
      let csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      if (gid) {
        csvUrl += `&gid=${gid}`;
      }
      return csvUrl;
    } catch (e) {
      return null;
    }
  };

  // Fetch Google Sheets and parse
  const handleFetchSheet = async () => {
    setError('');
    setSuccess('');
    setCsvData([]);
    setHeaders([]);
    setShowMapping(false);
    setEmployeesPreview([]);

    if (!sheetUrl.trim()) {
      setError('❌ โปรดระบุลิงก์ Google Sheets');
      return;
    }

    const exportUrl = getExportUrl(sheetUrl);
    if (!exportUrl) {
      setError('❌ รูปแบบลิงก์ Google Sheets ไม่ถูกต้อง โปรดตรวจสอบว่ามี "/d/SPREADSHEET_ID" อยู่ในลิงก์');
      return;
    }

    setLoading(true);
    try {
      // Fetching the published sheet
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error(`ไม่สามารถดาวน์โหลดข้อมูลได้ (HTTP Status: ${response.status}) โปรดแชร์ลิงก์เป็นสาธารณะหรือเลือก Publish to web`);
      }
      
      const csvText = await response.text();
      const parsedLines = parseCSV(csvText);
      
      if (parsedLines.length === 0) {
        throw new Error('ไม่พบข้อมูลใดๆ ใน Google Sheets');
      }

      const fileHeaders = parsedLines[0];
      setHeaders(fileHeaders);
      setCsvData(parsedLines);
      
      // Auto-detect columns mapping
      const detected = { 
        idCol: '', nameCol: '', positionCol: '', locationCol: '',
        sickDaysCol: '', personalDaysCol: '', vacationDaysCol: '', vacationRemainingCol: '',
        absentCol: '', lateCol: ''
      };
      
      fileHeaders.forEach((header) => {
        const h = header.toLowerCase().trim();
        if (!detected.idCol && (h.includes('ลำดับ') || h.includes('รหัส') || h.includes('id') || h.includes('code') || h === 'no')) {
          detected.idCol = header;
        }
        if (!detected.nameCol && (h.includes('ชื่อ') || h.includes('name') || h.includes('สกุล') || h.includes('บุคลากร'))) {
          detected.nameCol = header;
        }
        if (!detected.positionCol && (h.includes('ตำแหน่ง') || h.includes('position') || h.includes('role'))) {
          detected.positionCol = header;
        }
        if (!detected.locationCol && (h.includes('สถานที่') || h.includes('หน่วยงาน') || h.includes('location') || h.includes('department') || h.includes('สังกัด') || h.includes('ปฏิบัติงาน'))) {
          detected.locationCol = header;
        }
        if (!detected.sickDaysCol && (h.includes('ป่วย') || h.includes('sick'))) {
          detected.sickDaysCol = header;
        }
        if (!detected.personalDaysCol && (h.includes('ลากิจ') || h.includes('กิจ') || h.includes('personal'))) {
          detected.personalDaysCol = header;
        }
        if (!detected.vacationDaysCol && (h.includes('พักผ่อน') || h.includes('vacation') || h.includes('ลาพัก'))) {
          detected.vacationDaysCol = header;
        }
        if (!detected.vacationRemainingCol && (h.includes('คงเหลือ') || h.includes('remaining') || h.includes('เหลือ'))) {
          detected.vacationRemainingCol = header;
        }
        if (!detected.absentCol && (h.includes('ขาด') || h.includes('absent') || h.includes('ไม่มา'))) {
          detected.absentCol = header;
        }
        if (!detected.lateCol && (h.includes('สาย') || h.includes('late'))) {
          detected.lateCol = header;
        }
      });

      // Fallbacks if not auto-detected
      if (!detected.idCol && fileHeaders.length > 0) detected.idCol = fileHeaders[0];
      if (!detected.nameCol && fileHeaders.length > 1) detected.nameCol = fileHeaders[1];
      if (!detected.positionCol && fileHeaders.length > 2) detected.positionCol = fileHeaders[2];
      if (!detected.locationCol && fileHeaders.length > 3) detected.locationCol = fileHeaders[3];

      setMapping(detected);
      setShowMapping(true);
      setSuccess('📥 ดึงข้อมูลสำเร็จ! โปรดตั้งค่าหัวข้อคอลัมน์เพื่อนำเข้ารายชื่อ');
    } catch (err) {
      setError(`❌ ดึงข้อมูลล้มเหลว: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update preview table when mapping changes
  useEffect(() => {
    if (csvData.length <= 1 || !mapping.nameCol) {
      setEmployeesPreview([]);
      return;
    }

    const dataRows = csvData.slice(1);
    const idIdx = headers.indexOf(mapping.idCol);
    const nameIdx = headers.indexOf(mapping.nameCol);
    const posIdx = headers.indexOf(mapping.positionCol);
    const locIdx = headers.indexOf(mapping.locationCol);
    
    // stats indexes
    const sickIdx = headers.indexOf(mapping.sickDaysCol);
    const personalIdx = headers.indexOf(mapping.personalDaysCol);
    const vacationIdx = headers.indexOf(mapping.vacationDaysCol);
    const vacationRemIdx = headers.indexOf(mapping.vacationRemainingCol);
    const absentIdx = headers.indexOf(mapping.absentCol);
    const lateIdx = headers.indexOf(mapping.lateCol);

    // Helper: build a full monthly leaves structure (กระจายสถิติรายปีออกเป็นรายเดือน)
    const buildMonthlyLeaves = (sickDays, personalDays, vacationDays, vacationRemaining, absent, late) => {
      const emptyMonth = () => ({
        sick: { count: 0, days: 0 },
        vacation: { count: 0, days: 0, remaining: 0 },
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
      });

      const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
      const leavesByMonth = { all: null };
      MONTHS.forEach(m => { leavesByMonth[m] = emptyMonth(); });

      // กระจายสถิติสะสมออกครบทั้ง 12 เดือนเท่ากัน
      const n = MONTHS.length; // 12
      const D = (val) => parseFloat((val / n).toFixed(2));
      const C = (val) => Math.max(0, Math.round(val / n));

      MONTHS.forEach(m => {
        leavesByMonth[m].sick = { count: C(sickDays > 0 ? Math.ceil(sickDays / 1.5) : 0), days: D(sickDays) };
        leavesByMonth[m].personal = { count: C(personalDays > 0 ? Math.ceil(personalDays / 1.5) : 0), days: D(personalDays) };
        leavesByMonth[m].vacation = { count: C(vacationDays > 0 ? Math.ceil(vacationDays / 1.5) : 0), days: D(vacationDays), remaining: 0 };
        leavesByMonth[m].absent = D(absent);
        leavesByMonth[m].late = { count: C(late > 0 ? Math.ceil(late / 1.5) : 0), days: D(late) };
        const totalDays = leavesByMonth[m].sick.days + leavesByMonth[m].personal.days + leavesByMonth[m].vacation.days;
        const totalCount = leavesByMonth[m].sick.count + leavesByMonth[m].personal.count + leavesByMonth[m].vacation.count;
        leavesByMonth[m].total = { count: totalCount, days: parseFloat(totalDays.toFixed(2)) };
      });

      // all = ยอดรวม
      leavesByMonth.all = {
        sick: { count: sickDays > 0 ? Math.ceil(sickDays / 1.5) : 0, days: sickDays },
        personal: { count: personalDays > 0 ? Math.ceil(personalDays / 1.5) : 0, days: personalDays },
        vacation: { count: vacationDays > 0 ? Math.ceil(vacationDays / 1.5) : 0, days: vacationDays, remaining: isNaN(vacationRemaining) ? 30 : vacationRemaining },
        absent: absent,
        late: { count: late > 0 ? Math.ceil(late / 1.5) : 0, days: late },
        maternity: { count: 0, days: 0 },
        wifeAssist: { count: 0, days: 0 },
        ordination: { count: 0, days: 0 },
        military: { count: 0, days: 0 },
        study: { count: 0, days: 0 },
        work: { count: 0, days: 0 },
        follow: { count: 0, days: 0 },
        rehab: { count: 0, days: 0 },
        total: { count: 0, days: sickDays + personalDays + vacationDays },
        outOfArea: { count: 0, hours: 0, days: 0 }
      };

      return leavesByMonth;
    };

    const preview = dataRows.map((row, index) => {
      const idVal = idIdx !== -1 ? parseInt(row[idIdx]) : null;
      const nameVal = nameIdx !== -1 ? row[nameIdx] : '';
      const posVal = posIdx !== -1 ? row[posIdx] : '';
      const locVal = locIdx !== -1 ? row[locIdx] : '';

      // Parse leaves columns
      const sickDays = sickIdx !== -1 ? parseFloat(row[sickIdx]) || 0 : 0;
      const personalDays = personalIdx !== -1 ? parseFloat(row[personalIdx]) || 0 : 0;
      const vacationDays = vacationIdx !== -1 ? parseFloat(row[vacationIdx]) || 0 : 0;
      const parsedVacRem = vacationRemIdx !== -1 ? parseFloat(row[vacationRemIdx]) : 30;
      const absent = absentIdx !== -1 ? parseFloat(row[absentIdx]) || 0 : 0;
      const late = lateIdx !== -1 ? parseFloat(row[lateIdx]) || 0 : 0;

      return {
        id: idVal || (index + 1),
        name: (nameVal || '').trim(),
        position: (posVal || 'พนักงาน').trim(),
        location: (locVal || 'ศูนย์การศึกษาพิเศษฯ').trim(),
        leaves: buildMonthlyLeaves(sickDays, personalDays, vacationDays, isNaN(parsedVacRem) ? 30 : parsedVacRem, absent, late)
      };
    }).filter(emp => emp.name.length > 0);

    setEmployeesPreview(preview);
  }, [mapping, csvData, headers]);

  // Create empty leaves helper (unused or legacy)
  const createEmptyLeave = (vacationRemaining = 30) => ({
    sick: { count: 0, days: 0 },
    vacation: { count: 0, days: 0, remaining: vacationRemaining },
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
  });

  // Local Save options
  const handleSaveLocally = (append = false) => {
    if (employeesPreview.length === 0) {
      setError('❌ ไม่มีข้อมูลพนักงานสำหรับนำเข้า');
      return;
    }

    const formattedList = employeesPreview.map(emp => ({
      id: emp.id,
      name: emp.name,
      position: emp.position,
      location: emp.location,
      leaves: emp.leaves
    }));

    if (append) {
      // Append and avoid duplicating names by comparing against employeesData
      const list = Array.isArray(employeesData) ? employeesData : [];
      const filteredNew = formattedList.filter(n => !list.some(o => o.name === n.name));
      if (filteredNew.length === 0) {
        setSuccess('ℹ️ รายชื่อทั้งหมดมีอยู่ในระบบแล้ว ไม่มีการเพิ่มข้อมูลใหม่');
        return;
      }
      onImportData([...list, ...filteredNew]);
      setSuccess(`✅ นำเข้ารายชื่อใหม่เพิ่ม ${filteredNew.length} คน เรียบร้อยแล้ว!`);
    } else {
      // Replace
      if (window.confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตและแทนที่รายชื่อพนักงานทั้งหมด? สถิติการลาเดิมจะถูกล้างค่าทั้งหมด')) {
        onImportData(formattedList);
        setSuccess(`✅ ล้างฐานข้อมูลเดิมและนำเข้ารายชื่อใหม่ ${formattedList.length} คน เรียบร้อยแล้ว!`);
      }
    }
  };

  // Sync to Supabase
  const handleSyncToSupabase = async () => {
    setSyncStatus('');
    setError('');

    const url = supabaseUrl.trim();
    const key = supabaseKey.trim();
    const table = supabaseTable.trim();

    if (!url || !key) {
      setSyncStatus('❌ โปรดกำหนดการตั้งค่า Supabase URL และ Key ก่อนบันทึก');
      setShowSupabaseConfig(true);
      return;
    }

    if (employeesPreview.length === 0) {
      setSyncStatus('❌ ไม่มีข้อมูลรายชื่อพนักงานในหน้าพรีวิว โปรดดึงข้อมูล Google Sheet ก่อน');
      return;
    }

    setSyncLoading(true);
    setSyncStatus('⏳ กำลังเตรียมการซิงค์ข้อมูล...');

    try {
      // Map frontend employee structures to Supabase Table columns
      const payload = employeesPreview.map(emp => ({
        [supabaseColumns.id]: emp.id,
        [supabaseColumns.fullName]: emp.name,
        [supabaseColumns.position]: emp.position,
        [supabaseColumns.location]: emp.location
      }));

      // PostgREST REST API POST request with Prefer: resolution=merge-duplicates (Upsert)
      const targetUrl = `${url}/rest/v1/${table}`;
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Supabase API error (${response.status}): ${errText}`);
      }

      setSyncStatus(`✅ ซิงค์สำเร็จ! บันทึกและอัปเดตข้อมูลพนักงาน ${employeesPreview.length} คน บน Supabase เรียบร้อยแล้ว`);
      
      // Persist table config settings
      const savedConfig = localStorage.getItem('attendance_dashboard_supabase_config') || '{}';
      try {
        const configObj = JSON.parse(savedConfig);
        configObj.employeesTable = table;
        configObj.supabaseColumns = supabaseColumns;
        localStorage.setItem('attendance_dashboard_supabase_config', JSON.stringify(configObj));
      } catch (e) {}

    } catch (err) {
      console.error(err);
      setSyncStatus(`❌ ซิงค์ล้มเหลว: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>🟢 นำเข้าและซิงค์รายชื่อพนักงาน</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ดึงรายชื่อจาก Google Sheets หรือนำเข้า CSV และซิงค์ขึ้นฐานข้อมูลบน Supabase</p>
        </div>
        <button 
          onClick={() => setShowSupabaseConfig(!showSupabaseConfig)}
          style={{
            padding: '6px 12px',
            background: 'rgba(159, 122, 234, 0.1)',
            border: '1px solid rgba(159, 122, 234, 0.3)',
            color: 'var(--primary)',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          ⚙️ การตั้งค่า Supabase
        </button>
      </div>

      {/* Supabase Config Drawer */}
      {showSupabaseConfig && (
        <div style={{
          background: 'rgba(0,0,0,0.2)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px' }}>⚙️ ตั้งค่าความเชื่อมต่อ Supabase</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supabase URL</label>
              <input 
                type="text" 
                value={supabaseUrl} 
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xxx.supabase.co" 
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: 'var(--text-main)', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supabase Key</label>
              <input 
                type="password" 
                value={supabaseKey} 
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="API Key / Service Role" 
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: 'var(--text-main)', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ชื่อตาราง (Table Name)</label>
              <input 
                type="text" 
                value={supabaseTable} 
                onChange={(e) => setSupabaseTable(e.target.value)}
                placeholder="employees" 
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: 'var(--text-main)', fontSize: '0.82rem' }}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>🛠️ แมปชื่อคอลัมน์ใน Supabase</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>คอลัมน์ ID (เช่น id)</label>
                <input type="text" value={supabaseColumns.id} onChange={(e) => setSupabaseColumns({...supabaseColumns, id: e.target.value})} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: 'var(--text-main)', fontSize: '0.78rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ชื่อ-สกุล (เช่น full_name)</label>
                <input type="text" value={supabaseColumns.fullName} onChange={(e) => setSupabaseColumns({...supabaseColumns, fullName: e.target.value})} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: 'var(--text-main)', fontSize: '0.78rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ตำแหน่ง (เช่น position)</label>
                <input type="text" value={supabaseColumns.position} onChange={(e) => setSupabaseColumns({...supabaseColumns, position: e.target.value})} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: 'var(--text-main)', fontSize: '0.78rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>สถานที่ (เช่น location)</label>
                <input type="text" value={supabaseColumns.location} onChange={(e) => setSupabaseColumns({...supabaseColumns, location: e.target.value})} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: 'var(--text-main)', fontSize: '0.78rem' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Google Sheets link */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexDirection: 'column' }}>
        <label style={{ fontSize: '0.88rem', fontWeight: 600 }}>🔗 ลิงก์ตาราง Google Sheets</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="วางลิงก์ Google Sheets ของคุณที่นี่ (เช่น https://docs.google.com/spreadsheets/d/...)"
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'rgba(0,0,0,0.1)',
              color: 'var(--text-main)',
              fontSize: '0.9rem'
            }}
          />
          <button 
            onClick={handleFetchSheet}
            disabled={loading}
            className="glow-button"
            style={{ padding: '0 24px', whiteSpace: 'nowrap' }}
          >
            {loading ? '⏳ กำลังโหลด...' : '📥 ดึงข้อมูล'}
          </button>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          💡 คำแนะนำ: ตาราง Google Sheets ของคุณต้องเปิดแชร์เป็น "ทุกคนที่มีลิงก์สามารถดูได้" (Anyone with the link can view) หรือสั่ง "Publish to web" เป็นไฟล์ CSV
        </span>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: 'var(--red)', fontSize: '0.85rem', marginBottom: '16px', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: 'var(--green)', fontSize: '0.85rem', marginBottom: '16px', fontWeight: 500 }}>
          {success}
        </div>
      )}

      {/* Column Mapping Section */}
      {showMapping && headers.length > 0 && (
        <div className="animate-fade-in" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px' }}>⚙️ กำหนดหัวข้อคอลัมน์ (Column Mapping)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>รหัสพนักงาน (ID / ลำดับ)</label>
              <select 
                value={mapping.idCol} 
                onChange={(e) => setMapping({...mapping, idCol: e.target.value})}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
              >
                <option value="">-- ไม่ระบุ --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>ชื่อ - นามสกุล</label>
              <select 
                value={mapping.nameCol} 
                onChange={(e) => setMapping({...mapping, nameCol: e.target.value})}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
              >
                <option value="">-- เลือกคอลัมน์ --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>ตำแหน่ง</label>
              <select 
                value={mapping.positionCol} 
                onChange={(e) => setMapping({...mapping, positionCol: e.target.value})}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
              >
                <option value="">-- ไม่ระบุ --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>สถานที่ทำงาน</label>
              <select 
                value={mapping.locationCol} 
                onChange={(e) => setMapping({...mapping, locationCol: e.target.value})}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
              >
                <option value="">-- ไม่ระบุ --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          {/* Leaves Stats Mapping */}
          <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '12px', marginTop: '12px', marginBottom: '16px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>📊 ตั้งค่าการแมปข้อมูลสถิติ ขาด ลา มาสาย สะสม (Optional - ถ้ามีในชีต)</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>🤒 ลาป่วยสะสม (วัน)</label>
                <select 
                  value={mapping.sickDaysCol} 
                  onChange={(e) => setMapping({...mapping, sickDaysCol: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                >
                  <option value="">-- ไม่แมป --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>📌 ลากิจสะสม (วัน)</label>
                <select 
                  value={mapping.personalDaysCol} 
                  onChange={(e) => setMapping({...mapping, personalDaysCol: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                >
                  <option value="">-- ไม่แมป --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>🌴 ลาพักผ่อนสะสม (วัน)</label>
                <select 
                  value={mapping.vacationDaysCol} 
                  onChange={(e) => setMapping({...mapping, vacationDaysCol: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                >
                  <option value="">-- ไม่แมป --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>🌴 ลาพักผ่อนคงเหลือ (วัน)</label>
                <select 
                  value={mapping.vacationRemainingCol} 
                  onChange={(e) => setMapping({...mapping, vacationRemainingCol: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                >
                  <option value="">-- ไม่แมป (ค่าเริ่มต้น 30) --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>🚨 ขาดงานสะสม (วัน)</label>
                <select 
                  value={mapping.absentCol} 
                  onChange={(e) => setMapping({...mapping, absentCol: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                >
                  <option value="">-- ไม่แมป --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>🕰️ มาสายสะสม (วัน)</label>
                <select 
                  value={mapping.lateCol} 
                  onChange={(e) => setMapping({...mapping, lateCol: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                >
                  <option value="">-- ไม่แมป --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '16px', alignItems: 'center' }}>
            <button 
              onClick={() => handleSaveLocally(false)} 
              style={{
                padding: '10px 18px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: 'var(--red)',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🔄 แทนที่รายชื่อทั้งหมดในระบบ
            </button>
            <button 
              onClick={() => handleSaveLocally(true)} 
              style={{
                padding: '10px 18px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: 'var(--green)',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ➕ เพิ่มเข้ากับรายชื่อเดิม
            </button>
            
            <div style={{ flex: 1, minWidth: '20px' }}></div>
            
            <button 
              onClick={handleSyncToSupabase} 
              disabled={syncLoading}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #3ecf8e 0%, #30b178 100%)',
                border: 'none',
                color: 'white',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                opacity: syncLoading ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(62, 207, 142, 0.3)'
              }}
            >
              ⚡ ซิงค์ไปยัง Supabase
            </button>
          </div>

          {syncStatus && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              background: syncStatus.startsWith('❌') ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
              border: syncStatus.startsWith('❌') ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(16, 185, 129, 0.15)',
              borderRadius: '8px',
              color: syncStatus.startsWith('❌') ? 'var(--red)' : 'var(--green)',
              fontSize: '0.82rem',
              fontWeight: 500
            }}>
              {syncStatus}
            </div>
          )}
        </div>
      )}

      {/* Preview Table */}
      {employeesPreview.length > 0 && (
        <div className="animate-fade-in" style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '8px' }}>👁️ พรีวิวข้อมูลรายชื่อที่พบล่าสุด ({employeesPreview.length} รายการ)</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px' }}>ID</th>
                  <th style={{ padding: '8px' }}>ชื่อ - นามสกุล</th>
                  <th style={{ padding: '8px' }}>ตำแหน่ง</th>
                  <th style={{ padding: '8px' }}>สถานที่ปฏิบัติงาน</th>
                </tr>
              </thead>
              <tbody>
                {employeesPreview.map(emp => (
                  <tr key={emp.id + emp.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{emp.id}</td>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{emp.name}</td>
                    <td style={{ padding: '8px' }}>{emp.position}</td>
                    <td style={{ padding: '8px', color: 'var(--cyan)' }}>{emp.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleSheetsImporter;
