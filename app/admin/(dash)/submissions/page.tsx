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
  const [rows, drops, emails] = await Promise.all([
    getSubmissions(drop),
    getDropsForFilter(),
    getEmailList(),
  ]);

  return (
    <SubmissionsView rows={rows} drops={drops} emails={emails} activeDropId={drop} />
  );
}
