export type UpdateEventFn = (e: UpdateEventArg<keyof UpdateEventMap>) => void;

export type UpdateEventArg<T extends keyof UpdateEventMap> = { type: T; data: UpdateEventMap[T] };

export interface UpdateEventMap {
  Active: { title: string };
  Inactive: {};
}
