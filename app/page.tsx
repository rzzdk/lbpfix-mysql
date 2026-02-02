"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (user.role === "admin") {
          router.replace("/admin")
        } else {
          router.replace("/dashboard")
        }
      } else {
        router.replace("/login")
      }
    }
  }, [user, isLoading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          </div>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">PT Lestari Bumi Persada</h1>
          <p className="text-sm text-muted-foreground">Sistem Presensi Karyawan</p>
        </div>
      </div>
    </div>
  )
}
