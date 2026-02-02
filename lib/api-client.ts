/**
 * API Client untuk komunikasi dengan backend MySQL
 * Menggantikan localStorage dengan API calls
 */

import type {
  User,
  AttendanceRecord,
  OvertimeRecord,
  WorkSchedule,
  Holiday,
} from "./types";

// Base API URL
const API_BASE = "/api";

// Generic fetch wrapper with error handling
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }

  return data;
}

// ==========================================
// User API Functions
// ==========================================

export async function getUsers(): Promise<User[]> {
  const data = await fetchAPI<{ users: User[] }>("/users");
  return data.users;
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const data = await fetchAPI<{ user: User }>(`/users/${id}`);
    return data.user;
  } catch {
    return null;
  }
}

export async function createUser(
  userData: Omit<User, "id" | "createdAt">
): Promise<User | { error: string }> {
  try {
    const data = await fetchAPI<{ user: User }>("/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    return data.user;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create user" };
  }
}

export async function updateUser(
  id: string,
  updates: Partial<User>
): Promise<User | { error: string }> {
  try {
    const data = await fetchAPI<{ user: User }>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    return data.user;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update user" };
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await fetchAPI(`/users/${id}`, { method: "DELETE" });
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// Attendance API Functions
// ==========================================

export async function getAttendanceRecords(filters?: {
  userId?: string;
  date?: string;
  month?: number;
  year?: number;
}): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();
  if (filters?.userId) params.append("userId", filters.userId);
  if (filters?.date) params.append("date", filters.date);
  if (filters?.month !== undefined) params.append("month", String(filters.month + 1)); // Convert to 1-indexed
  if (filters?.year !== undefined) params.append("year", String(filters.year));

  const queryString = params.toString();
  const endpoint = `/attendance${queryString ? `?${queryString}` : ""}`;
  
  const data = await fetchAPI<{ records: AttendanceRecord[] }>(endpoint);
  return data.records;
}

export async function getAttendanceByUserId(userId: string): Promise<AttendanceRecord[]> {
  return getAttendanceRecords({ userId });
}

export async function getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
  return getAttendanceRecords({ date });
}

export async function getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
  const today = new Date().toISOString().split("T")[0];
  const records = await getAttendanceRecords({ userId, date: today });
  return records.length > 0 ? records[0] : null;
}

export async function checkIn(
  userId: string,
  photo: string,
  location: { latitude: number; longitude: number; address: string }
): Promise<AttendanceRecord | { error: string }> {
  try {
    const data = await fetchAPI<{ record: AttendanceRecord; message: string }>("/attendance", {
      method: "POST",
      body: JSON.stringify({ action: "check-in", photo, location }),
    });
    return data.record;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Check-in failed" };
  }
}

export async function checkOut(
  userId: string,
  photo: string,
  location: { latitude: number; longitude: number; address: string }
): Promise<AttendanceRecord | { error: string }> {
  try {
    const data = await fetchAPI<{ record: AttendanceRecord; message: string }>("/attendance", {
      method: "POST",
      body: JSON.stringify({ action: "check-out", photo, location }),
    });
    return data.record;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Check-out failed" };
  }
}

// ==========================================
// Overtime API Functions
// ==========================================

export async function getOvertimeRecords(filters?: {
  userId?: string;
  status?: "pending" | "approved" | "rejected";
}): Promise<OvertimeRecord[]> {
  const params = new URLSearchParams();
  if (filters?.userId) params.append("userId", filters.userId);
  if (filters?.status) params.append("status", filters.status);

  const queryString = params.toString();
  const endpoint = `/overtime${queryString ? `?${queryString}` : ""}`;
  
  const data = await fetchAPI<{ records: OvertimeRecord[] }>(endpoint);
  return data.records;
}

export async function getOvertimeByUserId(userId: string): Promise<OvertimeRecord[]> {
  return getOvertimeRecords({ userId });
}

