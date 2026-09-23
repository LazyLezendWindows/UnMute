# Unmute — 100% Free Forever (₹0) Deployment Guide
### 🛡️ Zero-Risk Guarantee: No Credit Card Required & No Surprise Charges

This guide is designed for **100% peace of mind**:
* **No credit card or debit card is ever entered.**
* **It is physically impossible to be charged later.**
* If a free tier limit is ever reached, services simply pause until the next month rather than billing you.
* Both your app server and database run completely free forever (**₹0 / month**).

---

## The Safe Stack (No Card Required)

| Component | Provider | Why It Cannot Charge You | Cost |
| :--- | :--- | :--- | :--- |
| **Compute & Realtime API** | **Koyeb** or **Render** | Sign up with GitHub. No credit card asked. | **₹0.00** |
| **Web App (Vue PWA)** | Served by Backend | Bundled inside the same instance. | **₹0.00** |
| **Database (MariaDB)** | **Aiven** | Official Free Plan. No credit card asked. | **₹0.00** |
| **SSL / HTTPS** | Automated | Free certificates renew automatically. | **₹0.00** |

---

## Option 1: Koyeb (Fastest & Simplest — No Card Needed)

Koyeb is a modern global cloud platform that allows you to deploy Node.js apps straight from GitHub with **no credit card required**.

### Step 1: Create Free MariaDB on Aiven (No Card)
1. Go to [https://aiven.io](https://aiven.io) and click **Try for free** (Sign up with GitHub or Google).
2. Click **Create service** $\rightarrow$ Select **MySQL** or **MariaDB**.
3. Choose the **Free Plan** (Includes 1 CPU, 1 GB RAM, 5 GB storage — completely free forever).
4. Select a region (e.g., Mumbai, Singapore, or Frankfurt).
5. Name it `unmute-db` and click **Create Service**.
6. Copy your **Service URI** from the service dashboard:
   ```text
   mysql://avnadmin:password@mysql-xxxxx.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED
   ```
   *(Change `defaultdb` to `unmute_db` at the end).*

---

### Step 2: Push Your Code to GitHub
Make sure your latest code is pushed to your GitHub repository:
```bash
git add .
git commit -m "feat: configure zero-cost deployment"
git push origin implementation_version1
```

---

### Step 3: Deploy on Koyeb (No Card)
1. Go to [https://app.koyeb.com](https://app.koyeb.com) and sign up with your **GitHub account**.
2. Click **Create Service** $\rightarrow$ Select **GitHub**.
3. Authorize Koyeb and select your repository: `LazyLezendWindows/UnMute`.
4. Choose your branch: `implementation_version1`.
5. Under **Build and deployment settings**:
   * **Build command**: `npm install && npm run build`
   * **Run command**: `npm run start`
6. Under **Environment variables**, click **Add variable**:
   * `NODE_ENV`: `production`
   * `PORT`: `5000`
   * `TRUST_PROXY`: `1`
   * `SESSION_COOKIE_SAMESITE`: `lax`
   * `DATABASE_URL`: *(Paste your Aiven Service URI from Step 1)*
7. Under **Instance type**, confirm it is set to **Eco (Free)**.
8. Click **Deploy**.

Within 2 minutes, your service will be live on an HTTPS domain:
👉 `https://<your-app-name>.koyeb.app`

---

## Option 2: Render (Free Web Service — No Card Needed)

Render also lets you sign up with GitHub without entering any payment info.

1. Go to [https://render.com](https://render.com) and sign in with GitHub.
2. Click **New +** $\rightarrow$ **Web Service**.
3. Select `LazyLezendWindows/UnMute`.
4. Fill in:
   * **Name**: `unmute`
   * **Runtime**: `Node`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm run start`
   * **Instance Type**: **Free** (0 USD / 0 INR)
5. Under **Environment Variables**, add:
   * `NODE_ENV`: `production`
   * `TRUST_PROXY`: `1`
   * `SESSION_COOKIE_SAMESITE`: `lax`
   * `DATABASE_URL`: *(Your Aiven Service URI from Step 1)*
6. Click **Create Web Service**.

Your live URL will be:
👉 `https://unmute.onrender.com`

---

## Option 3: 100% Self-Hosted via Cloudflare Tunnel (Absolute Zero External Dependency)

If you don't even want your code on a 3rd party host and want to run it from your own computer with zero possibility of any bill:

1. Build and run production locally:
   ```bash
   npm run build
   PORT=5000 npm run start
   ```
2. In another terminal, run Cloudflare's free tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:5000
   ```
3. Cloudflare gives you a secure `https://xxx.trycloudflare.com` address that connects anyone on the internet to your app for ₹0.

---

## Frequently Asked Questions

#### Will I ever get a surprise bill?
**No.** Neither Koyeb nor Render nor Aiven ask for card details for their free plans. They physically do not have a payment method to charge.

#### What happens if too many people use it?
If your monthly bandwidth or hours reach the free cap, the service temporarily sleeps until the 1st of the next month. It will **never** automatically upgrade or bill you.

#### Does real-time chat (WebSockets) work on the free plan?
**Yes.** Koyeb, Render, and Cloudflare Tunnel all support WebSockets natively on their free tiers.
