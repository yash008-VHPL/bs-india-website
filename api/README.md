# Catalogue request API

`POST /api/catalogue-request` - used by `/catalogue`. Stores the request in Azure Table Storage, emails the catalogue from a BSI Microsoft 365 mailbox via Microsoft Graph, and notifies the leads inbox.

## Catalogue file

`api/catalogue/catalogue.pdf` (not `public/` - anything there is downloadable without the form). Keep it under ~10 MB; many receiving servers reject larger mail.

## App settings (Static Web App > Environment variables)

| Setting | Value |
|---|---|
| `GRAPH_TENANT_ID` | BSI Microsoft 365 tenant ID |
| `GRAPH_CLIENT_ID` | App registration (client) ID |
| `GRAPH_CLIENT_SECRET` | Client secret - note its expiry date |
| `MAIL_SENDER` | Mailbox the catalogue is sent from |
| `NOTIFY_TO` | Inbox that receives each lead |
| `LEADS_TABLE_CONNECTION` | Storage account connection string |
| `LEADS_TABLE_NAME` | Optional, default `CatalogueRequests` |
| `IP_HASH_SALT` | Optional random string; IPs are stored hashed |
| `CATALOGUE_NAME` | Optional attachment file name |

## Mail permission - scoped to one mailbox

Do **not** grant `Mail.Send` application permission in Entra (that lets the app send as any mailbox in the tenant). Use Exchange Online RBAC for Applications so it can only send as `MAIL_SENDER`:

```powershell
Connect-ExchangeOnline
New-ServicePrincipal -AppId <GRAPH_CLIENT_ID> -ObjectId <enterprise-app-object-id> -DisplayName "BSI website mailer"
New-ManagementScope -Name "BSI website sender" -RecipientRestrictionFilter "PrimarySmtpAddress -eq '<MAIL_SENDER>'"
New-ManagementRoleAssignment -App <GRAPH_CLIENT_ID> -Role "Application Mail.Send" -CustomResourceScope "BSI website sender"
Test-ServicePrincipalAuthorization -Identity <GRAPH_CLIENT_ID> -Resource <MAIL_SENDER>
```

## Limits

3 requests per email address per 24 h, 10 per IP per hour. Honeypot field and minimum fill time drop bots silently.

## Tests

`cd api && npm ci && npm test` (mocked network; also run in the deploy workflow).
