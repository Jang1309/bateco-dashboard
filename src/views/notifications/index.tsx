import { NotificationsPageClient } from "@/components/notifications/notifications-page-client"

export function NotificationsView() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <NotificationsPageClient />
    </div>
  )
}
