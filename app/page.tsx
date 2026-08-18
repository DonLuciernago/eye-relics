const tags = [
  ["photography", 24],
  ["design", 18],
  ["texture", 15],
  ["typography", 12],
  ["architecture", 9],
  ["red", 7],
  ["digital", 6],
];

const placeholders = [
  { height: 320 },
  { height: 460 },
  { height: 260 },
  { height: 390 },
  { height: 520 },
  { height: 300 },
  { height: 430 },
  { height: 350 },
  { height: 480 },
  { height: 280 },
  { height: 410 },
  { height: 330 },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-20 flex h-16 items-center border-b border-black/10 bg-white px-6">
        <h1 className="w-52 text-sm font-semibold tracking-[0.18em]">
          EYE RELICS
        </h1>

        <div className="flex flex-1 justify-center">
          <input
            type="search"
            placeholder="Search"
            className="w-full max-w-xl border-b border-black/20 bg-transparent px-1 py-2 text-sm outline-none transition-colors placeholder:text-black/35 focus:border-black"
          />
        </div>

        <div className="flex w-52 justify-end">
          <button
            type="button"
            aria-label="Add image"
            className="flex h-9 w-9 items-center justify-center text-2xl font-light transition-opacity hover:opacity-40"
          >
            +
          </button>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className="fixed bottom-0 left-0 top-16 w-52 overflow-y-auto border-r border-black/10 px-6 py-8">
          <nav>
            <button className="mb-8 block text-xs font-medium uppercase tracking-widest">
              All
            </button>

            <p className="mb-4 text-[10px] uppercase tracking-[0.18em] text-black/35">
              Tags
            </p>

            <div className="space-y-2">
              {tags.map(([tag, count]) => (
                <button
                  key={tag}
                  className="flex w-full items-center justify-between text-left text-sm transition-opacity hover:opacity-40"
                >
                  <span>{tag}</span>
                  <span className="text-xs text-black/30">{count}</span>
                </button>
              ))}
            </div>
          </nav>
        </aside>

        {/* Gallery */}
        <section className="ml-52 w-[calc(100%-13rem)] p-6">
          <div className="columns-2 gap-3 md:columns-3 lg:columns-4 xl:columns-5">
            {placeholders.map((item, index) => (
              <button
                key={index}
                className="mb-3 block w-full break-inside-avoid overflow-hidden bg-zinc-100 transition-opacity hover:opacity-75"
                style={{ height: `${item.height}px` }}
                aria-label={`Placeholder image ${index + 1}`}
              >
                <span className="text-xs text-black/20">{index + 1}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}