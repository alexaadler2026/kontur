# Glossary

Domain terms of SignFlow and Belegscan in the three UI languages. German is the
default UI language and the language of the mockups in `docs/design/screens/`.

- **EN marked ✓** is confirmed by the English mockup
  (`docs/design/screens/signflow/DocumentsEN.html`). Unmarked EN and all RU entries
  are working translations; the i18n task finalises them in the translation files.
- Terms are taken from the mockups only — add a term when it first appears in code.

## SignFlow — document signing

| DE                                 | EN                                | RU                                       | Meaning                                                                                    |
| ---------------------------------- | --------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| Umlauf                             | envelope ✓                        | конверт на подпись                       | One or more documents sent to signers in a defined order ("Neuer Umlauf" / "New envelope") |
| Unterzeichnende                    | signers ✓                         | подписанты                               | People who have to sign the document                                                       |
| Vertragspartner                    | counterparty ✓                    | контрагент                               | The other party of the contract                                                            |
| Signaturweg                        | signing route                     | маршрут подписания                       | Order of signers and the state of each signature                                           |
| Frist                              | due date (Due ✓)                  | срок                                     | Date by which all signatures are expected                                                  |
| Entwurf                            | draft ✓                           | черновик                                 | Envelope that has not been sent yet                                                        |
| Wartet                             | waiting ✓                         | ожидает                                  | Status: sent, signatures still missing                                                     |
| Signiert                           | completed ✓                       | подписан                                 | Status: all signatures collected                                                           |
| Überfällig                         | overdue ✓                         | просрочен                                | Status: due date has passed                                                                |
| In Prüfung                         | in review ✓                       | на проверке                              | Status: under internal review                                                              |
| Erinnern                           | remind ✓                          | напомнить                                | Send a reminder to signers who have not signed                                             |
| Stornieren                         | void ✓                            | аннулировать                             | Cancel a sent envelope                                                                     |
| Vorlage                            | template ✓                        | шаблон                                   | Reusable document setup                                                                    |
| Protokoll                          | audit log ✓                       | журнал аудита                            | Chronological record of every event on a document                                          |
| Prüfsumme (SHA-256)                | checksum (SHA-256)                | контрольная сумма (SHA-256)              | Hash proving the document was not changed                                                  |
| Auftragsverarbeitungsvertrag (AVV) | Data Processing Agreement (DPA) ✓ | договор об обработке персональных данных | GDPR contract type, often used as example document                                         |

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
