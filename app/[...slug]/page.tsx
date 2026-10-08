import {
  notFound,
} from "next/navigation";

import {
  isWorkspaceSlug,
} from "@/lib/workspace-route-slugs";

import CampusConnectPage from "../page";

type CatchAllPageProps = {
  params:
    Promise<{
      slug: string[];
    }>;
};

export default async function CatchAllPage({
  params,
}: CatchAllPageProps) {
  const {
    slug,
  } = await params;

  if (
    slug.length !== 1 ||
    !isWorkspaceSlug(
      slug[0]
    )
  ) {
    notFound();
  }

  return (
    <CampusConnectPage />
  );
}
