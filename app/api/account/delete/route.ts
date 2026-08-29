import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";


export async function POST(
  request: NextRequest
) {
  try {
    const authorization =
      request.headers.get(
        "authorization"
      );

    const token =
      authorization?.replace(
        /^Bearer\s+/i,
        ""
      );

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }


    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const publicKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const serviceKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;


    if (
      !supabaseUrl ||
      !publicKey ||
      !serviceKey
    ) {
      return NextResponse.json(
        {
          error:
            "Server configuration is incomplete.",
        },
        {
          status: 500,
        }
      );
    }


    /*
     * Client representing the logged-in user.
     */
    const userClient =
      createClient(
        supabaseUrl,
        publicKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          global: {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        }
      );


    const {
      data,
      error: userError,
    } =
      await userClient.auth
        .getUser(token);


    if (
      userError ||
      !data.user
    ) {
      return NextResponse.json(
        {
          error:
            "Your session is invalid or expired.",
        },
        {
          status: 401,
        }
      );
    }


    /*
     * Service-role client exists ONLY server-side.
     */
    const adminClient =
      createClient(
        supabaseUrl,
        serviceKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );


    /*
     * Protect Main Admin from accidentally destroying
     * the only administrative account.
     */
    const {
      data: profile,
      error: profileError,
    } =
      await adminClient
        .from("profiles")
        .select(
          "id,role"
        )
        .eq(
          "id",
          data.user.id
        )
        .maybeSingle();


    if (profileError) {
      throw profileError;
    }


    if (
      profile?.role ===
      "Main Admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Main Admin accounts cannot delete themselves from this screen.",
        },
        {
          status: 403,
        }
      );
    }


    const {
      error: deleteError,
    } =
      await adminClient
        .auth
        .admin
        .deleteUser(
          data.user.id
        );


    if (deleteError) {
      throw deleteError;
    }


    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error(
      "ACCOUNT DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete account.",
      },
      {
        status: 500,
      }
    );
  }
}
