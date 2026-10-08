"use client";

import { InteractiveFooterGrid } from "./interactive-footer-grid";

import {
  PencilIcon,
  XIcon,
  SaveIcon,
  ExternalLinkIcon,
  SmartphoneIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  Globe2Icon,
  ChevronDownIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getSupabaseClient,
} from "@/lib/supabase";

import "./footer-2.css";


type FooterLink = {
  label: string;
  kind: "internal" | "external";
  target: string;
};


type FooterColumn = {
  title: string;
  links: FooterLink[];
};


type SocialLinks = {
  facebook: string;
  instagram: string;
  linkedin: string;
  twitter: string;
};


type StoreLinks = {
  appStore: string;
  playStore: string;
};


type FooterFaq = {
  question: string;
  answer: string;
};

type FooterSettings = {
  id: string;
  tagline: string;
  copyright_text: string;
  columns: FooterColumn[];
  social_links: SocialLinks;
  store_links: StoreLinks;
  support_email: string;
  support_phone: string;
  support_location: string;
  support_hours: string;
  support_url: string;
  faqs: FooterFaq[];
};


type CampusConnectFooterProps = {
  role: string;
  go: (view: any) => void;
};


const DEFAULT_SETTINGS: FooterSettings = {
  id: "main",

  tagline:
    "One connected campus for learning, community and opportunity.",

  copyright_text:
    "CampusConnect. All rights reserved.",

  columns: [
    {
      title: "Company",
      links: [
        {
          label: "About CampusConnect",
          kind: "internal",
          target: "About CampusConnect",
        },
        {
          label: "Campus Life",
          kind: "internal",
          target: "Campus",
        },
        {
          label: "Profile",
          kind: "internal",
          target: "Profile",
        },
      ],
    },

    {
      title: "Community",
      links: [
        {
          label: "Campus Network",
          kind: "internal",
          target: "Network",
        },
        {
          label: "Campus Calendar",
          kind: "internal",
          target: "Calendar",
        },
        {
          label: "Learning",
          kind: "internal",
          target: "Learning",
        },
      ],
    },

    {
      title: "Support",
      links: [
        {
          label: "Seva Kendra",
          kind: "internal",
          target: "Seva Kendra",
        },
        {
          label: "Faculty Directory",
          kind: "internal",
          target: "Faculty Directory",
        },
        {
          label: "Activity Center",
          kind: "internal",
          target: "Activity Center",
        },
      ],
    },

    {
      title: "Resources",
      links: [
        {
          label: "Placements",
          kind: "internal",
          target: "Placements",
        },
        {
          label: "Assignments",
          kind: "internal",
          target: "Assignments",
        },
        {
          label: "Attendance",
          kind: "internal",
          target: "Attendance",
        },
      ],
    },
  ],

  social_links: {
    facebook: "",
    instagram: "",
    linkedin: "",
    twitter: "",
  },

  store_links: {
    appStore: "",
    playStore: "",
  },

  support_email: "",
  support_phone: "",
  support_location: "",
  support_hours: "",
  support_url: "",

  faqs: [
    {
      question:
        "How do I get help with my CampusConnect account?",
      answer:
        "Use Seva Kendra or the official support contact details shown in the CampusConnect footer.",
    },
    {
      question:
        "Who can edit CampusConnect footer information?",
      answer:
        "Only the Main Admin can edit footer content, support contact details, social links and FAQs.",
    },
    {
      question:
        "Where can I find academic information?",
      answer:
        "Use the Academics, Attendance, Assignments, Learning and Campus Calendar sections available for your role.",
    },
    {
      question:
        "How do I report an issue?",
      answer:
        "Open Seva Kendra and submit a support request with the relevant details and any supporting document.",
    },
  ],
};


function validExternalUrl(
  value: string
) {
  const clean =
    value.trim();

  if (!clean) {
    return true;
  }

  try {
    const parsed =
      new URL(clean);

    return (
      parsed.protocol ===
        "https:" ||
      parsed.protocol ===
        "http:"
    );
  } catch {
    return false;
  }
}


