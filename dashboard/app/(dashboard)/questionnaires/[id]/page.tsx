import { EvidenceDetailView } from "@/components/dashboard/evidence-view";

export default function EvidencePackPage({ params }: { params: { id: string } }) {
  return <EvidenceDetailView id={params.id} />;
}
