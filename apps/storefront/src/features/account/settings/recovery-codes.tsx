"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/input";

function downloadCodes(codes: string[], accountEmail: string) {
  const text = [
    `Recovery codes for ${accountEmail}`,
    "Each code works once. Keep them somewhere safe.",
    "",
    ...codes,
    "",
  ].join("\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "recovery-codes.txt";
  link.click();
  URL.revokeObjectURL(url);
}

export function RecoveryCodes({
  codes,
  accountEmail,
  onDone,
}: {
  codes: string[];
  accountEmail: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Save your recovery codes</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          If you lose your phone, each code signs you in once. This is the only
          time they are shown.
        </p>
      </div>

      <ol
        aria-label="Recovery codes"
        className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border bg-muted/40 p-4 font-mono text-sm"
      >
        {codes.map((code) => (
          <li key={code} className="tracking-wider">
            {code}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          shape="rounded"
          variant="outline"
          leading={copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          onClick={() => void copy()}
        >
          {copied ? "Copied" : "Copy codes"}
        </Button>
        <Button
          size="sm"
          shape="rounded"
          variant="outline"
          leading={<Download aria-hidden />}
          onClick={() => downloadCodes(codes, accountEmail)}
        >
          Download .txt
        </Button>
      </div>

      <Checkbox
        id="recovery-codes-saved"
        label="I have saved these codes somewhere safe"
        checked={saved}
        onChange={(event) => setSaved(event.target.checked)}
        containerClassName="flex"
      />

      <Button size="md" shape="rounded" disabled={!saved} onClick={onDone}>
        Done
      </Button>
    </div>
  );
}
