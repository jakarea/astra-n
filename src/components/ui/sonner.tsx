"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          error: '!bg-red-600 !text-white !border-red-700',
          success: '!bg-green-600 !text-white !border-green-700',
          warning: '!bg-yellow-600 !text-white !border-yellow-700',
          info: '!bg-blue-600 !text-white !border-blue-700',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
