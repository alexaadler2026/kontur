# Progress

Индикаторы хода: линейный, круговой и спиннер.

- Линейный 6px с подписью процента (`k-num`); тоны success/error; `role=progressbar` с aria-value*.

## Уточнения владельца (2026-11-23, UI-1)

1. **У полос в макете нет имени** (`Progress.html`: `role=progressbar` без `aria-label` /
   `aria-labelledby`; у кольца тоже) — ошибка доступности макета (WCAG 4.1.2). В
   компоненте видимая подпись связана с полосой через `aria-labelledby`, у кольца —
   `aria-label`.
2. **Процент — по языку интерфейса** через
   `Intl.NumberFormat(KonturIntl.locale(), { style: 'percent' })`, не строкой вручную:
   de «68 %», en «68%», ru «68 %».

---
Group: Upload & Progress  
Live preview: `Progress.html` (open in a browser) · screenshot: `Progress.png`  
CSS: classes in `../components.css` · API contract: `../api-contracts.d.ts`
