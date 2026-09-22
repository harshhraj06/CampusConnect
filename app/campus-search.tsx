"use client";

import {useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent} from "react";
import type {CampusModuleView, ModuleProfile} from "./campus-modules";
import {getSupabaseClient} from "../lib/supabase";
import CampusGlobalDataSearch from "./campus-global-data-search";

type Role = ModuleProfile["role"];
export type SearchTarget = "Dashboard" | "Alumni" | "Campus Map" | "My Campus" | "Campus AI" | "Placements" | "Network" | "Resume" | "Academics" | "Academic Control" | "Calendar" | "Campus" | CampusModuleView
  | "Activity Center"
  | "Faculty Directory"
  | "About CampusConnect"
  | "Seva Kendra"
  | "College ID";
type SearchCategory = "Academics" | "Career" | "Community" | "Campus" | "Workspace";
type SearchItem = {
  id: string;
  title: string;
  description: string;
  category: SearchCategory;
  target: SearchTarget;
  icon: string;
  keywords: string;
  roles: Role[];
  badge?: string;
};

type CampusPersonSearchResult = {
  id: string;
  full_name: string;
  email: string;
  campus_uid: string;
  usn: string;
  department: string;
  graduation_year: string;
  role: string;
  avatar_url: string | null;
};

const everyRole: Role[] = [
  "Student",
  "Faculty",
  "Placement Cell",
  "Coordinator",
  "Volunteer",
  "Main Admin",
];
const searchCategories: ("All" | SearchCategory)[] = ["All", "Academics", "Career", "Community", "Campus", "Workspace"];

