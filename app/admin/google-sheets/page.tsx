"use client";

import { useState, useEffect } from "react";
import {
  getUsers,
  getAttendanceRecords,
  getOvertimeRecords,
} from "@/lib/data-store";
import type { User, AttendanceRecord, OvertimeRecord } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  ExternalLink,
  Copy,
  CheckCircle2,
  Info,
  FileSpreadsheet,
} from "lucide-react";

export default function GoogleSheetsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [copied, setCopied] = useState(false);

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

  // Generate data for Google Sheets (tab-separated)
  const generateSheetsData = () => {
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
        stats.present.toString(),
        stats.late.toString(),
        stats.totalDays.toString(),
        stats.totalHours.toFixed(1),
        stats.overtimeHours.toFixed(1),
      ];
    });

    return [headers, ...rows].map((row) => row.join("\t")).join("\n");
  };

  const copyToClipboard = async () => {
    const data = generateSheetsData();
    try {
      await navigator.clipboard.writeText(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            Integrasi Google Sheets
          </h1>
          <p className="text-muted-foreground">
            Export data presensi ke Google Spreadsheet
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

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Untuk mengintegrasikan data dengan Google Sheets, ikuti langkah-langkah
          di bawah ini. Data akan disalin ke clipboard dan dapat langsung
          di-paste ke Google Sheets.
        </AlertDescription>
      </Alert>

      {/* Quick Copy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Copy Data ke Google Sheets</CardTitle>
          <CardDescription>
            Salin data periode {monthNames[selectedMonth]} {selectedYear} dengan
            satu klik
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={copyToClipboard} className="gap-2">
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Data Tersalin!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Salin Data ke Clipboard
                </>
              )}
            </Button>

            {copied && (
              <Alert className="border-success bg-success/10">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  Data berhasil disalin! Buka Google Sheets dan tekan Ctrl+V
                  (atau Cmd+V di Mac) untuk paste.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step by Step Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Panduan Integrasi</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            <li className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                1
              </div>
              <div>
                <p className="font-medium">Buka Google Sheets</p>
                <p className="text-sm text-muted-foreground">
                  Buka{" "}
                  <a
                    href="https://sheets.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    sheets.google.com
                    <ExternalLink className="h-3 w-3" />
                  </a>{" "}
                  dan buat spreadsheet baru atau buka yang sudah ada.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                2
              </div>
              <div>
                <p className="font-medium">Salin Data</p>
                <p className="text-sm text-muted-foreground">
                  Klik tombol &quot;Salin Data ke Clipboard&quot; di atas untuk menyalin
                  data presensi periode yang dipilih.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                3
              </div>
              <div>
                <p className="font-medium">Paste ke Google Sheets</p>
                <p className="text-sm text-muted-foreground">
                  Klik pada sel A1 di Google Sheets, lalu tekan{" "}
                  <kbd className="px-2 py-1 text-xs rounded bg-muted">Ctrl</kbd>
                  {" + "}
                  <kbd className="px-2 py-1 text-xs rounded bg-muted">V</kbd>{" "}
                  (atau{" "}
                  <kbd className="px-2 py-1 text-xs rounded bg-muted">Cmd</kbd>
                  {" + "}
                  <kbd className="px-2 py-1 text-xs rounded bg-muted">V</kbd>{" "}
                  di Mac) untuk paste data.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                4
              </div>
              <div>
                <p className="font-medium">Format Spreadsheet</p>
                <p className="text-sm text-muted-foreground">
                  Data akan otomatis terformat dalam kolom. Anda bisa menambahkan
                  format, chart, atau formula sesuai kebutuhan.
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preview Data</CardTitle>
          <CardDescription>
            Data yang akan diekspor untuk periode {monthNames[selectedMonth]}{" "}
            {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <pre className="p-4 rounded-lg bg-muted text-xs font-mono whitespace-pre overflow-x-auto">
              {generateSheetsData()}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
