-- ==========================================
-- SUPABASE COMPLETE DATABASE SCHEMA
-- ระบบบริหารงานบุคคล ศูนย์การศึกษาพิเศษประจำจังหวัด
-- ==========================================

-- 1. ตารางข้อมูลบุคลากร (employees)
CREATE TABLE IF NOT EXISTS public.employees (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    position TEXT,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ตารางสิทธิ์วันลาคงเหลือ (leave_balances)
CREATE TABLE IF NOT EXISTS public.leave_balances (
    employee_id UUID PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
    sick_remaining NUMERIC DEFAULT 30,
    personal_remaining NUMERIC DEFAULT 45,
    maternity_remaining NUMERIC DEFAULT 90,
    vacation_remaining NUMERIC DEFAULT 30,
    ordination_remaining NUMERIC DEFAULT 120,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ตารางประวัติคำขอลาออนไลน์ (leave_requests)
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name TEXT,
    position TEXT,
    location TEXT,
    leave_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days NUMERIC NOT NULL,
    reason TEXT,
    phone TEXT,
    address TEXT,
    attachment_url TEXT,
    status TEXT DEFAULT 'pending'::text NOT NULL,
    director_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- คอลัมน์สำหรับสถิติการลาครั้งล่าสุด (สำหรับแสดงผลในใบลา)
    last_leave_type TEXT,
    last_leave_start_date DATE,
    last_leave_end_date DATE,
    last_leave_days NUMERIC,
    
    -- คอลัมน์ข้อมูลโควตาการลาพักผ่อนแบบละเอียด
    vacation_accumulated NUMERIC DEFAULT 0,
    vacation_quota_current_year NUMERIC DEFAULT 10,
    vacation_quota_total NUMERIC DEFAULT 10,
    vacation_taken NUMERIC DEFAULT 0,
    vacation_remaining NUMERIC DEFAULT 10
);

-- 4. ตารางประวัติคำขอปฏิบัติงานนอกสถานที่ราชการ (duty_requests)
CREATE TABLE IF NOT EXISTS public.duty_requests (
    id TEXT PRIMARY KEY, -- ใช้ Text รองรับ ID แบบสุ่มจากฝั่ง Client เช่น local_1782594403886
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name TEXT,
    position TEXT,
    department TEXT,
    location TEXT,
    phone TEXT,
    email TEXT,
    duty_type TEXT NOT NULL,
    duty_date DATE NOT NULL,
    time_out TEXT NOT NULL,
    time_in TEXT NOT NULL,
    hours NUMERIC NOT NULL,
    destination TEXT NOT NULL,
    province TEXT NOT NULL,
    objective TEXT NOT NULL,
    companions TEXT,
    status TEXT DEFAULT 'pending'::text NOT NULL,
    director_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ตารางบันทึกเวลาสแกนเข้างานรายบุคคล (attendance_logs)
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id SERIAL PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name TEXT,
    work_date DATE NOT NULL,
    check_time TIME NOT NULL,
    check_type TEXT DEFAULT 'check_in'::text NOT NULL,
    status TEXT DEFAULT 'present'::text NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- การเปิดใช้งาน Row Level Security (RLS) และนโยบายการใช้งาน
-- ==========================================

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duty_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- สร้างนโยบายอนุญาตให้ อ่าน/เขียน/แก้ไข ได้อย่างอิสระ (Public REST API Access)
CREATE POLICY "Allow public read/write access" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access" ON public.leave_balances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access" ON public.leave_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access" ON public.duty_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access" ON public.attendance_logs FOR ALL USING (true) WITH CHECK (true);

-- 6. ตารางบัญชีผู้ใช้งานระบบ (users)
 
 
 CREATE TABLE IF NOT EXISTS public.users (
    id BIGINT PRIMARY KEY, -- ใช้ BIGINT รองรับ ID สุ่มแบบ timestamp (Date.now())
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    display_name TEXT,
    employee_id UUID, -- กำหนดเป็น UUID เพื่อให้แมตช์กับ id ของ employees ใน database
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write access" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- 7. ตารางสถานะรวมของแอป (app_state) — เก็บ JSON blob แบบ key-value
--    ใช้ซิงค์ข้อมูลข้ามอุปกรณ์: employeesData, daily_overrides, การตั้งค่า, โลโก้
--    keys ที่ใช้: 'employees_data', 'daily_overrides', 'app_settings', 'app_logo'
CREATE TABLE IF NOT EXISTS public.app_state (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write access" ON public.app_state FOR ALL USING (true) WITH CHECK (true);
