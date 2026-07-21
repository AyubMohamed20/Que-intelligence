export default function Loading() {
  return (
    <div className="route-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading intelligence workspace…</span>
      <div className="route-loading__heading">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
      <div className="route-loading__grid" aria-hidden="true">
        <div className="surface route-loading__panel"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>
        <div className="surface route-loading__panel"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>
        <div className="surface route-loading__panel"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>
      </div>
    </div>
  );
}
