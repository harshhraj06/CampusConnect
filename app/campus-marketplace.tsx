"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  getSupabaseClient,
} from "../lib/supabase";

import {
  NetworkProfileModal,
} from "./network-profile-modal";

import type {
  ModuleProfile,
} from "./campus-modules";


type ListingStatus =
  | "Available"
  | "Reserved"
  | "Sold";

type ListingCondition =
  | "New"
  | "Like New"
  | "Good"
  | "Fair";

type MarketplaceListing = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: ListingCondition;
  pickup_location: string;
  negotiable: boolean;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
};

type MarketplaceImage = {
  id: string;
  listing_id: string;
  uploader_id: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  sort_order: number;
  created_at: string;
  signed_url?: string;
};

type Seller = {
  id: string;
  full_name: string;
  campus_uid: string;
  department: string;
  graduation_year: string;
  role: string;
  avatar_url?: string;
};

const categories = [
  "All",
  "Books",
  "Electronics",
  "Calculator",
  "Lab Equipment",
  "Cycle",
  "Furniture",
  "Hostel Essentials",
  "Sports",
  "Fashion",
  "Stationery",
  "Other",
] as const;

const conditions: ListingCondition[] = [
  "New",
  "Like New",
  "Good",
  "Fair",
];

const money = (
  value: number
) =>
  new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(value);

const formatDate = (
  value: string
) =>
  new Date(value).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );

