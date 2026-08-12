begin;

alter table public.rooms
  add column building varchar(255);

update public.rooms
set building = case
  when name in ('VIP Room 3', 'VIP Room 4', 'Green Room', 'Office Pantry') then 'Office Block'
  when name in ('Glass Room', 'Lobby', 'Auditorium') then 'Main Hall'
  when name in ('Holding Room 1', 'Holding Room 2', 'Stage 8') then 'Stage 8'
  else 'Other rooms'
end;

alter table public.rooms
  alter column building set not null;

commit;
