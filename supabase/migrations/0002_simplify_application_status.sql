-- Simplify applications.status from 8 stages down to 5: wishlist, applied,
-- in_progress, offer, closed.
--
-- `in_progress` absorbs the old phone_screen/interview stages, plus the
-- general "still being reviewed / recruiter reached out / needs follow-up"
-- states real-world tracking actually produces — those don't need their own
-- status column, a note on the application_events row covers it.
-- `closed` absorbs rejected/withdrawn/ghosted for the same reason: the
-- specific close reason belongs in a timeline note, not the status itself.

alter table applications drop constraint applications_status_check;

update applications set status = 'in_progress' where status in ('phone_screen', 'interview');
update applications set status = 'closed' where status in ('rejected', 'withdrawn', 'ghosted');

alter table applications
  add constraint applications_status_check
  check (status in ('wishlist', 'applied', 'in_progress', 'offer', 'closed'));
