import OldOAuthAuthorizePage from "@/app/_old-dashboard/oauth/authorize/page";
import { Page } from "@/components/dashboard/ui";

// The MCP connector's consent screen (the backend sends people here).
export default function OAuthAuthorizePage() {
  return (
    <Page>
      <OldOAuthAuthorizePage />
    </Page>
  );
}
