# Select

Выпадающий список с поиском по опциям.

- ARIA-паттерн combobox + listbox; совпадение в опции выделяется жирным, счётчик «N von M» внизу.
- Меню — `bg-surface-raised`, тень `shadow-overlay-sm`, выбранная опция помечена галочкой, hover — `bg-subtle`.
- Реализация: CDK Overlay + ListKeyManager.

---
Group: Forms  
Live preview: `Select.html` (open in a browser) · screenshot: `Select.png`  
CSS: classes in `../components.css` · API contract: `../api-contracts.d.ts`
