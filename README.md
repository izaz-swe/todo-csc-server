# Cloud Todo Stack: Decoupled Multi-Container with Tailscale CI/CD

A modern, production-ready starter architecture demonstrating:
- **Decoupled Containers:** Isolated Backend, Frontend (SPA), and Nginx Reverse Proxy.
- **Process Management:** Why Docker replaces PM2 natively.
- **Tailscale Mesh Network:** Private, zero-trust deployment from GitHub Actions without exposing SSH to the public internet.

---

## 1. Architecture Overview

```mermaid
flowchart LR
    subgraph Client_Access ["Access Layer"]
        User["User Browser"]
        GHA["GitHub Actions Runner"]
    end

    subgraph Tailscale_Network ["Tailscale Private Mesh (Tailnet)"]
        TS_IP["Target Host (100.x.y.z / MagicDNS)"]
    end

    subgraph Docker_Host ["Docker Engine (Isolated Network)"]
        Nginx["Nginx Reverse Proxy (:8080 or :80)"]
        Frontend["Frontend SPA (:80 internal)"]
        Backend["Backend API (:5000 internal)"]
    end

    User -->|HTTP Requests| Nginx
    GHA -->|VPN Mesh Deploy| TS_IP
    TS_IP -->|Docker Compose| Nginx

    Nginx -->|Route: /api/*| Backend
    Nginx -->|Route: /*| Frontend
```

### Why Decoupled Containers?
1. **Fault Isolation:** If the backend crashes or runs out of memory, the frontend static assets remain available and vice versa.
2. **Independent Scaling:** Backend and frontend can be updated, rebuilt, or scaled independently.
3. **Security In Depth:** Only the Nginx reverse proxy exposes a port to the host. Frontend and Backend operate on a private Docker bridge network (`app_net`).

---

## 2. Is PM2 Needed with Docker?

> [!IMPORTANT]
> **Short Answer: No.** In a containerized Docker architecture, PM2 is unnecessary and generally an anti-pattern.

| Feature | Handled by PM2 | Handled by Docker / Compose | Why Docker is Preferred |
| :--- | :--- | :--- | :--- |
| **Crash Restart** | `pm2 restart` | `restart: unless-stopped` | Docker engine monitors container lifecycle natively. |
| **Process Monitoring** | PM2 daemon | `HEALTHCHECK` & container stats | Avoids running multiple daemons inside a container. |
| **Logs Management** | PM2 log files | `docker logs` / JSON log drivers | Streams directly to `stdout`/`stderr` adhering to 12-factor app design. |
| **Process Model** | Clusters multiple node processes | 1 container = 1 process | In cloud/microservices, you scale containers rather than processes inside a single container. |
| **Signal Handling** | PM2 intercepts `SIGINT`/`SIGTERM` | Native Node / dumb-init | Node receives graceful shutdown signals directly from Docker. |

**Summary:** Running `node src/index.js` directly inside an Alpine Linux container is the standard industry best practice.

---

## 3. Project Directory Structure

```text
todo-app/
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions CI/CD with Tailscale
├── backend/
│   ├── src/
│   │   └── index.js          # Express API (/api/health, /api/todos)
│   ├── Dockerfile            # Lightweight Node 22 Alpine container
│   ├── package.json
│   └── .dockerignore
├── frontend/
│   ├── src/
│   │   ├── index.html        # Modern SPA Dashboard
│   │   ├── style.css         # Dark-themed responsive styles
│   │   └── app.js            # API fetch and reactive UI logic
│   ├── nginx.conf            # SPA static file server
│   ├── Dockerfile            # Nginx Alpine container
│   └── .dockerignore
├── nginx/
│   ├── nginx.conf            # Central reverse proxy & routing rules
│   └── Dockerfile            # Gateway Nginx container
├── .env.example              # Environment variables template
├── docker-compose.yml        # Multi-container orchestration
└── README.md
```

---

## 4. Local Development & Testing

### Prerequisites
- Docker & Docker Compose installed.
- Ensure your user has Docker permissions:
  ```bash
  sudo usermod -aG docker $USER
  newgrp docker
  ```

### Running the Stack
1. Create your environment file:
   ```bash
   cp .env.example .env
   ```
2. Build and start containers:
   ```bash
   docker compose up -d --build
   ```
3. Test endpoints:
   - **Frontend UI:** Open `http://localhost:8080` in your browser.
   - **Backend Health:** `curl http://localhost:8080/api/health`
   - **Backend Todos:** `curl http://localhost:8080/api/todos`
4. Inspect container statuses:
   ```bash
   docker compose ps
   docker compose logs -f
   ```

---

## 5. Setting up GitHub Actions with Tailscale

Deploying through Tailscale allows GitHub Actions to securely reach servers in your home lab, private cloud, or behind NAT/firewalls **without opening SSH port 22 to the public internet**.

### Step 1: Generate Tailscale OAuth Credentials
1. Go to the [Tailscale Admin Console](https://login.tailscale.com/admin/settings/oauth).
2. Click **Generate OAuth Client**.
3. Under **Scopes**, select `Devices: Read & Write`.
4. Under **Tags**, apply a dedicated tag (e.g., `tag:ci`).
5. Save the **Client ID** and **Client Secret**.

### Step 2: Configure GitHub Repository Secrets
In your GitHub repository, navigate to **Settings ➔ Secrets and variables ➔ Actions** and add:

| Secret Name | Description | Example |
| :--- | :--- | :--- |
| `TS_OAUTH_CLIENT_ID` | Tailscale OAuth Client ID | `k...` |
| `TS_OAUTH_SECRET` | Tailscale OAuth Client Secret | `tskey-client-...` |
| `SSH_PRIVATE_KEY` | Private SSH key of user on target server | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `TARGET_HOST` | Target server Tailscale IP or MagicDNS | `100.109.253.45` or `csc` |
| `TARGET_USER` | SSH username on target server | `csc` or `ubuntu` |
| `TARGET_DIR` | Absolute path to repository on target server | `/home/csc/agy-cli-test/todo-app` |

### Step 3: Trigger the Workflow
Push any commit to `main` or run the workflow manually under the **Actions** tab.
The workflow will:
1. Lint and test backend code.
2. Join your private Tailscale network via `tailscale/github-action@v2`.
3. Open a secure SSH session to your server's Tailscale IP.
4. Execute `docker compose up -d --build` to deploy seamlessly.
---

## 6. Setting up Cloudflare Tunnel Public Hostname

Since your tunnel (`todo-csc`) token is configured in `.env`, the final step is routing your custom subdomain to the Nginx reverse proxy inside Cloudflare Zero Trust:

1. Open **[Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)** ➔ **Networks** ➔ **Tunnels**.
2. Click on your tunnel **`todo-csc`** and select **Configure**.
3. Go to the **Public Hostname** tab and click **Add a public hostname**.
4. Fill in:
   - **Subdomain:** e.g., `todo` (or leave blank for root domain)
   - **Domain:** Select your domain from the dropdown (e.g., `yourdomain.com`)
   - **Type:** `HTTP`
   - **URL:** `proxy:80`
     *(Because both `todo_tunnel` and `todo_proxy` are in the same Docker network `app_net`, Cloudflare Tunnel can resolve `proxy` directly by its container service name).*
5. Click **Save Hostname**.

Now your application is publicly accessible at `https://todo.yourdomain.com` with automatic HTTPS, DDoS protection, and CDN caching!