export async function startOvertime(
  userId: string,
  reason: string
): Promise<OvertimeRecord | { error: string }> {
  try {
    const data = await fetchAPI<{ record: OvertimeRecord }>("/overtime", {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    return data.record;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Start overtime failed" };
  }
}

export async function endOvertime(userId: string): Promise<OvertimeRecord | { error: string }> {
  try {
    const data = await fetchAPI<{ record: OvertimeRecord }>("/overtime", {
      method: "PUT",
      body: JSON.stringify({ action: "end" }),
    });
    return data.record;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "End overtime failed" };
  }
}

export async function approveOvertime(
  overtimeId: string,
  adminId: string,
  approved: boolean
): Promise<OvertimeRecord | { error: string }> {
  try {
    const data = await fetchAPI<{ record: OvertimeRecord }>("/overtime", {
      method: "PUT",
      body: JSON.stringify({
        action: approved ? "approve" : "reject",
        overtimeId,
      }),
    });
    return data.record;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Approve overtime failed" };
  }
}

// ==========================================
// Work Schedule API Functions
// ==========================================

export async function getWorkSchedules(): Promise<WorkSchedule[]> {
  const data = await fetchAPI<{ schedules: WorkSchedule[] }>("/schedules");
  return data.schedules;
}

export async function updateWorkSchedule(
  dayOfWeek: number,
  updates: Partial<WorkSchedule>
): Promise<WorkSchedule[]> {
  const data = await fetchAPI<{ schedules: WorkSchedule[] }>("/schedules", {
    method: "PUT",
    body: JSON.stringify({ dayOfWeek, ...updates }),
  });
  return data.schedules;
}

export async function resetWorkSchedules(): Promise<WorkSchedule[]> {
  // This would need a separate endpoint, for now just return current schedules
  return getWorkSchedules();
}

// ==========================================
// Holiday API Functions
// ==========================================

export async function getHolidays(year?: number): Promise<Holiday[]> {
  const endpoint = year ? `/holidays?year=${year}` : "/holidays";
  const data = await fetchAPI<{ holidays: Holiday[] }>(endpoint);
  return data.holidays;
}

export async function addHoliday(holiday: Holiday): Promise<Holiday[] | { error: string }> {
  try {
    const data = await fetchAPI<{ holidays: Holiday[] }>("/holidays", {
      method: "POST",
      body: JSON.stringify(holiday),
    });
    return data.holidays;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Add holiday failed" };
  }
}

export async function updateHoliday(
  date: string,
  updates: Partial<Holiday>
): Promise<Holiday[] | { error: string }> {
  try {
    const data = await fetchAPI<{ holidays: Holiday[] }>("/holidays", {
      method: "PUT",
      body: JSON.stringify({ oldDate: date, ...updates }),
    });
    return data.holidays;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Update holiday failed" };
  }
}

export async function deleteHoliday(date: string): Promise<Holiday[]> {
  const data = await fetchAPI<{ holidays: Holiday[] }>(`/holidays?date=${date}`, {
    method: "DELETE",
  });
  return data.holidays;
}

export async function resetHolidays(): Promise<Holiday[]> {
  // This would need a separate endpoint, for now just return current holidays
  return getHolidays();
}

// ==========================================
// Statistics API Functions
// ==========================================

export async function getAttendanceStats(
  userId?: string,
  month?: number,
  year?: number
): Promise<{
  present: number;
  late: number;
  absent: number;
  totalWorkHours: number;
  total: number;
}> {
  const params = new URLSearchParams();
  if (userId) params.append("userId", userId);
  if (month !== undefined) params.append("month", String(month + 1)); // Convert to 1-indexed
  if (year !== undefined) params.append("year", String(year));

  const queryString = params.toString();
  const endpoint = `/stats${queryString ? `?${queryString}` : ""}`;
  
  const data = await fetchAPI<{ stats: ReturnType<typeof getAttendanceStats> extends Promise<infer T> ? T : never }>(endpoint);
  return data.stats;
}

// ==========================================
// Health Check
// ==========================================

export async function checkHealth(): Promise<{
  status: string;
  timestamp: string;
  services: { database: string; api: string };
}> {
  const data = await fetchAPI<{
    status: string;
    timestamp: string;
    services: { database: string; api: string };
  }>("/health");
  return data;
}

// ==========================================
// Export API Client
// ==========================================

export const ApiClient = {
  // Users
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,

  // Attendance
  getAttendanceRecords,
  getAttendanceByUserId,
  getAttendanceByDate,
  getTodayAttendance,
  checkIn,
  checkOut,

  // Overtime
  getOvertimeRecords,
  getOvertimeByUserId,
  startOvertime,
  endOvertime,
  approveOvertime,

  // Schedules
  getWorkSchedules,
  updateWorkSchedule,
  resetWorkSchedules,

  // Holidays
  getHolidays,
  addHoliday,
  updateHoliday,
  deleteHoliday,
  resetHolidays,

  // Stats
  getAttendanceStats,

  // Health
  checkHealth,
};

export default ApiClient;