function normalizeSettings(
  value: any
): FooterSettings {
  return {
    id:
      typeof value?.id ===
      "string"
        ? value.id
        : "main",

    tagline:
      typeof value?.tagline ===
        "string" &&
      value.tagline.trim()
        ? value.tagline
        : DEFAULT_SETTINGS.tagline,

    copyright_text:
      typeof value?.copyright_text ===
        "string" &&
      value.copyright_text.trim()
        ? value.copyright_text
        : DEFAULT_SETTINGS
            .copyright_text,

    columns:
      Array.isArray(
        value?.columns
      ) &&
      value.columns.length
        ? value.columns
        : DEFAULT_SETTINGS.columns,

    social_links: {
      ...DEFAULT_SETTINGS
        .social_links,

      ...(value?.social_links &&
      typeof value.social_links ===
        "object"
        ? value.social_links
        : {}),
    },

    store_links: {
      ...DEFAULT_SETTINGS
        .store_links,

      ...(value?.store_links &&
      typeof value.store_links ===
        "object"
        ? value.store_links
        : {}),
    },

    support_email:
      typeof value?.support_email === "string"
        ? value.support_email
        : "",

    support_phone:
      typeof value?.support_phone === "string"
        ? value.support_phone
        : "",

    support_location:
      typeof value?.support_location === "string"
        ? value.support_location
        : "",

    support_hours:
      typeof value?.support_hours === "string"
        ? value.support_hours
        : "",

    support_url:
      typeof value?.support_url === "string"
        ? value.support_url
        : "",

    faqs:
      Array.isArray(value?.faqs)
        ? value.faqs.filter(
            (item: any) =>
              item &&
              typeof item.question === "string" &&
              typeof item.answer === "string"
          )
        : DEFAULT_SETTINGS.faqs,
  };
}


