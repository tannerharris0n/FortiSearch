export default function SearchBar({ value, onChange, resultCount, totalCount }) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <span
          aria-hidden
          className="absolute left-4 top-1/2 -translate-y-1/2 text-inkFaint pointer-events-none"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search products, tags, deployment types..."
          className="w-full pl-11 pr-12 py-3.5 bg-surface border border-border rounded-xl text-[15px] text-ink placeholder:text-inkFaint focus:border-forti shadow-card"
          autoFocus
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center rounded-md text-inkDim hover:text-ink hover:bg-surfaceAlt transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <div className="text-[12.5px] text-inkDim font-mono px-1">
        {value.trim().length >= 2 ? (
          <>
            <span className="text-ink font-medium">{resultCount}</span> of{' '}
            <span className="text-inkDim">{totalCount}</span> products
          </>
        ) : (
          <>
            <span className="text-ink font-medium">{totalCount}</span> products in catalog
          </>
        )}
      </div>
    </div>
  );
}
