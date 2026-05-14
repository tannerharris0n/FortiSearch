export default function CategoryFilter({ categories, active, onChange, productsByCategory }) {
  return (
    <div className="-mx-1 px-1 overflow-x-auto no-scrollbar">
      <div className="flex gap-1.5 pb-1 whitespace-nowrap">
        {categories.map((cat) => {
          const isActive = cat === active;
          const list = productsByCategory[cat] || [];
          const hasEol = list.some((p) => p.eol?.status === 'eol' || p.eol?.status === 'legacy');
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onChange(cat)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
                isActive
                  ? 'text-white border-transparent'
                  : 'text-inkDim border-border bg-surface hover:bg-surfaceAlt hover:border-borderHover'
              }`}
              style={isActive ? { background: '#EE3124' } : undefined}
            >
              {cat}
              {cat !== 'All' && (
                <span
                  className={`text-[11px] font-mono px-1 rounded ${
                    isActive ? 'bg-white/20 text-white' : 'text-inkFaint'
                  }`}
                >
                  {list.length}
                </span>
              )}
              {hasEol && cat !== 'All' && (
                <span
                  className={`text-[9.5px] font-semibold uppercase tracking-wider px-1.5 rounded-sm ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-roseDim text-rose'
                  }`}
                >
                  EOL
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
