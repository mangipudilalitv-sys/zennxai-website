-- =====================================================
-- ZENNX DATABASE SCHEMA V1
-- =====================================================

create extension if not exists "uuid-ossp";

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

    business_id uuid
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

    business_id uuid
        references businesses(id),

    customer_id uuid
        references customers(id),

    start_time timestamptz,

    end_time timestamptz,

    status text,

    notes text

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

    customer_id uuid
        references customers(id),

    action text,

    outcome text,

    confidence numeric,

    created_at timestamptz default now()

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