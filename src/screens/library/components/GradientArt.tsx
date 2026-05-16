import type { CSSProperties } from "react";
import type { GradientId } from "../data/types";

const GRADIENTS: Record<GradientId, string> = {
  wedding:    "radial-gradient(80% 60% at 50% 40%, #FFEBD4 0%, #E8C39B 40%, #B7846E 100%)",
  christmas:  "radial-gradient(70% 80% at 30% 30%, #FFDFBF 0%, #C44A3A 55%, #2A1810 100%)",
  hawaii:     "linear-gradient(160deg, #2A6BA8 0%, #6FB7D6 35%, #F4D87B 70%, #E8814A 100%)",
  dad60:      "radial-gradient(60% 80% at 60% 40%, #F4D87B 0%, #C2741F 50%, #2B1810 100%)",
  school:     "linear-gradient(140deg, #FFE6B0 0%, #E8A86A 50%, #8B5A2B 100%)",
  reunion:    "radial-gradient(80% 70% at 40% 40%, #D9E8C9 0%, #8FB46B 50%, #3F5A2B 100%)",
  eleanor:    "linear-gradient(160deg, #F8E1E8 0%, #D89BAA 50%, #6E3848 100%)",
  yellow:     "linear-gradient(165deg, #2E4E2A 0%, #6FA055 40%, #F4D87B 80%, #E89A3C 100%)",
  capecod:    "linear-gradient(170deg, #4A7BA8 0%, #A8C9E0 50%, #F4E5C0 100%)",
  babysarah:  "radial-gradient(70% 70% at 50% 60%, #FFF4E0 0%, #F4C895 50%, #9C6A3F 100%)",
  easter:     "radial-gradient(70% 80% at 40% 40%, #FFE4F0 0%, #C8E4C0 50%, #8FA37C 100%)",
  newyear:    "radial-gradient(80% 60% at 50% 30%, #FFF1A8 0%, #E89A3C 40%, #2A1828 100%)",
  graduation: "linear-gradient(140deg, #2B3D5C 0%, #6E84A8 50%, #F4D87B 100%)",
  thx:        "radial-gradient(70% 80% at 50% 40%, #F8C57A 0%, #C2741F 50%, #5A2A0F 100%)",
};

interface Props {
  gradient: GradientId;
  className?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
}

export function GradientArt({ gradient, className, style, children }: Props) {
  return (
    <div
      className={className}
      style={{ background: GRADIENTS[gradient], ...style }}
    >
      {children}
    </div>
  );
}

export function gradientCss(gradient: GradientId): string {
  return GRADIENTS[gradient];
}
