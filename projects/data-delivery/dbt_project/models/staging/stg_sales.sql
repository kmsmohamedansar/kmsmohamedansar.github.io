-- This week's rows from every customer, typed, with exact duplicate rows
-- removed (a resent row is safe to drop; a changed one is not, and a test
-- catches that instead).
with this_week as (
    select * from {{ source('raw', 'sales') }}
    where week = '{{ var("week") }}'
),
deduped as (
    select distinct customer, week, line_id, store_id, product_id, sale_date, units, revenue
    from this_week
)
select
    customer,
    week,
    line_id,
    store_id,
    product_id,
    try_cast(sale_date as date) as sale_date,
    cast(units as integer) as units,
    cast(revenue as decimal(12, 2)) as revenue
from deduped
