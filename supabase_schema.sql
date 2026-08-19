-- Schema for LCCB Alumni Chat Migration to Supabase

-- 1. Create a table for chat conversations
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id TEXT UNIQUE NOT NULL, -- e.g. "userId1_userId2"
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, blocked
    requested_by TEXT,
    request_to TEXT,
    blocked_by TEXT,
    blocked_user TEXT,
    last_message TEXT,
    last_message_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sender_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create a table for conversation participants
CREATE TABLE IF NOT EXISTS public.chat_participants (
    chat_id TEXT REFERENCES public.chat_conversations(chat_id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    unread_count INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (chat_id, user_id)
);

-- 3. Create a table for messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id TEXT REFERENCES public.chat_conversations(chat_id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'message', -- request, message
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Set up Supabase Realtime for these tables
-- Enable realtime replication on the tables so subscriptions work
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- 5. Row Level Security (RLS) Policies
-- For this pilot phase, since we are not fully migrating authentication to Supabase yet,
-- we will allow public access to these tables.
-- WARNING: In a production environment, you should integrate Supabase Auth 
-- and restrict these policies to `auth.uid()`.

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for anon on chat_conversations"
ON public.chat_conversations FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for anon on chat_participants"
ON public.chat_participants FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for anon on chat_messages"
ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
