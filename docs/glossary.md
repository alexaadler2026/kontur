# Glossary

Domain terms of SignFlow and Belegscan in the three UI languages. German is the
default UI language and the language of the mockups in `docs/design/screens/`.

- **EN marked ✓** is confirmed by the English mockup
  (`docs/design/screens/signflow/DocumentsEN.html`). Unmarked EN and all RU entries
  are working translations; the i18n task finalises them in the translation files.
- Domain terms (SignFlow, Belegscan) are taken from the mockups only — add a term when it
  first appears in code.
- Architecture terms (last section) come from the accepted ADR waves; columns RU | DE | EN,
  German reviewed by the owner.

## SignFlow — document signing

| DE                                 | EN                                | RU                                       | Meaning                                                                                                                                      |
| ---------------------------------- | --------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Umlauf                             | envelope ✓                        | конверт на подпись                       | One or more documents sent to signers in a defined order ("Neuer Umlauf" / "New envelope")                                                   |
| Unterzeichnende                    | signers ✓                         | подписанты                               | People who have to sign the document                                                                                                         |
| Vertragspartner                    | counterparty ✓                    | контрагент                               | The other party of the contract                                                                                                              |
| Signaturweg                        | signing route                     | маршрут подписания                       | Order of signers and the state of each signature                                                                                             |
| Frist                              | due date (Due ✓)                  | срок                                     | Date by which all signatures are expected                                                                                                    |
| Entwurf                            | draft ✓                           | черновик                                 | Envelope that has not been sent yet                                                                                                          |
| Wartet                             | waiting ✓                         | ожидает                                  | Status: sent, signatures still missing                                                                                                       |
| Signiert                           | completed ✓                       | подписан                                 | Status: all signatures collected                                                                                                             |
| Überfällig                         | overdue ✓                         | просрочен                                | Not a status but a derived flag: Wartet + due date passed; computed, not stored; gone after the due date is extended (business-processes.md) |
| In Prüfung                         | in review ✓                       | на проверке                              | Status: under internal review                                                                                                                |
| Erinnern                           | remind ✓                          | напомнить                                | Send a reminder to signers who have not signed                                                                                               |
| Stornieren                         | void ✓                            | аннулировать                             | Cancel a sent envelope                                                                                                                       |
| Vorlage                            | template ✓                        | шаблон                                   | Reusable document setup                                                                                                                      |
| Protokoll                          | audit log ✓                       | журнал аудита                            | Chronological record of every event on a document                                                                                            |
| Prüfsumme (SHA-256)                | checksum (SHA-256)                | контрольная сумма (SHA-256)              | Hash proving the document was not changed                                                                                                    |
| Auftragsverarbeitungsvertrag (AVV) | Data Processing Agreement (DPA) ✓ | договор об обработке персональных данных | GDPR contract type, often used as example document                                                                                           |

## Belegscan — receipt recognition

| DE                                      | EN                              | RU                            | Meaning                                                                                                            |
| --------------------------------------- | ------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Beleg                                   | receipt                         | чек                           | A purchase receipt captured by photo or file                                                                       |
| Händler                                 | merchant                        | продавец                      | Shop that issued the receipt                                                                                       |
| Position                                | line item                       | позиция                       | One purchased article on the receipt                                                                               |
| Zwischensumme                           | subtotal                        | промежуточная сумма           | Sum per VAT rate                                                                                                   |
| Gesamtbetrag                            | total amount                    | итоговая сумма                | Total printed on the receipt                                                                                       |
| MwSt (Mehrwertsteuer)                   | VAT                             | НДС                           | German VAT; receipts use the rates 7 % and 19 %                                                                    |
| Zahlart                                 | payment method                  | способ оплаты                 | e.g. Girocard                                                                                                      |
| Kategorie                               | category                        | категория                     | Spending category, e.g. Lebensmittel                                                                               |
| TSE (Technische Sicherheitseinrichtung) | TSE (technical security device) | TSE (фискальный модуль кассы) | Certified module of German cash registers; its QR code on the receipt lets the app check the total ("TSE geprüft") |
| Erkennung                               | recognition                     | распознавание                 | On-device OCR of the receipt photo                                                                                 |
| Sicherheit (der Erkennung)              | confidence                      | уверенность распознавания     | Per field: sicher ≥ 85 %, prüfen 60–85 %, unsicher < 60 % (see `api-contracts.d.ts`)                               |
| Zuschnitt                               | crop                            | обрезка                       | Cropping and perspective correction of the photo                                                                   |
| Prüfwarteschlange                       | review queue                    | очередь проверки              | Receipts waiting for a human check                                                                                 |
| Stapel-Import                           | batch import                    | пакетный импорт               | Import of many files or a ZIP at once                                                                              |
| Duplikat                                | duplicate                       | дубликат                      | Receipt that was already imported; skipped                                                                         |

## Architecture terms (ADR waves 1–3)

