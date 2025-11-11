import { SolanaProviders } from "@/components/providers/solana-provider";
import { AtlasClient } from "@/components/atlas/atlas-client";

export const dynamic = "force-dynamic";

export default async function SolanaAtlasPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const backgrounds: string[] = [
    "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/839a9d0f-c8ea-4ee9-aa5d-ded18c4cf0d9/generated_images/wide-4k-ghibli-inspired-city-scene-at-go-bdf9f492-20250928003342.jpg?",
    "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/839a9d0f-c8ea-4ee9-aa5d-ded18c4cf0d9/generated_images/wide-4k-pixar-inspired-stylized-waterfro-eacfb486-20250928003350.jpg?",
    "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/839a9d0f-c8ea-4ee9-aa5d-ded18c4cf0d9/generated_images/wide-4k-photorealistic-city-street-near--d83ee757-20250928003357.jpg?",
    "https://v3b.fal.media/files/b/koala/NRfzuV5iDhAsU__VRUrxQ_output.png",
  ];
  const bgUrl = backgrounds[Math.floor(Math.random() * backgrounds.length)];

  return (
    <div
      className="relative min-h-dvh w-full bg-fixed bg-cover bg-center"
      style={{
        backgroundImage: `url(${bgUrl})`,
      }}
    >
      <div className="relative z-10 min-h-dvh p-4 md:p-6">
        <SolanaProviders>
          <AtlasClient />
        </SolanaProviders>
      </div>
    </div>
  );
}