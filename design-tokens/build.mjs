#!/usr/bin/env node
/**
 * Genera los estilos de plataforma a partir de los Design Tokens (W3C DTCG) con Style Dictionary.
 *
 *   node design-tokens/build.mjs --target=native --out=src/shared/ui/tokens.generated.ts
 *   node design-tokens/build.mjs --target=web    --out=src/app/tokens.generated.css
 *
 * Este archivo y los *.tokens.json son IDÉNTICOS en spa-banca-movil y spa-recaudos
 * (CI verifica design-tokens.sha256). Para usar los tokens de tu Design System,
 * reemplaza los *.tokens.json manteniendo las claves semánticas (ver README.md).
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import StyleDictionary from 'style-dictionary';

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const { target, out } = args;
if (!['native', 'web'].includes(target) || !out) {
  console.error('Uso: build.mjs --target=native|web --out=<archivo>');
  process.exit(1);
}

/** Claves semánticas obligatorias: es el contrato entre tokens y componentes. */
export const REQUIRED_COLORS = [
  'background',
  'surface',
  'text',
  'textMuted',
  'primary',
  'onPrimary',
  'danger',
  'success',
  'border',
  'borderSelected',
];
const THEMES = ['light', 'dark'];

/**
 * Pares de colores que deben ser legibles (WCAG 2.2 AA): 4.5:1 texto normal,
 * 3:1 elementos no textuales (bordes de componentes, foco).
 */
export const CONTRAST_PAIRS = [
  ['text', 'background', 4.5],
  ['text', 'surface', 4.5],
  ['textMuted', 'background', 4.5],
  ['textMuted', 'surface', 4.5],
  ['onPrimary', 'primary', 4.5],
  ['primary', 'surface', 4.5],
  ['primary', 'background', 4.5],
  ['danger', 'surface', 4.5],
  ['danger', 'background', 4.5],
  ['success', 'surface', 4.5],
  ['borderSelected', 'surface', 3],
];

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const HEADER = 'ARCHIVO GENERADO por design-tokens/build.mjs — NO EDITAR. Modifica design-tokens/*.tokens.json';

async function resolve(theme) {
  const sd = new StyleDictionary({
    source: [join(here, 'base.tokens.json'), join(here, `theme.${theme}.tokens.json`)],
    usesDtcg: true,
    log: { verbosity: 'silent', warnings: 'disabled' },
    platforms: { raw: { transforms: ['name/camel'] } },
  });
  const dict = await sd.getPlatformTokens('raw');
  return dict.allTokens.map((t) => ({ path: t.path, type: t.$type, value: t.$value }));
}

const pick = (tokens, root) =>
  Object.fromEntries(tokens.filter((t) => t.path[0] === root).map((t) => [t.path.slice(1).join('.'), t]));

function validate(theme, tokens) {
  const colors = pick(tokens, 'color');
  const missing = REQUIRED_COLORS.filter((k) => !colors[k]);
  if (missing.length) throw new Error(`Tema ${theme}: faltan tokens semánticos color.${missing.join(', color.')}`);
  for (const [k, t] of Object.entries(colors)) {
    if (typeof t.value !== 'string' || !/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(t.value)) {
      throw new Error(
        `Tema ${theme}: color.${k} debe resolverse a un hex (#RRGGBB), recibido ${JSON.stringify(t.value)}`,
      );
    }
  }
  const failures = CONTRAST_PAIRS.map(([fg, bg, min]) => {
    const ratio = contrast(colors[fg].value, colors[bg].value);
    return ratio < min ? `color.${fg} sobre color.${bg} = ${ratio.toFixed(2)}:1 (mínimo ${min}:1)` : undefined;
  }).filter(Boolean);
  if (failures.length)
    throw new Error(`Tema ${theme}: contraste insuficiente (WCAG 2.2 AA)\n  - ${failures.join('\n  - ')}`);
}

/** Nombre de familia sin comillas (React Native usa el nombre registrado, no una pila CSS). */
const fontFamilyName = (v) => (Array.isArray(v) ? v[0] : String(v)).replace(/["']/g, '').trim();
/** Pila CSS con respaldos del sistema mientras carga la fuente. */
const cssFontStack = (v) => `'${fontFamilyName(v)}', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
const px = (v) => (typeof v === 'number' ? v : Number.parseFloat(String(v)));
const kebab = (s) =>
  s
    .replace(/\./g, '-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

const resolved = Object.fromEntries(await Promise.all(THEMES.map(async (th) => [th, await resolve(th)])));
THEMES.forEach((th) => validate(th, resolved[th]));
const base = resolved.light;
const scales = ['spacing', 'radius', 'size', 'font', 'border'];

let output;
if (target === 'native') {
  const colors = (th) => Object.fromEntries(Object.entries(pick(resolved[th], 'color')).map(([k, t]) => [k, t.value]));
  const scale = (root) => {
    const obj = {};
    for (const [k, t] of Object.entries(pick(base, root))) {
      const keys = k.split('.');
      let node = obj;
      keys.slice(0, -1).forEach((key) => (node = node[key] ??= {}));
      node[keys.at(-1)] =
        t.type === 'fontWeight' ? String(t.value) : t.type === 'fontFamily' ? fontFamilyName(t.value) : px(t.value);
    }
    return obj;
  };
  const obj = {
    color: Object.fromEntries(THEMES.map((th) => [th, colors(th)])),
    ...Object.fromEntries(scales.map((s) => [s, scale(s)])),
  };
  output = `// ${HEADER}\n/* eslint-disable */\nexport const tokens = ${JSON.stringify(obj, null, 2)} as const;\n\nexport type ColorTokens = { readonly [K in keyof typeof tokens.color.light]: string };\n`;
} else {
  const vars = (tokens, roots) =>
    tokens
      .filter((t) => roots.includes(t.path[0]))
      .map((t) => `  --${kebab(t.path.join('.'))}: ${t.type === 'fontFamily' ? cssFontStack(t.value) : t.value};`)
      .join('\n');
  output = [
    `/* ${HEADER} */`,
    `:root {\n${vars(base, scales)}\n${vars(resolved.light, ['color'])}\n  color-scheme: light;\n}`,
    `:root[data-theme='dark'] {\n${vars(resolved.dark, ['color'])}\n  color-scheme: dark;\n}`,
    '',
  ].join('\n\n');
}

await writeFile(out, output);
console.log(`design-tokens: ${target} → ${out}`);
