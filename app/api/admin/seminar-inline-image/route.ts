import { NextResponse } from "next/server";

import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_IMAGE_SIZE_BYTES = 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const adminClient = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, role, organization_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ message: "Unable to load your profile." }, { status: 403 });
  }

  if (profile.role !== "admin") {
    return NextResponse.json({ message: "Only administrators can upload seminar images." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "An image file is required." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ message: "Only image files are allowed." }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return NextResponse.json({ message: "Image size must be 1 MB or less." }, { status: 400 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const filePath = `${profile.organization_id}/inline/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await adminClient.storage.from("seminar-media").upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type
  });

  if (uploadError) {
    return NextResponse.json({ message: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = adminClient.storage.from("seminar-media").getPublicUrl(filePath);

  return NextResponse.json({ url: publicUrlData.publicUrl });
}
