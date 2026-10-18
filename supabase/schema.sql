-- BillShield schema (Move 4: Lock the data)
-- Rows for facts, files for bytes. The bill file lives in Storage; bills.file_url holds its link.
-- Not stored: name, phone, account / statement number, address, card / UPI.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists expected (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  provider text,
  usual_amount numeric(12,2),
  entered_on timestamptz not null default now()
);

create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  expected_id uuid references expected(id) on delete set null,
  previous_bill_id uuid references bills(id) on delete set null,
  provider text,
  bill_type text,
  period_label text,
  period_start date,
  period_end date,
  due_date date,
  total numeric(12,2),
  currency text,
  file_url text,
  file_type text,
  created_at timestamptz not null default now()
);

create table if not exists line_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills(id) on delete cascade,
  label text not null,
  amount numeric(12,2) not null,
  kind text,
  is_new boolean not null default false,
  user_recognised boolean,
  status text not null default 'ok'
    check (status in ('ok', 'explained', 'unexplained', 'wrong')),
  user_explanation text,
  created_at timestamptz not null default now()
);

-- THE PROOF LINK: every message points at the line it disputes.
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  line_item_id uuid not null references line_items(id) on delete cascade,
  draft_text text,
  final_text text,
  words_changed integer,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists bills_user_idx on bills(user_id);
create index if not exists line_items_bill_idx on line_items(bill_id);
create index if not exists line_items_label_idx on line_items(lower(label));
create index if not exists messages_line_item_idx on messages(line_item_id);

-- Only the server (service role) can read/write. No public access.
alter table users enable row level security;
alter table expected enable row level security;
alter table bills enable row level security;
alter table line_items enable row level security;
alter table messages enable row level security;

-- Private storage bucket for the bill files.
insert into storage.buckets (id, name, public)
values ('bills', 'bills', false)
on conflict (id) do nothing;
