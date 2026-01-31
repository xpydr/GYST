"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Minus, MoreHorizontal, CheckCircle2, Circle } from "lucide-react";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@supabase/supabase-js";

function defaultGoalInfo(): GoalInfo {
  return {
    title: "",
    deadline: null,
    target: null,
    counter: 0,
    completed: false,
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
      completed: o.completed === true,
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
      completed: false,
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

  const handleToggleComplete = useCallback(
    async (goal: GoalRow) => {
      if (!user) return;

      const info = parseGoalInfo(goal.info);
      const updatedInfo: GoalInfo = { ...info, completed: !info.completed };

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
        console.error("Error toggling completion:", error);
        setErrorMessage("Failed to update goal. Please try again.");
        setErrorDialogOpen(true);
        return;
      }

      setGoals((prev) =>
        prev.map((g) => (g.id === goal.id ? { ...g, info: updatedInfo } : g))
      );
    },
    [user]
  );

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
        <Button
          variant="outline"
          onClick={() => setCreateDialogOpen(true)}
          className="border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500 hover:text-cyan-300 dark:hover:shadow-[0_0_12px_rgba(0,255,255,0.4)] transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add goal
        </Button>
      </div>

      {(() => {
        const activeGoals = goals.filter((g) => !parseGoalInfo(g.info).completed);
        const completedGoals = goals.filter((g) => parseGoalInfo(g.info).completed);
        return (
          <>
            {activeGoals.length === 0 && completedGoals.length === 0 ? (
              <p className="text-muted-foreground py-8">
                No goals yet. Click &quot;Add goal&quot; to create one.
              </p>
            ) : (
              <>
                {activeGoals.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                    {activeGoals.map((goal) => {
                      const info = parseGoalInfo(goal.info);
                      const progressLabel =
                        info.target != null
                          ? `${info.counter} / ${info.target}`
                          : String(info.counter);
                      return (
                        <Card
                          key={String(goal.id)}
                          className="border border-cyan-500/30 transition-all duration-300 hover:border-cyan-500 hover:glow-cyan"
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <CardTitle className="text-lg">{info.title}</CardTitle>
                                {info.deadline && (
                                  <CardDescription>
                                    Deadline: {format(new Date(info.deadline), "MMM d, yyyy")}
                                  </CardDescription>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors duration-200"
                                    aria-label="More options"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEdit(goal)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleComplete(goal)}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Mark as completed
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => openDelete(goal)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Progress: {progressLabel}</span>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 border-cyan-500/30 text-foreground hover:border-cyan-500 hover:bg-cyan-500/10 hover:text-cyan-400 dark:hover:shadow-[0_0_8px_rgba(0,255,255,0.4)] transition-all duration-200"
                                  onClick={() => handleCounterChange(goal, -1)}
                                  disabled={info.counter <= 0}
                                  aria-label="Decrement"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 border-cyan-500/30 text-foreground hover:border-cyan-500 hover:bg-cyan-500/10 hover:text-cyan-400 dark:hover:shadow-[0_0_8px_rgba(0,255,255,0.4)] transition-all duration-200"
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
                        </Card>
                      );
                    })}
                  </div>
                )}
                {completedGoals.length > 0 && (
                  <Collapsible className="mt-8">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between px-0 text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/5 transition-colors duration-200"
                      >
                        <span className="font-medium">Completed ({completedGoals.length})</span>
                        <span className="text-xs">Show / hide</span>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 pt-4">
                        {completedGoals.map((goal) => {
                          const info = parseGoalInfo(goal.info);
                          const progressLabel =
                            info.target != null
                              ? `${info.counter} / ${info.target}`
                              : String(info.counter);
                          return (
                            <Card
                              key={String(goal.id)}
                              className="opacity-80 border border-cyan-500/20 transition-all duration-300 hover:border-cyan-500/60 hover:opacity-100"
                            >
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <CardTitle className="text-lg line-through">{info.title}</CardTitle>
                                    {info.deadline && (
                                      <CardDescription>
                                        Deadline: {format(new Date(info.deadline), "MMM d, yyyy")}
                                      </CardDescription>
                                    )}
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors duration-200"
                                        aria-label="More options"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openEdit(goal)}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleToggleComplete(goal)}>
                                        <Circle className="h-4 w-4 mr-2" />
                                        Mark as incomplete
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => openDelete(goal)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </CardHeader>
                              <CardContent className="pb-2">
                                <span className="text-sm font-medium text-muted-foreground">
                                  Progress: {progressLabel}
                                </span>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </>
            )}
          </>
        );
      })()}

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
