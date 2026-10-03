/* admin-top-selling.js — manage which products show in the home page "Top Selling Products" section */
(function() {
    if (!isAdmin()) {
        window.location.href = isLoggedIn() ? "index.html" : "login.html";
        return;
    }

    const PRODUCTS_API = `${API_URL}/products`;
    const ITEMS_PER_PAGE = 10;

    const categoryLabels = {
        NEWCOMPUTERS:"New Computers", USEDCOMPUTERS:"Used Computers",
        USEDGAMINGCOMPUTERS:"Used Gaming Computers", NEWMONITORS:"New Monitors",
        USEDMONITORS:"Used Monitors", NEWLAPTOPS:"New Laptops", USEDLAPTOPS:"Used Laptops",
        PROCESSORS:"Processors", GRAPHICSCARD:"Graphics Cards", MOTHERBOARD:"Motherboards",
        RAM:"RAM", STORAGE:"Storage", POWERSUPPLY:"Power Supply",
        COOLINGSYSTEMS:"Cooling Systems", PCCASES:"PC Cases", ACCESSORIES:"Accessories"
    };

    let products = [];
    let filteredProducts = [];
    let currentPage = 1;
    let selectedCategory = "";
    let searchTerm = "";
    let busyIds = new Set();

    function showAlert(message, type) {
        $("#ts-alert-slot").html(`
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${escapeHtml(message)}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>`);
    }

    async function fetchProducts() {
        $("#loading-text").show();
        try {
            const data = await $.ajax({ url: PRODUCTS_API, method: "GET", dataType: "json" });
            products = Array.isArray(data) ? data : [];
        } catch (xhr) {
            console.error(xhr);
            showAlert("Failed to fetch products", "danger");
        } finally {
            $("#loading-text").hide();
            applyFilter();
        }
    }

    function applyFilter() {
        filteredProducts = products.filter(p => {
            const matchesCategory = !selectedCategory || p.productCategory === selectedCategory;
            const matchesSearch = !searchTerm || (p.name || "").toLowerCase().includes(searchTerm);
            return matchesCategory && matchesSearch;
        });
        currentPage = 1;
        render();
    }

    function getFeatured() {
        return products
            .filter(p => Number(p.isTopSelling) === 1)
            .sort((a, b) => {
                const ra = a.topSellingRank === null || a.topSellingRank === undefined ? Infinity : Number(a.topSellingRank);
                const rb = b.topSellingRank === null || b.topSellingRank === undefined ? Infinity : Number(b.topSellingRank);
                if (ra !== rb) return ra - rb;
                return Number(b.id) - Number(a.id);
            });
    }

    async function setTopSelling(id, isTopSelling, topSellingRank) {
        busyIds.add(id);
        renderAll();
        try {
            await $.ajax({
                url: `${PRODUCTS_API}/${id}/top-selling`,
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({
                    isTopSelling: !!isTopSelling,
                    topSellingRank: (topSellingRank === "" || topSellingRank === undefined || topSellingRank === null)
                        ? null : Number(topSellingRank)
                })
            });
            const p = products.find(x => String(x.id) === String(id));
            if (p) {
                p.isTopSelling = isTopSelling ? 1 : 0;
                p.topSellingRank = (topSellingRank === "" || topSellingRank === undefined) ? null : topSellingRank;
            }
            showAlert(isTopSelling ? "Product added to Top Selling Products" : "Product removed from Top Selling Products", "success");
        } catch (xhr) {
            console.error(xhr);
            showAlert(xhr.responseJSON?.message || "Failed to update top selling status", "danger");
        } finally {
            busyIds.delete(id);
            applyFilter();
        }
    }

    function renderFeatured() {
        const featured = getFeatured();
        $("#ts-featured-count").text(featured.length);

        if (!featured.length) {
            $("#ts-featured-empty").show();
            $("#ts-featured-table-wrap").hide();
            return;
        }
        $("#ts-featured-empty").hide();
        $("#ts-featured-table-wrap").show();

        $("#ts-featured-tbody").html(featured.map(p => `
            <tr>
                <td>${p.image ? `<img src="${productImageUrl(p.image)}" alt="${escapeHtml(p.name)}" width="50" style="max-height:50px;object-fit:cover" onerror="this.src='https://via.placeholder.com/50'">` : ""}</td>
                <td>${escapeHtml(p.name)}</td>
                <td>${escapeHtml(categoryLabels[p.productCategory] || p.productCategory || "")}</td>
                <td><strong>Rs.${parseFloat(p.newPrice || 0).toFixed(2)}/=</strong></td>
                <td>
                    <input type="number" class="form-control form-control-sm ts-rank-input" data-id="${p.id}"
                           value="${p.topSellingRank ?? ""}" placeholder="e.g. 1" min="1" ${busyIds.has(p.id) ? "disabled" : ""}>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-danger ts-remove-btn" data-id="${p.id}" ${busyIds.has(p.id) ? "disabled" : ""}>Remove</button>
                </td>
            </tr>`).join(""));

        $("#ts-featured-tbody .ts-remove-btn").on("click", function() {
            setTopSelling($(this).data("id"), false, null);
        });

        $("#ts-featured-tbody .ts-rank-input").on("change", function() {
            const id = $(this).data("id");
            setTopSelling(id, true, $(this).val());
        });
    }

    function renderPaginationItems(totalPages) {
        const items = [], maxPages = Math.min(5, totalPages);
        let start = Math.max(1, currentPage - Math.floor(maxPages / 2));
        let end = Math.min(totalPages, start + maxPages - 1);
        if (end - start < maxPages - 1) start = Math.max(1, end - maxPages + 1);

        if (start > 1) {
            items.push(`<li class="page-item"><a class="page-link" href="#" data-page="1">First</a></li>`);
            items.push(`<li class="page-item ${currentPage === 1 ? "disabled" : ""}"><a class="page-link" href="#" data-page="${currentPage - 1}">Prev</a></li>`);
        }
        for (let i = start; i <= end; i++)
            items.push(`<li class="page-item ${i === currentPage ? "active" : ""}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`);
        if (end < totalPages) {
            items.push(`<li class="page-item ${currentPage === totalPages ? "disabled" : ""}"><a class="page-link" href="#" data-page="${currentPage + 1}">Next</a></li>`);
            items.push(`<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">Last</a></li>`);
        }
        return items.join("");
    }

    function renderAllProducts() {
        $("#ts-all-count-text").text(`${filteredProducts.length} product${filteredProducts.length === 1 ? "" : "s"}`);

        const $empty = $("#ts-empty-state"), $table = $("#ts-all-table-wrap"), $pagination = $("#ts-pagination-wrap");
        if (filteredProducts.length === 0) {
            $empty.show().text("No products match your search/filter.");
            $table.hide();
            $pagination.hide();
            return;
        }
        $empty.hide();
        $table.show();

        const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const current = filteredProducts.slice(start, start + ITEMS_PER_PAGE);

        $("#ts-all-tbody").html(current.map(p => {
            const isFeatured = Number(p.isTopSelling) === 1;
            const disabled = busyIds.has(p.id) ? "disabled" : "";
            return `
            <tr>
                <td>${p.image ? `<img src="${productImageUrl(p.image)}" alt="${escapeHtml(p.name)}" width="50" style="max-height:50px;object-fit:cover" onerror="this.src='https://via.placeholder.com/50'">` : ""}</td>
                <td>${escapeHtml(p.name)}</td>
                <td>${escapeHtml(categoryLabels[p.productCategory] || p.productCategory || "")}
                    ${p.productCondition ? `<span class="ms-1 badge ${p.productCondition === "new" ? "bg-success" : "bg-warning text-dark"}">${p.productCondition === "new" ? "New" : "Used"}</span>` : ""}
                </td>
                <td><strong>Rs.${parseFloat(p.newPrice || 0).toFixed(2)}/=</strong></td>
                <td><span class="badge ${p.stockStatus === "IN_STOCK" ? "bg-success" : "bg-danger"}">${p.stockStatus === "IN_STOCK" ? "In Stock" : "Out of Stock"}</span></td>
                <td class="text-center">
                    <div class="form-check form-switch d-flex justify-content-center">
                        <input class="form-check-input ts-toggle" type="checkbox" role="switch"
                               data-id="${p.id}" ${isFeatured ? "checked" : ""} ${disabled} style="cursor:pointer;">
                    </div>
                </td>
            </tr>`;
        }).join(""));

        $("#ts-all-tbody .ts-toggle").on("change", function() {
            const id = $(this).data("id");
            setTopSelling(id, this.checked, null);
        });

        if (filteredProducts.length > ITEMS_PER_PAGE) {
            $pagination.css("display", "flex");
            $("#ts-pagination").html(renderPaginationItems(totalPages));
            $("#ts-pagination .page-link").on("click", function(e) {
                e.preventDefault();
                const page = Number($(this).data("page"));
                if (page >= 1 && page <= totalPages) { currentPage = page; render(); }
            });
        } else {
            $pagination.hide();
        }
    }

    function renderAll() {
        renderFeatured();
        renderAllProducts();
    }

    function render() {
        renderAll();
    }

    $("#ts-category-filter").on("change", function() {
        selectedCategory = $(this).val();
        applyFilter();
    });

    let searchDebounce = null;
    $("#ts-search").on("input", function() {
        clearTimeout(searchDebounce);
        const val = $(this).val();
        searchDebounce = setTimeout(() => {
            searchTerm = val.trim().toLowerCase();
            applyFilter();
        }, 250);
    });

    fetchProducts();
})();