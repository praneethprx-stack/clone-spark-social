
create type public.account_type as enum ('personal','business');
create type public.content_kind as enum ('post','reel','tweet','event','ticket','news');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null default '',
  avatar_url text,
  bio text default '',
  account_type public.account_type not null default 'personal',
  category text, website text, contact_email text, phone text, location text,
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.profiles to anon;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare base text;
begin
  base := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)), '[^a-zA-Z0-9_]', '', 'g'));
  if base = '' then base := 'user'; end if;
  if exists (select 1 from public.profiles where username = base) then base := base || substr(new.id::text,1,6); end if;
  insert into public.profiles (id, username, display_name, account_type, avatar_url)
  values (new.id, base,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', base),
    case when new.raw_user_meta_data->>'account_type' = 'business' then 'business'::public.account_type else 'personal'::public.account_type end,
    new.raw_user_meta_data->>'avatar_url');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
grant select on public.connections to anon;
grant select, insert, update, delete on public.connections to authenticated;
grant all on public.connections to service_role;
alter table public.connections enable row level security;
create policy "connections readable" on public.connections for select using (true);
create policy "request connection" on public.connections for insert to authenticated with check (auth.uid() = requester_id and status = 'pending');
create policy "accept connection" on public.connections for update to authenticated using (auth.uid() = addressee_id) with check (auth.uid() = addressee_id);
create policy "remove connection" on public.connections for delete to authenticated using (auth.uid() in (requester_id, addressee_id));

create table public.contents (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  kind public.content_kind not null,
  title text not null default '',
  description text not null default '',
  body text,
  media_url text,
  media_type text,
  cover_url text,
  category text,
  event_start timestamptz,
  location text,
  online_link text,
  registration_deadline timestamptz,
  created_at timestamptz not null default now()
);
create index on public.contents (created_at desc);
create index on public.contents (author_id);
grant select on public.contents to anon;
grant select, insert, update, delete on public.contents to authenticated;
grant all on public.contents to service_role;
alter table public.contents enable row level security;
create policy "contents readable" on public.contents for select using (true);
create policy "create own content" on public.contents for insert to authenticated with check (
  auth.uid() = author_id and (
    kind in ('post','reel','tweet')
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'business')
  ));
create policy "update own content" on public.contents for update to authenticated using (auth.uid() = author_id);
create policy "delete own content" on public.contents for delete to authenticated using (auth.uid() = author_id);

create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0 check (price >= 0),
  quantity int not null check (quantity >= 0),
  sold int not null default 0
);
grant select on public.ticket_types to anon;
grant select, insert, update, delete on public.ticket_types to authenticated;
grant all on public.ticket_types to service_role;
alter table public.ticket_types enable row level security;
create policy "ticket types readable" on public.ticket_types for select using (true);
create policy "owner manages ticket types" on public.ticket_types for all to authenticated
  using (exists (select 1 from public.contents c where c.id = content_id and c.author_id = auth.uid()))
  with check (exists (select 1 from public.contents c where c.id = content_id and c.author_id = auth.uid()));

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('SAC-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_id uuid not null references public.contents(id) on delete cascade,
  ticket_type_id uuid references public.ticket_types(id) on delete set null,
  quantity int not null default 1 check (quantity > 0),
  total numeric(10,2) not null default 0,
  status text not null default 'pending_payment',
  created_at timestamptz not null default now()
);
grant select on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "see own or hosted bookings" on public.bookings for select to authenticated using (
  auth.uid() = user_id or exists (select 1 from public.contents c where c.id = content_id and c.author_id = auth.uid()));

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  media_url text, media_type text, text text, caption text, sticker text,
  bg text default 'red',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
grant select on public.stories to anon;
grant select, insert, delete on public.stories to authenticated;
grant all on public.stories to service_role;
alter table public.stories enable row level security;
create policy "stories readable" on public.stories for select using (true);
create policy "create own story" on public.stories for insert to authenticated with check (auth.uid() = author_id);
create policy "delete own story" on public.stories for delete to authenticated using (auth.uid() = author_id);

