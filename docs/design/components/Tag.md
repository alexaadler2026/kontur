# Tag

Тег для категорий и фильтров, опционально удаляемый.

- `bg-subtle` + `border-subtle`, радиус `radius-sm`; крестик — своя кнопка с `aria-label`.
- Крестик `.k-tag-x` получает общее кольцо фокуса. Имя кнопки — «действие + текст тега» (`aria-labelledby` на саму кнопку и текст): «Entfernen NDA». После удаления фокус переводит тот, кто использует тег (следующий тег или поле фильтра).

---
Group: Data  
Live preview: `Tag.html` (open in a browser) · screenshot: `Tag.png`  
CSS: classes in `../components.css` · API contract: `../api-contracts.d.ts`
