# Alert

Сообщение в потоке страницы: InlineAlert внутри формы или блока, Banner — во всю ширину вверху каркаса.

- Фон `*-subtle`, кромка 3px и иконка по тону; текст всегда `text-primary` (контраст 11:1 и выше в обеих темах).
- У каждого тона своя **форма** иконки (lucide): info → `info`, success → `circle-check`, warning → `triangle-alert`, error → `circle-alert`. Цвет не единственный признак (WCAG 1.4.1).
- Никогда не исчезает сам. Сам не получает фокус.

## Когда что

| Ситуация | Компонент |
| --- | --- |
| Ошибка одного поля | ошибка FormField (`error`) у поля |
| Ошибка всей формы: неверный вход, блокировка, ответ сервера без поля | **InlineAlert** над кнопкой отправки |
| Состояние экрана: «Sitzung abgelaufen», «Dokument wurde inzwischen geändert» | **InlineAlert** над содержимым |
| Состояние всего приложения: офлайн, демо-песочница | **Banner** вверху каркаса |
| Короткое подтверждение действия | Toast |

## Озвучивание (`live`)

- `live = true` — сообщение появилось в ответ на действие. error / warning → `role="alert"`, info / success → `role="status"` (как у Toast).
- `live = false` — сообщение есть на странице с момента загрузки (например, после перенаправления на вход). Без роли: читалка встретит его по порядку чтения.
- **Повтор одинаковой ошибки должен озвучиваться снова.** Читалка молчит, если текст в живой области не изменился. Поэтому хост создаёт элемент заново на каждую неудачную отправку (`@if` по счётчику отправок), компонент повторы не отсекает. Тест: две неудачные отправки подряд — два объявления.

## Устройство

`svg.k-ico` → `div.k-alert-body` (`span.k-alert-title` по желанию, текст, `div.k-alert-actions` по желанию) → `button.k-icon-btn` закрытия по желанию.

- Действия — `k-btn --sm`, ghost или secondary. Цвет brand на любом `*-subtle`: 5,5:1 и выше.
- Закрытие — `aria-label` из KonturIntl, новый ключ `close` (de «Schließen», en «Close», ru «Закрыть»). После закрытия фокус переходит на следующий фокусируемый элемент или на заголовок страницы, а не теряется.
- Banner: без скругления и боковых рамок, разделитель снизу; действия справа, при нехватке места переносятся.

## Тексты для входа (задача 8)

| Ключ | de | en | ru |
| --- | --- | --- | --- |
| `errors.auth.invalid_credentials` | E-Mail-Adresse oder Passwort ist falsch. | Email address or password is incorrect. | Неверный e-mail или пароль. |
| `errors.auth.throttled` (ICU, `minutes`) | Zu viele Anmeldeversuche. Bitte versuchen Sie es in {minutes, plural, one {# Minute} other {# Minuten}} erneut. | Too many sign-in attempts. Please try again in {minutes, plural, one {# minute} other {# minutes}}. | Слишком много попыток входа. Попробуйте снова через {minutes, plural, one {# минуту} few {# минуты} many {# минут} other {# минуты}}. |
| `auth.sessionExpired` | Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an. | Your session has expired. Please sign in again. | Сеанс истёк. Войдите снова. |
| `auth.error.network` | Keine Verbindung zum Server. Bitte prüfen Sie Ihre Internetverbindung. | No connection to the server. Please check your internet connection. | Нет связи с сервером. Проверьте подключение к интернету. |

---
Group: Feedback  
Live preview: `Alert.html` (open in a browser) · screenshot: `Alert.png`, `Alert-dark.png`  
CSS: classes in `../components.css` · API contract: `../api-contracts.d.ts`
