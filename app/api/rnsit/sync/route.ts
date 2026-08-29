import {NextRequest, NextResponse} from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const CONNECTOR_URL = process.env.RNSIT_CONNECTOR_URL || "";
const CONNECTOR_TOKEN = process.env.RNSIT_CONNECTOR_TOKEN || "";

type Row = Record<string, unknown>;

type ConnectorPayload = {
  attendance?: Row[];
  marks?: Row[];
  results?: Row[];
  fees?: Row[];
  courses?: Row[];
};

async function supabase(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation", ...(init.headers || {})},
  });
}

async function getUser(jwt: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {headers: {apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "", Authorization: `Bearer ${jwt}`}});
  if (!response.ok) return null;
  return response.json() as Promise<{id:string}>;
}

export async function POST(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({error:"Server database credentials are not configured."},{status:503});
    const jwt = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
    const user = await getUser(jwt);
    if (!user?.id) return NextResponse.json({error:"Sign in again before connecting RNSIT."},{status:401});
    const {usn, dob} = await request.json() as {usn?:string;dob?:string};
    if (!usn || !dob) return NextResponse.json({error:"USN and date of birth are required."},{status:400});
    if (!CONNECTOR_URL) {
      await supabase("college_connections?on_conflict=student_id", {method:"POST", body:JSON.stringify({student_id:user.id, provider:"RNSIT Contineo", external_username:usn.toUpperCase(), status:"pending", last_error:"RNSIT connector endpoint not configured", updated_at:new Date().toISOString()})});
      return NextResponse.json({error:"The CampusConnect side is ready, but RNSIT/Contineo does not publish a public student-data API. Configure RNSIT_CONNECTOR_URL after obtaining an approved endpoint or integration from RNSIT/Contineo."},{status:503});
    }

    const upstream = await fetch(CONNECTOR_URL, {method:"POST", headers:{"Content-Type":"application/json", ...(CONNECTOR_TOKEN ? {Authorization:`Bearer ${CONNECTOR_TOKEN}`} : {})}, body:JSON.stringify({usn:usn.toUpperCase(), dob})});
    const payload = await upstream.json().catch(() => ({})) as ConnectorPayload & {error?:string};
    if (!upstream.ok) throw new Error(payload.error || "RNSIT rejected the login or sync request.");

    const now = new Date().toISOString();
    const attach = (rows: Row[] | undefined) => (rows || []).map(row => ({...row, student_id:user.id, provider:"RNSIT Contineo", synced_at:now}));
    const attendance = attach(payload.attendance), marks = attach(payload.marks), results = attach(payload.results), fees = attach(payload.fees);
    if (attendance.length) await supabase("college_attendance?on_conflict=student_id,provider,subject_code", {method:"POST", body:JSON.stringify(attendance)});
    if (marks.length) await supabase("college_marks?on_conflict=student_id,provider,subject_code,assessment", {method:"POST", body:JSON.stringify(marks)});
    if (results.length) await supabase("college_results?on_conflict=student_id,provider,semester", {method:"POST", body:JSON.stringify(results)});
    if (fees.length) await supabase("college_fees?on_conflict=student_id,provider,fee_key", {method:"POST", body:JSON.stringify(fees)});
    await supabase("college_connections?on_conflict=student_id", {method:"POST", body:JSON.stringify({student_id:user.id, provider:"RNSIT Contineo", external_username:usn.toUpperCase(), status:"connected", last_synced_at:now, last_error:"", updated_at:now})});
    return NextResponse.json({ok:true, attendanceCount:attendance.length, marksCount:marks.length, resultCount:results.length, feeCount:fees.length});
  } catch (error) {
    return NextResponse.json({error:error instanceof Error ? error.message : "RNSIT sync failed."},{status:502});
  }
}
