import {NextRequest, NextResponse} from "next/server";

type WikidataSearchItem = {
  id?: string;
  label?: string;
  description?: string;
};

type WikidataEntity = {
  claims?: {
    P856?: Array<{
      mainsnak?: {
        datavalue?: {
          value?: string;
        };
      };
    }>;
    P154?: Array<{
      mainsnak?: {
        datavalue?: {
          value?: string;
        };
      };
    }>;
  };
};

const commonsImageUrl = (fileName: string) => {
  if (!fileName) return "";

  return (
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/" +
    encodeURIComponent(fileName)
  );
};

export async function GET(request: NextRequest) {
  const query =
    request.nextUrl.searchParams.get("q")?.trim() || "";

  if (query.length < 2) {
    return NextResponse.json(
      {error: "Enter at least 2 characters."},
      {status: 400}
    );
  }

  try {
    const searchUrl =
      "https://www.wikidata.org/w/api.php" +
      `?action=wbsearchentities` +
      `&search=${encodeURIComponent(query)}` +
      `&language=en` +
      `&format=json` +
      `&origin=*` +
      `&limit=5`;

    const searchResponse = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "CampusConnect-Pro/1.0 company lookup",
      },
      cache: "no-store",
    });

    if (!searchResponse.ok) {
      throw new Error(
        `Company search failed (${searchResponse.status}).`
      );
    }

    const searchData =
      (await searchResponse.json()) as {
        search?: WikidataSearchItem[];
      };

    const candidates =
      searchData.search || [];

    for (const candidate of candidates) {
      if (!candidate.id) continue;

      const entityResponse = await fetch(
        `https://www.wikidata.org/wiki/Special:EntityData/${candidate.id}.json`,
        {
          headers: {
            "User-Agent":
              "CampusConnect-Pro/1.0 company lookup",
          },
          cache: "no-store",
        }
      );

      if (!entityResponse.ok) continue;

      const entityData =
        (await entityResponse.json()) as {
          entities?: Record<
            string,
            WikidataEntity
          >;
        };

      const entity =
        entityData.entities?.[
          candidate.id
        ];

      const website =
        entity?.claims?.P856?.[0]
          ?.mainsnak?.datavalue
          ?.value || "";

      const logoFile =
        entity?.claims?.P154?.[0]
          ?.mainsnak?.datavalue
          ?.value || "";

      if (!website) {
        continue;
      }

      return NextResponse.json({
        found: true,
        name:
          candidate.label ||
          query,
        description:
          candidate.description ||
          "",
        website,
        logo_url:
          logoFile
            ? commonsImageUrl(
                logoFile
              )
            : "",
        source:
          "Wikidata",
      });
    }

    return NextResponse.json({
      found: false,
      name: query,
      website: "",
      logo_url: "",
      description: "",
    });
  } catch (error) {
    console.error(
      "[company-lookup]",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to resolve company.",
      },
      {status: 500}
    );
  }
}