const searchItems: SearchItem[] = [
  {
    id: "campus-alumni",
    title: "Campus Alumni",
    description:
      "Discover verified alumni journeys, achievements and professional impact.",
    category: "Community",
    target: "Alumni",
    icon: "✦",
    keywords:
      "alumni graduates seniors success company career achievement network",
    roles: everyRole,
    badge: "Network",
  },
  {
    id: "campus-map",
    title: "RNS Campus Map",
    description:
      "Find campus blocks and display an interactive walking path.",
    category: "Campus",
    target: "Campus Map",
    icon: "⌖",
    keywords:
      "3d map navigation directions route block gate hostel canteen auditorium campus",
    roles: everyRole,
    badge: "3D",
  },
  {id: "dashboard", title: "Open dashboard", description: "Return to your role overview and priority actions.", category: "Workspace", target: "Dashboard", icon: "⌂", keywords: "home overview metrics priorities", roles: everyRole},
  {
    id: "student-calendar",
    title: "Campus Calendar",
    description: "View campus events, festivals, holidays, exams, meetings, placement activities and important deadlines.",
    category: "Academics",
    target: "Calendar",
    icon: "▦",
    keywords: "calendar holiday holidays event events exam exams academic dates workshop placement deadline schedule",
    roles: everyRole,
  },
  {
    id: "college-id",
    title: "Official College ID",
    description: "Open your verified digital college identity or scan an official student ID barcode.",
    category: "Workspace",
    target: "College ID",
    icon: "▥",
    keywords: "college id student id barcode identity verification rnsit usn digital card",
    roles: everyRole,
    badge: "Verified",
  },
  {
    id: "campus-seva-kendra",
    title: "Campus Seva Kendra",
    description: "Submit, track and resolve official campus requests through a secure digital Patra.",
    category: "Workspace",
    target: "Seva Kendra",
    icon: "✉",
    keywords: "seva request complaint grievance bonafide leave attendance correction id card permission patra service desk",
    roles: everyRole,
    badge: "Live",
  },
  {
    id: "about-campusconnect",
    title: "About CampusConnect",
    description: "Open the ancient Patra and discover the CampusConnect story and developer.",
    category: "Workspace",
    target: "About CampusConnect",
    icon: "≋",
    keywords: "about developer harsh raj founder mission technology campusconnect patra scroll",
    roles: everyRole,
    badge: "Patra",
  },
  {id: "my-campus", title: "My Campus", description: "Open your authenticated CampusConnect AI workspace and role-based campus intelligence tools.", category: "Workspace", target: "My Campus", icon: "◇", keywords: "my campus authenticated ai workspace role intelligence assistant", roles: everyRole, badge: "AI"},
  {id: "campus-ai", title: "Campus AI", description: "Ask Campus AI questions using only records authorized for your authenticated CampusConnect role.", category: "Workspace", target: "Campus AI", icon: "✦", keywords: "campus ai assistant authenticated role intelligence advisor", roles: everyRole, badge: "AI"},
  {id: "announcements", title: "Campus announcements", description: "Read verified academic, placement and campus notices.", category: "Campus", target: "Announcements", icon: "▣", keywords: "notice circular update official emergency", roles: everyRole, badge: "Verified"},
  {id: "learning-videos", title: "Subject video library", description: "Find faculty-approved YouTube lessons by subject.", category: "Academics", target: "Learning", icon: "▶", keywords: "youtube videos lectures playlist digital communication vlsi nptel", roles: everyRole},
  {id: "learning-pyq", title: "Previous-year question papers", description: "Browse PYQs by subject and academic year.", category: "Academics", target: "Learning", icon: "PYQ", keywords: "previous year question paper exam pdf semester", roles: everyRole, badge: "Popular"},
  {id: "groups", title: "Discussion communities", description: "Join student, faculty and placement-focused groups.", category: "Community", target: "Groups", icon: "◉", keywords: "group discussion chat community project class placement", roles: everyRole},
  {id: "network", title: "Campus professional network", description: "Connect with students, seniors, faculty and mentors.", category: "Community", target: "Network", icon: "◎", keywords: "people alumni seniors mentors posts connections", roles: everyRole},
  {id: "profile", title: "Profile and document vault", description: "Update your campus identity, skills and private files.", category: "Workspace", target: "Profile", icon: "◌", keywords: "profile resume certificate marks card documents skills phone usn", roles: everyRole},
  {id: "campus-events", title: "Campus Life", description: "Explore shared events, notices, communities, achievements and research.", category: "Campus", target: "Campus", icon: "◇", keywords: "campus life event calendar innovation hackathon workshop notice club community achievement research", roles: everyRole},
  {id: "campus-magazine", title: "Campus Magazine", description: "Browse real campus photographs and stories in an interactive page-turning magazine.", category: "Campus", target: "Campus", icon: "M", keywords: "campus magazine photos pictures stories chronicle gallery edition", roles: everyRole, badge: "Magazine"},
  {id: "student-assignments", title: "Assignments and deadlines", description: "Track coursework, projects and placement tasks.", category: "Academics", target: "Assignments", icon: "✓", keywords: "assignment submission deadline coursework project task", roles: ["Student"], badge: "3 active"},
  {id: "student-attendance", title: "My attendance", description: "Check subject percentages, shortage warnings and safe targets.", category: "Academics", target: "Attendance", icon: "◷", keywords: "attendance percentage classes shortage 75 safe", roles: ["Student"]},
  {id: "student-placements", title: "Recommended placement drives", description: "View matching companies, eligibility and application deadlines.", category: "Career", target: "Placements", icon: "◈", keywords: "jobs internship company drives", roles: ["Student"], badge: "Live"},
  {id: "student-applications", title: "My application tracker", description: "Follow applied, shortlisted and interview stages.", category: "Career", target: "Applications", icon: "▤", keywords: "application status shortlist assessment interview offer", roles: ["Student"]},
  {id: "student-resume", title: "ATS resume builder", description: "Improve your score, projects and placement-ready resume.", category: "Career", target: "Resume", icon: "▤", keywords: "resume cv ats score export pdf projects skills", roles: ["Student"], badge: "78/100"},
  {id: "student-academics", title: "Academic overview", description: "Open timetable, attendance and recent course resources.", category: "Academics", target: "Academics", icon: "▦", keywords: "timetable subjects classes resources academics", roles: ["Student"]},
  {id: "faculty-assignments", title: "Create and review assignments", description: "Publish tasks and monitor student submissions.", category: "Academics", target: "Assignments", icon: "✓", keywords: "faculty create assignment submissions review deadline", roles: ["Faculty"]},
  {id: "faculty-attendance", title: "Record student attendance", description: "Take quick attendance and review shortage risks.", category: "Academics", target: "Attendance", icon: "◷", keywords: "faculty record present absent students shortage", roles: ["Faculty"]},
  {id: "faculty-academics", title: "Faculty academic console", description: "Review classes, action queues and published resources.", category: "Academics", target: "Academics", icon: "▦", keywords: "classes mentoring resources student action queue", roles: ["Faculty"]},
  {id: "faculty-analytics", title: "Academic analytics", description: "Inspect engagement, attendance and resource activity signals.", category: "Workspace", target: "Analytics", icon: "▥", keywords: "analytics reports insights engagement performance", roles: ["Faculty"]},
  {id: "placement-drives", title: "Manage recruitment drives", description: "Open company drives, eligibility lists and deadlines.", category: "Career", target: "Placements", icon: "◈", keywords: "placement company drives eligibility export notify recruiter company placement drives", roles: ["Placement Cell"], badge: "Live"},
  {id: "placement-pipeline", title: "Application pipeline", description: "Move students through shortlist, assessment and interview stages.", category: "Career", target: "Applications", icon: "▤", keywords: "students applications shortlist assessment interview offer", roles: ["Placement Cell"]},
  {id: "placement-analytics", title: "Placement analytics", description: "Review applications, conversions and engagement signals.", category: "Workspace", target: "Analytics", icon: "▥", keywords: "placement reports metrics conversion offers analytics", roles: ["Placement Cell"]},
  {id: "placement-admin", title: "User and role administration", description: "Manage verified Student, Faculty and Placement Cell access.", category: "Workspace", target: "Admin", icon: "⚙", keywords: "admin users accounts roles permissions faculty student", roles: ["Placement Cell"], badge: "Restricted"},
];

