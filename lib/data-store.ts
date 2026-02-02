import type {
  User,
  AttendanceRecord,
  OvertimeRecord,
  WorkSchedule,
  Holiday,
} from "./types";
import { DEFAULT_WORK_SCHEDULES, DEFAULT_HOLIDAYS } from "./types";

const STORAGE_KEYS = {
  USERS: "presensi_users",
  ATTENDANCE: "presensi_attendance",
  OVERTIME: "presensi_overtime",
  CURRENT_USER: "presensi_current_user",
  WORK_SCHEDULES: "presensi_work_schedules",
  HOLIDAYS: "presensi_holidays",
};

// Default admin user
const DEFAULT_ADMIN: User = {
  id: "admin-001",
  username: "admin",
  password: "admin123",
  name: "Administrator HR",
  role: "admin",
  department: "Human Resources",
  position: "HR Manager",
  email: "admin@lestaribumi.co.id",
  phone: "081234567890",
  createdAt: new Date().toISOString(),
};

// Default employees
const DEFAULT_EMPLOYEES: User[] = [
  {
    id: "emp-001",
    username: "budi",
    password: "budi123",
    name: "Budi Santoso",
    role: "employee",
    department: "Operations",
    position: "Field Supervisor",
    email: "budi@lestaribumi.co.id",
    phone: "081234567891",
    createdAt: new Date().toISOString(),
  },
  {
    id: "emp-002",
    username: "siti",
    password: "siti123",
    name: "Siti Rahayu",
    role: "employee",
    department: "Operations",
    position: "Field Staff",
    email: "siti@lestaribumi.co.id",
    phone: "081234567892",
    createdAt: new Date().toISOString(),
  },
  {
    id: "emp-003",
    username: "agus",
    password: "agus123",
    name: "Agus Wijaya",
    role: "employee",
    department: "Engineering",
    position: "Technician",
    email: "agus@lestaribumi.co.id",
    phone: "081234567893",
    createdAt: new Date().toISOString(),
  },
];

function getStorageData<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorageData<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}

export function initializeData(): void {
  if (typeof window === "undefined") return;

  const existingUsers = localStorage.getItem(STORAGE_KEYS.USERS);
  if (!existingUsers) {
    const allUsers = [DEFAULT_ADMIN, ...DEFAULT_EMPLOYEES];
    setStorageData(STORAGE_KEYS.USERS, allUsers);
  }

  if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) {
    setStorageData(STORAGE_KEYS.ATTENDANCE, []);
  }

  if (!localStorage.getItem(STORAGE_KEYS.OVERTIME)) {
    setStorageData(STORAGE_KEYS.OVERTIME, []);
  }
}

// User functions
export function getUsers(): User[] {
  initializeData();
  return getStorageData<User[]>(STORAGE_KEYS.USERS, []);
}

export function getUserById(id: string): User | undefined {
  return getUsers().find((u) => u.id === id);
}

export function getUserByUsername(username: string): User | undefined {
  return getUsers().find((u) => u.username === username);
}

