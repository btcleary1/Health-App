// The Cleary app-suite mark: the blue "CT" monogram on a dark tile, with this app's badge
// (a heart with a pulse line) in the corner. Same art as app/icon.svg.
export default function SuiteMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect width="64" height="64" rx="14" fill="#16181B" />
      <g transform="translate(1 0) scale(0.84)" fill="none" stroke="#4C8DFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"><path d="M52 16H27A11 11 0 0 0 16 27V37A11 11 0 0 0 27 48H30"/><path d="M44 16V48"/></g>
      <g><path d="M50 59.5C50 59.5 40 53.6 40 47.2C40 44 42.4 41.8 45.2 41.8C47.3 41.8 49 43 50 44.8C51 43 52.7 41.8 54.8 41.8C57.6 41.8 60 44 60 47.2C60 53.6 50 59.5 50 59.5Z" fill="#FF6B6B"/><path d="M41.8 49.2H46L47.6 46.2L50 52.6L52.2 47.8L53.4 49.2H58.2" fill="none" stroke="#16181B" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></g>
    </svg>
  );
}
