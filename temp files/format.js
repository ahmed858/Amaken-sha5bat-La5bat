frappe.ui.form.on('ToDo', {
    refresh(frm) {
        // your code here
        if (!frm.is_new) {
            if (frm.doc.status === "open" && frappe.session.user != frm.doc.owner) {
                $.each(frm.firlds_dict, function (firldname, field) {
                    if (fieldname !== 'status') {
                        frm.set_df_property(filedname, 'read_only', 1);
                    }
                })
                frm.refresh_fields();
            }
        }
    }
})