-- The table delivered every Monday: one row per order line, every customer,
-- in one shape.
select
    customer,
    week,
    line_id,
    store_id,
    product_id,
    sale_date,
    units,
    revenue
from {{ ref('stg_sales') }}
