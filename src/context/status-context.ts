import type { StatusTone } from "../hooks/useStatusMessage";
import { createRequiredContext } from "./createRequiredContext";

export type StatusContextValue = {
  statusMessage: string;
  statusTone: StatusTone;
  statusExpanded: boolean;
  updateStatus: (message: string, tone?: StatusTone) => void;
};

export const [StatusContext, useStatusContext] =
  createRequiredContext<StatusContextValue>("StatusContext");
