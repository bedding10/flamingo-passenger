import React from "react";
import { BootScreen } from "./BootScreen";
import { reportError } from "../core/observability";

type State = { failed: boolean };
export class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  State
> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    reportError(error, "react.render");
  }
  render() {
    return this.state.failed ? <BootScreen /> : this.props.children;
  }
}
