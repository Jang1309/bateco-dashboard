import { Suspense } from "react";
import { SapRaMatView } from "@/views/sap-ra-mat";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SapRaMatView />
    </Suspense>
  );
}
