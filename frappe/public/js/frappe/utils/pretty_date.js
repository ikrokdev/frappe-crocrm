function prettyDate(date, mini) {
    if (!date) return "";

    if (typeof date == "string") {
        date = frappe.datetime.convert_to_user_tz(date);
        date = new Date(
            (date || "")
                .replace(/-/g, "/")
                .replace(/[TZ]/g, " ")
                .replace(/\.[0-9]*/, "")
        );
    }

    let diff = (new Date(frappe.datetime.now_datetime().replace(/-/g, "/")).getTime() - date.getTime()) / 1000;
    let day_diff = Math.floor(diff / 86400);

    if (isNaN(day_diff) || day_diff < 0) return "";

    if (mini) {
        // Повертаємо короткий формат різниці часу
        if (day_diff == 0) {
            if (diff < 60) {
                return __("now");
            } else if (diff < 3600) {
                return __("{0} m", [Math.floor(diff / 60)]);
            } else if (diff < 86400) {
                return __("{0} h", [Math.floor(diff / 3600)]);
            }
        } else {
            if (day_diff < 7) {
                return __("{0} d", [day_diff]);
            } else if (day_diff < 31) {
                return __("{0} w", [Math.floor(day_diff / 7)]);
            } else if (day_diff < 365) {
                return __("{0} M", [Math.floor(day_diff / 30)]);
            } else {
                return __("{0} y", [Math.floor(day_diff / 365)]);
            }
        }
    } else {
        // Повертаємо дату у форматі YYYY-MM-DD HH:MM:SS
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
}

frappe.provide("frappe.datetime");
window.comment_when = function (datetime, mini) {
    var timestamp = frappe.datetime.str_to_user ? frappe.datetime.str_to_user(datetime) : datetime;
    return (
        '<span class="frappe-timestamp ' +
        (mini ? " mini" : "") +
        '" data-timestamp="' +
        datetime +
        '" title="' +
        timestamp +
        '">' +
        prettyDate(datetime, mini) +
        "</span>"
    );
};
frappe.datetime.comment_when = comment_when;
frappe.datetime.prettyDate = prettyDate;

frappe.datetime.refresh_when = function () {
    if (jQuery) {
        $(".frappe-timestamp").each(function () {
            $(this).html(prettyDate($(this).attr("data-timestamp"), $(this).hasClass("mini")));
        });
    }
};

setInterval(function () {
    frappe.datetime.refresh_when();
}, 60000); 
