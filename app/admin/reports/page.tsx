"use client";

import { useState, useEffect } from "react";
import {
  getUsers,
  getAttendanceRecords,
  getOvertimeRecords,
} from "@/lib/data-store";
import type { User, AttendanceRecord, OvertimeRecord } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileSpreadsheet, Download, Calendar, TrendingUp } from "lucide-react";

export default function ReportsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const allUsers = getUsers();
    setUsers(allUsers.filter((u) => u.role === "employee"));
    setRecords(getAttendanceRecords());
    setOvertimeRecords(getOvertimeRecords());
  }, []);

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

  // Filter records by selected month/year
  const filteredRecords = records.filter((r) => {
    const date = new Date(r.date);
    return (
      date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
    );
  });

  const filteredOvertime = overtimeRecords.filter((o) => {
    const date = new Date(o.date);
    return (
      date.getMonth() === selectedMonth &&
      date.getFullYear() === selectedYear &&
      o.status === "approved"
    );
  });

  // Calculate employee stats
  const getEmployeeStats = (userId: string) => {
    const userRecords = filteredRecords.filter((r) => r.userId === userId);
    const userOvertime = filteredOvertime.filter((o) => o.userId === userId);

    return {
      present: userRecords.filter((r) => r.status === "present").length,
      late: userRecords.filter((r) => r.status === "late").length,
      totalDays: userRecords.filter((r) => r.checkIn).length,
      totalHours: userRecords.reduce((sum, r) => sum + r.workHours, 0),
      overtimeHours: userOvertime.reduce((sum, o) => sum + o.duration, 0),
    };
  };

  // Download as CSV
  const downloadCSV = () => {
    const headers = [
      "Nama",
      "Username",
      "Departemen",
      "Jabatan",
      "Hadir Tepat Waktu",
      "Terlambat",
      "Total Hari Kerja",
      "Total Jam Kerja",
      "Jam Lembur",
    ];

    const rows = users.map((user) => {
      const stats = getEmployeeStats(user.id);
      return [
        user.name,
        user.username,
        user.department,
        user.position,
        stats.present,
        stats.late,
        stats.totalDays,
        stats.totalHours.toFixed(1),
        stats.overtimeHours.toFixed(1),
      ];
    });

    const csvContent = [
      `Laporan Presensi - ${monthNames[selectedMonth]} ${selectedYear}`,
      "",
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `laporan-presensi-${monthNames[selectedMonth].toLowerCase()}-${selectedYear}.csv`;
    link.click();
  };

  // Download as Excel (simple implementation)
  const downloadExcel = () => {
    const headers = [
      "Nama",
      "Username",
      "Departemen",
      "Jabatan",
      "Hadir Tepat Waktu",
      "Terlambat",
      "Total Hari Kerja",
      "Total Jam Kerja",
      "Jam Lembur",
    ];

    const rows = users.map((user) => {
      const stats = getEmployeeStats(user.id);
      return [
        user.name,
        user.username,
        user.department,
        user.position,
        stats.present,
        stats.late,
        stats.totalDays,
        stats.totalHours.toFixed(1),
        stats.overtimeHours.toFixed(1),
      ];
    });

    // Create HTML table for Excel
    let tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"></head>
      <body>
        <h2>Laporan Presensi - ${monthNames[selectedMonth]} ${selectedYear}</h2>
        <table border="1">
          <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
          ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHTML], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `laporan-presensi-${monthNames[selectedMonth].toLowerCase()}-${selectedYear}.xls`;
    link.click();
  };

  // Overall stats
  const totalPresent = filteredRecords.filter(
    (r) => r.status === "present"
  ).length;
  const totalLate = filteredRecords.filter((r) => r.status === "late").length;
  const totalWorkHours = filteredRecords.reduce((sum, r) => sum + r.workHours, 0);
  const totalOvertimeHours = filteredOvertime.reduce(
    (sum, o) => sum + o.duration,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            Laporan Presensi
          </h1>
          <p className="text-muted-foreground">
            Unduh laporan kehadiran karyawan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedMonth.toString()}
            onValueChange={(v) => setSelectedMonth(parseInt(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((name, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Download Buttons */}
      <div className="flex gap-2">
        <Button onClick={downloadCSV} variant="outline" className="gap-2 bg-transparent">
          <Download className="h-4 w-4" />
          Unduh CSV
        </Button>
        <Button onClick={downloadExcel} className="gap-2">
          <Download className="h-4 w-4" />
          Unduh Excel
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-success">{totalPresent}</p>
              <p className="text-sm text-muted-foreground">Hadir Tepat Waktu</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-warning">{totalLate}</p>
              <p className="text-sm text-muted-foreground">Terlambat</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                {totalWorkHours.toFixed(0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Jam Kerja</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-accent">
                {totalOvertimeHours.toFixed(1)}
              </p>
              <p className="text-sm text-muted-foreground">Jam Lembur</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Laporan {monthNames[selectedMonth]} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Tidak ada data karyawan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Departemen</TableHead>
                    <TableHead className="text-center">Tepat Waktu</TableHead>
                    <TableHead className="text-center">Terlambat</TableHead>
                    <TableHead className="text-center">Total Hari</TableHead>
                    <TableHead className="text-center">Jam Kerja</TableHead>
                    <TableHead className="text-center">Lembur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const stats = getEmployeeStats(user.id);

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {user.position}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{user.department}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-success text-success-foreground">
                            {stats.present}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-warning text-warning-foreground">
                            {stats.late}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {stats.totalDays}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {stats.totalHours.toFixed(1)} jam
                        </TableCell>
                        <TableCell className="text-center">
                          {stats.overtimeHours > 0 ? (
                            <Badge variant="outline">
                              {stats.overtimeHours.toFixed(1)} jam
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
