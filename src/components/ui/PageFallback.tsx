import { Skel } from './Skel';

/** Shown while a lazily-loaded page chunk is downloading. */
export function PageFallback() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-3" aria-busy="true">
      <Skel h="28px" w="220px" />
      <Skel h="16px" w="150px" />
      <Skel h="120px" />
    </div>
  );
}
