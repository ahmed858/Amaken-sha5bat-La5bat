columns = """     `name`, `customer`, `region`, `city`, `gada`, `workflow_state`,
         `evaluation_name`, `review`, `owner2`, `ownermobile`,
         `willtoevalution`, `willtoevalutionmoblie`, `instrementnumber`,
         `aqartype`, `dateofcommissioning`, `commissioningnumber`, `creation`
"""

conditions = [""" workflow_state IN (  'جديدة', 'معاينة', 'مراجعة', 'تحت الإجراء'  ,  
              'معتمدة', 'مرسلة', 'مسجلة', 'معلقة' , 'مسودة')
                """]
values = []  
 
current_user = frappe.session.user
 

# جلب رولات اليوزر الحالي من doc User
user_doc = frappe.get_doc("User", current_user)
user_roles = [role.role for role in user_doc.roles]

 

if "Data Entry" in user_roles:
    values.append(current_user)
    conditions.append('owner = %s')
elif 'Assessor' in user_roles:
    values=[current_user,current_user]
    conditions.append('(owner = %s OR evaluation = %s)')
                
elif 'Reviewer' in user_roles:
    values = [current_user,current_user]
    conditions.append('(owner = %s OR review = %s)')
 
where_clause = ' AND '.join(conditions)

query = f"""
select {columns}
from `tabBaseSample`  
WHERE {where_clause}
"""
result = frappe.db.sql(query,tuple  (values))
frappe.response['message'] = result
