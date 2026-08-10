# DNS Setup Guide for zjcanvas.com

To deploy **zjCanvas** on your VPS and enable automatic SSL via Let's Encrypt, you must point your domain DNS records to your VPS public IP address.

---

## Required DNS Records

Log in to your domain registrar (e.g., Namecheap, Cloudflare, GoDaddy, Porkbun) and configure the following DNS records:

| Type | Host / Name | Value / Target | TTL | Description |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `YOUR_VPS_IPV4` | Automatic / 300 | Points domain `zjcanvas.com` to VPS |
| **A** | `www` | `YOUR_VPS_IPV4` | Automatic / 300 | Points `www.zjcanvas.com` to VPS |
| **AAAA** *(Optional)* | `@` | `YOUR_VPS_IPV6` | Automatic / 300 | IPv6 support for `zjcanvas.com` |
| **AAAA** *(Optional)* | `www` | `YOUR_VPS_IPV6` | Automatic / 300 | IPv6 support for `www.zjcanvas.com` |

> **Note**: Replace `YOUR_VPS_IPV4` with your VPS public IPv4 address (e.g., `192.0.2.1`).

---

## Verifying DNS Propagation

Before running `./build.sh`, verify that your DNS records have propagated using `dig` or `nslookup`:

```bash
dig +short zjcanvas.com
dig +short www.zjcanvas.com
```

Or using an online tool like [dnschecker.org](https://dnschecker.org/#A/zjcanvas.com).

Once the DNS records return your VPS IP address, run `sudo ./build.sh` on your VPS to complete automated deployment and SSL certification.
