//////////////////////////////////////////////////
/////////////////////global variables/////////////
var userSamples;
var status_dic = {};
var head_section_innerHTML;
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ================== user data ==================
var current_user = frappe.call({
    method: "frappe.client.get",
    args: { doctype: "User", name: frappe.session.user },
    callback(r) {
        if (r.message) {
            root_element.querySelector("#full_name").textContent = r.message.full_name || "";
            root_element.querySelector("#email").textContent = r.message.email || "";
        }
    }
});

// ================== about Comment ==================
function addComment(sampleName, commentContent) {
    if (!sampleName || !commentContent) {
        frappe.msgprint("الرجاء إدخال اسم العينة والتعليق.");
        return;
    }

    frappe.call({
        method: "frappe.client.insert",
        args: {
            doc: {
                doctype: "Comment",
                comment_type: "Comment",
                reference_doctype: "BaseSample",
                reference_name: sampleName,
                content: commentContent,
                comment_email: frappe.session.user,
                comment_by: frappe.session.user_fullname
            }
        },
        callback: function (response) {
            if (response.message) {
                frappe.msgprint("تم إضافة التعليق بنجاح!");
                loadSamples();
            } else {
                frappe.msgprint("حدث خطأ أثناء إضافة التعليق.");
            }
        },
        error: function (error) {
            console.error("خطأ في الاتصال:", error);
            frappe.msgprint("حدث خطأ في الاتصال بالخادم.");
        }
    });
}

// ================== التعليقات ==================
function openCommentPopup1(sampleName) {
    const commentPopup = new frappe.ui.Dialog({
        title: "إضافة تعليق",
        fields: [{ fieldtype: "Text", fieldname: "comment", label: "التعليق", placeholder: "أدخل تعليقك هنا" }],
        primary_action_label: "إضافة تعليق",
        primary_action: (values) => {
            addComment(sampleName, values.comment);
            commentPopup.hide();
        }
    });
    commentPopup.show();
}

// ================== about data ==================
async function get_all_samples() {
    // get all user samples
    let data;
    await frappe.call({
        method: "get_all_for_user",
        callback: function (res) {
            data = res.message;
        }
    });
    return data;
}
function groupeByStatus(samples) {
    // count status and return status vs count
    let dic = {
        'جديدة': 0,
        'معاينة': 0,
        'مراجعة': 0,
        'تحت الإجراء': 0,
        'معتمدة': 0,
        'مرسلة': 0,
        'مسجلة': 0,
        'معلقة': 0,
        'مسودة': 0
    };

    for (const idx in samples) {
        if (dic.hasOwnProperty(samples[idx]['workflow_state'])) {
            dic[samples[idx]['workflow_state']] += 1;
        }
    }
    return dic;
}
function getSamplesByState(samples, state = 'all') {
    if (state === 'all') {
        return samples;
    }
    let result = [];
    for (const sample of samples) {
        if (sample['workflow_state'] === state) {
            result.push(sample);
        }
    }
    return result;
}
function filterData(samples, filters) {
    if (!filters) {
        frappe.msgprint('There is no filters!!');
        return [];
    }
    let result = [];

    for (const sample of samples) {
        for (const key in filters) {
            if (sample[key] === filters[key]) {
                result.push(sample);
            }
        }
    }
    return result;
}

