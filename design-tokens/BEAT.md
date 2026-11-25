# Integración con el Design System Beat (@bolivariano/ds-*)

Los lineamientos visuales de la app y del micro frontend provienen de **Beat**
(`@bolivariano/ds-tokens`). `import-beat.mjs` lee sus tokens generados de forma estática
(sin ejecutar código del paquete) y produce los `*.tokens.json` de esta carpeta.

```bash
node design-tokens/import-beat.mjs <beat>/packages/tokens/src/generated
npm run tokens        # genera la salida de plataforma y valida contraste WCAG 2.2 AA
# repetir en spa-recaudos (misma carpeta design-tokens/) y actualizar contracts/design-tokens.sha256
```

## Mapeo semántico (app ← Beat)

| Token de la app                   | Tema claro                                                              | Tema oscuro                                                     |
| --------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| `color.background`                | `beatColorBackgroundBaseCanvas` (#ffffff)                               | `beatColorBackgroundSurfaceDefault` (#1a1a1a) ⚠️ ver hallazgo 2 |
| `color.surface`                   | `beatColorBackgroundSurfaceRaised` (#ffffff)                            | `beatColorBackgroundSurfaceRaised` (#2b2b2b)                    |
| `color.text`                      | `beatColorTextPrimary`                                                  | ídem                                                            |
| `color.textMuted`                 | `beatColorTextSecondary`                                                | ídem                                                            |
| `color.primary`                   | `beatColorButtonBrandPrimaryCtaButtonBackgroundDefault` (#008292)       | ídem (#06a3b6)                                                  |
| `color.onPrimary`                 | `beatColorButtonBrandPrimaryCtaButtonTextDefault`                       | ídem                                                            |
| `color.danger` / `success`        | `beatColorTextStatusDangerDefault` / `beatColorTextStatusSuccesDefault` | ídem                                                            |
| `color.border`                    | `beatColorBorderDefault`                                                | ídem                                                            |
| `color.borderSelected`            | `beatColorButtonBrandSecondaryCtaButtonBorderDefault`                   | ídem                                                            |
| `font.family.base`                | `beatFontFamilyFontFamily` (Lexend)                                     | —                                                               |
| `font.size.*`                     | C1 12 · B3 14 · B2 16 · H5 22 · H4 26                                   | —                                                               |
| `font.weight.*`                   | 400 · 600 · 700                                                         | —                                                               |
| `spacing.*`                       | `beatSpacePadding` 4 · 8 · 12 · 16 · 24 · 32                            | —                                                               |
| `radius.*`                        | `ComponentDefault` 8 · `Container` 12 · `Circle` 999                    | —                                                               |
| `size.control` / `size.bottomBar` | `beatSizeInputSizeHeightDefault` 48 · `beatDimension64`                 | —                                                               |
| `border.width.*`                  | `beatBorderWidthDefault` 1 · `beatBorderWidthFocus` 2                   | —                                                               |

Todos los pares de color pasan la validación de contraste WCAG 2.2 AA de `build.mjs`.

Fuente: **Lexend** (OFL) autoalojada — app: `@expo-google-fonts/lexend` (pesos 400/600/700,
registrados en `src/shared/ui/fonts.ts`); micro frontend: `@fontsource/lexend` (compatible con la CSP).

## Hallazgos en Beat (para el equipo del Design System)

1. **Sin `dist`**: el repositorio no incluye builds y los paquetes no están publicados; para consumirlos
   hace falta compilarlos o publicarlos en un registro privado.
2. **Tema oscuro incompleto**: `BackgroundBaseCanvas`, `BackgroundBaseSecondary`, `BackgroundBaseStatic` y
   `BackgroundSurfaceSubtle` tienen el mismo valor que en claro (#ffffff / #e6e6e6). Se usa
   `BackgroundSurfaceDefault` como fondo oscuro hasta que se corrija.
3. **`beatFontFamilyFontFamily` incluye comillas literales** (`"Lexend"`): en React Native `fontFamily`
   con comillas no coincide con ninguna fuente. El importador las elimina.
4. **Las fuentes no se distribuyen ni se registran**: los componentes usan `theme.fontFamily` pero ningún
   paquete carga Lexend (en Android además se requiere un nombre por peso).
5. **`theme.ts` usa `light.` fijo** en `input.*` (colores de texto), `icon.terciary` y medidas: en tema
   oscuro esos colores quedan con los valores del tema claro.
6. **`input.disabled`** marcado como TODO (usa un color de ícono inverso).
7. **Nombres inconsistentes**: `Succes` / `Sublest` frente a `Success` / `Subtlest` en otros tokens.
8. **Dependencia de un kit privado de Font Awesome Pro** (`@awesome.me/kit-…`): exige credenciales del
   registro de Font Awesome en cada máquina y en CI. Recomendado: exponer íconos por un adaptador o
   como peerDependency opcional.
9. **`expo-font ~57` como dependencia directa** del paquete React Native (la app usa Expo SDK 58):
   debería ser peerDependency para no duplicar módulos nativos.
10. **`Button` fija `fontWeight: 500`** y no aplica `fontFamily` en la etiqueta: el peso 500 no forma
    parte de la escala tipográfica (400/600/700).
11. Raíz: `"typescript": "v7.0.2"` (prefijo `v` no estándar en semver).

## Íconos

Se usa **Font Awesome** con la misma pila que Beat (`@fortawesome/fontawesome-svg-core` +
`@fortawesome/react-native-fontawesome` en la app y `@fortawesome/react-fontawesome` en web), con el
set **Free** (`@fortawesome/free-solid-svg-icons`). Para pasar al kit Pro de Beat
(`@awesome.me/kit-…`, requiere el token del registro de Font Awesome), solo cambia el origen de los
íconos en `src/shared/ui/adapters/default/index.tsx` (`ICONS`) y en `spa-recaudos/src/components/Icon.tsx`.
Las pantallas usan nombres semánticos (`IconName`), no íconos concretos.

## Componentes de Beat

La app aplica hoy los **lineamientos** (tokens) de Beat a su kit propio. Para usar los **componentes** de
`@bolivariano/ds-react-native` dentro del contrato de UI (`src/shared/ui/adapters`) se necesita:
publicar/compilar los paquetes, acceso al kit de Font Awesome Pro y agregar `@emotion/native` y
`@emotion/react` (peerDependencies). Con eso se escribe `adapters/beat` y se valida con la suite de
conformidad.
