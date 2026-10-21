import { Dimensions } from 'react-native';
import { fontScaleFor, scaleTypeStyle, tokens } from './tokens';

/**
 * The type scale as this device should draw it.
 *
 * `tokens.type` holds the sizes the layouts were drawn at; this applies the
 * screen's scale to them once, at import. The client evaluation (item 3.2)
 * asked that text "dynamically scale and remain fully visible across all
 * mobile screen sizes" — fixed point sizes clipped labels on a 320pt phone
 * and left a tablet's text undersized.
 *
 * Read once rather than through a hook: the app is portrait-only, so the
 * window width does not change while it runs, and a module constant keeps
 * every StyleSheet (which is also built once) in step with the components.
 */
const scale = fontScaleFor(Dimensions.get('window').width);

export const typeScale = Object.fromEntries(
  Object.entries(tokens.type).map(([name, style]) => [name, scaleTypeStyle(style, scale)]),
) as typeof tokens.type;

/**
 * How far the phone's own font-size setting may stretch each style before the
 * layout gives up. Accessibility settings have to work — a child who needs
 * larger text should get it — but an unbounded multiplier turns a two-word
 * button into three clipped lines. Headings sit in the tightest rows, so they
 * are capped hardest; body copy, which usually has room to wrap, least.
 */
export const MAX_FONT_MULTIPLIER = {
  display: 1.2,
  h1: 1.2,
  h2: 1.25,
  h3: 1.25,
  body: 1.4,
  bodyStrong: 1.35,
  label: 1.2,
  caption: 1.3,
  tab: 1.15,
} as const satisfies Record<keyof typeof tokens.type, number>;
