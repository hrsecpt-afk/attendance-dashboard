import React, { useState, useEffect, useMemo } from 'react';

// Helper to classify positions into the template categories
const getPersonnelCategory = (position) => {
  if (!position) return 'เจ้าหน้าที่';
  
  const cleanPos = position.trim();
  
  if (
    cleanPos.includes('ผู้อำนวยการ') || 
    cleanPos.includes('รองผู้อำนวยการ') || 
    (cleanPos.includes('ครู') && !cleanPos.includes('อัตราจ้าง') && !cleanPos.includes('พิเศษ') && !cleanPos.includes('จ้าง') && !cleanPos.includes('พนักงานราชการ'))
  ) {
    return 'ข้าราชการครู';
  }
  
  if (
    cleanPos.includes('พนักงานราชการ') || 
    cleanPos.includes('ครูอัตราจ้าง') || 
    cleanPos.includes('พิเศษ') || 
    cleanPos.includes('อัตราจ้าง')
  ) {
    return 'ครูพิเศษ';
  }
  
  if (
    cleanPos.includes('พี่เลี้ยง') || 
    cleanPos.includes('เด็กพิการ') || 
    cleanPos.includes('ลูกจ้างชั่วคราว')
  ) {
    return 'ลูกจ้างชั่วคราว';
  }
  
  if (cleanPos.includes('ลูกจ้างประจำ')) {
    return 'ลูกจ้างประจำ';
  }
  
  // default to staff
  return 'เจ้าหน้าที่';
};

