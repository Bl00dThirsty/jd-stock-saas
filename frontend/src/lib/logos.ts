const logoModules = import.meta.glob<{ default: string }>("/src/assets/logos/*.png", {
  eager: true,
});

const logoMap = new Map<string, string>();

for (const [path, mod] of Object.entries(logoModules)) {
  const filename = path.split("/").pop()!;
  const symbol = filename.replace(".png", "");
  logoMap.set(symbol, mod.default);
}

export function getLogoUrl(symbol: string): string | undefined {
  return logoMap.get(symbol.toUpperCase());
}
