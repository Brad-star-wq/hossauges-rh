import { SubmissionsView } from "@/components/admin/submissions-view";
import {
  getSubmissions,
  getDropsForFilter,
  getEmailList,
} from "@/lib/admin-queries";

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ drop?: string }>;
}) {
  const { drop } = await searchParams;
  const [drops, emails] = await Promise.all([getDropsForFilter(), getEmailList()]);

  // The batch selector defaults to the current (active) batch. "all" is the
  // explicit sentinel for no batch filter; an absent param falls back to active.
  const activeDropId = drops.find((d) => d.status === "active")?.id;
  const selectedDropId = drop ?? activeDropId ?? "all";
  const filterId = selectedDropId === "all" ? undefined : selectedDropId;
  const rows = await getSubmissions(filterId);

  return (
    <SubmissionsView
      rows={rows}
      drops={drops}
      emails={emails}
      selectedDropId={selectedDropId}
    />
  );
}