const DailyReportGenerator = ({ employeesData }) => {
  const [rawDate, setRawDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [search, setSearch] = useState('');
  const [attendanceStatuses, setAttendanceStatuses] = useState({});
  const [checkInTimes, setCheckInTimes] = useState({});
  
  // Signature States
  const [signeePersonnelHead, setSigneePersonnelHead] = useState('นายโกสินทร์ ยังมี');
  const [signeePersonnelStaff, setSigneePersonnelStaff] = useState('นายณัฐิวุฒิ พลนาคู');
  const [signeeDirector, setSigneeDirector] = useState('นางสาวภัทรภร หมื่นมะเริง');
  const [isSigneeModalOpen, setIsSigneeModalOpen] = useState(false);

  // Supabase Config States
  const [supabaseUrl, setSupabaseUrl] = useState('https://obxgfqztkbmoqyicjjuk.supabase.co');
  const [supabaseKey, setSupabaseKey] = useState('sb_publishable_HzHy2N6TJe9cFPvsRJ7YHw_d3J8-NXn');
  const [supabaseTable, setSupabaseTable] = useState('attendance_logs');
  const [supabaseMatchCol, setSupabaseMatchCol] = useState('employee_id');
  const [supabaseDateCol, setSupabaseDateCol] = useState('work_date');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(true);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState('');

  // Helper to generate realistic check-in times
  const generateRandomTime = (type) => {
    const pad = (n) => String(n).padStart(2, '0');
    
    if (type === 'normal') {
      const hoursChoice = [6, 7, 8];
      const weights = [0.15, 0.75, 0.1]; // 7am is most common
      const r = Math.random();
      let h = 7;
      if (r < weights[0]) h = 6;
      else if (r > weights[0] + weights[1]) h = 8;
      
      let m = 0;
      let s = Math.floor(Math.random() * 60);
      
      if (h === 6) {
        m = Math.floor(Math.random() * 15) + 45; // 06:45 to 06:59
      } else if (h === 7) {
        m = Math.floor(Math.random() * 60); // 07:00 to 07:59
      } else if (h === 8) {
        m = Math.floor(Math.random() * 14); // 08:00 to 08:14
      }
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    } else if (type === 'late') {
      const h = 8;
      const m = Math.floor(Math.random() * 25) + 15; // 08:15 to 08:40
      const s = Math.floor(Math.random() * 60);
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return '-';
  };

  // Sync / Initialize attendance status and check-in times maps from local employees
  const resetLocalData = () => {
    const initialStatuses = {};
    const initialTimes = {};
    employeesData.forEach(emp => {
      initialStatuses[emp.id] = 'present';
      initialTimes[emp.id] = generateRandomTime('normal');
    });
    setAttendanceStatuses(initialStatuses);
    setCheckInTimes(initialTimes);
  };

  useEffect(() => {
    if (employeesData && employeesData.length > 0) {
      resetLocalData();
    }
  }, [employeesData]);

  // Load Supabase Config on mount
  useEffect(() => {
    const saved = localStorage.getItem('attendance_dashboard_supabase_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSupabaseUrl(parsed.url || 'https://obxgfqztkbmoqyicjjuk.supabase.co');
        setSupabaseKey(parsed.key || 'sb_publishable_HzHy2N6TJe9cFPvsRJ7YHw_d3J8-NXn');
        setSupabaseTable(parsed.table || 'attendance_logs');
        setSupabaseMatchCol(parsed.matchCol || 'employee_id');
        setSupabaseDateCol(parsed.dateCol || 'work_date');
        if ((parsed.url || 'https://obxgfqztkbmoqyicjjuk.supabase.co') && (parsed.key || 'sb_publishable_HzHy2N6TJe9cFPvsRJ7YHw_d3J8-NXn')) {
          setIsSupabaseConnected(true);
        }
      } catch (e) {
        console.error("Failed to parse saved Supabase config", e);
      }
    } else {
      // If no local storage config, connect using default user project
      setSupabaseUrl('https://obxgfqztkbmoqyicjjuk.supabase.co');
      setSupabaseKey('sb_publishable_HzHy2N6TJe9cFPvsRJ7YHw_d3J8-NXn');
      setIsSupabaseConnected(true);
    }
  }, []);

  // Helper to extract HH:mm:ss check-in time from row
  const extractTime = (row) => {
    const val = row.checked_at || row.check_time || row.time || row.created_at || row.timestamp || row.check_in_time || row.work_time;
    if (!val) return '-';
    
    // If it's a full ISO timestamp (contains 'T')
    if (String(val).includes('T')) {
      try {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          const pad = (n) => String(n).padStart(2, '0');
          // Format in local browser time (which handles timezones correctly)
          return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
        }
      } catch (e) {}
      
      const match = String(val).match(/T(\d{2}:\d{2}:\d{2})/);
      if (match) return match[1];
    }
    
    return String(val);
  };

  // Helper to clean Thai name for fuzzy matching by removing spaces and common prefixes
  const cleanNameForMatch = (nameStr) => {
    if (!nameStr) return '';
    let clean = String(nameStr).replace(/\s+/g, '');
    const prefixes = ['นาย', 'นางสาว', 'นาง', 'เด็กชาย', 'เด็กหญิง', 'ด.ช.', 'ด.ญ.', 'ครู', 'ผอ.', 'ผอ', 'รองผอ.', 'รองผอ'];
    for (const pref of prefixes) {
      if (clean.startsWith(pref)) {
        clean = clean.substring(pref.length);
        break;
      }
    }
    return clean;
  };

  // Fetch function to call Supabase REST API
  const fetchSupabaseData = async (targetDate, configOverride = null) => {
    const url = configOverride ? configOverride.url : supabaseUrl.trim();
    const key = configOverride ? configOverride.key : supabaseKey.trim();
    const table = configOverride ? configOverride.table : supabaseTable.trim();
    const matchCol = configOverride ? configOverride.matchCol : supabaseMatchCol;
    const dateCol = configOverride ? configOverride.dateCol : supabaseDateCol.trim();

    if (!url || !key) return;

    setApiLoading(true);
    setApiStatus('⏳ กำลังดึงข้อมูลสแกนเวลาจาก Supabase...');

    try {
      // 1. Try querying with employees table relation join (using full_name since name doesn't exist)
      let targetUrl = `${url}/rest/v1/${table}?select=*,employees(id,full_name,employee_code)&${dateCol}=eq.${targetDate}`;
      let response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });

      // 2. If relationship query fails (status 400), try fallback to select all columns
      if (!response.ok && response.status === 400) {
        targetUrl = `${url}/rest/v1/${table}?select=*&${dateCol}=eq.${targetDate}`;
        response = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': `Bearer ${key}`
          }
        });
      }

      if (!response.ok) {
        throw new Error(`เกิดข้อผิดพลาด API: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        setApiStatus(`⚠️ ไม่พบประวัติลงเวลาประจำวันที่ ${targetDate} บน Supabase`);
        resetLocalData();
        return;
      }

      const newStatuses = {};
      const newTimes = {};

      // Initialize all to normal first
      employeesData.forEach(emp => {
        newStatuses[emp.id] = 'present';
        newTimes[emp.id] = '-';
      });

      // Filter out non-check_in rows if check_type column is present
      const checkInRows = data.filter(row => {
        if (row.check_type) {
          const type = String(row.check_type).trim().toLowerCase();
          return type === 'check_in' || type === 'checkin';
        }
        return true;
      });

      // Helper to find local employee record matching the log row
      const findLocalEmployee = (row) => {
        // 1. Check embedded employees relation
        const empRel = row.employees || row.employee;
        if (empRel) {
          const relName = (empRel.full_name || empRel.name || empRel.fullname || '').trim();
          if (relName) {
            const cleanRel = cleanNameForMatch(relName);
            const found = employeesData.find(e => cleanNameForMatch(e.name) === cleanRel);
            if (found) return found;
          }
          const relCode = empRel.employee_code || empRel.id;
          if (relCode) {
            const found = employeesData.find(e => String(e.id) === String(relCode));
            if (found) return found;
          }
        }

        // 2. Check direct columns in row
        const directName = (row.employee_name || row.name || '').trim();
        if (directName) {
          const cleanDirect = cleanNameForMatch(directName);
          const found = employeesData.find(e => cleanNameForMatch(e.name) === cleanDirect);
          if (found) return found;
        }

        // 3. Match by employee_id direct field (if it is a numeric ID)
        if (row.employee_id && !isNaN(row.employee_id)) {
          const found = employeesData.find(e => e.id === Number(row.employee_id));
          if (found) return found;
        }

        return null;
      };

      checkInRows.forEach(row => {
        const emp = findLocalEmployee(row);
        if (emp) {
          let status = 'present';
          let timeVal = '-';
          
          const timeStr = extractTime(row);
          if (timeStr && timeStr !== '-') {
            timeVal = timeStr;
            
            if (row.status !== undefined) {
              const rawStatus = String(row.status || '').trim().toLowerCase();
              if (rawStatus === 'late' || rawStatus === 'สาย') status = 'late';
              else if (rawStatus === 'gov' || rawStatus === 'ไปราชการ') status = 'gov';
              else if (rawStatus === 'sick' || rawStatus === 'ลาป่วย') status = 'sick';
              else if (rawStatus === 'ontime' || rawStatus === 'present' || rawStatus === 'มาปกติ') status = 'present';
            } else {
              // Auto-classify status by check-in time (> 08:15:00 is late)
              const timeParts = timeStr.split(':');
              if (timeParts.length >= 2) {
                const hour = parseInt(timeParts[0], 10);
                const minute = parseInt(timeParts[1], 10);
                if (hour > 8 || (hour === 8 && minute >= 15)) {
                  status = 'late';
                }
              }
            }
          } else {
            if (row.status !== undefined) {
              const rawStatus = String(row.status || '').trim().toLowerCase();
              if (rawStatus === 'late' || rawStatus === 'สาย') status = 'late';
              else if (rawStatus === 'gov' || rawStatus === 'ไปราชการ') status = 'gov';
              else if (rawStatus === 'sick' || rawStatus === 'ลาป่วย') status = 'sick';
              else if (rawStatus === 'ontime' || rawStatus === 'present' || rawStatus === 'มาปกติ') status = 'present';
            }
          }

          newStatuses[emp.id] = status;
          newTimes[emp.id] = timeVal;
        }
      });

      setAttendanceStatuses(newStatuses);
      setCheckInTimes(newTimes);
      setApiStatus(`✅ ดึงข้อมูลสำเร็จ: โหลดประวัติพนักงานแล้ว ${checkInRows.length} รายการ`);
    } catch (err) {
      console.error(err);
      setApiStatus(`❌ ดึงข้อมูลล้มเหลว: ${err.message}`);
    } finally {
      setApiLoading(false);
    }
  };

  // Load daily data: check local overrides first, otherwise fetch from Supabase
  const loadDailyData = async (targetDate) => {
    const savedData = localStorage.getItem('attendance_dashboard_daily_overrides');
    if (savedData) {
      try {
        const overrides = JSON.parse(savedData);
        if (overrides[targetDate]) {
          setAttendanceStatuses(overrides[targetDate].statuses || {});
          setCheckInTimes(overrides[targetDate].times || {});
          if (overrides[targetDate].signeePersonnelHead) setSigneePersonnelHead(overrides[targetDate].signeePersonnelHead);
          if (overrides[targetDate].signeePersonnelStaff) setSigneePersonnelStaff(overrides[targetDate].signeePersonnelStaff);
          if (overrides[targetDate].signeeDirector) setSigneeDirector(overrides[targetDate].signeeDirector);
          setApiStatus(`💾 โหลดข้อมูลที่ปรับปรุงและบันทึกไว้ในเครื่องประจำวันเรียบร้อยแล้ว`);
          return;
        }
      } catch (e) {
        console.error("Failed to parse daily overrides", e);
      }
    }

    // Fallback to fetch from Supabase
    if (isSupabaseConnected) {
      await fetchSupabaseData(targetDate);
    } else {
      resetLocalData();
      setApiStatus('');
    }
  };

  // Trigger data loading when date changes or connection status shifts
  useEffect(() => {
    if (rawDate) {
      loadDailyData(rawDate);
    }
  }, [rawDate, isSupabaseConnected]);

  // Save manual overrides of daily statuses & times to LocalStorage
  const handleSaveDailyReport = () => {
    const savedData = localStorage.getItem('attendance_dashboard_daily_overrides') || '{}';
    try {
      const overrides = JSON.parse(savedData);
      overrides[rawDate] = {
        statuses: attendanceStatuses,
        times: checkInTimes,
        signeePersonnelHead,
        signeePersonnelStaff,
        signeeDirector
      };
      localStorage.setItem('attendance_dashboard_daily_overrides', JSON.stringify(overrides));
      setApiStatus(`✅ บันทึกรายงานประจำวันที่ ${formattedThaiDate} ลงในบราวเซอร์เรียบร้อยแล้ว!`);
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // Save Supabase settings callback
  const handleSaveSupabaseConfig = (e) => {
    e.preventDefault();
    const config = {
      url: supabaseUrl.trim(),
      key: supabaseKey.trim(),
      table: supabaseTable.trim(),
      matchCol: supabaseMatchCol,
      dateCol: supabaseDateCol.trim()
    };
    localStorage.setItem('attendance_dashboard_supabase_config', JSON.stringify(config));
    
    const isConn = !!(config.url && config.key);
    setIsSupabaseConnected(isConn);
    setIsSupabaseModalOpen(false);
    
    if (isConn) {
      fetchSupabaseData(rawDate, config);
    } else {
      setApiStatus('');
      resetLocalData();
    }
  };

  // Manual trigger Sync
  const handleManualSync = () => {
    if (isSupabaseConnected) {
      fetchSupabaseData(rawDate);
    } else {
      setIsSupabaseModalOpen(true);
    }
  };

  // Convert Gregorian date (YYYY-MM-DD) to Thai Buddhist Era string
  const formattedThaiDate = useMemo(() => {
    if (!rawDate) return '';
    const dateParts = rawDate.split('-');
    const year = parseInt(dateParts[0]);
    const monthIndex = parseInt(dateParts[1]) - 1;
    const day = parseInt(dateParts[2]);
    
    const months = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    return `${day} ${months[monthIndex]} พ.ศ. ${year + 543}`;
  }, [rawDate]);

  // Handle single employee status change and auto time generation
  const handleStatusChange = (empId, status) => {
    setAttendanceStatuses(prev => ({
      ...prev,
      [empId]: status
    }));

    setCheckInTimes(prev => {
      let newTime = '-';
      if (status === 'present') newTime = generateRandomTime('normal');
      else if (status === 'late') newTime = generateRandomTime('late');
      return {
        ...prev,
        [empId]: newTime
      };
    });
  };

  // Handle manual time change
  const handleTimeChange = (empId, value) => {
    setCheckInTimes(prev => ({
      ...prev,
      [empId]: value
    }));
  };

  // Reset all employees to default (Present)
  const handleResetAll = () => {
    if (window.confirm('ต้องการรีเซ็ตสถานะทุกคนของวันนี้ให้เป็น "มาปฏิบัติราชการปกติ" หรือไม่?')) {
      resetLocalData();
      
      // Clear saved overrides for this day
      const savedData = localStorage.getItem('attendance_dashboard_daily_overrides');
      if (savedData) {
        try {
          const overrides = JSON.parse(savedData);
          delete overrides[rawDate];
          localStorage.setItem('attendance_dashboard_daily_overrides', JSON.stringify(overrides));
        } catch (e) {}
      }
      
      setApiStatus('🔄 รีเซ็ตข้อมูลวันปัจจุบันเรียบร้อยแล้ว');
    }
  };

  // Auto-fill daily status from employee's monthly statistics
  const handleAutoFillFromStats = () => {
    if (window.confirm('ระบบจะจำลองหาผู้ที่ไม่มาปฏิบัติราชการในวันนี้ โดยอิงจากบุคลากรที่มีสถิติ ขาด/ลา/สาย สูงสุดในฐานข้อมูลปัจจุบัน ต้องการดำเนินการต่อหรือไม่?')) {
      const newStatuses = {};
      const newTimes = {};
      employeesData.forEach(emp => {
        const l = emp.leaves.all || emp.leaves;
        if (l.absent > 3) {
          newStatuses[emp.id] = 'sick';
          newTimes[emp.id] = '-';
        } else if (l.late.count > 5) {
          newStatuses[emp.id] = 'late';
          newTimes[emp.id] = generateRandomTime('late');
        } else if (l.sick.days > 5) {
          newStatuses[emp.id] = 'sick';
          newTimes[emp.id] = '-';
        } else if (l.outOfArea.count > 4) {
          newStatuses[emp.id] = 'gov';
          newTimes[emp.id] = '-';
        } else {
          newStatuses[emp.id] = 'present';
          newTimes[emp.id] = generateRandomTime('normal');
        }
      });
      setAttendanceStatuses(newStatuses);
      setCheckInTimes(newTimes);
      setApiStatus('🤖 จำลองข้อมูลจากสถิติวันลาสะสม');
    }
  };

  // Calculate stats matrix
  const stats = useMemo(() => {
    const categories = ['ข้าราชการครู', 'ครูพิเศษ', 'เจ้าหน้าที่', 'ลูกจ้างประจำ', 'ลูกจ้างชั่วคราว'];
    
    const initialGroup = () => ({
      ข้าราชการครู: 0,
      ครูพิเศษ: 0,
      เจ้าหน้าที่: 0,
      ลูกจ้างประจำ: 0,
      ลูกจ้างชั่วคราว: 0,
      all: 0
    });
    
    const result = {
      total: initialGroup(),
      late: initialGroup(),
      gov: initialGroup(),
      sick: initialGroup(),
      present: initialGroup()
    };
    
    employeesData.forEach(emp => {
      const cat = getPersonnelCategory(emp.position);
      const status = attendanceStatuses[emp.id] || 'present';
      
      result.total[cat]++;
      result.total.all++;
      
      if (status === 'late') {
        result.late[cat]++;
        result.late.all++;
      } else if (status === 'gov') {
        result.gov[cat]++;
        result.gov.all++;
      } else if (status === 'sick') {
        result.sick[cat]++;
        result.sick.all++;
      }
    });
    
    // Present = Total - Gov - Sick (Late counts as present)
    categories.forEach(cat => {
      result.present[cat] = result.total[cat] - (result.gov[cat] || 0) - (result.sick[cat] || 0);
      result.present.all = result.total.all - (result.gov.all || 0) - (result.sick.all || 0);
    });
    
    return result;
  }, [employeesData, attendanceStatuses]);

  // Names lists for non-present employees
  const namesList = useMemo(() => {
    const lists = {
      late: [],
      gov: [],
      sick: []
    };
    employeesData.forEach(emp => {
      const status = attendanceStatuses[emp.id] || 'present';
      if (status === 'late') lists.late.push(emp.name);
      else if (status === 'gov') lists.gov.push(emp.name);
      else if (status === 'sick') lists.sick.push(emp.name);
    });
    return lists;
  }, [employeesData, attendanceStatuses]);

  // Filter employees for checklist search
  const filteredEmployees = useMemo(() => {
    return employeesData.filter(emp => 
      emp.name.toLowerCase().includes(search.toLowerCase()) || 
      emp.position.toLowerCase().includes(search.toLowerCase())
    );
  }, [employeesData, search]);

  // Export Summary Report (.doc)
  const handleExportDoc = () => {
    const formattedDate = formattedThaiDate || '24 มิถุนายน พ.ศ. 2569';
    const displayVal = (val) => val === 0 ? '-' : val;

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>แบบสรุปการมาปฏิบัติหน้าที่ราชการของบุคลากร</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @font-face {
            font-family: "TH SarabunPSK";
            panose-1: 2 11 6 4 2 2 2 2 2 4;
            mso-font-charset: 222;
            mso-generic-font-family: swiss;
            mso-font-pitch: variable;
            mso-font-signature: -536870145 1073741824 0 0 415 0;
          }
          @font-face {
            font-family: "TH Sarabun PSK";
            panose-1: 2 11 6 4 2 2 2 2 2 4;
            mso-font-charset: 222;
            mso-generic-font-family: swiss;
            mso-font-pitch: variable;
            mso-font-signature: -536870145 1073741824 0 0 415 0;
          }
          @page {
            size: A4;
            margin: 2.0cm 2.0cm 2.0cm 2.0cm;
          }
          p.MsoNormal, li.MsoNormal, div.MsoNormal, body, table, tr, th, td, span, div, p {
            font-family: "TH SarabunPSK", "TH Sarabun PSK", "Sarabun", sans-serif;
            mso-ascii-font-family: "TH SarabunPSK";
            mso-hansi-font-family: "TH SarabunPSK";
            mso-bidi-font-family: "TH SarabunPSK";
            margin: 0in;
            margin-bottom: .0001pt;
            padding: 0;
            line-height: 1.0;
            mso-line-height-rule: exactly;
          }
          body {
            font-size: 16pt;
            color: #000;
          }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .bold { font-weight: bold; }
          
          .header-section {
            text-align: center;
            margin-bottom: 12px;
          }
          .title { font-size: 18pt; font-weight: bold; margin-bottom: 2px; }
          .subtitle { font-size: 16pt; font-weight: bold; margin-bottom: 2px; }
          .date { font-size: 16pt; margin-bottom: 4px; }
          
          table.report-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
          }
          table.report-table th, table.report-table td {
            border: 0.5pt solid windowtext;
            padding: 2px 4px;
            font-size: 14pt;
            text-align: center;
            line-height: 1.0;
          }
          table.report-table th {
            background-color: #e5e7eb;
            font-weight: bold;
          }
          
          .sub-section-title {
            background-color: #d1d5db;
            font-weight: bold;
            text-align: center;
            padding: 2px 4px;
            font-size: 15pt;
            border: 0.5pt solid windowtext;
            margin-bottom: 6px;
            margin-top: 8px;
          }
          
          .list-container {
            margin-bottom: 10px;
          }
          .list-item {
            font-size: 15pt;
            margin-bottom: 2px;
          }
          
          table.signature-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          table.signature-table td {
            border: none;
            padding: 5px 5px;
            text-align: center;
            width: 50%;
            font-size: 15pt;
          }
          .sig-line { margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="header-section">
          <div class="title">แบบสรุปการมาปฏิบัติหน้าที่ราชการของบุคลากร</div>
          <div class="subtitle">ศูนย์การศึกษาพิเศษ ประจำจังหวัดปทุมธานี</div>
          <div class="date">ประจำวันที่ ${formattedDate}</div>
        </div>
        
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 28%; text-align: left;">รายการ</th>
              <th style="width: 13%;">ข้าราชการครู</th>
              <th style="width: 12%;">ครูพิเศษ</th>
              <th style="width: 11%;">เจ้าหน้าที่</th>
              <th style="width: 12%;">ลูกจ้างประจำ</th>
              <th style="width: 12%;">ลูกจ้างชั่วคราว</th>
              <th style="width: 12%;">รวมทั้งหมด</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-left">1.จำนวนบุคลากรทั้งหมด</td>
              <td>${displayVal(stats.total.ข้าราชการครู)}</td>
              <td>${displayVal(stats.total.ครูพิเศษ)}</td>
              <td>${displayVal(stats.total.เจ้าหน้าที่)}</td>
              <td>${displayVal(stats.total.ลูกจ้างประจำ)}</td>
              <td>${displayVal(stats.total.ลูกจ้างชั่วคราว)}</td>
              <td class="bold">${displayVal(stats.total.all)}</td>
            </tr>
            <tr>
              <td class="text-left">2. สาย</td>
              <td>${displayVal(stats.late.ข้าราชการครู)}</td>
              <td>${displayVal(stats.late.ครูพิเศษ)}</td>
              <td>${displayVal(stats.late.เจ้าหน้าที่)}</td>
              <td>${displayVal(stats.late.ลูกจ้างประจำ)}</td>
              <td>${displayVal(stats.late.ลูกจ้างชั่วคราว)}</td>
              <td class="bold">${displayVal(stats.late.all)}</td>
            </tr>
            <tr>
              <td class="text-left">3. ไปราชการ</td>
              <td>${displayVal(stats.gov.ข้าราชการครู)}</td>
              <td>${displayVal(stats.gov.ครูพิเศษ)}</td>
              <td>${displayVal(stats.gov.เจ้าหน้าที่)}</td>
              <td>${displayVal(stats.gov.ลูกจ้างประจำ)}</td>
              <td>${displayVal(stats.gov.ลูกจ้างชั่วคราว)}</td>
              <td class="bold">${displayVal(stats.gov.all)}</td>
            </tr>
            <tr>
              <td class="text-left">4. ลาป่วย</td>
              <td>${displayVal(stats.sick.ข้าราชการครู)}</td>
              <td>${displayVal(stats.sick.ครูพิเศษ)}</td>
              <td>${displayVal(stats.sick.เจ้าหน้าที่)}</td>
              <td>${displayVal(stats.sick.ลูกจ้างประจำ)}</td>
              <td>${displayVal(stats.sick.ลูกจ้างชั่วคราว)}</td>
              <td class="bold">${displayVal(stats.sick.all)}</td>
            </tr>
            <tr class="bold">
              <td class="text-left">มาปฏิบัติราชการทั้งสิ้น</td>
              <td>${displayVal(stats.present.ข้าราชการครู)}</td>
              <td>${displayVal(stats.present.ครูพิเศษ)}</td>
              <td>${displayVal(stats.present.เจ้าหน้าที่)}</td>
              <td>${displayVal(stats.present.ลูกจ้างประจำ)}</td>
              <td>${displayVal(stats.present.ลูกจ้างชั่วคราว)}</td>
              <td class="bold">${displayVal(stats.present.all)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="sub-section-title">รายชื่อผู้ไม่มาปฏิบัติราชการ</div>
        
        <div class="list-container">
          <div class="list-item">
            <span class="bold">1. สาย</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 
            ${namesList.late.length > 0 ? namesList.late.map((name, i) => `${i+1}.${name}`).join(' &nbsp;&nbsp;&nbsp;&nbsp; ') : '-'}
          </div>
          <div class="list-item" style="margin-top: 6px;">
            <span class="bold">2. ไปราชการ</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 
            ${namesList.gov.length > 0 ? namesList.gov.map((name, i) => `${i+1}.${name}`).join(' &nbsp;&nbsp;&nbsp;&nbsp; ') : '-'}
          </div>
          <div class="list-item" style="margin-top: 6px;">
            <span class="bold">3. ลาป่วย</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 
            ${namesList.sick.length > 0 ? namesList.sick.map((name, i) => `${i+1}.${name}`).join(' &nbsp;&nbsp;&nbsp;&nbsp; ') : '-'}
          </div>
        </div>
        
        <table class="signature-table">
          <tr>
            <td>
              <div class="sig-line">ลงชื่อ ............................................................</div>
              <div>(${signeePersonnelHead})</div>
              <div>หัวหน้างานบุคลากร</div>
            </td>
            <td>
              <div class="sig-line">ลงชื่อ ............................................................</div>
              <div>(${signeePersonnelStaff})</div>
              <div>เจ้าหน้าที่งานบุคลากร</div>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="text-align: center; padding-top: 25px;">
              <div class="sig-line">ลงชื่อ ............................................................</div>
              <div>(${signeeDirector})</div>
              <div class="bold">ผู้อำนวยการศูนย์การศึกษาพิเศษ ประจำจังหวัดปทุมธานี</div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `แบบสรุปการปฏิบัติหน้าที่_${rawDate}.doc`);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Export Time Logging Sheet (.doc) - Two Column side-by-side Table Layout
  const handleExportTimeDoc = () => {
    const formattedDate = formattedThaiDate || '24 มิถุนายน พ.ศ. 2569';
    
    const mgmtList = employeesData.slice(0, 6);
    const othersList = employeesData.slice(6);

    const getStatusLabel = (status) => {
      if (status === 'present') return 'มาปกติ';
      if (status === 'late') return 'สาย';
      if (status === 'gov') return 'ไปราชการ';
      if (status === 'sick') return 'ลาป่วย';
      return 'มาปกติ';
    };

    const getSplitRowsHtml = (list) => {
      const leftSide = [];
      const rightSide = [];
      
      list.forEach((emp, i) => {
        if (i % 2 === 0) leftSide.push(emp);
        else rightSide.push(emp);
      });

      const maxLen = Math.max(leftSide.length, rightSide.length);
      let rowsHtml = '';

      for (let i = 0; i < maxLen; i++) {
        const l = leftSide[i];
        const r = rightSide[i];

        const leftStatus = l ? getStatusLabel(attendanceStatuses[l.id]) : '';
        const leftTime = l ? checkInTimes[l.id] || '-' : '';
        
        const rightStatus = r ? getStatusLabel(attendanceStatuses[r.id]) : '';
        const rightTime = r ? checkInTimes[r.id] || '-' : '';

        rowsHtml += `
          <tr>
            <!-- Left Column -->
            <td style="text-align: center;">${l ? l.id : ''}</td>
            <td class="text-left">${l ? l.name : ''}</td>
            <td style="text-align: center;">${l ? leftTime : ''}</td>
            <td style="text-align: center;">${l ? leftStatus : ''}</td>
            <td style="text-align: center;">${l ? '-' : ''}</td>
            
            <!-- Right Column -->
            <td style="text-align: center;">${r ? r.id : ''}</td>
            <td class="text-left">${r ? r.name : ''}</td>
            <td style="text-align: center;">${r ? rightTime : ''}</td>
            <td style="text-align: center;">${r ? rightStatus : ''}</td>
            <td style="text-align: center;">${r ? '-' : ''}</td>
          </tr>
        `;
      }
      return rowsHtml;
    };

    const managementRows = getSplitRowsHtml(mgmtList);
    const othersRows = getSplitRowsHtml(othersList);

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>รายงานการลงเวลาการปฏิบัติงานของบุคลากร</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @font-face {
            font-family: "TH SarabunPSK";
            panose-1: 2 11 6 4 2 2 2 2 2 4;
            mso-font-charset: 222;
            mso-generic-font-family: swiss;
            mso-font-pitch: variable;
            mso-font-signature: -536870145 1073741824 0 0 415 0;
          }
          @font-face {
            font-family: "TH Sarabun PSK";
            panose-1: 2 11 6 4 2 2 2 2 2 4;
            mso-font-charset: 222;
            mso-generic-font-family: swiss;
            mso-font-pitch: variable;
            mso-font-signature: -536870145 1073741824 0 0 415 0;
          }
          @page {
            size: A4;
            margin: 1.5cm 1.5cm 1.5cm 1.5cm;
          }
          p.MsoNormal, li.MsoNormal, div.MsoNormal, body, table, tr, th, td, span, div, p {
            font-family: "TH SarabunPSK", "TH Sarabun PSK", "Sarabun", sans-serif;
            mso-ascii-font-family: "TH SarabunPSK";
            mso-hansi-font-family: "TH SarabunPSK";
            mso-bidi-font-family: "TH SarabunPSK";
            margin: 0in;
            margin-bottom: .0001pt;
            padding: 0;
            line-height: 1.0;
            mso-line-height-rule: exactly;
          }
          body {
            font-size: 15pt;
            color: #000;
          }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .bold { font-weight: bold; }
          
          .header-section {
            text-align: center;
            margin-bottom: 8px;
          }
          .title { font-size: 16pt; font-weight: bold; margin-bottom: 2px; }
          .subtitle { font-size: 14pt; font-weight: bold; margin-bottom: 2px; }
          .date { font-size: 14pt; margin-bottom: 5px; }
          
          table.time-table {
            width: 100%;
            border-collapse: collapse;
            border: 0.5pt solid windowtext;
          }
          table.time-table th, table.time-table td {
            border: 0.5pt solid windowtext;
            padding: 1px 3px;
            font-size: 11pt;
            vertical-align: middle;
            line-height: 1.0;
          }
          table.time-table th {
            background-color: #d1d5db;
            font-weight: bold;
            text-align: center;
          }
          .section-row td {
            background-color: #f3f4f6;
            font-weight: bold;
            padding: 4px 8px;
            font-size: 13pt;
          }
        </style>
      </head>
      <body>
        <div class="header-section">
          <div class="title">รายงานการลงเวลาการปฏิบัติงานของบุคลากร</div>
          <div class="subtitle">ศูนย์การศึกษาพิเศษ ประจำจังหวัดปทุมธานี</div>
          <div class="date">ประจำวันที่ ${formattedDate}</div>
        </div>
        
        <table class="time-table">
          <thead>
            <tr>
              <th style="width: 5%;">ที่</th>
              <th style="width: 22%; text-align: left;">ชื่อ - สกุล</th>
              <th style="width: 10%;">เวลามา</th>
              <th style="width: 10%;">การปฏิบัติหน้าที่</th>
              <th style="width: 3%;">เวลากลับ</th>
              
              <th style="width: 5%;">ที่</th>
              <th style="width: 22%; text-align: left;">ชื่อ - สกุล</th>
              <th style="width: 10%;">เวลามา</th>
              <th style="width: 10%;">การปฏิบัติหน้าที่</th>
              <th style="width: 3%;">เวลากลับ</th>
            </tr>
          </thead>
          <tbody>
            <tr class="section-row">
              <td colspan="10" class="text-left bold">ฝ่ายบริหาร</td>
            </tr>
            ${managementRows}
            
            <tr class="section-row">
              <td colspan="10" class="text-left bold">อื่นๆ</td>
            </tr>
            ${othersRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `รายงานการลงเวลาปฏิบัติงาน_${rawDate}.doc`);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Configuration Header Card */}
      <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>📅 ระบบออกรายงานสรุปการปฏิบัติหน้าที่ประจำวัน</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              เลือกวันที่และระบุสถานะรายบุคคลเพื่อคำนวณสถิติส่งออกเอกสารราชการ (.doc) ตามรูปแบบต้นฉบับ
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleResetAll}
              style={{
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem'
              }}
            >
              🔄 รีเซ็ตทุกคน
            </button>
            <button
              onClick={handleAutoFillFromStats}
              style={{
                padding: '10px 14px',
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                color: 'var(--cyan)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem'
              }}
            >
              🤖 จำลองข้อมูลจากสถิติลา
            </button>
            <button
              onClick={handleManualSync}
              style={{
                padding: '10px 14px',
                background: isSupabaseConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${isSupabaseConnected ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-color)'}`,
                color: isSupabaseConnected ? 'var(--green)' : 'var(--text-muted)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{isSupabaseConnected ? '🔌 ดึงข้อมูล Supabase' : '🔌 เชื่อมต่อ Supabase'}</span>
              {isSupabaseConnected && <span style={{ width: '8px', height: '8px', background: 'var(--green)', borderRadius: '50%' }}></span>}
            </button>
            <button
              onClick={() => setIsSigneeModalOpen(true)}
              style={{
                padding: '10px 14px',
                background: 'rgba(159, 122, 234, 0.08)',
                border: '1px solid rgba(159, 122, 234, 0.2)',
                color: 'var(--primary)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem'
              }}
            >
              ✍️ ตั้งค่าลายเซ็น
            </button>
            <button
              onClick={handleSaveDailyReport}
              className="glow-button"
              style={{
                padding: '10px 18px',
                background: 'linear-gradient(135deg, var(--green) 0%, var(--teal) 100%)',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                fontSize: '0.82rem'
              }}
            >
              💾 บันทึกรายงานวันนี้
            </button>
            <button
              onClick={handleExportDoc}
              className="glow-button"
              style={{
                padding: '10px 18px',
                fontSize: '0.82rem'
              }}
            >
              📥 ดาวน์โหลดใบสรุปรายงาน (.doc)
            </button>
            <button
              onClick={handleExportTimeDoc}
              className="glow-button"
              style={{
                padding: '10px 18px',
                background: 'linear-gradient(135deg, var(--cyan) 0%, var(--primary) 100%)',
                boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)',
                fontSize: '0.82rem'
              }}
            >
              📥 ดาวน์โหลดใบลงเวลาทำงาน (.doc)
            </button>
          </div>
        </div>

        {/* Date Selector and API Status indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', width: 'fit-content' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>เลือกวันที่ออกเอกสาร:</label>
            <input
              type="date"
              value={rawDate}
              onChange={(e) => setRawDate(e.target.value)}
              style={{
                padding: '8px 12px',
                background: 'var(--bg-dark)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                borderRadius: '8px',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
            <span style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 700 }}>
              🗓️ {formattedThaiDate}
            </span>
          </div>
          {apiStatus && (
            <div style={{ 
              fontSize: '0.82rem', 
              color: apiStatus.includes('สำเร็จ') ? 'var(--green)' : apiStatus.includes('ล้มเหลว') || apiStatus.includes('ไม่พบ') ? 'var(--yellow)' : 'var(--primary)', 
              fontWeight: 600,
              paddingLeft: '4px'
            }}>
              {apiStatus}
            </div>
          )}
        </div>
      </div>

      {/* Real-time Statistics Table Preview */}
      <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(159, 122, 234, 0.15)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '14px', color: 'var(--primary)' }}>
          🔍 ตัวอย่างข้อมูลตารางสรุปผลลัพธ์ที่จะจัดหน้าลงเวิร์ด (Live Preview)
        </h3>

        <div className="table-wrapper" style={{ marginBottom: '16px' }}>
          <table className="employee-table" style={{ fontSize: '0.88rem', cursor: 'default' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ textAlign: 'left' }}>รายการ</th>
                <th style={{ textAlign: 'center', width: '13%' }}>ข้าราชการครู</th>
                <th style={{ textAlign: 'center', width: '13%' }}>ครูพิเศษ</th>
                <th style={{ textAlign: 'center', width: '12%' }}>เจ้าหน้าที่</th>
                <th style={{ textAlign: 'center', width: '13%' }}>ลูกจ้างประจำ</th>
                <th style={{ textAlign: 'center', width: '13%' }}>ลูกจ้างชั่วคราว</th>
                <th style={{ textAlign: 'center', width: '13%', fontWeight: 'bold' }}>รวมทั้งหมด</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: '600' }}>1. จำนวนบุคลากรทั้งหมด</td>
                <td style={{ textAlign: 'center' }}>{stats.total.ข้าราชการครู || '-'}</td>
                <td style={{ textAlign: 'center' }}>{stats.total.ครูพิเศษ || '-'}</td>
                <td style={{ textAlign: 'center' }}>{stats.total.เจ้าหน้าที่ || '-'}</td>
                <td style={{ textAlign: 'center' }}>{stats.total.ลูกจ้างประจำ || '-'}</td>
                <td style={{ textAlign: 'center' }}>{stats.total.ลูกจ้างชั่วคราว || '-'}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-main)' }}>{stats.total.all || '-'}</td>
              </tr>
              <tr style={{ color: 'var(--yellow)' }}>
                <td style={{ fontWeight: '600' }}>2. สาย</td>
                <td style={{ textAlign: 'center' }}>{stats.late.ข้าราชการครู || '-'}</td>
                <td style={{ textAlign: 'center' }}>{stats.late.ครูพิเศษ || '-'}</td>
                <td style={{ textAlign: 'center' }}>{stats.late.เจ้าหน้าที่ || '-'}</td>
                <td style={{ textAlign: 'center' }}>{stats.late.ลูกจ้างประจำ || '-'}</td>
                <td style={{ textAlign: 'center' }}>{stats.late.ลูกจ้างชั่วคราว || '-'}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{stats.late.all || '-'}</td>
              </tr>
              <tr style={{ color: 'var(--green)' }}>
                <td style={{ fontWeight: '600' }}>3. ไปราชการ</td>
                <td style={{ textAlign: 'center' }}>{stats.gov.ข้าราชการครู || '-'}</td>
                <td style={{ textAlign: 'center' }}>{stats.gov.ครูพิเศษ || '-'}</td>
                <td style={{ textAlign: 'center' }}>{stats.gov.เจ้าหน้าที่ || '-'}</td>
                <td style={{ textAlign: 'center' }}>{stats.gov.ลูกจ้างประจำ || '-'}</td>
                <td style={{ textAlign: 'center' }}>{stats.gov.ลูกจ้างชั่วคราว || '-'}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{stats.gov.all || '-'}</td>
              </tr>
              <tr style={{ color: 'var(--cyan)' }}>
                <td style={{ fontWeight: '600' }}>4. ลาป่วย</td>
                <td style={{ textAlign: 'center' }}>{stats.sick.ข้าราชการครู || '-'}</td>
                <td style={{ textAlign: 'center' }}>{stats.sick.ครูพิเศษ || '-'}</td>
                <td style={{ textAlign: 'center' }}>{stats.sick.เจ้าหน้าที่ || '-'}</td>
                <td style={{ textAlign: 'center' }}>{stats.sick.ลูกจ้างประจำ || '-'}</td>
                <td style={{ textAlign: 'center' }}>{stats.sick.ลูกจ้างชั่วคราว || '-'}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{stats.sick.all || '-'}</td>
              </tr>
              <tr style={{ fontWeight: 'bold', background: 'rgba(255,255,255,0.01)', borderTop: '2px solid var(--border-color)' }}>
                <td>มาปฏิบัติราชการทั้งสิ้น</td>
                <td style={{ textAlign: 'center', color: 'var(--green)' }}>{stats.present.ข้าราชการครู}</td>
                <td style={{ textAlign: 'center', color: 'var(--green)' }}>{stats.present.ครูพิเศษ}</td>
                <td style={{ textAlign: 'center', color: 'var(--green)' }}>{stats.present.เจ้าหน้าที่}</td>
                <td style={{ textAlign: 'center', color: 'var(--green)' }}>{stats.present.ลูกจ้างประจำ}</td>
                <td style={{ textAlign: 'center', color: 'var(--green)' }}>{stats.present.ลูกจ้างชั่วคราว}</td>
                <td style={{ textAlign: 'center', color: 'var(--green)', fontSize: '1.05rem' }}>{stats.present.all}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Live list of non-present names */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'rgba(0,0,0,0.1)', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
          <div style={{ fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '4px' }}>
            📋 บัญชีรายชื่อผู้ไม่มาปฏิบัติราชการประจำวัน
          </div>
          <div>
            <span style={{ fontWeight: 'bold', color: 'var(--yellow)', marginRight: '10px' }}>1. สาย:</span>
            {namesList.late.length > 0 
              ? namesList.late.map((n, i) => <span key={i} style={{ marginRight: '12px' }}>{i + 1}.{n}</span>)
              : <span style={{ color: 'var(--text-muted)' }}>- ไม่มีพนักงานมาสาย -</span>
            }
          </div>
          <div>
            <span style={{ fontWeight: 'bold', color: 'var(--green)', marginRight: '10px' }}>2. ไปราชการ:</span>
            {namesList.gov.length > 0 
              ? namesList.gov.map((n, i) => <span key={i} style={{ marginRight: '12px' }}>{i + 1}.{n}</span>)
              : <span style={{ color: 'var(--text-muted)' }}>- ไม่มีพนักงานไปราชการ -</span>
            }
          </div>
          <div>
            <span style={{ fontWeight: 'bold', color: 'var(--cyan)', marginRight: '10px' }}>3. ลาป่วย:</span>
            {namesList.sick.length > 0 
              ? namesList.sick.map((n, i) => <span key={i} style={{ marginRight: '12px' }}>{i + 1}.{n}</span>)
              : <span style={{ color: 'var(--text-muted)' }}>- ไม่มีพนักงานลาป่วย -</span>
            }
          </div>
        </div>
      </div>

      {/* Daily Attendance Input Table Checklist */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>📋 รายชื่อบุคลากรและตัวเลือกบันทึกเวลา ({filteredEmployees.length} คน)</h3>
          <div className="search-input-wrapper" style={{ minWidth: '220px', maxWidth: '320px', margin: 0 }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              style={{ padding: '8px 12px 8px 36px', fontSize: '0.85rem' }}
              placeholder="ค้นหาชื่อหรือตำแหน่ง..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="employee-table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>ลำดับ</th>
                <th>ชื่อ - นามสกุล</th>
                <th>ตำแหน่ง</th>
                <th style={{ width: '100px', textAlign: 'center' }}>เวลาลงทำงาน</th>
                <th style={{ width: '380px', textAlign: 'center' }}>บันทึกการปฏิบัติหน้าที่ประจำวัน</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp, index) => {
                const currentStatus = attendanceStatuses[emp.id] || 'present';
                const currentCheckIn = checkInTimes[emp.id] || '-';
                const cat = getPersonnelCategory(emp.position);
                
                return (
                  <tr key={emp.id} style={{ cursor: 'default' }}>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)' }}>{emp.id}</td>
                    <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{emp.name}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.72rem', width: 'fit-content' }}>{emp.position}</span>
                        <span className="badge badge-cyan" style={{ fontSize: '0.68rem', width: 'fit-content', opacity: 0.8 }}>📍 {emp.location}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="text"
                        value={currentCheckIn}
                        onChange={(e) => handleTimeChange(emp.id, e.target.value)}
                        disabled={currentStatus === 'gov' || currentStatus === 'sick'}
                        style={{
                          width: '82px',
                          padding: '6px',
                          textAlign: 'center',
                          background: currentStatus === 'gov' || currentStatus === 'sick' ? 'transparent' : 'rgba(255,255,255,0.05)',
                          border: currentStatus === 'gov' || currentStatus === 'sick' ? 'none' : '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: currentStatus === 'late' ? 'var(--yellow)' : 'var(--text-main)',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        
                        {/* Status button normal */}
                        <button
                          onClick={() => handleStatusChange(emp.id, 'present')}
                          style={{
                            padding: '6px 12px',
                            background: currentStatus === 'present' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${currentStatus === 'present' ? 'var(--green)' : 'var(--border-color)'}`,
                            color: currentStatus === 'present' ? 'var(--green)' : 'var(--text-muted)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          🟢 มาปกติ
                        </button>

                        {/* Status button late */}
                        <button
                          onClick={() => handleStatusChange(emp.id, 'late')}
                          style={{
                            padding: '6px 12px',
                            background: currentStatus === 'late' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${currentStatus === 'late' ? 'var(--yellow)' : 'var(--border-color)'}`,
                            color: currentStatus === 'late' ? 'var(--yellow)' : 'var(--text-muted)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          ⏰ สาย
                        </button>

                        {/* Status button gov business */}
                        <button
                          onClick={() => handleStatusChange(emp.id, 'gov')}
                          style={{
                            padding: '6px 12px',
                            background: currentStatus === 'gov' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${currentStatus === 'gov' ? 'var(--green)' : 'var(--border-color)'}`,
                            color: currentStatus === 'gov' ? 'var(--green)' : 'var(--text-muted)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          🚗 ไปราชการ
                        </button>

                        {/* Status button sick */}
                        <button
                          onClick={() => handleStatusChange(emp.id, 'sick')}
                          style={{
                            padding: '6px 12px',
                            background: currentStatus === 'sick' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${currentStatus === 'sick' ? 'var(--red)' : 'var(--border-color)'}`,
                            color: currentStatus === 'sick' ? 'var(--red)' : 'var(--text-muted)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          🤕 ลาป่วย
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supabase Connection Setup Modal */}
      {isSupabaseModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSupabaseModalOpen(false)}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--green)' }}>🔌 ตั้งค่าการเชื่อมต่อ Supabase API</h3>
              <button 
                onClick={() => setIsSupabaseModalOpen(false)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold'
                }}
              >✕</button>
            </div>
            
            <form onSubmit={handleSaveSupabaseConfig} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Supabase Project URL:</label>
                <input
                  type="text"
                  required
                  placeholder="https://your-project-id.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  style={{
                    padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Anon API Key (Public Roll):</label>
                <input
                  type="password"
                  required
                  placeholder="eyJhbGciOi..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  style={{
                    padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>ชื่อตาราง (Table Name):</label>
                <input
                  type="text"
                  required
                  placeholder="attendance_logs"
                  value={supabaseTable}
                  onChange={(e) => setSupabaseTable(e.target.value)}
                  style={{
                    padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>คอลัมน์วันที่ (Date Column):</label>
                <input
                  type="text"
                  required
                  placeholder="work_date"
                  value={supabaseDateCol}
                  onChange={(e) => setSupabaseDateCol(e.target.value)}
                  style={{
                    padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>คอลัมน์จับคู่พนักงาน (Match Column):</label>
                <select
                  value={supabaseMatchCol}
                  onChange={(e) => setSupabaseMatchCol(e.target.value)}
                  style={{
                    padding: '8px 12px', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.85rem'
                  }}
                >
                  <option value="employee_id">รหัสลำดับพนักงาน (employee_id)</option>
                  <option value="employee_name">ชื่อ - นามสกุล (employee_name หรือ name)</option>
                </select>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                ℹ️ ข้อมูลนี้จะเชื่อมต่อตรงกับ API REST API ของ Supabase และจะบันทึกเก็บเฉพาะที่หน่วยความจำเครื่องบราวเซอร์ (LocalStorage) ของคุณอย่างปลอดภัย
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('attendance_dashboard_supabase_config');
                    setSupabaseUrl('');
                    setSupabaseKey('');
                    setIsSupabaseConnected(false);
                    setApiStatus('');
                    setIsSupabaseModalOpen(false);
                    resetLocalData();
                  }}
                  style={{
                    flex: 1, padding: '10px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--red)', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem'
                  }}
                >
                  Disconnect
                </button>
                <button
                  type="submit"
                  className="glow-button"
                  style={{
                    flex: 2, padding: '10px', justifyContent: 'center', fontSize: '0.85rem'
                  }}
                >
                  🔌 บันทึกและทดสอบ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signature Setup Modal Dialog */}
      {isSigneeModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSigneeModalOpen(false)}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>✍️ ตั้งค่ารายชื่อผู้ลงนามลายเซ็นท้ายรายงาน</h3>
              <button 
                onClick={() => setIsSigneeModalOpen(false)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold'
                }}
              >✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>1. หัวหน้างานบุคลากร (ซ้าย):</label>
                <input
                  type="text"
                  value={signeePersonnelHead}
                  onChange={(e) => setSigneePersonnelHead(e.target.value)}
                  style={{
                    padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>2. เจ้าหน้าที่งานบุคลากร (ขวา):</label>
                <input
                  type="text"
                  value={signeePersonnelStaff}
                  onChange={(e) => setSigneePersonnelStaff(e.target.value)}
                  style={{
                    padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>3. ผู้อำนวยการ (ล่างสุด):</label>
                <input
                  type="text"
                  value={signeeDirector}
                  onChange={(e) => setSigneeDirector(e.target.value)}
                  style={{
                    padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none'
                  }}
                />
              </div>
            </div>
            <button
              onClick={() => setIsSigneeModalOpen(false)}
              className="glow-button"
              style={{
                marginTop: '20px', width: '100%', justifyContent: 'center', padding: '10px'
              }}
            >
              💾 บันทึกการตั้งค่า
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default DailyReportGenerator;
