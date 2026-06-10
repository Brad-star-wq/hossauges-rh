import { MerchManager } from "@/components/admin/merch-manager";
import { getAllMerch } from "@/lib/admin-queries";

export default async function AdminMerchPage() {
  const items = await getAllMerch();
  return <MerchManager items={items} />;
}
