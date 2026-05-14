function formatDate(iso) {
  if (!iso) return 'unknown';
  const d = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export default function FreshnessIndicator({ meta }) {
  return (
    <footer className="border-t border-border bg-surfaceAlt mt-12">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[12.5px] text-inkDim">
        <div className="font-mono">
          Product data last updated:{' '}
          <span className="text-ink font-medium">{formatDate(meta.lastChecked)}</span>
          {meta.nextCheck && (
            <>
              {' '}&middot; Next automated check:{' '}
              <span className="text-ink font-medium">{formatDate(meta.nextCheck)}</span>
            </>
          )}
        </div>
        <div>
          Open source &middot;{' '}
          <a
            href="https://github.com/tannerharrison0n/FortiSearch"
            target="_blank"
            rel="noopener noreferrer"
            className="text-inkDim hover:text-ink underline-offset-2 hover:underline"
          >
            github.com/tannerharrison0n/FortiSearch
          </a>{' '}
          &middot; Not affiliated with Fortinet, Inc.
        </div>
      </div>
    </footer>
  );
}
