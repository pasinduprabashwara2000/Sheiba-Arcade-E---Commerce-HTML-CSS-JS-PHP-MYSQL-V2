/* login.js — jQuery */
function showAlert(message, type) {
    $("#alert-slot").html(`
        <div class="alert alert-${type} position-absolute top-0 w-100" role="alert">
            ${escapeHtml(message)}
        </div>`);
}
function clearAlert() { $("#alert-slot").empty(); }

$(function() {
    // Already signed in? Skip the form.
    if (isLoggedIn()) {
        window.location.replace(homeForRole(getRole()));
        return;
    }

    const next = safeNext(new URLSearchParams(window.location.search).get("next"));
    if (next) {
        $("#login-note").text("Log in or sign up to add items to your cart.").show();
    }

    $("#login-form").on("submit", async function(e) {
        e.preventDefault();
        clearAlert();

        const username = $("#login-username").val().trim();
        const password = $("#login-password").val().trim();
        const $submitBtn = $("#login-submit-btn");

        if (!username || !password) {
            showAlert("Username and password are required", "danger");
            return;
        }

        $submitBtn.prop("disabled", true)
            .html(`<span class="spinner-border spinner-border-sm me-2"></span>Logging in...`);

        try {
            const data = await $.ajax({
                url: `${API_URL}/login`,
                method: "POST",
                contentType: "application/json",
                dataType: "json",
                data: JSON.stringify({ username, password })
            });

            saveSession(data);
            const role = data.user && data.user.role;

            showAlert(data.message || "Login successful", "success");
            // Admins always land in the admin panel (its own layout); customers go back to the store.
            const target = role === "admin" ? "admin.html" : (next || "index.html");
            setTimeout(() => { window.location.href = target; }, 400);
        } catch (xhr) {
            console.error("Login error:", xhr);
            const message = xhr.responseJSON?.message || xhr.responseJSON?.error ||
                (xhr.status === 0 ? "Network error. Please check your connection and API URL." : "Login failed. Please try again.");
            showAlert(message, "danger");
            $submitBtn.prop("disabled", false).text("Log in");
        }
    });
});
