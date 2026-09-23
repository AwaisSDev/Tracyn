import { redirect } from "next/navigation";

// Approval emails link to /approvals/<id>; the inbox opens it by query.
export default function ApprovalLinkPage({ params }: { params: { id: string } }) {
  redirect(`/approvals?id=${encodeURIComponent(params.id)}`);
}
