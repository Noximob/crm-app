export default function TvLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TV: tela cheia, sem sidebar nem header do dashboard
  return (
    <div className="min-h-screen w-full bg-[#181C23]">
      {children}
    </div>
  );
}
