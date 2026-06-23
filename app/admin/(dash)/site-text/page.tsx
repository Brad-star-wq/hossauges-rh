import { SiteTextManager } from "@/components/admin/site-text-manager";
import { getContentMap } from "@/lib/admin-queries";
import { SITE_TEXT_KEYS, type SiteText } from "@/lib/site-text";

export default async function AdminSiteTextPage() {
  // Raw stored values — empty when unset, so blank fields show the default as
  // placeholder and "Save" with a blank field reverts that string to default.
  const map = await getContentMap();
  const values = {} as SiteText;
  for (const key of SITE_TEXT_KEYS) values[key] = map[key] ?? "";

  return <SiteTextManager values={values} />;
}
