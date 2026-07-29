# Deploying MassifyX Global

Two parts: running it locally to check things, and putting it on a server.

---

## 1. Run it on your own machine

You need [Node.js 20 or newer](https://nodejs.org). Check with `node --version`.

```bash
git clone https://github.com/punsarachamodya-alpx/MassifyX_Global.git
cd MassifyX_Global
npm install
```

Create the `.env` file:

```bash
cp .env.example .env
```

Generate the two secrets and paste them into `.env`:

```bash
node -e "console.log('ADMIN_PASSWORD=' + require('crypto').randomBytes(12).toString('base64url'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

`.env` should end up looking like this:

```
PORT=3000
ADMIN_PASSWORD=sxfHeFOop4TICZj8
SESSION_SECRET=77c20c93cf88952af85e9770ddc6526cf28887724a0e99d6717e6516457eb568
NODE_ENV=production
BASE_URL=https://www.massifyx.com
```

Then start it:

```bash
npm run dev     # auto-restarts when you edit a file
```

Open <http://localhost:3000>, and the admin panel at <http://localhost:3000/admin>.

Both `npm start` and `npm run dev` read `.env` automatically. If the file is missing
they still start — you get a warning, the public site works, and `/admin` logins are
refused until `ADMIN_PASSWORD` is set. That is deliberate: a misconfigured server can
never be left wide open.

---

## 2. Put it on Hostinger

### Check your plan first — this matters

**Hostinger Web/Shared/Cloud hosting cannot run this site.** Those plans run PHP, not
Node.js. There is no way to `npm start` on them.

You need a **Hostinger VPS** (their cheapest, KVM 1, is around €5–7/month). That also
solves the persistent-disk problem below, because a VPS has a normal, permanent
filesystem.

If you are currently on shared hosting, you will need to upgrade to a VPS. Check what
you have in hPanel before going further.

### Why the filesystem matters

Admin panel edits are saved to `data/content.json`, and uploaded images to
`public/img/uploads/`. On hosts that hand each deploy a **fresh** filesystem (Render's
free tier, Railway, Heroku, Vercel), both are silently wiped on the next redeploy —
your content edits would just disappear.

A VPS keeps its disk between restarts and deploys, so this is a non-issue there. If
you ever move to an ephemeral host, either attach a persistent volume, or stop using
the admin panel and edit `content/*.js` in code instead.

### VPS setup, step by step

SSH into your VPS (hPanel shows the IP and root password):

```bash
ssh root@YOUR_SERVER_IP
```

**Install Node.js 22:**

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs nginx git
node --version
```

**Create a non-root user to run the app:**

```bash
adduser --system --group --home /var/www/massifyx massifyx
```

**Get the code:**

```bash
git clone https://github.com/punsarachamodya-alpx/MassifyX_Global.git /var/www/massifyx
cd /var/www/massifyx
npm ci --omit=dev
chown -R massifyx:massifyx /var/www/massifyx
```

**Write the secrets file** (root-only, never in git):

```bash
install -m 600 /dev/null /etc/massifyx.env
nano /etc/massifyx.env
```

Put this in it, with your own generated values:

```
PORT=3000
NODE_ENV=production
BASE_URL=https://www.massifyx.com
ADMIN_PASSWORD=your-generated-password
SESSION_SECRET=your-generated-secret
```

**Start it as a service** so it survives crashes and reboots:

```bash
cp /var/www/massifyx/deploy/massifyx.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now massifyx
systemctl status massifyx
```

**Put nginx in front** and point your domain at it:

```bash
cp /var/www/massifyx/deploy/nginx.conf /etc/nginx/sites-available/massifyx
ln -s /etc/nginx/sites-available/massifyx /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

In hPanel, point the `massifyx.com` A record at your VPS IP. Once DNS has propagated,
add HTTPS:

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d massifyx.com -d www.massifyx.com
```

The nginx config forwards `X-Forwarded-For` and `X-Forwarded-Proto`. Those are not
optional — the app trusts them for visitor IPs (used by the admin lockout) and for
secure cookies. Without them, one failed login would lock out every visitor at once.

### Deploying an update

```bash
cd /var/www/massifyx
git pull
npm ci --omit=dev
systemctl restart massifyx
```

`data/` is gitignored, so your admin edits survive `git pull` untouched.

---

## 3. Backups

The admin panel snapshots content before every save and keeps the most recent 30, in
`data/backups/`. That protects against a bad edit, not against losing the server.

For off-server copies, either use **Export** in the admin panel now and then, or add a
nightly cron job:

```bash
crontab -e
```

```
0 3 * * * cp /var/www/massifyx/data/content.json /root/massifyx-backup-$(date +\%F).json
```

Hostinger VPS plans also include weekly snapshots — worth switching on in hPanel.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `/admin` login always fails | `ADMIN_PASSWORD` not set. Check `systemctl status massifyx` for the boot warning. |
| Logged out after every restart | `SESSION_SECRET` not set, so a new one is generated each boot. |
| "Too many attempts" for everyone | nginx is not forwarding `X-Forwarded-For`, so every visitor shares one IP. |
| Admin edits vanish after deploy | Ephemeral filesystem — you need a VPS or a persistent volume. |
| 502 Bad Gateway | The Node service is not running: `systemctl status massifyx`, `journalctl -u massifyx -n 50`. |
| Booking iframe blank | The CSP only allows the origin saved in the admin panel. Re-save the booking URL. |

Live logs: `journalctl -u massifyx -f`
