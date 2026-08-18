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

// Common functional words in Spanish and English. The index is meant to surface
// concepts, not the grammatical scaffolding of the notes.
const STOP_WORDS = new Set([
  // Spanish
  "a", "al", "algo", "algun", "alguna", "algunas", "alguno", "algunos", "ante", "antes", "aquel", "aquella",
  "aquellas", "aquello", "aquellos", "aqui", "asi", "aun", "aunque", "bajo", "bien", "cada", "casi", "como", "con",
  "contra", "cual", "cuales", "cuando", "cuanto", "cuantos", "de", "del", "desde", "donde", "dos", "durante", "e",
  "el", "ella", "ellas", "ello", "ellos", "en", "entre", "era", "eramos", "eran", "eras", "eres", "es", "esa", "esas",
  "ese", "eso", "esos", "esta", "estaba", "estaban", "estado", "estamos", "estan", "estar", "estas", "este", "esto",
  "estos", "fue", "fuera", "fueron", "ha", "hace", "hacia", "han", "hasta", "hay", "la", "las", "le", "les", "lo",
  "los", "mas", "me", "mi", "mientras", "mis", "mismo", "mucha", "muchas", "mucho", "muchos", "muy", "nada", "ni",
  "no", "nos", "nuestra", "nuestro", "o", "otra", "otras", "otro", "otros", "para", "pero", "poco", "por", "porque",
  "que", "quien", "quienes", "se", "sea", "segun", "ser", "si", "sin", "sobre", "son", "su", "sus", "tal", "tambien",
  "te", "tener", "tiene", "tienen", "todo", "todos", "tras", "tu", "tus", "un", "una", "unas", "uno", "unos", "usted",
  "ustedes", "ya", "y",

  // English
  "a", "about", "above", "after", "again", "against", "all", "also", "am", "an", "and", "any", "are", "around", "as",
  "at", "back", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "could", "did",
  "do", "does", "doing", "down", "during", "each", "few", "for", "from", "further", "had", "has", "have", "having", "he",
  "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself",
  "just", "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "only", "or",
  "other", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so", "some", "such", "than", "that",
  "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too",
  "under", "until", "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why",
  "will", "with", "would", "you", "your", "yours", "yourself", "yourselves",
]);

// Frequent verb forms that tend to describe actions rather than the visual/conceptual
// subject of a note. Kept deliberately conservative to avoid deleting useful nouns.
const VERB_WORDS = new Set([
  // Spanish
  "abri", "abrio", "abre", "abren", "abrir", "cerrar", "cerro", "cierra", "hago", "hace", "hacen", "hacer", "hizo",
  "veo", "ver", "vemos", "visto", "parece", "parecen", "parecer", "quiero", "quiere", "quieren", "querer", "gusta", "gustan",
  "gustar", "interesa", "interesan", "interesar", "funciona", "funcionan", "funcionar", "utiliza", "utilizan", "utilizar",
  "usa", "usan", "usar", "crea", "crean", "crear", "muestra", "muestran", "mostrar", "genera", "generan", "generar",
  "tiene", "tienen", "tener", "puede", "pueden", "poder", "debe", "deben", "deber", "daria", "diria", "quiero",
  // English
  "aim", "aimed", "aiming", "looks", "look", "looking", "seems", "seem", "using", "uses", "use", "used", "make", "makes",
  "making", "made", "show", "shows", "showing", "create", "creates", "creating", "created", "feel", "feels", "feeling",
  "like", "likes", "liked", "want", "wants", "wanted", "work", "works", "working", "worked", "give", "gives", "giving",
]);

function normalizeWord(word: string) {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Lightweight linguistic normalization: accents/case + conservative singularization.
// This lets "textura/texturas" or "texture/textures" count as the same concept.
function canonicalWord(rawWord: string) {
  let word = normalizeWord(rawWord);

  if (word.length > 5 && word.endsWith("es")) word = word.slice(0, -2);
  else if (word.length > 4 && word.endsWith("s")) word = word.slice(0, -1);

  return word;
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

    if (error) setMessage(error.message);
    else setImages(data ?? []);

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

    const { error: insertError } = await supabase.from("images").insert({ file_path: filePath });

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
        .match(/[\p{L}]+/gu)
        ?.map(canonicalWord)
        .filter(
          (word) =>
            word.length >= 4 &&
            !STOP_WORDS.has(word) &&
            !VERB_WORDS.has(word),
        ) ?? [];

      // One vote maximum per image: the count measures in how many relics a concept occurs.
      for (const word of new Set(words)) {
        counts.set(word, (counts.get(word) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 30);
  }, [images]);

  const filteredImages = useMemo(() => {
    const searchTerm = normalizeWord(query.trim());
    const wordFilter = normalizeWord(activeWord);

    return images.filter((image) => {
      const searchable = normalizeWord(
        [image.title, image.author, image.source, image.notes].filter(Boolean).join(" "),
      );
      const noteWords = image.notes?.match(/[\p{L}]+/gu)?.map(canonicalWord) ?? [];

      const matchesSearch = !searchTerm || searchable.includes(searchTerm);
      const matchesWord = !wordFilter || noteWords.includes(wordFilter);

      return matchesSearch && matchesWord;
    });
  }, [images, query, activeWord]);

  function publicUrl(filePath: string) {
    return supabase.storage.from("images").getPublicUrl(filePath).data.publicUrl;
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <aside className="fixed bottom-0 left-0 top-0 z-20 w-52 overflow-y-auto border-r border-black/10 bg-white px-6 py-6">
        <nav>
          <h1 className="mb-8 text-sm font-semibold tracking-[0.18em]">EYE RELICS</h1>

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="mb-8 w-full border-b border-black/20 bg-transparent py-2 text-sm outline-none transition-colors placeholder:text-black/35 focus:border-black"
          />

          <button
            onClick={() => setActiveWord("")}
            className={`mb-8 block text-xs font-medium uppercase tracking-widest transition-opacity hover:opacity-40 ${activeWord ? "opacity-35" : ""}`}
          >
            All
          </button>

          <p className="mb-4 text-[10px] uppercase tracking-[0.18em] text-black/35">Words</p>

          {keywords.length === 0 ? (
            <p className="text-xs leading-5 text-black/30">No recurring words yet</p>
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

      <section className="ml-52 min-h-screen p-3">
        {message && <p className="mb-3 px-3 text-xs text-black/50">{message}</p>}

        {loading ? (
          <p className="p-3 text-xs text-black/30">Loading...</p>
        ) : filteredImages.length === 0 ? (
          <div className="flex min-h-[70vh] items-center justify-center">
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
            className="fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-black text-2xl font-light text-white shadow-sm transition-opacity hover:opacity-65 disabled:opacity-25"
          >
            {uploading ? "·" : "+"}
          </button>
        </>
      ) : (
        <a
          href="/login"
          className="fixed bottom-6 right-6 z-30 text-[10px] uppercase tracking-[0.18em] text-black/35 hover:text-black"
        >
          Login
        </a>
      )}
    </main>
  );
}
