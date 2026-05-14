import FirmwareBadge, { UpdatedBadge } from './FirmwareBadge.jsx';

const CATEGORY_ACCENTS = {
  'Secure Networking': '#EE3124',
  'Unified SASE': '#7C3AED',
  'Security Operations': '#2563EB',
  'Identity & Access': '#0EA5E9',
  'Email & Data Protection': '#0891B2',
  'Endpoint & EDR': '#16A34A',
  'Early Detection': '#B45309',
  'Cloud & DevSecOps': '#EC4899',
  'Voice & Surveillance': '#6366F1',
  'Legacy / EOL': '#9B9B9B',
};

export default function ProductCard({ product, onOpen }) {
  const isEol = product.eol?.status === 'eol';
  const isLegacy = product.eol?.status === 'legacy';
  const accent = CATEGORY_ACCENTS[product.uiCategory] || '#EE3124';

  return (
    <button
      type="button"
      onClick={() => onOpen(product)}
      className={`group text-left bg-surface border border-border rounded-xl p-4 shadow-card hover:shadow-cardHover hover:border-borderHover transition-all relative overflow-hidden ${
        isEol ? 'opacity-70' : ''
      }`}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: accent }}
      />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[15px] font-semibold text-ink leading-snug">
                {product.name}
              </h3>
              <UpdatedBadge firmware={product.firmware} />
            </div>
            <div className="mt-1 text-[11.5px] font-mono uppercase tracking-wider text-inkFaint">
              {product.subcategory}
            </div>
          </div>
        </div>

        <p className="text-[13.5px] text-inkBody leading-relaxed line-clamp-2 mb-3">
          {product.shortDescription}
        </p>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
          <FirmwareBadge firmware={product.firmware} />
          <div className="flex items-center gap-1.5">
            {isEol && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider text-rose bg-roseDim border border-roseBorder">
                EOL
              </span>
            )}
            {isLegacy && !isEol && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider text-amber bg-amberDim border border-amberBorder">
                Legacy
              </span>
            )}
            <span className="text-inkFaint group-hover:text-forti transition-colors text-[14px]">→</span>
          </div>
        </div>
      </div>
    </button>
  );
}
