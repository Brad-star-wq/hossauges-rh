import { DropEditor } from "@/components/admin/drop-editor";
import { PublishFirstDrop } from "@/components/admin/publish-first-drop";
import { PageHeader } from "@/components/admin/ui";
import { getActiveDropAdmin, getFlavorPhotos } from "@/lib/admin-queries";

export default async function AdminDropPage() {
  const drop = await getActiveDropAdmin();

  if (!drop) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <PageHeader title="No active drop" />
          <p className="mt-2 text-sm text-smoke">
            Publish a fresh drop to get two flavor slots you can fill in.
          </p>
        </div>
        <PublishFirstDrop />
      </div>
    );
  }

  const photosByFlavor = await getFlavorPhotos(drop.flavors.map((f) => f.id));

  // Key by the drop id (NOT the flavor-id set). Add/remove flavors are handled
  // in local editor state, and photo uploads are server actions that refresh
  // this route — keying on the flavor set would remount mid-edit and wipe
  // unsaved field changes. We only want a fresh editor when the drop itself
  // changes (e.g. "Publish new batch" creates a new active drop).
  return (
    <DropEditor key={drop.id} drop={drop} photosByFlavor={photosByFlavor} />
  );
}
