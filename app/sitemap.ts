import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/types";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/drop", "/flavors", "/merch", "/about"];
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "/drop" || path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/drop" ? 0.9 : 0.6,
  }));
}
