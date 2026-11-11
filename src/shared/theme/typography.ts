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
 * How far the phone's own font-size setting may stretch each style: not at
 * all. The client asked for the same font size from the first screen to the
 * last on every phone (Correction 1, F7); with the setting honoured, one
 * teacher's home screen came out visibly larger and heavier than another's.
 * Text still follows the screen width through `typeScale` above. The per-style
 * map is kept so a screen can still opt one style back in if a later request
 * needs it.
 */
export const MAX_FONT_MULTIPLIER = {
  display: 1,
  h1: 1,
  h2: 1,
  h3: 1,
  body: 1,
  bodyStrong: 1,
  label: 1,
  caption: 1,
  tab: 1,
} as const satisfies Record<keyof typeof tokens.type, number>;
