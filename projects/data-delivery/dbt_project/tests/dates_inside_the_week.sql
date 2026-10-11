-- Every sale should fall inside the week being delivered (Monday to Sunday).
with bounds as (
    select cast(strptime('{{ var("week") }}-1', '%G-W%V-%u') as date) as monday
)
select s.customer, s.line_id, s.sale_date
from {{ ref('weekly_sales') }} s, bounds b
where s.sale_date is not null
  and s.sale_date not between b.monday and b.monday + 6
