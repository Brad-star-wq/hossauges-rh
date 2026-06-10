import { DropEditor } from "@/components/admin/drop-editor";
import { PublishFirstDrop } from "@/components/admin/publish-first-drop";
import { getActiveDropAdmin } from "@/lib/admin-queries";

export default async function AdminDropPage() {
  const drop = await getActiveDropAdmin();

  if (!drop) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-3xl font-extrabold uppercase leading-[0.95] text-navy">
            No active drop
          </h1>
          <p className="mt-2 text-sm text-smoke">
            Publish a fresh drop to get two flavor slots you can fill in.
          </p>
        </div>
        <PublishFirstDrop />
      </div>
    );
  }

  return <DropEditor drop={drop} />;
}