const placeholders: Record<Role, string> = {
  Student: "Search placements, PYQs, videos, groups…",
  Faculty: "Search classes, students, resources, actions…",
  "Placement Cell": "Search drives, applications, students, reports…",
  Coordinator: "Search events, announcements, groups and campus activities…",
  Volunteer: "Search assigned events, attendees and check-in operations…",
  "Main Admin": "Search users, campus modules, events and administration…",
};

export function CampusSearch({role, onNavigate}: {role: Role; onNavigate: (target: SearchTarget) => void}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | SearchCategory>("All");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const [people, setPeople] =
    useState<CampusPersonSearchResult[]>([]);

  const [peopleLoading, setPeopleLoading] =
    useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const roleItems = useMemo(() => searchItems.filter(item => item.roles.includes(role)), [role]);
  const filteredItems = useMemo(() => {
    const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return roleItems.filter(item => {
      if (category !== "All" && item.category !== category) return false;
      if (!tokens.length) return true;
      const searchable = `${item.title} ${item.description} ${item.category} ${item.keywords}`.toLowerCase();
      return tokens.every(token => searchable.includes(token));
    }).sort((a, b) => {
      const normalized = query.toLowerCase().trim();
      const aStarts = normalized && a.title.toLowerCase().startsWith(normalized) ? 1 : 0;
      const bStarts = normalized && b.title.toLowerCase().startsWith(normalized) ? 1 : 0;
      return bStarts - aStarts;
    });
  }, [category, query, roleItems]);

  useEffect(() => {
    const normalized =
      query.trim();

    if (normalized.length < 2) {
      setPeople([]);
      setPeopleLoading(false);
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) {
      setPeople([]);
      return;
    }

    let active = true;

    const timer =
      window.setTimeout(
        async () => {
          setPeopleLoading(true);

          /*
           * Remove PostgREST filter control characters.
           * Normal Campus UID characters such as -, _, letters
           * and numbers remain untouched.
           */
          const safe =
            normalized
              .replace(/[,%()]/g, "")
              .trim();

          if (!safe) {
            if (active) {
              setPeople([]);
              setPeopleLoading(false);
            }
            return;
          }

          const {
            data,
            error,
          } =
            await client
              .from("profiles")
              .select(
                "id,full_name,email,campus_uid,usn,department,graduation_year,role,avatar_url"
              )
              .or(
                [
                  `campus_uid.ilike.%${safe}%`,
                  `full_name.ilike.%${safe}%`,
                  `usn.ilike.%${safe}%`,
                  `email.ilike.%${safe}%`,
                  `department.ilike.%${safe}%`,
                ].join(",")
              )
              .limit(12);

          if (!active) {
            return;
          }

          if (error) {
            console.error(
              "[Campus Search] people search failed:",
              error
            );

            setPeople([]);
            setPeopleLoading(false);
            return;
          }

          const normalizedQuery =
            normalized.toLowerCase();

          const rows =
            (
              (data || []) as
                CampusPersonSearchResult[]
            ).sort(
              (a, b) => {
                const aUid =
                  String(
                    a.campus_uid || ""
                  ).toLowerCase();

                const bUid =
                  String(
                    b.campus_uid || ""
                  ).toLowerCase();

                const aName =
                  String(
                    a.full_name || ""
                  ).toLowerCase();

                const bName =
                  String(
                    b.full_name || ""
                  ).toLowerCase();

                const aExactUid =
                  aUid ===
                  normalizedQuery
                    ? 1
                    : 0;

                const bExactUid =
                  bUid ===
                  normalizedQuery
                    ? 1
                    : 0;

                if (
                  aExactUid !==
                  bExactUid
                ) {
                  return (
                    bExactUid -
                    aExactUid
                  );
                }

                const aUidStarts =
                  aUid.startsWith(
                    normalizedQuery
                  )
                    ? 1
                    : 0;

                const bUidStarts =
                  bUid.startsWith(
                    normalizedQuery
                  )
                    ? 1
                    : 0;

                if (
                  aUidStarts !==
                  bUidStarts
                ) {
                  return (
                    bUidStarts -
                    aUidStarts
                  );
                }

                const aNameStarts =
                  aName.startsWith(
                    normalizedQuery
                  )
                    ? 1
                    : 0;

                const bNameStarts =
                  bName.startsWith(
                    normalizedQuery
                  )
                    ? 1
                    : 0;

                return (
                  bNameStarts -
                  aNameStarts
                );
              }
            );

          setPeople(rows);
          setPeopleLoading(false);
        },
        280
      );

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);


  const recentItems = recentIds.map(id => roleItems.find(item => item.id === id)).filter((item): item is SearchItem => Boolean(item));
  const roleQuickItem = role === "Student" ? "student-placements" : role === "Faculty" ? "faculty-attendance" : "placement-drives";
  const quickItems = roleItems.filter(item => ["dashboard", "announcements", "learning-videos", "learning-pyq", "groups", roleQuickItem].includes(item.id));
  const showingResults = Boolean(query || category !== "All");

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target?.matches("input, textarea, select") || target?.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const closeSearch = () => {
    setOpen(false);
    setQuery("");
    setCategory("All");
    setActiveIndex(0);
  };

  const chooseItem = (item: SearchItem) => {
    setRecentIds(current => [item.id, ...current.filter(id => id !== item.id)].slice(0, 4));
    onNavigate(item.target);
    closeSearch();
  };

  const choosePerson =
    (
      person:
        CampusPersonSearchResult
    ) => {

      /*
       * Store the selected campus UID so the Network page
       * can use it later for direct-profile opening.
       */
      sessionStorage.setItem(
        "campusconnect-selected-profile",
        person.campus_uid ||
          person.id
      );

      window.dispatchEvent(
        new CustomEvent(
          "campus-person-selected",
          {
            detail: {
              id: person.id,
              campus_uid:
                person.campus_uid,
            },
          }
        )
      );

      onNavigate("Network");
      closeSearch();
    };


  const handleInputKey = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!showingResults) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(index => Math.min(index + 1, Math.max(0, filteredItems.length - 1)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(index => Math.max(0, index - 1));
    } else if (event.key === "Enter" && filteredItems[activeIndex]) {
      event.preventDefault();
      chooseItem(filteredItems[activeIndex]);
    }
  };

  return <>
    <button
      className="campusSearchTrigger"
      onClick={() => setOpen(true)}
      aria-label="Open CampusConnect search"
    >
      <i aria-hidden="true">⌕</i>
      <span>{placeholders[role]}</span>
    </button>
    {open && <div className="campusSearchLayer">
      <button className="campusSearchBackdrop" onClick={closeSearch} aria-label="Close search"/>
      <section className="campusSearchDialog" role="dialog" aria-modal="true" aria-label="Search CampusConnect">
        <header className="campusSearchInput">
          <i aria-hidden="true">⌕</i>
          <input ref={inputRef} value={query} onChange={event => {setQuery(event.target.value); setActiveIndex(0);}} onKeyDown={handleInputKey} placeholder={placeholders[role]} aria-controls={showingResults ? "campus-search-results" : undefined} aria-activedescendant={showingResults && filteredItems[activeIndex] ? `search-${filteredItems[activeIndex].id}` : undefined}/>
          {query && <button onClick={() => {setQuery(""); setActiveIndex(0);}} aria-label="Clear search">×</button>}
          <kbd>ESC</kbd>
        </header>
        <div className="campusSearchContext"><span><i/>Searching the <b>{role}</b> workspace</span><small>{roleItems.length} destinations</small></div>
        <div className="campusSearchFilters" aria-label="Search categories">
          {searchCategories.filter(item => item === "All" || roleItems.some(result => result.category === item)).map(item => <button className={category === item ? "selected" : ""} onClick={() => {setCategory(item); setActiveIndex(0);}} key={item}>{item}{item !== "All" && <b>{roleItems.filter(result => result.category === item).length}</b>}</button>)}
        </div>
        {!query && category === "All" && <div className="campusSearchSuggestions">
          {recentItems.length > 0 && <SearchGroup title="Recently opened" items={recentItems} onChoose={chooseItem}/>} 
          <SearchGroup title="Quick access" items={quickItems} onChoose={chooseItem}/>
          <div className="campusSearchTip"><i>⌘</i><p><b>Work faster with search</b><small>Try “PYQ”, “attendance”, “placements” or “create assignment”.</small></p></div>
        </div>}
        <CampusGlobalDataSearch
          role={role}
          query={query}
          onNavigate={target => {
            onNavigate(target);
            closeSearch();
          }}
        />

        {query.trim().length >= 2 && (
          <section className="campusPeopleSearch">

            <header className="campusPeopleSearchHeader">
              <div>
                <span>PEOPLE</span>
                <strong>Campus directory</strong>
              </div>

              <small>
                {peopleLoading
                  ? "Searching…"
                  : `${people.length} found`}
              </small>
            </header>

            {peopleLoading ? (
              <div className="campusPeopleLoading">
                Searching campus profiles…
              </div>
            ) : people.length ? (
              <div className="campusPeopleResults">

                {people.map(person => {

                  const exactUid =
                    Boolean(
                      person.campus_uid &&
                      person.campus_uid
                        .toLowerCase() ===
                        query
                          .trim()
                          .toLowerCase()
                    );

                  const initials =
                    (
                      person.full_name ||
                      "Campus User"
                    )
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map(word =>
                        word.charAt(0)
                      )
                      .join("")
                      .toUpperCase();

                  return (
                    <button
                      type="button"
                      className={
                        exactUid
                          ? "campusPersonResult exact"
                          : "campusPersonResult"
                      }
                      key={person.id}
                      onClick={() =>
                        choosePerson(
                          person
                        )
                      }
                    >

                      <span className="campusPersonAvatar">
                        {person.avatar_url ? (
                          <img
                            src={
                              person.avatar_url
                            }
                            alt=""
                          />
                        ) : (
                          initials
                        )}
                      </span>

                      <span className="campusPersonIdentity">
                        <b>
                          {person.full_name ||
                            "Campus user"}
                        </b>

                        <small>
                          {[
                            person.role,
                            person.department,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </span>

                      <span className="campusPersonUid">
                        <code>
                          {person.campus_uid ||
                            person.usn ||
                            "UID pending"}
                        </code>

                        {exactUid && (
                          <em>
                            EXACT UID
                          </em>
                        )}
                      </span>

                      <strong>
                        →
                      </strong>

                    </button>
                  );
                })}

              </div>
            ) : (
              <div className="campusPeopleEmpty">
                No campus profile matched this name or UID.
              </div>
            )}

          </section>
        )}

        {showingResults && <div className="campusSearchResults" id="campus-search-results" role="listbox" aria-label="Search results">
          <div className="campusSearchResultMeta"><span>{filteredItems.length} result{filteredItems.length === 1 ? "" : "s"}</span><small>Use ↑ ↓ and Enter</small></div>
          {filteredItems.map((item, index) => <button id={`search-${item.id}`} className={activeIndex === index ? "active" : ""} onMouseEnter={() => setActiveIndex(index)} onClick={() => chooseItem(item)} role="option" aria-selected={activeIndex === index} key={item.id}>
            <i>{item.icon}</i><span><b>{item.title}</b><small>{item.description}</small></span><em>{item.badge || item.category}</em><strong>↵</strong>
          </button>)}
          {!filteredItems.length && <div className="campusSearchEmpty"><i>⌕</i><b>No matching campus result</b><small>Try a subject, company, module or a broader category.</small><button onClick={() => {setQuery(""); setCategory("All");}}>Clear search</button></div>}
        </div>}
        <footer className="campusSearchFooter"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span><span><kbd>ESC</kbd> Close</span><b>CampusConnect Global AI Search</b></footer>
      </section>
    </div>}
  </>;
}

function SearchGroup({title, items, onChoose}: {title: string; items: SearchItem[]; onChoose: (item: SearchItem) => void}) {
  return <section className="campusSearchGroup"><header><span>{title}</span><small>{items.length}</small></header><div>{items.map(item => <button onClick={() => onChoose(item)} key={item.id}><i>{item.icon}</i><span><b>{item.title}</b><small>{item.category}</small></span><em>→</em></button>)}</div></section>;
}
