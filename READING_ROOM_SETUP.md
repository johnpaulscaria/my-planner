# Kairos Reading Room setup

The Reading Room is integrated into the existing World > Reading room page.

## What it does
- Imports PDF files into browser IndexedDB (not localStorage).
- Renders PDFs in an in-app reader using PDF.js.
- Saves the last page and reading progress locally.
- Searches text across the PDF, supports zoom and page navigation.
- Reads continuously page-by-page using natural AI narration when an OpenAI API key is configured in Kairos Settings; otherwise it uses the browser's speech voice.
- Select a word or passage on the PDF and save it directly into Kairos Vocabulary or Quotes, with the book title and page attached.
- Keeps the original planner data and Heaven workspace separate.

## Enable private cloud copies and cross-device restore
1. Open the Supabase project already configured for Kairos.
2. Open SQL Editor and run the contents of \`supabase-reader-storage.sql\` once.
3. In Kairos, sign in using the existing cloud account on each device.
4. Import PDFs while signed in. Use the **Sync** control in the reader to back up/restore the library and local PDF copies.

The SQL creates a private \`kairos-pdfs\` storage bucket with per-user access rules. The bucket allows PDFs up to 50 MB. Cloud backup requires the Supabase Storage bucket/policies to be installed; local reading works without it.

## Narration
Add your own OpenAI API key under Kairos Settings to use the natural audiobook voice. Requests use the configured OpenAI account and may incur API charges. Without a key, Kairos uses the device/browser's built-in speech voice. Narration works on text-based PDFs. Scanned/image-only PDFs require OCR, which is not included in this first implementation.

## Storage and backups
PDF bytes are stored in IndexedDB and are not included in the existing planner JSON backup. Use the Reading Room cloud Sync for PDF copies. Removing a PDF from the local library does not remove saved vocabulary or quotes. The cloud copy remains until deleted from Supabase Storage.
