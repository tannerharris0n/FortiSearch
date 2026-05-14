function daysBetween(isoDate) {
  if (!isoDate) return Infinity;
  const then = new Date(isoDate + 'T00:00:00Z');
  if (Number.isNaN(then.getTime())) return Infinity;
  const now = Date.now();
  return Math.floor((now - then.getTime()) / 86400000);
}

export default function FirmwareBadge({ firmware }) {
  if (!firmware) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono text-info bg-infoDim border border-infoBorder">
        Cloud / SaaS
      </span>
    );
  }

  if (!firmware.ga) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono text-inkFaint bg-surfaceAlt border border-border"
        title="Awaiting scraper run — version not yet verified against Fortinet docs."
      >
        version pending
      </span>
    );
  }

  const age = daysBetween(firmware.lastChecked);
  let cls = 'text-green bg-greenDim border-greenBorder';
  let label = 'fresh';
  if (age > 30) { cls = 'text-rose bg-roseDim border-roseBorder'; label = 'stale'; }
  else if (age > 7) { cls = 'text-amber bg-amberDim border-amberBorder'; label = 'aging'; }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11.5px] font-mono border ${cls}`}
      title={`Data last checked ${age === Infinity ? 'never' : `${age}d ago`} (${label})`}
    >
      <span className="font-semibold">GA {firmware.ga}</span>
    </span>
  );
}

export function UpdatedBadge({ firmware }) {
  if (!firmware?.lastUpdated) return null;
  const age = daysBetween(firmware.lastUpdated);
  if (age > 14) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider text-forti bg-fortiDim border border-fortiBorder">
      Updated
    </span>
  );
}