Technical terms of [ADR 0007–0020 and 0023–0028](adr/README.md). In this project **„Protokoll“ is the
document audit trail**; technical server logs are called **„Logs“** in German, never
„Protokoll“.

### Wave 1 — API, environments, login, files, PDF, deployment (ADR 0007–0014)

| RU                                        | DE                                          | EN                                    |
| ----------------------------------------- | ------------------------------------------- | ------------------------------------- |
| контракт API                              | API-Vertrag / Schnittstellenvertrag         | API contract                          |
| спецификация OpenAPI                      | OpenAPI-Spezifikation                       | OpenAPI specification                 |
| источник правды                           | Single Source of Truth / maßgebliche Quelle | single source of truth                |
| генерация кода                            | Codegenerierung                             | code generation                       |
| расхождение (дрейф)                       | Abweichung (Drift)                          | drift                                 |
| конечная точка, эндпоинт                  | Endpunkt                                    | endpoint                              |
| объект передачи данных                    | Datentransferobjekt (DTO)                   | data transfer object (DTO)            |
| мок, имитация                             | Mock (Testdouble)                           | mock                                  |
| постраничная выдача                       | Paginierung                                 | pagination                            |
| сортировка                                | Sortierung                                  | sorting                               |
| код ошибки                                | Fehlercode                                  | error code                            |
| минимальная единица валюты                | kleinste Währungseinheit                    | minor currency unit                   |
| код валюты                                | Währungscode                                | currency code                         |
| число с плавающей точкой                  | Gleitkommazahl                              | floating-point number                 |
| окружение                                 | Umgebung                                    | environment                           |
| переменная окружения                      | Umgebungsvariable                           | environment variable                  |
| рабочая версия, продакшен                 | Produktivumgebung                           | production                            |
| аутентификация                            | Authentifizierung                           | authentication                        |
| авторизация                               | Autorisierung                               | authorization                         |
| сессия                                    | Sitzung                                     | session                               |
| приглашение                               | Einladung                                   | invitation                            |
| восстановление пароля                     | Passwort-Wiederherstellung                  | password recovery                     |
| двухфакторная аутентификация              | Zwei-Faktor-Authentifizierung (2FA)         | two-factor authentication (2FA)       |
| хеш пароля                                | Passwort-Hash                               | password hash                         |
| роль                                      | Rolle                                       | role                                  |
| право доступа                             | Berechtigung                                | permission                            |
| владелец (документа)                      | Eigentümer / Absender                       | owner / sender                        |
| владелец группы                           | Gruppeninhaber/in                           | group owner                           |
| показатель валюты (число минорных знаков) | Nachkommastellen der Währung (ISO 4217)     | currency exponent (minor unit digits) |
| участник группы                           | Gruppenmitglied                             | group member                          |
| бухгалтер                                 | Buchhalter/in                               | accountant                            |
| шифрование при хранении                   | Verschlüsselung ruhender Daten              | encryption at rest                    |
| мастер-ключ                               | Master-Schlüssel (KEK)                      | master key (key-encryption key)       |
| ключ данных                               | Datenschlüssel                              | data key (data-encryption key)        |
| ротация ключей                            | Schlüsselrotation                           | key rotation                          |
| загрузка файла                            | Datei-Upload                                | file upload                           |
| отпечаток, хеш-сумма                      | Prüfsumme / Hashwert                        | checksum / hash                       |
| простая электронная подпись               | einfache elektronische Signatur             | simple electronic signature (SES)     |
| печать (изображение)                      | Firmenstempel / Stempel                     | stamp                                 |
| инкрементальное сохранение                | inkrementelles Update                       | incremental update / save             |
| обратный прокси                           | Reverse-Proxy                               | reverse proxy                         |
| сертификат TLS                            | TLS-Zertifikat                              | TLS certificate                       |
| миграция базы данных                      | Datenbankmigration                          | database migration                    |
| выкат, развёртывание                      | Bereitstellung / Deployment                 | deployment                            |
| откат                                     | Rollback / Zurücksetzen                     | rollback                              |
| резервная копия                           | Datensicherung / Backup                     | backup                                |
| восстановление                            | Wiederherstellung                           | restore                               |
| учение по восстановлению                  | Wiederherstellungstest                      | restore drill                         |
| срок хранения                             | Aufbewahrungsfrist                          | retention period                      |
| секрет                                    | Secret (vertrauliche Zugangsdaten)          | secret                                |
| проверка здоровья                         | Health-Check                                | health check                          |

### Wave 2 — e-mail, external access, audit trail, polling, demo, monitoring (ADR 0015–0020)

