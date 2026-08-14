interface DharmaChakraProps {
  color: string;
  size?: number;
}

export default function DharmaChakra({ color, size = 42 }: DharmaChakraProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <g fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        {/* 8 spokes radiating from center */}
        <line x1="50" y1="50" x2="50" y2="8" />
        <line x1="50" y1="50" x2="77.6" y2="22.4" />
        <line x1="50" y1="50" x2="92" y2="50" />
        <line x1="50" y1="50" x2="77.6" y2="77.6" />
        <line x1="50" y1="50" x2="50" y2="92" />
        <line x1="50" y1="50" x2="22.4" y2="77.6" />
        <line x1="50" y1="50" x2="8" y2="50" />
        <line x1="50" y1="50" x2="22.4" y2="22.4" />

        {/* Central hub circle */}
        <circle cx="50" cy="50" r="8" />

        {/* Inner circle */}
        <circle cx="50" cy="50" r="28" />
      </g>
    </svg>
  );
}
