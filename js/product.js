/* product.js — jQuery */
(function() {
    const getParam = (name) => {
        const match = new RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
        return match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : null;
    };
    const id = getParam("id");

    const $loading = $("#product-loading");
    const $notFound = $("#product-not-found");
    const $content = $("#product-content");

    if (!id) {
        $loading.hide();
        $notFound.show();
        return;
    }

    let mainImage = "";

    async function fetchProduct() {
        try {
            const product = await $.ajax({
                url: `${API_URL}/products/${id}`,
                method: "GET",
                dataType: "json"
            });

            if (!product || !product.id) {
                $loading.hide();
                $notFound.show();
                return;
            }

            mainImage = product.image ? `${API_URL}/${product.image}` : "https://via.placeholder.com/400";
            renderProduct(product);
        } catch (err) {
            console.error("Error fetching product:", err);
            $loading.hide();
            $notFound.show();
        }
    }

    function renderProduct(product) {
        $("#page-title").text(`${product.name} | Sheiba Arcade`);

        const images = product.images && product.images.length
            ? product.images.map(img => img.startsWith("http") ? img : `${API_URL}/${img}`)
            : [mainImage];

        const $thumbList = $("#thumb-list");
        $thumbList.html(images.map((img, i) => `
            <img src="${img}" alt="thumb" class="thumb-img ${img === mainImage ? "active-thumb" : ""}" data-img="${img}">
        `).join(""));

        $thumbList.find(".thumb-img").on("click", function() {
            mainImage = $(this).data("img");
            $("#main-image").attr("src", mainImage);
            $thumbList.find(".thumb-img").removeClass("active-thumb");
            $(this).addClass("active-thumb");
        });

        $("#main-image")
            .attr({ src: mainImage, alt: product.name })
            .on("error", function() { $(this).attr("src", "https://via.placeholder.com/400"); });

        $("#product-name").text(product.name);

        if (product.badge) {
            $("#product-badge").text(product.badge).show().css("display", "inline-block");
        } else {
            $("#product-badge").hide();
        }

        if (product.discount) {
            $("#product-discount").text(`${product.discount} %`).show().css("display", "inline");
        } else {
            $("#product-discount").hide();
        }

        $("#product-new-price").text(`LKR ${product.newPrice}`);

        if (product.oldPrice) {
            $("#product-old-price-wrap").show();
            $("#product-old-price").text(`LKR ${product.oldPrice}`);
        } else {
            $("#product-old-price-wrap").hide();
        }

        $("#product-category").text(product.productCategory || "");
        $("#product-stock-status").text(product.stockStatus || "");

        // Add to cart (customers / guests only; admins manage products elsewhere)
        const soldOut = /out/i.test(product.stockStatus || "");
        $("#add-to-cart-wrap").toggle(!isAdmin());
        $("#add-to-cart-btn")
            .prop("disabled", soldOut)
            .html(soldOut ? "Out of Stock" : '<i class="bi bi-cart-plus me-2"></i>Add to Cart')
            .off("click")
            .on("click", () => handleAddToCart(product));

        if (product.description) {
            $("#product-description-card").show();
            $("#product-description").text(product.description);
        } else {
            $("#product-description-card").hide();
        }

        $("#product-shipping").text(product.shipping || "Not specified");
        $("#product-delivery").text(product.delivery || "Not specified");
        $("#product-return-policy").text(product.returnPolicy || "Not specified");

        // SEO: dynamic meta description + canonical + Product structured data
        const seoDescription = product.description
            ? product.description.slice(0, 155)
            : `Buy ${product.name} at Sheiba Arcade, a trusted computer shop in Wadduwa, Kalutara District, Sri Lanka.`;
        $("#meta-description").attr("content", seoDescription);
        $("#canonical-link").attr("href", `https://www.sheiba.lk/product.html?id=${product.id}`);

        const availability = /out/i.test(product.stockStatus || "")
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/InStock";

        const productSchema = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.name,
            "image": mainImage,
            "description": product.description || product.name,
            "category": product.productCategory || undefined,
            "offers": {
                "@type": "Offer",
                "url": `https://www.sheiba.lk/product.html?id=${product.id}`,
                "priceCurrency": "LKR",
                "price": product.newPrice,
                "availability": availability,
                "itemCondition": /used/i.test(product.productCategory || "")
                    ? "https://schema.org/UsedCondition"
                    : "https://schema.org/NewCondition",
                "seller": {
                    "@type": "Organization",
                    "name": "Sheiba Arcade"
                }
            }
        };
        $("#product-schema").text(JSON.stringify(productSchema));

        $loading.hide();
        $content.css("display", "flex");

        loadRelatedProducts(product);
    }

    // ---------- Related products (shelf layout + right-to-left auto-scroll) ----------
    const CAT_LABELS = {
        PROCESSORS: "Processors", GRAPHICSCARD: "Graphics Cards", MOTHERBOARD: "Motherboards",
        RAM: "RAM Modules", STORAGE: "Storage (HDD/SSD)", POWERSUPPLY: "Power Supplies (PSU)",
        COOLINGSYSTEMS: "Cooling Systems", PCCASES: "PC Cases", ACCESSORIES: "Accessories",
        NEWCOMPUTERS: "Brand New Desktop Computers", USEDCOMPUTERS: "Used Desktop Computers",
        USEDGAMINGCOMPUTERS: "Used Gaming Computers", NEWMONITORS: "Brand New Monitors",
        USEDMONITORS: "Used Monitors", NEWLAPTOPS: "Brand New Laptops", USEDLAPTOPS: "Used Laptops"
    };
    const COMPONENT_CATS = ["PROCESSORS", "GRAPHICSCARD", "MOTHERBOARD", "RAM", "STORAGE", "POWERSUPPLY", "COOLINGSYSTEMS", "PCCASES", "ACCESSORIES"];
    const RELATED_LIMIT = 12;
    const BRANDS = /\b(AMD|INTEL|NVIDIA|ASUS|MSI|GIGABYTE|HP|DELL|LENOVO|LG|SAMSUNG|ACER|CORSAIR|KINGSTON|WD|SEAGATE|TOSHIBA|ADATA|CRUCIAL|TRANSCEND|LOGITECH|RAZER|COOLER MASTER|DEEPCOOL|ZOTAC|PALIT|EVGA|AOC|BENQ|VIEWSONIC)\b/i;

    function relatedCard(p) {
        const brand = (String(p.name).match(BRANDS) || [])[0];
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

    function initShelfArrows(track) {
        const overflow = track.scrollWidth > track.clientWidth + 4;
        const $btns = $("#related-products .shelf-btn");
        if (!overflow) { $btns.hide(); return; }
        $btns.on("click", function() {
            track.scrollBy({ left: $(this).data("d") * track.clientWidth * 0.85, behavior: "smooth" });
        });
    }

    async function loadRelatedProducts(product) {
        const category = product.productCategory;
        if (!category) return;

        const cond = String(product.productCondition || "").toLowerCase();
        const validCond = /^(new|used)$/.test(cond);
        const url = validCond
            ? `${API_URL}/products/category/${encodeURIComponent(category)}/condition/${cond}`
            : `${API_URL}/category/${encodeURIComponent(category)}`;

        try {
            let list = await $.ajax({ url, method: "GET", dataType: "json" });
            list = (Array.isArray(list) ? list : []).filter(p => String(p.id) !== String(product.id));
            if (!list.length) return;

            // Closest in price first
            const base = Number(product.newPrice) || 0;
            list.sort((a, b) => Math.abs((a.newPrice || 0) - base) - Math.abs((b.newPrice || 0) - base));
            const related = list.slice(0, RELATED_LIMIT);

            // Font used by the home page headings
            if (!document.getElementById("sg-font")) {
                $("<link>", {
                    id: "sg-font", rel: "stylesheet",
                    href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap"
                }).appendTo("head");
            }

            // "View All" link, same format as the navbar links
            const label = CAT_LABELS[category] || category;
            const useCond = validCond && COMPONENT_CATS.includes(category);
            const viewAllTitle = useCond ? (cond === "new" ? "Brand New " : "Used ") + label : label;
            const viewAll = `category.html?cat=${encodeURIComponent(category)}${useCond ? `&cond=${cond}` : ""}&title=${encodeURIComponent(viewAllTitle)}`;

            const $wrap = $("#related-products");
            $wrap.html(`
                <div class="shelf-head">
                    <h2>Related Products</h2>
                    <div class="shelf-tools">
                        <a class="shelf-all" href="${viewAll}">View All <i class="bi bi-chevron-right"></i></a>
                        <button type="button" class="shelf-btn" data-d="-1" aria-label="Scroll left"><i class="bi bi-chevron-left"></i></button>
                        <button type="button" class="shelf-btn" data-d="1" aria-label="Scroll right"><i class="bi bi-chevron-right"></i></button>
                    </div>
                </div>
                <div class="shelf-track" id="related-track">${related.map(relatedCard).join("")}</div>
            `).show();

            const track = document.getElementById("related-track");
            initShelfArrows(track);
        } catch (err) {
            console.error("Error loading related products:", err);
        }
    }

    fetchProduct();
})();