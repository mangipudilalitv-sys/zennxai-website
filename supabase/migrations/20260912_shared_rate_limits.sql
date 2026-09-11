create table if not exists public.api_rate_limits (
  key text not null,
  window_start timestamptz not null,
  request_count integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (key, window_start)
);

alter table public.api_rate_limits
enable row level security;

create or replace function public.check_api_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count integer;
  v_retry integer;
begin
  if p_limit <= 0 or p_window_seconds <= 0 then
    raise exception 'Invalid rate limit configuration';
  end if;

  v_window_start :=
    to_timestamp(
      floor(
        extract(epoch from v_now) /
        p_window_seconds
      ) * p_window_seconds
    );

  insert into public.api_rate_limits (
    key,
    window_start,
    request_count,
    updated_at
  )
  values (
    p_key,
    v_window_start,
    1,
    v_now
  )
  on conflict (key, window_start)
  do update set
    request_count =
      api_rate_limits.request_count + 1,
    updated_at = v_now
  returning request_count
  into v_count;

  v_retry :=
    greatest(
      1,
      ceil(
        extract(
          epoch from (
            v_window_start +
            make_interval(
              secs => p_window_seconds
            ) -
            v_now
          )
        )
      )::integer
    );

  return query
  select
    v_count <= p_limit,
    greatest(p_limit - v_count, 0),
    case
      when v_count > p_limit
        then v_retry
      else 0
    end;
end;
$$;

revoke all
on function public.check_api_rate_limit(
  text,
  integer,
  integer
)
from public;

grant execute
on function public.check_api_rate_limit(
  text,
  integer,
  integer
)
to service_role;

create index if not exists
  api_rate_limits_updated_at_idx
on public.api_rate_limits (
  updated_at
);
