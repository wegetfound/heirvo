import type { CSSProperties } from "react";
import type { MonogramId } from "../data/types";

const PALETTE: Record<MonogramId, string> = {
  1: "linear-gradient(135deg,#E8C39B,#A37345)",
  2: "linear-gradient(135deg,#D89BAA,#6E3848)",
  3: "linear-gradient(135deg,#6FB7D6,#2A6BA8)",
  4: "linear-gradient(135deg,#F4D87B,#C2741F)",
  5: "linear-gradient(135deg,#E8A86A,#8B5A2B)",
  6: "linear-gradient(135deg,#8FB46B,#3F5A2B)",
  7: "linear-gradient(135deg,#A8C9E0,#4A7BA8)",
  8: "linear-gradient(135deg,#F4C895,#9C6A3F)",
};

interface Props {
  id: MonogramId;
  letter: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Monogram({ id, letter, size = 24, className, style }: Props) {
  return (
    <span
      className={className}
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: PALETTE[id],
        color: "#fff",
        fontWeight: 700,
        fontSize: Math.max(9, Math.round(size * 0.42)),
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)",
        ...style,
      }}
    >
      {letter}
    </span>
  );
}
