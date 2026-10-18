import { useState } from "react";

export interface ProductImageProps {
  src: string | null;
  alt: string;
  className?: string;
}

/** Lazy-loaded image with a neutral placeholder when the URL is missing or broken. */
const ProductImage = ({ src, alt, className = "" }: ProductImageProps) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const broken = !src || failedSrc === src;

  if (broken) {
    return (
      <div
        className={`flex items-center justify-center bg-neutral-100 text-xs text-gray-400 ${className}`}
        role="img"
        aria-label={`${alt} (image unavailable)`}
      >
        No image
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      className={className}
      draggable={false}
    />
  );
};

export default ProductImage;
