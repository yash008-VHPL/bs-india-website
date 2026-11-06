# Catalogue request API

`POST /api/catalogue-request` - used by `/catalogue`. Stores the request in Azure Table Storage, emails the catalogue from a BSI Microsoft 365 mailbox via Microsoft Graph, and notifies the leads inbox. Node 22, Azure Functions v3 model, run as Static Web Apps managed functions.

## Catalogue file

Private blob container `catalogue`, blob `catalogue.pdf`, in the same storage account as the leads table. Never in the repo (it is public) or in `public/` (downloadable without the form). Replacing the blob takes effect within 10 minutes.

Size: under 2.8 MiB, or from 3 MiB up to ~10 MB. Sizes in between are refused (too big to send inline, too small for a Graph upload session). 3 MiB and over also needs the Mail.ReadWrite role below.

## App settings (Static Web App > Environment variables, per environment)

| Setting | Value |
|---|---|
| `GRAPH_TENANT_ID` | BSI Microsoft 365 tenant ID |
| `GRAPH_CLIENT_ID` | App registration (client) ID |
| `GRAPH_CLIENT_SECRET` | Client secret - note its expiry date |
| `MAIL_SENDER` | Dedicated mailbox the catalogue is sent from (not a staff mailbox) |
| `NOTIFY_TO` | Inbox that receives each lead |
| `LEADS_TABLE_CONNECTION` | Storage account connection string (table + catalogue blob) |
| `IP_HASH_SALT` | Long random secret. Without it the per-IP limit is off |
| `LEADS_TABLE_NAME` | Optional, default `CatalogueRequests` |
| `CATALOGUE_CONTAINER` / `CATALOGUE_BLOB` | Optional, default `catalogue` / `catalogue.pdf` |
| `CATALOGUE_NAME` | Optional attachment file name |
| `CATALOGUE_DAILY_CAP` | Optional, default 200 requests per 24 h across the site |

## Mail permission - scoped to one mailbox

Do **not** grant `Mail.Send` or `Mail.ReadWrite` application permission in Entra. Entra grants are added to Exchange scoping, so an Entra grant lets the app send as any mailbox in the tenant. Use Exchange Online RBAC for Applications instead:

```powershell
Connect-ExchangeOnline
New-ServicePrincipal -AppId <GRAPH_CLIENT_ID> -ObjectId <Enterprise application object ID> -DisplayName "BSI website mailer"
New-ManagementScope -Name "BSI website sender" -RecipientRestrictionFilter "PrimarySmtpAddress -eq '<MAIL_SENDER>'"
New-ManagementRoleAssignment -App <GRAPH_CLIENT_ID> -Role "Application Mail.Send" -CustomResourceScope "BSI website sender"
# Only if the catalogue PDF is 3 MiB or larger (draft + upload session):
New-ManagementRoleAssignment -App <GRAPH_CLIENT_ID> -Role "Application Mail.ReadWrite" -CustomResourceScope "BSI website sender"
Test-ServicePrincipalAuthorization -Identity <GRAPH_CLIENT_ID> -Resource <MAIL_SENDER>
```

The object ID is the one on the Enterprise applications page, not App registrations. Changes take 30 minutes to 2 hours to apply.

## Limits and abuse

- 3 requests per mailbox per 24 h (`+tags` and Gmail dots folded), 10 per IP per hour, site-wide daily cap.
- Failed sends do not count towards the per-mailbox limit.
- If the limits cannot be checked, nothing is sent (fails closed).
- Honeypot field and minimum fill time: such requests are stored with status `suspect`, nothing is sent.
- The name accepts letters, spaces and `.'-` only, so no links can be carried into the email.

## Data

Rows: name, email, phone, salted IP hash, user agent, status (`received`, `sent`, `failed`, `suspect`), error. No retention purge yet.

## Tests

`cd api && npm ci && npm test` (mocked network; also run in the deploy workflow).
