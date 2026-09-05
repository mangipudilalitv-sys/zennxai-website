-- =====================================================
-- ZENNX DATABASE SCHEMA V1
-- =====================================================

create extension if not exists "uuid-ossp";
create extension if not exists btree_gist;

---------------------------------------------------------
-- BUSINESSES
---------------------------------------------------------

create table businesses (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    industry text,
    owner_name text,
    owner_email text,
    owner_phone text,
    timezone text,
    created_at timestamptz default now()
);

---------------------------------------------------------
-- CUSTOMERS
---------------------------------------------------------

create table customers (
    id uuid primary key default uuid_generate_v4(),

    business_id uuid
        references businesses(id)
        on delete cascade,

    name text,

    phone text,

    email text,

    company text,

    created_at timestamptz default now(),

    updated_at timestamptz default now()
);

---------------------------------------------------------
-- LEADS
---------------------------------------------------------

create table leads (

    id uuid primary key default uuid_generate_v4(),

    business_id uuid not null
        references businesses(id),

    customer_id uuid
        references customers(id),

    status text,

    source text,

    value numeric,

    summary text,

    qualification jsonb,

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);

---------------------------------------------------------
-- CONVERSATIONS
---------------------------------------------------------

create table conversations (

    id uuid primary key default uuid_generate_v4(),

    customer_id uuid
        references customers(id),

    source text,

    transcript text,

    sentiment text,

    summary text,

    created_at timestamptz default now()

);

---------------------------------------------------------
-- MEMORIES
---------------------------------------------------------

create table memories (

    id uuid primary key default uuid_generate_v4(),

    customer_id uuid
        references customers(id),

    category text,

    content text,

    importance integer,

    embedding jsonb,

    created_at timestamptz default now()

);

---------------------------------------------------------
-- TASKS
---------------------------------------------------------

create table tasks (

    id uuid primary key default uuid_generate_v4(),

    business_id uuid
        references businesses(id),

    customer_id uuid
        references customers(id),

    status text,

    priority text,

    description text,

    assigned_to text,

    due_date timestamptz,

    completed_at timestamptz

);

---------------------------------------------------------
-- APPOINTMENTS
---------------------------------------------------------

create table appointments (

    id uuid primary key default uuid_generate_v4(),

    business_id uuid not null
        references businesses(id),

    customer_id uuid not null
        references customers(id),

    start_time timestamptz not null,

    end_time timestamptz not null,

    status text not null
        constraint appointments_valid_status_check
        check (
            status in (
                'scheduled',
                'cancelled',
                'completed'
            )
        ),

    notes text,

    constraint appointments_valid_time_range_check
        check (end_time > start_time),

    constraint appointments_no_scheduled_overlap
        exclude using gist (
            business_id with =,
            tstzrange(
                start_time,
                end_time,
                '[)'
            ) with &&
        )
        where (status = 'scheduled')

);

create index appointments_business_start_idx
on appointments (
    business_id,
    start_time
);

create index appointments_business_customer_start_idx
on appointments (
    business_id,
    customer_id,
    start_time desc
);

---------------------------------------------------------
-- WORKFLOWS
---------------------------------------------------------

create table workflows (

    id uuid primary key default uuid_generate_v4(),

    customer_id uuid
        references customers(id),

    stage text,

    goal text,

    current_step text,

    completed_steps jsonb,

    updated_at timestamptz default now()

);

---------------------------------------------------------
-- GOALS
---------------------------------------------------------

create table goals (

    id uuid primary key default uuid_generate_v4(),

    customer_id uuid
        references customers(id),

    goal text,

    priority integer,

    status text,

    created_at timestamptz default now()

);

---------------------------------------------------------
-- EXECUTION PLANS
---------------------------------------------------------

create table execution_plans (

    id uuid primary key default uuid_generate_v4(),

    goal_id uuid
        references goals(id),

    steps jsonb,

    completed jsonb,

    status text,

    updated_at timestamptz default now()

);

---------------------------------------------------------
-- LEARNING EVENTS
---------------------------------------------------------

create table learning_events (

    id uuid primary key default uuid_generate_v4(),

    business_id uuid
        references businesses(id),

    customer_id uuid
        references customers(id),

    action text,

    outcome text,

    confidence numeric,

    created_at timestamptz default now()

);

