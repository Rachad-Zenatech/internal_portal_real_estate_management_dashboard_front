import { useEffect, useState } from "react";
import { Loader2, ImageOff } from "lucide-react";

interface AuthImageProps {
  cacheKey: string;
  fetchBlob: () => Promise<Blob>;
  alt: string;
  className?: string;
}

export function AuthImage({ cacheKey, fetchBlob, alt, className = "" }: AuthImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setLoading(true);
    setFailed(false);
    fetchBlob()
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cacheKey]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted/40 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (failed || !url) {
    return (
      <div className={`flex items-center justify-center bg-muted/30 text-muted-foreground ${className}`}>
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} />;
}
