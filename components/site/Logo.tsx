/** Vyx wordmark: a "V" inside crop marks (the trim corners of a proof), then the name. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        aria-hidden="true"
        fill="none"
        className="text-fg"
      >
        <path
          d="M1 8V1h7M24 1h7v7M31 24v7h-7M8 31H1v-7"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M9 10l7 13 7-13"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-lg font-semibold tracking-tight text-fg">Vyx</span>
    </span>
  );
}
