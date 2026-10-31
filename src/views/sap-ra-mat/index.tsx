"use client"

import { useSearchParams } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ConstructionIcon } from "lucide-react"

const LABELS: Record<string, string> = {
  "chi-tieu": "Chỉ tiêu công ty",
  "thuc-te-ky-vong": "Thực tế vs Kỳ vọng",
  "xep-hang": "Xếp hạng chi nhánh",
  "giam-doc": "Giám đốc vùng",
  "doi-ban": "Đội bán hàng",
  "phan-bo": "Phân bổ chỉ tiêu",
  yoy: "Phân tích YoY",
  "kiem-toan": "Kiểm toán ngân sách",
  "thong-bao": "Thông báo",
  "cai-dat": "Cài đặt",
  "ho-tro": "Hỗ trợ",
}

export function SapRaMatView() {
  const params = useSearchParams()
  const from = params.get("from") ?? ""
  const title = LABELS[from] ?? "Tính năng"

  return (
    <div className="flex flex-1 flex-col gap-4 p-6 xsm:p-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <div>
          <p className="text-xs text-muted-foreground">Sắp ra mắt</p>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center rounded-xl border bg-card px-6 py-20 text-center">
        <ConstructionIcon className="mb-4 size-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Màn hình này chưa có trong thiết kế Figma hiện tại. Sẽ bổ sung ở
          giai đoạn sau.
        </p>
      </div>
    </div>
  )
}
