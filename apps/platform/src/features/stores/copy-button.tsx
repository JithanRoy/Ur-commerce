import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      leading={copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      onClick={copy}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}
