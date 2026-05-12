import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return new NextResponse("Missing file path", { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from("application-documents")
      .download(path);

    if (error || !data) {
      console.error("Proxy download error:", error);
      return new NextResponse("Failed to download file", { status: 404 });
    }

    const buffer = await data.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": data.type,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("Proxy download catch error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
