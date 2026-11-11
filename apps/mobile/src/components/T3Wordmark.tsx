import type { ColorValue } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { withUniwind } from "uniwind";

const ThemedPath = withUniwind(Path);

// Fork: Flock's bird, drawn from the app icon, in place of upstream's T3 mark.
export function T3Wordmark(props: {
  readonly height: number;
  readonly color?: ColorValue;
  readonly colorClassName?: string;
}) {
  const aspectRatio = 2 / 0.92;
  return (
    <Svg
      accessibilityLabel="Flock"
      height={props.height}
      width={props.height * aspectRatio}
      viewBox="-1 -0.33 2 0.92"
    >
      <G transform="scale(1,1.35)">
        <ThemedPath
          color={props.color}
          colorClassName={props.colorClassName}
          d="M0 0.14C-0.09 0.03-0.27-0.15-0.5-0.2C-0.69-0.24-0.87-0.18-1-0.06C-0.83-0.1-0.65-0.07-0.45 0.03C-0.3 0.1-0.15 0.2-0.05 0.31L-0.09 0.43L0 0.38L0.09 0.43L0.05 0.31C0.15 0.2 0.3 0.1 0.45 0.03C0.65-0.07 0.83-0.1 1-0.06C0.87-0.18 0.69-0.24 0.5-0.2C0.27-0.15 0.09 0.03 0 0.14Z"
          fill="currentColor"
        />
        <ThemedPath
          color={props.color}
          colorClassName={props.colorClassName}
          d="M-0.075 0.15a0.075 0.085 0 1 0 0.15 0a0.075 0.085 0 1 0-0.15 0Z"
          fill="currentColor"
        />
      </G>
    </Svg>
  );
}
