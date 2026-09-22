"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {getSupabaseClient} from "../lib/supabase";
import "./calendar-rsvp.css";

type RsvpResponse =
  | "interested"
  | "going"
  | "not_going";

type CalendarRsvpProps = {
  itemId: string;
  source: "calendar" | "campus-event";
};

type RsvpRow = {
  response: RsvpResponse;
  reminder_enabled: boolean;
  reminder_minutes_before: number;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function CalendarRsvp({
  itemId,
  source,
}: CalendarRsvpProps) {
  const normalizedId =
    source === "campus-event"
      ? itemId.replace(/^campus-/, "")
      : itemId;

  const [response, setResponse] =
    useState<RsvpResponse | null>(null);

  const [reminderEnabled, setReminderEnabled] =
    useState(true);

  const [reminderMinutes, setReminderMinutes] =
    useState(60);

  const [goingCount, setGoingCount] =
    useState(0);

  const [interestedCount, setInterestedCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const loadRsvp = useCallback(async () => {
    if (!uuidPattern.test(normalizedId)) {
      setLoading(false);
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      setMessage("RSVP service is unavailable.");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const {data: authData} =
        await client.auth.getUser();

      if (!authData.user) {
        throw new Error(
          "Sign in to manage your RSVP."
        );
      }

      const [
        ownResult,
        countResult,
      ] = await Promise.all([
        client
          .from("campus_calendar_rsvps")
          .select(
            "response,reminder_enabled,reminder_minutes_before"
          )
          .eq("item_source", source)
          .eq("item_id", normalizedId)
          .eq("user_id", authData.user.id)
          .maybeSingle(),

        client.rpc(
          "get_campus_calendar_rsvp_counts",
          {
            requested_source: source,
            requested_item_id: normalizedId,
          }
        ),
      ]);

      if (ownResult.error) {
        throw ownResult.error;
      }

      if (countResult.error) {
        throw countResult.error;
      }

      const own =
        ownResult.data as RsvpRow | null;

      setResponse(own?.response || null);
      setReminderEnabled(
        own?.reminder_enabled ?? true
      );
      setReminderMinutes(
        own?.reminder_minutes_before ?? 60
      );

      const counts =
        Array.isArray(countResult.data)
          ? countResult.data[0]
          : countResult.data;

      setGoingCount(
        Number(counts?.going_count || 0)
      );

      setInterestedCount(
        Number(counts?.interested_count || 0)
      );
    } catch (error) {
      console.error(
        "[Campus Calendar RSVP] Load failed:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load RSVP."
      );
    } finally {
      setLoading(false);
    }
  }, [normalizedId, source]);

  useEffect(() => {
    void loadRsvp();
  }, [loadRsvp]);

  const saveRsvp = async (
    nextResponse: RsvpResponse,
    nextReminderEnabled = reminderEnabled,
    nextReminderMinutes = reminderMinutes
  ) => {
    const client = getSupabaseClient();

    if (
      !client ||
      !uuidPattern.test(normalizedId)
    ) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const {data: authData} =
        await client.auth.getUser();

      if (!authData.user) {
        throw new Error(
          "Your session has expired."
        );
      }

      const {error} = await client
        .from("campus_calendar_rsvps")
        .upsert(
          {
            item_source: source,
            item_id: normalizedId,
            user_id: authData.user.id,
            response: nextResponse,
            reminder_enabled:
              nextReminderEnabled,
            reminder_minutes_before:
              nextReminderMinutes,
          },
          {
            onConflict:
              "item_source,item_id,user_id",
          }
        );

      if (error) {
        throw error;
      }

      setResponse(nextResponse);
      setReminderEnabled(
        nextReminderEnabled
      );
      setReminderMinutes(
        nextReminderMinutes
      );

      setMessage(
        nextResponse === "going"
          ? "You are going."
          : nextResponse === "interested"
            ? "Marked as interested."
            : "RSVP updated."
      );

      await loadRsvp();
    } catch (error) {
      console.error(
        "[Campus Calendar RSVP] Save failed:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save RSVP."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!uuidPattern.test(normalizedId)) {
    return null;
  }

  return (
    <div className="calendarRsvp">
      <div className="calendarRsvpCounts">
        <span>
          <b>{goingCount}</b> going
        </span>

        <span>
          <b>{interestedCount}</b> interested
        </span>
      </div>

      <div className="calendarRsvpActions">
        <button
          type="button"
          className={
            response === "going"
              ? "active going"
              : ""
          }
          disabled={loading || saving}
          onClick={() =>
            void saveRsvp("going")
          }
        >
          ✓ Going
        </button>

        <button
          type="button"
          className={
            response === "interested"
              ? "active interested"
              : ""
          }
          disabled={loading || saving}
          onClick={() =>
            void saveRsvp("interested")
          }
        >
          ☆ Interested
        </button>

        {response && (
          <button
            type="button"
            className="calendarRsvpDecline"
            disabled={saving}
            onClick={() =>
              void saveRsvp("not_going")
            }
          >
            Not going
          </button>
        )}
      </div>

      {response &&
        response !== "not_going" && (
          <div className="calendarReminderControls">
            <label>
              <input
                type="checkbox"
                checked={reminderEnabled}
                disabled={saving}
                onChange={event =>
                  void saveRsvp(
                    response,
                    event.target.checked,
                    reminderMinutes
                  )
                }
              />

              Remind me
            </label>

            {reminderEnabled && (
              <select
                value={reminderMinutes}
                disabled={saving}
                aria-label="Reminder time"
                onChange={event =>
                  void saveRsvp(
                    response,
                    true,
                    Number(event.target.value)
                  )
                }
              >
                <option value="15">
                  15 minutes before
                </option>

                <option value="60">
                  1 hour before
                </option>

                <option value="1440">
                  1 day before
                </option>

                <option value="10080">
                  1 week before
                </option>
              </select>
            )}
          </div>
        )}

      {message && (
        <small
          className="calendarRsvpMessage"
          role="status"
        >
          {message}
        </small>
      )}
    </div>
  );
}
