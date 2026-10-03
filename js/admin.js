/* admin.js — product CRUD using jQuery */
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

    let products=[], filteredProducts=[], editingId=null, loading=false;
    let currentPage=1, selectedCategory="";
    let imageFile=null, previewImages=[];

    const form = {
        name:$("#f-name"), newPrice:$("#f-new-price"), oldPrice:$("#f-old-price"),
        stock:$("#f-stock"), stockStatus:$("#f-stock-status"), description:$("#f-description"),
        badge:$("#f-badge"), discount:$("#f-discount"), category:$("#f-category"),
        condition:$("#f-condition"), delivery:$("#f-delivery"), returnPolicy:$("#f-return-policy"),
        shipping:$("#f-shipping"), image:$("#f-image")
    };

    function showAdminAlert(message,type) {
        $("#admin-alert-slot").html(`
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${escapeHtml(message)}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>`);
    }

    async function fetchProducts() {
        loading=true;
        $("#loading-text").show();
        try {
            const data=await $.ajax({url:PRODUCTS_API,method:"GET",dataType:"json"});
            products=Array.isArray(data)?data:[];
        } catch(xhr) {
            console.error(xhr);
            showAdminAlert("Failed to fetch products","danger");
        } finally {
            loading=false;
            $("#loading-text").hide();
            applyFilter();
        }
    }

    function applyFilter() {
        filteredProducts=selectedCategory
            ? products.filter(p=>p.productCategory===selectedCategory)
            : products;
        currentPage=1;
        render();
    }

    function resetForm() {
        editingId=null; imageFile=null; previewImages=[];
        form.name.val(""); form.newPrice.val(""); form.oldPrice.val(""); form.stock.val(0);
        form.stockStatus.val("IN_STOCK"); form.description.val(""); form.badge.val("");
        form.discount.val(""); form.category.val(""); form.condition.val("new");
        form.delivery.val(""); form.returnPolicy.val(""); form.shipping.val("");
        form.image.val("");
        $("#f-image-hint").text("");
        $("#save-btn").text("Add Product");
        $("#cancel-edit-btn").hide();
        renderPreviews();
    }

    function renderPreviews() {
        const $wrap=$("#image-preview-wrap"), $container=$("#image-preview-container");
        if(!previewImages.length) { $wrap.hide(); $container.empty(); return; }
        $wrap.show();
        $container.html(previewImages.map((p,idx)=>`
            <div class="image-preview">
                <img src="${p.src}" alt="Preview ${idx}">
                <button type="button" class="remove-image-btn" data-idx="${idx}">&#x2715;</button>
            </div>`).join(""));

        $container.find(".remove-image-btn").on("click",function() {
            previewImages=[];
            imageFile=null; form.image.val("");
            renderPreviews();
        });
    }

    form.image.on("change",function() {
        const file=this.files[0];
        if(!file) return;
        imageFile=file;
        const reader=new FileReader();
        reader.onload=e=>{
            previewImages=[{src:e.target.result}];
            renderPreviews();
        };
        reader.readAsDataURL(file);
    });

    $("#product-form").on("submit",async function(e) {
        e.preventDefault();

        if(!form.name.val().trim() || !form.category.val())
            return showAdminAlert("Name and category are required","danger");
        if(form.newPrice.val() && isNaN(parseFloat(form.newPrice.val())))
            return showAdminAlert("New price must be a valid number","danger");

        const data=new FormData();
        data.append("name",form.name.val());
        data.append("newPrice",form.newPrice.val());
        data.append("oldPrice",form.oldPrice.val());
        data.append("productCategory",form.category.val());
        data.append("productCondition",form.condition.val());
        data.append("stock",form.stock.val()||0);
        data.append("stockStatus",form.stockStatus.val());
        data.append("description",form.description.val());
        data.append("badge",form.badge.val());
        data.append("discount",form.discount.val());
        data.append("shipping",form.shipping.val());
        data.append("delivery",form.delivery.val());
        data.append("returnPolicy",form.returnPolicy.val());
        if(imageFile) data.append("image",imageFile);

        const $save=$("#save-btn");
        const wasEditing=!!editingId;
        $save.prop("disabled",true).text("Saving...");

        try {
            const url=wasEditing?`${PRODUCTS_API}/${editingId}`:PRODUCTS_API;
            await $.ajax({url,method:"POST",data,processData:false,contentType:false});
            showAdminAlert(wasEditing?"Product updated successfully":"Product created successfully","success");
            resetForm();
            await fetchProducts();
        } catch(xhr) {
            console.error(xhr);
            showAdminAlert(xhr.responseJSON?.message||"Save failed","danger");
        } finally {
            $save.prop("disabled",false).text(wasEditing?"Update Product":"Add Product");
        }
    });

    $("#cancel-edit-btn").on("click",resetForm);

    function handleEdit(p) {
        editingId=p.id; imageFile=null;
        form.name.val(p.name||""); form.newPrice.val(p.newPrice||""); form.oldPrice.val(p.oldPrice||"");
        form.category.val(p.productCategory||""); form.condition.val(p.productCondition||"new");
        form.stock.val(p.stock||0); form.stockStatus.val(p.stockStatus||"IN_STOCK");
        form.description.val(p.description||""); form.badge.val(p.badge||""); form.discount.val(p.discount||"");
        form.shipping.val(p.shipping||""); form.delivery.val(p.delivery||""); form.returnPolicy.val(p.returnPolicy||"");
        form.image.val("");
        $("#f-image-hint").text("Leave empty to keep current image");
        $("#save-btn").text("Update Product"); $("#cancel-edit-btn").show();

        previewImages=[];
        if(p.image) previewImages.push({src:productImageUrl(p.image)});
        renderPreviews();
        $("html,body").animate({scrollTop:0},300);
    }

    async function handleDelete(id) {
        if(!window.confirm("Delete this product?")) return;
        try {
            await $.ajax({url:`${PRODUCTS_API}/${id}`,method:"DELETE"});
            showAdminAlert("Product deleted successfully","success");
            fetchProducts();
        } catch(xhr) {
            console.error(xhr);
            showAdminAlert("Delete failed","danger");
        }
    }

    function renderPaginationItems(totalPages) {
        const items=[], maxPages=Math.min(5,totalPages);
        let start=Math.max(1,currentPage-Math.floor(maxPages/2));
        let end=Math.min(totalPages,start+maxPages-1);
        if(end-start<maxPages-1) start=Math.max(1,end-maxPages+1);

        if(start>1) {
            items.push(`<li class="page-item"><a class="page-link" href="#" data-page="1">First</a></li>`);
            items.push(`<li class="page-item ${currentPage===1?"disabled":""}"><a class="page-link" href="#" data-page="${currentPage-1}">Prev</a></li>`);
        }
        for(let i=start;i<=end;i++)
            items.push(`<li class="page-item ${i===currentPage?"active":""}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`);
        if(end<totalPages) {
            items.push(`<li class="page-item ${currentPage===totalPages?"disabled":""}"><a class="page-link" href="#" data-page="${currentPage+1}">Next</a></li>`);
            items.push(`<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">Last</a></li>`);
        }
        return items.join("");
    }

    function render() {
        $("#filter-row").toggle(products.length>0);
        const from=filteredProducts.length?(currentPage-1)*ITEMS_PER_PAGE+1:0;
        const to=Math.min(currentPage*ITEMS_PER_PAGE,filteredProducts.length);
        $("#products-count-text").text(`Showing ${from}-${to} of ${filteredProducts.length} products`);

        const $empty=$("#empty-state"), $table=$("#table-wrap"), $pagination=$("#pagination-wrap");
        if(filteredProducts.length===0&&!loading) {
            $empty.show().text(selectedCategory?"No products in this category.":"No products yet. Add one to get started!");
            $table.hide(); $pagination.hide(); return;
        }
        $empty.hide(); $table.show();

        const totalPages=Math.ceil(filteredProducts.length/ITEMS_PER_PAGE);
        const start=(currentPage-1)*ITEMS_PER_PAGE;
        const current=filteredProducts.slice(start,start+ITEMS_PER_PAGE);

        $("#products-tbody").html(current.map(p=>`
            <tr>
                <td>${p.id}</td>
                <td>${escapeHtml(p.name)}</td>
                <td><div class="product-images-cell">
                    ${p.image?`<img src="${productImageUrl(p.image)}" alt="${escapeHtml(p.name)}" width="50"
                    style="max-height:50px;object-fit:cover"
                    onerror="this.src='https://via.placeholder.com/50'">`:""}
                </div></td>
                <td>${escapeHtml(categoryLabels[p.productCategory]||p.productCategory||"")}
                    ${p.productCondition?`<span class="ms-1 badge ${p.productCondition==="new"?"bg-success":"bg-warning text-dark"}">${p.productCondition==="new"?"New":"Used"}</span>`:""}
                </td>
                <td><div><strong>Rs.${parseFloat(p.newPrice||0).toFixed(2)}/=</strong></div>
                    ${p.oldPrice?`<small class="text-muted"><strike>Rs.${parseFloat(p.oldPrice).toFixed(2)}/=</strike></small>`:""}</td>
                <td><span class="badge ${p.stockStatus==="IN_STOCK"?"bg-success":"bg-danger"}">${p.stockStatus==="IN_STOCK"?"In Stock":"Out of Stock"}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning me-2 edit-btn" data-id="${p.id}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${p.id}">Delete</button>
                </td>
            </tr>`).join(""));

        const $tbody=$("#products-tbody");
        $tbody.find(".edit-btn").on("click",function() {
            const id=$(this).data("id");
            const p=products.find(x=>String(x.id)===String(id));
            if(p) handleEdit(p);
        });
        $tbody.find(".delete-btn").on("click",function() { handleDelete($(this).data("id")); });

        if(filteredProducts.length>ITEMS_PER_PAGE) {
            $pagination.css("display","flex");
            $("#admin-pagination").html(renderPaginationItems(totalPages));
            $("#admin-pagination .page-link").on("click",function(e) {
                e.preventDefault();
                const page=Number($(this).data("page"));
                if(page>=1&&page<=totalPages) { currentPage=page; render(); }
            });
        } else $pagination.hide();
    }

    $("#category-filter").on("change",function() {
        selectedCategory=$(this).val();
        applyFilter();
    });

    fetchProducts();
})();