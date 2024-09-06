import Widget from "./base_widget.js";
import todo_filter_presets from "./todo_filter_presets.js";

frappe.provide("frappe.utils");

export default class QuickListWidget extends Widget {
	constructor(opts) {
		opts.shadow = true;
		super(opts);
	}

	get_config() {
		return {
			document_type: this.document_type,
			label: this.label,
			quick_list_filter: this.quick_list_filter,
		};
	}

	set_actions() {
		if (this.in_customize_mode) return;
		console.log('debug console. \n', 'Setting up quick list widget actions.');
		this.setup_fields_list_button().then(() => {
			this.setup_add_new_button();
			this.setup_refresh_list_button();
			this.setup_filter_list_button();
			if (this.document_type === "Task") {
				console.log('debug console. \n', 'Setting up quick list widget filter presets for Task type: \n', todo_filter_presets);
				this.setup_filters_preset();
			}
		});
	}

	setup_add_new_button() {
		this.add_new_button = $(
			`<div class="add-new btn btn-xs pull-right"
			title="${__("Add New")}  ${__(this.document_type)}
			">
				${frappe.utils.icon("add", "sm")}
			</div>`
		);

		this.add_new_button.appendTo(this.action_area);
		this.add_new_button.on("click", () => {
			frappe.set_route(
				frappe.utils.generate_route({
					type: "doctype",
					name: this.document_type,
					doc_view: "New",
				})
			);
		});
	}

	setup_refresh_list_button() {
		this.refresh_list = $(
			`<div class="refresh-list btn btn-xs pull-right" title="${__("Refresh List")}">
				${frappe.utils.icon("es-line-reload", "sm")}
			</div>`
		);

		this.refresh_list.appendTo(this.action_area);
		this.refresh_list.on("click", () => {
			this.body.empty();
			this.set_body();
		});
	}

	setup_filter_list_button() {
		this.filter_list = $(
			`<div class="filter-list btn btn-xs pull-right" title="${__("Add/Update Filter")}">
				${frappe.utils.icon("filter", "sm")}
			</div>`
		);

		this.filter_list.appendTo(this.action_area);
		this.filter_list.on("click", () => this.setup_filter_dialog());
	}

	set_ql_filter(filters) { 
		let old_filter = this.quick_list_filter;
		this.quick_list_filter = JSON.stringify(filters);

		if (old_filter != this.quick_list_filter) {
			this.body.empty();
			this.set_footer();
			this.set_body();
		}
	}

	setup_filters_preset() {
		console.log('debug console. \n', this.filter_presets_list);
		this.filter_presets_list = $(
			`<div>
				${todo_filter_presets.map((item) => {
					return `<div 
						class="filter-list filter-preset button m-1 btn btn-xs"
						id="filter_preset_${item.id}"
						title="${__(item.title)}">
						${item.title}
					</div>`
				}).join('')}
			</div>`
		);
		//this.action_area.parent().find(".widget-label")
		this.filter_presets_list.appendTo(this.action_area.parent().find(".widget-label"));
		this.filter_presets_list.on("click", (e) => {
			const target = e.target;
			if (target.classList.contains("filter-preset") ) {
				// console.log("hello ", e.target.id);
				const id = target.id.replace("filter_preset_", "");
				const item = todo_filter_presets.find((item) => item.id === id);
				this.set_ql_filter(item.configuration);
			}
		});
	}

	setup_filter(doctype) {
		if (this.filter_group) {
			this.filter_group.wrapper.empty();
			delete this.filter_group;
		}

		this.filters = frappe.utils.process_filter_expression(this.quick_list_filter);

		this.filter_group = new frappe.ui.FilterGroup({
			parent: this.dialog.get_field("filter_area").$wrapper,
			doctype: doctype,
			on_change: () => {},
		});

		frappe.model.with_doctype(doctype, () => {
			this.filter_group.add_filters_to_filter_group(this.filters);
			this.dialog.set_df_property("filter_area", "hidden", false);
		});
	}
	show_list_settings() {
		console.log('debug console. \n', 'Setting up quick list configuration: \n', {
			listview: this,
			doctype: this.document_type,
			settings: this.list_view_settings,
			meta: frappe.get_meta(this.document_type),
		});

		frappe.model.with_doctype(this.document_type, () => {
			new ListSettings({
				listview: this,
				doctype: this.document_type,
				settings: this.list_view_settings,
				meta: frappe.get_meta(this.document_type),
			});
		});
	}

