import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ActiveTab } from '../components/Sidebar';
import { ComponentWorkflowItem, COMPONENT_WORKFLOWS } from '../data/componentWorkflows';

interface WorkflowContextType {
  // Component-level workflow (specific modal or card)
  isComponentWorkflowOpen: boolean;
  activeComponentWorkflow: ComponentWorkflowItem | null;
  openComponentWorkflow: (targetId: string) => void;
  closeComponentWorkflow: () => void;

  // Module-level workflow (full tab architecture)
  isModuleWorkflowOpen: boolean;
  activeModuleTab: ActiveTab;
  openModuleWorkflow: (tab?: ActiveTab) => void;
  closeModuleWorkflow: () => void;

  // Universal
  closeAllWorkflows: () => void;
  setActiveModuleTab: (tab: ActiveTab) => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const WorkflowProvider: React.FC<{ children: ReactNode; defaultTab?: ActiveTab }> = ({
  children,
  defaultTab = 'dashboard'
}) => {
  const [isComponentWorkflowOpen, setIsComponentWorkflowOpen] = useState(false);
  const [activeComponentWorkflow, setActiveComponentWorkflow] = useState<ComponentWorkflowItem | null>(null);

  const [isModuleWorkflowOpen, setIsModuleWorkflowOpen] = useState(false);
  const [activeModuleTab, setActiveModuleTab] = useState<ActiveTab>(defaultTab);

  const openComponentWorkflow = (targetId: string) => {
    const item = COMPONENT_WORKFLOWS[targetId];
    if (item) {
      setActiveComponentWorkflow(item);
      setIsComponentWorkflowOpen(true);
      // If module tab can be determined from item, update it
      if (item.module && item.module !== 'global') {
        setActiveModuleTab(item.module as ActiveTab);
      }
    } else {
      console.warn(`[Workflow] Unknown workflow targetId: ${targetId}`);
    }
  };

  const closeComponentWorkflow = () => {
    setIsComponentWorkflowOpen(false);
  };

  const openModuleWorkflow = (tab?: ActiveTab) => {
    if (tab) {
      setActiveModuleTab(tab);
    }
    setIsModuleWorkflowOpen(true);
  };

  const closeModuleWorkflow = () => {
    setIsModuleWorkflowOpen(false);
  };

  const closeAllWorkflows = () => {
    setIsComponentWorkflowOpen(false);
    setIsModuleWorkflowOpen(false);
  };

  return (
    <WorkflowContext.Provider
      value={{
        isComponentWorkflowOpen,
        activeComponentWorkflow,
        openComponentWorkflow,
        closeComponentWorkflow,
        isModuleWorkflowOpen,
        activeModuleTab,
        openModuleWorkflow,
        closeModuleWorkflow,
        closeAllWorkflows,
        setActiveModuleTab
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = (): WorkflowContextType => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
};
