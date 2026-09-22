"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {useParams} from "next/navigation";

import {getSupabaseClient} from "../../../../lib/supabase";

import "./external-event-registration.css";


type PublicEvent = {
  slug: string;

  title: string;
  short_description: string;
  description: string;

  category: string;

  venue: string;
  organizer: string;

  event_date: string;
  end_date: string | null;

  banner_url: string | null;

  audience_department: string;
  audience_year: string;

  registration_deadline: string | null;

  capacity: number | null;

  external_fee_paise: number;

  registration_open: boolean;
  closed_reason: string;

  confirmed_count: number;
  seats_remaining: number | null;
};


type PublicEventResponse = {
  success?: boolean;
  error?: string;
  event?: PublicEvent;
};


type RegistrationResponse = {
  success?: boolean;

  registration_id?: string;

  event_title?: string;

  registration_status?: string;
  payment_status?: string;

  fee_amount_paise?: number;

  payment_required?: boolean;

  message?: string;

  registered_at?: string;

  pass_claim_token?: string;
};


type RegistrationForm = {
  full_name: string;
  email: string;
  phone: string;
  college_name: string;
  department: string;
  graduation_year: string;
};


const emptyForm: RegistrationForm = {
  full_name: "",
  email: "",
  phone: "",
  college_name: "",
  department: "",
  graduation_year: "",
};


const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date to be announced";
  }

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};


const formatTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};


