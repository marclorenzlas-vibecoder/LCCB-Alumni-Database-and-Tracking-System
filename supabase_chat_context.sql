-- Add message categories to an existing chat_messages table.
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS context TEXT NOT NULL DEFAULT 'alumni';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_messages_context_check'
      AND conrelid = 'public.chat_messages'::regclass
  ) THEN
    ALTER TABLE public.chat_messages
    ADD CONSTRAINT chat_messages_context_check
    CHECK (context IN ('alumni', 'employment'));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
