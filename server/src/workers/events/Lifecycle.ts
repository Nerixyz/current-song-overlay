export interface LifecycleEvents<Init> {
  init: Init;
  exit: "exit";
  started: "started";
}
