import { useEffect, useState } from 'react';

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function CopyableVersion({ value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-inkFaint">—</span>;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${value}`}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-mono text-[12.5px] text-ink bg-surfaceAlt border border-border hover:border-borderHover hover:bg-hover transition-colors"
    >
      <span>{value}</span>
      <span className="text-[10px] text-inkFaint">{copied ? '✓' : 'copy'}</span>
    </button>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h4 className="text-[11px] font-mono uppercase tracking-[0.12em] text-inkFaint mb-2.5">
        {title}
      </h4>
      {children}
    </section>
  );
}

function LinkRow({ label, href }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-surfaceAlt hover:bg-hover border border-border hover:border-borderHover transition-colors text-[13.5px] text-ink group"
    >
      <span>{label}</span>
      <span className="text-inkFaint group-hover:text-forti transition-colors">↗</span>
    </a>
  );
}

export default function ProductDetail({ product, onClose }) {
  useEffect(() => {
    if (!product) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [product, onClose]);

  if (!product) return null;

  const isEol = product.eol?.status === 'eol';
  const isLegacy = product.eol?.status === 'legacy';
  const fw = product.firmware;
  const cloudDocs = product.cloudDocs && Object.entries(product.cloudDocs).filter(([, v]) => v);

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} details`}
    >
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />
      <div className="ml-auto w-full sm:w-[480px] h-full bg-surface shadow-panel border-l border-border overflow-y-auto animate-slideIn relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 inline-flex items-center justify-center rounded-md text-inkDim hover:text-ink hover:bg-surfaceAlt"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="px-6 sm:px-7 pt-7 pb-6 border-b border-border">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.12em] text-inkFaint mb-2">
            <span>{product.category}</span>
            <span>&middot;</span>
            <span>{product.subcategory}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h2 className="text-[22px] font-bold text-ink tracking-tight">{product.name}</h2>
            {isEol && (
              <span className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold uppercase tracking-wider text-rose bg-roseDim border border-roseBorder">
                EOL
              </span>
            )}
            {isLegacy && !isEol && (
              <span className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-semibold uppercase tracking-wider text-amber bg-amberDim border border-amberBorder">
                Legacy
              </span>
            )}
          </div>
          <p className="text-[14px] text-inkBody leading-relaxed">{product.shortDescription}</p>
        </div>

        <div className="px-6 sm:px-7 py-6 space-y-7">
          <Section title="Firmware Versions">
            {fw ? (
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <div className="text-[10.5px] font-mono uppercase tracking-wider text-inkFaint mb-1.5">
                    Recommended
                  </div>
                  <CopyableVersion value={fw.recommended} />
                </div>
                <div>
                  <div className="text-[10.5px] font-mono uppercase tracking-wider text-inkFaint mb-1.5">
                    GA
                  </div>
                  <CopyableVersion value={fw.ga} />
                </div>
                <div>
                  <div className="text-[10.5px] font-mono uppercase tracking-wider text-inkFaint mb-1.5">
                    Feature
                  </div>
                  <CopyableVersion value={fw.feature} />
                </div>
              </div>
            ) : (
              <div className="px-3 py-2.5 rounded-lg bg-infoDim border border-infoBorder text-info text-[13px]">
                Cloud-managed &mdash; no firmware versioning
              </div>
            )}
          </Section>

          {product.deploymentVariants?.length > 0 && (
            <Section title="Deployment Variants">
              <div className="flex flex-wrap gap-1.5">
                {product.deploymentVariants.map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-mono text-inkBody bg-surfaceAlt border border-border"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </Section>
          )}

          <Section title="Documentation">
            <div className="space-y-1.5">
              <LinkRow label="Docs Hub" href={product.links?.docs} />
              <LinkRow label="Admin Guide" href={product.links?.adminGuide} />
              <LinkRow label="Release Notes" href={product.links?.releaseNotes} />
              <LinkRow label="Cookbook Search" href={product.links?.cookbookSearch} />
              {(!product.links?.docs && !product.links?.adminGuide && !product.links?.releaseNotes) && (
                <div className="text-[12.5px] text-inkFaint italic">No doc links recorded.</div>
              )}
            </div>
          </Section>

          <Section title="Download &amp; Support">
            <div className="space-y-1.5">
              <LinkRow label="Firmware Download (Support Portal)" href={product.links?.firmwareDownload} />
              <LinkRow label="Product Page" href={product.links?.productPage} />
              <LinkRow label="Datasheet (PDF)" href={product.links?.datasheet} />
            </div>
          </Section>

          {cloudDocs && cloudDocs.length > 0 && (
            <Section title="Cloud-Specific Docs">
              <div className="space-y-1.5">
                {cloudDocs.map(([key, href]) => (
                  <LinkRow key={key} label={`${key.toUpperCase()} deployment guide`} href={href} />
                ))}
              </div>
            </Section>
          )}

          <Section title="Lifecycle">
            <div className="space-y-2 text-[13.5px] text-inkBody">
              <div className="flex items-center gap-2">
                <span className="text-inkFaint font-mono text-[11.5px] uppercase tracking-wider">Status</span>
                <span className="font-mono">
                  {product.eol?.status === 'active' && 'Active'}
                  {product.eol?.status === 'legacy' && 'Legacy (limited new sales)'}
                  {product.eol?.status === 'eol' && 'End of Life'}
                </span>
              </div>
              {product.eol?.date && (
                <div className="flex items-center gap-2">
                  <span className="text-inkFaint font-mono text-[11.5px] uppercase tracking-wider">EOL Date</span>
                  <span className="font-mono">{formatDate(product.eol.date)}</span>
                </div>
              )}
              {product.eol?.notes && (
                <div className="text-[13.5px] text-inkBody leading-relaxed pt-1">
                  {product.eol.notes}
                </div>
              )}
              {product.eol?.lifecycleUrl && (
                <a
                  href={product.eol.lifecycleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[13px] text-forti hover:underline"
                >
                  Fortinet product lifecycle page ↗
                </a>
              )}
            </div>
          </Section>

          {product.tags?.length > 0 && (
            <Section title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] text-inkDim bg-surfaceAlt border border-border"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Section>
          )}

          <div className="pt-3 border-t border-border text-[11.5px] font-mono text-inkFaint">
            Data last checked: {formatDate(fw?.lastChecked) || '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
