# Checkbox

Чекбокс 16px с подписью справа; опционально подсказка и текст ошибки под ним.

- Отмеченное состояние — заливка `brand`, галочка — маска цвета `text-on-brand` (контраст ≥ 7:1 в обеих темах); indeterminate — минус.
- Ошибка (v3) — **текстом**, не только цветом (WCAG 1.4.1, 3.3.1): обёртка `k-choice-item`, сообщение `k-error-msg` с иконкой, выровнено по тексту подписи; на input `aria-invalid="true"` и `aria-describedby` (подсказка, затем ошибка).
- Disabled — `bg-subtle` + `text-disabled`.

---
Group: Forms  
Live preview: `Checkbox.html` (open in a browser) · screenshots: `Checkbox.png` (light), `Checkbox-dark.png` (dark)  
CSS: classes in `../components.css` · API contract: `../api-contracts.d.ts`
