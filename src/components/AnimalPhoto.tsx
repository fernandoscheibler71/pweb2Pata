import { useState } from "react";

type AnimalPhotoProps = {
  src: string | null;
  alt: string;
  className?: string;
};

/** Displays a white placeholder when the animal has no image or its URL fails. */
export default function AnimalPhoto({ src, alt, className = "" }: AnimalPhotoProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div role="img" aria-label={`${alt} sem foto`} className={`bg-white ${className}`} />;
  return <img src={src} alt={alt} onError={() => setFailed(true)} className={className} />;
}
