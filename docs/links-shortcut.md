# Good Links Shortcut

Use the same write endpoint from iOS Shortcuts, CLI, or a browser extension.

Endpoint:

```txt
POST https://caulk.lol/api/links
```

Headers:

```txt
Content-Type: application/json
x-api-key: <generated api key>
```

Body:

```json
{
  "url": "https://example.com",
  "title": "Optional title override",
  "reason": "Why this is worth someone else's time",
  "tags": ["tools", "writing"],
  "source": "ios"
}
```

Shortcut shape:

1. Receive URL from share sheet.
2. Ask for `reason`.
3. Ask for comma-separated `tags`.
4. POST JSON to `/api/links`.
5. Show response status.

Bootstrap owner account once:

```sh
curl -X POST https://caulk.lol/api/admin/bootstrap \
  -H 'Content-Type: application/json' \
  -H "x-bootstrap-token: $ADMIN_BOOTSTRAP_TOKEN" \
  -d '{"email":"'$OWNER_EMAIL'","password":"change-me-now","name":"Zero"}'
```
