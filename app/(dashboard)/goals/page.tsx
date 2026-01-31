"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { GoalRow, GoalInfo } from "@/lib/types/goals";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@supabase/supabase-js";

function defaultGoalInfo(): GoalInfo {
  return {
    title: "",
    deadline: null,
    target: null,
    counter: 0,
  };
}

function parseGoalInfo(raw: unknown): GoalInfo {
  if (raw && typeof raw === "object" && "title" in raw) {
    const o = raw as Record<string, unknown>;
    return {
      title: typeof o.title === "string" ? o.title : "",
      deadline:
        o.deadline != null && o.deadline !== ""
          ? String(o.deadline)
          : null,
      target:
        typeof o.target === "number" && Number.isFinite(o.target)
          ? o.target
          : null,
      counter:
        typeof o.counter === "number" && Number.isFinite(o.counter)
          ? o.counter
          : 0,
    };
  }
  return defaultGoalInfo();
}

export default function GoalsPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);

  const [selectedGoal, setSelectedGoal] = useState<GoalRow | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [createTitle, setCreateTitle] = useState("");
  const [createDeadline, setCreateDeadline] = useState("");
  const [createTarget, setCreateTarget] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editTarget, setEditTarget] = useState("");

  const fetchGoals = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching goals:", error);
      setGoals([]);
      return;
    }
    setGoals((data as GoalRow[]) ?? []);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      if (u) {
        fetchGoals(u.id).finally(() => setGoalsLoading(false));
      } else {
        setGoalsLoading(false);
      }
    });
  }, [fetchGoals]);

  const handleCreate = useCallback(async () => {
    if (!user || !createTitle.trim()) return;

    const supabase = createClient();
    const info: GoalInfo = {
      title: createTitle.trim(),
      deadline: createDeadline.trim() || null,
      target: createTarget.trim() ? parseInt(createTarget, 10) : null,
      counter: 0,
    };
    if (info.target != null && (isNaN(info.target) || info.target < 0)) {
      info.target = null;
    }

    const { data: inserted, error } = await supabase
      .from("goals")
      .insert({ user_id: user.id, info })
      .select()
      .single();

    if (error) {
      console.error("Error creating goal:", error);
      setErrorMessage("Failed to create goal. Please try again.");
      setErrorDialogOpen(true);
      return;
    }

    setGoals((prev) => [inserted as GoalRow, ...prev]);
    setCreateDialogOpen(false);
    setCreateTitle("");
    setCreateDeadline("");
    setCreateTarget("");
  }, [user, createTitle, createDeadline, createTarget]);

  const openEdit = useCallback((goal: GoalRow) => {
    setSelectedGoal(goal);
    const info = parseGoalInfo(goal.info);
    setEditTitle(info.title);
    setEditDeadline(info.deadline ? info.deadline.slice(0, 10) : "");
    setEditTarget(info.target != null ? String(info.target) : "");
    setEditDialogOpen(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!user || !selectedGoal || !editTitle.trim()) return;

    const info = parseGoalInfo(selectedGoal.info);
    const updatedInfo: GoalInfo = {
      ...info,
      title: editTitle.trim(),
      deadline: editDeadline.trim() || null,
      target: editTarget.trim() ? parseInt(editTarget, 10) : null,
    };
    if (
      updatedInfo.target != null &&
      (isNaN(updatedInfo.target) || updatedInfo.target < 0)
    ) {
      updatedInfo.target = null;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("goals")
      .update({
        info: updatedInfo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedGoal.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error updating goal:", error);
      setErrorMessage("Failed to update goal. Please try again.");
      setErrorDialogOpen(true);
      return;
    }

    setGoals((prev) =>
      prev.map((g) =>
        g.id === selectedGoal.id ? { ...g, info: updatedInfo } : g
      )
    );
    setEditDialogOpen(false);
    setSelectedGoal(null);
  }, [user, selectedGoal, editTitle, editDeadline, editTarget]);

  const openDelete = useCallback((goal: GoalRow) => {
    setSelectedGoal(goal);
    setDeleteDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!user || !selectedGoal) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", selectedGoal.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting goal:", error);
      setErrorMessage("Failed to delete goal. Please try again.");
      setErrorDialogOpen(true);
      setDeleteDialogOpen(false);
      return;
    }

    setGoals((prev) => prev.filter((g) => g.id !== selectedGoal.id));
    setDeleteDialogOpen(false);
    setSelectedGoal(null);
    setEditDialogOpen(false);
  }, [user, selectedGoal]);

  const handleCounterChange = useCallback(
    async (goal: GoalRow, delta: 1 | -1) => {
      if (!user) return;

      const info = parseGoalInfo(goal.info);
      let next = info.counter + delta;
      if (next < 0) next = 0;
      if (info.target != null && next > info.target) next = info.target;

      const updatedInfo: GoalInfo = { ...info, counter: next };

      const supabase = createClient();
      const { error } = await supabase
        .from("goals")
        .update({
          info: updatedInfo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", goal.id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating counter:", error);
        setErrorMessage("Failed to update progress. Please try again.");
        setErrorDialogOpen(true);
        return;
      }

      setGoals((prev) =>
        prev.map((g) => (g.id === goal.id ? { ...g, info: updatedInfo } : g))
      );
    },
    [user]
  );

  if (user === undefined || goalsLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl rounded-xl p-4">
        <h1 className="text-2xl font-bold mb-4">Goals</h1>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-5xl rounded-xl p-4">
        <h1 className="text-2xl font-bold mb-4">Goals</h1>
        <p className="text-muted-foreground">Sign in to view and manage your goals.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl rounded-xl p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Goals</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <p className="text-muted-foreground py-8">
          No goals yet. Click &quot;Add goal&quot; to create one.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {goals.map((goal) => {
            const info = parseGoalInfo(goal.info);
            const progressLabel =
              info.target != null
                ? `${info.counter} / ${info.target}`
                : String(info.counter);
            return (
              <Card key={String(goal.id)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{info.title}</CardTitle>
                  {info.deadline && (
                    <CardDescription>
                      Deadline: {format(new Date(info.deadline), "MMM d, yyyy")}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Progress: {progressLabel}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCounterChange(goal, -1)}
                        disabled={info.counter <= 0}
                        aria-label="Decrement"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCounterChange(goal, 1)}
                        disabled={
                          info.target != null && info.counter >= info.target
                        }
                        aria-label="Increment"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(goal)}
                    aria-label="Edit goal"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => openDelete(goal)}
                    aria-label="Delete goal"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setCreateTitle("");
            setCreateDeadline("");
            setCreateTarget("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create goal</DialogTitle>
            <DialogDescription>
              Add a new goal with an optional deadline and target.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-title">Title</Label>
              <Input
                id="create-title"
                type="text"
                placeholder=""
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && createTitle.trim()) handleCreate();
                }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-deadline">Deadline (optional)</Label>
              <Input
                id="create-deadline"
                type="date"
                value={createDeadline}
                onChange={(e) => setCreateDeadline(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-target">Target (optional)</Label>
              <Input
                id="create-target"
                type="number"
                min={0}
                placeholder="100"
                value={createTarget}
                onChange={(e) => setCreateTarget(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!createTitle.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setSelectedGoal(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit goal</DialogTitle>
            <DialogDescription>
              Update title, deadline, or target. Use the +/- buttons on the card to change progress.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                type="text"
                placeholder="Goal title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-deadline">Deadline (optional)</Label>
              <Input
                id="edit-deadline"
                type="date"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-target">Target (optional)</Label>
              <Input
                id="edit-target"
                type="number"
                min={0}
                placeholder="e.g. 100"
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editTitle.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setSelectedGoal(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete goal?</DialogTitle>
            <DialogDescription>
              This cannot be undone. The goal will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>{errorMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setErrorDialogOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
