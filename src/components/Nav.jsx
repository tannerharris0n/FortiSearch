const TOOLBOX_LINKS = [
  { label: 'Toolbox', href: 'https://tools.tannerharrison.com', primary: true },
  { label: 'FortiCLI', href: 'https://tools.tannerharrison.com/forticli' },
  { label: 'FAZ Health', href: 'https://faz.tannerharrison.com' },
  { label: 'SE PoV Builder', href: 'https://pov.tannerharrison.com' },
  { label: 'Blog Draft', href: 'https://tools.tannerharrison.com/blog-draft' },
];

export default function Nav() {
  return (
    <header className="sticky top-0 z-30 bg-surface border-b border-border">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <a href="/" className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-white font-mono text-sm font-semibold"
              style={{ background: '#EE3124' }}
            >
              FS
            </span>
            <span className="text-[17px] font-bold tracking-tight text-ink">FortiSearch</span>
          </a>
          <div className="hidden lg:block h-6 w-px bg-border" />
          <nav className="hidden lg:flex items-center gap-1">
            {TOOLBOX_LINKS.map((t) => (
              <a
                key={t.label}
                href={t.href}
                target={t.primary ? '_self' : '_blank'}
                rel="noopener noreferrer"
                className={`px-3 py-1.5 rounded-md text-[13.5px] transition-colors ${
                  t.primary
                    ? 'text-ink font-semibold hover:bg-surfaceAlt'
                    : 'text-inkDim hover:text-ink hover:bg-surfaceAlt'
                }`}
              >
                {t.label}
                {!t.primary && <span className="ml-1 text-[10px] opacity-60">↗</span>}
              </a>
            ))}
          </nav>
        </div>
        <a
          href="https://github.com/tannerharrison0n/FortiSearch"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] text-inkDim hover:text-ink px-3 py-1.5 rounded-md hover:bg-surfaceAlt transition-colors"
        >
          GitHub <span className="opacity-60">↗</span>
        </a>
      </div>
    </header>
  );
}
