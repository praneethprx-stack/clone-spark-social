import { useMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export function Avatar({
  src,
  name,
  size = 40,
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const url = useMediaUrl(src);
  const initials = (name || "?").trim().slice(0, 1).toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-display font-semibold text-secondary-foreground",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {url ? <img src={url} alt={name ?? ""} className="h-full w-full object-cover" /> : initials}
    </span>
  );
}

export function MediaView({
  path,
  type,
  className,
  autoPlay,
  controls = true,
}: {
  path: string | null | undefined;
  type?: string | null;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
}) {
  const url = useMediaUrl(path);
  if (!path) return null;
  if (!url) return <div className={cn("animate-pulse bg-muted", className)} />;
  if (type === "video")
    return (
      <video
        src={url}
        className={cn("bg-overlay object-cover", className)}
        controls={controls}
        autoPlay={autoPlay}
        muted={autoPlay}
        loop
        playsInline
      />
    );
  return <img src={url} alt="" className={cn("object-cover", className)} loading="lazy" />;
}
