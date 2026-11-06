-- Limited-time offers (e.g. Diwali ₹49): which payments used one, so each
-- account gets an offer price once. Safe to re-run.

alter table public.upi_requests add column if not exists offer_id text check (char_length(offer_id) <= 40);
alter table public.payments     add column if not exists offer_id text check (char_length(offer_id) <= 40);

-- One live (pending or approved) offer payment per account and offer, even if two are submitted at once.
create unique index if not exists upi_requests_one_offer_per_user
  on public.upi_requests (user_id, offer_id)
  where offer_id is not null and status <> 'rejected';