| RU                                    | DE                                            | EN                        |
| ------------------------------------- | --------------------------------------------- | ------------------------- |
| транзакционное письмо                 | Transaktions-E-Mail                           | transactional e-mail      |
| доставляемость                        | Zustellbarkeit                                | deliverability            |
| отказ доставки                        | Unzustellbarkeit (Bounce)                     | bounce                    |
| исходящий ящик (паттерн)              | Outbox-Muster                                 | transactional outbox      |
| повторная попытка                     | Wiederholungsversuch                          | retry                     |
| домен отправителя                     | Absenderdomain                                | sending domain            |
| одноразовый код                       | Einmalcode                                    | one-time code (OTP)       |
| ссылка для подписания                 | Signaturlink / Link zur Unterschrift          | signing link              |
| срок действия                         | Gültigkeitsdauer                              | validity period           |
| перебор                               | Brute-Force-Angriff                           | brute-force attack        |
| ограничение частоты                   | Ratenbegrenzung                               | rate limiting             |
| блокировка доступа                    | Zugriffssperre / Kontosperre                  | lockout                   |
| цепочка хешей                         | Hashkette                                     | hash chain                |
| соль                                  | Salt                                          | salt                      |
| обезличивание                         | Anonymisierung                                | anonymisation             |
| псевдонимизация                       | Pseudonymisierung                             | pseudonymisation          |
| удаление с сохранением доказательства | beweiserhaltende Löschung                     | proof-preserving deletion |
| срок хранения протокола               | Aufbewahrungsfrist des Protokolls             | audit trail retention     |
| опрос                                 | Polling (zyklische Abfrage)                   | polling                   |
| условный запрос                       | bedingte Anfrage                              | conditional request       |
| песочница                             | Sandbox                                       | sandbox                   |
| демо-почта                            | Demo-Postfach                                 | demo inbox                |
| начальные данные                      | Beispieldaten (Seed-Daten)                    | seed data                 |
| холодный старт                        | Kaltstart                                     | cold start                |
| поверхность атаки                     | Angriffsfläche                                | attack surface            |
| отслеживание ошибок                   | Fehlerüberwachung (Error-Tracking)            | error tracking            |
| очистка данных                        | Scrubbing (Entfernen personenbezogener Daten) | data scrubbing            |
| журнал                                | Log / Logdatei                                | log                       |
| сигнал жизни                          | Heartbeat (Lebenszeichen)                     | heartbeat                 |
| оповещение                            | Alarmierung                                   | alerting                  |
| инцидент                              | Störung (Incident)                            | incident                  |

### Wave 3 — Belegscan: recognition, offline, batch import, tax lines, e-invoices, CSV (ADR 0023–0028)

| RU                           | DE                                | EN                                  |
| ---------------------------- | --------------------------------- | ----------------------------------- |
| распознавание текста         | Texterkennung (OCR)               | optical character recognition (OCR) |
| модель распознавания         | Erkennungsmodell                  | recognition model                   |
| фоновый поток                | Web Worker (Hintergrund-Thread)   | web worker                          |
| синтетические данные         | synthetische Daten                | synthetic data                      |
| базовый уровень              | Vergleichsbasis (Baseline)        | baseline                            |
| пробная задача               | Machbarkeitsprüfung (Spike)       | spike                               |
| офлайн-режим                 | Offline-Modus                     | offline mode                        |
| локальное хранилище          | lokaler Speicher                  | local storage (on-device store)     |
| синхронизация                | Synchronisierung                  | synchronisation                     |
| очередь синхронизации        | Synchronisierungswarteschlange    | sync queue                          |
| идемпотентность              | Idempotenz                        | idempotency                         |
| конфликт версий              | Versionskonflikt                  | version conflict                    |
| установка приложения (PWA)   | App-Installation (PWA)            | app installation (PWA)              |
| корзина                      | Papierkorb                        | trash                               |
| потоковая обработка          | Stream-Verarbeitung               | streaming                           |
| ZIP-бомба                    | ZIP-Bombe (Dekompressionsbombe)   | zip bomb                            |
| налоговая строка             | Steuerzeile                       | tax line                            |
| налог с продаж               | Verkaufssteuer (НсП, Kirgisistan) | sales tax (Kyrgyzstan)              |
| ставка налога                | Steuersatz                        | tax rate                            |
| сумма без налога / с налогом | Nettobetrag / Bruttobetrag        | net amount / gross amount           |
| профиль страны               | Länderprofil                      | country profile                     |
| фискальное подтверждение     | Fiskalnachweis                    | fiscal proof                        |
| электронный счёт             | E-Rechnung                        | e-invoice                           |
| вложение PDF                 | PDF-Anhang (eingebettete Datei)   | PDF attachment (embedded file)      |
| источник данных чека         | Datenquelle des Belegs            | receipt data source                 |
| автоподтверждение            | automatische Bestätigung          | auto-confirmation                   |
| история изменений            | Änderungsverlauf                  | change history                      |
| экспорт                      | Export                            | export                              |
| разделитель                  | Trennzeichen                      | delimiter                           |
| CSV-инъекция                 | CSV-Injection (Formel-Injektion)  | CSV injection                       |
| версия схемы                 | Schemaversion                     | schema version                      |

«Налог с продаж» в Кыргызстане — не то же, что немецкая Umsatzsteuer (это название НДС).
Поэтому по-немецки — «Verkaufssteuer (НсП, Kirgisistan)», без слова Umsatzsteuer.
