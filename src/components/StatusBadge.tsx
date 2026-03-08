interface StatusBadgeProps {
  status: string;
  type?: "lead" | "opportunity" | "quotation" | "customer" | "task";
}

const classMap: Record<string, string> = {
  new: "status-new",
  contacted: "status-contacted",
  qualified: "status-qualified",
  converted: "status-converted",
  lost: "status-lost",
  active: "status-active",
  inactive: "status-lost",
  blacklisted: "status-lost",
  prospecting: "stage-prospecting",
  proposal: "stage-proposal",
  negotiation: "stage-negotiation",
  won: "stage-won",
  draft: "status-draft",
  sent: "status-sent",
  accepted: "status-accepted",
  rejected: "status-rejected",
  expired: "status-expired",
  // Task statuses
  pending: "status-sent",
  in_progress: "status-contacted",
  completed: "status-converted",
  cancelled: "status-lost",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge ${classMap[status] || "status-draft"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
