import { JoinView } from "@/components/dashboard/onboarding";

export default function JoinWorkspacePage({
  params,
  searchParams,
}: {
  params: { code: string };
  searchParams: { key?: string };
}) {
  return <JoinView code={params.code} inviteKey={searchParams.key ?? null} />;
}
