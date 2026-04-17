import { getWorkspaceTitle, useAppShellViewModel } from "./useAppShellViewModel";

export function useAppWorkspaceViewModel() {
  const { activeView } = useAppShellViewModel();

  return {
    activeView,
    title: getWorkspaceTitle(activeView),
  };
}
