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

// ── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(loadUsers);
  const [authError, setAuthError] = useState('');

  // Restore session on reload
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        // Verify user still exists
        const freshUsers = loadUsers();
        const found = freshUsers.find(u => u.id === session.id && u.username === session.username);
        if (found) setCurrentUser({ ...found });
      }
    } catch {}
  }, []);

  const login = (username, password) => {
    setAuthError('');
    const freshUsers = loadUsers();
    const found = freshUsers.find(
      u => u.username.trim().toLowerCase() === username.trim().toLowerCase() && u.password === password
    );
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
  const updateUsers = (newUsers) => {
    saveUsers(newUsers);
    setUsers(newUsers);
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, authError, login, logout, updateUsers }}>
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
