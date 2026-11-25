# Design Tokens

Fuente única de verdad del estilo visual (hoy importada del **Design System Beat**: ver [BEAT.md](BEAT.md)) para la **app nativa** (`spa-banca-movil`) y el
**micro frontend** (`spa-recaudos`). Formato [W3C Design Tokens (DTCG)](https://tr.designtokens.org/format/),
procesado con [Style Dictionary](https://styledictionary.com/) v5.

```
design-tokens/
  base.tokens.json          # primitivos: paleta, espaciado, radios, tipografía, bordes
  theme.light.tokens.json   # semánticos del tema claro (referencian a la paleta)
  theme.dark.tokens.json    # semánticos del tema oscuro (mismas claves)
  build.mjs                 # genera la salida de cada plataforma
```

| Plataforma | Comando | Salida | Consumo |
|---|---|---|---|
| App (React Native) | `npm run tokens` | `src/shared/ui/tokens.generated.ts` | `useTheme()` en `src/shared/ui` |
| Micro frontend (CSS) | `npm run tokens` | `src/app/tokens.generated.css` | `var(--color-primary)`… en `globals.css` |

Los archivos generados se versionan y **no se editan**. El CI falla si no coinciden con los tokens
(`npm run tokens && git diff --exit-code`) o si la carpeta difiere entre ambos repos
(`contracts/design-tokens.sha256`).

## Contrato (lo que los componentes esperan)

Las pantallas solo usan **tokens semánticos**; nunca la paleta ni valores literales (lo impiden
reglas de ESLint en la app y un chequeo de CSS en el micro frontend).

| Grupo | Claves obligatorias |
|---|---|
| `color.*` (por tema) | `background`, `surface`, `text`, `textMuted`, `primary`, `onPrimary`, `danger`, `success`, `border`, `borderSelected` |
| `spacing.*` | `xs`, `sm`, `md`, `lg`, `xl`, `xxl` |
| `radius.*` | `sm`, `md`, `lg`, `pill` |
| `font.size.*` | `caption`, `label`, `body`, `input`, `title`, `display` |
| `font.weight.*` | `regular`, `semibold`, `bold` |
| `border.width.*` | `thin`, `selected` |

`build.mjs` valida que los colores semánticos existan en ambos temas y resuelvan a hex; si falta
alguno, la generación falla con un mensaje claro. (Las escalas faltantes las detecta TypeScript en la app.)

## Usar los tokens de tu Design System

1. Exporta tus tokens en formato DTCG (`$value`, `$type`). Desde Figma: Tokens Studio, Figma Variables
   export o tu pipeline actual de Style Dictionary.
2. Reemplaza `base.tokens.json` con tus primitivos, y en `theme.light|dark.tokens.json` mapea cada clave
   semántica a tus tokens mediante referencias, por ejemplo:
   ```json
   { "color": { "$type": "color", "primary": { "$value": "{brand.blue.600}" } } }
   ```
   Si tus nombres semánticos son distintos, basta con este mapeo: no se toca ningún componente.
3. Ejecuta `npm run tokens` en **ambos** repos y actualiza el hash:
   `sha256sum design-tokens/*.json design-tokens/build.mjs > contracts/design-tokens.sha256`.
4. Si tus tokens viven en un paquete npm (p. ej. `@banco/design-tokens`), cambia `source` en
   `build.mjs` para leerlos desde `node_modules` y elimina la copia local; el resto del flujo es igual.

> Si tu fuente usa el formato propio de Tokens Studio (no DTCG), agrega
> `@tokens-studio/sd-transforms` como preprocesador en `build.mjs`.
