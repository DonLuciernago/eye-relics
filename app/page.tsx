"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Relic = {
  id: string;
  file_path: string;
  title: string | null;
  author: string | null;
  source: string | null;
  url: string | null;
  notes: string | null;
  created_at: string;
};

const STOP_WORDS = new Set([
  "para", "pero", "porque", "como", "esta", "este", "esto", "estos", "estas", "esa", "ese", "eso", "esas", "esos",
  "con", "sin", "sobre", "entre", "desde", "hasta", "hacia", "por", "del", "las", "los", "una", "uno", "unos", "unas",
  "que", "qué", "muy", "más", "mas", "menos", "hay", "ser", "son", "era", "fue", "han", "tiene", "tienen", "me", "mi", "mis",
  "tu", "sus", "su", "se", "lo", "la", "el", "de", "y", "o", "a", "en", "un", "al", "ya", "no", "si", "sí",
  "the", "and", "for", "with", "without", "from", "into", "onto", "this", "that", "these", "those", "very", "more", "less",
  "about", "over", "under", "between", "through", "because", "what", "when", "where", "which", "who", "how", "its", "his", "her",
  "their", "our", "your", "you", "they", "them", "we", "are", "was", "were", "is", "be", "been", "being", "of", "to", "in",
  "on", "at", "by", "an", "a", "or", "not", "it", "as",
]);

function normalizeWord(word: string) {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [images, setImages] = useState<Relic[]>([]);
  const [query, setQuery] = useState("");
  const [activeWord, setActiveWord] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadImages();
  }, []);

  async function loadImages() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("images")
      .select("id,file_path,title,author,source,url,notes,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setImages(data ?? []);
    }

    setLoading(false);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !session) return;

    setUploading(true);
    setMessage("");

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setMessage(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from("images").insert({
      file_path: filePath,
    });

    if (insertError) {
      await supabase.storage.from("images").remove([filePath]);
      setMessage(insertError.message);
      setUploading(false);
      return;
    }

    await loadImages();
    setUploading(false);
  }

  const keywords = useMemo(() => {
    const counts = new Map<string, number>();

    for (const image of images) {
      if (!image.notes) continue;

      const words = image.notes
        .match(/[\p{L}\p{N}]+/gu)
        ?.map(normalizeWord)
        .filter((word) => word.length >= 4 && !STOP_WORDS.has(word)) ?? [];

      const uniqueWordsInImage = new Set(words);
      for (const word of uniqueWordsInImage) {
        counts.set(word, (counts.get(word) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 30);
  }, [images]);

  const filteredImages = useMemo(() => {
    const searchTerm = normalizeWord(query.trim());
    const wordFilter = normalizeWord(activeWord);

    return images.filter((image) => {
      const searchable = normalizeWord(
        [image.title, image.author, image.source, image.notes]
          .filter(Boolean)
          .join(" "),
      );

      const matchesSearch = !searchTerm || searchable.includes(searchTerm);
      const matchesWord = !wordFilter || normalizeWord(image.notes ?? "").includes(wordFilter);

      return matchesSearch && matchesWord;
    });
  }, [images, query, activeWord]);

  function publicUrl(filePath: string) {
    return supabase.storage.from("images").getPublicUrl(filePath).data.publicUrl;
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="fixed left-0 right-0 top-0 z-20 flex h-16 items-center border-b border-black/10 bg-white px-6">
        <h1 className="w-52 text-sm font-semibold tracking-[0.18em]">EYE RELICS</h1>

        <div className="flex flex-1 justify-center">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="w-full max-w-xl border-b border-black/20 bg-transparent px-1 py-2 text-sm outline-none transition-colors placeholder:text-black/35 focus:border-black"
          />
        </div>

        <div className="flex w-52 justify-end">
          {session ? (
            <>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                aria-label="Add image"
                title={uploading ? "Uploading" : "Add image"}
                className="flex h-9 w-9 items-center justify-center text-2xl font-light transition-opacity hover:opacity-40 disabled:opacity-25"
              >
                {uploading ? "·" : "+"}
              </button>
            </>
          ) : (
            <a href="/login" className="text-[10px] uppercase tracking-[0.18em] text-black/35 hover:text-black">
              Login
            </a>
          )}
        </div>
      </header>

      <div className="flex pt-16">
        <aside className="fixed bottom-0 left-0 top-16 w-52 overflow-y-auto border-r border-black/10 px-6 py-8">
          <nav>
            <button
              onClick={() => setActiveWord("")}
              className={`mb-8 block text-xs font-medium uppercase tracking-widest transition-opacity hover:opacity-40 ${activeWord ? "opacity-35" : ""}`}
            >
              All
            </button>

            <p className="mb-4 text-[10px] uppercase tracking-[0.18em] text-black/35">Words</p>

            {keywords.length === 0 ? (
              <p className="text-xs leading-5 text-black/30">No words yet</p>
            ) : (
              <div className="space-y-2">
                {keywords.map(([word, count]) => (
                  <button
                    key={word}
                    onClick={() => setActiveWord(activeWord === word ? "" : word)}
                    className={`flex w-full items-center justify-between text-left text-sm transition-opacity hover:opacity-40 ${activeWord === word ? "font-medium" : ""}`}
                  >
                    <span>{word}</span>
                    <span className="text-xs text-black/30">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </nav>
        </aside>

        <section className="ml-52 w-[calc(100%-13rem)] p-6">
          {message && <p className="mb-6 text-xs text-black/50">{message}</p>}

          {loading ? (
            <p className="text-xs text-black/30">Loading...</p>
          ) : filteredImages.length === 0 ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <p className="text-xs text-black/30">
                {images.length === 0 ? (session ? "Use + to add the first relic." : "No relics yet.") : "No results."}
              </p>
            </div>
          ) : (
            <div className="columns-2 gap-3 md:columns-3 lg:columns-4 xl:columns-5">
              {filteredImages.map((image) => (
                <Link
                  key={image.id}
                  href={`/relic/${image.id}`}
                  title={image.title ?? undefined}
                  className="mb-3 block w-full break-inside-avoid overflow-hidden bg-zinc-100 transition-opacity hover:opacity-75"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicUrl(image.file_path)}
                    alt={image.title || "Eye Relic"}
                    className="h-auto w-full"
                    loading="lazy"
                  />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
