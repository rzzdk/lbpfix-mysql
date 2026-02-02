"use client";

import { useState, useEffect } from "react";
import {
  getUsers,
  getAttendanceRecords,
  getOvertimeRecords,
  approveOvertime,
} from "@/lib/data-store";
import { useAuth } from "@/lib/auth-context";
import type { User, AttendanceRecord, OvertimeRecord } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  Calendar,
  Eye,
  MapPin,
  Timer,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

export default function AdminAttendancePage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(
    null
  );
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = () => {
    const allUsers = getUsers();
    setUsers(allUsers.filter((u) => u.role === "employee"));

    const allRecords = getAttendanceRecords();
    setRecords(allRecords.filter((r) => r.date === selectedDate));

    setOvertimeRecords(getOvertimeRecords());
  };

  const pendingOvertimes = overtimeRecords.filter(
    (o) => o.status === "pending" && o.endTime
  );

  const handleApproveOvertime = (overtimeId: string, approved: boolean) => {
    if (!user) return;

    const result = approveOvertime(overtimeId, user.id, approved);
    if (!("error" in result)) {
      setSuccess(approved ? "Lembur disetujui" : "Lembur ditolak");
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const getUserById = (userId: string) => {
    return users.find((u) => u.id === userId);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
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
    return `${dayNames[date.getDay()]}, ${date.getDate()} ${
      monthNames[date.getMonth()]
    } ${date.getFullYear()}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-success text-success-foreground">Hadir</Badge>;
      case "late":
        return <Badge className="bg-warning text-warning-foreground">Terlambat</Badge>;
      case "absent":
        return <Badge variant="destructive">Tidak Hadir</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const prevDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const nextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  // Calculate stats
  const presentCount = records.filter((r) => r.checkIn).length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const absentCount = users.length - presentCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Data Presensi
        </h1>
        <p className="text-muted-foreground">
          Lihat dan kelola data kehadiran karyawan
        </p>
      </div>

      {/* Success Alert */}
      {success && (
        <Alert className="border-success bg-success/10">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Harian</TabsTrigger>
          <TabsTrigger value="overtime">
            Lembur
            {pendingOvertimes.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingOvertimes.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6">
          {/* Date Selector */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={prevDay}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <p className="text-lg font-semibold">
                    {formatDate(selectedDate)}
                  </p>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-sm text-muted-foreground bg-transparent border-none text-center cursor-pointer"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={nextDay}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-success">
                    {presentCount}
                  </p>
                  <p className="text-sm text-muted-foreground">Hadir</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-warning">{lateCount}</p>
                  <p className="text-sm text-muted-foreground">Terlambat</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-destructive">
                    {absentCount}
                  </p>
                  <p className="text-sm text-muted-foreground">Belum Hadir</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Data Kehadiran - {formatDate(selectedDate)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Tidak ada data karyawan
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Karyawan</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead>Check-out</TableHead>
                        <TableHead>Jam Kerja</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((employee) => {
                        const record = records.find(
                          (r) => r.userId === employee.id
                        );

                        return (
                          <TableRow key={employee.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {getInitials(employee.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{employee.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {employee.position}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{record?.checkIn?.time || "-"}</TableCell>
                            <TableCell>
                              {record?.checkOut?.time || "-"}
                            </TableCell>
                            <TableCell>
                              {record?.workHours
                                ? `${record.workHours.toFixed(1)} jam`
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {record?.checkIn ? (
                                getStatusBadge(record.status)
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-muted-foreground"
                                >
                                  Belum Hadir
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {record?.checkIn && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedRecord(record)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
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
        </TabsContent>

        <TabsContent value="overtime" className="space-y-6">
          {/* Pending Overtimes */}
          {pendingOvertimes.length > 0 && (
            <Card className="border-warning">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Timer className="h-5 w-5 text-warning" />
                  Permintaan Lembur Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingOvertimes.map((overtime) => {
                    const employee = getUserById(overtime.userId);
                    if (!employee) return null;

                    return (
                      <div
                        key={overtime.id}
                        className="flex items-center gap-4 p-4 rounded-lg border"
                      >
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(employee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(overtime.date)} | {overtime.startTime} -{" "}
                            {overtime.endTime} ({overtime.duration.toFixed(1)}{" "}
                            jam)
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Alasan: {overtime.reason}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive bg-transparent"
                            onClick={() =>
                              handleApproveOvertime(overtime.id, false)
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleApproveOvertime(overtime.id, true)
                            }
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Overtime Records */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Riwayat Lembur</CardTitle>
            </CardHeader>
            <CardContent>
              {overtimeRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Timer className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Belum ada data lembur
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Karyawan</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Durasi</TableHead>
                        <TableHead>Alasan</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overtimeRecords.map((overtime) => {
                        const employee = getUserById(overtime.userId);
                        if (!employee) return null;

                        return (
                          <TableRow key={overtime.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {getInitials(employee.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{employee.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(overtime.date)}</TableCell>
                            <TableCell>
                              {overtime.startTime} - {overtime.endTime || "..."}
                            </TableCell>
                            <TableCell>
                              {overtime.duration > 0
                                ? `${overtime.duration.toFixed(1)} jam`
                                : "-"}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {overtime.reason}
                            </TableCell>
                            <TableCell>
                              {overtime.status === "approved" && (
                                <Badge className="bg-success text-success-foreground">
                                  Disetujui
                                </Badge>
                              )}
                              {overtime.status === "rejected" && (
                                <Badge variant="destructive">Ditolak</Badge>
                              )}
                              {overtime.status === "pending" && (
                                <Badge variant="secondary">Pending</Badge>
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
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedRecord}
        onOpenChange={() => setSelectedRecord(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Detail Presensi -{" "}
              {selectedRecord && formatDate(selectedRecord.date)}
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              {/* Employee Info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getUserById(selectedRecord.userId)
                      ? getInitials(getUserById(selectedRecord.userId)!.name)
                      : "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {getUserById(selectedRecord.userId)?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getUserById(selectedRecord.userId)?.position}
                  </p>
                </div>
              </div>

              {/* Check-in Details */}
              {selectedRecord.checkIn && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Check-in: {selectedRecord.checkIn.time}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={selectedRecord.checkIn.photo || "/placeholder.svg"}
                        alt="Check-in"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                        <span className="line-clamp-4">
                          {selectedRecord.checkIn.location.address}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Check-out Details */}
              {selectedRecord.checkOut && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Check-out: {selectedRecord.checkOut.time}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={selectedRecord.checkOut.photo || "/placeholder.svg"}
                        alt="Check-out"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                        <span className="line-clamp-4">
                          {selectedRecord.checkOut.location.address}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Jam Kerja</span>
                  <span className="font-bold">
                    {selectedRecord.workHours.toFixed(1)} jam
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Status</span>
                  {getStatusBadge(selectedRecord.status)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
