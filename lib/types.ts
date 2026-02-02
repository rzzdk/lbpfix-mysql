export type UserRole = "employee" | "admin";

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  department: string;
  position: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  checkIn: {
    time: string;
    photo: string;
    location: {
      latitude: number;
      longitude: number;
      address: string;
    };
  } | null;
  checkOut: {
    time: string;
    photo: string;
    location: {
      latitude: number;
      longitude: number;
      address: string;
    };
  } | null;
  status: "present" | "late" | "absent" | "holiday";
  workHours: number;
  overtime: OvertimeRecord | null;
}

export interface OvertimeRecord {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvedBy: string | null;
}

export interface WorkSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  minWorkHours: number;
}

export const DEFAULT_WORK_SCHEDULES: WorkSchedule[] = [
  { dayOfWeek: 0, startTime: "08:00", endTime: "16:00", minWorkHours: 8 }, // Sunday
  { dayOfWeek: 1, startTime: "08:00", endTime: "16:00", minWorkHours: 8 }, // Monday
  { dayOfWeek: 2, startTime: "08:00", endTime: "16:00", minWorkHours: 8 }, // Tuesday
  { dayOfWeek: 3, startTime: "08:00", endTime: "16:00", minWorkHours: 8 }, // Wednesday
  { dayOfWeek: 4, startTime: "08:00", endTime: "16:00", minWorkHours: 8 }, // Thursday
  { dayOfWeek: 5, startTime: "08:00", endTime: "16:00", minWorkHours: 8 }, // Friday
  { dayOfWeek: 6, startTime: "08:00", endTime: "13:00", minWorkHours: 5 }, // Saturday
];

export interface Holiday {
  date: string;
  name: string;
}

export const DEFAULT_HOLIDAYS: Holiday[] = [
  { date: "2026-01-01", name: "Tahun Baru" },
  { date: "2026-01-29", name: "Tahun Baru Imlek" },
  { date: "2026-03-20", name: "Hari Raya Nyepi" },
  { date: "2026-03-31", name: "Wafat Isa Al-Masih" },
  { date: "2026-04-03", name: "Isra Mi'raj" },
  { date: "2026-05-01", name: "Hari Buruh" },
  { date: "2026-05-13", name: "Kenaikan Isa Al-Masih" },
  { date: "2026-05-14", name: "Idul Fitri" },
  { date: "2026-05-15", name: "Idul Fitri" },
  { date: "2026-06-01", name: "Hari Lahir Pancasila" },
  { date: "2026-07-21", name: "Idul Adha" },
  { date: "2026-08-11", name: "Tahun Baru Islam" },
  { date: "2026-08-17", name: "Hari Kemerdekaan" },
  { date: "2026-10-20", name: "Maulid Nabi" },
  { date: "2026-12-25", name: "Natal" },
];

// Legacy export for backwards compatibility
export const WORK_SCHEDULES = DEFAULT_WORK_SCHEDULES;
export const INDONESIAN_HOLIDAYS_2026: string[] = DEFAULT_HOLIDAYS.map(h => h.date);

export const COMPANY_NAME = "PT Lestari Bumi Persada";
