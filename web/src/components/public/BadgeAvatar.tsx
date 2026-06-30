// BadgeAvatar renders gradient "initials" tiles (six tints, chosen deterministically
// from the name) — the directory/agent avatar style from the product design. When a
// logo URL is given, the image sits on top and hides itself on error, revealing the
// gradient behind it.
const TINTS = ["a", "b", "c", "d", "e", "f"] as const;

function tintFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function BadgeAvatar({
  name,
  logoUrl,
  size = 46,
  radius = 11,
  className = "",
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
  radius?: number;
  className?: string;
}) {
  return (
    <span
      className={`tint tint-${tintFor(name)} relative shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size, borderRadius: radius, fontSize: Math.round(size * 0.38) }}
    >
      <span aria-hidden>{initialsOf(name)}</span>
      {logoUrl && (
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full bg-white object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
    </span>
  );
}
