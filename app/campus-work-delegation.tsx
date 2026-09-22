"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {getSupabaseClient} from "../lib/supabase";
import "./campus-work-delegation.css";

type DelegationPermission =
  | "EVENT_SCAN"
  | "SEVA_PROCESS";

type WorkDelegation = {
  id: string;
  assignee_id: string;
  assignee_email: string;
  assignee_name: string;
  permission: DelegationPermission;
  resource_id: string;
  resource_label: string;
  reason: string;
  starts_at: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

type EventResource = {
  id: string;
  title: string;
  event_date: string;
  status: string;
};

type SevaResource = {
  id: string;
  request_number: string;
  subject: string;
  status: string;
};

type ResourceOption = {
  id: string;
  label: string;
  meta: string;
};

const permissionLabels: Record<
  DelegationPermission,
  string
> = {
  EVENT_SCAN: "Event pass scanning",
  SEVA_PROCESS: "Seva request processing",
};

function defaultExpiry() {
  const date = new Date();
  date.setDate(date.getDate() + 7);

  const local = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 16);
}

function formatDelegationDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to complete this operation.";
}

export default function CampusWorkDelegation() {
  const [delegations, setDelegations] =
    useState<WorkDelegation[]>([]);

  const [events, setEvents] =
    useState<EventResource[]>([]);

  const [sevaRequests, setSevaRequests] =
    useState<SevaResource[]>([]);

  const [permission, setPermission] =
    useState<DelegationPermission>("EVENT_SCAN");

  const [resourceId, setResourceId] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [expiresAt, setExpiresAt] =
    useState(defaultExpiry);

  const [reason, setReason] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [revokingId, setRevokingId] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const loadDelegationData = async () => {
    const client = getSupabaseClient();

    if (!client) {
      setError(
        "CampusConnect is not connected to Supabase."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [
        delegationResult,
        eventResult,
        sevaResult,
      ] = await Promise.all([
        client
          .from("campus_work_delegations")
          .select(
            "id,assignee_id,assignee_email,assignee_name,permission,resource_id,resource_label,reason,starts_at,expires_at,revoked_at,created_at"
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(100),

        client
          .from("campus_events")
          .select(
            "id,title,event_date,status"
          )
          .neq("status", "Cancelled")
          .order("event_date", {
            ascending: true,
          })
          .limit(150),

        client
          .from("campus_service_requests")
          .select(
            "id,request_number,subject,status"
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(150),
      ]);

      if (delegationResult.error) {
        throw delegationResult.error;
      }

      if (eventResult.error) {
        throw eventResult.error;
      }

      if (sevaResult.error) {
        throw sevaResult.error;
      }

      setDelegations(
        (delegationResult.data || []) as
          unknown as WorkDelegation[]
      );

      setEvents(
        (eventResult.data || []) as
          unknown as EventResource[]
      );

      setSevaRequests(
        (sevaResult.data || []) as
          unknown as SevaResource[]
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDelegationData();
  }, []);

  const resources =
    useMemo<ResourceOption[]>(() => {
      if (permission === "EVENT_SCAN") {
        return events.map(item => ({
          id: item.id,
          label: item.title,
          meta:
            `${formatDelegationDate(
              item.event_date
            )} · ${item.status}`,
        }));
      }

      return sevaRequests.map(item => ({
        id: item.id,
        label:
          `${item.request_number} · ${item.subject}`,
        meta: item.status,
      }));
    }, [
      permission,
      events,
      sevaRequests,
    ]);

  const activeDelegations =
    delegations.filter(item =>
      !item.revoked_at &&
      new Date(item.expires_at).getTime() >
        Date.now()
    );

  const pastDelegations =
    delegations.filter(item =>
      Boolean(item.revoked_at) ||
      new Date(item.expires_at).getTime() <=
        Date.now()
    );

  const grantDelegation = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      return setError(
        "Enter the registered CampusConnect email."
      );
    }

    if (!resourceId) {
      return setError(
        permission === "EVENT_SCAN"
          ? "Select the event this person may scan."
          : "Select the Seva request this person may process."
      );
    }

    const expiry = new Date(expiresAt);

    if (
      Number.isNaN(expiry.getTime()) ||
      expiry.getTime() <= Date.now()
    ) {
      return setError(
        "Choose a valid future expiry date."
      );
    }

    const resource =
      resources.find(
        item => item.id === resourceId
      );

    if (!resource) {
      return setError(
        "The selected work resource is unavailable."
      );
    }

    const client = getSupabaseClient();

    if (!client) {
      return setError(
        "CampusConnect is not connected to Supabase."
      );
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const {error: grantError} =
        await client.rpc(
          "grant_campus_work_by_email",
          {
            p_email:
              normalizedEmail,
            p_permission:
              permission,
            p_resource_id:
              resource.id,
            p_resource_label:
              resource.label,
            p_expires_at:
              expiry.toISOString(),
            p_reason:
              reason.trim(),
          }
        );

      if (grantError) {
        throw grantError;
      }

      setMessage(
        `${permissionLabels[permission]} assigned to ${normalizedEmail}.`
      );

      setEmail("");
      setResourceId("");
      setReason("");
      setExpiresAt(defaultExpiry());

      await loadDelegationData();
    } catch (grantError) {
      setError(getErrorMessage(grantError));
    } finally {
      setSaving(false);
    }
  };

  const revokeDelegation = async (
    item: WorkDelegation
  ) => {
    const confirmed = window.confirm(
      `Revoke ${permissionLabels[
        item.permission
      ]} from ${item.assignee_email}?`
    );

    if (!confirmed) return;

    const client = getSupabaseClient();

    if (!client) {
      return setError(
        "CampusConnect is not connected to Supabase."
      );
    }

    setRevokingId(item.id);
    setError("");
    setMessage("");

    try {
      const {error: revokeError} =
        await client.rpc(
          "revoke_campus_work_delegation",
          {
            p_delegation_id: item.id,
          }
        );

      if (revokeError) {
        throw revokeError;
      }

      setMessage(
        `Delegated access for ${item.assignee_email} was revoked.`
      );

      await loadDelegationData();
    } catch (revokeError) {
      setError(getErrorMessage(revokeError));
    } finally {
      setRevokingId("");
    }
  };

  return (
    <section className="campusDelegationDesk card">
      <header className="campusDelegationHeader">
        <div>
          <span>SCOPED WORK AUTHORIZATION</span>

          <h3>Delegate campus work</h3>

          <p>
            Assign one specific event scanner or
            Seva request to an existing verified
            CampusConnect account.
          </p>
        </div>

        <div className="campusDelegationSecurity">
          <i>⌾</i>
          Expiring access
        </div>
      </header>

      {(message || error) && (
        <div
          className={
            `campusDelegationMessage ${
              error ? "error" : "success"
            }`
          }
          role={error ? "alert" : "status"}
        >
          {error || message}
        </div>
      )}

      <form
        className="campusDelegationForm"
        onSubmit={grantDelegation}
      >
        <label>
          <span>WORK TYPE</span>

          <select
            value={permission}
            onChange={event => {
              setPermission(
                event.target
                  .value as DelegationPermission
              );
              setResourceId("");
              setError("");
            }}
          >
            <option value="EVENT_SCAN">
              Event pass scanning
            </option>

            <option value="SEVA_PROCESS">
              Seva request processing
            </option>
          </select>
        </label>

        <label>
          <span>
            {permission === "EVENT_SCAN"
              ? "EVENT"
              : "SEVA REQUEST"}
          </span>

          <select
            value={resourceId}
            onChange={event =>
              setResourceId(event.target.value)
            }
            required
          >
            <option value="">
              Select specific work
            </option>

            {resources.map(item => (
              <option
                value={item.id}
                key={item.id}
              >
                {item.label} — {item.meta}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>ASSIGNEE EMAIL</span>

          <input
            type="email"
            value={email}
            onChange={event =>
              setEmail(event.target.value)
            }
            placeholder="registered@campusconnect.edu"
            autoComplete="off"
            required
          />
        </label>

        <label>
          <span>ACCESS EXPIRES</span>

          <input
            type="datetime-local"
            value={expiresAt}
            onChange={event =>
              setExpiresAt(event.target.value)
            }
            required
          />
        </label>

        <label className="campusDelegationReason">
          <span>REASON / INSTRUCTIONS</span>

          <textarea
            value={reason}
            onChange={event =>
              setReason(event.target.value)
            }
            maxLength={300}
            placeholder="Explain the assigned responsibility…"
          />
        </label>

        <div className="campusDelegationSubmit">
          <small>
            Maximum access duration is 90 days.
            The email must already have a verified
            CampusConnect account.
          </small>

          <button
            type="submit"
            className="primary"
            disabled={
              saving ||
              loading ||
              resources.length === 0
            }
          >
            {saving
              ? "Assigning…"
              : "Assign work securely"}
          </button>
        </div>
      </form>

      <div className="campusDelegationList">
        <header>
          <div>
            <span>ACTIVE AUTHORIZATIONS</span>
            <h4>
              {activeDelegations.length}
              {" "}
              active delegation
              {activeDelegations.length === 1
                ? ""
                : "s"}
            </h4>
          </div>

          <button
            type="button"
            className="ghost"
            onClick={() =>
              void loadDelegationData()
            }
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </header>

        {activeDelegations.map(item => (
          <article
            className="campusDelegationRow"
            key={item.id}
          >
            <div className="campusDelegationIcon">
              {item.permission === "EVENT_SCAN"
                ? "▣"
                : "✉"}
            </div>

            <div>
              <strong>
                {item.assignee_name ||
                  "Campus member"}
              </strong>

              <p>{item.assignee_email}</p>

              <small>
                {permissionLabels[item.permission]}
                {" · "}
                {item.resource_label}
              </small>

              {item.reason && (
                <em>{item.reason}</em>
              )}
            </div>

            <div className="campusDelegationExpiry">
              <small>EXPIRES</small>
              <time>
                {formatDelegationDate(
                  item.expires_at
                )}
              </time>

              <button
                type="button"
                onClick={() =>
                  void revokeDelegation(item)
                }
                disabled={
                  revokingId === item.id
                }
              >
                {revokingId === item.id
                  ? "Revoking…"
                  : "Revoke"}
              </button>
            </div>
          </article>
        ))}

        {!loading &&
          activeDelegations.length === 0 && (
            <div className="campusDelegationEmpty">
              No active work delegations.
            </div>
          )}

        {pastDelegations.length > 0 && (
          <details className="campusDelegationHistory">
            <summary>
              Previous delegations
              {" "}
              ({pastDelegations.length})
            </summary>

            {pastDelegations.map(item => (
              <div key={item.id}>
                <span>
                  {item.assignee_email}
                </span>

                <small>
                  {item.resource_label}
                  {" · "}
                  {item.revoked_at
                    ? "Revoked"
                    : "Expired"}
                </small>
              </div>
            ))}
          </details>
        )}
      </div>
    </section>
  );
}
