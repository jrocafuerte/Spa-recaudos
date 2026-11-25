#!/usr/bin/env node
/**
 * Importa los lineamientos del Design System "Beat" (@bolivariano/ds-tokens) a los
 * Design Tokens DTCG de este proyecto.
 *
 *   node design-tokens/import-beat.mjs <ruta>/packages/tokens/src/generated
 *   npm run tokens   # luego genera la salida de plataforma (y valida contraste WCAG)
 *
 * - Lee los archivos generados de Beat (base/light/dark) de forma ESTÁTICA (no ejecuta
 *   código del paquete): solo acepta líneas `const nombre = 'valor';` o referencias.
 * - Mapea los tokens semánticos de Beat al contrato semántico de esta app (MAP).
 * - Cada token resultante conserva el nombre de origen en $extensions para trazabilidad.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = process.argv[2];
if (!src) {
  console.error('Uso: import-beat.mjs <ruta a @bolivariano/ds-tokens/src/generated>');
  process.exit(1);
}

async function parseTheme(theme) {
  const dir = join(src, theme);
  const vals = {};
  for (const file of (await readdir(dir)).filter((f) => f.endsWith('.ts') && f !== 'index.ts')) {
    const text = await readFile(join(dir, file), 'utf8');
    for (const m of text.matchAll(/^const (\w+) = (?:'([^']*)'|(\w+));$/gm)) {
      vals[m[1]] = m[2] ?? { ref: m[3] };
    }
  }
  const resolve = (v, depth = 0) => (typeof v === 'object' && depth < 10 ? resolve(vals[v.ref], depth + 1) : v);
  return Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, resolve(v)]));
}

const [light, dark] = await Promise.all([parseTheme('light'), parseTheme('dark')]);

/**
 * Contrato semántico de la app ← token semántico de Beat (por tema).
 * Decisiones documentadas en design-tokens/BEAT.md.
 */
const COLOR_MAP = {
  background: { light: 'beatColorBackgroundBaseCanvas', dark: 'beatColorBackgroundSurfaceDefault' },
  surface: { light: 'beatColorBackgroundSurfaceRaised', dark: 'beatColorBackgroundSurfaceRaised' },
  text: 'beatColorTextPrimary',
  textMuted: 'beatColorTextSecondary',
  primary: 'beatColorButtonBrandPrimaryCtaButtonBackgroundDefault',
  onPrimary: 'beatColorButtonBrandPrimaryCtaButtonTextDefault',
  danger: 'beatColorTextStatusDangerDefault',
  success: 'beatColorTextStatusSuccesDefault',
  border: 'beatColorBorderDefault',
  borderSelected: 'beatColorButtonBrandSecondaryCtaButtonBorderDefault',
};

const SCALE_MAP = {
  spacing: {
    $type: 'dimension',
    xs: 'beatSpacePadding4',
    sm: 'beatSpacePadding8',
    md: 'beatSpacePadding12',
    lg: 'beatSpacePadding16',
    xl: 'beatSpacePadding24',
    xxl: 'beatSpacePadding32',
  },
  radius: {
    $type: 'dimension',
    sm: 'beatBorderRadiusComponentDefault',
    md: 'beatBorderRadiusComponentDefault',
    lg: 'beatBorderRadiusContainer',
    pill: 'beatBorderRadiusCircle',
  },
  size: {
    $type: 'dimension',
    control: 'beatSizeInputSizeHeightDefault',
    bottomBar: 'beatDimension64', // altura de BottomNavbar en Beat
  },
  font: {
    family: { $type: 'fontFamily', base: 'beatFontFamilyFontFamily' },
    size: {
      $type: 'dimension',
      caption: 'beatFontSizeCaptionC1Size',
      label: 'beatFontSizeBodyB3Size',
      body: 'beatFontSizeBodyB2Size',
      input: 'beatFontSizeBodyB2Size',
      title: 'beatFontSizeHeadingH5Size',
      display: 'beatFontSizeHeadingH4Size',
    },
    weight: {
      $type: 'fontWeight',
      regular: 'beatFontWeightBodyB2WeightRegular',
      semibold: 'beatFontWeightBodyB2WeightStrong',
      bold: 'beatFontWeightHeadingH3Weight',
    },
  },
  border: {
    width: { $type: 'dimension', thin: 'beatBorderWidthDefault', selected: 'beatBorderWidthFocus' },
  },
};

function need(set, name, theme) {
  const v = set[name];
  if (v === undefined) throw new Error(`Token de Beat no encontrado (${theme}): ${name}`);
  return v;
}
const clean = (type, v) => {
  if (type === 'fontFamily') return String(v).replace(/["']/g, '').trim(); // Beat entrega '"Lexend"'
  if (type === 'fontWeight') return Number(v);
  return v;
};
const ext = (name) => ({ 'com.bolivariano.beat': { token: name } });

function buildScales(node, type) {
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === '$type') continue;
    if (typeof v === 'object') out[k] = buildScales(v, v.$type ?? type);
    else out[k] = { $value: clean(type, need(light, v, 'light')), $extensions: ext(v) };
    if (typeof v === 'object' && v.$type) out[k].$type = v.$type;
  }
  return out;
}

const base = {
  $description:
    'GENERADO por design-tokens/import-beat.mjs desde @bolivariano/ds-tokens (Beat). No editar a mano: re-importar.',
  ...Object.fromEntries(
    Object.entries(SCALE_MAP).map(([k, v]) => [k, { ...(v.$type && { $type: v.$type }), ...buildScales(v, v.$type) }]),
  ),
};

function themeFile(theme, set) {
  const color = { $type: 'color' };
  for (const [key, src] of Object.entries(COLOR_MAP)) {
    const name = typeof src === 'string' ? src : src[theme];
    color[key] = { $value: need(set, name, theme), $extensions: ext(name) };
  }
  return {
    $description: `GENERADO por design-tokens/import-beat.mjs (Beat, tema ${theme}). No editar a mano: re-importar.`,
    color,
  };
}

await writeFile(join(here, 'base.tokens.json'), JSON.stringify(base, null, 2) + '\n');
await writeFile(join(here, 'theme.light.tokens.json'), JSON.stringify(themeFile('light', light), null, 2) + '\n');
await writeFile(join(here, 'theme.dark.tokens.json'), JSON.stringify(themeFile('dark', dark), null, 2) + '\n');
console.log('Beat importado → design-tokens/{base,theme.light,theme.dark}.tokens.json');