// ================== DOM manipulation  ==================
function showBoxesforUser() {
    let boxes = ['جديدة', 'معاينة'];
    if (has_common(frappe.user_roles, ["Data Entry"])) {
        boxes = ['جديدة', 'معاينة'];
    }
    if (has_common(frappe.user_roles, ["Assessor"])) {
        boxes.push('معلقة', 'إرجاع للمعاين');

    }
    if (has_common(frappe.user_roles, ["Reviewer"])) {
        boxes.push('مراجعة', 'تحت الإجراء', 'معتمدة', 'معلقة', 'إرجاع للمراجع');

    }
    boxes.forEach(box => {
        const el = root_element.querySelector(`#status-${box.replace(/\s/g, "-")} `);
        if (el) {

            el.style.display = 'block';
        }
    });
}
function setBoxesCount(dic) {
    // set html states boxes with count 
    for (const key in dic) {
        const el = root_element.querySelector(`#status-${key.replace(/\s/g, "-")} .count`);
        if (el) {
            el.textContent = dic[key];
        }
    }
}
function addEventListeneToBoxes(samples) {
    // Add action to boxes
    const boxes = root_element.querySelectorAll(".status-box");


    for (const el of boxes) {
        el.addEventListener('click', () => {
            const state = el.getAttribute("data-status");
            const filterdSamples = getSamplesByState(samples, state);
            fillData(filterdSamples);
        });
    }

}
function fillData(samples) {
    // fill the container with data
    const container = root_element.querySelector("#samples-table-container");
    if (!container) {
        console.warn("لم يتم العثور على container");
        return;
    }

    container.innerHTML = "<p style='text-align:center;'>جاري التحميل...</p>";

    const table = document.createElement("table");
    table.className = "table table-bordered table-hover";
    table.innerHTML = `
                        <thead >
                            <tr>
                                <th>رقم المعاملة</th>
                                <th>العميل</th>
                                <th>المنطقة</th>
                                <th>المقيم</th>
                                <th>رقم الصك</th>
                                <th>التكليف</th>
                                <th>الحالة</th>
                                <th>ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                        `;

    const tbody = table.querySelector("tbody");

    samples.forEach((sample, index) => {
        const row = document.createElement("tr");
        row.style.backgroundColor = index % 2 === 0 ? "#f9f9f9" : "#fff";

        const ageLabel = (
            () => {
                const creationDate = new Date(sample['creation']);
                const today = new Date();
                const diff = today - creationDate;
                const days = Math.floor(diff / (1000 * 3600 * 24));
                const hours = Math.floor(diff / (1000 * 3600));
                return days > 0 ? `${days} يوم` : `${hours} ساعة`;
            })();

        row.innerHTML = `
        <td>
            <a href="/app/basesample/${sample['name']}" style="color: #007bff; font-weight: bold;">${sample['name']}</a><br>
            <span class="badge" style="background-color: #007bff; color: white;">${ageLabel}</span>
        </td>
        <td style="text-align:right;">
            <span class="badge" style="background:#8b7230; color:white;">${sample['customer']}</span><br>
            <span style="color:red;">المالك: ${sample['owner2'] || ""}</span><br>
            <span>جوال: ${sample['ownermobile'] || ""}</span><br>
            <span style="color:green;">طالب التقييم: ${sample['willtoevalution'] || ""}</span><br>
            <span>جوال: ${sample['willtoevalutionmoblie'] || ""}</span>
        </td>
        <td style="text-align:center;">
            <span class="badge" >${sample['region'] || ""}</span><br>
            <span class="badge"  >${sample['city'] || ""}</span><br>
            <span class="badge"  >${sample['gada'] || ""}</span>
        </td>
        <td style="text-align:center;">
            <span> المدخل: ${sample['owner'] || ""} </span><br>
            <span>معاين: ${sample['evaluation_name'] || ""}</span><br>
            <span> مراجع: ${sample['review'] || ""} </span>
        </td>
        <td style="text-align:center;">${sample['instrementnumber'] || ""}<br>
            <span class="badge" style="background:#b49032; color:white;">${sample['aqartype'] || "لم يحدد بعد"}</span>
        </td>
        <td style="text-align:center;">
            ${sample['dateofcommissioning'] || ""}<br>
            <span class="badge" style="background:#59a3b0; color:white;">${sample['commissioningnumber'] || ""}</span>
        </td>
        <td style="text-align:center;">
            <span class="badge badge-${sample['workflow_state'] === "جديدة" ? "success" : "danger"}">${sample['workflow_state'] || ""}</span>
        </td>
        <td style="text-align:center; font-size:12px;" id="comment-${sample['name']}">جاري التحميل...</td>
        `;

        tbody.appendChild(row);

        // جلب آخر تعليق
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Comment",
                filters: {
                    reference_doctype: "BaseSample",
                    comment_type: "Comment",
                    reference_name: sample['name']
                },
                fields: ["content"],
                order_by: "creation desc",
                limit_page_length: 1
            },
            callback: function (commentsRes) {
                const el = root_element.querySelector(`#comment-${sample['name']}`);
                el.textContent = (commentsRes.message?.[0]?.content || "لا توجد تعليقات");

                const commentButton = document.createElement("button");
                commentButton.textContent = "📝";
                commentButton.title = "إضافة تعليق";
                commentButton.style.border = "none";
                commentButton.style.background = "none";
                commentButton.style.cursor = "pointer";
                commentButton.style.fontSize = "16px";
                commentButton.style.marginTop = "5px";

                commentButton.addEventListener("click", () => {
                    openCommentPopup1(sample['name']);
                });

                el.appendChild(document.createElement("br"));
                el.appendChild(commentButton);
            }
        });
    });

    container.innerHTML = "";
    container.appendChild(table);

}
function searchBtn() {
    const btn = root_element.querySelector("#open-search-btn");

    if (btn) {
        btn.addEventListener("click", () => {
            const d = new frappe.ui.Dialog({
                title: 'بحث في التقارير',
                fields: [
                    {
                        label: 'رقم المعاملة',
                        fieldname: 'name',
                        fieldtype: 'Data'
                    },
                    {
                        label: 'الحالة',
                        fieldname: 'workflow_state',
                        fieldtype: 'Select',
                        options: '\nجديدة\nمعاينة\nمراجعة\nتحت الإجراء\nمعتمدة\nمرسلة\nمسجلة\nمعلقة'
                    },

                    {
                        label: 'رقم الصك',
                        fieldname: 'instrementnumber',
                        fieldtype: 'Data'
                    },
                    {
                        label: 'رقم التكليف',
                        fieldname: 'commissioningnumber',
                        fieldtype: 'Data'
                    },
                    {
                        label: "",
                        fieldname: '___',
                        fieldtype: 'Column Break'

                    },
                    {
                        label: 'رقم عرض السعر',
                        fieldname: 'quotation',
                        fieldtype: 'Link',
                        options: "Quotation"
                    },
                    {
                        label: 'طالب التقيم',
                        fieldname: 'willtoevalution',
                        fieldtype: 'Link',
                        options: "User"
                    },
                    {
                        label: 'العميل',
                        fieldname: 'customer',
                        fieldtype: 'Link',
                        options: "Customer"
                    },
                    {
                        label: 'المقيم',
                        fieldname: 'evaluation',
                        fieldtype: 'Link',
                        options: "User"
                    }

                ],
                primary_action_label: 'بحث',
                primary_action(values) {
                    const filters = {};

                    if (values.name) filters.name = values.name;
                    if (values.workflow_state) filters.workflow_state = values.workflow_state;
                    if (values.instrementnumber) filters.instrementnumber = values.instrementnumber;
                    if (values.commissioningnumber) filters.commissioningnumber = values.commissioningnumber;
                    if (values.quotation) filters.quotation = values.quotation;
                    if (values.willtoevalution) filters.willtoevalution = values.willtoevalution;
                    if (values.customer) filters.customer = values.customer;
                    if (values.evaluation) filters.evaluation = values.evaluation;

                    const filteredSamples = filterData(userSamples, filters);
                    const element = root_element.querySelector("#head-section");
                    head_section_innerHTML = element.innerHTML;
                    element.innerHTML = `
                        <button id="go-back" class="btn btn-primary rounded-circle" >
                        الرجوع
                        </button>
                    `;
                    fillData(filteredSamples);
                    d.hide();
                    addGoBackListener();

                }
            });

            d.show();
        });
    }
}
function pullBtn() {
    const btn = root_element.querySelector("#pull-sample-btn");
    btn.addEventListener("click", () => {
        frappe.call('pull_one_base_sample').then(async (r) => {
            const m = r.message || {};
            frappe.msgprint(
                (m.assigned)
                    ? __('سُحبت {0}. الآن تحت الإجراء: {1}/{2}', [m.assigned, m.in_progress, m.cap])
                    : (m.message || __('لا توجد معاملات متاحة'))
            );
            userSamples = await get_all_samples();
            status_dic = groupeByStatus(userSamples);
            setBoxesCount(status_dic);
            fillData(userSamples);

        });
    });
}

function addGoBackListener() {
    const goBackBtn = root_element.querySelector("#go-back");
    if (goBackBtn) {
        goBackBtn.addEventListener("click", () => {
            const element = root_element.querySelector("#head-section");
            element.innerHTML = head_section_innerHTML; // ترجع الحالة الأصلية للرأس
            // fillData(userSamples); // تعيد عرض كل العينات
            addEventListeneToBoxes(userSamples); // تعيد إضافة الحدث للصناديق
            searchBtn(); // تعيد تفعيل زر البحث
        });
    }
}

// ================== main  ==================

(async () => {
    userSamples = await get_all_samples();
    showBoxesforUser();
    status_dic = groupeByStatus(userSamples);
    setBoxesCount(status_dic);
    //fillData(userSamples);
    addEventListeneToBoxes(userSamples);
    searchBtn();
    pullBtn();
    frappe.call({
        method: "count_states",
        args: {
            states: ['جديدة', 'معاينة', 'مراجعة', 'تحت الإجراء',
                'معتمدة', 'مرسلة', 'مسجلة', 'معلقة']
        },
        callback: function (res) {
            console.log(res.message);
        },
    });
})();




