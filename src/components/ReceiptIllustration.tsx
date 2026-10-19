import React from 'react';

export const ReceiptIllustration: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`relative w-full max-w-[320px] mx-auto select-none transform -rotate-2 hover:rotate-0 transition-transform duration-300 drop-shadow-[0_8px_24px_rgba(28,25,23,0.07)] ${className}`}
    >
      <svg
        viewBox="0 0 320 372"
        className="w-full h-auto block overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Receipt paper shape with rounded top corners and zig-zag torn bottom edge */}
        <path
          d="M 16,0 
             L 304,0 
             Q 320,0 320,16 
             L 320,345 
             L 310,357 L 300,345 
             L 290,357 L 280,345 
             L 270,357 L 260,345 
             L 250,357 L 240,345 
             L 230,357 L 220,345 
             L 210,357 L 200,345 
             L 190,357 L 180,345 
             L 170,357 L 160,345 
             L 150,357 L 140,345 
             L 130,357 L 120,345 
             L 110,357 L 100,345 
             L 90,357 L 80,345 
             L 70,357 L 60,345 
             L 50,357 L 40,345 
             L 30,357 L 20,345 
             L 10,357 L 0,345 
             L 0,16 
             Q 0,0 16,0 
             Z"
          className="rc-paper"
          strokeWidth="1"
        />

        {/* Receipt Header */}
        <text
          x="160"
          y="46"
          textAnchor="middle"
          className="rc-ink"
          fontSize="24"
          fontFamily="'Instrument Serif', Georgia, serif"
        >
          Your bill
        </text>
        <text
          x="160"
          y="66"
          textAnchor="middle"
          className="rc-faint"
          fontSize="11"
          fontFamily="'Inter', system-ui, sans-serif"
          letterSpacing="0.02em"
        >
          Monthly Statement
        </text>

        {/* Dashed divider */}
        <line
          x1="24"
          y1="86"
          x2="296"
          y2="86"
          className="rc-rule"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Receipt rows & red ellipse inside the same group */}
        <g id="receipt-rows">
          {/* Row 1: Monthly plan ₹614 */}
          <text
            x="28"
            y="122"
            className="rc-muted"
            fontSize="13"
            fontFamily="'Inter', system-ui, sans-serif"
          >
            Monthly plan
          </text>
          <text
            x="292"
            y="122"
            textAnchor="end"
            className="rc-ink"
            fontWeight="500"
            fontSize="13"
            fontFamily="'Inter', system-ui, sans-serif"
          >
            ₹614
          </text>

          {/* Row 2: Data & voice pack ₹135 */}
          <text
            x="28"
            y="162"
            className="rc-muted"
            fontSize="13"
            fontFamily="'Inter', system-ui, sans-serif"
          >
            Data &amp; voice pack
          </text>
          <text
            x="292"
            y="162"
            textAnchor="end"
            className="rc-ink"
            fontWeight="500"
            fontSize="13"
            fontFamily="'Inter', system-ui, sans-serif"
          >
            ₹135
          </text>

          {/* Row 3: Other charges ₹450 (circled in red) */}
          <text
            x="28"
            y="204"
            className="rc-ink"
            fontWeight="500"
            fontSize="13"
            fontFamily="'Inter', system-ui, sans-serif"
          >
            Other charges
          </text>
          <text
            x="292"
            y="204"
            textAnchor="end"
            className="rc-ink"
            fontWeight="600"
            fontSize="13"
            fontFamily="'Inter', system-ui, sans-serif"
          >
            ₹450
          </text>

          {/* Red ellipse centred vertically on row 3, enclosing the row without crossing text */}
          <ellipse
            cx="160"
            cy="200"
            rx="146"
            ry="20"
            className="rc-circle"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            transform="rotate(-0.8 160 200)"
          />

          {/* Row 4: Taxes ₹215.82 */}
          <text
            x="28"
            y="246"
            className="rc-muted"
            fontSize="13"
            fontFamily="'Inter', system-ui, sans-serif"
          >
            Taxes
          </text>
          <text
            x="292"
            y="246"
            textAnchor="end"
            className="rc-ink"
            fontWeight="500"
            fontSize="13"
            fontFamily="'Inter', system-ui, sans-serif"
          >
            ₹215.82
          </text>
        </g>

        {/* Dashed divider */}
        <line
          x1="24"
          y1="274"
          x2="296"
          y2="274"
          className="rc-rule"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Total row */}
        <text
          x="28"
          y="312"
          className="rc-ink"
          fontSize="22"
          fontFamily="'Instrument Serif', Georgia, serif"
        >
          Total
        </text>
        <text
          x="292"
          y="312"
          textAnchor="end"
          className="rc-ink"
          fontWeight="500"
          fontSize="22"
          fontFamily="'Instrument Serif', Georgia, serif"
        >
          ₹1,414.82
        </text>
      </svg>
    </div>
  );
};
