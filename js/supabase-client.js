// js/supabase-client.js
// Supabase CDN 로딩 후 실행 필요 (supabase-js UMD 빌드가 window.supabase 를 노출)

window.SUPABASE_URL      = 'https://krttjnshqvvgogmocnhw.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtydHRqbnNocXZ2Z29nbW9jbmh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNDI0NDgsImV4cCI6MjA5NzcxODQ0OH0.__ok4zf2m-hwejxKJm0L9Odkx4Jr6yo86ihrK25cRE4';

window.supabaseClient = supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);
