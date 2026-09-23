import { Suspense } from "react";
import { ApprovalsView } from "@/components/dashboard/approvals-view";

export default function ApprovalsPage() {
  return (
    <Suspense>
      <ApprovalsView />
    </Suspense>
  );
}