create table public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  primary key (story_id, viewer_id)
);
grant select, insert on public.story_views to authenticated;
grant all on public.story_views to service_role;
alter table public.story_views enable row level security;
create policy "own views" on public.story_views for select to authenticated using (auth.uid() = viewer_id);
create policy "add own view" on public.story_views for insert to authenticated with check (auth.uid() = viewer_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index on public.comments (content_id, created_at);
grant select on public.comments to anon;
grant select, insert, delete on public.comments to authenticated;
grant all on public.comments to service_role;
alter table public.comments enable row level security;
create policy "comments readable" on public.comments for select using (true);
create policy "add comment" on public.comments for insert to authenticated with check (auth.uid() = author_id);
create policy "delete own comment" on public.comments for delete to authenticated using (auth.uid() = author_id);

create table public.likes (
  content_id uuid not null references public.contents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (content_id, user_id)
);
grant select on public.likes to anon;
grant select, insert, delete on public.likes to authenticated;
grant all on public.likes to service_role;
alter table public.likes enable row level security;
create policy "likes readable" on public.likes for select using (true);
create policy "like" on public.likes for insert to authenticated with check (auth.uid() = user_id);
create policy "unlike" on public.likes for delete to authenticated using (auth.uid() = user_id);

create table public.saves (
  content_id uuid not null references public.contents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (content_id, user_id)
);
grant select, insert, delete on public.saves to authenticated;
grant all on public.saves to service_role;
alter table public.saves enable row level security;
create policy "own saves" on public.saves for select to authenticated using (auth.uid() = user_id);
create policy "save" on public.saves for insert to authenticated with check (auth.uid() = user_id);
create policy "unsave" on public.saves for delete to authenticated using (auth.uid() = user_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  content_id uuid references public.contents(id) on delete cascade,
  message text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "mark read" on public.notifications for update to authenticated using (auth.uid() = user_id);
create policy "delete notif" on public.notifications for delete to authenticated using (auth.uid() = user_id);

create or replace function public.book_ticket(_content_id uuid, _ticket_type_id uuid, _quantity int)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare t public.ticket_types; c public.contents; b public.bookings; tot numeric;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if _quantity < 1 or _quantity > 10 then raise exception 'Quantity must be 1-10'; end if;
  select * into c from public.contents where id = _content_id and kind in ('event','ticket');
  if not found then raise exception 'Event not found'; end if;
  if c.registration_deadline is not null and c.registration_deadline < now() then raise exception 'Registration closed'; end if;
  select * into t from public.ticket_types where id = _ticket_type_id and content_id = _content_id for update;
  if not found then raise exception 'Ticket type not found'; end if;
  if t.sold + _quantity > t.quantity then raise exception 'Not enough tickets left'; end if;
  tot := t.price * _quantity;
  update public.ticket_types set sold = sold + _quantity where id = t.id;
  insert into public.bookings (user_id, content_id, ticket_type_id, quantity, total, status)
  values (auth.uid(), _content_id, t.id, _quantity, tot, case when tot = 0 then 'confirmed' else 'pending_payment' end)
  returning * into b;
  if c.author_id <> auth.uid() then
    insert into public.notifications (user_id, actor_id, type, content_id, message)
    values (c.author_id, auth.uid(), 'registration', c.id, 'registered for ' || c.title);
  end if;
  insert into public.notifications (user_id, actor_id, type, content_id, message)
  values (auth.uid(), c.author_id, 'ticket', c.id,
    case when b.status = 'confirmed' then 'Your booking ' || b.reference || ' is confirmed'
    else 'Booking ' || b.reference || ' reserved — awaiting payment' end);
  return b;
end $$;
revoke execute on function public.book_ticket(uuid, uuid, int) from public, anon;
grant execute on function public.book_ticket(uuid, uuid, int) to authenticated;

create or replace function public.notify_like() returns trigger language plpgsql security definer set search_path = public as $$
declare a uuid; begin
  select author_id into a from public.contents where id = new.content_id;
  if a <> new.user_id then insert into public.notifications(user_id, actor_id, type, content_id, message) values (a, new.user_id, 'like', new.content_id, 'liked your content'); end if;
  return new; end $$;
create trigger trg_notify_like after insert on public.likes for each row execute function public.notify_like();

create or replace function public.notify_comment() returns trigger language plpgsql security definer set search_path = public as $$
declare a uuid; begin
  select author_id into a from public.contents where id = new.content_id;
  if a <> new.author_id then insert into public.notifications(user_id, actor_id, type, content_id, message) values (a, new.author_id, 'comment', new.content_id, 'commented: ' || left(new.body, 80)); end if;
  return new; end $$;
create trigger trg_notify_comment after insert on public.comments for each row execute function public.notify_comment();

create or replace function public.notify_connection() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications(user_id, actor_id, type, message) values (new.addressee_id, new.requester_id, 'connection_request', 'sent you a connection request');
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status <> 'accepted' then
    insert into public.notifications(user_id, actor_id, type, message) values (new.requester_id, new.addressee_id, 'connection_accepted', 'accepted your connection request');
  end if;
  return new; end $$;
create trigger trg_notify_connection after insert or update on public.connections for each row execute function public.notify_connection();

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  updated_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);
grant select, insert, update on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;
create policy "participants read convo" on public.conversations for select to authenticated using (auth.uid() in (user_a, user_b));
create policy "participants create convo" on public.conversations for insert to authenticated with check (auth.uid() in (user_a, user_b));
create policy "participants update convo" on public.conversations for update to authenticated using (auth.uid() in (user_a, user_b));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.messages (conversation_id, created_at);
grant select, insert, update on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "participants read msgs" on public.messages for select to authenticated using (
  exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)));
create policy "participants send" on public.messages for insert to authenticated with check (
  auth.uid() = sender_id and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)));
create policy "recipient marks read" on public.messages for update to authenticated using (
  sender_id <> auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)));

create or replace function public.notify_message() returns trigger language plpgsql security definer set search_path = public as $$
declare c public.conversations; r uuid; begin
  select * into c from public.conversations where id = new.conversation_id;
  r := case when c.user_a = new.sender_id then c.user_b else c.user_a end;
  update public.conversations set updated_at = now() where id = c.id;
  insert into public.notifications(user_id, actor_id, type, message) values (r, new.sender_id, 'message', left(new.body, 80));
  return new; end $$;
create trigger trg_notify_message after insert on public.messages for each row execute function public.notify_message();

alter publication supabase_realtime add table public.messages;

create policy "media read signed in" on storage.objects for select to authenticated using (bucket_id = 'media');
create policy "media upload own folder" on storage.objects for insert to authenticated with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media delete own" on storage.objects for delete to authenticated using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
