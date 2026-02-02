"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MapPin,
  Navigation,
  Loader2,
  AlertCircle,
  Check,
  RefreshCw,
} from "lucide-react";

interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

interface LocationPickerProps {
  onConfirm: (location: Location) => void;
  onCancel: () => void;
}

export function LocationPicker({ onConfirm, onCancel }: LocationPickerProps) {
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [detectedAddress, setDetectedAddress] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getLocation = async () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Browser Anda tidak mendukung geolocation");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });

        // Try to get address from coordinates using reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                "Accept-Language": "id",
              },
            }
          );
          const data = await response.json();
          if (data.display_name) {
            setDetectedAddress(data.display_name);
          } else {
            setDetectedAddress(`Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`);
          }
        } catch {
          // If reverse geocoding fails, show coordinates
          setDetectedAddress(`Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`);
        }

        setIsLoading(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError(
              "Izin lokasi ditolak. Aktifkan akses lokasi di pengaturan browser Anda."
            );
            break;
          case err.POSITION_UNAVAILABLE:
            setError(
              "Informasi lokasi tidak tersedia. Pastikan GPS aktif."
            );
            break;
          case err.TIMEOUT:
            setError("Waktu permintaan lokasi habis. Coba lagi.");
            break;
          default:
            setError("Gagal mendapatkan lokasi. Silakan coba lagi.");
        }
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    getLocation();
  }, []);

  const handleConfirm = () => {
    if (location && detectedAddress) {
      // Combine detected address with location detail if provided
      const fullAddress = locationDetail.trim()
        ? `${detectedAddress} | Detail: ${locationDetail.trim()}`
        : detectedAddress;
      
      onConfirm({
        latitude: location.latitude,
        longitude: location.longitude,
        address: fullAddress,
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-medium">Mendapatkan Lokasi</p>
              <p className="text-sm text-muted-foreground">
                Mohon tunggu sebentar...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={onCancel}>
              Batal
            </Button>
            <Button onClick={getLocation} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Coba Lagi
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Konfirmasi Lokasi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coordinates Display */}
        <div className="p-3 rounded-lg bg-muted">
          <div className="flex items-center gap-2 mb-2">
            <Navigation className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Koordinat GPS</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Latitude:</span>
              <span className="ml-2 font-mono">
                {location?.latitude.toFixed(6)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Longitude:</span>
              <span className="ml-2 font-mono">
                {location?.longitude.toFixed(6)}
              </span>
            </div>
          </div>
        </div>

        {/* Detected Address - Read Only */}
        <div className="space-y-2">
          <Label>Lokasi Terdeteksi</Label>
          <div className="p-3 rounded-lg bg-muted border border-input">
            <p className="text-sm text-foreground">{detectedAddress}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Lokasi ini terdeteksi otomatis berdasarkan GPS dan tidak dapat diubah
          </p>
        </div>

        {/* Location Detail - Optional Additional Info */}
        <div className="space-y-2">
          <Label htmlFor="locationDetail">Detail Lokasi (Opsional)</Label>
          <Textarea
            id="locationDetail"
            placeholder="Contoh: Kantor cabang A, Site proyek B, Lantai 3 Gedung Utama, dll..."
            value={locationDetail}
            onChange={(e) => setLocationDetail(e.target.value)}
            rows={2}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Tambahkan keterangan lokasi untuk memudahkan identifikasi
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 bg-transparent" onClick={onCancel}>
            Batal
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={handleConfirm}
            disabled={!detectedAddress}
          >
            <Check className="h-4 w-4" />
            Konfirmasi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
