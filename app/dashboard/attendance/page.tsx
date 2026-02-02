"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getTodayAttendance, checkIn, checkOut, getWorkSchedules, getHolidays } from "@/lib/data-store";
import type { WorkSchedule } from "@/lib/types";
import type { AttendanceRecord } from "@/lib/types";
import { CameraCapture } from "@/components/camera-capture";
import { LocationPicker } from "@/components/location-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock,
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  Calendar,
} from "lucide-react";

type Step = "idle" | "camera" | "location" | "processing";

export default function AttendancePage() {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] =
    useState<AttendanceRecord | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [step, setStep] = useState<Step>("idle");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"checkin" | "checkout">("checkin");
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [currentWorkedHours, setCurrentWorkedHours] = useState<number>(0);
  const [canCheckoutByTime, setCanCheckoutByTime] = useState<boolean>(false);

  // Load schedule and holidays
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
    }
  }, [user]);

  // Calculate current worked hours in real-time
  useEffect(() => {
    if (!todayAttendance?.checkIn || todayAttendance?.checkOut) {
      setCurrentWorkedHours(0);
      setCanCheckoutByTime(false);
      return;
    }

    const calculateWorkedHours = () => {
      const now = new Date();
      const checkInParts = todayAttendance.checkIn!.time.split(":").map(Number);
      const checkInMinutes = checkInParts[0] * 60 + checkInParts[1];
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const workedHours = Math.max(0, (currentMinutes - checkInMinutes) / 60);
      
      setCurrentWorkedHours(workedHours);
      setCanCheckoutByTime(schedule ? workedHours >= schedule.minWorkHours : false);
    };

    calculateWorkedHours();
    const interval = setInterval(calculateWorkedHours, 1000);
    
    return () => clearInterval(interval);
  }, [todayAttendance, schedule]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date();
  const dayOfWeek = today.getDay();
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const calculateMinCheckoutTime = () => {
    if (!todayAttendance?.checkIn || !schedule) return null;

    const checkInParts = todayAttendance.checkIn.time.split(":").map(Number);
    const checkInMinutes = checkInParts[0] * 60 + checkInParts[1];
    const minCheckoutMinutes = checkInMinutes + schedule.minWorkHours * 60;

    const hours = Math.floor(minCheckoutMinutes / 60);
    const minutes = minCheckoutMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  const formatWorkedHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h} jam ${m} menit`;
  };

  const getRemainingTime = () => {
    if (!schedule) return "";
    const remaining = schedule.minWorkHours - currentWorkedHours;
    if (remaining <= 0) return "";
    const h = Math.floor(remaining);
    const m = Math.ceil((remaining - h) * 60);
    return h > 0 ? `${h} jam ${m} menit lagi` : `${m} menit lagi`;
  };

  const startAction = (type: "checkin" | "checkout") => {
    setActionType(type);
    setError(null);
    setSuccess(null);
    setCapturedPhoto(null);
    setStep("camera");
  };

  const handlePhotoCapture = (photoData: string) => {
    setCapturedPhoto(photoData);
    setStep("location");
  };

  const handleLocationConfirm = (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    if (!user || !capturedPhoto) return;

    setStep("processing");

    setTimeout(() => {
      let result;
      if (actionType === "checkin") {
        result = checkIn(user.id, capturedPhoto, location);
      } else {
        result = checkOut(user.id, capturedPhoto, location);
      }

      if ("error" in result) {
        setError(result.error);
      } else {
        setTodayAttendance(result);
        setSuccess(
          actionType === "checkin"
            ? "Check-in berhasil!"
            : "Check-out berhasil!"
        );
      }

      setStep("idle");
      setCapturedPhoto(null);
    }, 1000);
  };

  const handleCancel = () => {
    setStep("idle");
    setCapturedPhoto(null);
    setError(null);
  };

  const canCheckIn = !todayAttendance?.checkIn && !isHoliday;
  const hasCheckedIn = todayAttendance?.checkIn && !todayAttendance?.checkOut && !isHoliday;
  const canCheckOut = hasCheckedIn && canCheckoutByTime;

  // Render camera step
  if (step === "camera") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">
            {actionType === "checkin" ? "Check-in" : "Check-out"} - Ambil Foto
          </h1>
          <p className="text-muted-foreground">Ambil foto selfie Anda</p>
        </div>
        <CameraCapture onCapture={handlePhotoCapture} onCancel={handleCancel} />
      </div>
    );
  }

  // Render location step
  if (step === "location") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">
            {actionType === "checkin" ? "Check-in" : "Check-out"} - Lokasi
          </h1>
          <p className="text-muted-foreground">Konfirmasi lokasi Anda</p>
        </div>
        <LocationPicker onConfirm={handleLocationConfirm} onCancel={handleCancel} />
      </div>
    );
  }

  // Render processing step
  if (step === "processing") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium">Memproses...</p>
                <p className="text-sm text-muted-foreground">
                  Menyimpan data presensi Anda
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Presensi</h1>
        <p className="text-muted-foreground">
          {dayNames[dayOfWeek]}, {today.toLocaleDateString("id-ID")}
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

      {/* Holiday Notice */}
      {isHoliday && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            Hari ini adalah hari libur nasional. Presensi tidak diperlukan.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Time & Schedule */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="py-6">
          <div className="flex flex-col items-center gap-2">
            <Clock className="h-6 w-6 opacity-80" />
            <p className="text-4xl font-bold tracking-tight">
              {formatTime(currentTime)}
            </p>
            <div className="flex items-center gap-2 text-sm opacity-80">
              <span>
                Jam Kerja: {schedule?.startTime || "08:00"} - {schedule?.endTime || "16:00"}
              </span>
              <span>|</span>
              <span>Min. {schedule?.minWorkHours || 8} jam</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Check-in Card */}
        <Card
          className={`${
            todayAttendance?.checkIn
              ? "border-success bg-success/5"
              : "border-dashed"
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Check-in
              </span>
              {todayAttendance?.checkIn && (
                <Badge className="bg-success text-success-foreground">Selesai</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayAttendance?.checkIn ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={todayAttendance.checkIn.photo || "/placeholder.svg"}
                      alt="Check-in"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {todayAttendance.checkIn.time}
                    </p>
                    <Badge
                      variant={
                        todayAttendance.status === "late"
                          ? "secondary"
                          : "outline"
                      }
                      className={
                        todayAttendance.status === "late"
                          ? "bg-warning text-warning-foreground"
                          : ""
                      }
                    >
                      {todayAttendance.status === "late"
                        ? "Terlambat"
                        : "Tepat Waktu"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">
                    {todayAttendance.checkIn.location.address}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  Anda belum check-in hari ini
                </p>
                <Button
                  onClick={() => startAction("checkin")}
                  disabled={!canCheckIn}
                  className="w-full gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Check-in Sekarang
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Check-out Card */}
        <Card
          className={`${
            todayAttendance?.checkOut
              ? "border-success bg-success/5"
              : "border-dashed"
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                Check-out
              </span>
              {todayAttendance?.checkOut && (
                <Badge className="bg-success text-success-foreground">Selesai</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayAttendance?.checkOut ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={todayAttendance.checkOut.photo || "/placeholder.svg"}
                      alt="Check-out"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {todayAttendance.checkOut.time}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total: {todayAttendance.workHours.toFixed(1)} jam
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">
                    {todayAttendance.checkOut.location.address}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-4 space-y-4">
                {todayAttendance?.checkIn ? (
                  <>
                    {/* Real-time worked hours display */}
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Jam kerja saat ini</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatWorkedHours(currentWorkedHours)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        dari minimal {schedule?.minWorkHours || 8} jam
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          canCheckoutByTime ? "bg-success" : "bg-warning"
                        }`}
                        style={{ 
                          width: `${Math.min(100, (currentWorkedHours / (schedule?.minWorkHours || 8)) * 100)}%` 
                        }}
                      />
                    </div>

                    {/* Warning or success message */}
                    {!canCheckoutByTime ? (
                      <Alert variant="destructive" className="text-left">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Check-out belum tersedia.</strong>
                          <br />
                          Anda perlu bekerja {getRemainingTime()} untuk memenuhi jam kerja minimal.
                          <br />
                          <span className="text-xs">
                            Estimasi check-out: <strong>{calculateMinCheckoutTime()}</strong>
                          </span>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert className="border-success bg-success/10 text-left">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <AlertDescription className="text-success">
                          <strong>Jam kerja minimal terpenuhi!</strong>
                          <br />
                          Anda dapat melakukan check-out sekarang.
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={() => startAction("checkout")}
                      disabled={!canCheckOut}
                      className="w-full gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      {canCheckOut ? "Check-out Sekarang" : "Check-out Tidak Tersedia"}
                    </Button>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center">
                    Silakan check-in terlebih dahulu
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Work Summary */}
      {todayAttendance?.checkIn && todayAttendance?.checkOut && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ringkasan Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-foreground">
                  {todayAttendance.checkIn.time}
                </p>
                <p className="text-xs text-muted-foreground">Masuk</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-foreground">
                  {todayAttendance.checkOut.time}
                </p>
                <p className="text-xs text-muted-foreground">Pulang</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <p className="text-2xl font-bold text-primary">
                  {todayAttendance.workHours.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">Jam Kerja</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
