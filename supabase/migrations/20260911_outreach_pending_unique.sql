create unique index if not exists
  outreach_messages_one_pending_per_contact_idx
on public.outreach_messages (
  business_id,
  contact_id
)
where status = 'pending_approval';
