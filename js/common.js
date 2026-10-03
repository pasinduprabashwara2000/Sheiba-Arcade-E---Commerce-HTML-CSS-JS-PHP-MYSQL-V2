const API_URL = (function() {
    const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    if (!isLocal) return "https://sheiba.lk/api";

    const firstSegment = window.location.pathname.split("/").filter(Boolean)[0];
    const projectFolder = firstSegment ? `/${firstSegment}` : "";
    return `${window.location.origin}${projectFolder}/api`;
})();

/* ---------------- Session (token + role issued by the API) ---------------- */
function getToken() { return localStorage.getItem("authToken") || ""; }
function getRole() { return localStorage.getItem("userRole") || ""; }
function isLoggedIn() {
    return localStorage.getItem("isLoggedIn") === "true" && !!getToken();
}
function isAdmin() { return isLoggedIn() && getRole() === "admin"; }
function getUsername() {
    return localStorage.getItem("username") || "User";
}
function saveSession(data) {
    const u = data.user || {};
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("authToken", data.token || "");
    localStorage.setItem("userRole", u.role || "customer");
    localStorage.setItem("username", u.username || "");
    localStorage.setItem("userId", u.id || "");
    localStorage.setItem("userEmail", u.email || "");
}
function clearSession() {
    ["isLoggedIn", "authToken", "userRole", "username", "userId", "userEmail"]
        .forEach(k => localStorage.removeItem(k));
}
function logout() {
    clearSession();
    window.location.href = "index.html";
}
/* Where to send someone right after signing in */
function homeForRole(role) {
    return role === "admin" ? "admin.html" : "index.html";
}
/* Only allow same-site relative page names in ?next= (prevents open redirects) */
function safeNext(value) {
    return /^[a-z0-9\-]+\.html(\?[^#\s]*)?$/i.test(value || "") ? value : "";
}

/* Send the token on every write request (POST/PUT/DELETE). Public GETs stay header-free. */
$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        const token = getToken();
        if (token && (settings.type || "GET").toUpperCase() !== "GET") {
            xhr.setRequestHeader("X-Auth-Token", token);
        }
    }
});
/* Expired / revoked token -> back to the login page */
$(document).ajaxError(function(event, xhr, settings) {
    const url = settings.url || "";
    if ((xhr.status === 401 || xhr.status === 403) && getToken() &&
        url.indexOf(API_URL) === 0 && !/\/(login|signup)$/.test(url)) {
        clearSession();
        window.location.href = "login.html";
    }
});

/* ---------------- Cart (per-customer, stored in this browser) ---------------- */
function cartKey() { return "sheibaCart_" + (localStorage.getItem("userId") || "guest"); }
function getCart() {
    try {
        const c = JSON.parse(localStorage.getItem(cartKey()) || "[]");
        return Array.isArray(c) ? c : [];
    } catch (e) { return []; }
}
function saveCart(cart) {
    localStorage.setItem(cartKey(), JSON.stringify(cart));
    updateCartBadge();
}
function cartCount() { return getCart().reduce((n, i) => n + i.qty, 0); }
function cartTotal() { return getCart().reduce((t, i) => t + i.price * i.qty, 0); }
function addToCart(product, qty) {
    qty = qty || 1;
    const cart = getCart();
    const id = Number(product.id);
    const existing = cart.find(i => i.id === id);
    if (existing) {
        existing.qty = Math.min(99, existing.qty + qty);
        existing.price = Number(product.newPrice);
    } else {
        cart.push({
            id: id,
            name: product.name,
            price: Number(product.newPrice) || 0,
            image: product.image || "",
            qty: Math.min(99, qty)
        });
    }
    saveCart(cart);
}
function updateCartBadge() {
    const n = cartCount();
    $(".cart-badge").text(n).toggle(n > 0);
}
/* Shared "Add to cart" click handler used by the product page and category cards */
function handleAddToCart(product) {
    if (!isLoggedIn()) {
        const page = window.location.pathname.split("/").pop() || "index.html";
        window.location.href = "login.html?next=" + encodeURIComponent(page + window.location.search);
        return;
    }
    if (isAdmin()) {
        showToast("Admins manage products from the admin panel - the cart is for customers.", "secondary");
        return;
    }
    addToCart(product, 1);
    showToast(`Added "${product.name}" to your cart`, "success");
}
function showToast(message, type) {
    let $wrap = $("#toast-wrap");
    if (!$wrap.length) $wrap = $('<div id="toast-wrap" class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index:2000"></div>').appendTo("body");
    const $t = $(`<div class="toast align-items-center text-bg-${type || "dark"} border-0" role="status">
        <div class="d-flex"><div class="toast-body">${escapeHtml(message)} &middot; <a class="text-white fw-semibold" href="cart.html">View cart</a></div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>`);
    $wrap.append($t);
    const toast = new bootstrap.Toast($t[0], { delay: 3500 });
    $t.on("hidden.bs.toast", () => $t.remove());
    toast.show();
}

