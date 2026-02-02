"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getTodayAttendance,
  getAttendanceStats,
  getOvertimeByUserId,
  getWorkSchedules,
  getHolidays,
} from "@/lib/data-store";
import type { AttendanceRecord, OvertimeRecord, WorkSchedule } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Clock,
  Calendar,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Timer,
  MapPin,
} from "lucide-react";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [todayAttendance, setTodayAttendance] =
    useState<AttendanceRecord | null>(null);
  const [stats, setStats] = useState({
    present: 0,
    late: 0,
    absent: 0,
    totalWorkHours: 0,
    total: 0,
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingOvertime, setPendingOvertime] = useState<OvertimeRecord | null>(
    null
  );
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [holidays, setHolidays] = useState<string[]>([]);

  useEffect(() => {
    const dayOfWeek = new Date().getDay();
    const schedules = getWorkSchedules();
    setSchedule(schedules[dayOfWeek]);
    
    const holidayList = getHolidays();
    setHolidays(holidayList.map(h => h.date));
  }, []);

  useEffect(() => {
    if (user) {
      setTodayAttendance(getTodayAttendance(user.id));
      setStats(getAttendanceStats(user.id));

      const overtimes = getOvertimeByUserId(user.id);
      const today = new Date().toISOString().split("T")[0];
      const pending = overtimes.find(
        (o) => o.date === today && !o.endTime
      );
      setPendingOvertime(pending || null);
    }
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date();
  const todayDate = today.toISOString().split("T")[0];
  const isHoliday = holidays.includes(todayDate);

  const dayNames = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const formatDate = (date: Date) => {
    return `${dayNames[date.getDay()]}, ${date.getDate()} ${
      monthNames[date.getMonth()]
    } ${date.getFullYear()}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getStatusBadge = () => {
    if (isHoliday) {
      return <Badge variant="secondary">Hari Libur</Badge>;
    }
    if (!todayAttendance?.checkIn) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Belum Check-in
        </Badge>
      );
    }
    if (todayAttendance.status === "late") {
      return <Badge className="bg-warning text-warning-foreground">Terlambat</Badge>;
    }
    if (!todayAttendance.checkOut) {
      return <Badge className="bg-primary">Sedang Bekerja</Badge>;
    }
    return <Badge className="bg-success text-success-foreground">Selesai</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Selamat Datang, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">{formatDate(today)}</p>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge()}
        </div>
      </div>

      {/* Current Time Card */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-2">
            <Clock className="h-8 w-8 opacity-80" />
            <p className="text-5xl font-bold tracking-tight">
              {formatTime(currentTime)}
            </p>
            <p className="text-sm opacity-80">
              Jam Kerja: {schedule?.startTime || "08:00"} - {schedule?.endTime || "16:00"} (Min.{" "}
              {schedule?.minWorkHours || 8} jam)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => router.push("/dashboard/attendance")}>
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {!todayAttendance?.checkIn
                    ? "Check-in Sekarang"
                    : !todayAttendance?.checkOut
                    ? "Check-out Sekarang"
                    : "Presensi Selesai"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {!todayAttendance?.checkIn
                    ? "Mulai hari kerja Anda"
                    : !todayAttendance?.checkOut
                    ? `Check-in: ${todayAttendance.checkIn.time}`
                    : `${todayAttendance.workHours.toFixed(1)} jam kerja`}
                </p>
              </div>
              <Button>
                {!todayAttendance?.checkIn
                  ? "Check-in"
                  : !todayAttendance?.checkOut
                  ? "Check-out"
                  : "Lihat"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-dashed hover:border-accent/50 transition-colors cursor-pointer"
          onClick={() => router.push("/dashboard/overtime")}>
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/10">
                <Timer className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {pendingOvertime ? "Lembur Berjalan" : "Ajukan Lembur"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {pendingOvertime
                    ? `Mulai: ${pendingOvertime.startTime}`
                    : "Tambah jam kerja hari ini"}
                </p>
              </div>
              <Button variant="outline">
                {pendingOvertime ? "Selesai" : "Mulai"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Status */}
      {todayAttendance?.checkIn && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Status Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="text-xs text-muted-foreground">Check-in</p>
                  <p className="font-semibold">{todayAttendance.checkIn.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                {todayAttendance.checkOut ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-warning" />
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Check-out</p>
                  <p className="font-semibold">
                    {todayAttendance.checkOut?.time || "Belum check-out"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Jam Kerja</p>
                  <p className="font-semibold">
                    {todayAttendance.workHours.toFixed(1)} jam
                  </p>
                </div>
              </div>
            </div>
            {todayAttendance.checkIn.location && (
              <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{todayAttendance.checkIn.location.address}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monthly Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-success/10 mb-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <p className="text-2xl font-bold">{stats.present}</p>
              <p className="text-xs text-muted-foreground">Hadir Tepat Waktu</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-warning/10 mb-2">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <p className="text-2xl font-bold">{stats.late}</p>
              <p className="text-xs text-muted-foreground">Terlambat</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 mb-2">
                <Calendar className="h-5 w-5 text-destructive" />
              </div>
              <p className="text-2xl font-bold">{stats.absent}</p>
              <p className="text-xs text-muted-foreground">Tidak Hadir</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-bold">
                {stats.totalWorkHours.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Jam Kerja</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
