import { PreorderManager } from "@/components/admin/preorder-manager";
import {
  getPreorderConfig,
  getPreorderItemsAdmin,
  getPreorderSignups,
} from "@/lib/admin-queries";

export default async function AdminPreorderPage() {
  const [config, items, signups] = await Promise.all([
    getPreorderConfig(),
    getPreorderItemsAdmin(),
    getPreorderSignups(),
  ]);
  return <PreorderManager config={config} items={items} signups={signups} />;
}
