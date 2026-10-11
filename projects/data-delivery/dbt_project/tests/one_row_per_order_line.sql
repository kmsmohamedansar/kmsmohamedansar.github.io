-- The same order line sent twice with different values. We can't know which
-- one is right, so the delivery stops and a person asks the customer.
select customer, line_id, count(*) as copies
from {{ ref('weekly_sales') }}
group by customer, line_id
having count(*) > 1
