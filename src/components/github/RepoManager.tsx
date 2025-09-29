"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type RepoItem = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  visibility: string;
  fork: boolean;
  archived: boolean;
  stargazers_count: number;
  pushed_at: string;
  html_url: string;
  owner: { login: string };
};

export default function RepoManager() {
  const [me, setMe] = React.useState<{ login: string } | null>(null);
  const [owner, setOwner] = React.useState<string>("");
  const [isOrg, setIsOrg] = React.useState<boolean>(false);
  const [visibility, setVisibility] = React.useState<string>("all");
  const [query, setQuery] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");
  const [repos, setRepos] = React.useState<RepoItem[]>([]);
  const [page, setPage] = React.useState<number>(1);
  const [hasNext, setHasNext] = React.useState<boolean>(false);
  const [selected, setSelected] = React.useState<Record<number, boolean>>({});
  const [deleting, setDeleting] = React.useState<boolean>(false);
  const [resultMsg, setResultMsg] = React.useState<string>("");

  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/github/me", { cache: "no-store" });
        const j = await r.json();
        if (r.ok) {
          setMe(j);
          if (!owner) setOwner(j.login);
        }
      } catch {}
    })();
  }, []);

  async function loadRepos(p = 1) {
    if (!owner) return;
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ owner, org: String(isOrg), visibility, page: String(p), perPage: "50" });
      if (query) params.set("q", query);
      const r = await fetch(`/api/github/repos?${params.toString()}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed to list repos");
      setRepos(j.items || []);
      setHasNext(Boolean(j.hasNext));
      setPage(j.page || p);
      setSelected({});
    } catch (e: any) {
      setError(e?.message || "Failed to load repositories");
    } finally {
      setLoading(false);
    }
  }

  function toggleAll(checked: boolean) {
    const map: Record<number, boolean> = {};
    for (const r of repos) map[r.id] = checked;
    setSelected(map);
  }

  function selectedItems() {
    return repos.filter((r) => selected[r.id]);
  }

  async function deleteSelected() {
    const items = selectedItems();
    if (items.length === 0) return;
    const names = items.map((r) => r.full_name).join("\n");
    const confirmText = prompt(`Type DELETE to confirm deleting ${items.length} repos:\n\n${names}\n\nType DELETE to proceed`);
    if (confirmText !== "DELETE") return;
    setDeleting(true); setResultMsg(""); setError("");
    try {
      const payload = { items: items.map((r) => ({ owner: r.owner.login, repo: r.name })) };
      const r = await fetch(`/api/github/delete?confirm=true`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Deletion failed");
      setResultMsg(`Deleted ${j.deleted} repositories. Failures: ${(j.results || []).filter((x: any) => !x.ok).length}`);
      await loadRepos(page); // refresh
    } catch (e: any) {
      setError(e?.message || "Deletion failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {resultMsg && (
        <Alert>
          <AlertDescription>{resultMsg}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-sm">Owner</label>
            <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder={me?.login || "owner"} />
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Checkbox id="isOrg" checked={isOrg} onCheckedChange={(v) => setIsOrg(Boolean(v))} />
              <label htmlFor="isOrg">Is organization</label>
            </div>
          </div>
          <div>
            <label className="text-sm">Visibility</label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger><SelectValue placeholder="Visibility" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm">Search name</label>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="substring" />
          </div>
          <div className="md:col-span-2 lg:col-span-3 flex gap-2">
            <Button onClick={() => loadRepos(1)} disabled={loading}>Load Repos</Button>
            <Button variant="secondary" onClick={() => { setQuery(""); setVisibility("all"); }} disabled={loading}>Reset Filters</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Repositories</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6 text-sm">Loading...</div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <Checkbox checked={repos.length > 0 && repos.every(r => selected[r.id])} onCheckedChange={(v) => toggleAll(Boolean(v))} />
                <div className="text-sm text-muted-foreground">Select all on this page</div>
                <div className="ml-auto text-sm">Selected: {selectedItems().length}</div>
                <Button variant="destructive" disabled={selectedItems().length === 0 || deleting} onClick={deleteSelected}>
                  {deleting ? "Deleting..." : "Delete Selected"}
                </Button>
              </div>
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 text-left"></th>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Visibility</th>
                      <th className="p-2 text-left">Fork</th>
                      <th className="p-2 text-left">Archived</th>
                      <th className="p-2 text-left">Stars</th>
                      <th className="p-2 text-left">Pushed</th>
                      <th className="p-2 text-left">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repos.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-2">
                          <Checkbox checked={!!selected[r.id]} onCheckedChange={(v) => setSelected({ ...selected, [r.id]: Boolean(v) })} />
                        </td>
                        <td className="p-2 font-medium">{r.full_name}</td>
                        <td className="p-2">{r.visibility}</td>
                        <td className="p-2">{r.fork ? "yes" : "no"}</td>
                        <td className="p-2">{r.archived ? "yes" : "no"}</td>
                        <td className="p-2">{r.stargazers_count}</td>
                        <td className="p-2">{new Date(r.pushed_at).toLocaleDateString()}</td>
                        <td className="p-2"><a className="text-primary underline" href={r.html_url} target="_blank" rel="noreferrer">Open</a></td>
                      </tr>
                    ))}
                    {repos.length === 0 && (
                      <tr><td className="p-4 text-muted-foreground" colSpan={8}>No repositories to show.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => loadRepos(page - 1)}>Prev</Button>
                <div className="text-sm">Page {page}</div>
                <Button variant="secondary" disabled={!hasNext || loading} onClick={() => loadRepos(page + 1)}>Next</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
