create or replace function public.prune_api_rate_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if random() < 0.01 then
    delete from public.api_rate_limits
    where updated_at <
      now() - interval '1 day';
  end if;

  return null;
end;
$$;

revoke all
on function public.prune_api_rate_limits()
from public;

drop trigger if exists
  api_rate_limits_prune_old
on public.api_rate_limits;

create trigger
  api_rate_limits_prune_old
after insert or update
on public.api_rate_limits
for each statement
execute function
  public.prune_api_rate_limits();
