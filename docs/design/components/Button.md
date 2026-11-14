# Button

Кнопка действия в четырёх вариантах: primary, secondary, ghost, danger.

- Один primary на экран; danger — только для необратимых действий, рядом с ним secondary «Abbrechen».
- Высоты: `control-md` 36px, `control-sm` 32px в тулбарах таблиц, `control-touch` 44px в Belegscan.
- Иконка 16px всегда с подписью; одиночная иконка — `k-icon-btn` c `aria-label`. Размеры IconButton: md 36px (по умолчанию) и `k-icon-btn--sm` 32px — для тулбаров таблиц рядом с `k-btn--sm`.
- Loading блокирует повторный клик, текст скрывается, спиннер наследует цвет варианта.
- Hover и active у primary и danger — только токенами (`brand-hover`/`brand-active`, `error-hover`/`error-active`), без `filter`: в тёмной теме эти цвета светлее базового, потому что текст на них тёмный.

---
Group: Actions  
Live preview: `Button.html` (open in a browser) · screenshots: `Button.png` (light), `Button-dark.png` (dark)  
CSS: classes in `../components.css` · API contract: `../api-contracts.d.ts`
