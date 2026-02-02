"use client";

import { useState, useEffect } from "react";
import { COMPANY_NAME } from "@/lib/types";
import type { WorkSchedule, Holiday } from "@/lib/types";
import {
  getWorkSchedules,
  updateWorkSchedule,
  resetWorkSchedules,
  getHolidays,
  addHoliday,
  deleteHoliday,
  resetHolidays,
} from "@/lib/data-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  Clock,
  Calendar,
  Building2,
  Info,
  Pencil,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  X,
} from "lucide-react";

export default function SettingsPage() {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    startTime: "",
    endTime: "",
    minWorkHours: 0,
  });
  const [newHoliday, setNewHoliday] = useState({ date: "", name: "" });
  const [holidayError, setHolidayError] = useState("");
  const [isAddHolidayOpen, setIsAddHolidayOpen] = useState(false);

  const dayNames = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];

  useEffect(() => {
    setSchedules(getWorkSchedules());
    setHolidays(getHolidays());
  }, []);

  const handleEditSchedule = (dayOfWeek: number) => {
    const schedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);
    if (schedule) {
      setEditForm({
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        minWorkHours: schedule.minWorkHours,
      });
      setEditingDay(dayOfWeek);
    }
  };

  const handleSaveSchedule = () => {
    if (editingDay !== null) {
      const updated = updateWorkSchedule(editingDay, editForm);
      setSchedules(updated);
      setEditingDay(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingDay(null);
    setEditForm({ startTime: "", endTime: "", minWorkHours: 0 });
  };

  const handleResetSchedules = () => {
    const reset = resetWorkSchedules();
    setSchedules(reset);
  };

  const handleAddHoliday = () => {
    if (!newHoliday.date || !newHoliday.name) {
      setHolidayError("Tanggal dan nama libur harus diisi");
      return;
    }
    const result = addHoliday(newHoliday);
    if ("error" in result) {
      setHolidayError(result.error);
    } else {
      setHolidays(result);
      setNewHoliday({ date: "", name: "" });
      setHolidayError("");
      setIsAddHolidayOpen(false);
    }
  };

  const handleDeleteHoliday = (date: string) => {
    const updated = deleteHoliday(date);
    setHolidays(updated);
  };

  const handleResetHolidays = () => {
    const reset = resetHolidays();
    setHolidays(reset);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Pengaturan
        </h1>
        <p className="text-muted-foreground">
          Kelola konfigurasi sistem presensi
        </p>
      </div>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informasi Perusahaan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Nama Perusahaan</p>
              <p className="font-medium text-lg">{COMPANY_NAME}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Jadwal Jam Kerja
              </CardTitle>
              <CardDescription>
                Klik tombol edit untuk mengubah jam kerja
              </CardDescription>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Jadwal Kerja?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Semua jadwal kerja akan dikembalikan ke pengaturan default.
                    Tindakan ini tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetSchedules}>
                    Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {schedules.map((schedule) => (
              <div
                key={schedule.dayOfWeek}
                className="flex items-center justify-between p-3 rounded-lg bg-muted"
              >
                {editingDay === schedule.dayOfWeek ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          schedule.dayOfWeek === 0 ? "secondary" : "outline"
                        }
                      >
                        {dayNames[schedule.dayOfWeek]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Masuk</Label>
                        <Input
                          type="time"
                          value={editForm.startTime}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              startTime: e.target.value,
                            })
                          }
                          className="w-28 h-8"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Keluar</Label>
                        <Input
                          type="time"
                          value={editForm.endTime}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              endTime: e.target.value,
                            })
                          }
                          className="w-28 h-8"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Min Jam</Label>
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          value={editForm.minWorkHours}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              minWorkHours: Number(e.target.value),
                            })
                          }
                          className="w-16 h-8"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSaveSchedule}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          schedule.dayOfWeek === 0 ? "secondary" : "outline"
                        }
                      >
                        {dayNames[schedule.dayOfWeek]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">
                        <span className="text-muted-foreground">Jam:</span>{" "}
                        <strong>
                          {schedule.startTime} - {schedule.endTime}
                        </strong>
                      </span>
                      <span className="text-sm">
                        <span className="text-muted-foreground">Min:</span>{" "}
                        <strong>{schedule.minWorkHours} jam</strong>
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditSchedule(schedule.dayOfWeek)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Holidays */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Hari Libur
              </CardTitle>
              <CardDescription>
                Kelola daftar hari libur nasional dan cuti bersama
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddHolidayOpen} onOpenChange={setIsAddHolidayOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Libur
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Hari Libur</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="holiday-date">Tanggal</Label>
                      <Input
                        id="holiday-date"
                        type="date"
                        value={newHoliday.date}
                        onChange={(e) =>
                          setNewHoliday({ ...newHoliday, date: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="holiday-name">Nama Hari Libur</Label>
                      <Input
                        id="holiday-name"
                        placeholder="Contoh: Hari Kemerdekaan"
                        value={newHoliday.name}
                        onChange={(e) =>
                          setNewHoliday({ ...newHoliday, name: e.target.value })
                        }
                      />
                    </div>
                    {holidayError && (
                      <p className="text-sm text-destructive">{holidayError}</p>
                    )}
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setNewHoliday({ date: "", name: "" });
                          setHolidayError("");
                        }}
                      >
                        Batal
                      </Button>
                    </DialogClose>
                    <Button onClick={handleAddHoliday}>Simpan</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Hari Libur?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Semua hari libur akan dikembalikan ke pengaturan default.
                      Tindakan ini tidak dapat dibatalkan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetHolidays}>
                      Reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {holidays.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada hari libur</p>
            </div>
          ) : (
            <div className="grid gap-2 max-h-96 overflow-y-auto">
              {holidays.map((holiday) => (
                <div
                  key={holiday.date}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{holiday.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(holiday.date)}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Hari Libur?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Anda akan menghapus {holiday.name} ({holiday.date}).
                          Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteHoliday(holiday.date)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            Ketentuan Presensi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="p-3 rounded-lg border">
              <p className="font-medium mb-1">Keterlambatan</p>
              <p className="text-muted-foreground">
                Karyawan yang check-in setelah jam masuk akan dicatat sebagai
                terlambat. Waktu check-out minimal akan dihitung berdasarkan jam
                check-in + minimal jam kerja hari tersebut.
              </p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium mb-1">Lembur</p>
              <p className="text-muted-foreground">
                Karyawan hanya dapat mengajukan lembur setelah memenuhi minimal
                jam kerja hari tersebut dan sudah melakukan check-out. Lembur
                memerlukan persetujuan dari Admin/HR.
              </p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium mb-1">Foto & Lokasi</p>
              <p className="text-muted-foreground">
                Setiap check-in dan check-out wajib menyertakan foto selfie dan
                informasi lokasi GPS untuk validasi kehadiran.
              </p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium mb-1">Hari Libur</p>
              <p className="text-muted-foreground">
                Pada hari libur nasional, presensi tidak diperlukan. Sistem akan
                otomatis mendeteksi tanggal merah.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
