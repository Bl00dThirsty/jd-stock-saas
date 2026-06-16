import { useState } from "react";
import { cn } from "@/lib/utils";
import { SymbolAvatar } from "@/components/SymbolAvatar";
import { getLogoUrl } from "@/lib/logos";

interface CompanyLogoProps {
  src: string | null | undefined;
  symbol: string;
  size?: number;
  className?: string;
}

/**
 * Renders a company's logo — tries the local asset first, then the remote
 * Yahoo URL, and finally a deterministic coloured avatar as fallback.
 */
export function CompanyLogo({ src, symbol, size = 24, className }: CompanyLogoProps) {
  const [failed, setFailed] = useState(false);
  const localLogo = getLogoUrl(symbol);
  const imgSrc = localLogo ?? src;

  if (imgSrc && !failed) {
    return (
      <img
        src={imgSrc}
        alt={`${symbol} logo`}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={cn("border-border shrink-0 rounded-full border object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return <SymbolAvatar symbol={symbol} size={size} className={className} />;
}
