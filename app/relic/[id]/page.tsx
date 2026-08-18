"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
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

type FormState = {
  title: string;
  author: string;
  source: string;
  url: string;
  notes: string;
};

const emptyForm: FormState = {
  title: "",
  author: "",
  source: "",
  url: "",
  notes: "",
};

export default function RelicPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [session, setSession] = useState<Session | null>(null);
  const [relic, setRelic] = useState<Relic | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!id) return;
    loadRelic();
  }, [id]);

  async function loadRelic() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("images")
      .select("id,file_path,title,author,source,url,notes,created_at")
      .eq("id", id)
      .single();

    if (error) {
      setMessage(error.message);
      setRelic(null);
    } else {
      setRelic(data);
      setForm({
        title: data.title ?? "",
        author: data.author ?? "",
        source: data.source ?? "",
        url: data.url ?? "",
        notes: data.notes ?? "",
      });
    }

    setLoading(false);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!session || !relic) return;

    setSaving(true);
    setMessage("");

    const payload = {
      title: form.title.trim() || null,
      author: form.author.trim() || null,
      source: form.source.trim() || null,
      url: form.url.trim() || null,
      notes: form.notes.trim() || null,
    };

    const { error } = await supabase.from("images").update(payload).eq("id", relic.id);

    if (error) {
      setMessage(error.message);
    } else {
      setRelic({ ...relic, ...payload });
      setEditing(false);
    }

    setSaving(false);
  }

  const imageUrl = useMemo(() => {
    if (!relic) return "";
    return supabase.storage.from("images").getPublicUrl(relic.file_path).data.publicUrl;
  }, [relic]);

  if (loading) {
    return <main className="min-h-screen bg-white p-6 text-xs text-black/30">Loading...</main>;
  }

  if (!relic) {
    return (
      <main className="min-h-screen bg-white p-6 text-black">
        <Link href="/" className="text-xs uppercase tracking-[0.18em] text-black/40 hover:text-black">← Back</Link>
        <p className="mt-12 text-sm text-black/50">Relic not found.</p>
        {message && <p className="mt-3 text-xs text-black/35">{message}</p>}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="flex h-16 items-center justify-between border-b border-black/10 px-6">
        <Link href="/" className="text-xs uppercase tracking-[0.18em] text-black/40 transition-colors hover:text-black">← Back</Link>
        <Link href="/" className="text-sm font-semibold tracking-[0.18em]">EYE RELICS</Link>
        <div className="w-20 text-right">
          {session && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-[10px] uppercase tracking-[0.18em] text-black/40 transition-colors hover:text-black"
            >
              Edit
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-10 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14 lg:px-10 lg:py-10">
        <section className="flex min-h-[70vh] items-start justify-center bg-zinc-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={relic.title || "Eye Relic"}
            className="max-h-[calc(100vh-8rem)] max-w-full object-contain"
          />
        </section>

        <aside className="pb-12">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-7">
              <Field label="Title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
              <Field label="Author" value={form.author} onChange={(value) => setForm({ ...form, author: value })} />
              <Field label="Source" value={form.source} onChange={(value) => setForm({ ...form, source: value })} />
              <Field label="URL" value={form.url} onChange={(value) => setForm({ ...form, url: value })} type="url" />

              <label className="block">
                <span className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-black/35">Note</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  rows={7}
                  className="w-full resize-y border border-black/15 bg-transparent p-3 text-sm leading-6 outline-none focus:border-black"
                />
              </label>

              <div className="flex gap-5 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="text-[10px] font-medium uppercase tracking-[0.18em] transition-opacity hover:opacity-40 disabled:opacity-30"
                >
                  {saving ? "Saving" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      title: relic.title ?? "",
                      author: relic.author ?? "",
                      source: relic.source ?? "",
                      url: relic.url ?? "",
                      notes: relic.notes ?? "",
                    });
                    setEditing(false);
                    setMessage("");
                  }}
                  className="text-[10px] uppercase tracking-[0.18em] text-black/35 transition-colors hover:text-black"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-8">
              <div>
                <h1 className="text-lg font-medium leading-7">{relic.title || "Untitled"}</h1>
                {relic.author && <p className="mt-1 text-sm text-black/55">{relic.author}</p>}
              </div>

              {(relic.source || relic.url) && (
                <div className="space-y-2 text-sm">
                  {relic.source && (
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-black/30">Source</p>
                      <p>{relic.source}</p>
                    </div>
                  )}
                  {relic.url && (
                    <a
                      href={relic.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-xs underline decoration-black/20 underline-offset-4 hover:decoration-black"
                    >
                      Open original ↗
                    </a>
                  )}
                </div>
              )}

              {relic.notes && (
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-black/30">Note</p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-black/75">{relic.notes}</p>
                </div>
              )}

              {!relic.title && !relic.author && !relic.source && !relic.url && !relic.notes && (
                <p className="text-xs text-black/30">No information yet.</p>
              )}
            </div>
          )}

          {message && <p className="mt-8 text-xs text-black/45">{message}</p>}
        </aside>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-black/35">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border-b border-black/15 bg-transparent py-2 text-sm outline-none focus:border-black"
      />
    </label>
  );
}