function initNavbar() {
    const loggedIn = isLoggedIn();
    const username = getUsername();

    const admin = isAdmin();
    const cartLink = `<a href="cart.html" class="btn btn-outline-light me-2 position-relative nav-cart-btn" aria-label="Cart">
            <i class="bi bi-cart3"></i><span class="cart-badge" style="display:none">0</span></a>`;

    if ($("#desktop-auth-slot").length) {
        if (!loggedIn) {
            $("#desktop-auth-slot").html(cartLink +
                `<a class="btn btn-outline-light me-2" href="signup.html">Sign up</a>
                 <button class="btn btn-dark me-2" id="desktop-login-btn">Log in</button>`);
            $("#desktop-login-btn").on("click", () => { window.location.href = "login.html"; });
        } else {
            $("#desktop-auth-slot").html((admin ? "" : cartLink) + `
                <div class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle text-white" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        Welcome, ${escapeHtml(username)}
                    </a>
                    <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end">
                        ${admin
                            ? `<li><a class="dropdown-item" href="admin.html">Admin Panel</a></li>`
                            : `<li><a class="dropdown-item" href="cart.html">My Cart</a></li>`}
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" id="desktop-logout-link">Logout</a></li>
                    </ul>
                </div>`);
            $("#desktop-logout-link").on("click", function(e) {
                e.preventDefault();
                logout();
            });
        }
    }

    if ($("#flyout-footer-slot").length) {
        if (!loggedIn) {
            $("#flyout-footer-slot").html(
                `<a class="flyout-btn-ghost text-center text-decoration-none" href="signup.html">Sign up</a>
                 <button class="flyout-btn-primary" id="flyout-login-btn">Log in</button>`);
            $("#flyout-login-btn").on("click", () => { window.location.href = "login.html"; });
        } else {
            $("#flyout-footer-slot").html(`
                <span class="flyout-username">Hi, ${escapeHtml(username)}</span>
                <button class="flyout-btn-ghost" id="flyout-logout-btn">Logout</button>`);
            $("#flyout-logout-btn").on("click", logout);
        }
    }

    // Mobile: cart icon next to the hamburger + a flyout link
    if (!admin && $(".mobile-topbar").length && !$(".mobile-cart").length) {
        $("#mobile-hamburger").before(`<a href="cart.html" class="mobile-cart" aria-label="Cart">
            <i class="bi bi-cart3"></i><span class="cart-badge" style="display:none">0</span></a>`);
    }
    if (!admin && $(".flyout-nav-body").length && !$("#flyout-cart-link").length) {
        $(".flyout-nav-body").append(`<div class="flyout-divider"></div>
            <a class="flyout-link" id="flyout-cart-link" href="cart.html">My Cart</a>`);
    }
    updateCartBadge();

    $("#flyout-manage-products").text("Admin Panel").attr("href", "admin.html").toggle(admin);
    $("#flyout-manage-top-selling").hide();
    $("#flyout-manage-products-divider").toggle(admin);

    const $overlay = $("#flyout-overlay");
    const $panel = $("#flyout-panel");

    function openFlyout() {
        $overlay.addClass("flyout-open");
        $panel.addClass("flyout-open");
        $("body").css("overflow", "hidden");
    }
    function closeFlyout() {
        $overlay.removeClass("flyout-open");
        $panel.removeClass("flyout-open");
        $("body").css("overflow", "");
    }

    $("#mobile-hamburger").on("click", openFlyout);
    $overlay.on("click", closeFlyout);
    $("#flyout-close-btn").on("click", closeFlyout);
    $(".flyout-panel a").on("click", closeFlyout);

    $("#flyout-accordion-btn").on("click", function() {
        const $body = $("#flyout-components");
        const open = $body.is(":visible");
        $body.toggle(!open);
        $(this).toggleClass("open", !open);
        $("#flyout-chevron").text(open ? "▼" : "▲");
    });
}

function escapeHtml(str) {
    return $("<div>").text(String(str ?? "")).html();
}
function formatNumber(n) {
    return Number(n || 0).toLocaleString();
}
function productImageUrl(path) {
    if (!path) return "https://via.placeholder.com/300";
    return path.startsWith("http") ? path : `${API_URL}/${path}`;
}
function initFooterYear() {
    if ($("#footer-year").length) $("#footer-year").text(new Date().getFullYear());
}

$(function() {
    initNavbar();
    initFooterYear();
});