// Decorative, non-interactive backdrop of two drifting blurred glow orbs -
// bungie-blue (kinetic accent) and purple (legendary tier, matching
// TIER_COLORS in weaponShared.tsx). Pure CSS, absolutely positioned behind
// whatever content renders on top of it.
export default function GlowBackdrop() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-bungie-blue/25 blur-[100px] animate-glow-drift" />
      <div
        className="absolute -bottom-40 -right-24 w-[26rem] h-[26rem] rounded-full bg-purple-600/20 blur-[100px] animate-glow-drift"
        style={{ animationDelay: "3s" }}
      />
    </div>
  );
}
