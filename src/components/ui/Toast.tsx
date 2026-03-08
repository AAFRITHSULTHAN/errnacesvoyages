import { create } from 'zustand'
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
    id: string
    message: string
    type: ToastType
}

interface ToastStore {
    toasts: Toast[]
    addToast: (message: string, type: ToastType) => void
    removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],
    addToast: (message, type) => {
        const id = Math.random().toString(36).substring(2, 9)
        set((state) => ({
            toasts: [...state.toasts, { id, message, type }]
        }))
        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id)
            }))
        }, 6000)
    },
    removeToast: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id)
        }))
}))

export const toast = {
    success: (message: string) => useToastStore.getState().addToast(message, 'success'),
    error: (message: string) => useToastStore.getState().addToast(message, 'error'),
    info: (message: string) => useToastStore.getState().addToast(message, 'info'),
    warning: (message: string) => useToastStore.getState().addToast(message, 'warning'),
}

export function Toaster() {
    const { toasts, removeToast } = useToastStore()

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cn(
                        "flex items-center justify-between p-4 rounded-lg shadow-lg border animate-in slide-in-from-right-full duration-300",
                        t.type === 'success' && "bg-emerald-50 border-emerald-200 text-emerald-800",
                        t.type === 'error' && "bg-rose-50 border-rose-200 text-rose-800",
                        t.type === 'info' && "bg-blue-50 border-blue-200 text-blue-800",
                        t.type === 'warning' && "bg-amber-50 border-amber-200 text-amber-800"
                    )}
                >
                    <div className="flex items-center gap-3">
                        {t.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                        {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500" />}
                        {t.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                        {t.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-500" />}
                        <p className="text-sm font-medium">{t.message}</p>
                    </div>
                    <button
                        onClick={() => removeToast(t.id)}
                        className="p-1 rounded-full hover:bg-black/5 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    )
}
