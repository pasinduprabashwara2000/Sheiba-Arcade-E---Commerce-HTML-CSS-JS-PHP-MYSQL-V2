/* search.js — live product search for the home page */
(function () {
    "use strict";

    const input = document.getElementById("site-search-input");
    const panel = document.getElementById("site-search-results");
    const form = document.getElementById("site-search-form");
    const clearBtn = document.getElementById("site-search-clear");
    if (!input || !panel || !form) return;

    const MAX_RESULTS = 8;
    let products = null;      // cached list from the API
    let loading = null;       // in-flight request promise
    let activeIndex = -1;
    let currentMatches = [];

    function loadProducts() {
        if (products) return Promise.resolve(products);
        if (loading) return loading;
        loading = $.ajax({ url: `${API_URL}/products`, dataType: "json" })
            .then((data) => { products = Array.isArray(data) ? data : []; return products; })
            .catch((e) => { console.error("Search load failed:", e); loading = null; throw e; });
        return loading;
    }

    function haystack(p) {
        return [p.name, p.categoryName, p.category, p.productCondition, p.brand]
            .filter(Boolean).join(" ").toLowerCase();
    }

    function search(q) {
        const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
        if (!terms.length) return [];
        return products
            .map((p) => {
                const h = haystack(p);
                if (!terms.every((t) => h.includes(t))) return null;
                const name = (p.name || "").toLowerCase();
                // rank: name starts with query > name contains full query > other matches
                const score = name.startsWith(q.toLowerCase()) ? 0 : name.includes(q.toLowerCase()) ? 1 : 2;
                return { p, score };
            })
            .filter(Boolean)
            .sort((a, b) => a.score - b.score || b.p.id - a.p.id)
            .map((r) => r.p);
    }

    function highlight(text, q) {
        const safe = escapeHtml(text || "");
        const terms = q.split(/\s+/).filter(Boolean)
            .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        if (!terms.length) return safe;
        return safe.replace(new RegExp(`(${terms.map(escapeHtml).join("|")})`, "gi"), "<mark>$1</mark>");
    }

    function row(p, i, q) {
        const used = (p.productCondition || "").toLowerCase() === "used";
        const cat = p.categoryName || p.category || "";
        const price = p.newPrice ? `Rs.${formatNumber(p.newPrice)}/=` : "";
        return `<a class="ss-item${i === activeIndex ? " active" : ""}" role="option" href="product.html?id=${p.id}" data-i="${i}">
            <img src="${productImageUrl(p.image)}" alt="" loading="lazy" onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'">
            <span class="ss-info">
                <span class="ss-name">${highlight(p.name, q)}</span>
                <span class="ss-meta">${escapeHtml(cat)}${cat ? " &bull; " : ""}${used ? "Used" : "New"}</span>
            </span>
            <span class="ss-price">${price}</span>
        </a>`;
    }

    function open(html) { panel.innerHTML = html; panel.hidden = false; input.setAttribute("aria-expanded", "true"); }
    function close() { panel.hidden = true; activeIndex = -1; input.setAttribute("aria-expanded", "false"); }

    function render() {
        const q = input.value.trim();
        clearBtn.hidden = !input.value;
        if (!q) return close();
        if (!products) return open('<div class="ss-state">Searching…</div>');

        currentMatches = search(q);
        activeIndex = -1;
        if (!currentMatches.length) {
            return open(`<div class="ss-state">No products found for “${escapeHtml(q)}”. Try a different keyword.</div>`);
        }
        const shown = currentMatches.slice(0, MAX_RESULTS);
        const more = currentMatches.length - shown.length;
        open(shown.map((p, i) => row(p, i, q)).join("") +
            (more > 0 ? `<div class="ss-state ss-more">Showing ${shown.length} of ${currentMatches.length} results — refine your search to narrow down.</div>` : ""));
    }

    function setActive(i) {
        const items = panel.querySelectorAll(".ss-item");
        if (!items.length) return;
        activeIndex = (i + items.length) % items.length;
        items.forEach((el, n) => el.classList.toggle("active", n === activeIndex));
        items[activeIndex].scrollIntoView({ block: "nearest" });
    }

    let timer;
    input.addEventListener("input", () => {
        clearTimeout(timer);
        clearBtn.hidden = !input.value;
        if (!input.value.trim()) return close();
        if (!products) open('<div class="ss-state">Searching…</div>');
        loadProducts().then(() => { timer = setTimeout(render, 120); })
            .catch(() => open('<div class="ss-state">Couldn\'t load products right now. Please try again.</div>'));
    });

    input.addEventListener("focus", () => { loadProducts().catch(() => {}); if (input.value.trim() && products) render(); });

    input.addEventListener("keydown", (e) => {
        if (panel.hidden) return;
        if (e.key === "ArrowDown") { e.preventDefault(); setActive(activeIndex + 1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActive(activeIndex - 1); }
        else if (e.key === "Escape") { close(); input.blur(); }
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const items = panel.querySelectorAll(".ss-item");
        if (!items.length) return;
        window.location.href = items[activeIndex >= 0 ? activeIndex : 0].getAttribute("href");
    });

    clearBtn.addEventListener("click", () => { input.value = ""; clearBtn.hidden = true; close(); input.focus(); });

    document.addEventListener("click", (e) => { if (!e.target.closest("#site-search")) close(); });
})();