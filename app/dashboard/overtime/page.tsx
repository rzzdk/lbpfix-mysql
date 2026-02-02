"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getTodayAttendance,
  getOvertimeByUserId,
  startOvertime,
  endOvertime,
  getWorkSchedules,
} from "@/lib/data-store";
import type { AttendanceRecord, OvertimeRecord, WorkSchedule } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Timer,
  Play,
  Square,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";

export default function OvertimePage() {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] =
    useState<AttendanceRecord | null>(null);
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([]);
  const [activeOvertime, setActiveOvertime] = useState<OvertimeRecord | null>(
    null
  );
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = () => {
    if (!user) return;

    setTodayAttendance(getTodayAttendance(user.id));

    const records = getOvertimeByUserId(user.id);
    // Sort by date descending
    records.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setOvertimeRecords(records);

    // Check for active overtime
    const today = new Date().toISOString().split("T")[0];
    const active = records.find((o) => o.date === today && !o.endTime);
    setActiveOvertime(active || null);
  };

  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);

  useEffect(() => {
    const dayOfWeek = new Date().getDay();
    const schedules = getWorkSchedules();
    setSchedule(schedules[dayOfWeek]);
  }, []);

  const canStartOvertime = () => {
    if (!schedule) return false;
    if (!todayAttendance?.checkIn || !todayAttendance?.checkOut) return false;
    if (todayAttendance.workHours < schedule.minWorkHours) return false;
    if (activeOvertime) return false;
    return true;
  };

  const handleStartOvertime = () => {
    if (!user || !reason.trim()) return;

    setError(null);
    setSuccess(null);

    const result = startOvertime(user.id, reason.trim());

    if ("error" in result) {
      setError(result.error);
    } else {
      setSuccess("Lembur dimulai!");
      setShowStartDialog(false);
      setReason("");
      loadData();
    }
  };

  const handleEndOvertime = () => {
    if (!user) return;

    setError(null);
    setSuccess(null);

    const result = endOvertime(user.id);

    if ("error" in result) {
      setError(result.error);
    } else {
      setSuccess("Lembur selesai!");
      loadData();
    }
  };

  const calculateElapsedTime = () => {
    if (!activeOvertime) return "00:00:00";

    const startParts = activeOvertime.startTime.split(":").map(Number);
    const startMinutes = startParts[0] * 60 + startParts[1];
    const nowMinutes =
      currentTime.getHours() * 60 + currentTime.getMinutes();
    const elapsed = nowMinutes - startMinutes;

    const hours = Math.floor(elapsed / 60);
    const minutes = elapsed % 60;
    const seconds = currentTime.getSeconds();

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success text-success-foreground">Disetujui</Badge>;
      case "rejected":
        return <Badge variant="destructive">Ditolak</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const totalOvertimeHours = overtimeRecords
    .filter((o) => o.status === "approved")
    .reduce((sum, o) => sum + o.duration, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Timer className="h-6 w-6" />
          Lembur
        </h1>
        <p className="text-muted-foreground">
          Kelola jam lembur Anda
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-success bg-success/10">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">{success}</AlertDescription>
        </Alert>
      )}

      {/* Info Card */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Anda dapat mengajukan lembur setelah memenuhi minimal{" "}
          <strong>{schedule?.minWorkHours || 8} jam kerja</strong> pada hari tersebut.
          Pastikan Anda sudah check-out terlebih dahulu.
        </AlertDescription>
      </Alert>

      {/* Active Overtime */}
      {activeOvertime ? (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
              Lembur Berjalan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-5xl font-bold text-primary tracking-tight font-mono">
                {calculateElapsedTime()}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Dimulai pukul {activeOvertime.startTime}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Alasan: {activeOvertime.reason}
              </p>
              <Button
                className="mt-6 gap-2"
                variant="destructive"
                onClick={handleEndOvertime}
              >
                <Square className="h-4 w-4" />
                Selesai Lembur
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Timer className="h-8 w-8 text-primary" />
              </div>
              {canStartOvertime() ? (
                <>
                  <p className="text-muted-foreground mb-4">
                    Anda memenuhi syarat untuk lembur hari ini
                  </p>
                  <Button
                    onClick={() => setShowStartDialog(true)}
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Mulai Lembur
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-medium text-foreground mb-2">
                    Tidak Dapat Lembur
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {!todayAttendance?.checkIn
                      ? "Anda belum check-in hari ini"
                      : !todayAttendance?.checkOut
                      ? "Anda belum check-out hari ini"
                      : `Jam kerja Anda (${todayAttendance.workHours.toFixed(
                          1
                        )} jam) belum memenuhi minimal ${
                          schedule?.minWorkHours || 8
                        } jam`}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                {overtimeRecords.filter((o) => o.status === "approved").length}
              </p>
              <p className="text-sm text-muted-foreground">
                Lembur Disetujui
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                {totalOvertimeHours.toFixed(1)}
              </p>
              <p className="text-sm text-muted-foreground">Total Jam Lembur</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overtime History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Riwayat Lembur</CardTitle>
        </CardHeader>
        <CardContent>
          {overtimeRecords.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Belum ada riwayat lembur
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overtimeRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {formatDate(record.date)}
                      </TableCell>
                      <TableCell>
                        {record.startTime} - {record.endTime || "..."}
                      </TableCell>
                      <TableCell>
                        {record.duration > 0
                          ? `${record.duration.toFixed(1)} jam`
                          : "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {record.reason}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Overtime Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mulai Lembur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Alasan Lembur</Label>
              <Textarea
                id="reason"
                placeholder="Jelaskan alasan Anda lembur hari ini..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span>
                  Waktu mulai:{" "}
                  <strong>{currentTime.toTimeString().slice(0, 5)}</strong>
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleStartOvertime} disabled={!reason.trim()}>
              Mulai Lembur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
