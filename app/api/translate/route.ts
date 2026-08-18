import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type TranslationItem = { id: string; text: string };

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const deeplKey = process.env.DEEPL_API_KEY;

  if (!supabaseUrl || !supabaseKey || !deeplKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { items?: TranslationItem[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const items = (body.items ?? [])
    .filter((item) => item?.id && typeof item.text === "string" && item.text.trim())
    .slice(0, 50);

  if (!items.length) {
    return NextResponse.json({ translations: [] });
  }

  const totalChars = items.reduce((sum, item) => sum + item.text.length, 0);
  if (totalChars > 100_000) {
    return NextResponse.json({ error: "Translation batch too large" }, { status: 413 });
  }

  const response = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${deeplKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: items.map((item) => item.text),
      target_lang: "EN",
      preserve_formatting: true,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    return NextResponse.json(
      { error: "DeepL translation failed", details: details.slice(0, 300) },
      { status: 502 },
    );
  }

  const data = (await response.json()) as {
    translations?: Array<{ text: string; detected_source_language?: string }>;
  };

  const translations = items.map((item, index) => ({
    id: item.id,
    text: data.translations?.[index]?.text ?? item.text,
    detectedSourceLanguage: data.translations?.[index]?.detected_source_language ?? null,
  }));

  return NextResponse.json({ translations });
}
