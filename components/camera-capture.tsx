"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, RotateCcw, Check, X } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (photoData: string) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Stop existing stream if any
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsLoading(false);
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError(
        "Tidak dapat mengakses kamera. Pastikan Anda memberikan izin akses kamera."
      );
      setIsLoading(false);
    }
  }, [facingMode, stream]);

  useEffect(() => {
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Flip horizontally for front camera
        if (facingMode === "user") {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const photoData = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedPhoto(photoData);

        // Stop the camera stream
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      }
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  if (error) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <Camera className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-destructive mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={onCancel}>
              Batal
            </Button>
            <Button onClick={() => startCamera()}>Coba Lagi</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto overflow-hidden">
      <CardContent className="p-0">
        <div className="relative aspect-[4/3] bg-muted">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">
                Memuat kamera...
              </div>
            </div>
          )}

          {!capturedPhoto ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === "user" ? "scale-x-[-1]" : ""
                } ${isLoading ? "opacity-0" : "opacity-100"}`}
              />
              {/* Overlay guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-primary/50 rounded-full" />
              </div>
            </>
          ) : (
            <img
              src={capturedPhoto || "/placeholder.svg"}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-4 flex items-center justify-center gap-3">
          {!capturedPhoto ? (
            <>
              <Button variant="outline" size="icon" onClick={onCancel}>
                <X className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                className="rounded-full w-16 h-16"
                onClick={takePhoto}
                disabled={isLoading}
              >
                <Camera className="h-6 w-6" />
              </Button>
              <Button variant="outline" size="icon" onClick={toggleCamera}>
                <RotateCcw className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={retakePhoto}
                className="gap-2 bg-transparent"
              >
                <RotateCcw className="h-4 w-4" />
                Ulangi
              </Button>
              <Button size="lg" onClick={confirmPhoto} className="gap-2">
                <Check className="h-4 w-4" />
                Gunakan Foto
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
