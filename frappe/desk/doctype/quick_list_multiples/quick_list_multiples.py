# Copyright (c) 2024, Frappe Technologies and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class QuickListMultiples(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		document_type: DF.Link
		label: DF.Data
		parent: DF.Data
		parentfield: DF.Data
		parenttype: DF.Data
		quick_list_multiple_filter: DF.Code | None
	# end: auto-generated types
	pass
