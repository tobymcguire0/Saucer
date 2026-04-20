import { getWorkspaceTitle, useAppShellViewModel } from "./useAppShellViewModel";

export function useAppWorkspaceViewModel() {
  const { activeView, setActiveWorkspace } = useAppShellViewModel();

  return {
    activeView,
    title: getWorkspaceTitle(activeView),
    setActiveWorkspace,
  };
}
