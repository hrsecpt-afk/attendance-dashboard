import React, { createContext, useContext, useState, useEffect } from 'react';

// ── Default accounts (stored in localStorage on first run) ───────────────────
const DEFAULT_USERS = [
  {
    id: 1,
    username: 'admin',
    password: 'admin1234',
    role: 'admin',
    displayName: 'ผู้ดูแลระบบ',
    employeeId: null,
  },
  {
    id: 2,
    username: 'director',
    password: 'director1234',
    role: 'director',
    displayName: 'ผู้อำนวยการ',
    employeeId: null,
  },
  {
    id: 3,
    username: 'user1',
    password: '1234',
    role: 'user',
    displayName: 'ผู้ใช้งาน 1',
    employeeId: null,
  },
];

const USERS_STORAGE_KEY = 'attendance_users_db';
const SESSION_STORAGE_KEY = 'attendance_current_session';

// ── Helpers ──────────────────────────────────────────────────────────────────
export const loadUsers = () => {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // First time: seed defaults
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
};

export const saveUsers = (users) => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const getSupabaseConfig = () => {
  try {
    const saved = localStorage.getItem('attendance_dashboard_supabase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.key) {
        return {
          url: parsed.url.trim(),
          key: parsed.key.trim()
        };
      }
    }
  } catch {}
  return {
    url: 'https://vayvssbxuskhyujtbtyw.supabase.co',
    key: 'sb_publishable_yjyN0-SOXFwTPoOolSmKBw_QDyFe2rZ'
  };
};

export const syncToSupabase = async (oldUsers, newUsers) => {
  const cfg = getSupabaseConfig();
  if (!cfg.url || !cfg.key) return;

  const oldMap = new Map((oldUsers || []).map(u => [u.id, u]));
  const newMap = new Map((newUsers || []).map(u => [u.id, u]));

  // 1. Find deleted users
  const deleted = (oldUsers || []).filter(u => !newMap.has(u.id));
  for (const u of deleted) {
    try {
      await fetch(`${cfg.url}/rest/v1/users?id=eq.${u.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': cfg.key,
          'Authorization': `Bearer ${cfg.key}`
        }
      });
    } catch (err) {
      console.error("Failed to delete user", u.id, err);
    }
  }

  // 2. Find new and modified users
  const toAdd = [];
  const toUpdate = [];

  (newUsers || []).forEach(u => {
    const old = oldMap.get(u.id);
    const dbFormat = {
      id: u.id,
      username: u.username,
      password: u.password,
      role: u.role,
      display_name: u.displayName,
      employee_id: u.employeeId
    };
    
    if (!old) {
      toAdd.push(dbFormat);
    } else if (
      old.username !== u.username ||
      old.password !== u.password ||
      old.role !== u.role ||
      old.displayName !== u.displayName ||
      old.employeeId !== u.employeeId
    ) {
      toUpdate.push({ id: u.id, data: dbFormat });
    }
  });

  // Batch insert new users
  if (toAdd.length > 0) {
    try {
      await fetch(`${cfg.url}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.key,
          'Authorization': `Bearer ${cfg.key}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(toAdd)
      });
    } catch (err) {
      console.error("Failed to insert users", err);
    }
  }

  // Update modified users individually
  for (const item of toUpdate) {
    try {
      await fetch(`${cfg.url}/rest/v1/users?id=eq.${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.key,
          'Authorization': `Bearer ${cfg.key}`
        },
        body: JSON.stringify(item.data)
      });
    } catch (err) {
      console.error("Failed to update user", item.id, err);
    }
  }
};

// ── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(loadUsers);
  const [authError, setAuthError] = useState('');

  // Restore session on reload from cache instantly
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        const freshUsers = loadUsers();
        const found = freshUsers.find(u => u.id === session.id && u.username === session.username);
        if (found) setCurrentUser({ ...found });
      }
    } catch {}
  }, []);

  // Fetch users from Supabase on mount to sync cache & session
  useEffect(() => {
    const fetchUsers = async () => {
      const cfg = getSupabaseConfig();
      if (!cfg.url || !cfg.key) return;

      try {
        const res = await fetch(`${cfg.url}/rest/v1/users?select=*`, {
          method: 'GET',
          headers: {
            'apikey': cfg.key,
            'Authorization': `Bearer ${cfg.key}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const mapped = data.map(u => ({
              id: Number(u.id),
              username: u.username,
              password: u.password,
              role: u.role,
              displayName: u.display_name,
              employeeId: u.employee_id ? String(u.employee_id) : null
            }));
            saveUsers(mapped);
            setUsers(mapped);

            // Sync current user session
            const sessionRaw = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (sessionRaw) {
              const session = JSON.parse(sessionRaw);
              const found = mapped.find(u => u.id === session.id);
              if (found) {
                setCurrentUser(found);
                sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(found));
              } else {
                setCurrentUser(null);
                sessionStorage.removeItem(SESSION_STORAGE_KEY);
              }
            }
          } else {
            // Seed defaults to Supabase users table if completely empty
            const defaultsMapped = DEFAULT_USERS.map(u => ({
              id: u.id,
              username: u.username,
              password: u.password,
              role: u.role,
              display_name: u.displayName,
              employee_id: u.employeeId
            }));
            await fetch(`${cfg.url}/rest/v1/users`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': cfg.key,
                'Authorization': `Bearer ${cfg.key}`
              },
              body: JSON.stringify(defaultsMapped)
            });
            saveUsers(DEFAULT_USERS);
            setUsers(DEFAULT_USERS);
          }
        }
      } catch (err) {
        console.error("Failed to fetch users from Supabase", err);
      }
    };
    fetchUsers();
  }, []);

  const login = async (username, password) => {
    setAuthError('');
    let freshUsers = loadUsers();
    
    // Fetch fresh users from Supabase before checking credentials
    const cfg = getSupabaseConfig();
    if (cfg.url && cfg.key) {
      try {
        const res = await fetch(`${cfg.url}/rest/v1/users?select=*`, {
          method: 'GET',
          headers: {
            'apikey': cfg.key,
            'Authorization': `Bearer ${cfg.key}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            freshUsers = data.map(u => ({
              id: Number(u.id),
              username: u.username,
              password: u.password,
              role: u.role,
              displayName: u.display_name,
              employeeId: u.employee_id ? String(u.employee_id) : null
            }));
            saveUsers(freshUsers);
            setUsers(freshUsers);
          }
        }
      } catch (err) {
        console.error("Login sync failed, using cached credentials", err);
      }
    }
    
    const clean = (name) => name.replace(/^(นาย|นางสาว|นาง|ดร\.|ครูผู้ช่วย|ครู|ผอ\.|ผู้อำนวยการ)\s*/, '').replace(/\s+/g, '').trim().toLowerCase();
    const targetClean = clean(username);

    const found = freshUsers.find(u => {
      const matchUsername = u.username.trim().toLowerCase() === username.trim().toLowerCase();
      const matchDisplayName = clean(u.displayName) === targetClean;
      return (matchUsername || matchDisplayName) && u.password === password;
    });

    if (!found) {
      setAuthError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      return false;
    }
    const { password: _pw, ...safeUser } = found;
    setCurrentUser(safeUser);
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(safeUser));
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  };

  // Admin: update users list
  const updateUsers = async (newUsers) => {
    const oldUsers = [...users];
    saveUsers(newUsers);
    setUsers(newUsers);
    await syncToSupabase(oldUsers, newUsers);
  };

  // User/Admin: update own profile credentials
  const updateProfile = async (userId, newUsername, newPassword, newDisplayName) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { 
          ...u, 
          username: newUsername.trim(), 
          password: newPassword.trim(), 
          displayName: newDisplayName.trim() 
        };
      }
      return u;
    });
    
    const oldUsers = [...users];
    saveUsers(updatedUsers);
    setUsers(updatedUsers);

    if (currentUser && currentUser.id === userId) {
      const updatedUser = updatedUsers.find(u => u.id === userId);
      const { password: _pw, ...safeUser } = updatedUser;
      setCurrentUser(safeUser);
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(safeUser));
    }
    await syncToSupabase(oldUsers, updatedUsers);
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, authError, login, logout, updateUsers, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// ── Role helpers ─────────────────────────────────────────────────────────────
export const ROLES = {
  USER: 'user',
  DIRECTOR: 'director',
  ADMIN: 'admin',
};

export const ROLE_LABELS = {
  user: 'ผู้ใช้งาน',
  director: 'ผู้อำนวยการ',
  admin: 'แอดมิน / งานบุคคล',
};

export const ROLE_COLORS = {
  user: 'var(--primary)',
  director: 'var(--secondary)',
  admin: 'var(--green)',
};