export function createUser(
  user: Omit<User, "id" | "createdAt">
): User | { error: string } {
  const users = getUsers();
  if (users.some((u) => u.username === user.username)) {
    return { error: "Username sudah digunakan" };
  }

  const newUser: User = {
    ...user,
    id: `emp-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  setStorageData(STORAGE_KEYS.USERS, users);
  return newUser;
}

export function updateUser(
  id: string,
  updates: Partial<User>
): User | { error: string } {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) {
    return { error: "User tidak ditemukan" };
  }

  if (
    updates.username &&
    users.some((u) => u.username === updates.username && u.id !== id)
  ) {
    return { error: "Username sudah digunakan" };
  }

  users[index] = { ...users[index], ...updates };
  setStorageData(STORAGE_KEYS.USERS, users);
  return users[index];
}

export function deleteUser(id: string): boolean {
  const users = getUsers();
  const filtered = users.filter((u) => u.id !== id);
  if (filtered.length === users.length) return false;
  setStorageData(STORAGE_KEYS.USERS, filtered);
  return true;
}

// Auth functions
export function login(
  username: string,
  password: string
): User | { error: string } {
  const user = getUserByUsername(username);
  if (!user) {
    return { error: "Username tidak ditemukan" };
  }
  if (user.password !== password) {
    return { error: "Password salah" };
  }
  setStorageData(STORAGE_KEYS.CURRENT_USER, user);
  return user;
}

export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

export function getCurrentUser(): User | null {
  return getStorageData<User | null>(STORAGE_KEYS.CURRENT_USER, null);
}

// Attendance functions
export function getAttendanceRecords(): AttendanceRecord[] {
  return getStorageData<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
}

export function getAttendanceByUserId(userId: string): AttendanceRecord[] {
  return getAttendanceRecords().filter((a) => a.userId === userId);
}

export function getAttendanceByDate(date: string): AttendanceRecord[] {
  return getAttendanceRecords().filter((a) => a.date === date);
}

export function getTodayAttendance(userId: string): AttendanceRecord | null {
  const today = new Date().toISOString().split("T")[0];
  return (
    getAttendanceRecords().find(
      (a) => a.userId === userId && a.date === today
    ) || null
  );
}

export function checkIn(
  userId: string,
  photo: string,
  location: { latitude: number; longitude: number; address: string }
): AttendanceRecord | { error: string } {
  const records = getAttendanceRecords();
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const timeString = now.toTimeString().slice(0, 5);

  // Check if already checked in
  const existing = records.find((a) => a.userId === userId && a.date === today);
  if (existing?.checkIn) {
    return { error: "Anda sudah melakukan check-in hari ini" };
  }

  // Determine status
  const dayOfWeek = now.getDay();
  const schedules = getWorkSchedules();
  const schedule = schedules[dayOfWeek];
  const isLate = timeString > schedule.startTime;

  const record: AttendanceRecord = existing || {
    id: `att-${Date.now()}`,
    userId,
    date: today,
    checkIn: null,
    checkOut: null,
    status: "present",
    workHours: 0,
    overtime: null,
  };

  record.checkIn = {
    time: timeString,
    photo,
    location,
  };
  record.status = isLate ? "late" : "present";

  if (existing) {
    const index = records.findIndex((a) => a.id === existing.id);
    records[index] = record;
  } else {
    records.push(record);
  }

  setStorageData(STORAGE_KEYS.ATTENDANCE, records);
  return record;
}

export function checkOut(
  userId: string,
  photo: string,
  location: { latitude: number; longitude: number; address: string }
): AttendanceRecord | { error: string } {
  const records = getAttendanceRecords();
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const timeString = now.toTimeString().slice(0, 5);

  const existing = records.find((a) => a.userId === userId && a.date === today);
  if (!existing?.checkIn) {
    return { error: "Anda belum melakukan check-in hari ini" };
  }
  if (existing.checkOut) {
    return { error: "Anda sudah melakukan check-out hari ini" };
  }

  // Calculate work hours
  const checkInTime = existing.checkIn.time.split(":").map(Number);
  const checkOutTime = timeString.split(":").map(Number);
  const checkInMinutes = checkInTime[0] * 60 + checkInTime[1];
  const checkOutMinutes = checkOutTime[0] * 60 + checkOutTime[1];
  const workHours = (checkOutMinutes - checkInMinutes) / 60;

  // Validate minimum work hours before allowing checkout
  const dayOfWeek = now.getDay();
  const schedules = getWorkSchedules();
  const schedule = schedules[dayOfWeek];
  
  if (workHours < schedule.minWorkHours) {
    const remainingHours = schedule.minWorkHours - workHours;
    const remainingMinutes = Math.ceil(remainingHours * 60);
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    const timeRemaining = hours > 0 
      ? `${hours} jam ${minutes} menit` 
      : `${minutes} menit`;
    return { 
      error: `Anda belum memenuhi jam kerja minimal (${schedule.minWorkHours} jam). Sisa waktu: ${timeRemaining}` 
    };
  }

  existing.checkOut = {
    time: timeString,
    photo,
    location,
  };
  existing.workHours = Math.max(0, workHours);

  const index = records.findIndex((a) => a.id === existing.id);
  records[index] = existing;
  setStorageData(STORAGE_KEYS.ATTENDANCE, records);
  return existing;
}

// Overtime functions
export function getOvertimeRecords(): OvertimeRecord[] {
  return getStorageData<OvertimeRecord[]>(STORAGE_KEYS.OVERTIME, []);
}

export function getOvertimeByUserId(userId: string): OvertimeRecord[] {
  return getOvertimeRecords().filter((o) => o.userId === userId);
}

export function startOvertime(
  userId: string,
  reason: string
): OvertimeRecord | { error: string } {
  const today = new Date().toISOString().split("T")[0];
  const attendance = getTodayAttendance(userId);

  if (!attendance?.checkIn) {
    return { error: "Anda harus check-in terlebih dahulu" };
  }
  if (!attendance.checkOut) {
    return { error: "Anda harus check-out terlebih dahulu" };
  }

  const dayOfWeek = new Date().getDay();
  const schedules = getWorkSchedules();
  const schedule = schedules[dayOfWeek];

  if (attendance.workHours < schedule.minWorkHours) {
    return {
      error: `Anda harus memenuhi minimal ${schedule.minWorkHours} jam kerja sebelum lembur`,
    };
  }

  const existingOvertime = getOvertimeRecords().find(
    (o) => o.userId === userId && o.date === today && !o.endTime
  );
  if (existingOvertime) {
    return { error: "Anda sudah memiliki lembur yang sedang berjalan" };
  }

  const overtime: OvertimeRecord = {
    id: `ot-${Date.now()}`,
    userId,
    date: today,
    startTime: new Date().toTimeString().slice(0, 5),
    endTime: null,
    duration: 0,
    reason,
    status: "pending",
    approvedBy: null,
  };

  const records = getOvertimeRecords();
  records.push(overtime);
  setStorageData(STORAGE_KEYS.OVERTIME, records);
  return overtime;
}

export function endOvertime(userId: string): OvertimeRecord | { error: string } {
  const records = getOvertimeRecords();
  const today = new Date().toISOString().split("T")[0];
  const overtime = records.find(
    (o) => o.userId === userId && o.date === today && !o.endTime
  );

  if (!overtime) {
    return { error: "Tidak ada lembur yang sedang berjalan" };
  }

  const endTime = new Date().toTimeString().slice(0, 5);
  const startMinutes =
    Number.parseInt(overtime.startTime.split(":")[0]) * 60 +
    Number.parseInt(overtime.startTime.split(":")[1]);
  const endMinutes =
    Number.parseInt(endTime.split(":")[0]) * 60 +
    Number.parseInt(endTime.split(":")[1]);
  const duration = (endMinutes - startMinutes) / 60;

  overtime.endTime = endTime;
  overtime.duration = Math.max(0, duration);

  const index = records.findIndex((o) => o.id === overtime.id);
  records[index] = overtime;
  setStorageData(STORAGE_KEYS.OVERTIME, records);
  return overtime;
}

export function approveOvertime(
  overtimeId: string,
  adminId: string,
  approved: boolean
): OvertimeRecord | { error: string } {
  const records = getOvertimeRecords();
  const overtime = records.find((o) => o.id === overtimeId);

  if (!overtime) {
    return { error: "Data lembur tidak ditemukan" };
  }

  overtime.status = approved ? "approved" : "rejected";
  overtime.approvedBy = adminId;

  const index = records.findIndex((o) => o.id === overtimeId);
  records[index] = overtime;
  setStorageData(STORAGE_KEYS.OVERTIME, records);
  return overtime;
}

// Statistics
export function getAttendanceStats(
  userId?: string,
  month?: number,
  year?: number
) {
  const now = new Date();
  const targetMonth = month ?? now.getMonth();
  const targetYear = year ?? now.getFullYear();

  let records = getAttendanceRecords();
  if (userId) {
    records = records.filter((a) => a.userId === userId);
  }

  records = records.filter((a) => {
    const date = new Date(a.date);
    return date.getMonth() === targetMonth && date.getFullYear() === targetYear;
  });

  const present = records.filter((a) => a.status === "present").length;
  const late = records.filter((a) => a.status === "late").length;
  const absent = records.filter((a) => a.status === "absent").length;
  const totalWorkHours = records.reduce((sum, a) => sum + a.workHours, 0);

  return { present, late, absent, totalWorkHours, total: records.length };
}

// Work Schedule functions
export function getWorkSchedules(): WorkSchedule[] {
  return getStorageData<WorkSchedule[]>(STORAGE_KEYS.WORK_SCHEDULES, DEFAULT_WORK_SCHEDULES);
}

export function updateWorkSchedule(dayOfWeek: number, updates: Partial<WorkSchedule>): WorkSchedule[] {
  const schedules = getWorkSchedules();
  const index = schedules.findIndex(s => s.dayOfWeek === dayOfWeek);
  if (index !== -1) {
    schedules[index] = { ...schedules[index], ...updates };
    setStorageData(STORAGE_KEYS.WORK_SCHEDULES, schedules);
  }
  return schedules;
}

export function resetWorkSchedules(): WorkSchedule[] {
  setStorageData(STORAGE_KEYS.WORK_SCHEDULES, DEFAULT_WORK_SCHEDULES);
  return DEFAULT_WORK_SCHEDULES;
}

// Holiday functions
export function getHolidays(): Holiday[] {
  return getStorageData<Holiday[]>(STORAGE_KEYS.HOLIDAYS, DEFAULT_HOLIDAYS);
}

export function addHoliday(holiday: Holiday): Holiday[] | { error: string } {
  const holidays = getHolidays();
  if (holidays.some(h => h.date === holiday.date)) {
    return { error: "Tanggal libur sudah ada" };
  }
  holidays.push(holiday);
  holidays.sort((a, b) => a.date.localeCompare(b.date));
  setStorageData(STORAGE_KEYS.HOLIDAYS, holidays);
  return holidays;
}

export function updateHoliday(date: string, updates: Partial<Holiday>): Holiday[] | { error: string } {
  const holidays = getHolidays();
  const index = holidays.findIndex(h => h.date === date);
  if (index === -1) {
    return { error: "Hari libur tidak ditemukan" };
  }
  holidays[index] = { ...holidays[index], ...updates };
  if (updates.date && updates.date !== date) {
    holidays.sort((a, b) => a.date.localeCompare(b.date));
  }
  setStorageData(STORAGE_KEYS.HOLIDAYS, holidays);
  return holidays;
}

export function deleteHoliday(date: string): Holiday[] {
  const holidays = getHolidays().filter(h => h.date !== date);
  setStorageData(STORAGE_KEYS.HOLIDAYS, holidays);
  return holidays;
}

export function resetHolidays(): Holiday[] {
  setStorageData(STORAGE_KEYS.HOLIDAYS, DEFAULT_HOLIDAYS);
  return DEFAULT_HOLIDAYS;
}

// Consolidated DataStore object for backwards compatibility
export const DataStore = {
  // Data initialization
  initializeData,
  
  // User functions
  getUsers,
  getUserById,
  getUserByUsername,
  createUser,
  updateUser,
  deleteUser,
  
  // Auth functions
  login,
  logout,
  getCurrentUser,
  
  // Attendance functions
  getAttendanceRecords,
  getAttendanceByUserId,
  getAttendanceByDate,
  getTodayAttendance,
  checkIn,
  checkOut,
  
  // Overtime functions
  getOvertimeRecords,
  getOvertimeByUserId,
  startOvertime,
  endOvertime,
  approveOvertime,
  
  // Statistics
  getAttendanceStats,
  
  // Work Schedule functions
  getWorkSchedules,
  updateWorkSchedule,
  resetWorkSchedules,
  
  // Holiday functions
  getHolidays,
  addHoliday,
  updateHoliday,
  deleteHoliday,
  resetHolidays,
  
  // Employee management aliases
  getEmployees: getUsers,
  saveEmployees: (employees: User[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("presensi_users", JSON.stringify(employees));
    } catch (error) {
      console.error("Error saving employees:", error);
    }
  },
};
