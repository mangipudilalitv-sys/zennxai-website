"use client";

export function PremiumMiniGraph() {
  return (
    <svg viewBox="0 0 220 60" className="mt-5 h-[52px] w-full overflow-visible">
      <defs>
        <linearGradient id="miniGoldFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffd978" stopOpacity="0.48" />
          <stop offset="100%" stopColor="#ffd978" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path
        d="M0 46 C22 40,36 33,54 38 C72 44,88 18,110 29 C132 41,148 46,170 34 C188 24,202 28,220 8"
        fill="none"
        stroke="#ffd978"
        strokeWidth="2.2"
        strokeLinecap="round"
        pathLength="100"
        className="animate-[graphFlow_6s_linear_infinite] drop-shadow-[0_0_10px_rgba(255,217,120,0.85)]"
      />

      <path
        d="M0 46 C22 40,36 33,54 38 C72 44,88 18,110 29 C132 41,148 46,170 34 C188 24,202 28,220 8 L220 60 L0 60 Z"
        fill="url(#miniGoldFill)"
      />
    </svg>
  );
}

export function PremiumHealthGraph() {
  return (
    <div className="mt-10 overflow-hidden rounded-[24px] border border-white/8 bg-[#030303] p-6">
      <svg viewBox="0 0 760 260" className="h-[240px] w-full overflow-visible">
        <defs>
          <linearGradient id="healthFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffd978" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#ffd978" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ffd978" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[40, 90, 140, 190, 240].map((y) => (
          <line
            key={y}
            x1="20"
            y1={y}
            x2="740"
            y2={y}
            stroke="rgba(255,255,255,0.05)"
          />
        ))}

        <path
          d="M24 210 C80 205,112 178,165 168 C218 158,244 112,300 124 C355 136,385 84,438 78 C494 72,524 104,582 63 C635 26,682 45,736 18"
          fill="none"
          stroke="#ffd978"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength="100"
          className="animate-[graphFlow_8s_linear_infinite] drop-shadow-[0_0_14px_rgba(255,217,120,0.95)]"
        />

        <path
          d="M24 210 C80 205,112 178,165 168 C218 158,244 112,300 124 C355 136,385 84,438 78 C494 72,524 104,582 63 C635 26,682 45,736 18 L736 240 L24 240 Z"
          fill="url(#healthFill)"
        />

        {[
          [165, 168],
          [300, 124],
          [438, 78],
          [582, 63],
          [736, 18],
        ].map(([x, y]) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r="5"
            fill="#fff4c7"
            stroke="#ffd978"
            strokeWidth="2"
            className="animate-[pulseGold_2.6s_ease-in-out_infinite]"
          />
        ))}
      </svg>
    </div>
  );
}

export function PremiumOrbit() {
  return (
    <div className="relative h-full min-h-[520px] overflow-hidden rounded-[32px] border border-white/8 bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,190,60,0.12),transparent_60%)]" />
      <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f6c453]/[0.08] blur-[120px]" />

      <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rotate-[-18deg]">
        <div className="absolute inset-0 rounded-full border border-[#d7b25a]/20" />
        <div className="absolute inset-[28px] rounded-full border border-[#d7b25a]/25" />
        <div className="absolute inset-[56px] rounded-full border border-[#d7b25a]/30" />
        <div className="absolute inset-[88px] rounded-full border border-[#d7b25a]/25" />
        <div className="absolute inset-[122px] rounded-full border border-[#d7b25a]/20" />

        <div className="absolute left-[-5%] top-[22%] h-[2px] w-[112%] rotate-[6deg] bg-gradient-to-r from-transparent via-[#f5d06b]/80 to-transparent blur-[0.5px]" />

        <div className="absolute left-1/2 top-1/2 h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#fff6bf] via-[#f4d36f] to-[#b87418] shadow-[0_0_120px_rgba(255,210,100,0.55)] animate-[corePulse_4s_ease-in-out_infinite]">
          <div className="absolute left-[18%] top-[18%] h-[26px] w-[26px] rounded-full bg-white/80 blur-[2px]" />
          <div className="absolute inset-[-55px] rounded-full bg-[#f5c14d]/20 blur-[70px]" />
          <div className="absolute inset-[-110px] rounded-full bg-[#f5c14d]/10 blur-[120px]" />
        </div>

        <div className="absolute bottom-[70px] left-[48px] h-[54px] w-[54px] rounded-full bg-gradient-to-br from-white via-[#d7dceb] to-[#8e97aa] shadow-[0_0_28px_rgba(220,230,255,0.8)] animate-[floatOne_11s_ease-in-out_infinite]" />

        <div className="absolute right-[66px] top-[82px] h-[42px] w-[42px] rounded-full bg-gradient-to-br from-[#fff0b3] via-[#e4b54c] to-[#8f5d15] shadow-[0_0_32px_rgba(255,205,90,0.65)] animate-[floatTwo_14s_ease-in-out_infinite]" />

        <div className="absolute right-[18px] top-[50%] h-[22px] w-[22px] rounded-full bg-gradient-to-br from-[#f5f8ff] to-[#9db6ff] shadow-[0_0_24px_rgba(170,200,255,0.9)] animate-[floatThree_9s_ease-in-out_infinite]" />

        <div className="absolute left-[110px] top-[180px] h-[18px] w-[18px] rounded-full bg-[#f6d46d] shadow-[0_0_18px_rgba(255,215,120,0.95)] animate-[floatFour_8s_ease-in-out_infinite]" />

        <div className="absolute bottom-[120px] left-[58%] h-[20px] w-[20px] rounded-full bg-[#f6d46d] shadow-[0_0_18px_rgba(255,215,120,0.95)] animate-[floatFive_12s_ease-in-out_infinite]" />

        <div className="absolute left-1/2 top-1/2 h-[34px] w-[34px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_24px_rgba(255,255,255,0.9)]" />

        <div className="absolute left-[8%] top-[16%] h-[3px] w-[3px] rounded-full bg-[#f6d46d]/80" />
        <div className="absolute right-[14%] top-[12%] h-[4px] w-[4px] rounded-full bg-white/60" />
        <div className="absolute bottom-[12%] right-[9%] h-[3px] w-[3px] rounded-full bg-[#f6d46d]/80" />
        <div className="absolute bottom-[18%] left-[22%] h-[4px] w-[4px] rounded-full bg-[#f6d46d]/80" />
      </div>
    </div>
  );
}