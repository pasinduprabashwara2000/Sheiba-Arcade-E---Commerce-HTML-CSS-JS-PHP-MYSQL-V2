/* cart.js — cart page (customers only). Cart data lives in this browser; prices are refreshed from the API. */
(function() {
    if (!isLoggedIn()) {
        window.location.replace("login.html?next=cart.html");
        return;
    }
    if (isAdmin()) {
        window.location.replace("admin.html");
        return;
    }

    let items = [];   // cart lines + transient soldOut flag

    function money(n) { return "Rs. " + formatNumber(n); }

    function persist() {
        saveCart(items.map(({ id, name, price, image, qty }) => ({ id, name, price, image, qty })));
    }

    function render() {
        $("#cart-loading").hide();

        if (!items.length) {
            $("#cart-content").hide();
            $("#cart-empty").show();
            return;
        }
        $("#cart-empty").hide();
        $("#cart-content").show();

        $("#cart-items").html(items.map(i => `
            <div class="card shadow-sm">
                <div class="card-body d-flex gap-3 align-items-center flex-wrap">
                    <a href="product.html?id=${i.id}"><img class="cart-item-img" src="${productImageUrl(i.image)}" alt="${escapeHtml(i.name)}"
                        onerror="this.src='https://via.placeholder.com/84?text=No+Image'"></a>
                    <div class="flex-grow-1" style="min-width:180px">
                        <a href="product.html?id=${i.id}" class="fw-semibold text-decoration-none text-reset">${escapeHtml(i.name)}</a>
                        <div class="text-muted small">${money(i.price)} each</div>
                        ${i.soldOut ? '<span class="badge bg-danger mt-1">Out of stock</span>' : ""}
                    </div>
                    <div class="cart-qty" data-id="${i.id}">
                        <button class="btn btn-outline-secondary" data-act="dec" aria-label="Decrease quantity">&minus;</button>
                        <span>${i.qty}</span>
                        <button class="btn btn-outline-secondary" data-act="inc" aria-label="Increase quantity">+</button>
                    </div>
                    <div class="text-end" style="min-width:110px">
                        <div class="fw-bold">${money(i.price * i.qty)}</div>
                        <button class="btn btn-link btn-sm text-danger p-0" data-id="${i.id}" data-act="remove">Remove</button>
                    </div>
                </div>
            </div>`).join(""));

        const billable = items.filter(i => !i.soldOut);
        $("#cart-items-count").text(billable.reduce((n, i) => n + i.qty, 0));
        $("#cart-total").text(money(billable.reduce((t, i) => t + i.price * i.qty, 0)));
        $("#cart-soldout-note").toggle(billable.length !== items.length);
    }

    // + / - / remove
    $("#cart-items").on("click", "[data-act]", function() {
        const $b = $(this);
        const id = Number($b.closest("[data-id]").data("id") || $b.data("id"));
        const line = items.find(i => i.id === id);
        if (!line) return;

        const act = $b.data("act");
        if (act === "inc") line.qty = Math.min(99, line.qty + 1);
        if (act === "dec") line.qty = Math.max(1, line.qty - 1);
        if (act === "remove") items = items.filter(i => i.id !== id);

        persist();
        render();
    });

    $("#cart-clear").on("click", function() {
        if (!confirm("Remove everything from your cart?")) return;
        items = [];
        persist();
        render();
    });

    // Re-check each product so price / availability are current
    async function refreshFromApi() {
        const results = await Promise.all(items.map(line =>
            $.ajax({ url: `${API_URL}/products/${line.id}`, method: "GET", dataType: "json" })
                .then(p => ({ line, p }), xhr => ({ line, gone: xhr.status === 404 }))
        ));

        results.forEach(r => {
            if (r.p && r.p.id) {
                r.line.name = r.p.name;
                r.line.price = Number(r.p.newPrice) || 0;
                r.line.image = r.p.image || r.line.image;
                r.line.soldOut = /out/i.test(r.p.stockStatus || "");
            }
        });
        const goneIds = results.filter(r => r.gone).map(r => r.line.id);
        if (goneIds.length) items = items.filter(i => !goneIds.includes(i.id));
        persist();
    }

    items = getCart();
    render();                       // show immediately from saved data
    if (items.length) refreshFromApi().then(render).catch(render);
})();
