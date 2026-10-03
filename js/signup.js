/* signup.js — jQuery */
function showAlert(message, type) {
    $("#alert-slot").html(`
        <div class="alert alert-${type} position-absolute top-0 w-100" role="alert">
            ${escapeHtml(message)}
        </div>`);
}
function clearAlert() { $("#alert-slot").empty(); }

$(function() {
    if (isLoggedIn()) {
        window.location.replace(homeForRole(getRole()));
        return;
    }

    $("#signup-form").on("submit", async function(e) {
        e.preventDefault();
        clearAlert();

        const email = $("#signup-email").val().trim();
        const username = $("#signup-username").val().trim();
        const password = $("#signup-password").val();
        const confirmPassword = $("#signup-confirm-password").val();
        const $submitBtn = $("#signup-submit-btn");

        if (!email || !username || !password) return showAlert("All fields are required", "danger");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showAlert("Please enter a valid email address", "danger");
        if (username.length < 3) return showAlert("Username must be at least 3 characters long", "danger");
        if (!/^[a-zA-Z0-9_]+$/.test(username)) return showAlert("Username can only contain letters, numbers, and underscores", "danger");
        if (password.length < 6) return showAlert("Password must be at least 6 characters long", "danger");
        if (password !== confirmPassword) return showAlert("Passwords do not match", "danger");

        $submitBtn.prop("disabled", true)
            .html(`<span class="spinner-border spinner-border-sm me-2"></span>Creating Account...`);

        try {
            const data = await $.ajax({
                url: `${API_URL}/signup`,
                method: "POST",
                contentType: "application/json",
                dataType: "json",
                data: JSON.stringify({ email, username, password })
            });

            // The API signs the new customer in straight away
            saveSession(data);
            showAlert("Account created!", "success");
            setTimeout(() => { window.location.href = "index.html"; }, 900);
        } catch (xhr) {
            console.error("Signup error:", xhr);
            const message = xhr.responseJSON?.message || xhr.responseJSON?.error ||
                (xhr.status === 0 ? "Network error. Please check your connection and API URL." : "Signup failed. Please try again.");
            showAlert(message, "danger");
            $submitBtn.prop("disabled", false).text("Sign up");
        }
    });
});
