/**
 * Shape of the `info` jsonb column in the goals table.
 */
export type GoalInfo = {
  title: string;
  deadline: string | null;
  target: number | null;
  counter: number;
  completed?: boolean;
};

/**
 * Row returned from Supabase goals table (id is int8, may be string in JSON).
 */
export type GoalRow = {
  id: number | string;
  user_id: string;
  info: GoalInfo;
  created_at: string;
  updated_at: string | null;
};
