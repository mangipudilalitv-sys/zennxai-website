begin;

create table if not exists public.outreach_contacts (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  contact_type text not null check (
    contact_type in (
      'business', 'creator', 'brand', 'founder',
      'agency', 'investor', 'partner', 'other'
    )
  ),
  display_name text not null,
  organization_name text,
  platform text not null check (
    platform in (
      'instagram', 'linkedin', 'x',
      'email', 'sms', 'other'
    )
  ),
  handle text,
  profile_url text,
  email text,
  phone text,
  location text,
  bio text,
  audience_size bigint check (
    audience_size is null or audience_size >= 0
  ),
  relationship_stage text not null default 'identified' check (
    relationship_stage in (
      'identified', 'researching', 'ready',
      'contacted', 'replied', 'qualified',
      'nurturing', 'won', 'lost', 'do_not_contact'
    )
  ),
  source text,
  tags jsonb not null default '[]'::jsonb check (
    jsonb_typeof(tags) = 'array'
  ),
  personalization jsonb not null default '{}'::jsonb check (
    jsonb_typeof(personalization) = 'object'
  ),
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists
  outreach_contacts_platform_handle_unique_idx
on public.outreach_contacts (
  business_id, platform, lower(handle)
)
where handle is not null;

create unique index if not exists
  outreach_contacts_email_unique_idx
on public.outreach_contacts (
  business_id, lower(email)
)
where email is not null;

create index if not exists
  outreach_contacts_stage_idx
on public.outreach_contacts (
  business_id, relationship_stage, updated_at desc
);

create table if not exists public.outreach_campaigns (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  objective text not null check (
    objective in (
      'SELL', 'NETWORK', 'COLLABORATE',
      'PARTNERSHIP', 'INVESTOR', 'REFERRAL'
    )
  ),
  target_type text,
  channel text not null check (
    channel in (
      'instagram', 'linkedin', 'x',
      'email', 'sms', 'other'
    )
  ),
  status text not null default 'draft' check (
    status in (
      'draft', 'active', 'paused',
      'completed', 'archived'
    )
  ),
  instructions text,
  daily_limit integer not null default 20 check (
    daily_limit between 1 and 100
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outreach_messages (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  campaign_id uuid references public.outreach_campaigns(id) on delete set null,
  contact_id uuid not null references public.outreach_contacts(id) on delete cascade,
  parent_message_id uuid references public.outreach_messages(id) on delete set null,
  direction text not null default 'outbound' check (
    direction in ('outbound', 'inbound')
  ),
  channel text not null check (
    channel in (
      'instagram', 'linkedin', 'x',
      'email', 'sms', 'other'
    )
  ),
  status text not null default 'draft' check (
    status in (
      'draft', 'pending_approval', 'approved',
      'rejected', 'scheduled', 'sent',
      'delivered', 'replied', 'failed'
    )
  ),
  body text not null check (length(trim(body)) > 0),
  personalization_context jsonb not null default '{}'::jsonb,
  requires_approval boolean not null default true,
  approved_by text,
  approved_at timestamptz,
  scheduled_for timestamptz,
  sent_at timestamptz,
  external_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  outreach_messages_approval_queue_idx
on public.outreach_messages (
  business_id, status, created_at
);

create index if not exists
  outreach_messages_contact_history_idx
on public.outreach_messages (
  business_id, contact_id, created_at desc
);

create table if not exists public.outreach_followups (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  contact_id uuid not null references public.outreach_contacts(id) on delete cascade,
  campaign_id uuid references public.outreach_campaigns(id) on delete set null,
  message_id uuid references public.outreach_messages(id) on delete set null,
  status text not null default 'pending' check (
    status in ('pending', 'completed', 'cancelled', 'skipped')
  ),
  due_at timestamptz not null,
  purpose text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists
  outreach_followups_due_idx
on public.outreach_followups (
  business_id, status, due_at
);

alter table public.outreach_contacts enable row level security;
alter table public.outreach_campaigns enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.outreach_followups enable row level security;

commit;
