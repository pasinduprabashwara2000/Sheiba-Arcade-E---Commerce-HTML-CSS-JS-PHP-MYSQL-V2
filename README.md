# Sheiba Arcade

Computer shop website — PHP + MySQL API with a plain HTML / jQuery / Bootstrap frontend.

- **Customers:** sign up, log in, add products to a cart and see the total.
- **Admin:** logging in with an admin account opens the admin panel (separate layout) to manage products.

## Requirements

- XAMPP (Apache + MySQL/MariaDB + PHP 8+) — or any equivalent stack
- Apache `mod_rewrite` enabled (it is by default in XAMPP)

## Setup (local, XAMPP)

### 1. Put the project in `htdocs`

Copy the folder so that `index.html` sits directly inside it:

```
/opt/lampp/htdocs/sheiba-arcade-v1/index.html     (Linux)
C:\xampp\htdocs\sheiba-arcade-v1\index.html       (Windows)
```

If you get a 403 "Access forbidden" page, `index.html` is not directly inside the folder you are visiting, or file permissions are wrong (see Troubleshooting).

### 2. Create the database

1. Start **Apache** and **MySQL** in the XAMPP control panel.
2. Open http://localhost/phpmyadmin
3. Click **New**, create a database named **`sheiba_arcade`** (collation `utf8mb4_general_ci`).
4. Select it, open the **Import** tab and import **`if0_40777956_sheiba_arcade.sql`**.

This file already contains the products, the `role` column and the default admin account.

> **Already have a database from the old version?** Don't re-import. Open the **SQL** tab and run `api/migration_add_roles.sql` once instead.

### 3. Check the database settings

`api/config/database.php` uses the XAMPP defaults:

| Setting  | Value           |
|----------|-----------------|
| host     | `localhost`     |
| username | `root`          |
| password | *(empty)*       |
| dbname   | `sheiba_arcade` |

Change them there if yours are different.

### 4. Set the token secret

Open `api/config/auth.php` and replace the value of `AUTH_SECRET` with your own long random string (for example 64 random characters). Never share it or commit the production value. Changing it logs everyone out.

### 5. Make uploads writable (Linux / macOS)

Admin product images are saved to `api/uploads/`:

```bash
sudo chmod -R 755 /opt/lampp/htdocs/sheiba-arcade-v1
sudo chmod -R 775 /opt/lampp/htdocs/sheiba-arcade-v1/api/uploads
```

### 6. Open the site

- Store: http://localhost/sheiba-arcade-v1/
- API check: http://localhost/sheiba-arcade-v1/api/ should show `{"status":"API running", ...}`

The frontend finds the API automatically: on `localhost` it uses `/<project-folder>/api`, anywhere else it uses `https://sheiba.lk/api` (see `js/common.js`).

## Logins

| Account  | Username | Password   | Goes to           |
|----------|----------|------------|-------------------|
| Admin    | `admin`  | `password` | Admin panel       |
| Customer | sign up at `signup.html` | your choice | Store + cart |

**Change the admin password before going live.** Generate a hash and update the row in phpMyAdmin:

```bash
php -r 'echo password_hash("YourNewPassword", PASSWORD_DEFAULT), "\n";'
```

```sql
UPDATE users SET password = 'PASTE_HASH_HERE' WHERE username = 'admin';
```

### Making another admin

Sign the person up as a normal customer, then in phpMyAdmin run:

```sql
UPDATE users SET role = 'admin' WHERE username = 'their_username';
```

Admin accounts can only be created this way, never from the website.

## Deploying to a live server

1. Upload everything (including `api/uploads/`) to the web root.
2. Create the database in cPanel/hosting and import the SQL file.
3. Edit `api/config/database.php` with the hosting database name, user and password.
4. Set a new `AUTH_SECRET` in `api/config/auth.php`.
5. Make sure `api/uploads/` is writable.

## Project structure

```
index.html, category.html, product.html   Storefront
cart.html                                 Customer cart + total
login.html, signup.html                   Authentication pages
admin.html, admin-top-selling.html        Admin panel (admin role only)
css/                                      style.css (store), admin-panel.css (admin), auth.css (login/signup)
js/                                       common.js (session, cart, navbar), page scripts
api/index.php                             API router
api/controllers/, api/models/             Auth and product logic
api/config/                               database.php, auth.php
api/uploads/                              Product images
api/migration_add_roles.sql               One-time upgrade for older databases
if0_40777956_sheiba_arcade.sql            Full database dump
```

## API summary

| Method | Route | Access |
|--------|-------|--------|
| POST | `/signup`, `/login` | Public |
| GET  | `/me` | Logged in |
| GET  | `/products`, `/products/{id}`, `/products/category/...`, `/products/top-selling` | Public |
| POST | `/products`, `/products/{id}` (update), `/products/{id}/top-selling` | **Admin only** |
| DELETE | `/products/{id}` | **Admin only** |

Logged-in requests send the token in an `X-Auth-Token` header.

## Troubleshooting

**403 Access forbidden** — you opened a folder with no `index.html` (directory listing is disabled), or Apache cannot read the files. Make sure `index.html` is directly inside the project folder and run the `chmod` commands in step 5. Open `.../sheiba-arcade-v1/` or `.../login.html`, not `/css/` or `/api/uploads/`.

**"Database connection failed" / blank products** — MySQL is not running, or the database name/user/password in `api/config/database.php` do not match.

**Login says "Network error"** — the API is not reachable. Open `http://localhost/sheiba-arcade-v1/api/` and confirm it returns JSON. The folder name in the URL must be the real folder name in `htdocs`.

**Signup/login works but you are sent back to the login page on admin actions** — your token expired or `AUTH_SECRET` was changed. Log in again.

**Image upload fails** — `api/uploads/` is not writable (step 5).

**Error "Unknown column 'role'"** — the old database is missing the new column. Run `api/migration_add_roles.sql` once.