const formatDeadline = (value: string | null) => {
  if (!value) {
    return "Until seats are filled";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Until seats are filled";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};


const money = (paise: number) => {
  if (!paise) {
    return "FREE";
  }

  return `₹${(paise / 100).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
};


export default function ExternalEventRegistrationPage() {
  const params = useParams();

  const slugValue = params?.slug;

  const slug =
    typeof slugValue === "string"
      ? slugValue
      : Array.isArray(slugValue)
      ? slugValue[0] || ""
      : "";


  const [event, setEvent] =
    useState<PublicEvent | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [pageError, setPageError] =
    useState("");

  const [form, setForm] =
    useState<RegistrationForm>(emptyForm);

  const [submitting, setSubmitting] =
    useState(false);

  const [formError, setFormError] =
    useState("");

  const [success, setSuccess] =
    useState<RegistrationResponse | null>(null);

  const [paymentRequired, setPaymentRequired] =
    useState<RegistrationResponse | null>(null);


  const loadEvent = useCallback(async () => {
    if (!slug) {
      setPageError(
        "This registration link is invalid."
      );

      setLoading(false);

      return;
    }

    const client =
      getSupabaseClient();

    if (!client) {
      setPageError(
        "CampusConnect registration service is unavailable."
      );

      setLoading(false);

      return;
    }

    setLoading(true);
    setPageError("");

    try {
      const {
        data,
        error,
      } = await client.rpc(
        "get_public_event_registration",
        {
          p_slug: slug,
        }
      );

      if (error) {
        throw error;
      }

      const result =
        data as PublicEventResponse;

      if (
        !result.success ||
        !result.event
      ) {
        throw new Error(
          result.error ||
            "This registration link is unavailable."
        );
      }

      setEvent(result.event);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load this event."
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);


  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);


  const updateField = (
    field: keyof RegistrationForm,
    value: string
  ) => {
    setForm(current => ({
      ...current,
      [field]: value,
    }));
  };


  const submitRegistration =
    async (
      submitEvent:
        FormEvent<HTMLFormElement>
    ) => {
      submitEvent.preventDefault();

      if (!event) {
        return;
      }

      if (!event.registration_open) {
        setFormError(
          event.closed_reason ||
            "Registration is closed."
        );

        return;
      }

      const fullName =
        form.full_name.trim();

      const email =
        form.email.trim();

      const phone =
        form.phone.trim();

      const college =
        form.college_name.trim();


      if (fullName.length < 2) {
        return setFormError(
          "Enter your full name."
        );
      }

      if (
        !email ||
        !email.includes("@")
      ) {
        return setFormError(
          "Enter a valid email address."
        );
      }

      if (
        phone.replace(/\D/g, "").length <
        10
      ) {
        return setFormError(
          "Enter a valid phone number."
        );
      }

      if (college.length < 2) {
        return setFormError(
          "Enter your college name."
        );
      }


      const client =
        getSupabaseClient();

      if (!client) {
        return setFormError(
          "CampusConnect registration service is unavailable."
        );
      }


      setSubmitting(true);
      setFormError("");
      setPaymentRequired(null);


      try {
        const {
          data,
          error,
        } = await client.rpc(
          "register_external_event_attendee",
          {
            p_slug: slug,

            p_full_name:
              fullName,

            p_email:
              email,

            p_phone:
              phone,

            p_college_name:
              college,

            p_department:
              form.department.trim(),

            p_graduation_year:
              form.graduation_year.trim(),
          }
        );


        if (error) {
          throw error;
        }


        const result =
          data as RegistrationResponse;


        if (
          result.payment_required
        ) {
          setPaymentRequired(
            result
          );

          return;
        }


        if (!result.success) {
          throw new Error(
            result.message ||
              "Unable to complete registration."
          );
        }


        setSuccess(result);

        setForm(emptyForm);

        await loadEvent();

      } catch (error) {
        setFormError(
          error instanceof Error
            ? error.message
            : "Unable to complete registration."
        );
      } finally {
        setSubmitting(false);
      }
    };


  if (loading) {
    return (
      <main className="externalEventPage">
        <div className="externalEventLoading">
          <div className="externalEventLoadingMark">
            CC
          </div>

          <span />

          <p>
            Loading event registration…
          </p>
        </div>
      </main>
    );
  }


  if (
    pageError ||
    !event
  ) {
    return (
      <main className="externalEventPage">
        <section className="externalEventUnavailable">
          <div className="externalEventBrandMark">
            CC
          </div>

          <span>
            CAMPUSCONNECT EVENTS
          </span>

          <h1>
            Registration unavailable
          </h1>

          <p>
            {pageError ||
              "This event registration link is no longer available."}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadEvent()
            }
          >
            Try again
          </button>
        </section>
      </main>
    );
  }


  const fee =
    event.external_fee_paise || 0;

  const paid =
    fee > 0;


  return (
    <main className="externalEventPage">

      <nav className="externalEventNav">
        <div className="externalEventBrand">
          <span>CC</span>

          <div>
            <strong>
              CampusConnect
            </strong>

            <small>
              RNS Institute of Technology
            </small>
          </div>
        </div>

        <div className="externalEventNavTag">
          EXTERNAL REGISTRATION
        </div>
      </nav>


      <section className="externalEventShell">

        <article className="externalEventExperience">

          <div className="externalEventVisual">

            {event.banner_url ? (
              <img
                src={event.banner_url}
                alt=""
              />
            ) : (
              <div className="externalEventFallbackVisual">
                <span>
                  {event.category ||
                    "CAMPUS EVENT"}
                </span>

                <strong>
                  {event.title}
                </strong>
              </div>
            )}

            <div className="externalEventVisualShade" />

            <div className="externalEventVisualContent">

              <div className="externalEventCategory">
                {event.category ||
                  "Campus Event"}
              </div>

              <h1>
                {event.title}
              </h1>

              <p>
                {event.short_description}
              </p>

              <div className="externalEventHeroMeta">

                <div>
                  <small>DATE</small>

                  <strong>
                    {formatDate(
                      event.event_date
                    )}
                  </strong>
                </div>

                <div>
                  <small>TIME</small>

                  <strong>
                    {formatTime(
                      event.event_date
                    )}
                  </strong>
                </div>

                <div>
                  <small>VENUE</small>

                  <strong>
                    {event.venue ||
                      "To be announced"}
                  </strong>
                </div>

              </div>
            </div>
          </div>


          <div className="externalEventStory">

            <div className="externalEventStoryHeading">
              <span>
                ABOUT THE EVENT
              </span>

              <h2>
                Everything you need
                before registering.
              </h2>
            </div>

            <p>
              {event.description ||
                event.short_description}
            </p>


            <div className="externalEventInformationGrid">

              <div>
                <span>ORGANIZER</span>

                <strong>
                  {event.organizer ||
                    "RNSIT"}
                </strong>
              </div>

              <div>
                <span>ELIGIBILITY</span>

                <strong>
                  {event.audience_year ===
                    "All"
                    ? "All students"
                    : event.audience_year}
                </strong>
              </div>

              <div>
                <span>DEPARTMENT</span>

                <strong>
                  {event.audience_department ||
                    "All"}
                </strong>
              </div>

              <div>
                <span>DEADLINE</span>

                <strong>
                  {formatDeadline(
                    event.registration_deadline
                  )}
                </strong>
              </div>

            </div>

          </div>

        </article>


        <aside className="externalEventRegistrationColumn">

          {success ? (

            <section className="externalEventSuccessCard">

              <div className="externalEventSuccessIcon">
                ✓
              </div>

              <span>
                REGISTRATION CONFIRMED
              </span>

              <h2>
                You're registered.
              </h2>

              <p>
                Your registration for{" "}
                <strong>
                  {event.title}
                </strong>{" "}
                has been confirmed.
              </p>


              <div className="externalEventSuccessDetails">

                <div>
                  <small>
                    REGISTRATION
                  </small>

                  <strong>
                    FREE
                  </strong>
                </div>

                <div>
                  <small>
                    STATUS
                  </small>

                  <strong>
                    Confirmed
                  </strong>
                </div>

              </div>


              <div className="externalEventSuccessNotice">
                <span>✓</span>

                <p>
                  Your registration has
                  been securely recorded
                  by CampusConnect.
                </p>
              </div>


              {success.pass_claim_token ? (
                <button
                  type="button"
                  className="externalEventPrimaryButton"
                  onClick={() => {
                    window.location.href =
                      `/events/pass/${success.pass_claim_token}`;
                  }}
                >
                  View / Print Event Pass →
                </button>
              ) : (
                <button
                  type="button"
                  className="externalEventPrimaryButton"
                  onClick={() => {
                    setSuccess(null);
                    setPaymentRequired(null);
                  }}
                >
                  Done
                </button>
              )}

            </section>

          ) : (

            <section className="externalEventRegistrationCard">

              <div className="externalEventRegistrationTop">

                <div>
                  <span>
                    INTER-COLLEGE
                  </span>

                  <h2>
                    Register for this event
                  </h2>

                  <p>
                    No CampusConnect account
                    required.
                  </p>
                </div>


                <div
                  className={`externalEventFee ${
                    paid
                      ? "isPaid"
                      : "isFree"
                  }`}
                >
                  <small>
                    EXTERNAL FEE
                  </small>

                  <strong>
                    {money(fee)}
                  </strong>
                </div>

              </div>


              {event.capacity &&
              event.capacity > 0 ? (

                <div className="externalEventSeatStatus">

                  <div>
                    <span>
                      SEAT AVAILABILITY
                    </span>

                    <strong>
                      {event.seats_remaining ??
                        0}{" "}
                      remaining
                    </strong>
                  </div>


                  <div className="externalEventSeatBar">
                    <span
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (event.confirmed_count /
                              event.capacity) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>

                </div>

              ) : null}


              {!event.registration_open && (

                <div className="externalEventClosedNotice">
                  <span>!</span>

                  <div>
                    <strong>
                      Registration closed
                    </strong>

                    <p>
                      {event.closed_reason ||
                        "This event is not accepting registrations."}
                    </p>
                  </div>
                </div>

              )}


              {paymentRequired && (

                <div className="externalEventPaymentNotice">

                  <div className="externalEventPaymentNoticeIcon">
                    ₹
                  </div>

                  <div>
                    <span>
                      PAYMENT REQUIRED
                    </span>

                    <strong>
                      {money(
                        paymentRequired.fee_amount_paise ||
                          fee
                      )}
                    </strong>

                    <p>
                      Online payment for
                      this event will be
                      enabled soon. Your
                      registration has{" "}
                      <b>
                        not
                      </b>{" "}
                      been confirmed or
                      charged.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setPaymentRequired(
                        null
                      )
                    }
                  >
                    ×
                  </button>

                </div>

              )}


              <form
                className="externalEventForm"
                onSubmit={
                  submitRegistration
                }
              >

                <label>
                  <span>
                    Full name *
                  </span>

                  <input
                    type="text"
                    autoComplete="name"
                    maxLength={120}
                    placeholder="Your full name"
                    value={
                      form.full_name
                    }
                    disabled={
                      submitting ||
                      !event.registration_open
                    }
                    onChange={e =>
                      updateField(
                        "full_name",
                        e.target.value
                      )
                    }
                  />
                </label>


                <div className="externalEventFormGrid">

                  <label>
                    <span>
                      Email address *
                    </span>

                    <input
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      placeholder="you@example.com"
                      value={
                        form.email
                      }
                      disabled={
                        submitting ||
                        !event.registration_open
                      }
                      onChange={e =>
                        updateField(
                          "email",
                          e.target.value
                        )
                      }
                    />
                  </label>


                  <label>
                    <span>
                      Phone number *
                    </span>

                    <input
                      type="tel"
                      autoComplete="tel"
                      maxLength={18}
                      placeholder="+91 98765 43210"
                      value={
                        form.phone
                      }
                      disabled={
                        submitting ||
                        !event.registration_open
                      }
                      onChange={e =>
                        updateField(
                          "phone",
                          e.target.value
                        )
                      }
                    />
                  </label>

                </div>


                <label>
                  <span>
                    College / University *
                  </span>

                  <input
                    type="text"
                    maxLength={180}
                    placeholder="Your college name"
                    value={
                      form.college_name
                    }
                    disabled={
                      submitting ||
                      !event.registration_open
                    }
                    onChange={e =>
                      updateField(
                        "college_name",
                        e.target.value
                      )
                    }
                  />
                </label>


                <div className="externalEventFormGrid">

                  <label>
                    <span>
                      Department
                    </span>

                    <input
                      type="text"
                      maxLength={100}
                      placeholder="e.g. ECE"
                      value={
                        form.department
                      }
                      disabled={
                        submitting ||
                        !event.registration_open
                      }
                      onChange={e =>
                        updateField(
                          "department",
                          e.target.value
                        )
                      }
                    />
                  </label>


                  <label>
                    <span>
                      Year
                    </span>

                    <select
                      value={
                        form.graduation_year
                      }
                      disabled={
                        submitting ||
                        !event.registration_open
                      }
                      onChange={e =>
                        updateField(
                          "graduation_year",
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        Select year
                      </option>

                      <option value="1st Year">
                        1st Year
                      </option>

                      <option value="2nd Year">
                        2nd Year
                      </option>

                      <option value="3rd Year">
                        3rd Year
                      </option>

                      <option value="4th Year">
                        4th Year
                      </option>

                      <option value="5th Year">
                        5th Year
                      </option>

                      <option value="Other">
                        Other
                      </option>
                    </select>
                  </label>

                </div>


                {formError && (

                  <div className="externalEventFormError">
                    <span>!</span>

                    <p>
                      {formError}
                    </p>
                  </div>

                )}


                <button
                  type="submit"
                  className="externalEventPrimaryButton"
                  disabled={
                    submitting ||
                    !event.registration_open
                  }
                >
                  {submitting
                    ? "Registering…"
                    : paid
                    ? `Continue · ${money(
                        fee
                      )} →`
                    : "Register Free →"}
                </button>


                <div className="externalEventTrust">

                  <span>
                    ✓
                  </span>

                  <p>
                    Your details are used
                    only for event
                    registration and
                    operations.
                  </p>

                </div>

              </form>

            </section>

          )}

        </aside>

      </section>


      <footer className="externalEventFooter">

        <div>
          <strong>
            CampusConnect
          </strong>

          <span>
            Event Registration
          </span>
        </div>

        <p>
          RNS Institute of Technology
        </p>

      </footer>

    </main>
  );
}
