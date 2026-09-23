import { Suspense } from "react";
import { TimelineView } from "@/components/dashboard/timeline-view";

export default function TimelinePage() {
  return (
    <Suspense>
      <TimelineView />
    </Suspense>
  );
}
