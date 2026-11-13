# DataTable

Таблица данных: тулбар с поиском и массовыми действиями, сортировка, выбор строк, пагинация, skeleton и пустое состояние.

- Шапка — `bg-subtle`, колонки — стиль `label`; суммы и даты — `k-num`, выровнены вправо.
- Выбранная строка — `brand-subtle`, hover — `bg-subtle`; сортируемая колонка — кнопка с `aria-sort`.
- Компакт `k-table--compact` (строка 32px) — для плотных отчётов; virtual scroll — CDK `cdk-virtual-scroll-viewport`.

---
Group: Data  
Live preview: `DataTable.html` (open in a browser) · screenshot: `DataTable.png`  
CSS: classes in `../components.css` · API contract: `../api-contracts.d.ts`
