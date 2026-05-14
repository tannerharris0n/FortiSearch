import { useMemo, useState } from 'react';
import data from './data/products.json';
import useProductSearch from './hooks/useProductSearch.js';
import Nav from './components/Nav.jsx';
import SearchBar from './components/SearchBar.jsx';
import CategoryFilter from './components/CategoryFilter.jsx';
import ProductCard from './components/ProductCard.jsx';
import ProductDetail from './components/ProductDetail.jsx';
import FreshnessIndicator from './components/FreshnessIndicator.jsx';

export default function App() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [openProduct, setOpenProduct] = useState(null);

  const { products, uiCategories, meta } = data;

  const productsByCategory = useMemo(() => {
    const map = { All: products };
    for (const p of products) {
      const k = p.uiCategory || 'Other';
      if (!map[k]) map[k] = [];
      map[k].push(p);
    }
    return map;
  }, [products]);

  const filtered = useProductSearch(products, query, activeCategory);

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Nav />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-5 lg:px-8 py-6 lg:py-10">
        <div className="mb-6 lg:mb-8">
          <h1 className="text-[24px] lg:text-[28px] font-bold text-ink tracking-tight mb-1">
            Fortinet product intelligence
          </h1>
          <p className="text-[14px] lg:text-[15px] text-inkDim leading-relaxed max-w-2xl">
            Fuzzy search the full Fortinet catalog. Firmware versions, deployment variants,
            doc links, and EOL status in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 lg:gap-8">
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <SearchBar
              value={query}
              onChange={setQuery}
              resultCount={filtered.length}
              totalCount={products.length}
            />
            <div className="lg:hidden">
              <CategoryFilter
                categories={uiCategories}
                active={activeCategory}
                onChange={setActiveCategory}
                productsByCategory={productsByCategory}
              />
            </div>
            <div className="hidden lg:block bg-surface border border-border rounded-xl p-3 shadow-card">
              <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-inkFaint mb-2 px-1">
                Category
              </div>
              <div className="space-y-0.5">
                {uiCategories.map((cat) => {
                  const list = productsByCategory[cat] || [];
                  const isActive = cat === activeCategory;
                  const hasEol = list.some((p) => p.eol?.status === 'eol' || p.eol?.status === 'legacy');
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-[13.5px] flex items-center justify-between gap-2 transition-colors ${
                        isActive
                          ? 'text-white font-semibold'
                          : 'text-inkBody hover:bg-surfaceAlt'
                      }`}
                      style={isActive ? { background: '#EE3124' } : undefined}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        {cat}
                        {hasEol && cat !== 'All' && (
                          <span
                            className={`text-[9px] font-semibold uppercase tracking-wider px-1 rounded-sm ${
                              isActive ? 'bg-white/25 text-white' : 'bg-roseDim text-rose'
                            }`}
                          >
                            EOL
                          </span>
                        )}
                      </span>
                      <span
                        className={`text-[11px] font-mono ${isActive ? 'text-white/85' : 'text-inkFaint'}`}
                      >
                        {cat === 'All' ? products.length : list.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="hidden lg:block text-[11.5px] font-mono text-inkFaint leading-relaxed px-1">
              Tip: search across product names, tags, deployment types, and category labels.
              Threshold tuned for typo-tolerant matching.
            </p>
          </aside>

          <section>
            {filtered.length === 0 ? (
              <div className="text-center py-16 px-6 bg-surface border border-border rounded-xl">
                <div className="text-[44px] mb-2">∅</div>
                <h3 className="text-[17px] font-semibold text-ink mb-1">No matches</h3>
                <p className="text-[13.5px] text-inkDim">
                  Try a broader query, a tag like &quot;NGFW&quot; or &quot;SASE&quot;, or clear the category filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} onOpen={setOpenProduct} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <FreshnessIndicator meta={meta} />

      <ProductDetail product={openProduct} onClose={() => setOpenProduct(null)} />
    </div>
  );
}