export function CampusConnectFooter({
  role,
  go,
}: CampusConnectFooterProps) {
  const [
    settings,
    setSettings,
  ] =
    useState<FooterSettings>(
      DEFAULT_SETTINGS
    );

  const [
    draft,
    setDraft,
  ] =
    useState<FooterSettings>(
      DEFAULT_SETTINGS
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    editing,
    setEditing,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const canEdit =
    role === "Main Admin";


  const loadSettings =
    useCallback(
      async () => {
        const client =
          getSupabaseClient();

        if (!client) {
          setLoading(false);
          return;
        }

        try {
          const {
            data,
            error,
          } =
            await client
              .from(
                "site_footer_settings"
              )
              .select(
                "id,tagline,copyright_text,columns,social_links,store_links,support_email,support_phone,support_location,support_hours,support_url,faqs"
              )
              .eq(
                "id",
                "main"
              )
              .maybeSingle();

          if (error) {
            throw error;
          }

          if (data) {
            const next =
              normalizeSettings(
                data
              );

            setSettings(next);
            setDraft(next);
          }
        } catch (error) {
          console.error(
            "[CampusConnect footer]",
            error
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );


  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);


  const socialItems =
    useMemo(
      () => [
        {
          key:
            "facebook" as const,
          label: "Facebook",
          mark: "f",
          href:
            settings.social_links
              .facebook,
        },
        {
          key:
            "instagram" as const,
          label: "Instagram",
          mark: "◎",
          href:
            settings.social_links
              .instagram,
        },
        {
          key:
            "linkedin" as const,
          label: "LinkedIn",
          mark: "in",
          href:
            settings.social_links
              .linkedin,
        },
        {
          key:
            "twitter" as const,
          label: "X",
          mark: "X",
          href:
            settings.social_links
              .twitter,
        },
      ],
      [settings.social_links]
    );


  const openEditor = () => {
    setDraft(
      structuredClone(
        settings
      )
    );

    setMessage("");
    setEditing(true);
  };


  const updateColumnTitle = (
    columnIndex: number,
    value: string
  ) => {
    setDraft(
      current => ({
        ...current,

        columns:
          current.columns.map(
            (column, index) =>
              index ===
              columnIndex
                ? {
                    ...column,
                    title:
                      value,
                  }
                : column
          ),
      })
    );
  };


  const updateLink = (
    columnIndex: number,
    linkIndex: number,
    patch:
      Partial<FooterLink>
  ) => {
    setDraft(
      current => ({
        ...current,

        columns:
          current.columns.map(
            (
              column,
              currentColumnIndex
            ) =>
              currentColumnIndex ===
              columnIndex
                ? {
                    ...column,

                    links:
                      column.links.map(
                        (
                          link,
                          currentLinkIndex
                        ) =>
                          currentLinkIndex ===
                          linkIndex
                            ? {
                                ...link,
                                ...patch,
                              }
                            : link
                      ),
                  }
                : column
          ),
      })
    );
  };


  const saveSettings =
    async () => {
      const client =
        getSupabaseClient();

      if (!client) {
        setMessage(
          "CampusConnect database is unavailable."
        );
        return;
      }


      if (
        !draft.tagline.trim() ||
        !draft.copyright_text
          .trim()
      ) {
        setMessage(
          "Tagline and copyright text are required."
        );
        return;
      }


      const urls = [
        draft.social_links
          .facebook,
        draft.social_links
          .instagram,
        draft.social_links
          .linkedin,
        draft.social_links
          .twitter,
        draft.store_links
          .appStore,
        draft.store_links
          .playStore,
        draft.support_url,
      ];


      if (
        urls.some(
          url =>
            !validExternalUrl(
              url
            )
        )
      ) {
        setMessage(
          "External URLs must start with http:// or https://."
        );
        return;
      }


      for (
        const faq
        of (draft.faqs ?? [])
      ) {
        const hasQuestion =
          Boolean(
            faq.question.trim()
          );

        const hasAnswer =
          Boolean(
            faq.answer.trim()
          );

        if (
          hasQuestion !== hasAnswer
        ) {
          setMessage(
            "Each FAQ must have both a question and an answer, or both fields must be blank."
          );
          return;
        }
      }


      for (
        const column
        of draft.columns
      ) {
        const populatedLinks =
          column.links.filter(
            link =>
              link.label.trim() ||
              link.target.trim()
          );

        if (
          populatedLinks.length > 0 &&
          !column.title.trim()
        ) {
          setMessage(
            "A footer column with links requires a title."
          );
          return;
        }

        for (
          const link
          of populatedLinks
        ) {
          const hasLabel =
            Boolean(
              link.label.trim()
            );

          const hasTarget =
            Boolean(
              link.target.trim()
            );

          if (
            hasLabel !== hasTarget
          ) {
            setMessage(
              "A footer link must have both a label and destination, or both fields must be left blank."
            );
            return;
          }

          if (
            link.kind ===
              "external" &&
            hasTarget &&
            !validExternalUrl(
              link.target
            )
          ) {
            setMessage(
              `Invalid URL for ${link.label || "footer link"}.`
            );
            return;
          }
        }
      }


      setSaving(true);
      setMessage("");


      try {
        const {
          data: auth,
          error:
            authError,
        } =
          await client.auth
            .getUser();


        if (
          authError ||
          !auth.user
        ) {
          throw new Error(
            "Your session has expired."
          );
        }


        const clean: FooterSettings =
          {
            ...draft,

            tagline:
              draft.tagline
                .trim(),

            copyright_text:
              draft
                .copyright_text
                .trim(),

            columns:
              draft.columns
                .map(
                  column => ({
                    title:
                      column.title
                        .trim(),

                    links:
                      column.links
                        .filter(
                          link =>
                            link.label.trim() &&
                            link.target.trim()
                        )
                        .map(
                          link => ({
                            label:
                              link.label
                                .trim(),

                            kind:
                              link.kind,

                            target:
                              link.target
                                .trim(),
                          })
                        ),
                  })
                )
                .filter(
                  column =>
                    column.title &&
                    column.links.length > 0
                ),

            social_links:
              Object.fromEntries(
                Object.entries(
                  draft
                    .social_links
                ).map(
                  ([key, value]) => [
                    key,
                    value.trim(),
                  ]
                )
              ) as SocialLinks,

            store_links:
              Object.fromEntries(
                Object.entries(
                  draft
                    .store_links
                ).map(
                  ([key, value]) => [
                    key,
                    value.trim(),
                  ]
                )
              ) as StoreLinks,

            support_email:
              draft.support_email.trim(),

            support_phone:
              draft.support_phone.trim(),

            support_location:
              draft.support_location.trim(),

            support_hours:
              draft.support_hours.trim(),

            support_url:
              draft.support_url.trim(),

            faqs:
              (draft.faqs ?? [])
                .filter(
                  item =>
                    item.question.trim() ||
                    item.answer.trim()
                )
                .map(
                  item => ({
                    question:
                      item.question.trim(),
                    answer:
                      item.answer.trim(),
                  })
                ),
          };


        const {
          error,
        } =
          await client
            .from(
              "site_footer_settings"
            )
            .upsert(
              {
                id: "main",

                tagline:
                  clean.tagline,

                copyright_text:
                  clean
                    .copyright_text,

                columns:
                  clean.columns,

                social_links:
                  clean
                    .social_links,

                store_links:
                  clean
                    .store_links,

                support_email:
                  clean.support_email,

                support_phone:
                  clean.support_phone,

                support_location:
                  clean.support_location,

                support_hours:
                  clean.support_hours,

                support_url:
                  clean.support_url,

                faqs:
                  clean.faqs,

                updated_by:
                  auth.user.id,

                updated_at:
                  new Date()
                    .toISOString(),
              },
              {
                onConflict:
                  "id",
              }
            );


        if (error) {
          throw error;
        }


        setSettings(clean);

        setMessage(
          "Footer updated successfully."
        );

        window.setTimeout(
          () => {
            setEditing(false);
            setMessage("");
          },
          700
        );

      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to save footer."
        );
      } finally {
        setSaving(false);
      }
    };


  const openFooterLink = (
    link: FooterLink
  ) => {
    if (
      link.kind ===
      "internal"
    ) {
      go(
        link.target
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }


    if (
      validExternalUrl(
        link.target
      ) &&
      link.target
    ) {
      window.open(
        link.target,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };


  return (
    <>
      <footer
        className="ccSiteFooter"
        aria-label="CampusConnect footer"
      >
        <InteractiveFooterGrid
          width={44}
          height={44}
          squares={[40, 18]}
        />
        <div className="ccSiteFooterInner">

          <section className="ccFooterBrand">

            <div className="ccFooterLogoRow">
              <img
                src="/campusconnect-logo-ui.webp"
                alt="CampusConnect"
                className="ccFooterLogo"
              />

              {canEdit && (
                <button
                  type="button"
                  className="ccFooterEditButton"
                  onClick={
                    openEditor
                  }
                >
                  <PencilIcon
                    size={15}
                  />

                  Edit footer
                </button>
              )}
            </div>

            <p>
              {settings.tagline}
            </p>

            {loading && (
              <span className="ccFooterLoading">
                Loading footer…
              </span>
            )}

          </section>



          <details className="ccFooterExpandable ccFooterSupportExpandable">
            <summary className="ccFooterExpandableSummary">
              <div>
                <span>SUPPORT</span>
                <h3>CampusConnect support</h3>
              </div>

              <ChevronDownIcon
                size={18}
                aria-hidden="true"
              />
            </summary>

            <div className="ccFooterExpandableBody">
              <p className="ccFooterExpandableDescription">
                Official help for account access, verification and platform support.
              </p>

              <div className="ccFooterSupportItems">
                {settings.support_email && (
                  <a
                    href={`mailto:${settings.support_email}`}
                    className="ccFooterSupportItem"
                  >
                    <i>
                      <MailIcon size={17} />
                    </i>

                    <span>
                      <small>Email support</small>
                      <strong>{settings.support_email}</strong>
                    </span>
                  </a>
                )}

                {settings.support_phone && (
                  <a
                    href={`tel:${settings.support_phone.replace(/\s+/g, "")}`}
                    className="ccFooterSupportItem"
                  >
                    <i>
                      <PhoneIcon size={17} />
                    </i>

                    <span>
                      <small>Call support</small>
                      <strong>{settings.support_phone}</strong>
                    </span>
                  </a>
                )}

                {settings.support_location && (
                  <div className="ccFooterSupportItem">
                    <i>
                      <MapPinIcon size={17} />
                    </i>

                    <span>
                      <small>Support office</small>
                      <strong>{settings.support_location}</strong>
                    </span>
                  </div>
                )}

                {settings.support_hours && (
                  <div className="ccFooterSupportItem">
                    <i>
                      <ClockIcon size={17} />
                    </i>

                    <span>
                      <small>Support hours</small>
                      <strong>{settings.support_hours}</strong>
                    </span>
                  </div>
                )}

                {settings.support_url && (
                  <a
                    href={settings.support_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="ccFooterSupportItem"
                  >
                    <i>
                      <Globe2Icon size={17} />
                    </i>

                    <span>
                      <small>Online support</small>
                      <strong>Open support page</strong>
                    </span>
                  </a>
                )}
              </div>
            </div>
          </details>


          {(settings.faqs ?? []).length > 0 && (
            <details className="ccFooterExpandable ccFooterFaqExpandable">
              <summary className="ccFooterExpandableSummary">
                <div>
                  <span>HELP CENTER</span>
                  <h3>FAQs</h3>
                </div>

                <ChevronDownIcon
                  size={18}
                  aria-hidden="true"
                />
              </summary>

              <div className="ccFooterExpandableBody">
                <p className="ccFooterExpandableDescription">
                  Quick answers for access, support and campus services.
                </p>

                <div className="ccFooterFaqList">
                  {(settings.faqs ?? []).map(
                    (faq, index) => (
                      <details
                        key={`${faq.question}-${index}`}
                        className="ccFooterFaqItem"
                      >
                        <summary>
                          <span>
                            {faq.question}
                          </span>

                          <ChevronDownIcon
                            size={17}
                          />
                        </summary>

                        <p>
                          {faq.answer}
                        </p>
                      </details>
                    )
                  )}
                </div>
              </div>
            </details>
          )}


          <section className="ccFooterLinksGrid">

            {settings.columns.map(
              (
                column,
                columnIndex
              ) => (
                <div
                  className="ccFooterColumn"
                  key={`${column.title}-${columnIndex}`}
                >
                  <h3>
                    {column.title}
                  </h3>

                  <ul>
                    {column.links.map(
                      (
                        link,
                        linkIndex
                      ) => (
                        <li
                          key={`${link.label}-${linkIndex}`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              openFooterLink(
                                link
                              )
                            }
                          >
                            {link.label}

                            {link.kind ===
                              "external" && (
                              <ExternalLinkIcon
                                size={11}
                              />
                            )}
                          </button>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )
            )}

          </section>


          <div className="ccFooterRule" />


          <section className="ccFooterUtility">

            <div className="ccFooterSocials">

              {socialItems
                .filter(
                  item =>
                    Boolean(
                      item.href
                        .trim()
                    )
                )
                .map(
                  ({
                    label,
                    mark,
                    href,
                  }) => (
                    <a
                      key={
                        label
                      }
                      href={
                        href
                      }
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={
                        label
                      }
                      title={
                        label
                      }
                    >
                      <span
                        className="ccFooterBrandMark"
                        aria-hidden="true"
                      >
                        {mark}
                      </span>
                    </a>
                  )
                )}

              {!socialItems.some(
                item =>
                  Boolean(
                    item.href
                      .trim()
                  )
              ) && (
                <span className="ccFooterSocialPlaceholder">
                  Official CampusConnect
                </span>
              )}

            </div>


            <div className="ccFooterStores">

              {settings
                .store_links
                .appStore && (
                <a
                  href={
                    settings
                      .store_links
                      .appStore
                  }
                  target="_blank"
                  rel="noreferrer noopener"
                  className="ccStoreButton"
                >
                  <span className="ccStoreIcon">
                    
                  </span>

                  <span>
                    <small>
                      Download on the
                    </small>

                    <strong>
                      App Store
                    </strong>
                  </span>
                </a>
              )}


              {settings
                .store_links
                .playStore && (
                <a
                  href={
                    settings
                      .store_links
                      .playStore
                  }
                  target="_blank"
                  rel="noreferrer noopener"
                  className="ccStoreButton"
                >
                  <SmartphoneIcon
                    size={20}
                  />

                  <span>
                    <small>
                      Get it on
                    </small>

                    <strong>
                      Google Play
                    </strong>
                  </span>
                </a>
              )}

            </div>

          </section>


          <div className="ccFooterRule" />


          <section className="ccFooterBottom">
            <span>
              ©{" "}
              {new Date()
                .getFullYear()}{" "}
              {settings
                .copyright_text}
            </span>

            <span>
              RNSIT · CampusConnect
            </span>
          </section>

        </div>
      </footer>


      {editing &&
        canEdit && (
          <div
            className="ccFooterEditorScrim"
            role="presentation"
          >
            <section
              className="ccFooterEditor"
              role="dialog"
              aria-modal="true"
              aria-label="Edit CampusConnect footer"
            >

              <header>
                <div>
                  <span>
                    MAIN ADMIN
                  </span>

                  <h2>
                    Edit website footer
                  </h2>

                  <p>
                    Changes are visible to all
                    authenticated CampusConnect users.
                  </p>
                </div>

                <button
                  type="button"
                  className="ccFooterEditorClose"
                  onClick={() =>
                    setEditing(
                      false
                    )
                  }
                  aria-label="Close footer editor"
                >
                  <XIcon
                    size={19}
                  />
                </button>
              </header>


              <div className="ccFooterEditorBody">

                <section className="ccFooterEditorSection">
                  <h3>
                    Brand
                  </h3>

                  <label>
                    <span>
                      Footer tagline
                    </span>

                    <input
                      value={
                        draft.tagline
                      }
                      onChange={
                        event =>
                          setDraft(
                            current => ({
                              ...current,
                              tagline:
                                event
                                  .target
                                  .value,
                            })
                          )
                      }
                    />
                  </label>

                  <label>
                    <span>
                      Copyright text
                    </span>

                    <input
                      value={
                        draft
                          .copyright_text
                      }
                      onChange={
                        event =>
                          setDraft(
                            current => ({
                              ...current,

                              copyright_text:
                                event
                                  .target
                                  .value,
                            })
                          )
                      }
                    />
                  </label>
                </section>


                <section className="ccFooterEditorSection">
                  <h3>
                    Navigation
                  </h3>

                  <div className="ccFooterEditorColumns">

                    {draft.columns.map(
                      (
                        column,
                        columnIndex
                      ) => (
                        <div
                          className="ccFooterEditorColumn"
                          key={
                            columnIndex
                          }
                        >

                          <label>
                            <span>
                              Column title
                            </span>

                            <input
                              value={
                                column.title
                              }
                              onChange={
                                event =>
                                  updateColumnTitle(
                                    columnIndex,
                                    event
                                      .target
                                      .value
                                  )
                              }
                            />
                          </label>


                          {column.links.map(
                            (
                              link,
                              linkIndex
                            ) => (
                              <div
                                className="ccFooterEditorLink"
                                key={
                                  linkIndex
                                }
                              >

                                <input
                                  aria-label="Link label"
                                  value={
                                    link.label
                                  }
                                  onChange={
                                    event =>
                                      updateLink(
                                        columnIndex,
                                        linkIndex,
                                        {
                                          label:
                                            event
                                              .target
                                              .value,
                                        }
                                      )
                                  }
                                />

                                <select
                                  value={
                                    link.kind
                                  }
                                  onChange={
                                    event =>
                                      updateLink(
                                        columnIndex,
                                        linkIndex,
                                        {
                                          kind:
                                            event
                                              .target
                                              .value as
                                              | "internal"
                                              | "external",
                                        }
                                      )
                                  }
                                >
                                  <option value="internal">
                                    Campus page
                                  </option>

                                  <option value="external">
                                    External URL
                                  </option>
                                </select>

                                <input
                                  aria-label="Link destination"
                                  value={
                                    link.target
                                  }
                                  onChange={
                                    event =>
                                      updateLink(
                                        columnIndex,
                                        linkIndex,
                                        {
                                          target:
                                            event
                                              .target
                                              .value,
                                        }
                                      )
                                  }
                                />

                              </div>
                            )
                          )}

                        </div>
                      )
                    )}

                  </div>
                </section>



                <section className="ccFooterEditorSection">
                  <h3>
                    Support contact
                  </h3>

                  <div className="ccFooterEditorTwoCol">

                    <label>
                      <span>
                        Support email
                      </span>

                      <input
                        type="email"
                        placeholder="support@campusconnect-pro.in"
                        value={draft.support_email}
                        onChange={
                          event =>
                            setDraft(
                              current => ({
                                ...current,
                                support_email:
                                  event.target.value,
                              })
                            )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Support phone
                      </span>

                      <input
                        type="tel"
                        placeholder="+91 ..."
                        value={draft.support_phone}
                        onChange={
                          event =>
                            setDraft(
                              current => ({
                                ...current,
                                support_phone:
                                  event.target.value,
                              })
                            )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Support office
                      </span>

                      <input
                        placeholder="RNSIT Campus, Bengaluru"
                        value={draft.support_location}
                        onChange={
                          event =>
                            setDraft(
                              current => ({
                                ...current,
                                support_location:
                                  event.target.value,
                              })
                            )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Support hours
                      </span>

                      <input
                        placeholder="Mon–Sat · 9:00 AM–5:00 PM"
                        value={draft.support_hours}
                        onChange={
                          event =>
                            setDraft(
                              current => ({
                                ...current,
                                support_hours:
                                  event.target.value,
                              })
                            )
                        }
                      />
                    </label>

                    <label className="ccFooterEditorWide">
                      <span>
                        Support website / help page
                      </span>

                      <input
                        type="url"
                        placeholder="https://..."
                        value={draft.support_url}
                        onChange={
                          event =>
                            setDraft(
                              current => ({
                                ...current,
                                support_url:
                                  event.target.value,
                              })
                            )
                        }
                      />
                    </label>

                  </div>
                </section>



                <section className="ccFooterEditorSection">
                  <div className="ccFooterEditorSectionHead">
                    <div>
                      <h3>
                        FAQs
                      </h3>

                      <p>
                        Add common CampusConnect questions.
                        Blank rows will not be shown.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="ccFooterAddFaq"
                      onClick={() =>
                        setDraft(
                          current => ({
                            ...current,
                            faqs: [
                              ...(current.faqs ?? []),
                              {
                                question: "",
                                answer: "",
                              },
                            ],
                          })
                        )
                      }
                    >
                      <PlusIcon size={14} />
                      Add FAQ
                    </button>
                  </div>

                  <div className="ccFooterFaqEditorList">
                    {(draft.faqs ?? []).map(
                      (faq, index) => (
                        <div
                          className="ccFooterFaqEditorItem"
                          key={index}
                        >
                          <div className="ccFooterFaqEditorItemHead">
                            <strong>
                              FAQ {index + 1}
                            </strong>

                            <button
                              type="button"
                              aria-label={`Remove FAQ ${index + 1}`}
                              onClick={() =>
                                setDraft(
                                  current => ({
                                    ...current,
                                    faqs:
                                      (current.faqs ?? []).filter(
                                        (_, currentIndex) =>
                                          currentIndex !== index
                                      ),
                                  })
                                )
                              }
                            >
                              <Trash2Icon size={14} />
                            </button>
                          </div>

                          <label>
                            <span>
                              Question
                            </span>

                            <input
                              value={faq.question}
                              placeholder="How do I reset my account access?"
                              onChange={
                                event =>
                                  setDraft(
                                    current => ({
                                      ...current,
                                      faqs:
                                        (current.faqs ?? []).map(
                                          (item, currentIndex) =>
                                            currentIndex === index
                                              ? {
                                                  ...item,
                                                  question:
                                                    event.target.value,
                                                }
                                              : item
                                        ),
                                    })
                                  )
                              }
                            />
                          </label>

                          <label>
                            <span>
                              Answer
                            </span>

                            <textarea
                              value={faq.answer}
                              placeholder="Write a clear CampusConnect answer..."
                              rows={3}
                              onChange={
                                event =>
                                  setDraft(
                                    current => ({
                                      ...current,
                                      faqs:
                                        (current.faqs ?? []).map(
                                          (item, currentIndex) =>
                                            currentIndex === index
                                              ? {
                                                  ...item,
                                                  answer:
                                                    event.target.value,
                                                }
                                              : item
                                        ),
                                    })
                                  )
                              }
                            />
                          </label>
                        </div>
                      )
                    )}
                  </div>
                </section>


                <section className="ccFooterEditorSection">
                  <h3>
                    Social links
                  </h3>

                  <div className="ccFooterEditorTwoCol">

                    {(
                      [
                        [
                          "facebook",
                          "Facebook",
                        ],
                        [
                          "instagram",
                          "Instagram",
                        ],
                        [
                          "linkedin",
                          "LinkedIn",
                        ],
                        [
                          "twitter",
                          "X / Twitter",
                        ],
                      ] as const
                    ).map(
                      ([
                        key,
                        label,
                      ]) => (
                        <label
                          key={
                            key
                          }
                        >
                          <span>
                            {label}
                          </span>

                          <input
                            type="url"
                            placeholder="https://..."
                            value={
                              draft
                                .social_links[
                                key
                              ]
                            }
                            onChange={
                              event =>
                                setDraft(
                                  current => ({
                                    ...current,

                                    social_links:
                                      {
                                        ...current
                                          .social_links,

                                        [key]:
                                          event
                                            .target
                                            .value,
                                      },
                                  })
                                )
                            }
                          />
                        </label>
                      )
                    )}

                  </div>
                </section>


                <section className="ccFooterEditorSection">
                  <h3>
                    Mobile apps
                  </h3>

                  <div className="ccFooterEditorTwoCol">

                    <label>
                      <span>
                        App Store URL
                      </span>

                      <input
                        type="url"
                        placeholder="https://..."
                        value={
                          draft
                            .store_links
                            .appStore
                        }
                        onChange={
                          event =>
                            setDraft(
                              current => ({
                                ...current,

                                store_links:
                                  {
                                    ...current
                                      .store_links,

                                    appStore:
                                      event
                                        .target
                                        .value,
                                  },
                              })
                            )
                        }
                      />
                    </label>


                    <label>
                      <span>
                        Google Play URL
                      </span>

                      <input
                        type="url"
                        placeholder="https://..."
                        value={
                          draft
                            .store_links
                            .playStore
                        }
                        onChange={
                          event =>
                            setDraft(
                              current => ({
                                ...current,

                                store_links:
                                  {
                                    ...current
                                      .store_links,

                                    playStore:
                                      event
                                        .target
                                        .value,
                                  },
                              })
                            )
                        }
                      />
                    </label>

                  </div>
                </section>


                {message && (
                  <div className="ccFooterEditorMessage">
                    {message}
                  </div>
                )}

              </div>


              <footer>
                <button
                  type="button"
                  className="ccFooterEditorCancel"
                  onClick={() =>
                    setEditing(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="ccFooterEditorSave"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    void saveSettings()
                  }
                >
                  <SaveIcon
                    size={16}
                  />

                  {saving
                    ? "Saving…"
                    : "Save footer"}
                </button>
              </footer>

            </section>
          </div>
        )}
    </>
  );
}
