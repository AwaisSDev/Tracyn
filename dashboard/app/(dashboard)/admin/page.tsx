import OldAdminPage from "@/app/_old-dashboard/admin/page";
import { Page } from "@/components/dashboard/ui";

// Founder-only analytics. Not in the sidebar; the old page's content inside
// the new shell.
export default function AdminPage() {
  return (
    <Page>
      <OldAdminPage />
    </Page>
  );
}
