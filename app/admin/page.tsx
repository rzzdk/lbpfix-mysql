"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getUsers,
  getAttendanceRecords,
  getOvertimeRecords,
  getAttendanceByDate,
} from "@/lib/data-store";
import type { User, AttendanceRecord, OvertimeRecord } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp,
  Calendar,
  Timer,
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const allUsers = getUsers();
    setEmployees(allUsers.filter((u) => u.role === "employee"));

    const today = new Date().toISOString().split("T")[0];
    setTodayRecords(getAttendanceByDate(today));
    setOvertimeRecords(getOvertimeRecords());
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate stats
  const totalEmployees = employees.length;
  const presentToday = todayRecords.filter((r) => r.checkIn).length;
  const lateToday = todayRecords.filter((r) => r.status === "late").length;
  const pendingOvertime = overtimeRecords.filter(
    (o) => o.status === "pending"
  ).length;

  // Get employee attendance status
  const getEmployeeStatus = (employeeId: string) => {
    const record = todayRecords.find((r) => r.userId === employeeId);
    if (!record?.checkIn) return "absent";
    if (record.status === "late") return "late";
    if (!record.checkOut) return "working";
    return "completed";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Selamat Datang, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">{formatDate(currentTime)}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-foreground">
            {formatTime(currentTime)}
          </p>
          <p className="text-sm text-muted-foreground">Waktu Server</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEmployees}</p>
                <p className="text-sm text-muted-foreground">Total Karyawan</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{presentToday}</p>
                <p className="text-sm text-muted-foreground">Hadir Hari Ini</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-warning/10">
                <AlertCircle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lateToday}</p>
                <p className="text-sm text-muted-foreground">Terlambat</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/10">
                <Timer className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingOvertime}</p>
                <p className="text-sm text-muted-foreground">
                  Lembur Pending
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Status Kehadiran Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada data karyawan</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map((employee) => {
                const status = getEmployeeStatus(employee.id);
                const record = todayRecords.find(
                  (r) => r.userId === employee.id
                );

                return (
                  <div
                    key={employee.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(employee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {employee.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {employee.position}
                      </p>
                      {record?.checkIn && (
                        <p className="text-xs text-muted-foreground">
                          Masuk: {record.checkIn.time}
                          {record.checkOut && ` - Keluar: ${record.checkOut.time}`}
                        </p>
                      )}
                    </div>
                    <div>
                      {status === "absent" && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Belum Hadir
                        </Badge>
                      )}
                      {status === "late" && (
                        <Badge className="bg-warning text-warning-foreground">
                          Terlambat
                        </Badge>
                      )}
                      {status === "working" && (
                        <Badge className="bg-primary">Bekerja</Badge>
                      )}
                      {status === "completed" && (
                        <Badge className="bg-success text-success-foreground">
                          Selesai
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ringkasan Bulanan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Rata-rata Kehadiran
                </span>
                <span className="font-bold text-success">
                  {totalEmployees > 0
                    ? Math.round((presentToday / totalEmployees) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Total Jam Lembur (Bulan Ini)
                </span>
                <span className="font-bold">
                  {overtimeRecords
                    .filter((o) => o.status === "approved")
                    .reduce((sum, o) => sum + o.duration, 0)
                    .toFixed(1)}{" "}
                  jam
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Permintaan Lembur Pending
                </span>
                <span className="font-bold text-warning">{pendingOvertime}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {todayRecords.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Belum ada aktivitas hari ini
              </p>
            ) : (
              <div className="space-y-3">
                {todayRecords.slice(0, 5).map((record) => {
                  const employee = employees.find(
                    (e) => e.id === record.userId
                  );
                  if (!employee) return null;

                  return (
                    <div
                      key={record.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(employee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{employee.name}</p>
                      </div>
                      <span className="text-muted-foreground">
                        {record.checkIn?.time}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
