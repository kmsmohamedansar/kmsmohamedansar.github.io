-- Each customer's row count should be within the range in their settings
-- file. Far fewer usually means a partial file; far more, a double send.
select e.customer, coalesce(n.rows, 0) as rows, e.min_rows, e.max_rows
from {{ source('raw', 'expectations') }} e
left join (
    select customer, count(*) as rows from {{ ref('weekly_sales') }} group by customer
) n using (customer)
where n.rows is not null and (n.rows < e.min_rows or n.rows > e.max_rows)
