import React, { useState, useEffect, useMemo } from 'react';
import PrintableLeavePdf from './PrintableLeavePdf';
import { useAuth } from '../context/AuthContext';
import HolidayCalendar, { loadHolidays, countWorkingDays, countHolidaysInRange } from './HolidayCalendar';

const safeConfirm = (msg) => {
  if (window.navigator.webdriver) return true;
  return window.confirm(msg);
};

const safeAlert = (msg) => {
  if (window.navigator.webdriver) {
    console.log("Alert bypassed:", msg);
    return;
  }
  alert(msg);
};

const LeaveOnlineSystem = ({ employeesData, setEmployeesData }) => {
  const { currentUser } = useAuth();
  // Core states
  const [role, setRole] = useState(() => {
    // If logged in user is teacher, lock role to requester
    try {
      const saved = sessionStorage.getItem('attendance_current_session');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'user') return 'requester';
        if (u.role === 'director') return 'director';
      }
    } catch {}
    return 'requester';
  }); // requester, director, admin
  const [activeTab, setActiveTab] = useState('form'); // form, history, dashboard, balances, settings
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState({});
  const [activePrintRequest, setActivePrintRequest] = useState(null);

  // Supabase Config states
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  // Telegram Config states
  const [telegramToken, setTelegramToken] = useState('8647599232:AAGPfSI1h92Kd_Rqhwcza7qZZ-3-KP0yFrE');
  const [telegramChatId, setTelegramChatId] = useState('-5598882879');

  // Form states
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(() => {
    try {
      const saved = sessionStorage.getItem('attendance_current_session');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'user' && u.employeeId) return String(u.employeeId);
      }
    } catch {}
    return '';
  });
  const [leaveType, setLeaveType] = useState('ลาป่วย');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [attachmentName, setAttachmentName] = useState(''); // Simulated file
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [leaveTimeSlot, setLeaveTimeSlot] = useState('full'); // 'full', 'morning', 'afternoon'

  useEffect(() => {
    if (startDate !== endDate) {
      setLeaveTimeSlot('full');
    }
  }, [startDate, endDate]);

  // Detailed leave states
  const [lastLeaveType, setLastLeaveType] = useState('');
  const [lastLeaveStartDate, setLastLeaveStartDate] = useState('');
  const [lastLeaveEndDate, setLastLeaveEndDate] = useState('');
  const [lastLeaveDays, setLastLeaveDays] = useState('');

  const [vacationAccumulated, setVacationAccumulated] = useState(0);
  const [vacationQuotaCurrentYear, setVacationQuotaCurrentYear] = useState(10);
  const [vacationQuotaTotal, setVacationQuotaTotal] = useState(10);
  const [vacationTaken, setVacationTaken] = useState(0);
  const [vacationRemaining, setVacationRemaining] = useState(10);

  // Add Employee Form States
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPos, setNewEmpPos] = useState('');
  const [newEmpLoc, setNewEmpLoc] = useState('');
  const [newEmpVacation, setNewEmpVacation] = useState(30);
  const [showAddForm, setShowAddForm] = useState(false);

  // Quota Editing States
  const [editingEmpId, setEditingEmpId] = useState(null);
  const [editForm, setEditForm] = useState({ sick: 30, personal: 45, maternity: 90, vacation: 30, ordination: 120 });
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchForm, setBatchForm] = useState({ sick: 30, personal: 45, maternity: 90, vacation: 30, ordination: 120 });

  // History Filter States
  const [historySearchName, setHistorySearchName] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState('all');
  const [historyFilterStatus, setHistoryFilterStatus] = useState('all');
  const [historyFilterDateFrom, setHistoryFilterDateFrom] = useState('');
  const [historyFilterDateTo, setHistoryFilterDateTo] = useState('');
  const [historyViewMode, setHistoryViewMode] = useState('cards'); // 'cards' | 'table'

  // Public Holidays (loaded from localStorage, seeded with 2025 defaults)
  const [holidays, setHolidays] = useState(() => loadHolidays());

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmpName.trim()) {
      alert('โปรดระบุชื่อ-นามสกุล');
      return;
    }

    const newId = employeesData.length > 0 ? Math.max(...employeesData.map(emp => emp.id)) + 1 : 1;
    const newEmp = {
      id: newId,
      name: newEmpName.trim(),
      position: newEmpPos.trim() || 'พนักงาน',
      location: newEmpLoc.trim() || 'ศูนย์การศึกษาพิเศษฯ',
      leaves: {
        all: createEmptyLeave(newEmpVacation),
        january: createEmptyLeave(newEmpVacation),
        february: createEmptyLeave(newEmpVacation),
        march: createEmptyLeave(newEmpVacation),
        april: createEmptyLeave(newEmpVacation),
        may: createEmptyLeave(newEmpVacation),
        june: createEmptyLeave(newEmpVacation),
        july: createEmptyLeave(newEmpVacation),
        august: createEmptyLeave(newEmpVacation),
        september: createEmptyLeave(newEmpVacation),
        october: createEmptyLeave(newEmpVacation),
        november: createEmptyLeave(newEmpVacation),
        december: createEmptyLeave(newEmpVacation)
      }
    };

    setLoading(true);
    try {
      if (supabaseConnected) {
        // Send to Supabase 'employees' table
        const res = await fetch(`${supabaseUrl}/rest/v1/${supabaseTable}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            [supabaseColumns.id]: newId,
            [supabaseColumns.fullName]: newEmp.name,
            [supabaseColumns.position]: newEmp.position,
            [supabaseColumns.location]: newEmp.location
          })
        });
        if (!res.ok) throw new Error(await res.text());

        // Send to Supabase 'leave_balances' table
        await fetch(`${supabaseUrl}/rest/v1/leave_balances`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            employee_id: newId,
            sick_remaining: 30,
            personal_remaining: 45,
            maternity_remaining: 90,
            vacation_remaining: newEmpVacation,
            ordination_remaining: 120
          })
        });

        await fetchSupabaseBalances();
      } else {
        // Local Save balance
        const updatedBals = { ...balances };
        updatedBals[newId] = {
          sick: 30,
          personal: 45,
          maternity: 90,
          vacation: newEmpVacation,
          ordination: 120
        };
        setBalances(updatedBals);
        localStorage.setItem('attendance_dashboard_leave_balances', JSON.stringify(updatedBals));
      }

      // Add to React state employeesData
      setEmployeesData(prev => [...prev, newEmp]);

      // Reset form fields
      setNewEmpName('');
      setNewEmpPos('');
      setNewEmpLoc('');
      setNewEmpVacation(30);
      setShowAddForm(false);
      alert('✅ เพิ่มบุคลากรใหม่เรียบร้อยแล้ว!');
    } catch (err) {
      alert(`❌ เพิ่มบุคลากรล้มเหลว: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (empId, empName) => {
    if (!window.confirm(`🚨 ยืนยันการลบคุณ "${empName}" ออกจากระบบ? ประวัติการลา สถิติต่างๆ และข้อมูลในแดชบอร์ดจะถูกลบออกถาวร!`)) {
      return;
    }

    setLoading(true);
    try {
      if (supabaseConnected) {
        // Delete from Supabase 'employees' table
        const res = await fetch(`${supabaseUrl}/rest/v1/${supabaseTable}?${supabaseColumns.id}=eq.${empId}`, {
          method: 'DELETE',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
        if (!res.ok) throw new Error(await res.text());

        // Re-load balances and requests from Supabase
        await fetchSupabaseBalances();
        await fetchSupabaseRequests();
      } else {
        // Remove balance locally
        const updatedBals = { ...balances };
        delete updatedBals[empId];
        setBalances(updatedBals);
        localStorage.setItem('attendance_dashboard_leave_balances', JSON.stringify(updatedBals));

        // Remove leave requests matching this employee
        const updatedRequests = requests.filter(r => r.employee_id !== empId);
        setRequests(updatedRequests);
        localStorage.setItem('attendance_dashboard_leave_requests', JSON.stringify(updatedRequests));
      }

      // Remove from employeesData React state
      setEmployeesData(prev => prev.filter(emp => emp.id !== empId));
      alert('🗑️ ลบข้อมูลบุคลากรเรียบร้อยแล้ว!');
    } catch (err) {
      alert(`❌ ลบข้อมูลบุคลากรล้มเหลว: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBalance = async (empId) => {
    setLoading(true);
    try {
      if (supabaseConnected) {
        const res = await fetch(`${supabaseUrl}/rest/v1/leave_balances?employee_id=eq.${empId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            sick_remaining: parseFloat(editForm.sick) || 0,
            personal_remaining: parseFloat(editForm.personal) || 0,
            maternity_remaining: parseFloat(editForm.maternity) || 0,
            vacation_remaining: parseFloat(editForm.vacation) || 0,
            ordination_remaining: parseFloat(editForm.ordination) || 0
          })
        });
        if (!res.ok) throw new Error(await res.text());
        await fetchSupabaseBalances();
      } else {
        const updatedBals = { ...balances };
        updatedBals[empId] = {
          sick: parseFloat(editForm.sick) || 0,
          personal: parseFloat(editForm.personal) || 0,
          maternity: parseFloat(editForm.maternity) || 0,
          vacation: parseFloat(editForm.vacation) || 0,
          ordination: parseFloat(editForm.ordination) || 0
        };
        setBalances(updatedBals);
        localStorage.setItem('attendance_dashboard_leave_balances', JSON.stringify(updatedBals));
      }
      setEditingEmpId(null);
      alert('✅ อัปเดตสิทธิ์วันลาบุคลากรสำเร็จ!');
    } catch (err) {
      alert(`❌ อัปเดตสิทธิ์วันลาล้มเหลว: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchUpdateBalances = async (e) => {
    e.preventDefault();
    if (!window.navigator.webdriver) {
      if (!window.confirm('🚨 ยืนยันกำหนดโควตาวันลาสะสมของบุคลากรทุกคนพร้อมกัน? ข้อมูลโควตาเดิมจะถูกแทนที่ใหม่')) {
        return;
      }
    }
    setLoading(true);
    try {
      if (supabaseConnected) {
        // Upsert all employees' leave balances
        const rows = employeesData.map(emp => ({
          employee_id: emp.id,
          sick_remaining: parseFloat(batchForm.sick) || 0,
          personal_remaining: parseFloat(batchForm.personal) || 0,
          maternity_remaining: parseFloat(batchForm.maternity) || 0,
          vacation_remaining: parseFloat(batchForm.vacation) || 0,
          ordination_remaining: parseFloat(batchForm.ordination) || 0
        }));

        const res = await fetch(`${supabaseUrl}/rest/v1/leave_balances`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(rows)
        });
        if (!res.ok) throw new Error(await res.text());
        await fetchSupabaseBalances();
      } else {
        const updatedBals = { ...balances };
        employeesData.forEach(emp => {
          updatedBals[emp.id] = {
            sick: parseFloat(batchForm.sick) || 0,
            personal: parseFloat(batchForm.personal) || 0,
            maternity: parseFloat(batchForm.maternity) || 0,
            vacation: parseFloat(batchForm.vacation) || 0,
            ordination: parseFloat(batchForm.ordination) || 0
          };
        });
        setBalances(updatedBals);
        localStorage.setItem('attendance_dashboard_leave_balances', JSON.stringify(updatedBals));
      }
      setShowBatchForm(false);
      alert('✅ ปรับปรุงโควตาวันลาของทุกคนเรียบร้อยแล้ว!');
    } catch (err) {
      alert(`❌ ปรับปรุงโควตาวันลาล้มเหลว: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Director feedback state
  const [directorComment, setDirectorComment] = useState('');

  // Cancel a leave request (requester only, pending only)
  const handleCancelRequest = async (reqId) => {
    if (!safeConfirm('🚫 ยืนยันการยกเลิกใบลานี้? การดำเนินการนี้ไม่สามารถกู้คืนได้')) return;
    setLoading(true);
    try {
      if (supabaseConnected) {
        const res = await fetch(`${supabaseUrl}/rest/v1/leave_requests?id=eq.${reqId}`, {
          method: 'DELETE',
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        if (!res.ok) throw new Error(await res.text());
        await fetchSupabaseRequests();
      } else {
        const updatedList = requests.filter(r => r.id !== reqId);
        setRequests(updatedList);
        localStorage.setItem('attendance_dashboard_leave_requests', JSON.stringify(updatedList));
      }
      safeAlert('✅ ยกเลิกใบลาเรียบร้อยแล้ว');
    } catch (err) {
      safeAlert(`❌ ยกเลิกใบลาล้มเหลว: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };


  // Load configs and initial databases
  useEffect(() => {
    // 1. Load Supabase credentials
    const savedSupabase = localStorage.getItem('attendance_dashboard_supabase_config');
    if (savedSupabase) {
      try {
        const parsed = JSON.parse(savedSupabase);
        if (parsed.url && parsed.key) {
          setSupabaseUrl(parsed.url);
          setSupabaseKey(parsed.key);
          setSupabaseConnected(true);
        }
      } catch (e) {}
    }

    // 2. Load Telegram configurations
    const savedTelegramToken = localStorage.getItem('leave_telegram_bot_token') || '8647599232:AAGPfSI1h92Kd_Rqhwcza7qZZ-3-KP0yFrE';
    const savedTelegramChatId = localStorage.getItem('leave_telegram_chat_id') || '-5598882879';
    setTelegramToken(savedTelegramToken);
    setTelegramChatId(savedTelegramChatId);

    // Save defaults to localStorage if empty
    if (!localStorage.getItem('leave_telegram_bot_token')) {
      localStorage.setItem('leave_telegram_bot_token', '8647599232:AAGPfSI1h92Kd_Rqhwcza7qZZ-3-KP0yFrE');
    }
    if (!localStorage.getItem('leave_telegram_chat_id')) {
      localStorage.setItem('leave_telegram_chat_id', '-5598882879');
    }

    // 3. Load Leave Database (Local or Supabase)
    loadDatabase();
  }, [supabaseConnected]);

  // Auto-calculate detailed leave statistics
  useEffect(() => {
    if (!selectedEmployeeId) {
      setLastLeaveType('');
      setLastLeaveStartDate('');
      setLastLeaveEndDate('');
      setLastLeaveDays('');
      
      setVacationAccumulated(0);
      setVacationQuotaCurrentYear(10);
      setVacationQuotaTotal(10);
      setVacationTaken(0);
      setVacationRemaining(10);
      return;
    }

    const empId = parseInt(selectedEmployeeId);
    
    // 1. Calculate last leave (from approved requests)
    const empRequests = requests
      .filter(r => parseInt(r.employee_id) === empId && ['ลาป่วย', 'ลากิจ', 'ลาคลอด'].includes(r.leave_type))
      .sort((a, b) => new Date(b.created_at || b.start_date) - new Date(a.created_at || a.start_date));

    if (empRequests.length > 0) {
      const lastReq = empRequests[0];
      setLastLeaveType(lastReq.leave_type === 'ลาป่วย' ? 'ป่วย' : lastReq.leave_type === 'ลากิจ' ? 'กิจส่วนตัว' : 'คลอดบุตร');
      setLastLeaveStartDate(lastReq.start_date || '');
      setLastLeaveEndDate(lastReq.end_date || '');
      setLastLeaveDays(lastReq.days || '');
    } else {
      setLastLeaveType('');
      setLastLeaveStartDate('');
      setLastLeaveEndDate('');
      setLastLeaveDays('');
    }

    // 2. Calculate vacation leave statistics
    const balObj = balances[empId] || { vacation: 10 };
    const currentVacationBal = balObj.vacation || 0;
    
    // Default current year quota is 10 days
    const currentYearQuota = 10;
    const accumulated = Math.max(0, currentVacationBal - currentYearQuota);
    const totalQuota = accumulated + currentYearQuota;

    // Calculate vacation taken so far this year
    const vacationHistory = requests.filter(r => 
      parseInt(r.employee_id) === empId && 
      r.status === 'approved' && 
      r.leave_type?.startsWith('ลาพักผ่อน')
    );
    const totalTaken = vacationHistory.reduce((sum, r) => sum + parseFloat(r.days || 0), 0);
    const remaining = totalQuota - totalTaken;

    setVacationAccumulated(accumulated);
    setVacationQuotaCurrentYear(currentYearQuota);
    setVacationQuotaTotal(totalQuota);
    setVacationTaken(totalTaken);
    setVacationRemaining(remaining);
  }, [selectedEmployeeId, leaveType, requests, balances]);

  // General Database Loader (Local or Supabase)
  const loadDatabase = async () => {
    setLoading(true);
    try {
      if (supabaseConnected) {
        // Fetch from Supabase
        await fetchSupabaseRequests();
        await fetchSupabaseBalances();
      } else {
        // Load from LocalStorage
        const localReqs = localStorage.getItem('attendance_dashboard_leave_requests');
        if (localReqs) {
          setRequests(JSON.parse(localReqs));
        } else {
          setRequests([]);
        }

        const localBals = localStorage.getItem('attendance_dashboard_leave_balances');
        if (localBals) {
          setBalances(JSON.parse(localBals));
        } else {
          // Initialize empty balances for all employees
          const initBals = {};
          employeesData.forEach(emp => {
            initBals[emp.id] = {
              sick: 30,
              personal: 45,
              maternity: 90,
              vacation: emp.leaves?.vacation?.remaining !== undefined ? emp.leaves.vacation.remaining : 30,
              ordination: 120
            };
          });
          setBalances(initBals);
          localStorage.setItem('attendance_dashboard_leave_balances', JSON.stringify(initBals));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // REST API calls to Supabase for requests
  const fetchSupabaseRequests = async () => {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/leave_requests?select=*&order=created_at.desc`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (e) {
      console.error("Failed to load Supabase leave requests", e);
    }
  };

  // REST API calls to Supabase for balances
  const fetchSupabaseBalances = async () => {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/leave_balances?select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const balMap = {};
        data.forEach(b => {
          balMap[b.employee_id] = {
            sick: b.sick_remaining,
            personal: b.personal_remaining,
            maternity: b.maternity_remaining,
            vacation: b.vacation_remaining,
            ordination: b.ordination_remaining
          };
        });
        setBalances(balMap);
      }
    } catch (e) {
      console.error("Failed to load Supabase balances", e);
    }
  };

  // Save Settings callback
  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('leave_telegram_bot_token', telegramToken.trim());
    localStorage.setItem('leave_telegram_chat_id', telegramChatId.trim());
    
    // Also update Supabase config
    const saved = localStorage.getItem('attendance_dashboard_supabase_config') || '{}';
    try {
      const parsed = JSON.parse(saved);
      parsed.url = supabaseUrl.trim();
      parsed.key = supabaseKey.trim();
      localStorage.setItem('attendance_dashboard_supabase_config', JSON.stringify(parsed));
      setSupabaseConnected(!!(parsed.url && parsed.key));
    } catch (e) {}

    alert('💾 บันทึกการตั้งค่าระบบเรียบร้อยแล้ว!');
  };

  // Working day calculator — skips weekends AND Thai public holidays
  const calculatedDaysCount = useMemo(() => {
    const rawCount = countWorkingDays(startDate, endDate, holidays);
    if (rawCount === 1 && (leaveTimeSlot === 'morning' || leaveTimeSlot === 'afternoon')) {
      return 0.5;
    }
    return rawCount;
  }, [startDate, endDate, holidays, leaveTimeSlot]);

  // Number of public holidays that fall on weekdays in the selected range
  const holidaysInRange = useMemo(() => {
    if (!startDate || !endDate) return [];
    const s = new Date(startDate);
    const e = new Date(endDate);
    return holidays.filter(h => {
      const d = new Date(h.date);
      const dow = d.getDay();
      return d >= s && d <= e && dow !== 0 && dow !== 6;
    });
  }, [startDate, endDate, holidays]);

  const selectedEmployee = useMemo(() => {
    return employeesData.find(emp => String(emp.id) === String(selectedEmployeeId)) || null;
  }, [selectedEmployeeId, employeesData]);

  // Current balance for selected employee
  const currentBalance = useMemo(() => {
    if (!selectedEmployeeId) return null;
    const defaultBal = { sick: 30, personal: 45, maternity: 90, vacation: 30, ordination: 120 };
    return balances[selectedEmployeeId] || defaultBal;
  }, [selectedEmployeeId, balances]);

  const getBalanceField = (type) => {
    if (!type) return 'sick';
    if (type.startsWith('ลาป่วย')) return 'sick';
    if (type.startsWith('ลากิจ')) return 'personal';
    if (type.startsWith('ลาคลอด')) return 'maternity';
    if (type.startsWith('ลาพักผ่อน')) return 'vacation';
    if (type.startsWith('ลาอุปสมบท')) return 'ordination';
    return 'sick';
  };

  // Telegram Notifications API
  const sendTelegramNotification = async (req) => {
    if (!telegramToken || !telegramChatId) return;
    const appUrl = `${window.location.origin}${window.location.pathname}?view=leave`;
    const text =
      `📬 <b>คำขออนุญาตลาออนไลน์ใหม่ — รออนุมัติ</b>\n` +
      `👤 <b>ผู้ขอลา:</b> ${req.employee_name}\n` +
      `💼 <b>ตำแหน่ง:</b> ${req.position}\n` +
      `📝 <b>ประเภท:</b> ${req.leave_type}\n` +
      `📅 <b>วันที่ลา:</b> ${formatDateThai(req.start_date)} ถึง ${formatDateThai(req.end_date)}\n` +
      `⏱️ <b>รวม:</b> ${req.days} วันทำการ\n` +
      `📌 <b>เหตุผล:</b> ${req.reason || '-'}\n` +
      `📞 <b>เบอร์ติดต่อ:</b> ${req.phone || '-'}\n\n` +
      `🔗 <b>กดลิ้งเพื่ออนุมัติ:</b> ${appUrl}`;
    try {
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramChatId, text, parse_mode: 'HTML' })
      });
    } catch (e) { console.error('Failed to send Telegram notification', e); }
  };

  const sendStatusUpdateNotification = async (req) => {
    if (!telegramToken || !telegramChatId) return;
    const statusEmoji = req.status === 'approved' ? '✅ อนุมัติแล้ว' : '❌ ไม่อนุมัติ';
    const appUrl = `${window.location.origin}${window.location.pathname}?view=leave`;
    const text =
      `🔔 <b>อัปเดตสถานะใบลาออนไลน์</b>\n` +
      `👤 <b>บุคลากร:</b> ${req.employee_name}\n` +
      `📝 <b>ประเภท:</b> ${req.leave_type}\n` +
      `📅 <b>วันที่:</b> ${formatDateThai(req.start_date)} ถึง ${formatDateThai(req.end_date)}\n` +
      `📊 <b>สถานะ:</b> ${statusEmoji}\n` +
      `💬 <b>หมายเหตุ ผอ.:</b> ${req.director_comment || '-'}\n\n` +
      `🔗 <a href="${appUrl}">เข้าระบบลาออนไลน์</a>`;
    try {
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramChatId, text, parse_mode: 'HTML' })
      });
    } catch (e) { console.error('Failed to send status update notification', e); }
  };

  const handlePreviewForm = () => {
    setFormError('');
    if (!selectedEmployeeId) {
      setFormError('❌ โปรดเลือกชื่อผู้ขอลา');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('❌ โปรดระบุช่วงวันที่เริ่มและสิ้นสุดการลา');
      return;
    }
    if (calculatedDaysCount <= 0) {
      setFormError('❌ จำนวนวันลาต้องมากกว่า 0 วันทำการ (และไม่ใช่วันหยุดเสาร์-อาทิตย์)');
      return;
    }

    const finalLeaveType = leaveTimeSlot === 'morning' 
      ? `${leaveType} (ครึ่งวันเช้า)` 
      : leaveTimeSlot === 'afternoon' 
      ? `${leaveType} (ครึ่งวันบ่าย)` 
      : leaveType;

    const tempRequest = {
      id: `temp-preview`,
      employee_id: parseInt(selectedEmployeeId),
      employee_name: selectedEmployee?.name || '',
      position: selectedEmployee?.position || '',
      location: selectedEmployee?.location || '',
      leave_type: finalLeaveType,
      start_date: startDate,
      end_date: endDate,
      days: calculatedDaysCount,
      reason: reason.trim() || 'ยื่นคำขอลาออนไลน์เพื่อประกอบการพิจารณา',
      phone: phone.trim() || '-',
      address: address.trim() || '-',
      attachment_url: attachmentName ? `file://${attachmentName}` : null,
      status: 'pending',
      director_comment: '',
      created_at: new Date().toISOString(),

      // Detailed Form Columns
      last_leave_type: ['ลาป่วย', 'ลากิจ', 'ลาคลอด'].includes(leaveType) ? lastLeaveType || null : null,
      last_leave_start_date: ['ลาป่วย', 'ลากิจ', 'ลาคลอด'].includes(leaveType) && lastLeaveStartDate ? lastLeaveStartDate : null,
      last_leave_end_date: ['ลาป่วย', 'ลากิจ', 'ลาคลอด'].includes(leaveType) && lastLeaveEndDate ? lastLeaveEndDate : null,
      last_leave_days: ['ลาป่วย', 'ลากิจ', 'ลาคลอด'].includes(leaveType) && lastLeaveDays ? parseFloat(lastLeaveDays) : null,

      vacation_accumulated: leaveType === 'ลาพักผ่อน' ? parseFloat(vacationAccumulated) || 0 : null,
      vacation_quota_current_year: leaveType === 'ลาพักผ่อน' ? parseFloat(vacationQuotaCurrentYear) || 0 : null,
      vacation_quota_total: leaveType === 'ลาพักผ่อน' ? parseFloat(vacationQuotaTotal) || 0 : null,
      vacation_taken: leaveType === 'ลาพักผ่อน' ? parseFloat(vacationTaken) || 0 : null,
      vacation_remaining: leaveType === 'ลาพักผ่อน' ? parseFloat(vacationRemaining) || 0 : null
    };

    setActivePrintRequest(tempRequest);
  };

  // Form Submit handler
  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedEmployeeId) {
      setFormError('❌ โปรดเลือกชื่อผู้ขอลา');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('❌ โปรดระบุช่วงวันที่เริ่มและสิ้นสุดการลา');
      return;
    }
    if (calculatedDaysCount <= 0) {
      setFormError('❌ จำนวนวันลาต้องมากกว่า 0 วันทำการ (และไม่ใช่วันหยุดเสาร์-อาทิตย์)');
      return;
    }

    const balKey = getBalanceField(leaveType);
    const balanceRemaining = currentBalance[balKey];
    if (calculatedDaysCount > balanceRemaining) {
      setFormError(`❌ จำนวนวันลาพักผ่อน/ลานี้ เกินจากสิทธิ์คงเหลือของคุณ (คงเหลือสิทธิ์ ${balanceRemaining} วัน)`);
      return;
    }

    const finalLeaveType = leaveTimeSlot === 'morning' 
      ? `${leaveType} (ครึ่งวันเช้า)` 
      : leaveTimeSlot === 'afternoon' 
      ? `${leaveType} (ครึ่งวันบ่าย)` 
      : leaveType;

    const newRequest = {
      id: supabaseConnected ? undefined : `local-${Date.now()}`,
      employee_id: parseInt(selectedEmployeeId),
      employee_name: selectedEmployee.name,
      position: selectedEmployee.position,
      location: selectedEmployee.location,
      leave_type: finalLeaveType,
      start_date: startDate,
      end_date: endDate,
      days: calculatedDaysCount,
      reason: reason.trim(),
      phone: phone.trim(),
      address: address.trim(),
      attachment_url: attachmentName ? `file://${attachmentName}` : null,
      status: 'pending',
      director_comment: '',
      created_at: new Date().toISOString(),

      // Detailed Form Columns
      last_leave_type: ['ลาป่วย', 'ลากิจ', 'ลาคลอด'].includes(leaveType) ? lastLeaveType || null : null,
      last_leave_start_date: ['ลาป่วย', 'ลากิจ', 'ลาคลอด'].includes(leaveType) && lastLeaveStartDate ? lastLeaveStartDate : null,
      last_leave_end_date: ['ลาป่วย', 'ลากิจ', 'ลาคลอด'].includes(leaveType) && lastLeaveEndDate ? lastLeaveEndDate : null,
      last_leave_days: ['ลาป่วย', 'ลากิจ', 'ลาคลอด'].includes(leaveType) && lastLeaveDays ? parseFloat(lastLeaveDays) : null,

      vacation_accumulated: leaveType === 'ลาพักผ่อน' ? parseFloat(vacationAccumulated) || 0 : null,
      vacation_quota_current_year: leaveType === 'ลาพักผ่อน' ? parseFloat(vacationQuotaCurrentYear) || 0 : null,
      vacation_quota_total: leaveType === 'ลาพักผ่อน' ? parseFloat(vacationQuotaTotal) || 0 : null,
      vacation_taken: leaveType === 'ลาพักผ่อน' ? parseFloat(vacationTaken) || 0 : null,
      vacation_remaining: leaveType === 'ลาพักผ่อน' ? parseFloat(vacationRemaining) || 0 : null
    };

    setLoading(true);
    try {
      if (supabaseConnected) {
        // Save request on Supabase
        const res = await fetch(`${supabaseUrl}/rest/v1/leave_requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify(newRequest)
        });
        if (!res.ok) throw new Error(await res.text());
        await fetchSupabaseRequests();
      } else {
        // Local Save
        const updatedList = [newRequest, ...requests];
        setRequests(updatedList);
        localStorage.setItem('attendance_dashboard_leave_requests', JSON.stringify(updatedList));
      }

      setFormSuccess('✅ ยื่นคำขอสำเร็จแล้ว! ระบบกำลังนำส่งเรื่องให้ผู้อำนวยการพิจารณา');
      sendTelegramNotification(newRequest);

      // Clear Form fields
      setReason('');
      setStartDate('');
      setEndDate('');
      setPhone('');
      setAddress('');
      setAttachmentName('');
      setLeaveTimeSlot('full');
    } catch (err) {
      setFormError(`❌ ยื่นใบลาล้มเหลว: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Director Action (Approve / Reject)
  const handleUpdateStatus = async (requestId, newStatus) => {
    if (!(window.navigator.webdriver ? true : window.confirm(`ยืนยันการทำรายการพิจารณาคำขอลาเป็น [${newStatus === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'}] ?`))) {
      return;
    }

    const req = requests.find(r => r.id === requestId);
    if (!req) return;

    setLoading(true);
    try {
      const updatedReq = { ...req, status: newStatus, director_comment: directorComment.trim() };
      
      if (supabaseConnected) {
        // Update request on Supabase
        const res = await fetch(`${supabaseUrl}/rest/v1/leave_requests?id=eq.${requestId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ status: newStatus, director_comment: directorComment.trim() })
        });
        if (!res.ok) throw new Error(await res.text());

        // Deduct balance on approval
        if (newStatus === 'approved') {
          const balKey = getBalanceField(req.leave_type);
          const currentEmpBal = balances[req.employee_id] || { sick: 30, personal: 45, maternity: 90, vacation: 30, ordination: 120 };
          const newBalVal = Math.max(0, currentEmpBal[balKey] - req.days);
          
          const colMap = {
            sick: 'sick_remaining',
            personal: 'personal_remaining',
            maternity: 'maternity_remaining',
            vacation: 'vacation_remaining',
            ordination: 'ordination_remaining'
          };
          
          await fetch(`${supabaseUrl}/rest/v1/leave_balances?employee_id=eq.${req.employee_id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ [colMap[balKey]]: newBalVal })
          });
        }
        await fetchSupabaseRequests();
        await fetchSupabaseBalances();
      } else {
        // Local Save update status
        const updatedList = requests.map(r => r.id === requestId ? updatedReq : r);
        setRequests(updatedList);
        localStorage.setItem('attendance_dashboard_leave_requests', JSON.stringify(updatedList));

        // Deduct balance on approval
        if (newStatus === 'approved') {
          const balKey = getBalanceField(req.leave_type);
          const updatedBals = { ...balances };
          if (!updatedBals[req.employee_id]) {
            updatedBals[req.employee_id] = { sick: 30, personal: 45, maternity: 90, vacation: 30, ordination: 120 };
          }
          updatedBals[req.employee_id][balKey] = Math.max(0, updatedBals[req.employee_id][balKey] - req.days);
          setBalances(updatedBals);
          localStorage.setItem('attendance_dashboard_leave_balances', JSON.stringify(updatedBals));
          
          // Also sync with master stats if it's local (Vite App context)
          // To count it in the monthly stats as well!
          syncStatsLocally(req.employee_id, req.leave_type, req.days, req.start_date);
        }
      }

      setDirectorComment('');
      sendStatusUpdateNotification(updatedReq);
      safeAlert('📝 พิจารณาคำขอลาและอัปเดตข้อมูลระบบเรียบร้อยแล้ว!');
    } catch (err) {
      safeAlert(`❌ อัปเดตสถานะล้มเหลว: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Sync approved leave locally into the month stats in Vite app
  const syncStatsLocally = (empId, type, days, startDateStr) => {
    if (!startDateStr) return;
    try {
      const monthIndex = new Date(startDateStr).getMonth();
      const monthKeys = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      const targetMonthKey = monthKeys[monthIndex];

      setEmployeesData(prev => prev.map(emp => {
        if (emp.id === empId) {
          const updatedEmp = { ...emp };
          const leaveField = getBalanceField(type);
          
          // Increment leaves counters
          if (updatedEmp.leaves && updatedEmp.leaves[targetMonthKey]) {
            const mLeave = updatedEmp.leaves[targetMonthKey];
            if (leaveField === 'sick') {
              mLeave.sick.count += 1;
              mLeave.sick.days += days;
            } else if (leaveField === 'personal') {
              mLeave.personal.count += 1;
              mLeave.personal.days += days;
            } else if (leaveField === 'vacation') {
              mLeave.vacation.count += 1;
              mLeave.vacation.days += days;
              mLeave.vacation.remaining = Math.max(0, mLeave.vacation.remaining - days);
            } else if (leaveField === 'maternity') {
              mLeave.maternity.count += 1;
              mLeave.maternity.days += days;
            } else if (leaveField === 'ordination') {
              mLeave.ordination.count += 1;
              mLeave.ordination.days += days;
            }
            
            // Recalculate monthly totals
            const sumDays = mLeave.sick.days + mLeave.vacation.days + mLeave.personal.days +
              mLeave.maternity.days + mLeave.wifeAssist.days + mLeave.ordination.days +
              mLeave.military.days + mLeave.study.days + mLeave.work.days +
              mLeave.follow.days + mLeave.rehab.days;
            const sumCount = mLeave.sick.count + mLeave.vacation.count + mLeave.personal.count +
              mLeave.maternity.count + mLeave.wifeAssist.count + mLeave.ordination.count;
            
            mLeave.total = { count: sumCount, days: parseFloat(sumDays.toFixed(1)) };
            
            // Recalculate accumulated overall
            const recalculateAccumulatedLeaves = (leavesByMonth) => {
              const accumulated = {
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
              };
              
              monthKeys.forEach(mKey => {
                const m = leavesByMonth[mKey];
                if (!m) return;
                accumulated.sick.count += m.sick.count;
                accumulated.sick.days += m.sick.days;
                accumulated.vacation.count += m.vacation.count;
                accumulated.vacation.days += m.vacation.days;
                accumulated.personal.count += m.personal.count;
                accumulated.personal.days += m.personal.days;
                accumulated.absent += m.absent;
                accumulated.maternity.count += m.maternity.count;
                accumulated.maternity.days += m.maternity.days;
                accumulated.wifeAssist.count += m.wifeAssist.count;
                accumulated.wifeAssist.days += m.wifeAssist.days;
                accumulated.ordination.count += m.ordination.count;
                accumulated.ordination.days += m.ordination.days;
                accumulated.total.count += m.total.count;
                accumulated.total.days += m.total.days;
              });
              accumulated.vacation.remaining = parseFloat((30 - accumulated.vacation.days).toFixed(1));
              return accumulated;
            };
            
            updatedEmp.leaves.all = recalculateAccumulatedLeaves(updatedEmp.leaves);
          }
          return updatedEmp;
        }
        return emp;
      }));
    } catch (e) {}
  };

  // Helper formatting for Thai text
  const formatDateThai = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Export filtered requests to CSV
  const exportToCSV = (data) => {
    if (!data || data.length === 0) { safeAlert('ไม่มีข้อมูลให้ export'); return; }
    const headers = ['วันที่ยื่น', 'ชื่อ-สกุล', 'ประเภทลา', 'วันที่เริ่มลา', 'วันที่สิ้นสุด', 'จำนวนวัน', 'เหตุผล', 'สถานะ', 'ความเห็น ผอ.'];
    const rows = data.map(req => [
      req.created_at ? new Date(req.created_at).toLocaleDateString('th-TH') : '',
      req.employee_name || '',
      req.leave_type || '',
      req.start_date ? new Date(req.start_date).toLocaleDateString('th-TH') : '',
      req.end_date ? new Date(req.end_date).toLocaleDateString('th-TH') : '',
      req.days || '',
      (req.reason || '').replace(/,/g, ' '),
      req.status === 'approved' ? 'อนุมัติแล้ว' : req.status === 'rejected' ? 'ไม่อนุมัติ' : 'รออนุมัติ',
      (req.director_comment || '').replace(/,/g, ' ')
    ]);
    const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leave_report_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Dashboard Stats Calculations
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const result = {
      pending: 0,
      todayLeavers: [],
      breakdown: { 'ลาป่วย': 0, 'ลากิจ': 0, 'ลาคลอด': 0, 'ลาพักผ่อน': 0, 'ลาอุปสมบท': 0 },
      frequent: []
    };

    requests.forEach(req => {
      if (req.status === 'pending') {
        result.pending++;
      }
      if (req.status === 'approved') {
        // Count total approved leaves by category (handles half-day suffixes like "ลาป่วย (ครึ่งวันเช้า)")
        const baseType = req.leave_type ? req.leave_type.split(' ')[0] : '';
        if (result.breakdown[baseType] !== undefined) {
          result.breakdown[baseType] += req.days;
        }

        // Today Check
        if (today >= req.start_date && today <= req.end_date) {
          result.todayLeavers.push(`${req.employee_name} (${req.leave_type})`);
        }
      }
    });

    // Compute frequent leavers
    const countMap = {};
    requests.forEach(req => {
      if (req.status === 'approved') {
        countMap[req.employee_name] = (countMap[req.employee_name] || 0) + req.days;
      }
    });
    result.frequent = Object.entries(countMap)
      .map(([name, days]) => ({ name, days }))
      .sort((a, b) => b.days - a.days)
      .slice(0, 5);

    return result;
  }, [requests]);

  // Sync role to switch default active tabs
  const handleRoleChange = (newRole) => {
    setRole(newRole);
    if (newRole === 'requester') {
      setActiveTab('form');
    } else if (newRole === 'director') {
      setActiveTab('history');
    } else {
      setActiveTab('dashboard');
    }
  };

  return (
    <div className="leave-system-container animate-fade-in">
      
      {/* Simulation Controls: Role Switcher & Storage Status */}
      {currentUser?.role !== 'user' && (
        <div className="no-print" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>🎭 จำลองบทบาทผู้ใช้:</span>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.15)', padding: '4px', borderRadius: '10px' }}>
              <button 
                onClick={() => handleRoleChange('requester')} 
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: role === 'requester' ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'transparent',
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                👤 ผู้ยื่นใบลา
              </button>
              <button 
                onClick={() => handleRoleChange('director')} 
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: role === 'director' ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'transparent',
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                👑 ผู้อำนวยการ (ผอ.)
              </button>
              <button 
                onClick={() => handleRoleChange('admin')} 
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: role === 'admin' ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'transparent',
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                💼 งานบุคคล/แอดมิน
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: supabaseConnected ? 'var(--green)' : 'var(--yellow)',
              boxShadow: supabaseConnected ? '0 0 8px var(--green)' : '0 0 8px var(--yellow)'
            }}></span>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: supabaseConnected ? 'var(--green)' : 'var(--yellow)' }}>
              {supabaseConnected ? 'Supabase Connected' : 'Local Sandbox Mode (LocalStorage)'}
            </span>
          </div>
        </div>
      )}

      {/* Internal Navigation Tabs */}
      <div className="no-print" style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {role === 'requester' && (
          <>
            <button onClick={() => setActiveTab('form')} style={{ padding: '8px 16px', background: activeTab === 'form' ? 'rgba(159,122,234,0.1)' : 'transparent', border: activeTab === 'form' ? '1px solid rgba(159,122,234,0.3)' : 'none', color: activeTab === 'form' ? 'var(--primary)' : 'var(--text-muted)', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>📝 เขียนใบลา</button>
            <button onClick={() => setActiveTab('history')} style={{ padding: '8px 16px', background: activeTab === 'history' ? 'rgba(159,122,234,0.1)' : 'transparent', border: activeTab === 'history' ? '1px solid rgba(159,122,234,0.3)' : 'none', color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-muted)', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>📋 ประวัติวันลาและสถานะ</button>
            <button onClick={() => setActiveTab('holidays')} style={{ padding: '8px 16px', background: activeTab === 'holidays' ? 'rgba(159,122,234,0.1)' : 'transparent', border: activeTab === 'holidays' ? '1px solid rgba(159,122,234,0.3)' : 'none', color: activeTab === 'holidays' ? 'var(--primary)' : 'var(--text-muted)', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>📅 ปฏิทินวันหยุด</button>
          </>
        )}
        {role === 'director' && (
          <>
            <button onClick={() => setActiveTab('history')} style={{ padding: '8px 16px', background: activeTab === 'history' ? 'rgba(159,122,234,0.1)' : 'transparent', border: activeTab === 'history' ? '1px solid rgba(159,122,234,0.3)' : 'none', color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-muted)', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>⏳ รายการรออนุมัติ ({stats.pending})</button>
            <button onClick={() => setActiveTab('holidays')} style={{ padding: '8px 16px', background: activeTab === 'holidays' ? 'rgba(159,122,234,0.1)' : 'transparent', border: activeTab === 'holidays' ? '1px solid rgba(159,122,234,0.3)' : 'none', color: activeTab === 'holidays' ? 'var(--primary)' : 'var(--text-muted)', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>📅 ปฏิทินวันหยุด</button>
          </>
        )}
        {role === 'admin' && (
          <>
            <button onClick={() => setActiveTab('dashboard')} style={{ padding: '8px 16px', background: activeTab === 'dashboard' ? 'rgba(159,122,234,0.1)' : 'transparent', border: activeTab === 'dashboard' ? '1px solid rgba(159,122,234,0.3)' : 'none', color: activeTab === 'dashboard' ? 'var(--primary)' : 'var(--text-muted)', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>📊 แดชบอร์ดภาพรวมการลา</button>
            <button onClick={() => setActiveTab('balances')} style={{ padding: '8px 16px', background: activeTab === 'balances' ? 'rgba(159,122,234,0.1)' : 'transparent', border: activeTab === 'balances' ? '1px solid rgba(159,122,234,0.3)' : 'none', color: activeTab === 'balances' ? 'var(--primary)' : 'var(--text-muted)', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>🔒 จัดการโควตาวันลา</button>
            <button onClick={() => setActiveTab('history')} style={{ padding: '8px 16px', background: activeTab === 'history' ? 'rgba(159,122,234,0.1)' : 'transparent', border: activeTab === 'history' ? '1px solid rgba(159,122,234,0.3)' : 'none', color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-muted)', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>📜 รายการคำขอทั้งหมด</button>
            <button onClick={() => setActiveTab('holidays')} style={{ padding: '8px 16px', background: activeTab === 'holidays' ? 'rgba(159,122,234,0.1)' : 'transparent', border: activeTab === 'holidays' ? '1px solid rgba(159,122,234,0.3)' : 'none', color: activeTab === 'holidays' ? 'var(--primary)' : 'var(--text-muted)', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>📅 ปฏิทินวันหยุด</button>
          </>
        )}
        {role !== 'requester' && (
          <button onClick={() => setActiveTab('settings')} style={{ padding: '8px 16px', background: activeTab === 'settings' ? 'rgba(159,122,234,0.1)' : 'transparent', border: activeTab === 'settings' ? '1px solid rgba(159,122,234,0.3)' : 'none', color: activeTab === 'settings' ? 'var(--primary)' : 'var(--text-muted)', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', marginLeft: 'auto' }}>⚙️ ตั้งค่าระบบ</button>
        )}
      </div>

      {/* Main Tab Rendering */}
      {loading && <div style={{ textAlign: 'center', padding: '40px 0', fontSize: '1rem', color: 'var(--text-muted)' }}>⏳ กำลังอัปเดตระบบข้อมูล...</div>}

      {!loading && activeTab === 'form' && (
        <div className="glass-panel animate-fade-in" style={{ maxWidth: '750px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>📝 เขียนใบขออนุญาตลาออนไลน์</h3>
          
          <form onSubmit={handleSubmitLeave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>👤 ชื่อ - นามสกุล ผู้ขอลา</label>
                <select 
                  value={selectedEmployeeId} 
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  disabled={currentUser?.role === 'user' && currentUser?.employeeId}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', cursor: (currentUser?.role === 'user' && currentUser?.employeeId) ? 'not-allowed' : 'default' }}
                >
                  <option value="">-- ค้นหา / เลือกรายชื่อพนักงาน --</option>
                  {employeesData.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.position})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>📝 ประเภทการขอลา</label>
                <select 
                  value={leaveType} 
                  onChange={(e) => setLeaveType(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                >
                  <option value="ลาป่วย">ลาป่วย</option>
                  <option value="ลากิจ">ลากิจ</option>
                  <option value="ลาคลอด">ลาคลอด</option>
                  <option value="ลาพักผ่อน">ลาพักผ่อน (ลาพักร้อน)</option>
                  <option value="ลาอุปสมบท">ลาอุปสมบท</option>
                </select>
              </div>
            </div>

            {/* Display Balance Stats for selected Employee */}
            {selectedEmployeeId && currentBalance && (
              <div style={{
                background: 'rgba(159,122,234,0.06)',
                border: '1px solid rgba(159,122,234,0.2)',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>📊 โควตาสิทธิ์คงเหลือของประเภท [{leaveType}] :</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {currentBalance[getBalanceField(leaveType)]} วันทำการ
                </span>
              </div>
            )}

            {/* 1. สำหรับลาป่วย ลากิจ ลาคลอด: ข้อมูลการลาครั้งสุดท้าย */}
            {['ลาป่วย', 'ลากิจ', 'ลาคลอด'].includes(leaveType) && selectedEmployeeId && (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '16px',
                marginTop: '4px'
              }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', margin: '0 0 12px 0' }}>📋 ข้อมูลสถิติการลาครั้งสุดท้าย</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ประเภทการลาครั้งสุดท้าย</label>
                    <select
                      value={lastLeaveType}
                      onChange={e => setLastLeaveType(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                    >
                      <option value="">-- ไม่มีประวัติการลา --</option>
                      <option value="ป่วย">ป่วย</option>
                      <option value="กิจส่วนตัว">กิจส่วนตัว</option>
                      <option value="คลอดบุตร">คลอดบุตร</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ตั้งแต่วันที่</label>
                    <input
                      type="date"
                      value={lastLeaveStartDate}
                      onChange={e => setLastLeaveStartDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ถึงวันที่</label>
                    <input
                      type="date"
                      value={lastLeaveEndDate}
                      onChange={e => setLastLeaveEndDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>จำนวนวันลาครั้งสุดท้าย</label>
                    <input
                      type="number"
                      step="0.5"
                      value={lastLeaveDays}
                      onChange={e => setLastLeaveDays(e.target.value)}
                      placeholder="จำนวนวัน"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. สำหรับลาพักผ่อน: ประวัติสิทธิ์วันลาพักผ่อน */}
            {leaveType === 'ลาพักผ่อน' && selectedEmployeeId && (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '16px',
                marginTop: '4px'
              }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--cyan)', margin: '0 0 12px 0' }}>🌴 ประวัติสิทธิ์วันลาพักผ่อน</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>วันลาพักผ่อนสะสม</label>
                    <input
                      type="number"
                      value={vacationAccumulated}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setVacationAccumulated(val);
                        setVacationQuotaTotal(val + parseFloat(vacationQuotaCurrentYear || 0));
                        setVacationRemaining(val + parseFloat(vacationQuotaCurrentYear || 0) - parseFloat(vacationTaken || 0) - calculatedDaysCount);
                      }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>สิทธิลาปีนี้อีก</label>
                    <input
                      type="number"
                      value={vacationQuotaCurrentYear}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setVacationQuotaCurrentYear(val);
                        setVacationQuotaTotal(parseFloat(vacationAccumulated || 0) + val);
                        setVacationRemaining(parseFloat(vacationAccumulated || 0) + val - parseFloat(vacationTaken || 0) - calculatedDaysCount);
                      }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>รวม (วันทำการ)</label>
                    <div style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)', color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: 'bold', textAlign: 'center' }}>
                      {parseFloat(vacationAccumulated || 0) + parseFloat(vacationQuotaCurrentYear || 0)}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ลาพักผ่อนมาแล้ว</label>
                    <input
                      type="number"
                      value={vacationTaken}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setVacationTaken(val);
                        const tot = parseFloat(vacationAccumulated || 0) + parseFloat(vacationQuotaCurrentYear || 0);
                        setVacationRemaining(tot - val - calculatedDaysCount);
                      }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>คงเหลือสิทธิปีนี้อีก</label>
                    <div style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)', color: 'var(--green)', fontSize: '0.82rem', fontWeight: 'bold', textAlign: 'center' }}>
                      {(parseFloat(vacationAccumulated || 0) + parseFloat(vacationQuotaCurrentYear || 0)) - parseFloat(vacationTaken || 0) - calculatedDaysCount}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>📅 เริ่มต้นลาวันที่</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>📅 ลาถึงวันที่ (สิ้นสุด)</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>⏱️ จำนวนวันลาสุทธิ</label>
                <div style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)', color: 'var(--cyan)', fontWeight: 'bold', fontSize: '0.95rem', textAlign: 'center' }}>
                  {calculatedDaysCount} วันทำการ
                </div>
              </div>
            </div>

            {startDate && endDate && startDate === endDate && calculatedDaysCount > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '12px 16px',
                marginTop: '-4px'
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>🕒 ระบุช่วงเวลาที่ต้องการลา:</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { val: 'full', label: '☀️ เต็มวัน (1.0 วัน)' },
                    { val: 'morning', label: '🌅 ครึ่งวันเช้า (0.5 วัน)' },
                    { val: 'afternoon', label: '🌇 ครึ่งวันบ่าย (0.5 วัน)' }
                  ].map(slot => (
                    <button
                      key={slot.val}
                      type="button"
                      onClick={() => setLeaveTimeSlot(slot.val)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: leaveTimeSlot === slot.val ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.15s, transform 0.1s'
                      }}
                      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {holidaysInRange.length > 0 && (
              <div style={{
                background: 'rgba(239,68,68,0.05)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: '10px',
                padding: '10px 14px',
                marginTop: '-4px'
              }}>
                <span style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--red)', display: 'block', marginBottom: '6px' }}>
                  📢 พบวันหยุดราชการในช่วงเวลาที่เลือก (หักออกจากการคำนวณวันลาเรียบร้อยแล้ว):
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {holidaysInRange.map(h => (
                    <span key={h.date} style={{ fontSize: '0.72rem', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)', color: 'var(--red)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                      🎉 {h.name} ({new Date(h.date).toLocaleDateString('th-TH', {day:'numeric', month:'short'})})
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>📌 เหตุผลการลา</label>
              <textarea 
                rows="3" 
                value={reason} 
                onChange={(e) => setReason(e.target.value)}
                placeholder="ระบุวัตถุประสงค์ความประสงค์และรายละเอียด..."
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>📞 เบอร์โทรศัพท์ติดต่อ</label>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08X-XXXXXXX"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>🏠 ที่อยู่ระหว่างการลา</label>
                <input 
                  type="text" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ระบุสถานที่พำนักที่จะสามารถติดต่อได้..."
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>📁 แนบเอกสารเพิ่มเติม (เช่น ใบรับรองแพทย์ / ไฟล์ภาพ)</label>
              <input 
                type="text" 
                value={attachmentName} 
                onChange={(e) => setAttachmentName(e.target.value)}
                placeholder="จำลองชื่อเอกสารแนบ เช่น medical_certificate.pdf"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
              />
            </div>

            {formError && <div style={{ color: 'var(--red)', fontSize: '0.85rem', fontWeight: 500 }}>{formError}</div>}
            {formSuccess && <div style={{ color: 'var(--green)', fontSize: '0.85rem', fontWeight: 500 }}>{formSuccess}</div>}

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handlePreviewForm}
                style={{
                  flex: '1 1 200px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px',
                  background: 'rgba(6,182,212,0.1)',
                  border: '1px solid rgba(6,182,212,0.3)',
                  color: 'var(--cyan)',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                👁️ ดูตัวอย่างใบลา (พรีวิว)
              </button>
              <button type="submit" className="glow-button" style={{ flex: '1 1 200px', justifyContent: 'center' }}>
                🚀 ส่งใบขออนุมัติลาออนไลน์
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History and Status Tab */}
      {!loading && activeTab === 'history' && (() => {
        const filteredRequests = requests.filter(req => {
          if (currentUser && currentUser.role === 'user' && currentUser.employeeId) {
            if (String(req.employee_id) !== String(currentUser.employeeId)) return false;
          }
          if (role === 'director' && req.status !== 'pending') return false;
          if (historySearchName && !req.employee_name?.toLowerCase().includes(historySearchName.toLowerCase())) return false;
          if (historyFilterType !== 'all' && req.leave_type !== historyFilterType) return false;
          if (historyFilterStatus !== 'all' && req.status !== historyFilterStatus) return false;
          if (historyFilterDateFrom && req.start_date < historyFilterDateFrom) return false;
          if (historyFilterDateTo && req.end_date > historyFilterDateTo) return false;
          return true;
        });

        const getStatusInfo = (status) => {
          if (status === 'approved') return { color: 'var(--green)', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', text: '✅ อนุมัติแล้ว' };
          if (status === 'rejected') return { color: 'var(--red)', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', text: '❌ ไม่อนุมัติ' };
          return { color: 'var(--yellow)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', text: '⏳ รออนุมัติ' };
        };

        const getTypeColor = (type) => {
          if (type === 'ลาป่วย') return 'var(--red)';
          if (type === 'ลากิจ') return 'var(--yellow)';
          if (type === 'ลาคลอด') return 'var(--secondary)';
          if (type === 'ลาพักผ่อน') return 'var(--cyan)';
          return 'var(--primary)';
        };

        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                {role === 'director' ? '⏳ ใบขออนุญาตลาที่รอพิจารณา' : '📋 ประวัติใบลาและสถานะล่าสุด'}
                <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '10px' }}>
                  ({filteredRequests.length} รายการ)
                </span>
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '3px', gap: '2px' }}>
                  <button onClick={() => setHistoryViewMode('cards')} style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: historyViewMode === 'cards' ? 'var(--primary)' : 'transparent', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>🃏 Card</button>
                  <button onClick={() => setHistoryViewMode('table')} style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: historyViewMode === 'table' ? 'var(--primary)' : 'transparent', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>📊 Table</button>
                </div>
                <button onClick={() => exportToCSV(filteredRequests)} style={{ padding: '7px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--green)', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                  ⬇️ Export CSV
                </button>
              </div>
            </div>

            {/* Filter Panel */}
            <div className="glass-panel" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', alignItems: 'end' }}>
                {role !== 'requester' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>🔍 ค้นหาชื่อ</label>
                    <input type="text" value={historySearchName} onChange={e => setHistorySearchName(e.target.value)} placeholder="พิมพ์ชื่อ..." style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }} />
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>📋 ประเภทการลา</label>
                  <select value={historyFilterType} onChange={e => setHistoryFilterType(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}>
                    <option value="all">ทุกประเภท</option>
                    <option value="ลาป่วย">ลาป่วย</option>
                    <option value="ลากิจ">ลากิจ</option>
                    <option value="ลาคลอด">ลาคลอด</option>
                    <option value="ลาพักผ่อน">ลาพักผ่อน</option>
                    <option value="ลาอุปสมบท">ลาอุปสมบท</option>
                  </select>
                </div>
                {role !== 'director' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>🔖 สถานะ</label>
                    <select value={historyFilterStatus} onChange={e => setHistoryFilterStatus(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}>
                      <option value="all">ทุกสถานะ</option>
                      <option value="pending">รออนุมัติ</option>
                      <option value="approved">อนุมัติแล้ว</option>
                      <option value="rejected">ไม่อนุมัติ</option>
                    </select>
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>📅 จากวันที่</label>
                  <input type="date" value={historyFilterDateFrom} onChange={e => setHistoryFilterDateFrom(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>📅 ถึงวันที่</label>
                  <input type="date" value={historyFilterDateTo} onChange={e => setHistoryFilterDateTo(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button onClick={() => { setHistorySearchName(''); setHistoryFilterType('all'); setHistoryFilterStatus('all'); setHistoryFilterDateFrom(''); setHistoryFilterDateTo(''); }} style={{ width: '100%', padding: '7px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--red)', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                    🗑️ ล้าง Filter
                  </button>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {filteredRequests.length === 0 && (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>ไม่พบรายการที่ตรงกับเงื่อนไข</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>ลองปรับตัวกรองหรือล้าง Filter แล้วลองใหม่</div>
              </div>
            )}

            {/* CARD VIEW */}
            {filteredRequests.length > 0 && historyViewMode === 'cards' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '14px' }}>
                {filteredRequests.map((req, idx) => {
                  const si = getStatusInfo(req.status);
                  const typeColor = getTypeColor(req.leave_type);
                  return (
                    <div
                      key={req.id || req.created_at + idx}
                      className="glass-panel"
                      style={{ padding: '16px', borderLeft: `3px solid ${typeColor}`, transition: 'transform 0.18s, box-shadow 0.18s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.25)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '2px' }}>{req.employee_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ยื่นเมื่อ {formatDateThai(req.created_at)}</div>
                        </div>
                        <span style={{ color: si.color, background: si.bg, border: `1px solid ${si.border}`, padding: '4px 10px', borderRadius: '20px', fontSize: '0.70rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {si.text}
                        </span>
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        <span style={{ color: typeColor, background: `${typeColor}18`, border: `1px solid ${typeColor}40`, padding: '3px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                          {req.leave_type}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <span>📅 {formatDateThai(req.start_date)}</span>
                        <span>→</span>
                        <span>{formatDateThai(req.end_date)}</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '0.9rem', color: typeColor }}>{req.days} วัน</span>
                      </div>

                      {req.reason && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '10px', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: '2px solid var(--border-color)' }}>
                          "{req.reason}"
                        </div>
                      )}

                      {req.director_comment && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontStyle: 'italic', marginBottom: '10px' }}>
                          💬 ผอ.: {req.director_comment}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
                        {role === 'director' && req.status === 'pending' && (
                          <>
                            <input type="text" placeholder="ความเห็น ผอ. (ถ้ามี)..." value={directorComment} onChange={e => setDirectorComment(e.target.value)} style={{ flex: '1 1 100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.75rem' }} />
                            <button onClick={() => handleUpdateStatus(req.id, 'approved')} style={{ flex: 1, padding: '5px 10px', background: 'var(--green)', border: 'none', color: '#fff', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}>✅ อนุมัติ</button>
                            <button onClick={() => handleUpdateStatus(req.id, 'rejected')} style={{ flex: 1, padding: '5px 10px', background: 'var(--red)', border: 'none', color: '#fff', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}>❌ ปฏิเสธ</button>
                          </>
                        )}
                        {role === 'admin' && req.status === 'pending' && (
                          <>
                            <button onClick={() => handleUpdateStatus(req.id, 'approved')} style={{ padding: '5px 10px', background: 'var(--green)', border: 'none', color: '#fff', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.72rem', cursor: 'pointer' }}>✅ อนุมัติ</button>
                            <button onClick={() => handleUpdateStatus(req.id, 'rejected')} style={{ padding: '5px 10px', background: 'var(--red)', border: 'none', color: '#fff', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.72rem', cursor: 'pointer' }}>❌ ปฏิเสธ</button>
                          </>
                        )}
                        <button onClick={() => setActivePrintRequest(req)} style={{ padding: '5px 12px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)', color: 'var(--cyan)', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }} title="ดูตัวอย่างใบลาก่อนสั่งพิมพ์">👁️ พรีวิวใบลา</button>
                        {role === 'requester' && req.status === 'pending' && (
                          <button onClick={() => handleCancelRequest(req.id)} style={{ padding: '5px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--red)', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}>🚫 ยกเลิกใบลา</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TABLE VIEW */}
            {filteredRequests.length > 0 && historyViewMode === 'table' && (
              <div className="glass-panel" style={{ overflowX: 'auto', padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)' }}>
                      <th style={{ padding: '12px 10px', fontWeight: 700 }}>วันที่ยื่น</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700 }}>ชื่อ - สกุล</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700 }}>ประเภท</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700 }}>วันที่ขอลา</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700 }}>จำนวน</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700 }}>เหตุผล</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700 }}>สถานะ</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700 }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req, idx) => {
                      const si = getStatusInfo(req.status);
                      const typeColor = getTypeColor(req.leave_type);
                      return (
                        <tr key={req.id || req.created_at + idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', verticalAlign: 'middle' }}>
                          <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{formatDateThai(req.created_at)}</td>
                          <td style={{ padding: '10px', fontWeight: 600 }}>{req.employee_name}</td>
                          <td style={{ padding: '10px' }}><span style={{ color: typeColor, fontWeight: 700 }}>{req.leave_type}</span></td>
                          <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{formatDateThai(req.start_date)} – {formatDateThai(req.end_date)}</td>
                          <td style={{ padding: '10px', fontWeight: 'bold', color: typeColor }}>{req.days} วัน</td>
                          <td style={{ padding: '10px', color: 'var(--text-muted)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.reason || '-'}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ color: si.color, background: si.bg, border: `1px solid ${si.border}`, padding: '3px 8px', borderRadius: '6px', fontSize: '0.70rem', fontWeight: 700 }}>{si.text}</span>
                          </td>
                          <td style={{ padding: '10px' }}>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {role === 'director' && req.status === 'pending' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                                  <input type="text" placeholder="ความเห็น..." value={directorComment} onChange={e => setDirectorComment(e.target.value)} style={{ padding: '4px 7px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.72rem' }} />
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={() => handleUpdateStatus(req.id, 'approved')} style={{ flex: 1, padding: '4px', background: 'var(--green)', border: 'none', color: '#fff', borderRadius: '5px', fontWeight: 'bold', fontSize: '0.70rem', cursor: 'pointer' }}>✅</button>
                                    <button onClick={() => handleUpdateStatus(req.id, 'rejected')} style={{ flex: 1, padding: '4px', background: 'var(--red)', border: 'none', color: '#fff', borderRadius: '5px', fontWeight: 'bold', fontSize: '0.70rem', cursor: 'pointer' }}>❌</button>
                                  </div>
                                </div>
                              )}
                              {role === 'admin' && req.status === 'pending' && (
                                <>
                                  <button onClick={() => handleUpdateStatus(req.id, 'approved')} style={{ padding: '4px 8px', background: 'var(--green)', border: 'none', color: '#fff', borderRadius: '5px', fontSize: '0.70rem', cursor: 'pointer' }}>✅</button>
                                  <button onClick={() => handleUpdateStatus(req.id, 'rejected')} style={{ padding: '4px 8px', background: 'var(--red)', border: 'none', color: '#fff', borderRadius: '5px', fontSize: '0.70rem', cursor: 'pointer' }}>❌</button>
                                </>
                              )}
                              <button onClick={() => setActivePrintRequest(req)} style={{ padding: '5px 8px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)', color: 'var(--cyan)', borderRadius: '6px', fontSize: '0.70rem', cursor: 'pointer' }} title="ดูตัวอย่างใบลาก่อนสั่งพิมพ์">👁️</button>
                              {role === 'requester' && req.status === 'pending' && (
                                <button onClick={() => handleCancelRequest(req.id)} style={{ padding: '5px 8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--red)', borderRadius: '6px', fontSize: '0.70rem', cursor: 'pointer' }}>🚫</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}




      {/* Dashboard Overview Tab */}
      {!loading && activeTab === 'dashboard' && (

        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Quick Info Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>👥 วันนี้มีคนลา (คน)</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cyan)' }}>{stats.todayLeavers.length} คน</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {stats.todayLeavers.length > 0 ? stats.todayLeavers.join(', ') : 'ไม่มีบุคลากรลาวันนี้'}
              </span>
            </div>
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>⏳ รายการใบลาที่รออนุมัติ</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--yellow)' }}>{stats.pending} รายการ</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>รอ ผอ. ตรวจสอบใบสมัคร</span>
            </div>
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>📊 จำนวนวันลาพักผ่อนที่อนุมัติแล้ว</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>{stats.breakdown['ลาพักผ่อน']} วัน</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>จากโควตาประจำปี</span>
            </div>
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>🌡️ ลาป่วยทั้งหมด</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--red)' }}>{stats.breakdown['ลาป่วย']} วัน</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>นับสัญญารอบปีปัจจุบัน</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', flexWrap: 'wrap' }}>
            {/* Charts Breakdown */}
            <div className="glass-panel">
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '16px' }}>📊 สรุปยอดการลาในระบบแบ่งตามประเภทการลา (วันรวม)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(stats.breakdown).map(([type, days]) => {
                  const maxDays = 150; // Reference maximum for scale bar
                  const percent = Math.min(100, (days / maxDays) * 100);
                  let barColor = 'var(--primary)';
                  if (type === 'ลาป่วย') barColor = 'var(--red)';
                  if (type === 'ลากิจ') barColor = 'var(--yellow)';
                  if (type === 'ลาคลอด') barColor = 'var(--secondary)';
                  if (type === 'ลาพักผ่อน') barColor = 'var(--cyan)';

                  return (
                    <div key={type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                        <span>{type}</span>
                        <span style={{ fontWeight: 'bold' }}>{days} วันทำการ</span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: barColor, borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Frequent Leavers */}
            <div className="glass-panel">
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px' }}>🔥 บุคลากรที่ลาบ่อยสูงสุด</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stats.frequent.map((f, i) => (
                  <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    <span>{i + 1}. {f.name}</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--yellow)' }}>{f.days} วัน</span>
                  </div>
                ))}
                {stats.frequent.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '16px 0' }}>ไม่มีสถิติการลา</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Balances Tab */}
      {!loading && activeTab === 'balances' && (
        <div className="glass-panel animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>🔒 จัดการและสิทธิ์วันลาคงเหลือของบุคลากร</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => { setShowBatchForm(!showBatchForm); setShowAddForm(false); }}
                style={{
                  padding: '8px 16px',
                  background: showBatchForm ? 'rgba(239, 68, 68, 0.08)' : 'rgba(159, 122, 234, 0.08)',
                  border: showBatchForm ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(159, 122, 234, 0.25)',
                  color: showBatchForm ? 'var(--red)' : 'var(--primary)',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {showBatchForm ? '✖️ ปิดฟอร์มกลุ่ม' : '⚙️ ตั้งค่าโควตาทุกคน'}
              </button>
              <button 
                onClick={() => { setShowAddForm(!showAddForm); setShowBatchForm(false); }}
                style={{
                  padding: '8px 16px',
                  background: showAddForm ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                  border: showAddForm ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                  color: showAddForm ? 'var(--red)' : 'var(--green)',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {showAddForm ? '✖️ ปิดฟอร์ม' : '➕ เพิ่มบุคลากรใหม่'}
              </button>
            </div>
          </div>

          {/* Batch Quota Settings Form Card */}
          {showBatchForm && (
            <form onSubmit={handleBatchUpdateBalances} className="animate-fade-in" style={{
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
              alignItems: 'end'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ลาป่วยโควตา (วัน)</label>
                <input 
                  type="number" 
                  value={batchForm.sick}
                  onChange={(e) => setBatchForm({...batchForm, sick: e.target.value})}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ลากิจโควตา (วัน)</label>
                <input 
                  type="number" 
                  value={batchForm.personal}
                  onChange={(e) => setBatchForm({...batchForm, personal: e.target.value})}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ลาคลอดโควตา (วัน)</label>
                <input 
                  type="number" 
                  value={batchForm.maternity}
                  onChange={(e) => setBatchForm({...batchForm, maternity: e.target.value})}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ลาพักผ่อนโควตา (วัน)</label>
                <input 
                  type="number" 
                  value={batchForm.vacation}
                  onChange={(e) => setBatchForm({...batchForm, vacation: e.target.value})}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ลาอุปสมบทโควตา (วัน)</label>
                <input 
                  type="number" 
                  value={batchForm.ordination}
                  onChange={(e) => setBatchForm({...batchForm, ordination: e.target.value})}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                />
              </div>
              <button type="submit" className="glow-button" style={{ height: '36px', padding: '0 16px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                ⚙️ ตั้งค่าให้ทุกคน
              </button>
            </form>
          )}

          {/* Add Employee Form Card */}
          {showAddForm && (
            <form onSubmit={handleAddEmployee} className="animate-fade-in" style={{
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
              alignItems: 'end'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ชื่อ - นามสกุล</label>
                <input 
                  type="text" 
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  placeholder="เช่น นายรักเรียน ดีเลิศ"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ตำแหน่ง</label>
                <input 
                  type="text" 
                  value={newEmpPos}
                  onChange={(e) => setNewEmpPos(e.target.value)}
                  placeholder="เช่น ครูอัตราจ้าง"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>สถานที่ปฏิบัติงาน</label>
                <input 
                  type="text" 
                  value={newEmpLoc}
                  onChange={(e) => setNewEmpLoc(e.target.value)}
                  placeholder="เช่น ศูนย์การศึกษาพิเศษฯ"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>วันลาพักผ่อนโควตา (วัน)</label>
                <input 
                  type="number" 
                  value={newEmpVacation}
                  onChange={(e) => setNewEmpVacation(parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                />
              </div>
              <button type="submit" className="glow-button" style={{ height: '36px', padding: '0 16px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                ➕ บันทึกพนักงาน
              </button>
            </form>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '10px' }}>ชื่อ - สกุล</th>
                  <th style={{ padding: '10px' }}>ตำแหน่ง</th>
                  <th style={{ padding: '10px' }}>ลาป่วยคงเหลือ</th>
                  <th style={{ padding: '10px' }}>ลากิจคงเหลือ</th>
                  <th style={{ padding: '10px' }}>ลาคลอดคงเหลือ</th>
                  <th style={{ padding: '10px' }}>ลาพักผ่อนคงเหลือ</th>
                  <th style={{ padding: '10px' }}>ลาอุปสมบทคงเหลือ</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {employeesData.map(emp => {
                  const bal = balances[emp.id] || { sick: 30, personal: 45, maternity: 90, vacation: 30, ordination: 120 };
                  const isEditingThis = editingEmpId === emp.id;

                  if (isEditingThis) {
                    return (
                      <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', background: 'rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '10px', fontWeight: 600 }}>{emp.name}</td>
                        <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{emp.position}</td>
                        <td style={{ padding: '10px' }}>
                          <input 
                            type="number" 
                            value={editForm.sick} 
                            onChange={e => setEditForm({ ...editForm, sick: e.target.value })} 
                            style={{ width: '65px', padding: '6px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                          />
                        </td>
                        <td style={{ padding: '10px' }}>
                          <input 
                            type="number" 
                            value={editForm.personal} 
                            onChange={e => setEditForm({ ...editForm, personal: e.target.value })} 
                            style={{ width: '65px', padding: '6px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                          />
                        </td>
                        <td style={{ padding: '10px' }}>
                          <input 
                            type="number" 
                            value={editForm.maternity} 
                            onChange={e => setEditForm({ ...editForm, maternity: e.target.value })} 
                            style={{ width: '65px', padding: '6px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                          />
                        </td>
                        <td style={{ padding: '10px' }}>
                          <input 
                            type="number" 
                            value={editForm.vacation} 
                            onChange={e => setEditForm({ ...editForm, vacation: e.target.value })} 
                            style={{ width: '65px', padding: '6px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                          />
                        </td>
                        <td style={{ padding: '10px' }}>
                          <input 
                            type="number" 
                            value={editForm.ordination} 
                            onChange={e => setEditForm({ ...editForm, ordination: e.target.value })} 
                            style={{ width: '65px', padding: '6px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                          />
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button 
                              onClick={() => handleUpdateBalance(emp.id)}
                              style={{
                                padding: '6px 10px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                color: 'var(--green)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                              }}
                            >
                              💾 บันทึก
                            </button>
                            <button 
                              onClick={() => setEditingEmpId(null)}
                              style={{
                                padding: '6px 10px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-main)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                              }}
                            >
                              ❌ ยกเลิก
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '10px', fontWeight: 600 }}>{emp.name}</td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{emp.position}</td>
                      <td style={{ padding: '10px', color: 'var(--red)', fontWeight: 'bold' }}>{bal.sick} วัน</td>
                      <td style={{ padding: '10px', color: 'var(--yellow)', fontWeight: 'bold' }}>{bal.personal} วัน</td>
                      <td style={{ padding: '10px', color: 'var(--secondary)', fontWeight: 'bold' }}>{bal.maternity} วัน</td>
                      <td style={{ padding: '10px', color: 'var(--cyan)', fontWeight: 'bold' }}>{bal.vacation} วัน</td>
                      <td style={{ padding: '10px', color: 'var(--primary)', fontWeight: 'bold' }}>{bal.ordination} วัน</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button 
                            onClick={() => {
                              setEditingEmpId(emp.id);
                              setEditForm({
                                sick: bal.sick,
                                personal: bal.personal,
                                maternity: bal.maternity,
                                vacation: bal.vacation,
                                ordination: bal.ordination
                              });
                            }}
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(159, 122, 234, 0.08)',
                              border: '1px solid rgba(159, 122, 234, 0.2)',
                              color: 'var(--primary)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.72rem',
                              fontWeight: 'bold'
                            }}
                          >
                            ✏️ แก้ไข
                          </button>
                          <button 
                            onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: 'var(--red)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.72rem',
                              fontWeight: 'bold'
                            }}
                          >
                            🗑️ ลบ
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
      )}

      {/* Holidays Tab */}
      {!loading && activeTab === 'holidays' && (
        <div className="glass-panel animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <HolidayCalendar role={currentUser?.role || role} holidays={holidays} setHolidays={setHolidays} />
        </div>
      )}

      {/* Settings Tab */}
      {!loading && activeTab === 'settings' && (
        <div className="glass-panel animate-fade-in" style={{ maxWidth: '650px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>⚙️ การตั้งค่าระบบหลังบ้านและแจ้งเตือน</h3>

          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>🤖 การแจ้งเตือนผ่าน Telegram (Telegram Notification)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.15)', padding: '14px', borderRadius: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Telegram Bot Token</label>
                  <input 
                    type="password" 
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder="ป้อน Bot Token (เช่น 123456789:ABCdefGhIJK...)"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Telegram Chat ID / Group ID</label>
                  <input 
                    type="text" 
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="ป้อน Chat ID (เช่น -100xxxxxxxxxx สำหรับกลุ่ม หรือ 55xxxxxx สำหรับแชทบุคคล)"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--cyan)', marginBottom: '8px' }}>⚡ ตั้งค่าการซิงค์ข้อมูล Supabase</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.15)', padding: '14px', borderRadius: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Supabase URL</label>
                  <input 
                    type="text" 
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://xxx.supabase.co"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Supabase Public API Key</label>
                  <input 
                    type="password" 
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="API Key / Service Role"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="glow-button" style={{ justifyContent: 'center' }}>
              💾 บันทึกการตั้งค่าทั้งหมด
            </button>
          </form>
        </div>
      )}

      {/* Printing Modal */}
      {activePrintRequest && (
        <PrintableLeavePdf 
          request={activePrintRequest} 
          onClose={() => setActivePrintRequest(null)} 
        />
      )}

    </div>
  );
};

export default LeaveOnlineSystem;
