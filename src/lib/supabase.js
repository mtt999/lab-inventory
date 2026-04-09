import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://odipiepbhnabcdjofgfc.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kaXBpZXBiaG5hYmNkam9mZ2ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMTEzNzQsImV4cCI6MjA5MDg4NzM3NH0.lVvAgU3s1HHJiUi_Nwk2TLhA7bAgyiR_PDXYQcxJgtc'

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
