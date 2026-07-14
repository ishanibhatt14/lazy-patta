import type { CSSProperties, ReactElement } from 'react';

function MiniCard({
  rank,
  suit,
  className = '',
  style,
}: {
  readonly rank: string;
  readonly suit: string;
  readonly className?: string;
  readonly style?: CSSProperties;
}): ReactElement {
  const redSuit = suit === '♥' || suit === '♦';
  return (
    <div
      className={[
        'flex h-28 w-20 flex-col justify-between rounded-lg border border-action-secondary/40 bg-card-face p-2 shadow-lg',
        className,
      ].join(' ')}
      aria-hidden
      style={style}
    >
      <span className={redSuit ? 'text-card-suitRed' : 'text-card-suitBlack'}>{rank}</span>
      <span
        className={`self-center text-3xl ${redSuit ? 'text-card-suitRed' : 'text-card-suitBlack'}`}
      >
        {suit}
      </span>
      <span
        className={`self-end rotate-180 ${redSuit ? 'text-card-suitRed' : 'text-card-suitBlack'}`}
      >
        {rank}
      </span>
    </div>
  );
}

export function HeroCardTable({ label }: { readonly label: string }): ReactElement {
  return (
    <div
      className="landing-scene relative min-h-[16rem] overflow-hidden rounded-[2rem] border border-action-secondary/30 bg-scene-rim p-4 shadow-2xl sm:min-h-[20rem] md:min-h-[24rem]"
      aria-label={label}
    >
      <div className="absolute inset-4 rounded-[1.5rem] bg-game-table shadow-inner" />
      <div
        className="absolute inset-4 rounded-[1.5rem] opacity-20"
        aria-hidden
        style={{
          background:
            'radial-gradient(circle, var(--lp-action-secondary) 0 0.08rem, transparent 0.09rem) 0 0 / 2rem 2rem',
        }}
      />
      <div className="landing-diya absolute right-8 top-8 h-20 w-20 rounded-full bg-action-secondary/30 blur-xl" />

      <div className="absolute left-8 top-8 flex -space-x-3" aria-hidden>
        {['B', 'K', 'I'].map((initial) => (
          <span
            key={initial}
            className="grid h-12 w-12 place-items-center rounded-full border-2 border-background-canvas bg-surface-primary text-sm font-bold text-action-primary shadow"
          >
            {initial}
          </span>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-14 flex items-end justify-center gap-2">
        <MiniCard rank="J" suit="♠" className="landing-card-pair-left" />
        <MiniCard rank="J" suit="♣" className="landing-card-pair-right" />
        <div className="landing-mascot relative z-10 -mx-2 mb-3 grid h-24 w-24 place-items-center rounded-full border-4 border-action-secondary bg-scene-rim text-text-onBrand shadow-xl">
          <div className="absolute -top-4 left-5 h-8 w-5 -rotate-12 rounded-full bg-scene-rimEdge" />
          <div className="absolute -top-4 right-5 h-8 w-5 rotate-12 rounded-full bg-scene-rimEdge" />
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-4">
              <span className="h-2 w-2 rounded-full bg-text-onBrand" />
              <span className="h-2 w-2 rounded-full bg-text-onBrand" />
            </div>
            <span className="h-3 w-7 rounded-full bg-background-canvas" />
          </div>
        </div>
        <MiniCard rank="7" suit="♥" className="landing-card-seven z-20" />
        <MiniCard
          rank="A"
          suit="♦"
          className="landing-card"
          style={{ '--lp-card-rotate': '8deg' } as CSSProperties}
        />
      </div>

      <div className="absolute inset-x-8 top-28 flex justify-between text-xs font-semibold text-text-onBrand/80">
        <span className="rounded-full bg-scene-feltDeep/60 px-3 py-1">Gadha Chor</span>
        <span className="rounded-full bg-accent-indigo/60 px-3 py-1">Lal Satti</span>
      </div>
    </div>
  );
}
