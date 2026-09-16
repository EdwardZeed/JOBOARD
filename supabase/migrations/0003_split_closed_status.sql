-- Split the generic `closed` status back into two: `rejected` (got a real
-- response, it was just "no") and `ghosted` (no response at all). These two
-- matter for the response-rate metric — a rejection counts as a response,
-- a ghost does not — so collapsing them was too lossy.
--
-- No per-row memory of which sub-type a `closed` row originally was (that
-- distinction was dropped in 0002), so this backfills existing `closed` rows
-- to `rejected` as the more common case. Adjust manually via
-- update_application_status if any of them were actually ghosted.

alter table applications drop constraint applications_status_check;

update applications set status = 'rejected' where status = 'closed';

alter table applications
  add constraint applications_status_check
  check (status in ('wishlist', 'applied', 'in_progress', 'offer', 'rejected', 'ghosted'));
