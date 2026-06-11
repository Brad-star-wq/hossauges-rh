import { GalleryManager } from "@/components/admin/gallery-manager";
import { getContentMap, getGalleryAll } from "@/lib/admin-queries";
import { DEFAULT_ABOUT_PARAGRAPH } from "@/lib/types";

export default async function AdminGalleryPage() {
  const [map, items] = await Promise.all([getContentMap(), getGalleryAll()]);
  const content = {
    home_hero_url: map.home_hero_url ?? "",
    about_hero_url: map.about_hero_url ?? "",
    about_paragraph: map.about_paragraph ?? DEFAULT_ABOUT_PARAGRAPH,
  };
  return <GalleryManager content={content} items={items} />;
}
