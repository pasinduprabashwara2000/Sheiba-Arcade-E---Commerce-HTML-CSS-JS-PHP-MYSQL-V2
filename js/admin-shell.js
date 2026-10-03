/* admin-shell.js — sidebar / topbar behaviour for the admin panel pages */
$(function() {
    const name = getUsername();
    $("#adm-username").text(name);
    $("#adm-avatar").text((name || "A").charAt(0));

    $("#adm-logout").on("click", function() {
        clearSession();
        window.location.href = "login.html";
    });

    const $side = $("#adm-sidebar");
    const $backdrop = $("#adm-backdrop");
    function toggle(open) {
        $side.toggleClass("open", open);
        $backdrop.toggleClass("open", open);
    }
    $("#adm-toggle").on("click", () => toggle(!$side.hasClass("open")));
    $backdrop.on("click", () => toggle(false));
});
