import { Suspense } from "react"
import { ComingSoonView } from "@/views/coming-soon"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ComingSoonView />
    </Suspense>
  )
}
