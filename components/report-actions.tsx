"use client";

import { Printer } from "lucide-react";
import { useState } from "react";

export function PrintReportButton() {
  const [preparing, setPreparing] = useState(false);

  function printReport() {
    if (preparing) return;
    setPreparing(true);
    window.setTimeout(() => {
      window.print();
      setPreparing(false);
    }, 60);
  }

  return (
    <button className="button button--primary" type="button" onClick={printReport} disabled={preparing}>
      <Printer aria-hidden="true" size={16} />
      {preparing ? "Preparing print…" : "Print or save PDF"}
    </button>
  );
}
