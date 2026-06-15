export function ConfigNotice() {
  return (
    <div className="config-screen">
      <div className="config-card">
        <p className="eyebrow">Setup required</p>
        <h1>Connect Supabase to start the app</h1>
        <p>
          Add your project credentials to <code>.env</code> using the keys in{' '}
          <code>.env.example</code>, then run the app again.
        </p>
        <div className="config-code">
          <div>VITE_SUPABASE_URL=...</div>
          <div>VITE_SUPABASE_ANON_KEY=...</div>
        </div>
      </div>
    </div>
  );
}
