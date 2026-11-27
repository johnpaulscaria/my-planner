-- Run once in the Supabase SQL Editor to enable private cloud copies of PDFs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kairos-pdfs', 'kairos-pdfs', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

create policy "Users can read their own Kairos PDFs"
on storage.objects for select to authenticated
using (bucket_id = 'kairos-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload their own Kairos PDFs"
on storage.objects for insert to authenticated
with check (bucket_id = 'kairos-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own Kairos PDFs"
on storage.objects for update to authenticated
using (bucket_id = 'kairos-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own Kairos PDFs"
on storage.objects for delete to authenticated
using (bucket_id = 'kairos-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
