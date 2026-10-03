/* home.js — loads and renders the "Top Selling Products" section */
(function () {
    "use strict";

    if (!$("#top-selling-grid").length) return;

    const TOP_SELLING_API = `${API_URL}/products/top-selling`;

    function renderProducts(products) {
        $("#top-selling-loading").hide();

        if (!products.length) {
            $("#top-selling-grid").empty();
            $("#top-selling-empty").show();
            return;
        }

        $("#top-selling-empty").hide();

        $("#top-selling-grid").html(
            products.map((p, index) => {
                const rank = index + 1;
                const condition = p.productCondition
                    ? p.productCondition.toLowerCase()
                    : "";
                const conditionLabel =
                    condition === "new"
                        ? "New"
                        : condition === "used"
                            ? "Used"
                            : "";
                const conditionClass =
                    condition === "new"
                        ? "product-condition-new"
                        : "product-condition-used";
                const category = p.categoryName || p.category || "";
                const price = p.newPrice
                    ? `Rs.${formatNumber(p.newPrice)}/=`
                    : "Price unavailable";
                const oldPrice = p.oldPrice
                    ? `<small class="text-muted"><strike>Rs.${formatNumber(p.oldPrice)}/=</strike></small>`
                    : "";

                return `
                    <div class="col-6 col-sm-6 col-md-3">
                        <a href="product.html?id=${p.id}" class="text-decoration-none text-reset">
                            <div class="card h-100">
                                <span class="rank-badge">#${rank} Top Seller</span>
                                ${conditionLabel ? `<span class="product-condition ${conditionClass}">${conditionLabel}</span>` : ""}
                                <img src="${productImageUrl(p.image)}" class="card-img-top product-card-img" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x210?text=No+Image'">
                                <div class="card-body">
                                    ${category ? `<span class="category">${escapeHtml(category)}</span>` : ""}
                                    <h5 class="card-title">${escapeHtml(p.name)}</h5>
                                    <div class="product-footer">
                                        <div>
                                            <div class="price">${price}</div>
                                            ${oldPrice}
                                        </div>
                                        <span class="selling-badge">
                                            <i class="fa-solid fa-fire"></i>
                                            Popular
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </a>
                    </div>
                `;
            }).join("")
        );
    }

    async function loadTopSelling() {
        try {
            const data = await $.ajax({
                url: TOP_SELLING_API,
                method: "GET",
                dataType: "json"
            });
            renderProducts(Array.isArray(data) ? data : []);
        } catch (xhr) {
            console.error("Failed to load top selling products:", xhr);
            $("#top-selling-loading").hide();
            $("#top-selling-grid").empty();
            $("#top-selling-empty")
                .text("Couldn't load top selling products right now.")
                .show();
        }
    }

    loadTopSelling();
})();
/* ---------- Product shelves (carousel sections per category) ---------- */
(function () {
    "use strict";
    const root = document.getElementById("shelf-root");
    if (!root) return;

    // Edit this list to add / remove / reorder home page sections
    const SHELVES = [
        { cat: "PROCESSORS",     cond: "new",  title: "Processors" },
        { cat: "GRAPHICSCARD",   cond: "used", title: "Graphics Cards" },
        { cat: "MOTHERBOARD",    cond: "used", title: "Motherboards" },
        { cat: "STORAGE",        cond: "used", title: "Storage (HDD / SSD)" },
        { cat: "NEWMONITORS",    cond: "new",  title: "Brand New Monitors" },
        { cat: "PCCASES",        cond: "new",  title: "PC Cases" }
    ];
    const LIMIT = 12;
    const BRANDS = /\b(AMD|INTEL|NVIDIA|ASUS|MSI|GIGABYTE|HP|DELL|LENOVO|LG|SAMSUNG|ACER|CORSAIR|KINGSTON|WD|SEAGATE|TOSHIBA|ADATA|CRUCIAL|TRANSCEND|LOGITECH|RAZER|COOLER MASTER|DEEPCOOL|ZOTAC|PALIT|EVGA|AOC|BENQ|VIEWSONIC)\b/i;

    const href = (s) => `category.html?cat=${s.cat}&cond=${s.cond}&title=${encodeURIComponent((s.cond === "new" ? "Brand New " : "Used ") + s.title)}`;

    function card(p) {
        const brand = (p.name.match(BRANDS) || [])[0];
        const off = p.oldPrice && +p.oldPrice > +p.newPrice ? Math.round((1 - p.newPrice / p.oldPrice) * 100) : 0;
        const used = (p.productCondition || "").toLowerCase() === "used";
        return `<a class="pcard" href="product.html?id=${p.id}">
            ${off >= 1 ? `<span class="pcard-off">-${off}%</span>` : ""}
            <span class="pcard-cond">${used ? "Used" : "New"}</span>
            <div class="pcard-img"><img src="${productImageUrl(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'"></div>
            <div class="pcard-body">
                <div class="pcard-name">${escapeHtml(p.name)}</div>
                <div class="pcard-brand">${brand ? "Brand: " + escapeHtml(brand.toUpperCase()) : "&nbsp;"}</div>
                <div class="pcard-price">Rs.${formatNumber(p.newPrice)}</div>
                <div class="pcard-old">${off ? "Rs." + formatNumber(p.oldPrice) : "&nbsp;"}</div>
            </div></a>`;
    }

    function build(s, i) {
        const sec = document.createElement("section");
        sec.className = "shelf" + (i % 2 ? " alt" : "");
        sec.innerHTML = `<div class="container">
            <div class="shelf-head"><h2>${s.title}</h2>
                <div class="shelf-tools"><a class="shelf-all" href="${href(s)}">View All <i class="bi bi-chevron-right"></i></a>
                <button class="shelf-btn" data-d="-1" aria-label="Scroll left"><i class="bi bi-chevron-left"></i></button>
                <button class="shelf-btn" data-d="1" aria-label="Scroll right"><i class="bi bi-chevron-right"></i></button></div></div>
            <div class="shelf-track">${'<div class="shelf-skel"></div>'.repeat(5)}</div></div>`;
        const track = sec.querySelector(".shelf-track");
        sec.querySelectorAll(".shelf-btn").forEach((b) => b.addEventListener("click", () =>
            track.scrollBy({ left: b.dataset.d * track.clientWidth * 0.85, behavior: "smooth" })));
        root.appendChild(sec);

        const load = async () => {
            try {
                const data = await $.ajax({ url: `${API_URL}/products/category/${s.cat}/condition/${s.cond}`, dataType: "json" });
                const list = (Array.isArray(data) ? data : []).sort((a, b) => b.id - a.id).slice(0, LIMIT);
                if (!list.length) return sec.remove();
                track.innerHTML = list.map(card).join("");
            } catch (e) { console.error("Shelf failed:", s.cat, e); sec.remove(); }
        };
        if ("IntersectionObserver" in window) {
            new IntersectionObserver((en, ob) => { if (en[0].isIntersecting) { ob.disconnect(); load(); } }, { rootMargin: "400px" }).observe(sec);
        } else load();
    }
    SHELVES.forEach(build);
})();