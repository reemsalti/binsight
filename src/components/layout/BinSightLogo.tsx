/** 3×3 rack grid mark — one highlighted cell suggests bin insight. */
function LogoMark() {
  const cells = [
    "bg-blue-100",
    "bg-blue-100",
    "bg-blue-600",
    "bg-blue-200",
    "bg-blue-200",
    "bg-blue-100",
    "bg-blue-100",
    "bg-blue-200",
    "bg-blue-100",
  ];

  return (
    <div className="grid grid-cols-3 gap-0.5 p-1.5" aria-hidden>
      {cells.map((cell, index) => (
        <span key={index} className={`h-2 w-2 rounded-[2px] ${cell}`} />
      ))}
    </div>
  );
}

export function BinSightLogo() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200/80 bg-blue-50"
        aria-hidden
      >
        <LogoMark />
      </div>
      <div className="leading-tight">
        <p className="type-heading">
          Bin<span className="text-blue-600">Sight</span>
        </p>
        <p className="type-label text-slate-400">WMS Operations</p>
      </div>
    </div>
  );
}
