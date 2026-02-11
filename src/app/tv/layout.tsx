import { AlummaLogo } from '@/components/AlummaLogo';

export default function TvLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TV: tela cheia, sem sidebar; branding Alumma no canto
  return (
    <div className="min-h-screen w-full bg-particles relative">
      {children}
      {/* Marca Alumma fixa no canto inferior direito (somente a marca, sem fundo) */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <AlummaLogo variant="full" theme="dark" width={100} height={28} />
      </div>
    </div>
  );
}
