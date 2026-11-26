import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { formatPropertyAddress } from "@/types/realEstate";
import type { Property } from "@/types/realEstate";

function fullPropertyAddress(p: Property): string {
  const street = formatPropertyAddress(p);
  const tail = [p.city, p.state_province_region, p.postal_code, p.country_code].filter(Boolean).join(", ");
  return tail && !street.includes(tail) ? `${street}, ${tail}` : street;
}

export function CopyAddressButton({ property, iconOnly = false }: { property: Property; iconOnly?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard
      .writeText(fullPropertyAddress(property))
      .then(() => {
        setCopied(true);
        toast.success("Address copied");
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => toast.error("Could not copy address"));
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy address"
      className={
        iconOnly
          ? "inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          : "inline-flex items-center gap-1 text-primary hover:underline cursor-pointer"
      }
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {!iconOnly && <span>{copied ? "Copied" : "Copy address"}</span>}
    </button>
  );
}
