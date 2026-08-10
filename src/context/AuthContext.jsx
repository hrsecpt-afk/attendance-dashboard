import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabaseConfig } from '../config/supabaseConfig.js';

// ── Default accounts (stored in localStorage on first run) ───────────────────
// IMPORTANT: These are empty by default for security. Add users via UserManagement.
const DEFAULT_USERS = [];

const USERS_STORAGE_KEY = 'attendance_users_db';
const SESSION_STORAGE_KEY = 'attendance_current_session';

const normalizeUser = (user) => {
  const idNumber = Number(user?.id);
  return {
    id: Number.isFinite(idNumber) ? idNumber : user?.id,
    username: String(user?.username ?? '').trim(),
    password: String(user?.password ?? '').trim(),
    role: String(user?.role || 'user').trim(),
    displayName: String(user?.displayName ?? user?.display_name ?? user?.username ?? '').trim(),
    employeeId: user?.employeeId ?? (user?.employee_id != null ? String(user.employee_id) : null),
  };
};

const mapUsers = (users) => (users || []).map(normalizeUser).filter(u => u.username);

const uniqueUsers = (...lists) => {
  const seen = new Set();
  const result = [];
  lists.flat().forEach(user => {
    const normalized = normalizeUser(user);
    const key = normalized.id != null ? `id:${normalized.id}` : `username:${normalized.username.toLowerCase()}`;
    if (!normalized.username || seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });
  return result;
};

const cleanLoginName = (name) => String(name ?? '')
  .replace(/^(นาย|นางสาว|นาง|ดร\.|ครูผู้ช่วย|ครู|ผอ\.|ผู้อำนวยการ)\s*/u, '')
  .replace(/^คุณ\s*/u, '')
  .replace(/^(à¸™à¸²à¸¢|à¸™à¸²à¸‡à¸ªà¸²à¸§|à¸™à¸²à¸‡|à¸”à¸£\.|à¸„à¸£à¸¹à¸œà¸¹à¹‰à¸Šà¹ˆà¸§à¸¢|à¸„à¸£à¸¹|à¸œà¸­\.|à¸œà¸¹à¹‰à¸­à¸³à¸™à¸§à¸¢à¸à¸²à¸£)\s*/, '')
  .replace(/\s+/g, '')
  .trim()
  .toLowerCase();

// ── Helpers ──────────────────────────────────────────────────────────────────
export const loadUsers = () => {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) return mapUsers(JSON.parse(raw));
  } catch {}
  // First time: seed defaults
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
  } catch {}
  return mapUsers(DEFAULT_USERS);
};

export const saveUsers = (users) => {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn("saveUsers: localStorage.setItem failed", e);
  }
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
            const mapped = mapUsers(data);
            saveUsers(mapped);
            setUsers(mapped);

            // Sync current user session
            const sessionRaw = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (sessionRaw) {
              const session = JSON.parse(sessionRaw);
              const found = mapped.find(u => u.id === session.id);
              if (found) {
                setCurrentUser(found);
                try {
                  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(found));
                } catch (e) {}
              } else {
                setCurrentUser(null);
                try {
                  sessionStorage.removeItem(SESSION_STORAGE_KEY);
                } catch (e) {}
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
            const remoteUsers = mapUsers(data);
            freshUsers = uniqueUsers(remoteUsers, freshUsers, DEFAULT_USERS);
            saveUsers(freshUsers);
            setUsers(remoteUsers);
          }
        }
      } catch (err) {
        console.error("Login sync failed, using cached credentials", err);
      }
    }
    
    const clean = (name) => name.replace(/^(นาย|นางสาว|นาง|ดร\.|ครูผู้ช่วย|ครู|ผอ\.|ผู้อำนวยการ)\s*/, '').replace(/\s+/g, '').trim().toLowerCase();
    const targetClean = clean(username);
    freshUsers = uniqueUsers(freshUsers, DEFAULT_USERS);
    const usernameInput = String(username ?? '').trim();
    const passwordInput = String(password ?? '').trim();
    const normalizedTargetClean = cleanLoginName(usernameInput);

    const found = freshUsers.find(u => {
      const user = normalizeUser(u);
      const matchUsername = user.username.toLowerCase() === usernameInput.toLowerCase()
        || cleanLoginName(user.username) === normalizedTargetClean;
      const matchDisplayName = cleanLoginName(user.displayName) === normalizedTargetClean || clean(user.displayName) === targetClean;
      return (matchUsername || matchDisplayName) && user.password === passwordInput;
    });

    if (!found) {
      setAuthError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      return false;
    }
    const { password: _pw, ...safeUser } = found;
    setCurrentUser(safeUser);
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(safeUser));
    } catch (e) {}
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
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(safeUser));
      } catch (e) {}
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