create index learning_events_business_action_created_idx
    on learning_events (
        business_id,
        action,
        created_at desc
    );

---------------------------------------------------------
-- BUSINESS HEALTH
---------------------------------------------------------

create table business_health (

    id uuid primary key default uuid_generate_v4(),

    business_id uuid
        references businesses(id),

    open_leads integer,

    active_tasks integer,

    revenue numeric,

    missed_calls integer,

    updated_at timestamptz default now()

);

---------------------------------------------------------
-- KNOWLEDGE
---------------------------------------------------------

create table knowledge (

    id uuid primary key default uuid_generate_v4(),

    business_id uuid
        references businesses(id),

    category text,

    title text,

    content text,

    embedding jsonb,

    updated_at timestamptz default now()

);

---------------------------------------------------------
-- INTEGRATIONS
---------------------------------------------------------

create table integrations (

    id uuid primary key default uuid_generate_v4(),

    business_id uuid
        references businesses(id),

    provider text,

    configuration jsonb,

    status text,

    created_at timestamptz default now()

);

---------------------------------------------------------
-- AUDIT LOG
---------------------------------------------------------

create table audit_logs (

    id uuid primary key default uuid_generate_v4(),

    business_id uuid
        references businesses(id),

    actor text,

    action text,

    payload jsonb,

    created_at timestamptz default now()

);

-- Outreach engine
begin;

create table if not exists public.outreach_contacts (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  contact_type text not null check (
    contact_type in (
      'business',
      'creator',
      'brand',
      'founder',
      'agency',
      'investor',
      'partner',
      'other'
    )
  ),
  display_name text not null,
  organization_name text,
  platform text not null check (
    platform in (
      'instagram',
      'linkedin',
      'x',
      'email',
      'sms',
      'other'
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
      'identified',
      'researching',
      'ready',
      'contacted',
      'replied',
      'qualified',
      'nurturing',
      'won',
      'lost',
      'do_not_contact'
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
  business_id,
  platform,
  lower(handle)
)
where handle is not null;

create unique index if not exists
  outreach_contacts_email_unique_idx
on public.outreach_contacts (
  business_id,
  lower(email)
)
where email is not null;

create index if not exists
  outreach_contacts_stage_idx
on public.outreach_contacts (
  business_id,
  relationship_stage,
  updated_at desc
);

create table if not exists public.outreach_campaigns (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  objective text not null check (
    objective in (
      'SELL',
      'NETWORK',
      'COLLABORATE',
      'PARTNERSHIP',
      'INVESTOR',
      'REFERRAL'
    )
  ),
  target_type text,
  channel text not null check (
    channel in (
      'instagram',
      'linkedin',
      'x',
      'email',
      'sms',
      'other'
    )
  ),
  status text not null default 'draft' check (
    status in (
      'draft',
      'active',
      'paused',
      'completed',
      'archived'
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
      'instagram',
      'linkedin',
      'x',
      'email',
      'sms',
      'other'
    )
  ),
  status text not null default 'draft' check (
    status in (
      'draft',
      'pending_approval',
      'approved',
      'rejected',
      'scheduled',
      'sent',
      'delivered',
      'replied',
      'failed'
    )
  ),
  body text not null check (
    length(trim(body)) > 0
  ),
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
  business_id,
  status,
  created_at
);

create index if not exists
  outreach_messages_contact_history_idx
on public.outreach_messages (
  business_id,
  contact_id,
  created_at desc
);

create table if not exists public.outreach_followups (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  contact_id uuid not null references public.outreach_contacts(id) on delete cascade,
  campaign_id uuid references public.outreach_campaigns(id) on delete set null,
  message_id uuid references public.outreach_messages(id) on delete set null,
  status text not null default 'pending' check (
    status in (
      'pending',
      'completed',
      'cancelled',
      'skipped'
    )
  ),
  due_at timestamptz not null,
  purpose text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists
  outreach_followups_due_idx
on public.outreach_followups (
  business_id,
  status,
  due_at
);

alter table public.outreach_contacts enable row level security;
alter table public.outreach_campaigns enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.outreach_followups enable row level security;

commit;
