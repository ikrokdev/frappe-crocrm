// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

frappe.ui.form.on("Newsletter", {
	refresh(frm) {
		let doc = frm.doc;
		let can_write = frappe.boot.user.can_write.includes(doc.doctype);
		if (!frm.is_new() && !frm.is_dirty() && !doc.email_sent && can_write) {
			frm.add_custom_button(
				__("Send a test email"),
				() => {
					frm.events.send_test_email(frm);
				},
				__("Preview")
			);

			frm.add_custom_button(
				__("Check broken links"),
				() => {
					frm.dashboard.set_headline(__("Checking broken links..."));
					frm.call("find_broken_links").then((r) => {
						frm.dashboard.set_headline("");
						let links = r.message;
						if (links && links.length) {
							let html =
								"<ul>" +
								links.map((link) => `<li>${link}</li>`).join("") +
								"</ul>";
							frm.dashboard.set_headline(
								__("Following links are broken in the email content: {0}", [html])
							);
						} else {
							frm.dashboard.set_headline(
								__("No broken links found in the email content")
							);
							setTimeout(() => {
								frm.dashboard.set_headline("");
							}, 3000);
						}
					});
				},
				__("Preview")
			);

			frm.add_custom_button(
				__("Send now"),
				() => {
					if (frm.doc.schedule_send) {
						frappe.confirm(
							__(
								"This newsletter was scheduled to send on a later date. Are you sure you want to send it now?"
							),
							function () {
								frm.events.send_emails(frm);
							}
						);
						return;
					}
					frappe.confirm(
						__("Are you sure you want to send this newsletter now?"),
						() => {
							frm.events.send_emails(frm);
						}
					);
				},
				__("Send")
			);

			frm.add_custom_button(
				__("Schedule sending"),
				() => {
					frm.events.schedule_send_dialog(frm);
				},
				__("Send")
			);

			frm.add_custom_button(
				__("Intervally sending"),
				() => {
					frm.events.intervally_send_dialog(frm);
				},
				__("Send")
			);
			frm.add_custom_button(
				__("Test"),
				() => {
					frappe.call("frappe.email.doctype.newsletter.newsletter.intervally_send_email");
				},
				__("Send")
			);
		}

		frm.events.update_sending_status(frm);

		if (frm.is_new() && !doc.sender_email) {
			let { fullname, email } = frappe.user_info(doc.owner);
			frm.set_value("sender_email", email);
			frm.set_value("sender_name", fullname);
		}

		frm.trigger("update_schedule_message");
	},

	send_emails(frm) {
		frappe.dom.freeze(__("Queuing emails..."));
		frm.call("send_emails").then(() => {
			frm.refresh();
			frappe.dom.unfreeze();
			frappe.show_alert(
				__("Queued {0} emails", [frappe.utils.shorten_number(frm.doc.total_recipients)])
			);
		});
	},

	schedule_send_dialog(frm) {
		let hours = frappe.utils.range(24);
		let time_slots = hours.map((hour) => {
			return `${(hour + "").padStart(2, "0")}:00`;
		});
		let d = new frappe.ui.Dialog({
			title: __("Schedule Newsletter"),
			fields: [
				{
					label: __("Date"),
					fieldname: "date",
					fieldtype: "Date",
					options: {
						minDate: new Date(),
					},
					reqd: true,
				},
				{
					label: __("Time"),
					fieldname: "time",
					fieldtype: "Select",
					options: time_slots,
					reqd: true,
				},
			],
			primary_action_label: __("Schedule"),
			primary_action({ date, time }) {
				frm.set_value("schedule_sending", 1);
				frm.set_value("schedule_send", `${date} ${time}:00`);
				d.hide();
				frm.save();
			},
			secondary_action_label: __("Cancel Scheduling"),
			secondary_action() {
				frm.set_value("schedule_sending", 0);
				frm.set_value("schedule_send", "");
				d.hide();
				frm.save();
			},
		});
		if (frm.doc.schedule_sending) {
			let parts = frm.doc.schedule_send.split(" ");
			if (parts.length === 2) {
				let [date, time] = parts;
				d.set_value("date", date);
				d.set_value("time", time.slice(0, 5));
			}
		}
		d.show();
	},

	intervally_send_dialog(frm) {
		
		let d = new frappe.ui.Dialog({
			title: __("Intervally sending"),
			fields: [
				{
                    label: __('Sending Interval'),
                    fieldname: 'sending_interval',
                    fieldtype: 'Select',
                    options: ['Weekly', 'Monthly', 'Yearly'],
                    default: 'Weekly',
                    reqd: 1,
                    description: __('Select the interval for sending newsletters.')
                },
				{
					label: 'Week Day',
					fieldname: 'week_day',
					fieldtype: 'Select',
					options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday',  'Friday', 'Saturday', 'Sunday'],
					depends_on: 'eval:doc.sending_interval == "Weekly"',
					mandatory_depends_on: "eval:doc.sending_interval === 'Weekly'",
					reqd: 0,
					translatable: 1
				},
				{
					label: 'Month',
					fieldname: 'month',
					fieldtype: 'Table MultiSelect',
					options: 'Month MS',
					depends_on: 'eval:doc.sending_interval == "Yearly"',
					mandatory_depends_on: 'eval:doc.sending_interval == "Yearly"',
					reqd: 0
				},
				{
					label: 'Month Day',
					fieldname: 'month_day',
					fieldtype: 'Table MultiSelect',
					options: 'Month Day MS',
					depends_on: 'eval:doc.sending_interval == "Monthly" || doc.sending_interval == "Yearly"',
					mandatory_depends_on: 'eval:doc.sending_interval == "Monthly" || doc.sending_interval == "Yearly"',
					reqd: 0,
					limit:100
				}
			],
			primary_action_label: __("Schedule"),
			primary_action({ sending_interval, week_day, month_day, month}) {
				console.log(sending_interval, week_day, month_day, month);
				frm.set_value("custom_intervally_sending", 1);
				frm.set_value("custom_sending_interval", sending_interval);
				if (month) {frm.set_value("custom_month", month)};
				if (month_day) {frm.set_value("custom_month_day", month_day)};
				if (week_day) {frm.set_value("custom_week_day", week_day)};
							
				console.log(month_day);
				d.hide();
				frm.save();
			},
			secondary_action_label: __("Stop Scheduling"),
			secondary_action() {
				frm.set_value("custom_intervally_sending", 0);
				frm.set_value("custom_sending_interval", null);
				frm.set_value("custom_month", null);
				frm.set_value("custom_month_day", null);
				frm.set_value("custom_week_day", null);
				d.hide();
				frm.save();
			},
		});
		if (frm.doc.custom_intervally_sending) {
		}
		d.show();
	},

	send_test_email(frm) {
		let d = new frappe.ui.Dialog({
			title: __("Send Test Email"),
			fields: [
				{
					label: __("Email"),
					fieldname: "email",
					fieldtype: "Data",
					options: "Email",
				},
			],
			primary_action_label: __("Send"),
			primary_action({ email }) {
				d.get_primary_btn().text(__("Sending...")).prop("disabled", true);
				frm.call("send_test_email", { email }).then(() => {
					d.get_primary_btn().text(__("Send again")).prop("disabled", false);
				});
			},
		});
		d.show();
	},

	async update_sending_status(frm) {
		if (frm.doc.email_sent && frm.$wrapper.is(":visible") && !frm.waiting_for_request) {
			frm.waiting_for_request = true;
			let res = await frm.call("get_sending_status");
			frm.waiting_for_request = false;
			let stats = res.message;
			stats && frm.events.update_sending_progress(frm, stats);
			if (
				stats.sent + stats.error >= frm.doc.total_recipients ||
				(!stats.total && !stats.emails_queued)
			) {
				frm.sending_status && clearInterval(frm.sending_status);
				frm.sending_status = null;
				return;
			}
		}

		if (frm.sending_status) return;
		frm.sending_status = setInterval(() => frm.events.update_sending_status(frm), 5000);
	},

	update_sending_progress(frm, stats) {
		if (stats.sent + stats.error >= frm.doc.total_recipients || !frm.doc.email_sent) {
			frm.doc.email_sent && frm.page.set_indicator(__("Sent"), "green");
			frm.dashboard.hide_progress();
			return;
		}
		if (stats.total) {
			frm.page.set_indicator(__("Sending"), "blue");
			frm.dashboard.show_progress(
				__("Sending emails"),
				(stats.sent * 100) / frm.doc.total_recipients,
				__("{0} of {1} sent", [stats.sent, frm.doc.total_recipients])
			);
		} else if (stats.emails_queued) {
			frm.page.set_indicator(__("Queued"), "blue");
		}
	},

	on_hide(frm) {
		if (frm.sending_status) {
			clearInterval(frm.sending_status);
			frm.sending_status = null;
		}
	},

	update_schedule_message(frm) {
		if (!frm.doc.email_sent && frm.doc.schedule_send) {
			let datetime = frappe.datetime.global_date_format(frm.doc.schedule_send);
			frm.dashboard.set_headline_alert(
				__("This newsletter is scheduled to be sent on {0}", [datetime.bold()])
			);
		} else {
			frm.dashboard.clear_headline();
		}
	},
});
