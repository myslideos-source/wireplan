"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FolderPlus } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { useProjectsStore } from "./store";

export function NewProjectDialog() {
  const router = useRouter();
  const addProject = useProjectsStore((state) => state.addProject);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    addProject({ name: name.trim(), address: address.trim() });
    setOpen(false);
    setName("");
    setAddress("");
    router.push("/projects");
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <FolderPlus className="h-4 w-4" />
        Neues Projekt
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Neues Projekt anlegen"
        description="Name und Adresse können jederzeit in den Projekteinstellungen angepasst werden."
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-text-secondary">
              Projektname
            </span>
            <input
              autoFocus
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="z. B. Neubau Familie Schmidt"
              className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary/60"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-text-secondary">Adresse</span>
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Straße, PLZ, Ort"
              className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary/60"
            />
          </label>
          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit">Projekt erstellen</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
