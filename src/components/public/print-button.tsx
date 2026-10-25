"use client";

export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <div className="no-print text-center mt-6">
      <button
        onClick={() => window.print()}
        className="rounded-md brand-gradient px-6 py-2.5 text-sm font-semibold text-white"
      >
        {label}
      </button>
    </div>
  );
}
