/* category.js — powers category.html (replaces React's ProductCategoryPage) */

(function () {
    const getParam = (name) => {
        const match = new RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
        return match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : null;
    };
    const category = getParam("cat");
    const condition = getParam("cond");
    const title = getParam("title") || "Products";

    const PRODUCTS_PER_PAGE = 12;

    let products = [];
    let subcategories = [];
    let selectedSubcategories = [];
    let minPrice = 0;
    let maxPrice = 100000;
    let maxPriceLimit = 100000;
    let currentPage = 1;

    $("#page-title").text(`${title} | Sheiba Arcade`);
    $("#breadcrumb-title").text(title);

    // SEO: dynamic meta description + canonical for this category
    $("#meta-description").attr(
        "content",
        `Shop ${title} in Wadduwa, Kalutara District at Sheiba Arcade \u2014 quality computers, laptops, monitors and accessories with local delivery.`
    );
    $("#canonical-link").attr(
        "href",
        `https://www.sheiba.lk/category.html${window.location.search}`
    );

    function extractSubcategory(name) {
        const map = {
            Keyboard: /keyboard/i,
            Mouse: /mouse|mice/i,
            Headphones: /headphones|headset|earphones|earbuds/i,
            Webcam: /webcam|camera/i,
            Speaker: /speaker/i,
            Microphone: /microphone|mic/i,
            Cable: /cable|connector/i,
            Charger: /charger|adapter/i,
            "USB Hub": /usb hub|hub/i,
        };
        for (const key in map) {
            if (map[key].test(name)) return key;
        }
        return null;
    }

    function buildEndpoint() {
        return condition
            ? `${API_URL}/products/category/${category}/condition/${condition}`
            : `${API_URL}/category/${category}`;
    }

    async function fetchProducts() {
        try {
            products = await $.ajax({
                url: buildEndpoint(),
                method: "GET",
                dataType: "json"
            });
            products = Array.isArray(products) ? products : [];

            subcategories = [...new Set(
                products.map((p) => extractSubcategory(p.name)).filter(Boolean)
            )].sort();

            if (products.length > 0) {
                const max = Math.max(...products.map((p) => p.newPrice || 0));
                const rounded = Math.ceil(max / 1000) * 1000;
                maxPriceLimit = rounded || 100000;
                maxPrice = maxPriceLimit;
            }

            $("#products-loading").hide();
            renderSubcategories();
            renderPriceFilter();
            render();
        } catch (err) {
            console.error(err);
            $("#products-loading").html(`<p class="text-danger">Failed to load products.</p>`);
        }
    }

    function renderPriceFilter() {
        $("#min-price-range").attr("max", maxPrice).val(minPrice);
        $("#max-price-range").attr({ max: maxPriceLimit, min: minPrice }).val(maxPrice);
        updatePriceLabels();
    }

    function updatePriceLabels() {
        $("#min-price-label").text(`Min: ${formatNumber(minPrice)}`);
        $("#max-price-label").text(`Max: ${formatNumber(maxPrice)}`);
        $("#price-range-display").text(`Rs. ${formatNumber(minPrice)} - Rs. ${formatNumber(maxPrice)}`);
    }

    function renderSubcategories() {
        const $card = $("#subcategory-card");
        const $list = $("#subcategory-list");
        if (subcategories.length === 0) {
            $card.hide();
            return;
        }
        $card.show();
        $list.html( subcategories.map((sub) => `
            <div class="form-check mb-2">
                <input type="checkbox" class="form-check-input subcategory-checkbox" id="sub-${escapeHtml(sub)}" value="${escapeHtml(sub)}">
                <label class="form-check-label small" for="sub-${escapeHtml(sub)}">${escapeHtml(sub)}</label>
            </div>
        `).join(""));
        $(".subcategory-checkbox").on("change", function() {
            const value = $(this).val();
            if ($(this).is(":checked")) {
                if (!selectedSubcategories.includes(value)) selectedSubcategories.push(value);
            } else {
                selectedSubcategories = selectedSubcategories.filter((s) => s !== value);
            }
            $("#clear-subcategory-btn").toggle(selectedSubcategories.length > 0);
            currentPage = 1;
            render();
        });
    }

    function getFilteredProducts() {
        return products.filter((p) => {
            const priceOk = p.newPrice >= minPrice && p.newPrice <= maxPrice;
            const subOk = selectedSubcategories.length === 0 ||
                selectedSubcategories.includes(extractSubcategory(p.name));
            return priceOk && subOk;
        });
    }

    function render() {
        const filtered = getFilteredProducts();
        const totalPages = Math.ceil(filtered.length / PRODUCTS_PER_PAGE);
        const current = filtered.slice(
            (currentPage - 1) * PRODUCTS_PER_PAGE,
            currentPage * PRODUCTS_PER_PAGE
        );

        const $grid = $("#products-grid");
        const $summary = $("#products-summary");
        const $noProductsMsg = $("#no-products-msg");
        const $paginationRow = $("#pagination-row");

        if (filtered.length === 0) {
            $grid.empty();
            $summary.empty();
            $noProductsMsg.show();
            $paginationRow.hide();
            return;
        }

        $noProductsMsg.hide();
        $summary.html(`<small>Showing ${current.length} of ${filtered.length}</small>`);

        $grid.html(current.map((product) => `
            <div class="col-6 col-md-6 col-lg-4">
                <div class="card product-card h-100 shadow-sm">
                    <img src="${productImageUrl(product.image)}" class="product-image" style="height:200px;object-fit:cover" alt="${escapeHtml(product.name)}">
                    <div class="card-body p-2 d-flex flex-column">
                        <h6 class="fw-bold mb-1">${escapeHtml(product.name)}</h6>
                        <span class="text-primary fw-bold">Rs. ${formatNumber(product.newPrice)}</span>
                        ${product.oldPrice ? `<small class="text-danger"><s>Rs. ${formatNumber(product.oldPrice)}</s></small>` : ""}
                        <div class="mt-auto d-flex gap-1">
                            <button class="btn btn-sm btn-primary flex-grow-1 product-details-btn" data-id="${product.id}">Details</button>
                            ${isAdmin() ? "" : `<button class="btn btn-sm btn-outline-success product-cart-btn" data-id="${product.id}" aria-label="Add to cart" title="Add to cart" ${/out/i.test(product.stockStatus || "") ? "disabled" : ""}><i class="bi bi-cart-plus"></i></button>`}
                        </div>
                    </div>
                </div>
            </div>
        `).join(""));
        $grid.find(".product-details-btn").on("click", function() {
            window.location.href = `product.html?id=${$(this).data("id")}`;
        });
        $grid.find(".product-cart-btn").on("click", function() {
            const id = String($(this).data("id"));
            const product = current.find(p => String(p.id) === id);
            if (product) handleAddToCart(product);
        });

        if (totalPages > 1) {
            $paginationRow.css("display", "flex");
            const $list = $("#pagination-list");
            $list.html( Array.from({ length: totalPages }, (_, i) => `
                <li class="page-item ${currentPage === i + 1 ? "active" : ""}">
                    <a class="page-link" href="#" data-page="${i + 1}">${i + 1}</a>
                </li>
            `).join(""));
            $list.find(".page-link").on("click", function(e) {
                e.preventDefault();
                currentPage = Number($(this).data("page"));
                render();
                $("html, body").animate({ scrollTop: 0 }, 300);
            });
        } else {
            $paginationRow.hide();
        }
    }

    $("#min-price-range").on("input", function() {
        minPrice = Number($(this).val());
        updatePriceLabels();
        currentPage = 1;
        render();
    });

    $("#max-price-range").on("input", function() {
        maxPrice = Number($(this).val());
        updatePriceLabels();
        currentPage = 1;
        render();
    });

    $("#reset-price-btn").on("click", function() {
        minPrice = 0;
        maxPrice = maxPriceLimit;
        renderPriceFilter();
        currentPage = 1;
        render();
    });

    $("#clear-subcategory-btn").on("click", function() {
        selectedSubcategories = [];
        $(".subcategory-checkbox").prop("checked", false);
        $(this).hide();
        currentPage = 1;
        render();
    });

    fetchProducts();
})();