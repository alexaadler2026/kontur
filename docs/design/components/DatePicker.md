# DatePicker

Поле даты с календарём; локаль de-DE, формат TT.MM.JJJJ.

- Ввод с клавиатуры разрешён и маскируется; значение — `k-num` (Plex Mono).
- Выбранный день — заливка `brand`, сегодняшний — контур `brand`; прошедшие вне min-диапазона — `text-disabled`.
- Календарь — CDK Overlay, навигация стрелками, `aria-label` на месяцах.

---
Group: Forms  
Live preview: `DatePicker.html` (open in a browser) · screenshot: `DatePicker.png`  
CSS: classes in `../components.css` · API contract: `../api-contracts.d.ts`