export function CampusMarketplace({
  profile,
}: {
  profile: ModuleProfile;
}) {
  const [currentUserId, setCurrentUserId] =
    useState("");

  const [listings, setListings] =
    useState<MarketplaceListing[]>([]);

  const [images, setImages] =
    useState<MarketplaceImage[]>([]);

  const [sellers, setSellers] =
    useState<Seller[]>([]);

  const [favourites, setFavourites] =
    useState<string[]>([]);

  const [tab, setTab] =
    useState<
      "Browse" |
      "Sell" |
      "My Listings" |
      "Saved"
    >("Browse");

  const [query, setQuery] =
    useState("");

  const [category, setCategory] =
    useState("All");

  const [conditionFilter, setConditionFilter] =
    useState("All");

  const [selectedListingId, setSelectedListingId] =
    useState<string | null>(null);

  const [selectedSellerId, setSelectedSellerId] =
    useState<string | null>(null);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [files, setFiles] =
    useState<File[]>([]);

  const [status, setStatus] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [form, setForm] =
    useState({
      title: "",
      description: "",
      price: "",
      category: "Books",
      condition:
        "Good" as ListingCondition,
      pickup_location: "",
      negotiable: true,
    });


  const loadMarketplace =
    async () => {
      const client =
        getSupabaseClient();

      if (!client) return;

      setLoading(true);

      const {
        data: auth,
      } =
        await client.auth.getUser();

      if (!auth.user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(
        auth.user.id
      );

      const [
        listingsResult,
        directoryResult,
        favouritesResult,
      ] =
        await Promise.all([
          client
            .from(
              "marketplace_listings"
            )
            .select("*")
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),

          client.rpc(
            "list_campus_network_profiles"
          ),

          client
            .from(
              "marketplace_favourites"
            )
            .select(
              "listing_id"
            )
            .eq(
              "user_id",
              auth.user.id
            ),
        ]);

      if (
        listingsResult.error
      ) {
        setStatus(
          listingsResult.error.message
        );

        setLoading(false);
        return;
      }

      const loadedListings =
        (
          listingsResult.data ||
          []
        ) as MarketplaceListing[];

      setListings(
        loadedListings
      );

      setSellers(
        (
          directoryResult.data ||
          []
        ) as Seller[]
      );

      setFavourites(
        (
          favouritesResult.data ||
          []
        ).map(
          item =>
            item.listing_id
        )
      );

      if (
        loadedListings.length
      ) {
        const {
          data: imageRows,
          error,
        } =
          await client
            .from(
              "marketplace_listing_images"
            )
            .select("*")
            .in(
              "listing_id",
              loadedListings.map(
                item =>
                  item.id
              )
            )
            .order(
              "sort_order",
              {
                ascending: true,
              }
            );

        if (!error) {
          const hydrated =
            await Promise.all(
              (
                imageRows ||
                []
              ).map(
                async row => {
                  const {
                    data,
                  } =
                    await client.storage
                      .from(
                        "marketplace-media"
                      )
                      .createSignedUrl(
                        row.file_path,
                        3600
                      );

                  return {
                    ...row,
                    signed_url:
                      data?.signedUrl ||
                      "",
                  } as MarketplaceImage;
                }
              )
            );

          setImages(
            hydrated
          );
        }
      } else {
        setImages([]);
      }

      setLoading(false);
    };


  useEffect(() => {
    void loadMarketplace();
  }, []);


  const sellerById =
    useMemo(() => {
      const map =
        new Map<
          string,
          Seller
        >();

      sellers.forEach(
        seller => {
          map.set(
            seller.id,
            seller
          );
        }
      );

      if (currentUserId) {
        map.set(
          currentUserId,
          {
            id:
              currentUserId,

            full_name:
              profile.name,

            campus_uid:
              profile.campus_uid ||
              "",

            department:
              profile.department,

            graduation_year:
              profile.year,

            role:
              profile.role,

            avatar_url:
              profile.avatar_url,
          }
        );
      }

      return map;
    }, [
      sellers,
      currentUserId,
      profile,
    ]);


  const filtered =
    useMemo(
      () =>
        listings.filter(
          listing => {
            if (
              tab ===
                "My Listings" &&
              listing.seller_id !==
                currentUserId
            ) {
              return false;
            }

            if (
              tab ===
                "Saved" &&
              !favourites.includes(
                listing.id
              )
            ) {
              return false;
            }

            if (
              tab ===
                "Browse" &&
              listing.status ===
                "Sold"
            ) {
              return false;
            }

            if (
              category !==
                "All" &&
              listing.category !==
                category
            ) {
              return false;
            }

            if (
              conditionFilter !==
                "All" &&
              listing.condition !==
                conditionFilter
            ) {
              return false;
            }

            const term =
              query
                .trim()
                .toLowerCase();

            if (!term) {
              return true;
            }

            return [
              listing.title,
              listing.description,
              listing.category,
              listing.condition,
              listing.pickup_location,
            ]
              .join(" ")
              .toLowerCase()
              .includes(term);
          }
        ),
      [
        listings,
        tab,
        category,
        conditionFilter,
        query,
        favourites,
        currentUserId,
      ]
    );


  const listingImages = (
    listingId: string
  ) =>
    images.filter(
      image =>
        image.listing_id ===
        listingId
    );


  const resetForm = () => {
    setEditingId(null);

    setFiles([]);

    setForm({
      title: "",
      description: "",
      price: "",
      category: "Books",
      condition: "Good",
      pickup_location: "",
      negotiable: true,
    });
  };


  const publishListing =
    async (
      event: FormEvent
    ) => {
      event.preventDefault();

      const client =
        getSupabaseClient();

      if (
        !client ||
        !currentUserId
      ) {
        return;
      }

      const numericPrice =
        Number(
          form.price
        );

      if (
        !Number.isFinite(
          numericPrice
        ) ||
        numericPrice < 0
      ) {
        return setStatus(
          "Enter a valid price."
        );
      }

      if (
        !editingId &&
        files.length === 0
      ) {
        return setStatus(
          "Upload at least one real photo of the item."
        );
      }

      if (
        files.length > 8
      ) {
        return setStatus(
          "You can upload up to 8 photos."
        );
      }

      const oversized =
        files.find(
          file =>
            file.size >
            10 * 1024 * 1024
        );

      if (oversized) {
        return setStatus(
          `${oversized.name} is larger than 10 MB.`
        );
      }

      setSaving(true);
      setStatus("");

      try {
        let listing:
          MarketplaceListing;

        if (editingId) {
          const {
            data,
            error,
          } =
            await client
              .from(
                "marketplace_listings"
              )
              .update({
                title:
                  form.title.trim(),

                description:
                  form.description.trim(),

                price:
                  numericPrice,

                category:
                  form.category,

                condition:
                  form.condition,

                pickup_location:
                  form.pickup_location.trim(),

                negotiable:
                  form.negotiable,

                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                "id",
                editingId
              )
              .eq(
                "seller_id",
                currentUserId
              )
              .select()
              .single();

          if (error) {
            throw error;
          }

          listing =
            data as MarketplaceListing;
        } else {
          const {
            data,
            error,
          } =
            await client
              .from(
                "marketplace_listings"
              )
              .insert({
                seller_id:
                  currentUserId,

                title:
                  form.title.trim(),

                description:
                  form.description.trim(),

                price:
                  numericPrice,

                category:
                  form.category,

                condition:
                  form.condition,

                pickup_location:
                  form.pickup_location.trim(),

                negotiable:
                  form.negotiable,
              })
              .select()
              .single();

          if (error) {
            throw error;
          }

          listing =
            data as MarketplaceListing;
        }

        const uploaded:
          MarketplaceImage[] =
          [];

        for (
          let index = 0;
          index <
          files.length;
          index += 1
        ) {
          const file =
            files[index];

          const safe =
            file.name.replace(
              /[^a-zA-Z0-9._-]/g,
              "-"
            );

          const path =
            `${currentUserId}/${listing.id}/${crypto.randomUUID()}-${safe}`;

          const {
            error:
              uploadError,
          } =
            await client.storage
              .from(
                "marketplace-media"
              )
              .upload(
                path,
                file,
                {
                  upsert: false,
                  contentType:
                    file.type,
                }
              );

          if (
            uploadError
          ) {
            throw uploadError;
          }

          const {
            data: row,
            error:
              rowError,
          } =
            await client
              .from(
                "marketplace_listing_images"
              )
              .insert({
                listing_id:
                  listing.id,

                uploader_id:
                  currentUserId,

                file_name:
                  file.name,

                file_path:
                  path,

                mime_type:
                  file.type,

                file_size:
                  file.size,

                sort_order:
                  index,
              })
              .select()
              .single();

          if (rowError) {
            await client.storage
              .from(
                "marketplace-media"
              )
              .remove([
                path,
              ]);

            throw rowError;
          }

          const {
            data: signed,
          } =
            await client.storage
              .from(
                "marketplace-media"
              )
              .createSignedUrl(
                path,
                3600
              );

          uploaded.push({
            ...row,
            signed_url:
              signed?.signedUrl ||
              "",
          } as MarketplaceImage);
        }

        setListings(
          current =>
            editingId
              ? current.map(
                  item =>
                    item.id ===
                      listing.id
                      ? listing
                      : item
                )
              : [
                  listing,
                  ...current,
                ]
        );

        setImages(
          current => [
            ...current,
            ...uploaded,
          ]
        );

        const wasEditing =
          Boolean(
            editingId
          );

        resetForm();

        setTab(
          "My Listings"
        );

        setStatus(
          wasEditing
            ? "Listing updated."
            : "Item listed successfully."
        );
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to save listing."
        );
      } finally {
        setSaving(false);
      }
    };


  const editListing = (
    listing: MarketplaceListing
  ) => {
    if (
      listing.seller_id !==
      currentUserId
    ) {
      return;
    }

    setEditingId(
      listing.id
    );

    setForm({
      title:
        listing.title,

      description:
        listing.description,

      price:
        String(
          listing.price
        ),

      category:
        listing.category,

      condition:
        listing.condition,

      pickup_location:
        listing.pickup_location,

      negotiable:
        listing.negotiable,
    });

    setFiles([]);
    setTab("Sell");
  };


  const updateStatus =
    async (
      listing:
        MarketplaceListing,

      next:
        ListingStatus
    ) => {
      const client =
        getSupabaseClient();

      if (
        !client ||
        listing.seller_id !==
          currentUserId
      ) {
        return;
      }

      const {
        data,
        error,
      } =
        await client
          .from(
            "marketplace_listings"
          )
          .update({
            status: next,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            listing.id
          )
          .eq(
            "seller_id",
            currentUserId
          )
          .select()
          .single();

      if (error) {
        return setStatus(
          error.message
        );
      }

      setListings(
        current =>
          current.map(
            item =>
              item.id ===
                listing.id
                ? data as MarketplaceListing
                : item
          )
      );

      setStatus(
        `Listing marked ${next.toLowerCase()}.`
      );
    };


  const deleteListing =
    async (
      listing:
        MarketplaceListing
    ) => {
      if (
        listing.seller_id !==
        currentUserId
      ) {
        return;
      }

      if (
        !window.confirm(
          `Delete "${listing.title}" permanently?`
        )
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) return;

      const related =
        listingImages(
          listing.id
        );

      const {
        error,
      } =
        await client
          .from(
            "marketplace_listings"
          )
          .delete()
          .eq(
            "id",
            listing.id
          )
          .eq(
            "seller_id",
            currentUserId
          );

      if (error) {
        return setStatus(
          error.message
        );
      }

      if (
        related.length
      ) {
        await client.storage
          .from(
            "marketplace-media"
          )
          .remove(
            related.map(
              item =>
                item.file_path
            )
          );
      }

      setListings(
        current =>
          current.filter(
            item =>
              item.id !==
              listing.id
          )
      );

      setImages(
        current =>
          current.filter(
            item =>
              item.listing_id !==
              listing.id
          )
      );

      setStatus(
        "Listing deleted."
      );
    };


  const toggleFavourite =
    async (
      listingId: string
    ) => {
      const client =
        getSupabaseClient();

      if (
        !client ||
        !currentUserId
      ) {
        return;
      }

      const saved =
        favourites.includes(
          listingId
        );

      if (saved) {
        const {error} =
          await client
            .from(
              "marketplace_favourites"
            )
            .delete()
            .eq(
              "listing_id",
              listingId
            )
            .eq(
              "user_id",
              currentUserId
            );

        if (!error) {
          setFavourites(
            current =>
              current.filter(
                id =>
                  id !==
                  listingId
              )
          );
        }
      } else {
        const {error} =
          await client
            .from(
              "marketplace_favourites"
            )
            .insert({
              listing_id:
                listingId,

              user_id:
                currentUserId,
            });

        if (!error) {
          setFavourites(
            current => [
              ...current,
              listingId,
            ]
          );
        }
      }
    };


  const reportListing =
    async (
      listing:
        MarketplaceListing
    ) => {
      const reason =
        window.prompt(
          "Why are you reporting this listing?"
        );

      if (
        !reason?.trim() ||
        !currentUserId
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) return;

      const {error} =
        await client
          .from(
            "marketplace_reports"
          )
          .insert({
            listing_id:
              listing.id,

            reporter_id:
              currentUserId,

            reason:
              reason.trim(),
          });

      setStatus(
        error
          ? error.message
          : "Listing reported to CampusConnect."
      );
    };


  const messageSeller = (
    sellerId: string
  ) => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    sessionStorage.setItem(
      "campusconnect-open-direct-chat",
      sellerId
    );

    window.dispatchEvent(
      new CustomEvent(
        "campus-navigate",
        {
          detail:
            "Groups",
        }
      )
    );
  };


  const selectedListing =
    listings.find(
      item =>
        item.id ===
        selectedListingId
    ) || null;


  return (
    <div className="campusMarketplace">

      <section className="marketplaceHero">

        <div>
          <span>
            CAMPUS MARKETPLACE
          </span>

          <h2>
            Buy smarter. Sell within your campus.
          </h2>

          <p>
            A verified marketplace for second-hand books, electronics, hostel essentials and student gear.
          </p>
        </div>

        <button
          className="primary"
          type="button"
          onClick={() => {
            resetForm();
            setTab(
              "Sell"
            );
          }}
        >
          + Sell an item
        </button>

      </section>


      <nav className="marketplaceTabs">

        {[
          "Browse",
          "Sell",
          "My Listings",
          "Saved",
        ].map(
          item => (
            <button
              key={
                item
              }
              type="button"
              className={
                tab === item
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTab(
                  item as typeof tab
                )
              }
            >
              {item}
            </button>
          )
        )}

      </nav>


      {status && (
        <div className="marketplaceStatus">
          {status}
        </div>
      )}


      {tab === "Sell" ? (

        <form
          className="marketplaceSellForm"
          onSubmit={
            publishListing
          }
        >

          <header>
            <span>
              {editingId
                ? "EDIT LISTING"
                : "SELL ON CAMPUS"}
            </span>

            <h3>
              {editingId
                ? "Update your listing"
                : "What are you selling?"}
            </h3>

            <p>
              Add accurate details and real photos so buyers know exactly what they are getting.
            </p>
          </header>


          <label>
            <span>
              Item title
            </span>

            <input
              required
              minLength={3}
              maxLength={120}
              value={
                form.title
              }
              onChange={
                event =>
                  setForm({
                    ...form,
                    title:
                      event.target.value,
                  })
              }
              placeholder="Casio scientific calculator FX-991ES Plus"
            />
          </label>


          <div className="marketplaceFormGrid">

            <label>
              <span>
                Price
              </span>

              <input
                required
                type="number"
                min="0"
                step="1"
                value={
                  form.price
                }
                onChange={
                  event =>
                    setForm({
                      ...form,
                      price:
                        event.target.value,
                    })
                }
                placeholder="1200"
              />
            </label>


            <label>
              <span>
                Category
              </span>

              <select
                value={
                  form.category
                }
                onChange={
                  event =>
                    setForm({
                      ...form,
                      category:
                        event.target.value,
                    })
                }
              >
                {categories
                  .filter(
                    item =>
                      item !==
                      "All"
                  )
                  .map(
                    item => (
                      <option
                        key={
                          item
                        }
                      >
                        {item}
                      </option>
                    )
                  )}
              </select>
            </label>


            <label>
              <span>
                Condition
              </span>

              <select
                value={
                  form.condition
                }
                onChange={
                  event =>
                    setForm({
                      ...form,
                      condition:
                        event.target
                          .value as ListingCondition,
                    })
                }
              >
                {conditions.map(
                  item => (
                    <option
                      key={
                        item
                      }
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </label>


            <label>
              <span>
                Pickup location
              </span>

              <input
                value={
                  form.pickup_location
                }
                onChange={
                  event =>
                    setForm({
                      ...form,
                      pickup_location:
                        event.target.value,
                    })
                }
                placeholder="ECE Block / Main Gate / Hostel"
              />
            </label>

          </div>


          <label>
            <span>
              Description
            </span>

            <textarea
              required
              minLength={10}
              maxLength={4000}
              value={
                form.description
              }
              onChange={
                event =>
                  setForm({
                    ...form,
                    description:
                      event.target.value,
                  })
              }
              placeholder="Describe age, condition, accessories, defects and reason for selling..."
            />
          </label>


          <label className="marketplaceNegotiable">
            <input
              type="checkbox"
              checked={
                form.negotiable
              }
              onChange={
                event =>
                  setForm({
                    ...form,
                    negotiable:
                      event.target.checked,
                  })
              }
            />

            <span>
              <b>
                Price is negotiable
              </b>

              <small>
                Buyers can discuss the final price with you.
              </small>
            </span>
          </label>


          <label className="marketplacePhotoUpload">

            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={
                event => {
                  const selected =
                    Array.from(
                      event.target.files ||
                      []
                    );

                  setFiles(
                    current =>
                      [
                        ...current,
                        ...selected,
                      ].slice(
                        0,
                        8
                      )
                  );

                  event.currentTarget.value =
                    "";
                }
              }
            />

            <span>
              <b>
                Add item photos
              </b>

              <small>
                JPG, PNG or WebP · Up to 8 photos · 10 MB each
              </small>
            </span>

          </label>


          {files.length >
            0 && (
            <div className="marketplaceSelectedPhotos">

              {files.map(
                (
                  file,
                  index
                ) => (
                  <div
                    key={`${file.name}-${index}`}
                  >
                    <img
                      src={
                        URL.createObjectURL(
                          file
                        )
                      }
                      alt=""
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setFiles(
                          current =>
                            current.filter(
                              (
                                _,
                                fileIndex
                              ) =>
                                fileIndex !==
                                index
                            )
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                )
              )}

            </div>
          )}


          <footer>

            {editingId && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setTab(
                    "My Listings"
                  );
                }}
              >
                Cancel
              </button>
            )}

            <button
              className="primary"
              disabled={
                saving
              }
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Save changes"
                : "Publish listing"}
            </button>

          </footer>

        </form>

      ) : (

        <>

          <section className="marketplaceSearch">

            <input
              value={
                query
              }
              onChange={
                event =>
                  setQuery(
                    event.target.value
                  )
              }
              placeholder="Search books, electronics, calculator, cycle..."
            />

            <select
              value={
                category
              }
              onChange={
                event =>
                  setCategory(
                    event.target.value
                  )
              }
            >
              {categories.map(
                item => (
                  <option
                    key={
                      item
                    }
                  >
                    {item}
                  </option>
                )
              )}
            </select>

            <select
              value={
                conditionFilter
              }
              onChange={
                event =>
                  setConditionFilter(
                    event.target.value
                  )
              }
            >
              <option>
                All
              </option>

              {conditions.map(
                item => (
                  <option
                    key={
                      item
                    }
                  >
                    {item}
                  </option>
                )
              )}
            </select>

          </section>


          {loading ? (
            <div className="marketplaceEmpty">
              Loading marketplace...
            </div>
          ) : filtered.length ? (

            <section className="marketplaceGrid">

              {filtered.map(
                listing => {

                  const photos =
                    listingImages(
                      listing.id
                    );

                  const seller =
                    sellerById.get(
                      listing.seller_id
                    );

                  const saved =
                    favourites.includes(
                      listing.id
                    );

                  return (
                    <article
                      key={
                        listing.id
                      }
                      className="marketplaceCard"
                    >

                      <button
                        type="button"
                        className="marketplaceCardPhoto"
                        onClick={() =>
                          setSelectedListingId(
                            listing.id
                          )
                        }
                      >

                        {photos[0]
                          ?.signed_url ? (
                          <img
                            src={
                              photos[0]
                                .signed_url
                            }
                            alt={
                              listing.title
                            }
                          />
                        ) : (
                          <span>
                            No photo
                          </span>
                        )}

                        <b
                          className={`marketplaceStatusBadge ${listing.status.toLowerCase()}`}
                        >
                          {
                            listing.status
                          }
                        </b>

                      </button>


                      <div className="marketplaceCardBody">

                        <div className="marketplacePriceRow">

                          <strong>
                            {money(
                              Number(
                                listing.price
                              )
                            )}
                          </strong>

                          <button
                            type="button"
                            className={
                              saved
                                ? "saved"
                                : ""
                            }
                            onClick={() =>
                              void toggleFavourite(
                                listing.id
                              )
                            }
                            aria-label="Save listing"
                          >
                            {saved
                              ? "♥"
                              : "♡"}
                          </button>

                        </div>


                        <button
                          type="button"
                          className="marketplaceTitleButton"
                          onClick={() =>
                            setSelectedListingId(
                              listing.id
                            )
                          }
                        >
                          {
                            listing.title
                          }
                        </button>


                        <div className="marketplaceChips">

                          <span>
                            {
                              listing.condition
                            }
                          </span>

                          <span>
                            {
                              listing.category
                            }
                          </span>

                          {listing.negotiable && (
                            <span>
                              Negotiable
                            </span>
                          )}

                        </div>


                        <small>
                          {listing.pickup_location ||
                            "Campus pickup"}
                          {" · "}
                          {formatDate(
                            listing.created_at
                          )}
                        </small>


                        {seller && (
                          <button
                            type="button"
                            className="marketplaceSellerMini"
                            onClick={() =>
                              setSelectedSellerId(
                                seller.id
                              )
                            }
                          >
                            <b>
                              {
                                seller.full_name
                              }
                            </b>

                            <span>
                              {seller.campus_uid ||
                                seller.department}
                            </span>
                          </button>
                        )}


                        {listing.seller_id ===
                          currentUserId &&
                          tab ===
                            "My Listings" && (
                          <div className="marketplaceOwnerActions">

                            <button
                              type="button"
                              onClick={() =>
                                editListing(
                                  listing
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void updateStatus(
                                  listing,
                                  "Reserved"
                                )
                              }
                            >
                              Reserve
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void updateStatus(
                                  listing,
                                  "Sold"
                                )
                              }
                            >
                              Sold
                            </button>

                            <button
                              type="button"
                              className="danger"
                              onClick={() =>
                                void deleteListing(
                                  listing
                                )
                              }
                            >
                              Delete
                            </button>

                          </div>
                        )}

                      </div>

                    </article>
                  );
                }
              )}

            </section>

          ) : (
            <div className="marketplaceEmpty">

              <b>
                No listings found
              </b>

              <span>
                Try another search or be the first person to sell something.
              </span>

            </div>
          )}

        </>

      )}


      {selectedListing && (
        <div
          className="marketplaceModalScrim"
          onClick={() =>
            setSelectedListingId(
              null
            )
          }
        >

          <section
            className="marketplaceDetailsModal"
            onClick={
              event =>
                event.stopPropagation()
            }
          >

            <button
              type="button"
              className="marketplaceModalClose"
              onClick={() =>
                setSelectedListingId(
                  null
                )
              }
            >
              ×
            </button>


            <div className="marketplaceGallery">

              {listingImages(
                selectedListing.id
              ).map(
                image => (
                  <img
                    key={
                      image.id
                    }
                    src={
                      image.signed_url
                    }
                    alt={
                      selectedListing.title
                    }
                  />
                )
              )}

            </div>


            <div className="marketplaceDetailsBody">

              <span>
                {
                  selectedListing.category
                }
              </span>

              <h2>
                {
                  selectedListing.title
                }
              </h2>

              <strong>
                {money(
                  Number(
                    selectedListing.price
                  )
                )}
              </strong>


              <div className="marketplaceChips">
                <span>
                  {
                    selectedListing.condition
                  }
                </span>

                <span>
                  {
                    selectedListing.status
                  }
                </span>

                {selectedListing.negotiable && (
                  <span>
                    Negotiable
                  </span>
                )}
              </div>


              <p>
                {
                  selectedListing.description
                }
              </p>


              <div className="marketplacePickup">
                <small>
                  PICKUP
                </small>

                <b>
                  {selectedListing.pickup_location ||
                    "Campus pickup"}
                </b>
              </div>


              {sellerById.get(
                selectedListing.seller_id
              ) && (
                <div className="marketplaceSellerBox">

                  <span>
                    VERIFIED CAMPUSCONNECT SELLER
                  </span>

                  <b>
                    {
                      sellerById.get(
                        selectedListing.seller_id
                      )?.full_name
                    }
                  </b>

                  <small>
                    {
                      sellerById.get(
                        selectedListing.seller_id
                      )?.campus_uid
                    }
                    {" · "}
                    {
                      sellerById.get(
                        selectedListing.seller_id
                      )?.department
                    }
                  </small>


                  <div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSellerId(
                          selectedListing.seller_id
                        )
                      }
                    >
                      View profile
                    </button>

                    {selectedListing.seller_id !==
                      currentUserId && (
                      <button
                        type="button"
                        className="primary"
                        onClick={() =>
                          messageSeller(
                            selectedListing.seller_id
                          )
                        }
                      >
                        Message seller
                      </button>
                    )}

                  </div>

                </div>
              )}


              {selectedListing.seller_id !==
                currentUserId && (
                <button
                  type="button"
                  className="marketplaceReport"
                  onClick={() =>
                    void reportListing(
                      selectedListing
                    )
                  }
                >
                  Report listing
                </button>
              )}

            </div>

          </section>

        </div>
      )}


      {selectedSellerId && (
        <NetworkProfileModal
          userId={
            selectedSellerId
          }
          onClose={() =>
            setSelectedSellerId(
              null
            )
          }
        />
      )}

    </div>
  );
}

export default CampusMarketplace;