	setup_filter_dialog() {
		let fields = [
			{
				fieldtype: "HTML",
				fieldname: "filter_area",
			},
		];
		let me = this;
		this.dialog = new frappe.ui.Dialog({
			title: __("Set Filters for {0}", [__(this.document_type)]),
			fields: fields,
			primary_action: function () {
				let old_filter = me.quick_list_filter;
				let filters = me.filter_group.get_filters();
				me.quick_list_filter = JSON.stringify(filters);

				this.hide();

				if (old_filter != me.quick_list_filter) {
					me.body.empty();
					me.set_footer();
					me.set_body();
				}
			},
			primary_action_label: __("Save"),
		});

		this.dialog.show();
		this.setup_filter(this.document_type);
	}

	render_loading_state() {
		this.body.empty();
		this.loading = $(`<div class="list-loading-state text-muted">${__("Loading...")}</div>`);
		this.loading.appendTo(this.body);
	}

	render_no_data_state() {
		this.loading = $(`<div class="list-no-data-state text-muted">${__("No Data...")}</div>`);
		this.loading.appendTo(this.body);
	}

	setup_quick_list_item(doc) {
		const indicator = frappe.get_indicator(doc, this.document_type);

		let $quick_list_item = $(`
			<div class="quick-list-item">
				<div class="ellipsis left">
					<div class="ellipsis title"
						title="${strip_html(doc[this.title_field_name])}">
						${strip_html(doc[this.title_field_name])}
					</div>
					<div class="timestamp text-muted">
						${frappe.datetime.prettyDate(doc.modified)}
					</div>
				</div>
			</div>
		`);

		if (indicator) {
			$(`
				<div class="status indicator-pill ${indicator[1]} ellipsis">
					${__(indicator[0])}
				</div>
			`).appendTo($quick_list_item);
		}

		$(`<div class="right-arrow">${frappe.utils.icon("right", "xs")}</div>`).appendTo(
			$quick_list_item
		);

		$quick_list_item.click((e) => {
			if (e.ctrlKey || e.metaKey) {
				frappe.open_in_new_tab = true;
			}
			frappe.set_route(`${frappe.utils.get_form_link(this.document_type, doc.name)}`);
		});

		return $quick_list_item;
	}

	set_body() {
		console.log('debug console. \n', 'Setting up quick list body.', );
		this.widget.addClass("quick-list-widget-box");

		this.render_loading_state();

		frappe.model.with_doctype(this.document_type, () => {
			let fields = ["name"];

			// get name of title field
			if (!this.title_field_name) {
				let meta = frappe.get_meta(this.document_type);
				this.title_field_name = (meta && meta.title_field) || "name";
			}

			if (this.title_field_name && this.title_field_name != "name") {
				fields.push(this.title_field_name);
			}

			// check doctype has status field
			this.has_status_field = frappe.meta.has_field(this.document_type, "status");

			if (this.has_status_field) {
				fields.push("status");
				fields.push("docstatus");

				// add workflow state field if workflow exist & is active
				let workflow_fieldname = frappe.workflow.get_state_fieldname(this.document_type);
				workflow_fieldname && fields.push(workflow_fieldname);
			}

			fields.push("modified");

			let quick_list_filter = frappe.utils.process_filter_expression(this.quick_list_filter);

			let args = {
				method: "frappe.desk.reportview.get",
				args: {
					doctype: this.document_type,
					fields: fields,
					filters: quick_list_filter,
					order_by: "modified desc",
					start: 0,
					page_length: 4,
				},
			};

			frappe.call(args).then((r) => {
				if (!r.message) return;
				let data = r.message;

				this.body.empty();
				data = !Array.isArray(data) ? frappe.utils.dict(data.keys, data.values) : data;

				if (!data.length) {
					this.render_no_data_state();
					return;
				}

				this.labels = r.message?.keys.map((key) => {
					let column = this.columns.find((col) => col.df.fieldname === key);
					if (column) {
						return column.df.label;
					} else {
						return key.charAt(0).toUpperCase() + key.slice(1);
					}
				})
				console.log('debug console. \n', 'Setting up quick list items', );
				this.quick_list = data.map((doc) => this.setup_quick_list_item(doc));
				this.quick_list.forEach(($quick_list_item) =>
					$quick_list_item.appendTo(this.body)
				);
				this.quick_list_table = this.quick_list_table.filter((i, el)=> i != 0);
				console.log('debug console. \n', 'Appending quick list items.', );
				this.quick_list_table.appendTo(this.body);
			});
		});
	}

	set_footer() {
		console.log('debug console. \n', 'Setting up widget footer.', );
		this.footer.empty();

		let filters = frappe.utils.get_filter_from_json(this.quick_list_filter);
		let route = frappe.utils.generate_route({ type: "doctype", name: this.document_type });
		this.see_all_button = $(`
			<div class="see-all btn btn-xs">${__("View List")}</div>
		`).appendTo(this.footer);

		this.see_all_button.click((e) => {
			if (e.ctrlKey || e.metaKey) {
				frappe.open_in_new_tab = true;
			}
			if (filters) {
				frappe.route_options = filters;
			}
			frappe.set_route(route);
		});
	}
}
