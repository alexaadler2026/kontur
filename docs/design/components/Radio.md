# Radio

Радиогруппа для взаимоисключающего выбора.

- Всегда `fieldset.k-choice-group` + `legend` (стиль `label`); порядок как в GOV.UK: legend, подсказка, ошибка, варианты в `k-choice-options`.
- Выбранная точка — `brand` с внутренним кольцом `bg-surface`; навигация стрелками — нативная (общий `name`).
- Ошибка (v3) — текст `k-error-msg` с иконкой, связан с fieldset через `aria-describedby`; рамки кругов — `error`. `aria-invalid` на отдельные radio не ставится (в ARIA 1.2 не поддерживается).
- Обязательная группа — маркер `k-required` в legend (`aria-hidden`), `aria-required` на radio.

---
Group: Forms  
Live preview: `Radio.html` (open in a browser) · screenshots: `Radio.png` (light), `Radio-dark.png` (dark)  
CSS: classes in `../components.css` · API contract: `../api-contracts.d.ts`
