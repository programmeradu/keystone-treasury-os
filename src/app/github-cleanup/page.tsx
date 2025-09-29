import RepoManager from "@/components/github/RepoManager";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-2">GitHub Repository Cleanup</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Use filters to find repositories, select multiple, and delete them in bulk. This uses your server-side GitHub token.
        </p>
        <RepoManager />
      </div>
    </div>
  );
}
