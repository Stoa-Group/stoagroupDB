# Backend Guide: Upcoming Dates Reminder Settings

This guide describes the **global** reminder settings for the **Key dates & covenants** (Upcoming Dates) view and what the backend should implement so reminders can be stored and sent in one place for all covenant dates.

## Overview

- **Frontend behavior**: Reminder configuration is no longer per-covenant. Users set **one** set of reminder settings in **Key dates & covenants → Reminder settings** (who receives emails and how many days before each date to send).
- **Storage**: The frontend currently persists settings in `localStorage` under the key `banking_upcoming_dates_reminder_settings`. When the backend exposes an API, the frontend will call it to save/load these settings so they are shared across users and devices.
- **Sending**: The backend should run a scheduled job (e.g. daily) that:
  - Loads the saved reminder settings (recipients + days before).
  - Loads all relevant upcoming covenant dates (from existing loans only; see “Upcoming dates only for existing loans” below).
  - For each date and each “days before” value (e.g. 7, 14, 30, 60, 90), if “today” is exactly that many days before the date, send one reminder email to the configured recipients for that covenant/date.

---

## 1. Settings payload (frontend → backend)

The frontend saves an object of this shape (same structure as in `localStorage`):

```json
{
  "recipientEmails": ["user1@example.com", "user2@example.com"],
  "additionalEmails": "extra@example.com, other@example.com",
  "daysBefore": [7, 14, 30, 60, 90]
}
```

- **recipientEmails**: Array of email addresses (from selected contacts and chips).
- **additionalEmails**: Optional string of comma-separated emails (stored as-is; backend should parse and merge with `recipientEmails` when sending).
- **daysBefore**: Array of integers: days before the covenant date to send a reminder (e.g. `[7, 14, 30, 60, 90]`).

---

## 2. API contract (recommended)

### Get reminder settings

- **Endpoint**: `GET /api/banking/settings/upcoming-dates-reminders`
- **Response**: Same shape as above (e.g. `{ recipientEmails: string[], additionalEmails: string, daysBefore: number[] }`). Return defaults if none saved.

### Save reminder settings

- **Endpoint**: `PUT /api/banking/settings/upcoming-dates-reminders`
- **Body**: Same object as in §1.
- **Response**: Success/error; frontend will still persist to `localStorage` as a fallback.

If you use a different path or auth (e.g. per-user or per-tenant), document it and the frontend can be updated to call `window.API.saveUpcomingDatesReminderSettings(payload)` and a corresponding getter so the app loads/saves from the API when available.

---

## 3. Frontend integration (optional)

The app already defines:

- **Load**: `getUpcomingDatesReminderSettings()` – currently reads from `localStorage` only. When the backend is ready, the frontend can be updated to call something like `window.API.getUpcomingDatesReminderSettings()` first and fall back to `localStorage` if the API is unavailable.
- **Save**: `saveUpcomingDatesReminderSettings(settings)` – currently writes to `localStorage` and, if present, calls `window.API.saveUpcomingDatesReminderSettings(settings)`. So once the API exposes that function (or an equivalent that the api-client attaches to `window.API`), the frontend will automatically persist to the backend when the user clicks “Save settings” in the Reminder settings modal.

No change to the api-client is required by the frontend guide; the backend team can add `getUpcomingDatesReminderSettings` and `saveUpcomingDatesReminderSettings` to the API and the existing `saveUpcomingDatesReminderSettings()` in the app will use them.

---

## 4. Upcoming dates only for existing loans

The frontend already restricts **which** covenant dates appear in Upcoming Dates:

- Only covenants whose **loan still exists** are shown (or project-level covenants with no loan).
- Implementation: `window.LOANS_DATA` is used to build a set of existing `LoanId`s; covenants with a non-null `LoanId` are included only if that `LoanId` is in that set.

The backend should apply the same rule when deciding which covenant dates are eligible for **scheduled reminders**:

- Include covenant dates only for covenants that are tied to a loan that still exists (or project-level covenants).
- Do not send reminders for covenants whose loan has been deleted.

---

## 5. Sending reminder emails (backend job)

Recommended flow:

1. **Load** reminder settings (recipients + `daysBefore`) from your storage (or from the new settings API).
2. **Build** the list of upcoming covenant dates (only for existing loans / project-level), e.g. from your covenants and loans tables, with at least: covenant id, project/deal name, date, type, and any fields needed for the email body.
3. **For each** (date, daysBefore) pair:
   - If “today” is exactly `daysBefore` days before that date, send one reminder email to the combined recipient list (recipientEmails + parsed additionalEmails).
4. Use a single **email template** for “upcoming covenant date reminder” (property name, date, type, days until, etc.). The existing covenant reminder email template (if any) can be adapted or reused for this.

No change is required to the **per-row “Send reminder”** button in the Upcoming Dates table: that can remain an ad-hoc “send now” action (current behavior). The **scheduled** reminders are entirely driven by the global reminder settings and the job above.

---

## 6. Summary

| Item | Description |
|------|-------------|
| **Settings shape** | `{ recipientEmails: string[], additionalEmails: string, daysBefore: number[] }` |
| **Get settings** | `GET /api/banking/settings/upcoming-dates-reminders` (or equivalent) |
| **Save settings** | `PUT /api/banking/settings/upcoming-dates-reminders` (or equivalent); frontend calls `window.API.saveUpcomingDatesReminderSettings(settings)` when available |
| **Who receives** | Merged list from `recipientEmails` and parsed `additionalEmails` |
| **When** | For each covenant date, send on the days that are exactly `daysBefore` days before that date (e.g. 7, 14, 30, 60, 90) |
| **Which dates** | Only covenant dates for covenants whose loan still exists (or project-level); exclude covenants whose loan has been deleted |

If the backend implements the above, the frontend’s Reminder settings modal and existing save/load logic will work with it with minimal or no further frontend changes.
