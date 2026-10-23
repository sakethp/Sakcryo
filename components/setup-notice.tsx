export function SetupNotice() {
  return (
    <div className="setup-callout" role="status">
      <strong>Connect your Supabase project to try the MVP.</strong>
      Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> from your Supabase project settings to <code>.env.local</code> for local development, then add the same values to Vercel. Until then, no real account or match data is created.
    </div>
  );
}
