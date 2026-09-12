import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCategories } from "@/lib/board.functions";
import { submitListing } from "@/lib/listings.functions";

export const Route = createFileRoute("/_authenticated/submit")({
  head: () => ({
    meta: [
      { title: "Submit a listing — Bid Ladder" },
      {
        name: "description",
        content: "Submit your product to the Bid Ladder board. Every listing is reviewed first.",
      },
      { property: "og:title", content: "Submit a listing — Bid Ladder" },
      { property: "og:description", content: "Get your early-stage product on the board." },
    ],
  }),
  component: SubmitPage,
});

function SubmitPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  const [form, setForm] = useState({
    name: "",
    tagline: "",
    url: "",
    description: "",
    categoryId: "",
  });

  const mutation = useMutation({
    mutationFn: () => submitListing({ data: form }),
    onSuccess: () => {
      toast.success("Submitted for review");
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      navigate({ to: "/dashboard" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl px-4 pb-16 pt-8">
        <h1 className="text-2xl font-bold">Submit your product</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every submission is reviewed before it appears on the board. Ranking starts only once real
          people show up.
        </p>

        <form
          className="mt-6 flex flex-col gap-5 rounded-xl border border-border bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.categoryId) {
              toast.error("Pick a category");
              return;
            }
            mutation.mutate();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              required
              maxLength={60}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              required
              minLength={10}
              maxLength={120}
              placeholder="One line on what it does"
              value={form.tagline}
              onChange={(event) => setForm({ ...form, tagline: event.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              required
              placeholder="https://"
              value={form.url}
              onChange={(event) => setForm({ ...form, url: event.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Category</Label>
            <Select
              value={form.categoryId}
              onValueChange={(value) => setForm({ ...form, categoryId: value })}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              required
              minLength={20}
              maxLength={1200}
              rows={5}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Submitting…" : "Submit for review"}
          </Button>
        </form>
      </main>
    </div>
  );
}
