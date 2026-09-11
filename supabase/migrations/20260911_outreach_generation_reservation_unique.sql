drop index if exists
  public.outreach_messages_one_pending_per_contact_idx;

create unique index
  outreach_messages_one_active_generation_per_contact_idx
on public.outreach_messages (
  business_id,
  contact_id
)
where status in (
  'draft',
  'pending_approval'
);
