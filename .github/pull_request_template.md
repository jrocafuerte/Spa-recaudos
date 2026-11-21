## Descripción

<!-- Qué cambia y por qué -->

## Tipo de cambio

- [ ] Nueva funcionalidad
- [ ] Corrección
- [ ] Refactor / deuda técnica
- [ ] Cambio de contrato (API / puente nativo) — requiere versión y compatibilidad N-1

## Checklist de desarrollo seguro

- [ ] Toda entrada nueva se valida con schema Zod estricto (`strictObject`)
- [ ] Endpoints nuevos son privados por defecto; autorización a nivel de objeto (BOLA) verificada
- [ ] Operaciones monetarias usan `Idempotency-Key` y montos resueltos en servidor
- [ ] Sin datos sensibles en logs, errores ni respuestas (PAN, tokens, OTP, documento completo)
- [ ] Sin secretos en el código / configuración versionada
- [ ] Tests de los casos de abuso (no solo del camino feliz)
- [ ] Pipeline verde: calidad, Sonar, Semgrep, CodeQL, Gitleaks, SCA, Trivy, DAST
