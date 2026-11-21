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
}

const px = (v) => (typeof v === 'number' ? v : Number.parseFloat(String(v)));
const kebab = (s) =>
  s
    .replace(/\./g, '-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

const resolved = Object.fromEntries(await Promise.all(THEMES.map(async (th) => [th, await resolve(th)])));
THEMES.forEach((th) => validate(th, resolved[th]));
const base = resolved.light;
const scales = ['spacing', 'radius', 'font', 'border'];

let output;
if (target === 'native') {
  const colors = (th) => Object.fromEntries(Object.entries(pick(resolved[th], 'color')).map(([k, t]) => [k, t.value]));
  const scale = (root) => {
    const obj = {};
    for (const [k, t] of Object.entries(pick(base, root))) {
      const keys = k.split('.');
      let node = obj;
      keys.slice(0, -1).forEach((key) => (node = node[key] ??= {}));
      node[keys.at(-1)] = t.type === 'fontWeight' ? String(t.value) : px(t.value);
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
      .map((t) => `  --${kebab(t.path.join('.'))}: ${t.value};`)
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
